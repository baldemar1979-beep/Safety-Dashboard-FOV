import { Router, Response } from 'express';
import db from '../database';
import { authenticateToken, AuthRequest } from '../middleware/auth';

const router = Router();

// Master dashboard stats
router.get('/master', authenticateToken, (req: AuthRequest, res: Response) => {
  const isAdmin = req.user!.role === 'admin';
  const driverName = req.user!.driver_name;

  // Total events
  const totalEvents = isAdmin
    ? (db.prepare(`SELECT COUNT(*) as count FROM fov_events`).get() as { count: number }).count
    : (db.prepare(`SELECT COUNT(*) as count FROM fov_events WHERE driver = ?`).get(driverName) as { count: number }).count;

  // Current week bounds
  const now = new Date();
  const dayOfWeek = now.getUTCDay() || 7;
  const weekStart = new Date(now);
  weekStart.setUTCDate(now.getUTCDate() - dayOfWeek + 1);
  weekStart.setUTCHours(0, 0, 0, 0);
  const weekStartStr = weekStart.toISOString();

  // Last week bounds
  const lastWeekStart = new Date(weekStart);
  lastWeekStart.setUTCDate(lastWeekStart.getUTCDate() - 7);
  const lastWeekStartStr = lastWeekStart.toISOString();

  // Events this week
  const eventsThisWeek = isAdmin
    ? (db.prepare(`SELECT COUNT(*) as count FROM fov_events WHERE detection_time >= ?`).get(weekStartStr) as { count: number }).count
    : (db.prepare(`SELECT COUNT(*) as count FROM fov_events WHERE driver = ? AND detection_time >= ?`).get(driverName, weekStartStr) as { count: number }).count;

  // Events last week
  const eventsLastWeek = isAdmin
    ? (db.prepare(`SELECT COUNT(*) as count FROM fov_events WHERE detection_time >= ? AND detection_time < ?`).get(lastWeekStartStr, weekStartStr) as { count: number }).count
    : (db.prepare(`SELECT COUNT(*) as count FROM fov_events WHERE driver = ? AND detection_time >= ? AND detection_time < ?`).get(driverName, lastWeekStartStr, weekStartStr) as { count: number }).count;

  // Events by driver (admin only, top 10)
  const eventsByDriver = isAdmin
    ? db.prepare(`
        SELECT driver, COUNT(*) as count
        FROM fov_events
        WHERE driver IS NOT NULL
        GROUP BY driver
        ORDER BY count DESC
        LIMIT 10
      `).all()
    : [];

  // Events by event type
  const eventsByType = isAdmin
    ? db.prepare(`SELECT event_type, COUNT(*) as count FROM fov_events WHERE event_type IS NOT NULL GROUP BY event_type ORDER BY count DESC`).all()
    : db.prepare(`SELECT event_type, COUNT(*) as count FROM fov_events WHERE driver = ? AND event_type IS NOT NULL GROUP BY event_type ORDER BY count DESC`).all(driverName);

  // Events by classification
  const eventsByClassification = isAdmin
    ? db.prepare(`SELECT classification, COUNT(*) as count FROM fov_events WHERE classification IS NOT NULL GROUP BY classification ORDER BY count DESC`).all()
    : db.prepare(`SELECT classification, COUNT(*) as count FROM fov_events WHERE driver = ? AND classification IS NOT NULL GROUP BY classification ORDER BY count DESC`).all(driverName);

  // Weekly trend (last 8 weeks)
  const weeklyTrend = (isAdmin
    ? db.prepare(`
        SELECT week_number, year_number, COUNT(*) as count
        FROM fov_events
        GROUP BY year_number, week_number
        ORDER BY year_number DESC, week_number DESC
        LIMIT 8
      `).all()
    : db.prepare(`
        SELECT week_number, year_number, COUNT(*) as count
        FROM fov_events
        WHERE driver = ?
        GROUP BY year_number, week_number
        ORDER BY year_number DESC, week_number DESC
        LIMIT 8
      `).all(driverName)
  ).reverse() as { week_number: number; year_number: number; count: number }[];

  // Recent uploads (admin only)
  const recentUploads = isAdmin
    ? db.prepare(`
        SELECT u.*, us.name as uploaded_by_name
        FROM uploads u
        LEFT JOIN users us ON u.uploaded_by = us.id
        ORDER BY u.created_at DESC
        LIMIT 5
      `).all()
    : [];

  // Active drivers and vehicles count (admin only)
  const activeDrivers = isAdmin
    ? (db.prepare(`SELECT COUNT(DISTINCT driver) as count FROM fov_events WHERE driver IS NOT NULL`).get() as { count: number }).count
    : 0;

  const activeVehicles = isAdmin
    ? (db.prepare(`SELECT COUNT(DISTINCT vehicle) as count FROM fov_events WHERE vehicle IS NOT NULL`).get() as { count: number }).count
    : 0;

  res.json({
    totalEvents,
    eventsThisWeek,
    eventsLastWeek,
    weekOverWeekChange: eventsLastWeek > 0
      ? Math.round(((eventsThisWeek - eventsLastWeek) / eventsLastWeek) * 100)
      : null,
    eventsByDriver,
    eventsByType,
    eventsByClassification,
    weeklyTrend,
    recentUploads,
    activeDrivers,
    activeVehicles,
  });
});

// Per-driver stats
router.get('/driver/:driverName', authenticateToken, (req: AuthRequest, res: Response) => {
  const { driverName } = req.params;

  if (req.user!.role !== 'admin' && req.user!.driver_name !== driverName) {
    res.status(403).json({ error: 'Access denied' });
    return;
  }

  const totalEvents = (db.prepare(`SELECT COUNT(*) as count FROM fov_events WHERE driver = ?`).get(driverName) as { count: number }).count;

  const eventsByType = db.prepare(`
    SELECT event_type, COUNT(*) as count
    FROM fov_events
    WHERE driver = ? AND event_type IS NOT NULL
    GROUP BY event_type
    ORDER BY count DESC
  `).all(driverName);

  const eventsByClassification = db.prepare(`
    SELECT classification, COUNT(*) as count
    FROM fov_events
    WHERE driver = ? AND classification IS NOT NULL
    GROUP BY classification
    ORDER BY count DESC
  `).all(driverName);

  const weeklyTrend = (db.prepare(`
    SELECT week_number, year_number, COUNT(*) as count
    FROM fov_events
    WHERE driver = ?
    GROUP BY year_number, week_number
    ORDER BY year_number DESC, week_number DESC
    LIMIT 8
  `).all(driverName) as { week_number: number; year_number: number; count: number }[]).reverse();

  const avgStats = db.prepare(`
    SELECT
      AVG(speed_kph) as avg_speed,
      AVG(duration_seconds) as avg_duration
    FROM fov_events
    WHERE driver = ? AND speed_kph IS NOT NULL
  `).get(driverName) as { avg_speed: number | null; avg_duration: number | null };

  const recentEvents = db.prepare(`
    SELECT * FROM fov_events WHERE driver = ? ORDER BY detection_time DESC LIMIT 10
  `).all(driverName);

  res.json({
    driver: driverName,
    totalEvents,
    eventsByType,
    eventsByClassification,
    weeklyTrend,
    avgSpeed: avgStats.avg_speed ? Math.round(avgStats.avg_speed * 10) / 10 : null,
    avgDuration: avgStats.avg_duration ? Math.round(avgStats.avg_duration * 10) / 10 : null,
    recentEvents,
  });
});

export default router;
