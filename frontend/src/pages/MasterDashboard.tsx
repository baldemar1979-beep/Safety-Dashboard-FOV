import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import api from '../api';
import StatCard from '../components/StatCard';
import { DashboardStats } from '../types';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#f97316', '#84cc16'];

export default function MasterDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/dashboard/master')
      .then((r) => setStats(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  if (!stats) return null;

  const weeklyTrendData = stats.weeklyTrend.map((w) => ({
    label: `W${w.week_number}/${w.year_number}`,
    Events: w.count,
  }));

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Master Dashboard</h1>
        <p className="text-gray-500 mt-1">Overview of all FOV alerts across the fleet</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Events"
          value={stats.totalEvents.toLocaleString()}
          icon="🚨"
          color="blue"
        />
        <StatCard
          title="This Week"
          value={stats.eventsThisWeek.toLocaleString()}
          trend={stats.weekOverWeekChange}
          icon="📅"
          color={stats.weekOverWeekChange !== null && stats.weekOverWeekChange < 0 ? 'green' : 'yellow'}
        />
        <StatCard
          title="Active Drivers"
          value={stats.activeDrivers.toLocaleString()}
          icon="👤"
          color="purple"
        />
        <StatCard
          title="Active Vehicles"
          value={stats.activeVehicles.toLocaleString()}
          icon="🚛"
          color="green"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Trend */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Weekly Trend (Events)</h2>
          {weeklyTrendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={weeklyTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="label" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Line type="monotone" dataKey="Events" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">No data available</div>
          )}
        </div>

        {/* Events by Type */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Events by Type</h2>
          {stats.eventsByType.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={stats.eventsByType}
                  dataKey="count"
                  nameKey="event_type"
                  cx="50%"
                  cy="50%"
                  outerRadius={90}
                  label={({ event_type, percent }) => `${event_type} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {stats.eventsByType.map((_, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">No data available</div>
          )}
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Drivers */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Drivers by Alert Count</h2>
          {stats.eventsByDriver.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.eventsByDriver} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="driver" width={120} tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} name="Events" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">No data available</div>
          )}
        </div>

        {/* Classification Breakdown */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Classification Breakdown</h2>
          {stats.eventsByClassification.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={stats.eventsByClassification}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="classification" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="Events" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-400">No data available</div>
          )}
        </div>
      </div>

      {/* Recent Uploads */}
      {stats.recentUploads.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Uploads</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Filename</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Uploaded By</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Week</th>
                  <th className="text-right py-2 px-3 font-medium text-gray-500">Events</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentUploads.map((upload) => (
                  <tr key={upload.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-3 font-mono text-xs">{upload.filename}</td>
                    <td className="py-2 px-3">{upload.uploaded_by_name}</td>
                    <td className="py-2 px-3">W{upload.week_number}/{upload.year_number}</td>
                    <td className="py-2 px-3 text-right font-semibold">{upload.event_count?.toLocaleString()}</td>
                    <td className="py-2 px-3 text-gray-500">{new Date(upload.created_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {stats.totalEvents === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
          <p className="text-blue-700 font-medium text-lg">No events yet</p>
          <p className="text-blue-500 mt-1">Upload your first FOV alert Excel file to get started</p>
          <a href="/upload" className="mt-4 inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Upload Data →
          </a>
        </div>
      )}
    </div>
  );
}
