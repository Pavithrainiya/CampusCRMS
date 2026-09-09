import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import API from '../services/api';
import { Calendar as CalendarIcon, X } from 'lucide-react';

export default function Calendar() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [events, setEvents] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [resources, setResources] = useState([]);
  const [formData, setFormData] = useState({
    resource: '',
    time_slot: '',
    purpose: ''
  });

  useEffect(() => {
    fetchBookings();
    fetchResources();
  }, []);

  const fetchBookings = async () => {
    try {
      const response = await API.get('/bookings');
      const bookingEvents = response.data.map(booking => ({
        id: booking.id,
        title: `${booking.resource_name} - ${booking.user_name}`,
        start: `${booking.booking_date}T${convertToTime(booking.time_slot.split(' - ')[0])}`,
        end: `${booking.booking_date}T${convertToTime(booking.time_slot.split(' - ')[1])}`,
        backgroundColor: booking.status === 'Approved' ? '#10b981' : booking.status === 'Pending' ? '#f59e0b' : '#ef4444',
        borderColor: booking.status === 'Approved' ? '#059669' : booking.status === 'Pending' ? '#d97706' : '#dc2626',
        extendedProps: {
          status: booking.status,
          resource: booking.resource_name,
          user: booking.user_name,
          purpose: booking.purpose
        }
      }));
      setEvents(bookingEvents);
    } catch (error) {
      console.error('Error fetching bookings:', error);
    }
  };

  const fetchResources = async () => {
    try {
      const response = await API.get('/resources');
      setResources(response.data.filter(r => r.availability_status));
    } catch (error) {
      console.error('Error fetching resources:', error);
    }
  };

  const convertToTime = (timeStr) => {
    // Convert "09:00 AM" to "09:00:00"
    const [time, period] = timeStr.trim().split(' ');
    let [hours, minutes] = time.split(':');
    hours = parseInt(hours);
    
    if (period === 'PM' && hours !== 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
    
    return `${hours.toString().padStart(2, '0')}:${minutes}:00`;
  };

  const handleDateClick = (arg) => {
    setSelectedDate(arg.dateStr);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      await API.post('/bookings', {
        resource: formData.resource,
        booking_date: selectedDate,
        time_slot: formData.time_slot,
        purpose: formData.purpose
      });
      
      showToast('Booking request submitted successfully!', 'success');
      setShowModal(false);
      setFormData({ resource: '', time_slot: '', purpose: '' });
      fetchBookings();
    } catch (error) {
      showToast(error.response?.data?.error || 'Failed to create booking', 'error');
    }
  };

  const handleEventClick = (clickInfo) => {
    const event = clickInfo.event;
    alert(`
Booking Details:
Resource: ${event.extendedProps.resource}
User: ${event.extendedProps.user}
Status: ${event.extendedProps.status}
Purpose: ${event.extendedProps.purpose}
    `);
  };

  const timeSlots = [
    '09:00 AM - 10:00 AM',
    '10:00 AM - 11:00 AM',
    '11:00 AM - 12:00 PM',
    '12:00 PM - 01:00 PM',
    '01:00 PM - 02:00 PM',
    '02:00 PM - 03:00 PM',
    '03:00 PM - 04:00 PM',
    '04:00 PM - 05:00 PM',
    '05:00 PM - 06:00 PM'
  ];

  return (
    <div className="p-6 sm:p-8">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary-500/20 rounded-lg">
          <CalendarIcon className="w-6 h-6 text-primary-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Calendar View</h1>
          <p className="text-sm text-gray-400">Visual overview of all bookings</p>
        </div>
      </div>

      <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
        <div className="mb-4 flex gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-gray-300">Approved</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-yellow-500 rounded"></div>
            <span className="text-gray-300">Pending</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-gray-300">Rejected</span>
          </div>
        </div>

        <div className="calendar-container">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: 'prev,next today',
              center: 'title',
              right: 'dayGridMonth,timeGridWeek,timeGridDay'
            }}
            events={events}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            editable={false}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={true}
            weekends={true}
            height="auto"
          />
        </div>
      </div>

      {/* Booking Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 border border-gray-700 rounded-xl p-6 w-full max-w-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-100">New Booking</h2>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Date: {selectedDate}
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Resource *
                </label>
                <select
                  value={formData.resource}
                  onChange={(e) => setFormData({ ...formData, resource: e.target.value })}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Select Resource</option>
                  {resources.map(resource => (
                    <option key={resource.id} value={resource.id}>
                      {resource.resource_name} ({resource.resource_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Time Slot *
                </label>
                <select
                  value={formData.time_slot}
                  onChange={(e) => setFormData({ ...formData, time_slot: e.target.value })}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Select Time Slot</option>
                  {timeSlots.map(slot => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  Purpose *
                </label>
                <textarea
                  value={formData.purpose}
                  onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
                  className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 text-gray-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows="3"
                  required
                />
              </div>

              <div className="flex gap-3">
                <button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-primary-500 to-accent-500 text-white font-semibold py-2 px-4 rounded-lg hover:shadow-lg transition-all"
                >
                  Submit Booking
                </button>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 bg-gray-700 text-gray-200 font-semibold py-2 px-4 rounded-lg hover:bg-gray-600 transition-all"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx>{`
        .calendar-container {
          background: rgba(31, 41, 55, 0.5);
          border-radius: 0.5rem;
          padding: 1rem;
        }
        
        :global(.fc) {
          color: #e5e7eb;
        }
        
        :global(.fc-theme-standard td),
        :global(.fc-theme-standard th) {
          border-color: #374151;
        }
        
        :global(.fc-button-primary) {
          background-color: #6366f1 !important;
          border-color: #6366f1 !important;
        }
        
        :global(.fc-button-primary:hover) {
          background-color: #4f46e5 !important;
        }
        
        :global(.fc-button-active) {
          background-color: #4f46e5 !important;
        }
        
        :global(.fc-day-today) {
          background-color: rgba(99, 102, 241, 0.1) !important;
        }
        
        :global(.fc-col-header-cell) {
          background-color: rgba(31, 41, 55, 0.8);
        }
        
        :global(.fc-daygrid-day) {
          cursor: pointer;
        }
        
        :global(.fc-daygrid-day:hover) {
          background-color: rgba(99, 102, 241, 0.05);
        }
      `}</style>
    </div>
  );
}
