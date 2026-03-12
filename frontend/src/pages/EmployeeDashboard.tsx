import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import api from '../api';
import StatCard from '../components/StatCard';
import { DriverStats, DashboardStats } from '../types';
import { useAuth } from '../contexts/AuthContext';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function EmployeeDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DriverStats | null>(null);
  const [masterStats, setMasterStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (isAdmin) {
      api.get('/dashboard/master')
        .then((r) => setMasterStats(r.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    } else if (user?.driver_name) {
      api.get(`/dashboard/driver/${encodeURIComponent(user.driver_name)}`)
        .then((r) => setStats(r.data))
        .catch(console.error)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, [user, isAdmin]);

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  // Admin viewing "My Dashboard" — show their personal summary using master stats
  if (isAdmin && masterStats) {
    const weeklyTrendData = masterStats.weeklyTrend.map((w) => ({
      label: `W${w.week_number}/${w.year_number}`,
      Events: w.count,
    }));

    return (
      <div className="p-8 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
          <p className="text-gray-500 mt-1">Welcome back, {user?.name}. You have admin access.</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard title="Total Events" value={masterStats.totalEvents.toLocaleString()} icon="🚨" color="blue" />
          <StatCard title="This Week" value={masterStats.eventsThisWeek.toLocaleString()} trend={masterStats.weekOverWeekChange} icon="📅" color="yellow" />
          <StatCard title="Active Drivers" value={masterStats.activeDrivers.toLocaleString()} icon="👤" color="purple" />
        </div>
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Weekly Events Trend</h2>
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
            <div className="h-64 flex items-center justify-center text-gray-400">No data yet</div>
          )}
        </div>
      </div>
    );
  }

  // Employee with no driver assigned
  if (!user?.driver_name) {
    return (
      <div className="p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-8 text-center">
          <p className="text-yellow-700 font-medium text-lg">No driver assigned</p>
          <p className="text-yellow-600 mt-1">Please contact your administrator to assign a driver to your account.</p>
        </div>
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
        <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
        <p className="text-gray-500 mt-1">Driver: <span className="font-semibold text-blue-600">{stats.driver}</span></p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Total Events" value={stats.totalEvents.toLocaleString()} icon="🚨" color="blue" />
        <StatCard title="Avg Speed" value={stats.avgSpeed ? `${stats.avgSpeed} km/h` : 'N/A'} icon="⚡" color="yellow" />
        <StatCard title="Avg Duration" value={stats.avgDuration ? `${stats.avgDuration}s` : 'N/A'} icon="⏱️" color="purple" />
        <StatCard title="Event Types" value={stats.eventsByType.length} icon="📊" color="green" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Weekly Trend */}
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">My Weekly Events</h2>
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
          <h2 className="text-lg font-semibold text-gray-900 mb-4">My Events by Type</h2>
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

      {/* Classification Breakdown */}
      {stats.eventsByClassification.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Classification Breakdown</h2>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats.eventsByClassification}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="classification" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} name="Events" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Recent Events */}
      {stats.recentEvents.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Events</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Date/Time</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Event Type</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Vehicle</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Speed</th>
                  <th className="text-left py-2 px-3 font-medium text-gray-500">Classification</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentEvents.map((event) => (
                  <tr key={event.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-3 text-xs text-gray-500">
                      {event.detection_time ? new Date(event.detection_time).toLocaleString() : '—'}
                    </td>
                    <td className="py-2 px-3">{event.event_type || '—'}</td>
                    <td className="py-2 px-3">{event.vehicle || '—'}</td>
                    <td className="py-2 px-3">{event.speed_kph ? `${event.speed_kph} km/h` : '—'}</td>
                    <td className="py-2 px-3">
                      {event.classification && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {event.classification}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {stats.totalEvents === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-8 text-center">
          <p className="text-blue-700 font-medium text-lg">No events yet for {stats.driver}</p>
          <p className="text-blue-500 mt-1">Events will appear here once data has been uploaded.</p>
        </div>
      )}
    </div>
  );
}
