import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import API from '../services/api';
import { 
  Users, 
  Layers, 
  CalendarDays, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Calendar, 
  BookMarked,
  Activity,
  ArrowRight,
  Download
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  
  const [stats, setStats] = useState(null);
  const [liveOccupancy, setLiveOccupancy] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const response = await API.get('/admin/stats');
        setStats(response.data.stats);
        setLiveOccupancy(response.data.live_occupancy || []);
        setChartData(response.data.chart_data || []);
      } catch (error) {
        showToast('Failed to load dashboard statistics', 'error');
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [showToast]);

  const handleExportCSV = () => {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    // Section 1: Stats
    csvContent += "SYSTEM SUMMARY REPORT\n";
    csvContent += "Metric,Value\n";
    if (stats) {
      Object.keys(stats).forEach(key => {
        csvContent += `${key.replace('_', ' ').toUpperCase()},${stats[key]}\n`;
      });
    }
    csvContent += "\n";

    // Section 2: Resource Utilization Density
    csvContent += "RESOURCE UTILIZATION DENSITY\n";
    csvContent += "Resource Name,Total Bookings\n";
    chartData.forEach(item => {
      csvContent += `"${item.resource_name.replace(/"/g, '""')}",${item.count}\n`;
    });
    csvContent += "\n";

    // Section 3: Live Facility Status
    csvContent += "LIVE FACILITY STATUS\n";
    csvContent += "Resource Name,Resource Type,Status,Current User\n";
    liveOccupancy.forEach(room => {
      csvContent += `"${room.resource_name.replace(/"/g, '""')}","${room.resource_type}","${room.status}","${room.user || 'None'}"\n`;
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `CampusRMS_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link); // Required for FF
    link.click();
    document.body.removeChild(link);
    showToast('Utilization reports exported successfully!', 'success');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 rounded-full border-2 border-t-primary-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
      </div>
    );
  }

  // Define details for different statistic cards
  const cardData = {
    // Admin Cards
    total_users: {
      label: 'Total Users',
      icon: <Users className="w-6 h-6 text-sky-400" />,
      bg: 'from-sky-500/10 to-sky-600/5 border-sky-500/20'
    },
    total_resources: {
      label: 'Total Resources',
      icon: <Layers className="w-6 h-6 text-indigo-400" />,
      bg: 'from-indigo-500/10 to-indigo-600/5 border-indigo-500/20'
    },
    total_bookings: {
      label: 'Total Bookings',
      icon: <CalendarDays className="w-6 h-6 text-violet-400" />,
      bg: 'from-violet-500/10 to-violet-600/5 border-violet-500/20'
    },
    pending_bookings: {
      label: 'Pending Bookings',
      icon: <Clock className="w-6 h-6 text-amber-400" />,
      bg: 'from-amber-500/10 to-amber-600/5 border-amber-500/20'
    },
    approved_bookings: {
      label: 'Approved Bookings',
      icon: <CheckCircle2 className="w-6 h-6 text-emerald-400" />,
      bg: 'from-emerald-500/10 to-emerald-600/5 border-emerald-500/20'
    },
    rejected_bookings: {
      label: 'Rejected Bookings',
      icon: <XCircle className="w-6 h-6 text-rose-400" />,
      bg: 'from-rose-500/10 to-rose-600/5 border-rose-500/20'
    },
    // Student Cards
    my_bookings: {
      label: 'My Bookings',
      icon: <BookMarked className="w-6 h-6 text-primary-400" />,
      bg: 'from-primary-500/10 to-primary-600/5 border-primary-500/20'
    },
    upcoming_bookings: {
      label: 'Upcoming Bookings',
      icon: <Calendar className="w-6 h-6 text-sky-400" />,
      bg: 'from-sky-500/10 to-sky-600/5 border-sky-500/20'
    }
  };

  const maxChartCount = chartData.length > 0 ? Math.max(...chartData.map(c => c.count)) : 1;

  return (
    <div className="space-y-8">
      {/* Welcome Hero Banner */}
      <div className="relative glass-panel rounded-2xl p-6 md:p-8 overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-secondary-500/10 rounded-full blur-3xl -ml-20 -mb-20 pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="space-y-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-primary-500/10 text-primary-400 border border-primary-500/25">
              <Activity className="w-3.5 h-3.5 animate-pulse" />
              Online Control Center Active
            </span>
            <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">
              Welcome to the Control Center, <span className="text-gradient">{user?.name}</span>
            </h1>
            <p className="text-slate-400 max-w-xl text-sm leading-relaxed">
              Manage facilities, inspect schedules, and book university resources seamlessly. You are logged in with <strong className="text-slate-200">{user?.role}</strong> credentials.
            </p>
          </div>
          
          <div className="flex gap-3">
            {user?.role === 'Admin' && (
              <button
                onClick={handleExportCSV}
                className="btn-secondary px-5 py-3 rounded-xl flex items-center gap-2 text-sm font-semibold shrink-0"
              >
                <Download className="w-4 h-4" />
                Export Reports
              </button>
            )}
            <Link 
              to="/resources" 
              className="btn-primary px-5 py-3 rounded-xl flex items-center gap-2 text-sm font-semibold transition-all duration-200 shrink-0"
            >
              Browse Resources
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>

      {/* Grid of Statistics */}
      <div>
        <h2 className="text-lg font-bold text-slate-300 mb-5">System Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {stats && Object.keys(stats).map((key) => {
            const card = cardData[key] || {
              label: key.replace('_', ' '),
              icon: <CalendarDays className="w-6 h-6 text-slate-400" />,
              bg: 'from-slate-500/10 to-slate-600/5 border-slate-500/20'
            };
            return (
              <div 
                key={key} 
                className={`glass-card p-6 rounded-xl border bg-gradient-to-br ${card.bg} flex items-center justify-between shadow-lg`}
              >
                <div className="space-y-1">
                  <span className="text-sm font-medium text-slate-400 block">{card.label}</span>
                  <span className="text-3xl font-black text-slate-100 tracking-tight">{stats[key]}</span>
                </div>
                <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/40 shadow-inner">
                  {card.icon}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Charts & Live Status Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking density visual chart */}
        <div className="glass-panel p-6 rounded-xl border border-slate-800/60 shadow-lg">
          <h3 className="text-base font-bold text-slate-200 mb-6">Booking Density (Resource Usage)</h3>
          {chartData.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <CalendarDays className="w-10 h-10 text-slate-600 mb-2" />
              <p className="text-xs">No usage data compiled yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {chartData.map((item, idx) => {
                const percentage = (item.count / maxChartCount) * 100;
                return (
                  <div key={idx} className="space-y-1">
                    <div className="flex justify-between text-xs font-semibold text-slate-400">
                      <span className="truncate max-w-[200px]">{item.resource_name}</span>
                      <span className="text-primary-400">{item.count} bookings</span>
                    </div>
                    <div className="h-3 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                      <div 
                        className="h-full bg-gradient-to-r from-primary-500 to-indigo-500 rounded-full transition-all duration-1000"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Live Room Occupancy Board */}
        <div className="glass-panel p-6 rounded-xl border border-slate-800/60 shadow-lg">
          <h3 className="text-base font-bold text-slate-200 mb-6">Live Facility Status</h3>
          <div className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
            {liveOccupancy.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-xs">
                No active resources available
              </div>
            ) : (
              liveOccupancy.map((room) => (
                <div key={room.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-800/40 bg-slate-900/30">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-200">{room.resource_name}</h4>
                    <span className="text-[10px] text-slate-500">{room.resource_type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {room.status === 'Busy' ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 border border-rose-500/20 text-rose-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
                        In Use ({room.user || 'Reserved'})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        Available
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Role-Specific Actions Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
        {/* Quick Help Card */}
        <div className="glass-panel rounded-xl p-6 border border-slate-800/60 flex flex-col justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-200 mb-2">Need a Resource?</h3>
            <p className="text-slate-400 text-sm leading-relaxed mb-4">
              Book computer stations, classrooms, laboratories, and event spaces for academic or event activities. Bookings are reviewed by university administrators.
            </p>
          </div>
          <Link 
            to="/bookings" 
            className="btn-secondary py-2.5 px-4 rounded-lg flex items-center justify-center gap-2 text-sm text-center font-semibold"
          >
            Go to Bookings
          </Link>
        </div>

        {/* System Rules Card */}
        <div className="glass-panel rounded-xl p-6 border border-slate-800/60">
          <h3 className="text-base font-bold text-slate-200 mb-3">Booking Rules</h3>
          <ul className="space-y-2 text-xs text-slate-400">
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 shrink-0" />
              <span>Bookings must be created for current or future dates only.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 shrink-0" />
              <span>You cannot book the same resource if there is already an Approved booking in the selected slot.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-primary-500 mt-1.5 shrink-0" />
              <span>Students cannot double book themselves in multiple rooms for the same time slot.</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
