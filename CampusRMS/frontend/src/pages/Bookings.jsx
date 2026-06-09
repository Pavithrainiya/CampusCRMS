import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import API from '../services/api';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Layers, 
  CheckCircle2, 
  XCircle, 
  Trash2, 
  Edit2, 
  Info,
  X,
  FileText,
  ChevronLeft,
  ChevronRight,
  List,
  Ticket,
  Printer
} from 'lucide-react';
import { motion } from 'framer-motion';

const Bookings = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();

  const [bookings, setBookings] = useState([]);
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // all, upcoming, past
  
  // View mode: 'list' or 'calendar'
  const [viewMode, setViewMode] = useState('list');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(new Date().toISOString().split('T')[0]);

  // Printable Access Pass State
  const [activePass, setActivePass] = useState(null);

  // Modal / Form states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingBooking, setEditingBooking] = useState(null);
  const [formData, setFormData] = useState({
    resource: '',
    booking_date: '',
    time_slot: '09:00 AM - 11:00 AM',
    purpose: ''
  });
  
  // Recurring booking state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState('daily');
  
  const [formErrors, setFormErrors] = useState({});

  const timeSlots = [
    '09:00 AM - 11:00 AM',
    '11:00 AM - 01:00 PM',
    '01:00 PM - 03:00 PM',
    '03:00 PM - 05:00 PM',
    '05:00 PM - 07:00 PM'
  ];

  const fetchBookings = async () => {
    setLoading(true);
    try {
      const response = await API.get('/bookings', {
        params: { filter: filterType }
      });
      setBookings(response.data);
    } catch (error) {
      showToast('Failed to load bookings', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveResources = async () => {
    try {
      const response = await API.get('/resources');
      setResources(response.data.filter(r => r.availability_status));
    } catch (error) {
      console.error('Failed to load resources', error);
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchActiveResources();
  }, [filterType]);

  // Handle preselection logic from Resources "Book Now" button
  useEffect(() => {
    if (location.state?.preselectedResourceId) {
      const { preselectedResourceId } = location.state;
      setFormData({
        resource: preselectedResourceId,
        booking_date: new Date().toISOString().split('T')[0], // default to today
        time_slot: '09:00 AM - 11:00 AM',
        purpose: ''
      });
      setIsRecurring(false);
      setEditingBooking(null);
      setFormErrors({});
      setIsModalOpen(true);
      
      window.history.replaceState({}, document.title);
    }
  }, [location]);

  const handleOpenAddModal = () => {
    setEditingBooking(null);
    setFormData({
      resource: resources[0]?.id || '',
      booking_date: new Date().toISOString().split('T')[0],
      time_slot: '09:00 AM - 11:00 AM',
      purpose: ''
    });
    setIsRecurring(false);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (booking) => {
    setEditingBooking(booking);
    setFormData({
      resource: booking.resource,
      booking_date: booking.booking_date,
      time_slot: booking.time_slot,
      purpose: booking.purpose
    });
    setIsRecurring(false);
    setFormErrors({});
    setIsModalOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.resource) errors.resource = 'Resource selection is required';
    if (!formData.booking_date) {
      errors.booking_date = 'Date is required';
    } else {
      const selectedDate = new Date(formData.booking_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      selectedDate.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        errors.booking_date = 'Cannot book a date in the past';
      }
    }
    if (!formData.purpose.trim()) errors.purpose = 'Purpose of booking is required';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveBooking = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const payload = {
        ...formData,
        recurring_type: isRecurring ? recurringType : null
      };

      if (editingBooking) {
        await API.put(`/bookings/${editingBooking.id}`, payload);
        showToast('Booking updated successfully', 'success');
      } else {
        await API.post('/bookings', payload);
        if (isRecurring) {
          showToast('3 recurring bookings requested successfully!', 'success');
        } else {
          showToast('Booking requested successfully. Awaiting approval!', 'success');
        }
      }
      setIsModalOpen(false);
      fetchBookings();
    } catch (error) {
      const message = error.response?.data?.error ||
                      error.response?.data?.non_field_errors?.[0] || 
                      error.response?.data?.time_slot?.[0] || 
                      error.response?.data?.resource?.[0] || 
                      error.response?.data?.booking_date?.[0] ||
                      'Booking validation failed.';
      showToast(message, 'error');
    }
  };

  const handleCancelBooking = async (id) => {
    if (window.confirm('Are you sure you want to cancel this booking?')) {
      try {
        await API.delete(`/bookings/${id}`);
        showToast('Booking cancelled successfully', 'success');
        fetchBookings();
      } catch (error) {
        showToast('Failed to cancel booking', 'error');
      }
    }
  };

  const handleApprove = async (id) => {
    try {
      await API.post(`/bookings/${id}/approve`);
      showToast('Booking approved successfully!', 'success');
      fetchBookings();
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to approve booking';
      showToast(message, 'error');
    }
  };

  const handleReject = async (id) => {
    try {
      await API.post(`/bookings/${id}/reject`);
      showToast('Booking rejected.', 'info');
      fetchBookings();
    } catch (error) {
      const message = error.response?.data?.error || 'Failed to reject booking';
      showToast(message, 'error');
    }
  };

  const handleCheckIn = async (bookingId) => {
    try {
      const response = await API.post(`/bookings/${bookingId}/check_in`);
      showToast('Check-in completed successfully!', 'success');
      setActivePass(response.data);
      fetchBookings();
    } catch (error) {
      const message = error.response?.data?.error || 'Check-in failed.';
      showToast(message, 'error');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Approved':
        return (
          <span className="flex items-center gap-1 w-fit px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" /> Approved
          </span>
        );
      case 'Rejected':
        return (
          <span className="flex items-center gap-1 w-fit px-2.5 py-1 rounded-full text-xs font-semibold bg-rose-500/10 border border-rose-500/20 text-rose-400">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 w-fit px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-400">
            <Clock className="w-3.5 h-3.5" /> Pending
          </span>
        );
    }
  };

  // Monthly Calendar Calculations
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const days = [];
    // Previous month padding days
    const startOffset = firstDay.getDay();
    for (let i = startOffset - 1; i >= 0; i--) {
      days.push({
        date: new Date(year, month, -i),
        isCurrentMonth: false
      });
    }
    
    // Current month days
    const totalDays = lastDay.getDate();
    for (let i = 1; i <= totalDays; i++) {
      days.push({
        date: new Date(year, month, i),
        isCurrentMonth: true
      });
    }
    
    return days;
  };

  const calendarDays = getDaysInMonth(currentDate);

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const getBookingsForDate = (date) => {
    const dateString = date.toISOString().split('T')[0];
    return bookings.filter(b => b.booking_date === dateString);
  };

  const selectedDateBookings = bookings.filter(b => b.booking_date === selectedDateStr);

  return (
    <div className="space-y-6">
      {/* Header and Booking Actions */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">Resource Bookings</h1>
          <p className="text-xs text-slate-400">
            {user?.role === 'Student' 
              ? 'View status, edit, or create your facility booking schedules' 
              : 'Inspect, manage, and approve/reject campus reservation requests'}
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* List/Calendar Toggle */}
          <div className="flex bg-slate-900 border border-slate-800 p-0.5 rounded-lg">
            <button
              onClick={() => setViewMode('list')}
              className={`p-2 rounded-md transition-all duration-200 ${
                viewMode === 'list' 
                  ? 'bg-slate-800 text-primary-400' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="List View"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`p-2 rounded-md transition-all duration-200 ${
                viewMode === 'calendar' 
                  ? 'bg-slate-800 text-primary-400' 
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Calendar View"
            >
              <CalendarIcon className="w-4 h-4" />
            </button>
          </div>

          {user?.role === 'Student' && (
            <button
              onClick={handleOpenAddModal}
              className="btn-primary px-4 py-2.5 rounded-lg flex items-center gap-2 text-sm font-semibold"
            >
              <Plus className="w-4 h-4" />
              Book a Resource
            </button>
          )}
        </div>
      </div>

      {viewMode === 'list' ? (
        <>
          {/* Filter Options */}
          <div className="glass-panel rounded-xl p-4 border border-slate-800/60 flex items-center gap-2 overflow-x-auto">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-2">
              Timeframe:
            </span>
            {['all', 'upcoming', 'past'].map((type) => (
              <button
                key={type}
                onClick={() => setFilterType(type)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold border capitalize transition-all duration-200 ${
                  filterType === type
                    ? 'bg-primary-500/15 border-primary-500 text-primary-400'
                    : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {type} Bookings
              </button>
            ))}
          </div>

          {/* Bookings List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 rounded-full border-2 border-t-primary-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="glass-panel rounded-xl border border-slate-800/50 p-12 text-center max-w-md mx-auto">
              <Info className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-300">No bookings found</h3>
              <p className="text-slate-500 text-sm mt-1">There are no reservation entries in this category.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {bookings.map((booking) => (
                <div 
                  key={booking.id} 
                  className="glass-card rounded-xl border p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-5 shadow-lg"
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 flex-1">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <Layers className="w-3 h-3 text-slate-600" /> Resource
                      </span>
                      <p className="text-sm font-extrabold text-slate-200 truncate">{booking.resource_name}</p>
                      <span className="text-[11px] text-slate-400 block">{booking.resource_type}</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <CalendarIcon className="w-3 h-3 text-slate-600" /> Schedule
                      </span>
                      <p className="text-sm font-bold text-slate-300">{booking.booking_date}</p>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <Clock className="w-3 h-3" />
                        <span>{booking.time_slot}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-600" /> Booked By
                      </span>
                      <p className="text-sm font-semibold text-slate-300 truncate">{booking.user_name}</p>
                      <span className="text-[11px] text-slate-400 block truncate">{booking.user_email}</span>
                    </div>

                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                        <FileText className="w-3 h-3 text-slate-600" /> Purpose
                      </span>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{booking.purpose}</p>
                    </div>
                  </div>

                  <div className="flex flex-row sm:items-center justify-between lg:justify-end gap-5 border-t border-slate-800/40 lg:border-t-0 pt-4 lg:pt-0">
                    <div className="flex items-center gap-2">
                      {getStatusBadge(booking.status)}
                      
                      {booking.status === 'Approved' && (
                        <button
                          onClick={() => setActivePass(booking)}
                          className="p-1.5 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-400 hover:bg-primary-500 hover:text-white transition-all duration-200"
                          title="View Access Pass"
                        >
                          <Ticket className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {user?.role === 'Admin' && booking.status === 'Pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(booking.id)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-white transition-all duration-200 text-xs font-semibold"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(booking.id)}
                            className="px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white transition-all duration-200 text-xs font-semibold"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {user?.role === 'Student' && booking.status === 'Pending' && (
                        <>
                          <button
                            onClick={() => handleOpenEditModal(booking)}
                            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-all"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleCancelBooking(booking.id)}
                            className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-rose-400 hover:text-rose-300 hover:border-rose-500/30 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Calendar View Mode */
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar Grid card */}
          <div className="lg:col-span-2 glass-panel rounded-xl border border-slate-800/60 p-5 shadow-lg">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-base font-extrabold text-slate-200">
                {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
              </h2>
              <div className="flex gap-1">
                <button 
                  onClick={prevMonth}
                  className="p-2 rounded-md bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button 
                  onClick={nextMonth}
                  className="p-2 rounded-md bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Week Headers */}
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-bold text-slate-500 mb-2">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>

            {/* Calendar Cells */}
            <div className="grid grid-cols-7 gap-2">
              {calendarDays.map((cell, index) => {
                const dayBookings = getBookingsForDate(cell.date);
                const cellDateStr = cell.date.toISOString().split('T')[0];
                const isSelected = cellDateStr === selectedDateStr;
                
                // Color indications
                const hasPending = dayBookings.some(b => b.status === 'Pending');
                const hasApproved = dayBookings.some(b => b.status === 'Approved');

                return (
                  <button
                    key={index}
                    onClick={() => setSelectedDateStr(cellDateStr)}
                    className={`h-16 rounded-lg border p-1 flex flex-col justify-between items-start transition-all relative ${
                      !cell.isCurrentMonth 
                        ? 'bg-slate-950/20 border-transparent text-slate-600' 
                        : isSelected
                        ? 'bg-primary-500/10 border-primary-500 text-primary-400 shadow-md shadow-primary-500/5'
                        : 'bg-slate-900/30 border-slate-800/60 text-slate-300 hover:bg-slate-800/40 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-xs font-bold">{cell.date.getDate()}</span>
                    
                    {/* Dots representing bookings */}
                    <div className="flex gap-1 w-full justify-end">
                      {hasPending && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />}
                      {hasApproved && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Date Schedule List */}
          <div className="glass-panel rounded-xl border border-slate-800/60 p-5 shadow-lg flex flex-col">
            <h2 className="text-base font-extrabold text-slate-200 border-b border-slate-800 pb-3 mb-4">
              Bookings on <span className="text-primary-400">{selectedDateStr}</span>
            </h2>

            <div className="flex-1 overflow-y-auto space-y-4 max-h-[350px]">
              {selectedDateBookings.length === 0 ? (
                <div className="text-center py-12">
                  <CalendarIcon className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-500">No reservations scheduled for this date</p>
                </div>
              ) : (
                selectedDateBookings.map((booking) => (
                  <div key={booking.id} className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/50 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-xs font-black text-slate-200 truncate max-w-[120px]">
                          {booking.resource_name}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {getStatusBadge(booking.status)}
                          {booking.status === 'Approved' && (
                            <button
                              onClick={() => setActivePass(booking)}
                              className="p-1 rounded bg-primary-500/10 border border-primary-500/20 text-primary-400 hover:bg-primary-500 hover:text-white"
                              title="View Access Pass"
                            >
                              <Ticket className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{booking.time_slot}</span>
                      </div>
                      
                      <p className="text-[11px] text-slate-500 truncate mt-1">Booked by: {booking.user_name}</p>
                    </div>

                    <div className="flex justify-end gap-1.5">
                      {user?.role === 'Admin' && booking.status === 'Pending' && (
                        <>
                          <button
                            onClick={() => handleApprove(booking.id)}
                            className="px-2 py-1 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-bold"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => handleReject(booking.id)}
                            className="px-2 py-1 rounded bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-bold"
                          >
                            Reject
                          </button>
                        </>
                      )}

                      {user?.role === 'Student' && booking.status === 'Pending' && (
                        <>
                          <button
                            onClick={() => handleOpenEditModal(booking)}
                            className="p-1 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleCancelBooking(booking.id)}
                            className="p-1 rounded bg-slate-800 border border-slate-700 text-rose-400 hover:text-rose-300"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Access Pass Ticket Modal */}
      {activePass && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm print:p-0 print:bg-white print:backdrop-blur-none">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative print:border-0 print:shadow-none print:bg-white print:text-black">
            {/* Close button */}
            <button
              onClick={() => setActivePass(null)}
              className="absolute top-4 right-4 p-1 rounded-md text-slate-500 hover:text-slate-350 hover:bg-slate-850 print:hidden"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Access Pass Voucher design */}
            <div className="text-center space-y-4 print:space-y-6">
              <div className="flex items-center justify-center gap-2 text-primary-400 print:text-primary-600">
                <Ticket className="w-6 h-6 animate-pulse-subtle print:animate-none" />
                <span className="text-xs font-black tracking-widest uppercase">Campus Resource Access Pass</span>
              </div>

              <div className="border-y border-dashed border-slate-800 py-4 space-y-2 print:border-slate-300">
                <h3 className="text-xl font-black text-slate-100 tracking-tight print:text-black">
                  {activePass.resource_name}
                </h3>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 uppercase">
                  Approved
                </span>
              </div>

              {/* Grid details */}
              <div className="grid grid-cols-2 gap-4 text-left text-xs bg-slate-950/40 p-4 rounded-xl border border-slate-800/60 print:bg-white print:border-slate-200">
                <div>
                  <span className="text-[9px] text-slate-500 font-bold uppercase block">Holder</span>
                  <span className="font-semibold text-slate-200 truncate block print:text-black">{activePass.user_name}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-bold uppercase block">Pass ID</span>
                  <span className="font-mono text-slate-300 block print:text-black">#CRMS-PASS-{activePass.id}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-bold uppercase block">Date</span>
                  <span className="font-semibold text-slate-200 block print:text-black">{activePass.booking_date}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 font-bold uppercase block">Time Slot</span>
                  <span className="font-semibold text-slate-200 block print:text-black">{activePass.time_slot}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-[9px] text-slate-500 font-bold uppercase block">Location</span>
                  <span className="font-semibold text-slate-200 block print:text-black">{activePass.resource_location || 'Campus Main Block'}</span>
                </div>
              </div>

              {/* Barcode Mockup */}
              <div className="space-y-1 py-2">
                <div className="flex justify-center items-center gap-[1px] h-10 w-full bg-white p-2 rounded border border-slate-800 print:border-slate-300">
                  {[3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 3, 1, 2, 4, 1, 3, 2, 1, 4, 2, 1, 3, 2, 4, 1, 3].map((width, idx) => (
                    <div key={idx} className="bg-black h-full" style={{ width: `${width}px` }} />
                  ))}
                </div>
                <span className="text-[9px] font-mono text-slate-500 tracking-widest block uppercase">
                  *CRMS-{activePass.id}*
                </span>
              </div>

              {/* Actions row */}
              <div className="flex flex-col gap-2 print:hidden">
                {!activePass.checked_in ? (
                  <button
                    onClick={() => handleCheckIn(activePass.id)}
                    className="w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-all duration-200"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Simulate QR Check-In
                  </button>
                ) : (
                  <div className="py-2.5 px-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4" /> Checked In at {new Date(activePass.check_in_time).toLocaleTimeString()}
                  </div>
                )}

                <button
                  onClick={() => window.print()}
                  className="w-full btn-primary py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-xs font-semibold"
                >
                  <Printer className="w-4 h-4" /> Print Access Pass
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit Booking Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-lg glass-panel border-slate-800 rounded-2xl shadow-2xl relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-md text-slate-500 hover:text-slate-350 hover:bg-slate-850"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="px-6 py-5 border-b border-slate-800/60">
              <h2 className="text-lg font-bold text-slate-100">
                {editingBooking ? 'Edit Booking details' : 'Book a Facility Resource'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Reserve spaces for group work, experiments, or lectures</p>
            </div>

            <form onSubmit={handleSaveBooking} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Select Resource
                </label>
                <select
                  value={formData.resource}
                  onChange={(e) => setFormData({ ...formData, resource: e.target.value })}
                  disabled={!!editingBooking}
                  className="w-full px-3 py-2.5 rounded-lg glass-input text-slate-200 text-sm disabled:opacity-55 disabled:cursor-not-allowed"
                >
                  {editingBooking ? (
                    <option value={formData.resource}>{editingBooking.resource_name}</option>
                  ) : (
                    resources.map((r) => (
                      <option key={r.id} value={r.id} className="bg-slate-900 text-slate-200">
                        {r.resource_name} ({r.resource_type}) - Cap: {r.capacity}
                      </option>
                    ))
                  )}
                </select>
                {formErrors.resource && (
                  <span className="text-xs text-rose-400 mt-1 block">{formErrors.resource}</span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Booking Date
                  </label>
                  <input
                    type="date"
                    value={formData.booking_date}
                    onChange={(e) => setFormData({ ...formData, booking_date: e.target.value })}
                    className={`w-full px-3 py-2.5 rounded-lg glass-input text-slate-200 text-sm ${
                      formErrors.booking_date ? 'border-rose-500/50' : ''
                    }`}
                    min={new Date().toISOString().split('T')[0]}
                  />
                  {formErrors.booking_date && (
                    <span className="text-xs text-rose-400 mt-1 block">{formErrors.booking_date}</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Select Time Slot
                  </label>
                  <select
                    value={formData.time_slot}
                    onChange={(e) => setFormData({ ...formData, time_slot: e.target.value })}
                    className="w-full px-3 py-2.5 rounded-lg glass-input text-slate-200 text-sm"
                  >
                    {timeSlots.map((slot) => (
                      <option key={slot} value={slot} className="bg-slate-900 text-slate-200">
                        {slot}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Recurring schedules form option */}
              {!editingBooking && (
                <div className="p-3.5 rounded-lg bg-slate-950/40 border border-slate-800/80 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_recurring"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-800 bg-slate-900 text-primary-500 focus:ring-primary-500 focus:ring-offset-slate-950"
                    />
                    <label htmlFor="is_recurring" className="text-xs font-bold text-slate-300 uppercase tracking-wide cursor-pointer">
                      Make this a Recurring Booking
                    </label>
                  </div>
                  
                  {isRecurring && (
                    <div className="flex flex-col gap-1.5 animate-fadeIn">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Frequency Option
                      </label>
                      <select
                        value={recurringType}
                        onChange={(e) => setRecurringType(e.target.value)}
                        className="w-full px-3 py-2 rounded glass-input text-slate-200 text-xs"
                      >
                        <option value="daily" className="bg-slate-900">Daily (for the next 3 days)</option>
                        <option value="weekly" className="bg-slate-900">Weekly (for the next 3 weeks)</option>
                      </select>
                      <span className="text-[10px] text-slate-500 italic mt-0.5">
                        *Note: Bulk booking will create 3 independent reservations. If there is a schedule conflict on any date, the transaction will fail.
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Purpose of Booking
                </label>
                <textarea
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  rows="3"
                  className={`w-full px-3 py-2.5 rounded-lg glass-input text-slate-200 text-sm ${
                    formErrors.purpose ? 'border-rose-500/50' : ''
                  }`}
                  placeholder="e.g., Computer science group project study session, database design labs."
                />
                {formErrors.purpose && (
                  <span className="text-xs text-rose-400 mt-1 block">{formErrors.purpose}</span>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/60 mt-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary px-4 py-2 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-4 py-2 rounded-lg text-xs font-semibold"
                >
                  Confirm Reservation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Bookings;
