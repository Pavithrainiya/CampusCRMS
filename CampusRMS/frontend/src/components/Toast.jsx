import React, { useEffect } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

const Toast = ({ message, type = 'success', onClose, duration = 4000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-sky-400 shrink-0" />,
  };

  const borders = {
    success: 'border-emerald-500/20 bg-emerald-950/20',
    error: 'border-rose-500/20 bg-rose-950/20',
    info: 'border-sky-500/20 bg-sky-950/20',
  };

  return (
    <div className={`flex items-center gap-3 px-4 py-3 rounded-lg border ${borders[type]} shadow-xl backdrop-blur-md pointer-events-auto max-w-sm transition-all duration-300 transform translate-y-0 opacity-100`}>
      {icons[type]}
      <p className="text-sm text-slate-200 font-medium flex-1">{message}</p>
      <button onClick={onClose} className="text-slate-400 hover:text-slate-200 transition-colors shrink-0">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};

export default Toast;
