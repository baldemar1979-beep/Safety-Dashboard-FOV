export interface User {
  id: number;
  username: string;
  name: string;
  email: string | null;
  role: 'admin' | 'employee';
  driver_name: string | null;
  created_at?: string;
}

export interface FovEvent {
  id: number;
  event_id: string | null;
  vehicle_id: string | null;
  vehicle: string | null;
  driver: string | null;
  detection_time: string | null;
  utc_offset: string | null;
  event_type: string | null;
  detected_event_type: string | null;
  duration_seconds: number | null;
  speed_kph: number | null;
  travel_metres: number | null;
  latitude: number | null;
  longitude: number | null;
  audio_alert: string | null;
  vibration_alert: string | null;
  visual_alert: string | null;
  trip_distance_metres: number | null;
  trip_time_seconds: number | null;
  confirmation: string | null;
  confirmation_time: string | null;
  classification: string | null;
  fleet: string | null;
  timezone: string | null;
  account: string | null;
  service_provider: string | null;
  shift: string | null;
  crew: string | null;
  guardian_unit: string | null;
  software_version: string | null;
  tags: string | null;
  upload_id: number | null;
  week_number: number | null;
  year_number: number | null;
  created_at: string;
}

export interface DashboardStats {
  totalEvents: number;
  eventsThisWeek: number;
  eventsLastWeek: number;
  weekOverWeekChange: number | null;
  eventsByDriver: { driver: string; count: number }[];
  eventsByType: { event_type: string; count: number }[];
  eventsByClassification: { classification: string; count: number }[];
  weeklyTrend: { week_number: number; year_number: number; count: number }[];
  recentUploads: Upload[];
  activeDrivers: number;
  activeVehicles: number;
}

export interface DriverStats {
  driver: string;
  totalEvents: number;
  eventsByType: { event_type: string; count: number }[];
  eventsByClassification: { classification: string; count: number }[];
  weeklyTrend: { week_number: number; year_number: number; count: number }[];
  avgSpeed: number | null;
  avgDuration: number | null;
  recentEvents: FovEvent[];
}

export interface Upload {
  id: number;
  filename: string;
  uploaded_by: number;
  uploaded_by_name?: string;
  event_count: number;
  week_number: number | null;
  year_number: number | null;
  created_at: string;
}

export interface EventsResponse {
  events: FovEvent[];
  total: number;
  page: number;
  limit: number;
}
