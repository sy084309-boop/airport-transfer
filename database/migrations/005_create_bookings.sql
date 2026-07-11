-- 005: Bookings (core transaction table)
CREATE TABLE bookings (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_code      VARCHAR(12) UNIQUE NOT NULL,
  member_id           UUID REFERENCES users(id),
  agent_id            UUID REFERENCES agents(id),
  driver_id           UUID REFERENCES drivers(id),
  booking_type        VARCHAR(20) NOT NULL CHECK (booking_type IN ('pickup','sendoff','general','urgent')),
  pickup_address      VARCHAR(500) NOT NULL,
  pickup_lat          DECIMAL(10,7),
  pickup_lng          DECIMAL(10,7),
  dropoff_address     VARCHAR(500) NOT NULL,
  dropoff_lat         DECIMAL(10,7),
  dropoff_lng         DECIMAL(10,7),
  flight_number       VARCHAR(20),
  flight_datetime     TIMESTAMPTZ,
  scheduled_pickup_at TIMESTAMPTZ NOT NULL,
  actual_pickup_at    TIMESTAMPTZ,
  actual_dropoff_at   TIMESTAMPTZ,
  passenger_count     INTEGER DEFAULT 1,
  luggage_count       INTEGER DEFAULT 1,
  vehicle_type        VARCHAR(30) NOT NULL,
  status              VARCHAR(30) DEFAULT 'pending' CHECK (status IN (
                        'pending','confirmed','assigned','driver_accepted',
                        'driver_en_route','arrived_at_pickup','in_progress',
                        'completed','cancelled','no_show'
                      )),
  cancel_reason       VARCHAR(300),
  cancelled_by        UUID REFERENCES users(id),
  is_guaranteed       BOOLEAN DEFAULT false,
  payment_method      VARCHAR(20) DEFAULT 'cash' CHECK (payment_method IN ('cash','card','line_pay')),
  payment_status      VARCHAR(20) DEFAULT 'pending' CHECK (payment_status IN ('pending','paid','refunded','waived')),
  subtotal            DECIMAL(10,2) NOT NULL,
  night_surcharge_applied DECIMAL(10,2) DEFAULT 0,
  extra_stops_fee     DECIMAL(10,2) DEFAULT 0,
  discount            DECIMAL(10,2) DEFAULT 0,
  total_price         DECIMAL(10,2) NOT NULL,
  special_requests    TEXT,
  notes               TEXT,
  created_by          UUID REFERENCES users(id),
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_bookings_member ON bookings(member_id);
CREATE INDEX idx_bookings_driver ON bookings(driver_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_pickup ON bookings(scheduled_pickup_at);
CREATE INDEX idx_bookings_ref ON bookings(reference_code);
