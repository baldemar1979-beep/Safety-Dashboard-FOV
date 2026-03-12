import { useState, useEffect, useCallback } from 'react';
import api from '../api';
import { FovEvent, EventsResponse } from '../types';
import { useAuth } from '../contexts/AuthContext';

export default function EventsPage() {
  const { user } = useAuth();
  const [events, setEvents] = useState<FovEvent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDriver, setFilterDriver] = useState('');
  const [filterType, setFilterType] = useState('');
  const [drivers, setDrivers] = useState<string[]>([]);
  const [eventTypes, setEventTypes] = useState<string[]>([]);
  const limit = 50;

  const fetchEvents = useCallback(async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {
        page: page.toString(),
        limit: limit.toString(),
      };
      if (search) params.search = search;
      if (filterDriver) params.driver = filterDriver;
      if (filterType) params.event_type = filterType;

      const r = await api.get<EventsResponse>('/events', { params });
      setEvents(r.data.events);
      setTotal(r.data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [page, search, filterDriver, filterType]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Load filter options (admin only)
  useEffect(() => {
    if (user?.role === 'admin') {
      api.get('/users/drivers/list').then((r) => setDrivers(r.data)).catch(() => {});
    }
    // Load event types from events
    api.get('/events', { params: { limit: '1000' } })
      .then((r: { data: EventsResponse }) => {
        const types = [...new Set((r.data.events as FovEvent[]).map((e) => e.event_type).filter(Boolean))] as string[];
        setEventTypes(types);
      })
      .catch(() => {});
  }, [user]);

  const handleExport = async () => {
    const params = new URLSearchParams();
    if (filterDriver) params.set('driver', filterDriver);
    if (filterType) params.set('event_type', filterType);
    const url = `/api/events/export/excel?${params.toString()}`;
    window.open(url, '_blank');
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">FOV Events</h1>
          <p className="text-gray-500 mt-1">{total.toLocaleString()} total events</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Export Excel
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search events..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="flex-1 min-w-48 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
        />
        {user?.role === 'admin' && (
          <select
            value={filterDriver}
            onChange={(e) => { setFilterDriver(e.target.value); setPage(1); }}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="">All Drivers</option>
            {drivers.map((d) => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
        <select
          value={filterType}
          onChange={(e) => { setFilterType(e.target.value); setPage(1); }}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">All Event Types</option>
          {eventTypes.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        {(search || filterDriver || filterType) && (
          <button
            onClick={() => { setSearch(''); setFilterDriver(''); setFilterType(''); setPage(1); }}
            className="px-3 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Date/Time</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Driver</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Vehicle</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Event Type</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Detected Type</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Speed</th>
                <th className="text-right py-3 px-4 font-medium text-gray-500">Duration</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Classification</th>
                <th className="text-left py-3 px-4 font-medium text-gray-500">Confirmation</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">Loading events...</td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-gray-400">
                    {total === 0 ? 'No events found. Upload data to get started.' : 'No events match your filters.'}
                  </td>
                </tr>
              ) : (
                events.map((event) => (
                  <tr key={event.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="py-2 px-4 text-xs text-gray-500 whitespace-nowrap">
                      {event.detection_time ? new Date(event.detection_time).toLocaleString() : '—'}
                    </td>
                    <td className="py-2 px-4 font-medium">{event.driver || '—'}</td>
                    <td className="py-2 px-4">{event.vehicle || '—'}</td>
                    <td className="py-2 px-4">
                      {event.event_type && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {event.event_type}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-4 text-gray-600">{event.detected_event_type || '—'}</td>
                    <td className="py-2 px-4 text-right">{event.speed_kph ? `${event.speed_kph} km/h` : '—'}</td>
                    <td className="py-2 px-4 text-right">{event.duration_seconds ? `${event.duration_seconds}s` : '—'}</td>
                    <td className="py-2 px-4">
                      {event.classification && (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          event.classification.toLowerCase().includes('critical') ? 'bg-red-100 text-red-800' :
                          event.classification.toLowerCase().includes('warning') ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {event.classification}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-4 text-gray-600">{event.confirmation || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              Showing {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total.toLocaleString()} events
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                ← Prev
              </button>
              <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
