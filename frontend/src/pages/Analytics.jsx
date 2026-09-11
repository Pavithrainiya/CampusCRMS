import React, { useState, useEffect } from 'react';
import { useAuth } from '../components/AuthContext';
import { useToast } from '../components/ToastContext';
import API from '../services/api';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';
import { Bar, Line, Pie } from 'react-chartjs-2';
import { 
  TrendingUp, 
  Calendar, 
  Clock, 
  PieChart, 
  BarChart3, 
  Activity, 
  Download, 
  RefreshCw, 
  FileSpreadsheet, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  Layers, 
  Award 
} from 'lucide-react';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const AnalyticsPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(null);

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const response = await API.get('/analytics/dashboard');
      setAnalytics(response.data);
    } catch (error) {
      console.error('Failed to fetch analytics', error);
      showToast('Failed to load analytics data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadReport = async (format) => {
    setDownloading(format);
    try {
      const response = await API.get(`/analytics/dashboard?format=${format}`, {
        responseType: 'blob'
      });
      const mimeType = format === 'xlsx' 
        ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
        : 'application/pdf';
      const blob = new Blob([response.data], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `campusrms-analytics-report.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast(`Exported ${format.toUpperCase()} report successfully`, 'success');
    } catch (err) {
      console.error('Download error:', err);
      showToast(`Failed to export ${format.toUpperCase()} report`, 'error');
    } finally {
      setDownloading(null);
    }
  };

  if (loading && !analytics) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-12 h-12 rounded-full border-4 border-primary-500 border-t-transparent animate-spin" />
        <p className="text-sm font-medium text-slate-400">Loading Analytics Dashboard...</p>
      </div>
    );
  }

  // Datasets & Charts setup
  const pastVsUpcomingData = {
    labels: ['Past Bookings', 'Upcoming Bookings'],
    datasets: [{
      label: 'Number of Bookings',
      data: [analytics?.past_bookings || 0, analytics?.upcoming_bookings || 0],
      backgroundColor: ['rgba(239, 68, 68, 0.7)', 'rgba(34, 197, 94, 0.7)'],
      borderColor: ['rgb(239, 68, 68)', 'rgb(34, 197, 94)'],
      borderWidth: 2,
      borderRadius: 6
    }]
  };

  const statusDistributionData = {
    labels: ['Approved', 'Pending', 'Rejected', 'Cancelled'],
    datasets: [{
      data: [
        analytics?.status_distribution?.Approved || 0,
        analytics?.status_distribution?.Pending || 0,
        analytics?.status_distribution?.Rejected || 0,
        analytics?.status_distribution?.Cancelled || 0
      ],
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)',
        'rgba(251, 191, 36, 0.8)',
        'rgba(239, 68, 68, 0.8)',
        'rgba(148, 163, 184, 0.8)'
      ],
      borderColor: [
        'rgb(34, 197, 94)',
        'rgb(251, 191, 36)',
        'rgb(239, 68, 68)',
        'rgb(148, 163, 184)'
      ],
      borderWidth: 2
    }]
  };

  const bookingsOverTimeData = {
    labels: analytics?.bookings_by_day?.map(d => d.date) || [],
    datasets: [{
      label: 'Bookings Volume',
      data: analytics?.bookings_by_day?.map(d => d.count) || [],
      fill: true,
      backgroundColor: 'rgba(99, 102, 241, 0.15)',
      borderColor: 'rgb(99, 102, 241)',
      tension: 0.4,
      pointBackgroundColor: 'rgb(99, 102, 241)',
      pointBorderColor: '#fff',
      pointBorderWidth: 2,
      pointRadius: 5
    }]
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { color: '#cbd5e1', font: { size: 12, weight: 'bold' } }
      }
    },
    scales: {
      y: { 
        ticks: { color: '#94a3b8', precision: 0 }, 
        grid: { color: 'rgba(51, 65, 85, 0.5)' } 
      },
      x: { 
        ticks: { color: '#94a3b8' }, 
        grid: { color: 'rgba(51, 65, 85, 0.3)' } 
      }
    }
  };

  return (
    <div className="space-y-8">
      {/* Top Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 glass-panel p-6 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primary-500/10 rounded-xl border border-primary-500/20 text-primary-400">
            <Activity className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">Analytics & Intelligence</h1>
            <p className="text-xs text-slate-400">Real-time resource utilization, booking trends, and system statistics</p>
          </div>
        </div>

        {/* Action Controls & Export Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={fetchAnalytics}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition"
            title="Refresh Data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={() => handleDownloadReport('xlsx')}
            disabled={downloading === 'xlsx'}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 text-xs font-bold border border-emerald-500/30 transition disabled:opacity-50"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>{downloading === 'xlsx' ? 'Exporting...' : 'Excel Report'}</span>
          </button>

          <button
            onClick={() => handleDownloadReport('pdf')}
            disabled={downloading === 'pdf'}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 text-xs font-bold border border-rose-500/30 transition disabled:opacity-50"
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{downloading === 'pdf' ? 'Exporting...' : 'PDF Report'}</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-xl border border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Bookings</span>
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
              <CalendarDays className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-slate-100 mt-2">{analytics?.total_bookings || (analytics?.past_bookings + analytics?.upcoming_bookings) || 0}</p>
          <span className="text-[11px] text-indigo-400/80 font-medium">All historical reservations</span>
        </div>

        <div className="glass-card p-5 rounded-xl border border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Upcoming Bookings</span>
            <div className="p-2 bg-emerald-500/10 rounded-lg text-emerald-400 border border-emerald-500/20">
              <Calendar className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-emerald-400 mt-2">{analytics?.upcoming_bookings || 0}</p>
          <span className="text-[11px] text-emerald-400/80 font-medium">Active & future schedules</span>
        </div>

        <div className="glass-card p-5 rounded-xl border border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Past Bookings</span>
            <div className="p-2 bg-sky-500/10 rounded-lg text-sky-400 border border-sky-500/20">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-sky-400 mt-2">{analytics?.past_bookings || 0}</p>
          <span className="text-[11px] text-sky-400/80 font-medium">Completed lab & room slots</span>
        </div>

        <div className="glass-card p-5 rounded-xl border border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">No-Show Rate</span>
            <div className="p-2 bg-rose-500/10 rounded-lg text-rose-400 border border-rose-500/20">
              <AlertCircle className="w-5 h-5" />
            </div>
          </div>
          <p className="text-2xl font-black text-rose-400 mt-2">{analytics?.no_show_rate ? `${analytics.no_show_rate}%` : '0%'}</p>
          <span className="text-[11px] text-rose-400/80 font-medium">Unclaimed approved bookings</span>
        </div>
      </div>

      {/* Primary Analytics Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Past vs Upcoming Bar Chart */}
        <div className="glass-card p-6 rounded-xl border border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-slate-100">Past vs Upcoming Bookings</h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">Volume Breakdown</span>
          </div>
          <div className="h-64">
            <Bar data={pastVsUpcomingData} options={chartOptions} />
          </div>
        </div>

        {/* Status Distribution Doughnut Chart */}
        <div className="glass-card p-6 rounded-xl border border-slate-800/80 bg-slate-900/40">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <PieChart className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-slate-100">Booking Status Distribution</h3>
            </div>
            <span className="text-xs text-slate-500 font-medium">Approval ratio</span>
          </div>
          <div className="h-64 flex items-center justify-center">
            <Pie data={statusDistributionData} options={{ ...chartOptions, scales: undefined }} />
          </div>
        </div>

        {/* Bookings Trend Area/Line Chart */}
        <div className="glass-card p-6 rounded-xl border border-slate-800/80 bg-slate-900/40 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-primary-400" />
              <h3 className="text-base font-bold text-slate-100">Bookings Trend (Last 7 Days)</h3>
            </div>
            <span className="text-xs text-slate-400 bg-slate-800 px-2.5 py-1 rounded-full border border-slate-700">7-Day Trajectory</span>
          </div>
          <div className="h-80">
            <Line data={bookingsOverTimeData} options={chartOptions} />
          </div>
        </div>
      </div>

      {/* Deep-Dive Tables: Popular Resources & Peak Hours */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Most Popular Resources */}
        <div className="glass-card p-6 rounded-xl border border-slate-800/80 bg-slate-900/40 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800/60 pb-3">
            <Award className="w-5 h-5 text-amber-400" />
            <h3 className="text-base font-bold text-slate-100">Most Popular Facilities</h3>
          </div>
          
          <div className="space-y-3">
            {analytics?.popular_resources && analytics.popular_resources.length > 0 ? (
              analytics.popular_resources.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-lg bg-slate-950/40 border border-slate-800/50">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-primary-500/20 text-primary-400 text-xs font-black flex items-center justify-center border border-primary-500/30">
                      #{idx + 1}
                    </span>
                    <span className="text-sm font-semibold text-slate-200">{item.resource__resource_name}</span>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                    {item.count} Bookings
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">No popular facility data yet</p>
            )}
          </div>
        </div>

        {/* Resource Utilization Rates */}
        <div className="glass-card p-6 rounded-xl border border-slate-800/80 bg-slate-900/40 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800/60 pb-3">
            <Layers className="w-5 h-5 text-sky-400" />
            <h3 className="text-base font-bold text-slate-100">Resource Utilization Density</h3>
          </div>

          <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
            {analytics?.resource_utilization && analytics.resource_utilization.length > 0 ? (
              analytics.resource_utilization.slice(0, 6).map((item, idx) => (
                <div key={idx} className="space-y-1.5 p-2.5 rounded-lg bg-slate-950/30 border border-slate-800/40">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-slate-300 truncate max-w-[200px]">{item.resource_name}</span>
                    <span className="text-primary-400 font-bold">{item.utilization_rate}% ({item.bookings} bookings)</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-primary-500 to-indigo-400 rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(item.utilization_rate * 3 + 5, 100)}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-slate-500 py-4 text-center">No utilization data calculated yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
