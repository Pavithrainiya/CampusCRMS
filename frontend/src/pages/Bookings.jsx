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
  Printer,
  Download,
  Star,
  MessageSquare,
  MapPin,
  Tag,
  BookMarked,
  Users
} from 'lucide-react';
import { motion } from 'framer-motion';

const Bookings = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const location = useLocation();

  const [bookings, setBookings] = useState([]);
  const [resources, setResources] = useState([]);
  const [reviews, setReviews] = useState([]);
  const getLocalDateString = (d = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const getResourceId = (res) => {
    if (res === null || res === undefined) return null;
    if (typeof res === 'number') return res;
    if (typeof res === 'string' && !isNaN(Number(res)) && res.trim() !== '') return Number(res);
    if (typeof res === 'object') {
      if (res.id !== undefined && res.id !== null) return getResourceId(res.id);
      if (res.pk !== undefined && res.pk !== null) return Number(res.pk);
      if (res.resource !== undefined && res.resource !== null) return getResourceId(res.resource);
    }
    return null;
  };

  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState('all'); // all, upcoming, past
  const [statusFilter, setStatusFilter] = useState('all'); // all, Approved, Pending, Rejected
  
  // View mode: 'list' or 'calendar'
  const [viewMode, setViewMode] = useState('list');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDateStr, setSelectedDateStr] = useState(getLocalDateString());

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
  
  // Modal Month & Year picker state
  const [modalYear, setModalYear] = useState(() => new Date().getFullYear());
  const [modalMonth, setModalMonth] = useState(() => new Date().getMonth());

  useEffect(() => {
    if (formData.booking_date) {
      try {
        const parts = formData.booking_date.split('-');
        if (parts.length === 3) {
          setModalYear(parseInt(parts[0]));
          setModalMonth(parseInt(parts[1]) - 1);
        }
      } catch (err) {}
    }
  }, [formData.booking_date]);

  // Recurring booking state
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringType, setRecurringType] = useState('daily');

  // Conflict alternative suggestions & payment gateway state
  const [alternativeSlots, setAlternativeSlots] = useState([]);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [pendingPaymentResource, setPendingPaymentResource] = useState(null);
  const [cardDetails, setCardDetails] = useState({ name: '', number: '4242 •••• •••• 4242', expiry: '12/28', cvc: '123' });
  const [hasPaid, setHasPaid] = useState(false);

  // Admin Edit Resource Modal state
  const [resourceEditModalOpen, setResourceEditModalOpen] = useState(false);
  const [editingResourceData, setEditingResourceData] = useState(null);

  // Review Modal State
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [reviewResource, setReviewResource] = useState(null);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  
  const openReviewModal = (bookingOrResource) => {
    if (!bookingOrResource) return;
    const targetId = getResourceId(bookingOrResource.resource) || getResourceId(bookingOrResource);
    const matchedRes = resources.find(r => getResourceId(r) === targetId);
    
    const finalResource = matchedRes || {
      id: targetId,
      resource_name: bookingOrResource.resource_name || bookingOrResource.resource?.resource_name || 'Facility Resource',
      resource_type: bookingOrResource.resource_type || bookingOrResource.resource?.resource_type || 'Classroom',
      location: bookingOrResource.resource_location || bookingOrResource.resource?.location || ''
    };
    
    setReviewResource(finalResource);
    setReviewRating(5);
    setReviewComment('');
    setReviewModalOpen(true);
  };
  
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
      setResources(response.data);
    } catch (error) {
      console.error('Failed to load resources', error);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await API.get('/reviews');
      setReviews(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      console.error('Failed to load reviews', error);
    }
  };

  const handleOpenEditResourceModal = (resource) => {
    setEditingResourceData({ ...resource });
    setResourceEditModalOpen(true);
  };

  const handleSaveResourceEdit = async (e) => {
    e.preventDefault();
    try {
      await API.put(`/resources/${editingResourceData.id}`, editingResourceData);
      showToast('Resource capacity and details updated successfully!', 'success');
      setResourceEditModalOpen(false);
      fetchActiveResources();
    } catch (error) {
      showToast('Failed to update resource capacity', 'error');
    }
  };

  useEffect(() => {
    fetchBookings();
    fetchActiveResources();
    fetchReviews();
  }, [filterType]);

  // Handle preselection logic from Dashboard cards or Resources "Book Now" button
  useEffect(() => {
    if (location.state?.statusFilter) {
      setStatusFilter(location.state.statusFilter);
    }
    if (location.state?.filterType) {
      setFilterType(location.state.filterType);
    }
    if (location.state?.preselectedResourceId) {
      const { preselectedResourceId } = location.state;
      setFormData({
        resource: preselectedResourceId,
        booking_date: getLocalDateString(), // default to today
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
    if (resources.length === 0) {
      fetchActiveResources();
    }
    setEditingBooking(null);
    setFormData({
      resource: resources[0]?.id || '',
      booking_date: getLocalDateString(),
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
        showToast('⚠️ You cannot book for past days! Please select today or an upcoming date within 30 days.', 'error');
      }
    }

    // Real-time double booking / slot conflict check
    if (formData.resource && formData.booking_date && formData.time_slot) {
      const conflictBooking = bookings.find(b => 
        String(getResourceId(b.resource) || b.resource) === String(formData.resource) &&
        b.booking_date === formData.booking_date &&
        b.time_slot === formData.time_slot &&
        (b.status === 'Approved' || b.status === 'Pending') &&
        b.id !== editingBooking?.id
      );

      if (conflictBooking) {
        errors.time_slot = `Slot Conflict: This resource is already reserved for ${formData.booking_date} at ${formData.time_slot}.`;
        showToast(`⚠️ Slot Conflict! This facility is already reserved for ${formData.booking_date} at ${formData.time_slot}. Please select an available time slot.`, 'error');
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
        amount_paid: 0,
        payment_status: 'FREE',
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
      setAlternativeSlots([]);
      setHasPaid(false);
      fetchBookings();
    } catch (error) {
      const alts = error.response?.data?.alternative_slots || [];
      if (alts.length > 0) {
        setAlternativeSlots(alts);
      }
      const message = error.response?.data?.resource ||
                      error.response?.data?.error ||
                      error.response?.data?.non_field_errors?.[0] || 
                      error.response?.data?.time_slot?.[0] || 
                      error.response?.data?.booking_date?.[0] ||
                      'Booking validation failed.';
      showToast(Array.isArray(message) ? message[0] : message, 'error');
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
    // Single click instant optimistic UI update
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'Approved' } : b));
    try {
      const response = await API.post(`/bookings/${id}/approve`);
      showToast('Booking approved successfully!', 'success');
      if (response?.data) {
        setBookings(prev => prev.map(b => b.id === id ? response.data : b));
      }
    } catch (error) {
      fetchBookings();
      const message = error.response?.data?.error || 'Failed to approve booking';
      showToast(message, 'error');
    }
  };

  const handleReject = async (id) => {
    // Single click instant optimistic UI update
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status: 'Rejected' } : b));
    try {
      const response = await API.post(`/bookings/${id}/reject`);
      showToast('Booking rejected.', 'info');
      if (response?.data) {
        setBookings(prev => prev.map(b => b.id === id ? response.data : b));
      }
    } catch (error) {
      fetchBookings();
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

  const getThirtyDayGrid = () => {
    const dates = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = getLocalDateString(today);
    
    // Include 2 past days for visual context + 30 upcoming days
    for (let i = -2; i <= 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      const dateStr = getLocalDateString(d);
      const isPast = dateStr < todayStr;
      const isToday = dateStr === todayStr;
      dates.push({
        dateObj: d,
        dateStr,
        dayNum: d.getDate(),
        dayName: d.toLocaleDateString('en-US', { weekday: 'short' }),
        monthName: d.toLocaleDateString('en-US', { month: 'short' }),
        isPast,
        isToday,
        isUpcoming: i > 0 && i <= 30
      });
    }
    return dates;
  };

  const getModalMonthGrid = (year, month) => {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayStr = getLocalDateString(today);
    
    const days = [];
    // Previous month padding days
    const startOffset = firstDay.getDay();
    for (let i = startOffset - 1; i >= 0; i--) {
      const d = new Date(year, month, -i);
      const dateStr = getLocalDateString(d);
      days.push({
        dateObj: d,
        dateStr,
        dayNum: d.getDate(),
        isCurrentMonth: false,
        isPast: dateStr < todayStr,
        isToday: dateStr === todayStr
      });
    }

    // Current month days
    const totalDays = lastDay.getDate();
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      const dateStr = getLocalDateString(d);
      days.push({
        dateObj: d,
        dateStr,
        dayNum: i,
        isCurrentMonth: true,
        isPast: dateStr < todayStr,
        isToday: dateStr === todayStr
      });
    }

    return days;
  };

  const handleBookingDateChange = (newDateStr) => {
    const todayStr = getLocalDateString();
    if (newDateStr < todayStr) {
      showToast('⚠️ You cannot book for past days! Please select today or a future date.', 'error');
      setFormData(prev => ({ ...prev, booking_date: todayStr }));
      setFormErrors(prev => ({ ...prev, booking_date: 'Cannot book a date in the past' }));
    } else {
      setFormData(prev => ({ ...prev, booking_date: newDateStr }));
      setFormErrors(prev => ({ ...prev, booking_date: null }));
    }
  };

  const getRecurringDatesPreview = () => {
    if (!formData.booking_date) return [];
    try {
      const parts = formData.booking_date.split('-');
      const start = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
      const list = [];
      for (let i = 0; i < 3; i++) {
        const d = new Date(start);
        if (recurringType === 'daily') {
          d.setDate(d.getDate() + i);
        } else if (recurringType === 'weekly') {
          d.setDate(d.getDate() + (i * 7));
        }
        list.push(getLocalDateString(d));
      }
      return list;
    } catch {
      return [];
    }
  };

  const displayedBookings = bookings.filter((b) => {
    if (statusFilter !== 'all' && b.status !== statusFilter) {
      return false;
    }
    return true;
  });

  const getBookingsForDate = (date) => {
    const dateString = getLocalDateString(date);
    return displayedBookings.filter(b => b.booking_date === dateString);
  };

  const selectedDateBookings = displayedBookings.filter(b => b.booking_date === selectedDateStr);

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

          <button
            onClick={async () => {
              try {
                const response = await API.get('/bookings/export_csv', { responseType: 'blob' });
                const url = window.URL.createObjectURL(new Blob([response.data]));
                const link = document.createElement('a');
                link.href = url;
                link.setAttribute('download', 'campus_bookings.csv');
                document.body.appendChild(link);
                link.click();
                link.remove();
                showToast('Exported bookings list CSV', 'success');
              } catch (error) {
                showToast('Failed to export CSV', 'error');
              }
            }}
            className="btn-secondary px-3.5 py-2.5 rounded-lg flex items-center gap-2 text-xs font-semibold"
          >
            <Download className="w-4 h-4 text-primary-400" />
            Export CSV
          </button>

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
          <div className="glass-panel rounded-xl p-4 border border-slate-800/60 flex flex-col md:flex-row md:items-center justify-between gap-4 overflow-x-auto">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
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
                  {type}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider mr-1">
                Status:
              </span>
              {['all', 'Approved', 'Pending', 'Rejected'].map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold border transition-all duration-200 ${
                    statusFilter === status
                      ? 'bg-primary-500/15 border-primary-500 text-primary-400'
                      : 'bg-slate-900/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>

          {/* Bookings List */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-10 h-10 rounded-full border-2 border-t-primary-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
            </div>
          ) : displayedBookings.length === 0 ? (
            <div className="glass-panel rounded-xl border border-slate-800/50 p-12 text-center max-w-md mx-auto">
              <Info className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <h3 className="text-lg font-bold text-slate-300">No bookings found</h3>
              <p className="text-slate-500 text-sm mt-1">There are no reservation entries in this category.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedBookings.map((booking) => (
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
                      
                      <button
                        onClick={() => openReviewModal(booking)}
                        className="inline-flex items-center gap-1 text-[10px] font-extrabold text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 px-2 py-0.5 rounded-full transition-all cursor-pointer mt-1"
                        title="View or submit feedback review for this facility"
                      >
                        <Star className="w-3 h-3 fill-amber-400" />
                        Rate & Reviews
                      </button>
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
                        <>
                          <button
                            onClick={() => setActivePass(booking)}
                            className="p-1.5 rounded-lg bg-primary-500/10 border border-primary-500/20 text-primary-400 hover:bg-primary-500 hover:text-white transition-all duration-200"
                            title="View Access Pass"
                          >
                            <Ticket className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => openReviewModal(booking)}
                            className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 hover:bg-amber-500 hover:text-slate-950 transition-all duration-200"
                            title="Rate & Review Resource"
                          >
                            <Star className="w-3.5 h-3.5 fill-amber-400" />
                          </button>
                        </>
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

                      {(user?.role === 'Admin' || user?.role === 'Staff' || booking.user_email === user?.email || user?.role === 'Student') && booking.status !== 'Cancelled' && (
                        <div className="flex items-center gap-1.5">
                          {(user?.role === 'Student' || user?.role === 'Admin') && (
                            <button
                              onClick={() => handleOpenEditModal(booking)}
                              className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700 transition-all flex items-center gap-1 text-xs"
                              title="Edit Booking"
                            >
                              <Edit2 className="w-3.5 h-3.5" /> Edit
                            </button>
                          )}
                          <button
                            onClick={() => handleCancelBooking(booking.id)}
                            className="px-2.5 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white transition-all text-xs font-semibold flex items-center gap-1"
                            title="Cancel Booking & Release Slot"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Cancel Class
                          </button>
                        </div>
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
              <div className="flex items-center gap-3">
                <h2 className="text-base font-extrabold text-slate-200">
                  {currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
                </h2>
                <select
                  value={currentDate.getFullYear()}
                  onChange={(e) => setCurrentDate(new Date(Number(e.target.value), currentDate.getMonth(), 1))}
                  className="bg-slate-900 border border-slate-800 text-slate-100 text-xs font-extrabold px-2 py-1 rounded-lg focus:outline-none focus:border-primary-500 cursor-pointer"
                  title="Select Year"
                >
                  {[2026, 2027, 2028, 2029, 2030].map(yr => (
                    <option key={yr} value={yr} className="bg-slate-900 text-white">{yr}</option>
                  ))}
                </select>
              </div>
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
                const cellDateStr = getLocalDateString(cell.date);
                const isSelected = cellDateStr === selectedDateStr;
                
                // Color indications
                const hasPending = dayBookings.some(b => b.status === 'Pending');
                const hasApproved = dayBookings.some(b => b.status === 'Approved');

                return (
                  <button
                    key={index}
                    onClick={() => {
                      setSelectedDateStr(cellDateStr);
                      if (isSelected && user?.role === 'Student') {
                        setFormData(prev => ({ ...prev, booking_date: cellDateStr }));
                        handleOpenAddModal();
                      }
                    }}
                    title={user?.role === 'Student' ? `Click to select date, click again to book ${cellDateStr}` : `Select ${cellDateStr}`}
                    className={`h-16 rounded-lg border p-1 flex flex-col justify-between items-start transition-all relative cursor-pointer ${
                      !cell.isCurrentMonth 
                        ? 'bg-slate-950/20 border-transparent text-slate-600' 
                        : isSelected
                        ? 'bg-primary-500/10 border-primary-500 text-primary-400 shadow-md shadow-primary-500/5 ring-1 ring-primary-500/40'
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
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <h2 className="text-base font-extrabold text-slate-200">
                Bookings on <span className="text-primary-400">{selectedDateStr}</span>
              </h2>

              {user?.role === 'Student' && (
                <button
                  onClick={() => {
                    setFormData(prev => ({ ...prev, booking_date: selectedDateStr }));
                    handleOpenAddModal();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-primary-500/20"
                >
                  <Plus className="w-3.5 h-3.5" /> Book {selectedDateStr}
                </button>
              )}
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 max-h-[350px]">
              {selectedDateBookings.length === 0 ? (
                <div className="text-center py-12 flex flex-col items-center justify-center">
                  <CalendarIcon className="w-8 h-8 text-slate-600 mb-2" />
                  <p className="text-xs text-slate-500 mb-3">No reservations scheduled for this date</p>
                  {user?.role === 'Student' && (
                    <button
                      onClick={() => {
                        setFormData(prev => ({ ...prev, booking_date: selectedDateStr }));
                        handleOpenAddModal();
                      }}
                      className="px-3.5 py-1.5 rounded-lg bg-primary-500 hover:bg-primary-600 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-primary-500/20"
                    >
                      <Plus className="w-3.5 h-3.5" /> Reserve This Date
                    </button>
                  )}
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

                      {(user?.role === 'Student' || user?.role === 'Admin' || booking.user_email === user?.email) && booking.status !== 'Cancelled' && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleOpenEditModal(booking)}
                            className="p-1 rounded bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-200"
                            title="Edit Booking"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleCancelBooking(booking.id)}
                            className="p-1 rounded bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500 hover:text-white transition-all"
                            title="Cancel Class & Release Slot"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Student Ratings & Review Feedback Section */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800/60 shadow-lg space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-extrabold text-slate-100">Student Reviews & Feedback Ratings</h3>
          </div>
          <span className="text-xs text-slate-400 font-semibold">
            {reviews.length} Feedback Entry{reviews.length === 1 ? '' : 's'}
          </span>
        </div>

        {reviews.length === 0 ? (
          <div className="text-center py-8 text-slate-500 text-xs">
            No feedback reviews submitted yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {reviews.slice(0, 6).map((rev) => (
              <div key={rev.id} className="p-4 rounded-xl glass-card border border-slate-800/60 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-200 truncate max-w-[150px]">{rev.user_name}</span>
                  <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                    <Star className="w-3 h-3 fill-amber-400" /> {rev.rating}/5
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 italic line-clamp-2">"{rev.comment || 'No comment provided.'}"</p>
                <div className="flex items-center justify-between text-[10px] text-slate-500 border-t border-slate-800/40 pt-2">
                  <span>Resource #{rev.resource}</span>
                  <span>{new Date(rev.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Campus Facilities & Capacity Directory Grid */}
      <div className="glass-panel p-6 rounded-xl border border-slate-800/60 shadow-lg space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 gap-2">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary-400" />
            <h3 className="text-base font-extrabold text-slate-100">Available Campus Facilities & Capacity Directory</h3>
          </div>
          <span className="text-xs text-slate-400 font-semibold">
            {resources.length} Campus Resource{resources.length === 1 ? '' : 's'}
          </span>
        </div>

        {resources.length === 0 ? (
          <div className="text-center py-10 text-slate-500 text-xs">
            No campus resources available right now.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {resources.map((resource) => (
              <div 
                key={resource.id} 
                className="glass-card rounded-xl border p-5 flex flex-col justify-between hover:scale-[1.01] transition-all shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-slate-800 text-slate-300 border border-slate-700">
                        {resource.resource_type}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
                        {parseFloat(resource.hourly_rate) > 0 ? `$${parseFloat(resource.hourly_rate).toFixed(2)}/hr` : 'Free'}
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setReviewResource(resource);
                        setReviewRating(5);
                        setReviewComment('');
                        setReviewModalOpen(true);
                      }}
                      className="flex items-center gap-1 text-[11px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 hover:bg-amber-500/20 px-2 py-0.5 rounded-full transition-all cursor-pointer"
                      title="Inspect Ratings & Reviews"
                    >
                      <Star className="w-3 h-3 fill-amber-400" />
                      {resource.avg_rating > 0 ? resource.avg_rating : '5.0'} ({resource.review_count})
                    </button>
                  </div>

                  <h4 className="text-base font-extrabold text-slate-100 mb-1">{resource.resource_name}</h4>
                  
                  {resource.location && (
                    <div className="flex items-center gap-1 text-[11px] text-slate-400 mb-2">
                      <MapPin className="w-3 h-3 text-primary-400" />
                      <span>{resource.location}</span>
                    </div>
                  )}

                  <p className="text-slate-400 text-xs line-clamp-2 leading-relaxed mb-3">
                    {resource.description || 'No description provided.'}
                  </p>

                  {/* Capacity Highlight Box */}
                  <div className="p-2.5 rounded-lg bg-primary-500/10 border border-primary-500/20 flex items-center justify-between text-xs mb-3">
                    <span className="text-slate-300 font-medium flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-primary-400" /> Maximum Capacity:
                    </span>
                    <strong className="text-primary-300 font-extrabold text-sm">{resource.capacity} people</strong>
                  </div>

                  {/* Amenities Tags */}
                  {resource.amenities && (
                    <div className="flex flex-wrap gap-1 mb-4">
                      {resource.amenities.split(',').map((tag, idx) => (
                        tag.trim() && (
                          <span 
                            key={idx} 
                            className="inline-flex items-center gap-0.5 px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-400 text-[9px] font-bold uppercase"
                          >
                            <Tag className="w-2 h-2" />
                            {tag.trim()}
                          </span>
                        )
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 border-t border-slate-800/40 pt-3">
                  <button
                    onClick={() => {
                      setFormData({
                        resource: resource.id,
                        booking_date: getLocalDateString(),
                        time_slot: '09:00 AM - 11:00 AM',
                        purpose: ''
                      });
                      setIsModalOpen(true);
                    }}
                    className="flex-1 btn-primary py-2 px-3 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5"
                  >
                    <BookMarked className="w-3.5 h-3.5" /> Book Facility
                  </button>

                  {(user?.role === 'Staff' || user?.role === 'Admin') && (
                    <button
                      onClick={() => handleOpenEditResourceModal(resource)}
                      className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all text-xs font-bold flex items-center gap-1"
                      title="Edit Resource Capacity"
                    >
                      <Edit2 className="w-3.5 h-3.5" /> Edit Capacity
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-lg glass-panel border-slate-800 rounded-2xl shadow-2xl relative my-auto max-h-[90vh] flex flex-col overflow-hidden">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 z-10 p-1 rounded-md text-slate-500 hover:text-slate-350 hover:bg-slate-850"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="px-6 py-5 border-b border-slate-800/60 shrink-0">
              <h2 className="text-lg font-bold text-slate-100">
                {editingBooking ? 'Edit Booking details' : 'Book a Facility Resource'}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Reserve spaces for group work, experiments, or lectures</p>
            </div>

            <form onSubmit={handleSaveBooking} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                  Select Resource
                </label>
                <select
                  value={formData.resource}
                  onChange={(e) => setFormData({ ...formData, resource: e.target.value })}
                  disabled={!!editingBooking}
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-primary-500 disabled:opacity-55 disabled:cursor-not-allowed"
                >
                  {editingBooking ? (
                    <option value={formData.resource} className="bg-slate-900 text-slate-100">
                      {editingBooking.resource_name}
                    </option>
                  ) : (
                    <>
                      <option value="" disabled className="bg-slate-900 text-slate-400">
                        -- Select a Resource --
                      </option>
                      {resources.map((r) => (
                        <option key={r.id} value={r.id} className="bg-slate-900 text-slate-100">
                          {r.resource_name} ({r.resource_type}) — Capacity: {r.capacity}
                        </option>
                      ))}
                    </>
                  )}
                </select>
                {formErrors.resource && (
                  <span className="text-xs text-rose-400 mt-1 block">{formErrors.resource}</span>
                )}
              </div>

              {/* Alternative Time Slot Suggestions Banner */}
              {alternativeSlots.length > 0 && (
                <div className="p-3.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-xs space-y-2 animate-fadeIn">
                  <span className="font-bold text-amber-400 flex items-center gap-1 text-[11px] uppercase tracking-wider">
                    ⚡ Slot Taken. Available Alternative Time Slots on {formData.booking_date}:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {alternativeSlots.map((slot) => (
                      <button
                        key={slot}
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({ ...prev, time_slot: slot }));
                          setAlternativeSlots([]);
                        }}
                        className="px-2.5 py-1 rounded bg-slate-900 border border-amber-500/40 text-amber-300 hover:bg-amber-500/20 text-[11px] font-semibold transition-all"
                      >
                        {slot}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-primary-400" /> Booking Date
                  </label>
                  <input
                    type="date"
                    value={formData.booking_date}
                    onChange={(e) => handleBookingDateChange(e.target.value)}
                    onClick={(e) => { try { e.target.showPicker(); } catch(err){} }}
                    className={`w-full px-3 py-2.5 rounded-lg glass-input text-slate-200 text-sm cursor-pointer ${
                      formErrors.booking_date ? 'border-rose-500/50' : ''
                    }`}
                    min={getLocalDateString()}
                  />
                  {formErrors.booking_date && (
                    <span className="text-xs text-rose-400 mt-1 block">{formErrors.booking_date}</span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-primary-400" /> Select Time Slot
                  </label>
                  <select
                    value={formData.time_slot}
                    onChange={(e) => setFormData({ ...formData, time_slot: e.target.value })}
                    className={`w-full px-3 py-2.5 rounded-lg bg-slate-900 border text-sm ${
                      bookings.some(b => 
                        String(getResourceId(b.resource) || b.resource) === String(formData.resource) &&
                        b.booking_date === formData.booking_date &&
                        b.time_slot === formData.time_slot &&
                        (b.status === 'Approved' || b.status === 'Pending') &&
                        b.id !== editingBooking?.id
                      ) ? 'border-rose-500 text-rose-300 font-extrabold ring-1 ring-rose-500' : 'border-slate-800 text-slate-100'
                    }`}
                  >
                    {timeSlots.map((slot) => {
                      const takenBooking = bookings.find(b => 
                        String(getResourceId(b.resource) || b.resource) === String(formData.resource) &&
                        b.booking_date === formData.booking_date &&
                        b.time_slot === slot &&
                        (b.status === 'Approved' || b.status === 'Pending') &&
                        b.id !== editingBooking?.id
                      );
                      return (
                        <option 
                          key={slot} 
                          value={slot} 
                          className={takenBooking ? "bg-slate-900 text-rose-400 font-extrabold" : "bg-slate-900 text-slate-100"}
                        >
                          {slot} {takenBooking ? ` [⚠️ RESERVED (${takenBooking.status})]` : ''}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

              {/* Real-time Slot Conflict Alert Warning Banner */}
              {(() => {
                const activeConflict = bookings.find(b => 
                  String(getResourceId(b.resource) || b.resource) === String(formData.resource) &&
                  b.booking_date === formData.booking_date &&
                  b.time_slot === formData.time_slot &&
                  (b.status === 'Approved' || b.status === 'Pending') &&
                  b.id !== editingBooking?.id
                );
                if (!activeConflict) return null;
                return (
                  <div className="p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/40 text-xs space-y-2 animate-fadeIn">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                      <span className="font-extrabold text-rose-400 uppercase tracking-wider">
                        ⚠️ Slot Conflict Alert: Facility Already Reserved!
                      </span>
                    </div>
                    <p className="text-slate-200 leading-relaxed font-bold">
                      This facility is already reserved for <strong className="text-white">{formData.booking_date}</strong> during <strong className="text-white">{formData.time_slot}</strong> (Status: <span className="text-amber-300 font-extrabold">{activeConflict.status}</span> by {activeConflict.user_name}). You cannot book this exact timing again.
                    </p>
                    <div className="pt-1 border-t border-rose-500/20 text-[11px] font-extrabold text-amber-300">
                      💡 Please select an available time slot without the [RESERVED] tag or pick a different date from the calendar below.
                    </div>
                  </div>
                );
              })()}

              {/* Interactive Month & Year Calendar Grid Picker for Modal */}
              <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                    <CalendarIcon className="w-3.5 h-3.5 text-primary-400" /> Date & Year Selector Grid
                  </span>
                  
                  {/* Month & Year Dropdown Selectors */}
                  <div className="flex items-center gap-2">
                    <select
                      value={modalMonth}
                      onChange={(e) => setModalMonth(Number(e.target.value))}
                      className="bg-slate-900 border border-slate-800 text-white text-xs font-extrabold px-2 py-1 rounded-md cursor-pointer"
                      title="Select Month"
                    >
                      {['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].map((m, idx) => (
                        <option key={idx} value={idx} className="bg-slate-900 text-white">{m}</option>
                      ))}
                    </select>

                    <select
                      value={modalYear}
                      onChange={(e) => setModalYear(Number(e.target.value))}
                      className="bg-slate-900 border border-slate-800 text-white text-xs font-extrabold px-2 py-1 rounded-md cursor-pointer"
                      title="Select Year"
                    >
                      {[2026, 2027, 2028, 2029, 2030].map(yr => (
                        <option key={yr} value={yr} className="bg-slate-900 text-white">{yr}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Weekday Header */}
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-extrabold text-slate-500">
                  <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
                </div>

                {/* Full Month Days Grid */}
                <div className="grid grid-cols-7 gap-1.5 max-h-[170px] overflow-y-auto pr-0.5">
                  {getModalMonthGrid(modalYear, modalMonth).map((cell, idx) => {
                    const isSelected = formData.booking_date === cell.dateStr;
                    return (
                      <button
                        key={idx}
                        type="button"
                        disabled={!cell.isCurrentMonth}
                        onClick={() => {
                          if (cell.isPast) {
                            showToast('⚠️ You cannot book for past days! Please select today or a future date.', 'error');
                          } else {
                            setFormData(prev => ({ ...prev, booking_date: cell.dateStr }));
                            if (formErrors.booking_date) setFormErrors(prev => ({ ...prev, booking_date: null }));
                          }
                        }}
                        className={`h-9 rounded-lg border text-xs font-bold flex items-center justify-center transition-all ${
                          !cell.isCurrentMonth
                            ? 'opacity-20 border-transparent text-slate-700 cursor-not-allowed'
                            : cell.isPast
                            ? 'bg-slate-950/40 border-slate-900 text-slate-600 opacity-50 cursor-not-allowed hover:bg-rose-500/10 hover:border-rose-500/30'
                            : isSelected
                            ? 'bg-gradient-to-b from-primary-600 to-indigo-600 border-primary-400 text-white font-extrabold shadow-md shadow-primary-500/20 ring-1 ring-primary-400'
                            : cell.isToday
                            ? 'bg-primary-500/10 border-primary-500/40 text-primary-300 font-extrabold'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-800 hover:border-slate-700 cursor-pointer'
                        }`}
                        title={cell.isPast ? "Past Date (Blocked)" : `Select ${cell.dateStr}`}
                      >
                        {cell.dayNum}
                      </button>
                    );
                  })}
                </div>

                {formData.booking_date && (
                  <div className="flex items-center justify-between text-[10px] font-extrabold text-slate-300 border-t border-slate-800/60 pt-2">
                    <span>Selected Date: <strong className="text-white">{formData.booking_date}</strong></span>
                    {formData.booking_date < getLocalDateString() ? (
                      <span className="text-rose-400 font-extrabold">⚠️ Past Date (Blocked)</span>
                    ) : (
                      <span className="text-emerald-400 font-extrabold">✓ Valid Booking Date</span>
                    )}
                  </div>
                )}
              </div>

              {/* Recurring schedules form option */}
              {!editingBooking && (
                <div className="p-3.5 rounded-lg bg-slate-950/60 border border-slate-800/80 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_recurring"
                      checked={isRecurring}
                      onChange={(e) => setIsRecurring(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-800 bg-slate-900 text-primary-500 focus:ring-primary-500 focus:ring-offset-slate-950 cursor-pointer"
                    />
                    <label htmlFor="is_recurring" className="text-xs font-bold text-slate-300 uppercase tracking-wide cursor-pointer">
                      Make this a Recurring Booking
                    </label>
                  </div>
                  
                  {isRecurring && (
                    <div className="flex flex-col gap-2.5 animate-fadeIn pt-1 border-t border-slate-800/60">
                      <div className="flex items-center justify-between gap-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3 text-indigo-400" /> Repeat Interval
                        </label>
                        <select
                          value={recurringType}
                          onChange={(e) => setRecurringType(e.target.value)}
                          className="px-2.5 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 text-xs focus:outline-none"
                        >
                          <option value="daily">Daily (Next 3 Consecutive Days)</option>
                          <option value="weekly">Weekly (Next 3 Consecutive Weeks)</option>
                        </select>
                      </div>

                      <div className="p-2.5 rounded bg-indigo-500/10 border border-indigo-500/20">
                        <span className="block text-[10px] font-bold text-indigo-300 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-indigo-400" /> Dates to be reserved ({formData.time_slot}):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {getRecurringDatesPreview().map((d, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded bg-slate-900 border border-indigo-500/30 text-indigo-200 font-mono text-[11px]">
                              📅 {d}
                            </span>
                          ))}
                        </div>
                      </div>

                      <span className="text-[10px] text-slate-400 italic">
                        * Note: This will create 3 individual reservations on the specified dates.
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
      {/* Mock Payment Gateway Modal */}
      {paymentModalOpen && pendingPaymentResource && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md glass-panel border-slate-800 rounded-2xl p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setPaymentModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="border-b border-slate-800 pb-3">
              <span className="text-[10px] font-bold text-primary-400 uppercase tracking-widest block">Payment Gateway</span>
              <h3 className="text-lg font-black text-slate-100">Checkout Reservation Fee</h3>
              <p className="text-xs text-slate-400 mt-0.5">{pendingPaymentResource.resource_name}</p>
            </div>

            <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Hourly Reservation Fee:</span>
              <span className="text-lg font-black text-indigo-300">${parseFloat(pendingPaymentResource.hourly_rate).toFixed(2)} USD</span>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setHasPaid(true);
                setPaymentModalOpen(false);
                showToast(`Payment of $${parseFloat(pendingPaymentResource.hourly_rate).toFixed(2)} confirmed! Completing booking...`, 'success');
                setTimeout(() => {
                  const submitEvent = new Event('submit', { cancelable: true, bubbles: true });
                  document.querySelector('form')?.dispatchEvent(submitEvent);
                }, 100);
              }}
              className="space-y-3 text-xs"
            >
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Cardholder Name
                </label>
                <input
                  type="text"
                  required
                  value={cardDetails.name || user?.name || ''}
                  onChange={(e) => setCardDetails({ ...cardDetails, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg glass-input text-slate-200"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Card Number
                </label>
                <input
                  type="text"
                  required
                  value={cardDetails.number}
                  onChange={(e) => setCardDetails({ ...cardDetails, number: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg glass-input text-slate-200 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Expires
                  </label>
                  <input
                    type="text"
                    required
                    value={cardDetails.expiry}
                    onChange={(e) => setCardDetails({ ...cardDetails, expiry: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg glass-input text-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    CVC / CVV
                  </label>
                  <input
                    type="text"
                    required
                    value={cardDetails.cvc}
                    onChange={(e) => setCardDetails({ ...cardDetails, cvc: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg glass-input text-slate-200 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setPaymentModalOpen(false)}
                  className="btn-secondary px-3 py-2 rounded-lg text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-4 py-2 rounded-lg text-xs font-semibold flex items-center gap-1.5"
                >
                  Pay & Confirm Reservation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Resource Details, Ratings & Feedback Modal */}
      {reviewModalOpen && reviewResource && (() => {
        const currentResId = getResourceId(reviewResource);
        const currentReviews = reviews.filter(r => getResourceId(r.resource) === currentResId);
        const currentAvgRating = currentReviews.length > 0
          ? (currentReviews.reduce((sum, r) => sum + Number(r.rating || 5), 0) / currentReviews.length).toFixed(1)
          : (reviewResource.avg_rating > 0 ? reviewResource.avg_rating : '5.0');

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
            <div className="w-full max-w-lg glass-panel border-slate-800 rounded-2xl p-6 shadow-2xl relative space-y-5 max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setReviewModalOpen(false)}
                className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Modal Header */}
              <div className="border-b border-slate-800 pb-3 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 uppercase">
                    {reviewResource.resource_type || 'Facility'}
                  </span>
                </div>
                <h3 className="text-xl font-black text-white tracking-tight">{reviewResource.resource_name}</h3>
                <p className="text-xs text-white font-extrabold">{reviewResource.location || 'Campus Main Block'}</p>
              </div>

              {/* Overall Rating Overview Box */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-amber-500/10 to-indigo-500/10 border border-amber-500/20 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-extrabold text-white uppercase tracking-widest block">Average Rating Score</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-2xl font-black text-amber-400">
                      {currentAvgRating}
                    </span>
                    <div className="flex text-amber-400">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star 
                          key={s} 
                          className={`w-4 h-4 ${s <= Math.round(Number(currentAvgRating)) ? 'fill-amber-400' : 'text-slate-700'}`} 
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-sm font-extrabold text-white block">
                    {currentReviews.length} Reviews
                  </span>
                  <span className="text-[10px] text-white font-bold">Based on student feedback</span>
                </div>
              </div>

              {/* Student Feedback & Ratings List */}
              <div className="space-y-3">
                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-amber-400" /> Student Ratings & Feedback
                </h4>

                {currentReviews.length === 0 ? (
                  <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-center text-xs text-white font-extrabold">
                    No feedback reviews submitted for this resource yet. Be the first to rate it below!
                  </div>
                ) : (
                  <div className="space-y-2.5 max-h-[220px] overflow-y-auto pr-1">
                    {currentReviews.map((rev) => (
                      <div key={rev.id} className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-extrabold text-white">{rev.user_name}</span>
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                            <Star className="w-3 h-3 fill-amber-400" /> {rev.rating}/5
                          </span>
                        </div>
                        <p className="text-[11px] text-white font-bold italic">"{rev.comment || 'No comment provided.'}"</p>
                        <span className="text-[9px] text-slate-300 font-bold block text-right">
                          {new Date(rev.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Interactive Write a Review Form */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  const targetId = getResourceId(reviewResource);
                  if (!targetId) {
                    showToast('Invalid resource selected for review.', 'error');
                    return;
                  }
                  try {
                    await API.post('/reviews', {
                      resource: Number(targetId),
                      rating: Number(reviewRating),
                      comment: reviewComment
                    });
                    showToast('Thank you for rating this resource!', 'success');
                    setReviewModalOpen(false);
                    setReviewComment('');
                    await fetchReviews();
                    if (typeof fetchActiveResources === 'function') await fetchActiveResources();
                    if (typeof fetchBookings === 'function') await fetchBookings();
                  } catch (error) {
                    const msg = error.response?.data?.comment?.[0] || 
                                error.response?.data?.resource?.[0] || 
                                error.response?.data?.detail || 
                                'Failed to submit review.';
                    showToast(msg, 'error');
                  }
                }}
                className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-3"
              >
                <h4 className="text-xs font-extrabold text-white uppercase tracking-wider">Leave Your Rating & Review</h4>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-white font-extrabold">Your Score:</span>
                  <div className="flex gap-1.5 items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setReviewRating(star);
                        }}
                        className={`p-2 rounded-xl border transition-all duration-200 cursor-pointer ${
                          reviewRating >= star
                            ? 'bg-amber-500/20 border-amber-500 text-amber-400 scale-105 shadow-md shadow-amber-500/10'
                            : 'bg-slate-900/80 border-slate-800 text-slate-600 hover:text-slate-400 hover:border-slate-700'
                        }`}
                        title={`Rate ${star} Star${star > 1 ? 's' : ''}`}
                      >
                        <Star className={`w-5 h-5 ${reviewRating >= star ? 'fill-amber-400 text-amber-400' : 'text-slate-600'}`} />
                      </button>
                    ))}
                    <span className="text-xs font-bold text-amber-400 ml-1">
                      ({reviewRating}/5 Stars)
                    </span>
                  </div>
                </div>

                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows="3"
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-700/80 text-xs text-white font-extrabold placeholder:text-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
                  placeholder="Share your experience (equipment quality, quietness, speed)..."
                />

                <div className="flex items-center justify-end gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setReviewModalOpen(false)}
                    className="btn-secondary py-2 px-3 rounded-xl text-xs font-extrabold text-white"
                  >
                    Close
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-extrabold transition-all"
                  >
                    Submit Feedback
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}
      {/* Admin Edit Resource Capacity Modal */}
      {resourceEditModalOpen && editingResourceData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
          <div className="w-full max-w-md glass-panel border-slate-800 rounded-2xl p-6 shadow-2xl relative space-y-4">
            <button
              onClick={() => setResourceEditModalOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-md text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="border-b border-slate-800 pb-3">
              <h3 className="text-lg font-black text-white">Edit Facility Capacity</h3>
              <p className="text-xs font-extrabold text-white mt-0.5">{editingResourceData.resource_name}</p>
            </div>
            <form onSubmit={handleSaveResourceEdit} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-extrabold text-white uppercase tracking-wider mb-1">
                  Resource Name
                </label>
                <input
                  type="text"
                  required
                  value={editingResourceData.resource_name}
                  onChange={(e) => setEditingResourceData({ ...editingResourceData, resource_name: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-extrabold placeholder:text-slate-400 focus:outline-none focus:border-primary-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-white uppercase tracking-wider mb-1">
                    Maximum Capacity (People)
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={editingResourceData.capacity}
                    onChange={(e) => setEditingResourceData({ ...editingResourceData, capacity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-black text-sm focus:outline-none focus:border-primary-400"
                  />
                </div>
                <div>
                  <label className="block text-xs font-extrabold text-white uppercase tracking-wider mb-1">
                    Hourly Fee ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={editingResourceData.hourly_rate}
                    onChange={(e) => setEditingResourceData({ ...editingResourceData, hourly_rate: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono font-extrabold focus:outline-none focus:border-primary-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-extrabold text-white uppercase tracking-wider mb-1">
                  Location / Building
                </label>
                <input
                  type="text"
                  value={editingResourceData.location || ''}
                  placeholder="e.g. Building D, Floor 1, Room 101"
                  onChange={(e) => setEditingResourceData({ ...editingResourceData, location: e.target.value })}
                  className="w-full px-3 py-2.5 rounded-lg bg-slate-950 border border-slate-700 text-white font-extrabold placeholder:text-slate-400 focus:outline-none focus:border-primary-400"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setResourceEditModalOpen(false)}
                  className="btn-secondary px-3.5 py-2 rounded-lg text-xs font-extrabold text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-4 py-2 rounded-lg text-xs font-black"
                >
                  Save Capacity
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
