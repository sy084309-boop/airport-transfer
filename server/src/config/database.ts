import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.env.HOME || process.env.USERPROFILE || '', 'airport-transfer.db');

export const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL CHECK (role IN ('admin','agent','driver','member')),
      status TEXT DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
      avatar_url TEXT,
      last_login_at TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS drivers (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      license_number TEXT UNIQUE NOT NULL,
      license_expiry TEXT NOT NULL,
      status TEXT DEFAULT 'offline' CHECK (status IN ('online','offline','on_trip','unavailable')),
      current_lat REAL,
      current_lng REAL,
      total_trips INTEGER DEFAULT 0,
      total_points INTEGER DEFAULT 0,
      rating REAL DEFAULT 5.0,
      rating_count INTEGER DEFAULT 0,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS vehicles (
      id TEXT PRIMARY KEY,
      driver_id TEXT NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
      plate_number TEXT UNIQUE NOT NULL,
      brand TEXT NOT NULL,
      model TEXT NOT NULL,
      year INTEGER,
      color TEXT,
      vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('sedan','suv','van','luxury','accessible')),
      passenger_cap INTEGER DEFAULT 4,
      luggage_cap INTEGER DEFAULT 2,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS agents (
      id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      agent_code TEXT UNIQUE NOT NULL,
      station_name TEXT,
      total_commission REAL DEFAULT 0,
      commission_rate REAL DEFAULT 0.05,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS pricing_rules (
      id TEXT PRIMARY KEY,
      rule_name TEXT NOT NULL,
      vehicle_type TEXT NOT NULL,
      origin_zone TEXT NOT NULL,
      dest_zone TEXT NOT NULL,
      base_price REAL NOT NULL,
      price_per_km REAL DEFAULT 0,
      night_surcharge REAL DEFAULT 0,
      holiday_surcharge REAL DEFAULT 0,
      extra_stop_fee REAL DEFAULT 200,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bookings (
      id TEXT PRIMARY KEY,
      reference_code TEXT UNIQUE NOT NULL,
      member_id TEXT REFERENCES users(id),
      agent_id TEXT REFERENCES agents(id),
      driver_id TEXT REFERENCES drivers(id),
      booking_type TEXT NOT NULL CHECK (booking_type IN ('pickup','sendoff','general','urgent')),
      pickup_address TEXT NOT NULL,
      pickup_lat REAL,
      pickup_lng REAL,
      dropoff_address TEXT NOT NULL,
      dropoff_lat REAL,
      dropoff_lng REAL,
      flight_number TEXT,
      flight_datetime TEXT,
      flight_date TEXT,
      status_note TEXT,
      scheduled_pickup_at TEXT NOT NULL,
      actual_pickup_at TEXT,
      actual_dropoff_at TEXT,
      passenger_count INTEGER DEFAULT 1,
      luggage_count INTEGER DEFAULT 1,
      vehicle_type TEXT NOT NULL,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','confirmed','assigned','driver_accepted','driver_en_route','arrived_at_pickup','in_progress','completed','cancelled','no_show')),
      cancel_reason TEXT,
      cancelled_by TEXT REFERENCES users(id),
      is_guaranteed INTEGER DEFAULT 0,
      payment_method TEXT DEFAULT 'cash' CHECK (payment_method IN ('cash','card','line_pay')),
      payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','refunded','waived')),
      subtotal REAL NOT NULL,
      night_surcharge_applied REAL DEFAULT 0,
      extra_stops_fee REAL DEFAULT 0,
      discount REAL DEFAULT 0,
      total_price REAL NOT NULL,
      special_requests TEXT,
      notes TEXT,
      created_by TEXT REFERENCES users(id),
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_bookings_member ON bookings(member_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_driver ON bookings(driver_id);
    CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
    CREATE INDEX IF NOT EXISTS idx_bookings_ref ON bookings(reference_code);

    CREATE TABLE IF NOT EXISTS booking_status_history (
      id TEXT PRIMARY KEY,
      booking_id TEXT NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
      previous_status TEXT,
      new_status TEXT NOT NULL,
      changed_by TEXT REFERENCES users(id),
      note TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS commission_records (
      id TEXT PRIMARY KEY,
      agent_id TEXT NOT NULL REFERENCES agents(id),
      booking_id TEXT NOT NULL REFERENCES bookings(id),
      amount REAL NOT NULL,
      rate_applied REAL NOT NULL,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled')),
      paid_at TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS points_records (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      booking_id TEXT REFERENCES bookings(id),
      points INTEGER NOT NULL,
      reason TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id),
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      body TEXT,
      is_read INTEGER DEFAULT 0,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS reviews (
      id TEXT PRIMARY KEY,
      booking_id TEXT UNIQUE NOT NULL REFERENCES bookings(id),
      reviewer_id TEXT NOT NULL REFERENCES users(id),
      driver_id TEXT NOT NULL REFERENCES drivers(id),
      rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
      comment TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id TEXT PRIMARY KEY,
      user_id TEXT REFERENCES users(id),
      action TEXT NOT NULL,
      resource_type TEXT,
      resource_id TEXT,
      details TEXT,
      ip_address TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    -- Seed pricing rules
    INSERT OR IGNORE INTO pricing_rules (id, rule_name, vehicle_type, origin_zone, dest_zone, base_price, night_surcharge) VALUES
    ('p1','台北→桃園機場 轎車','sedan','taipei','taoyuan_airport',799,200),
    ('p2','台北→桃園機場 休旅','suv','taipei','taoyuan_airport',999,200),
    ('p3','台北→桃園機場 九人座','van','taipei','taoyuan_airport',1299,300),
    ('p4','新北→桃園機場 轎車','sedan','new_taipei','taoyuan_airport',899,200),
    ('p5','新北→桃園機場 休旅','suv','new_taipei','taoyuan_airport',1099,200),
    ('p6','桃園→松山機場 轎車','sedan','taoyuan','songshan_airport',699,200),
    ('p7','短程送機 轎車','sedan','taipei','taipei',600,0);
  `);
}
