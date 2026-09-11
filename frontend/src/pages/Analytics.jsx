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
import { Bar, Line, Pie, Doughnut } from 'react-chartjs-2';
import { TrendingUp, Calendar, Clock, PieChart, BarChart3, Activity } from 'lucide-react';

// Register Chart.js components
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

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const fetchAnalytics = async () => {
    try {
      const response = await API.get('/analytics/dashboard');
      setAnalytics(response.data);
    } catch (error) {
      showToast('Failed to load analytics', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="w-10 h-10 rounded-full border-2 border-t-primary-500 animate-spin" />
      </div>
    );
  }

  // Chart configurations
  const pastVsUpcomingData = {
    labels: ['Past Bookings', 'Upcoming Bookings'],
    datasets: [{
      label: 'Number of Bookings',
      data: [analytics?.past_bookings || 0, analytics?.upcoming_bookings || 0],
      backgroundColor: ['rgba(239, 68, 68, 0.6)', 'rgba(34, 197, 94, 0.6)'],
      borderColor: ['rgb(239, 68, 68)', 'rgb(34, 197, 94)'],
      borderWidth: 2
    }]
  };

  const statusDistributionData = {
    labels: ['Approved', 'Pending', 'Rejected'],
    datasets: [{
      data: [
        analytics?.status_distribution?.Approved || 0,
        analytics?.status_distribution?.Pending || 0,
        analytics?.status_distribution?.Rejected || 0
      ],
      backgroundColor: [
        'rgba(34, 197, 94, 0.8)',
        'rgba(251, 191, 36, 0.8)',
        'rgba(239, 68, 68, 0.8)'
      ],
      borderColor: [
        'rgb(34, 197, 94)',
        'rgb(251, 191, 36)',
        'rgb(239, 68, 68)'
      ],
      borderWidth: 2
    }]
  };

  const bookingsOverTimeData = {
    labels: analytics?.bookings_by_day?.map(d => d.date) || [],
    datasets: [{
      label: 'Bookings',
      data: analytics?.bookings_by_day?.map(d => d.count) || [],
      fill: true,
      backgroundColor: 'rgba(99, 102, 241, 0.2)',
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
        labels: { color: '#e5e7eb', font: { size: 12 } }
      }
    },
    scales: {
      y: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } },
      x: { ticks: { color: '#9ca3af' }, grid: { color: '#374151' } }
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-2 bg-primary-500/20 rounded-lg">
          <Activity className="w-6 h-6 text-primary-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-100">Analytics Dashboard</h1>
          <p className="text-sm text-gray-400">Comprehensive booking insights and trends</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Past vs Upcoming Bar Chart */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <h3 className="text-lg font-bold text-gray-100">Past vs Upcoming Bookings</h3>
          </div>
          <div className="h-64">
            <Bar data={pastVsUpcomingData} options={chartOptions} />
          </div>
        </div>

        {/* Status Distribution Pie Chart */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChart className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-bold text-gray-100">Booking Status Distribution</h3>
          </div>
          <div className="h-64">
            <Pie data={statusDistributionData} options={{ ...chartOptions, scales: undefined }} />
          </div>
        </div>

        {/* Bookings Over Time Line Chart */}
        <div className="bg-gray-800/50 backdrop-blur-sm border border-gray-700/50 rounded-xl p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-primary-400" />
            <h3 className="text-lg font-bold text-gray-100">Bookings Trend (Last 7 Days)</h3>
          </div>
          <div className="h-80">
            <Line data={bookingsOverTimeData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
