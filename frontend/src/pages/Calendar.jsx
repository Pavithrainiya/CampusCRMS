import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Clock, 
  Layers, 
  User, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  ExternalLink, 
  X,
  Filter,
  RefreshCw
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import API from '../services/api';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';

const TIME_SLOTS = [
  '09:00 AM - 11:00 AM',
  '11:00 AM - 01:00 PM',
  '01:00 PM - 03:00 PM',
  '03:00 PM - 05:00 PM',
  '05:00 PM - 07:00 PM'
];

const getLocalDateString = (d = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export default function Calendar() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(getLocalDateString());
  const [bookings, setBookings] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Filters
  const [selectedResourceFilter, setSelectedResourceFilter] = useState('all');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [form, setForm] = useState({
    booking_date: getLocalDateString(),
    resource: '',
    time_slot: TIME_SLOTS[0],
    purpose: ''
  });
  const [formErrors, setFormErrors] = useState({});

  const loadData = async () => {
    setLoading(true);
    try {
      const [bookingsRes, resourcesRes] = await Promise.all([
        API.get('/bookings'),
        API.get('/resources')
      ]);
      setBookings(Array.isArray(bookingsRes.data) ? bookingsRes.data : []);
      const activeRes = Array.isArray(resourcesRes.data)
        ? resourcesRes.data.filter(r => r.availability_status)
        : [];
      setResources(activeRes);
      if (activeRes.length > 0 && !form.resource) {
        setForm(prev => ({ ...prev, resource: activeRes[0].id }));
      }
    } catch (error) {
      showToast('Unable to load calendar dataset.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered Bookings
  const filteredBookings = useMemo(() => {
    return bookings.filter(b => {
      if (selectedResourceFilter !== 'all' && String(b.resource) !== String(selectedResourceFilter)) {
        return false;
      }
      if (selectedStatusFilter !== 'all' && b.status !== selectedStatusFilter) {
        return false;
      }
      return true;
    });
  }, [bookings, selectedResourceFilter, selectedStatusFilter]);

  // Calendar Days Grid Generation
  const calendarDays = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const days = [];
    const startOffset = firstDay.getDay();

    // Previous month padding
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month, -i),
        isCurrentMonth: false
      });
    }

    // Current month days
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }

    // Next month padding to reach 42 cells (6 rows)
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      days.push({
        date: new Date(year, month + 1, i),
        isCurrentMonth: false
      });
    }

    return days;
  }, [currentDate]);

  const getBookingsForDate = (date) => {
    const dateStr = getLocalDateString(date);
    return filteredBookings.filter(b => b.booking_date === dateStr);
  };

  const selectedDateBookings = useMemo(() => {
    return filteredBookings.filter(b => b.booking_date === selectedDateStr);
  }, [filteredBookings, selectedDateStr]);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(getLocalDateString(today));
  };

  const openCreateModal = (dateStr = selectedDateStr) => {
    setSelectedBooking(null);
    setForm({
      booking_date: dateStr,
      resource: resources[0]?.id || '',
      time_slot: TIME_SLOTS[0],
      purpose: ''
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const openDetailsModal = (booking) => {
    setSelectedBooking(booking);
    setModalOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!form.resource) errors.resource = 'Resource is required';
    if (!form.booking_date) errors.booking_date = 'Date is required';
    if (!form.purpose.trim()) errors.purpose = 'Purpose is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateBooking = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await API.post('/bookings', form);
      showToast('Booking request submitted successfully!', 'success');
      setModalOpen(false);
      loadData();
    } catch (error) {
      const message = error.response?.data?.error || 
                      error.response?.data?.resource?.[0] || 
                      error.response?.data?.time_slot?.[0] || 
                      'Failed to create booking.';
      showToast(message, 'error');
    }
  };

  const openGoogleCalendar = (booking) => {
    if (!booking) return;
    try {
      const [startStr, endStr] = (booking.time_slot || '').split('-').map(s => s.trim());
      const parseTime = (timeStr) => {
        if (!timeStr) return '090000';
        const [clock, period] = timeStr.split(' ');
        let [h, m] = clock.split(':').map(Number);
        if (period === 'PM' && h !== 12) h += 12;
        if (period === 'AM' && h === 12) h = 0;
        return `${String(h).padStart(2, '0')}${String(m || 0).padStart(2, '0')}00`;
      };
      
      const cleanDate = booking.booking_date.replace(/-/g, '');
      const startIso = `${cleanDate}T${parseTime(startStr)}`;
      const endIso = `${cleanDate}T${parseTime(endStr)}`;
      
      const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: `CampusRMS: ${booking.resource_name}`,
        dates: `${startIso}/${endIso}`,
        details: `Booking ID: #${booking.id}\nBooked by: ${booking.user_name}\nPurpose: ${booking.purpose || 'Campus Resource Reservation'}`,
        location: booking.resource_location || 'Campus Main Block'
      });

      window.open(`https://calendar.google.com/calendar/render?${params}`, '_blank', 'noopener,noreferrer');
    } catch (err) {
      showToast('Could not format Google Calendar link.', 'error');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="w-3 h-3" /> Approved
          </span>
        );
      case 'Rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <XCircle className="w-3 h-3" /> Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Clock className="w-3 h-3" /> Pending
          </span>
        );
    }
  };

  const todayStr = getLocalDateString();

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-primary-500/10 border border-primary-500/20 text-primary-400">
            <CalendarIcon className="w-6 h-6 animate-pulse-subtle" />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-100 tracking-tight">Interactive Calendar</h1>
            <p className="text-xs text-slate-400">Visualize schedule density, filter reservations, and organize bookings</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-all"
            title="Refresh schedule data"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          
          {user?.role === 'Student' && (
            <button
              onClick={() => openCreateModal()}
              className="btn-primary px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              New Booking
            </button>
          )}
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="glass-panel rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-primary-400" /> Filters:
          </span>

          {/* Resource Filter */}
          <select
            value={selectedResourceFilter}
            onChange={(e) => setSelectedResourceFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg glass-input text-xs text-slate-200"
          >
            <option value="all" className="bg-slate-900">All Resources</option>
            {resources.map(r => (
              <option key={r.id} value={r.id} className="bg-slate-900">
                {r.resource_name} ({r.resource_type})
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatusFilter}
            onChange={(e) => setSelectedStatusFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg glass-input text-xs text-slate-200"
          >
            <option value="all" className="bg-slate-900">All Statuses</option>
            <option value="Approved" className="bg-slate-900">Approved</option>
            <option value="Pending" className="bg-slate-900">Pending</option>
            <option value="Rejected" className="bg-slate-900">Rejected</option>
          </select>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400" /> Approved
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-400" /> Pending
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-400" /> Rejected
          </span>
        </div>
      </div>

      {/* Main Grid + Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar Month Grid */}
        <div className="lg:col-span-2 glass-panel rounded-xl p-5 shadow-xl flex flex-col space-y-4">
          {/* Calendar Header Navigation */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
            <h2 className="text-lg font-black text-slate-100 tracking-tight">
              {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>

            <div className="flex items-center gap-2">
              <button
                onClick={goToToday}
                className="px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold text-slate-200 transition-all"
              >
                Today
              </button>
              <div className="flex bg-slate-900 border border-slate-800 rounded-lg p-0.5">
                <button
                  onClick={prevMonth}
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={nextMonth}
                  className="p-1.5 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Weekday Header */}
          <div className="grid grid-cols-7 gap-2 text-center text-xs font-extrabold text-slate-500 uppercase tracking-wider">
            <div>Sun</div>
            <div>Mon</div>
            <div>Tue</div>
            <div>Wed</div>
            <div>Thu</div>
            <div>Fri</div>
            <div>Sat</div>
          </div>

          {/* Day Cells */}
          {loading ? (
            <div className="py-24 flex items-center justify-center">
              <div className="w-8 h-8 rounded-full border-2 border-t-primary-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2 flex-1">
              {calendarDays.map((cell, index) => {
                const cellDateStr = getLocalDateString(cell.date);
                const isSelected = cellDateStr === selectedDateStr;
                const isToday = cellDateStr === todayStr;
                const cellBookings = getBookingsForDate(cell.date);

                const pendingCount = cellBookings.filter(b => b.status === 'Pending').length;
                const approvedCount = cellBookings.filter(b => b.status === 'Approved').length;

                return (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedDateStr(cellDateStr);
                      if (isSelected && user?.role === 'Student') {
                        openCreateModal(cellDateStr);
                      }
                    }}
                    title={user?.role === 'Student' ? `Click to select date, click again to book ${cellDateStr}` : `Select ${cellDateStr}`}
                    className={`min-h-[72px] rounded-xl border p-2 flex flex-col justify-between items-start transition-all relative group text-left cursor-pointer ${
                      !cell.isCurrentMonth
                        ? 'bg-slate-950/20 border-transparent text-slate-600 opacity-40'
                        : isSelected
                        ? 'bg-primary-500/15 border-primary-500 text-primary-300 shadow-md shadow-primary-500/10 ring-1 ring-primary-500/40'
                        : isToday
                        ? 'bg-slate-900/80 border-primary-500/40 text-slate-100 font-bold'
                        : 'bg-slate-900/40 border-slate-800/60 text-slate-300 hover:bg-slate-800/50 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className={`text-xs ${isToday ? 'px-1.5 py-0.5 rounded bg-primary-500 text-white font-extrabold' : 'font-bold'}`}>
                        {cell.date.getDate()}
                      </span>
                      {cellBookings.length > 0 && (
                        <span className="text-[9px] font-black px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                          {cellBookings.length}
                        </span>
                      )}
                    </div>

                    {/* Booking Badges */}
                    <div className="w-full space-y-1 mt-1">
                      {cellBookings.slice(0, 2).map((b) => (
                        <div
                          key={b.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetailsModal(b);
                          }}
                          className={`text-[9px] font-extrabold truncate px-1.5 py-0.5 rounded flex items-center justify-between cursor-pointer transition-transform hover:scale-[1.02] ${
                            b.status === 'Approved'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : b.status === 'Pending'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                          title={`${b.status}: ${b.resource_name} (${b.time_slot})`}
                        >
                          <span className="truncate flex items-center gap-1">
                            {b.status === 'Approved' ? '✓ ' : b.status === 'Pending' ? '⏳ ' : '✕ '}
                            {b.resource_name}
                          </span>
                        </div>
                      ))}
                      {cellBookings.length > 2 && (
                        <span className="text-[9px] text-slate-500 font-bold block text-right">
                          +{cellBookings.length - 2} more
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Selected Date Schedule Sidebar */}
        <div className="glass-panel rounded-xl p-5 shadow-xl flex flex-col border border-slate-800/60">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
            <div>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Selected Date</span>
              <h3 className="text-base font-black text-slate-100">
                {new Date(selectedDateStr + 'T00:00:00').toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric'
                })}
              </h3>
            </div>

            {user?.role === 'Student' && (
              <button
                onClick={() => openCreateModal(selectedDateStr)}
                className="px-3 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white transition-all text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-primary-500/20"
              >
                <Plus className="w-3.5 h-3.5" /> Book Date
              </button>
            )}
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 max-h-[500px]">
            {selectedDateBookings.length === 0 ? (
              <div className="text-center py-16 px-4 flex flex-col items-center justify-center">
                <CalendarIcon className="w-10 h-10 text-slate-600 mb-3" />
                <h4 className="text-sm font-bold text-slate-400">No Reservations</h4>
                <p className="text-xs text-slate-500 mt-1 mb-4">There are no bookings scheduled for this date matching your filters.</p>
                {user?.role === 'Student' && (
                  <button
                    onClick={() => openCreateModal(selectedDateStr)}
                    className="btn-primary px-3.5 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-primary-500/20"
                  >
                    <Plus className="w-3.5 h-3.5" /> Reserve This Date
                  </button>
                )}
              </div>
            ) : (
              selectedDateBookings.map((b) => (
                <div
                  key={b.id}
                  onClick={() => openDetailsModal(b)}
                  className="p-4 rounded-xl glass-card border border-slate-800/60 hover:border-primary-500/30 transition-all cursor-pointer space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-extrabold text-slate-200 line-clamp-1">{b.resource_name}</h4>
                      <span className="text-[11px] text-slate-400 block">{b.resource_type}</span>
                    </div>
                    {getStatusBadge(b.status)}
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>{b.time_slot}</span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-400 truncate">
                    <User className="w-3.5 h-3.5 text-slate-500" />
                    <span className="truncate">{b.user_name} ({b.user_email})</span>
                  </div>

                  {b.purpose && (
                    <p className="text-xs text-slate-400 line-clamp-2 pt-1 border-t border-slate-800/50">
                      {b.purpose}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal Dialog (Create or Details) */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="w-full max-w-md glass-panel border border-slate-800 rounded-2xl p-6 shadow-2xl relative my-auto max-h-[90vh] overflow-y-auto"
            >
              <button
                onClick={() => setModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              {selectedBooking ? (
                /* Booking Details View */
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Reservation Details</span>
                      <h3 className="text-lg font-black text-slate-100">#{selectedBooking.id} - {selectedBooking.resource_name}</h3>
                    </div>
                    {getStatusBadge(selectedBooking.status)}
                  </div>

                  <div className="space-y-3 text-xs bg-slate-950/40 p-4 rounded-xl border border-slate-800/60 text-slate-300">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Facility Resource</span>
                      <p className="font-semibold text-slate-200">{selectedBooking.resource_name} ({selectedBooking.resource_type})</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Schedule Date & Time</span>
                      <p className="font-semibold text-slate-200">{selectedBooking.booking_date} ({selectedBooking.time_slot})</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Requested By</span>
                      <p className="font-semibold text-slate-200">{selectedBooking.user_name} ({selectedBooking.user_email})</p>
                    </div>
                    {selectedBooking.purpose && (
                      <div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase block">Purpose</span>
                        <p className="font-medium text-slate-300 leading-relaxed">{selectedBooking.purpose}</p>
                      </div>
                    )}
                  </div>

                  {selectedBooking.status === 'Approved' && (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300 text-xs font-semibold flex items-center justify-between">
                      <span>Unique Approval Pass Code: <strong className="font-mono text-emerald-200">#CRMS-PASS-{selectedBooking.id}</strong></span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">Approved</span>
                    </div>
                  )}

                  <div className="pt-2">
                    <button
                      onClick={() => openGoogleCalendar(selectedBooking)}
                      className="w-full btn-primary py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold"
                    >
                      <ExternalLink className="w-4 h-4" /> Add to Google Calendar
                    </button>
                  </div>
                </div>
              ) : (
                /* New Booking Request Form */
                <form onSubmit={handleCreateBooking} className="space-y-4">
                  <div className="border-b border-slate-800 pb-3">
                    <h3 className="text-lg font-black text-slate-100">New Reservation Request</h3>
                    <p className="text-xs text-slate-400">Request facility slot on {form.booking_date}</p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Select Facility Resource
                    </label>
                    <select
                      value={form.resource}
                      onChange={(e) => setForm({ ...form, resource: e.target.value })}
                      className="w-full px-3 py-2.5 rounded-xl glass-input text-xs text-slate-200"
                    >
                      {resources.map((r) => (
                        <option key={r.id} value={r.id} className="bg-slate-900 text-slate-200">
                          {r.resource_name} ({r.resource_type}) - Cap: {r.capacity}
                        </option>
                      ))}
                    </select>
                    {formErrors.resource && (
                      <span className="text-xs text-rose-400 mt-1 block">{formErrors.resource}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Booking Date
                      </label>
                      <input
                        type="date"
                        value={form.booking_date}
                        onChange={(e) => setForm({ ...form, booking_date: e.target.value })}
                        onClick={(e) => { try { e.target.showPicker(); } catch(err){} }}
                        min={todayStr}
                        className="w-full px-3 py-2.5 rounded-xl glass-input text-xs text-slate-200 cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                        Time Slot
                      </label>
                      <select
                        value={form.time_slot}
                        onChange={(e) => setForm({ ...form, time_slot: e.target.value })}
                        className="w-full px-3 py-2.5 rounded-xl glass-input text-xs text-slate-200"
                      >
                        {TIME_SLOTS.map((slot) => (
                          <option key={slot} value={slot} className="bg-slate-900 text-slate-200">
                            {slot}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                      Purpose of Reservation
                    </label>
                    <textarea
                      rows={3}
                      value={form.purpose}
                      onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                      placeholder="e.g. Group study session, Lab experiment, Project presentation"
                      className="w-full px-3 py-2.5 rounded-xl glass-input text-xs text-slate-200 placeholder:text-slate-500"
                    />
                    {formErrors.purpose && (
                      <span className="text-xs text-rose-400 mt-1 block">{formErrors.purpose}</span>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full btn-primary py-3 px-4 rounded-xl font-bold text-xs shadow-lg flex items-center justify-center gap-2"
                  >
                    Submit Booking Request
                  </button>
                </form>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
