import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';

const DB_PATH = path.join(__dirname, '..', 'data', 'safety_dashboard.db');

// Ensure data directory exists
import fs from 'fs';
const dataDir = path.join(__dirname, '..', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    role TEXT NOT NULL DEFAULT 'employee',
    driver_name TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS uploads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    filename TEXT NOT NULL,
    uploaded_by INTEGER NOT NULL,
    event_count INTEGER DEFAULT 0,
    week_number INTEGER,
    year_number INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (uploaded_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS fov_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id TEXT,
    vehicle_id TEXT,
    vehicle TEXT,
    driver TEXT,
    detection_time TEXT,
    utc_offset TEXT,
    event_type TEXT,
    detected_event_type TEXT,
    duration_seconds REAL,
    speed_kph REAL,
    travel_metres REAL,
    latitude REAL,
    longitude REAL,
    audio_alert TEXT,
    vibration_alert TEXT,
    visual_alert TEXT,
    trip_distance_metres REAL,
    trip_time_seconds REAL,
    confirmation TEXT,
    confirmation_time TEXT,
    classification TEXT,
    fleet TEXT,
    timezone TEXT,
    account TEXT,
    service_provider TEXT,
    shift TEXT,
    crew TEXT,
    guardian_unit TEXT,
    software_version TEXT,
    tags TEXT,
    upload_id INTEGER,
    week_number INTEGER,
    year_number INTEGER,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (upload_id) REFERENCES uploads(id)
  );

  CREATE INDEX IF NOT EXISTS idx_fov_events_driver ON fov_events(driver);
  CREATE INDEX IF NOT EXISTS idx_fov_events_week ON fov_events(week_number, year_number);
  CREATE INDEX IF NOT EXISTS idx_fov_events_event_type ON fov_events(event_type);
  CREATE INDEX IF NOT EXISTS idx_fov_events_detection_time ON fov_events(detection_time);
`);

// Seed default admin user if no users exist
const userCount = (db.prepare('SELECT COUNT(*) as count FROM users').get() as { count: number }).count;
if (userCount === 0) {
  const passwordHash = bcrypt.hashSync('admin123', 10);
  db.prepare(`
    INSERT INTO users (username, password_hash, name, email, role)
    VALUES (?, ?, ?, ?, ?)
  `).run('admin', passwordHash, 'Administrator', 'admin@company.com', 'admin');
  console.log('Default admin user created: username=admin, password=admin123');
}

export default db;
