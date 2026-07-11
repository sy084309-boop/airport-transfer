-- 002: Drivers & Vehicles
CREATE TABLE drivers (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  license_number  VARCHAR(50) UNIQUE NOT NULL,
  license_expiry  DATE NOT NULL,
  status          VARCHAR(20) DEFAULT 'offline' CHECK (status IN ('online','offline','on_trip','unavailable')),
  current_lat     DECIMAL(10,7),
  current_lng     DECIMAL(10,7),
  total_trips     INTEGER DEFAULT 0,
  total_points    INTEGER DEFAULT 0,
  rating          DECIMAL(2,1) DEFAULT 5.0 CHECK (rating >= 1.0 AND rating <= 5.0),
  rating_count    INTEGER DEFAULT 0,
  notes           TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE vehicles (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id       UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  plate_number    VARCHAR(20) UNIQUE NOT NULL,
  brand           VARCHAR(50) NOT NULL,
  model           VARCHAR(50) NOT NULL,
  year            INTEGER,
  color           VARCHAR(30),
  vehicle_type    VARCHAR(30) NOT NULL CHECK (vehicle_type IN ('sedan','suv','van','luxury','accessible')),
  passenger_cap   INTEGER DEFAULT 4,
  luggage_cap     INTEGER DEFAULT 2,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
