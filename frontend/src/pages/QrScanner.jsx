import React, { useRef, useState } from 'react';
import { Camera, ScanLine, ShieldCheck, User, Layers, Calendar, Clock, MapPin, FileText, CheckCircle2, Ticket } from 'lucide-react';
import API from '../services/api';
import { useToast } from '../components/ToastContext';

export default function QrScanner() {
  const { showToast } = useToast();
  const videoRef = useRef(null);
  const timerRef = useRef(null);
  const [qrCodeData, setQrCodeData] = useState('');
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);
  const [verifyError, setVerifyError] = useState(null);

  const verify = async (value = qrCodeData) => {
    if (!value.trim()) return;
    setVerifyError(null);
    try {
      const response = await API.post('/bookings/verify_qr', { qr_code_data: value.trim() });
      setResult(response.data.booking);
      setQrCodeData('');
      showToast(`Access verified for ${response.data.booking.user_name}!`, 'success');
    } catch (error) {
      const errBooking = error.response?.data?.booking;
      if (errBooking) {
        setResult(errBooking);
      } else {
        setResult(null);
      }
      const message = error.response?.data?.error || 'This pass code could not be verified.';
      setVerifyError(message);
      showToast(message, 'error');
    }
  };

  const stopCamera = () => {
    clearInterval(timerRef.current);
    videoRef.current?.srcObject?.getTracks().forEach(track => track.stop());
    setScanning(false);
  };

  const startCamera = async () => {
    if (!('BarcodeDetector' in window)) {
      showToast('Camera barcode detection API is not supported in this browser. Enter or paste the pass code instead.', 'info');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
      setScanning(true);
      timerRef.current = setInterval(async () => {
        try {
          if (videoRef.current) {
            const [code] = await detector.detect(videoRef.current);
            if (code?.rawValue) {
              stopCamera();
              verify(code.rawValue);
            }
          }
        } catch (_) { /* wait for readable frame */ }
      }, 500);
    } catch (_) {
      showToast('Camera permission was not granted.', 'error');
    }
  };

  return (
    <div className="p-6 sm:p-8 max-w-3xl space-y-6">
      {/* Title Banner */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-primary-500/10 border border-primary-500/20 rounded-xl text-primary-400">
          <ScanLine className="w-6 h-6 animate-pulse-subtle" />
        </div>
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">QR Check-in & Verification</h1>
          <p className="text-xs text-slate-400">Scan or enter an approved pass ID (#CRMS-PASS-X or BOOKING-X) to verify arrival</p>
        </div>
      </div>

      {/* Main Verification Card */}
      <div className="glass-panel border border-slate-800/60 rounded-2xl p-6 space-y-6 shadow-xl">
        <video ref={videoRef} className={`w-full rounded-xl bg-black max-h-64 object-cover ${scanning ? 'block' : 'hidden'}`} muted playsInline />

        <button
          onClick={scanning ? stopCamera : startCamera}
          className="w-full btn-primary rounded-xl py-3 px-4 flex items-center justify-center gap-2 font-bold text-sm"
        >
          <Camera className="w-5 h-5" />
          {scanning ? 'Stop Camera Scanner' : 'Scan with Camera'}
        </button>

        <div className="flex items-center gap-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <span className="h-px flex-1 bg-slate-800" />
          or enter pass code
          <span className="h-px flex-1 bg-slate-800" />
        </div>

        <form onSubmit={(event) => { event.preventDefault(); verify(); }} className="flex gap-3">
          <input
            value={qrCodeData}
            onChange={(event) => setQrCodeData(event.target.value)}
            placeholder="e.g. #CRMS-PASS-1 or 1 or BOOKING-1-..."
            className="flex-1 glass-input rounded-xl px-4 py-3 text-sm text-slate-100"
          />
          <button type="submit" className="btn-secondary rounded-xl px-6 py-3 font-semibold text-sm">
            Verify
          </button>
        </form>

        {/* Verification Result Card */}
        {result && (
          <div className={`rounded-2xl border p-6 space-y-4 shadow-xl ${
            result.checked_in && !verifyError
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-100'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-100'
          }`}>
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-emerald-400" />
                <div>
                  <h3 className="font-extrabold text-base text-slate-100">
                    Pass Verified: #CRMS-PASS-{result.id}
                  </h3>
                  <span className="text-xs text-slate-400">
                    Checked in at {result.check_in_time ? new Date(result.check_in_time).toLocaleTimeString() : 'Just now'}
                  </span>
                </div>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 border border-emerald-500/30 text-emerald-300">
                {result.status}
              </span>
            </div>

            {/* Detailed Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <User className="w-3.5 h-3.5 text-slate-400" /> Student / User
                </span>
                <p className="font-bold text-slate-100">{result.user_name}</p>
                <span className="text-[11px] text-slate-400 block">{result.user_email}</span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-slate-400" /> Resource / Facility
                </span>
                <p className="font-bold text-slate-100">{result.resource_name}</p>
                <span className="text-[11px] text-slate-400 block">{result.resource_type}</span>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" /> Date & Slot
                </span>
                <p className="font-bold text-slate-100">{result.booking_date}</p>
                <div className="flex items-center gap-1 text-[11px] text-slate-400">
                  <Clock className="w-3 h-3" />
                  <span>{result.time_slot}</span>
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> Location
                </span>
                <p className="font-bold text-slate-100">{result.resource_location || 'Campus Main Block'}</p>
              </div>

              {result.purpose && (
                <div className="sm:col-span-2 pt-2 border-t border-white/10 space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5 text-slate-400" /> Purpose
                  </span>
                  <p className="text-slate-300 font-medium leading-relaxed">{result.purpose}</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
