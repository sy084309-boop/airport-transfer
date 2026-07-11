-- 007: Status History, Reviews, Notifications, Audit Log
CREATE TABLE booking_status_history (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  previous_status VARCHAR(30),
  new_status      VARCHAR(30) NOT NULL,
  changed_by      UUID REFERENCES users(id),
  note            TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE reviews (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      UUID UNIQUE NOT NULL REFERENCES bookings(id),
  reviewer_id     UUID NOT NULL REFERENCES users(id),
  driver_id       UUID NOT NULL REFERENCES drivers(id),
  rating          INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment         TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE notifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  type            VARCHAR(30) NOT NULL,
  title           VARCHAR(200) NOT NULL,
  body            TEXT,
  is_read         BOOLEAN DEFAULT false,
  metadata        JSONB,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE audit_log (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID REFERENCES users(id),
  action          VARCHAR(100) NOT NULL,
  resource_type   VARCHAR(50),
  resource_id     UUID,
  details         JSONB,
  ip_address      VARCHAR(45),
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
