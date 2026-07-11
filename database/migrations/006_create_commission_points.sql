-- 006: Commission & Points
CREATE TABLE commission_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        UUID NOT NULL REFERENCES agents(id),
  booking_id      UUID NOT NULL REFERENCES bookings(id),
  amount          DECIMAL(10,2) NOT NULL,
  rate_applied    DECIMAL(5,4) NOT NULL,
  status          VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','paid','cancelled')),
  paid_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE points_records (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID NOT NULL REFERENCES users(id),
  booking_id      UUID REFERENCES bookings(id),
  points          INTEGER NOT NULL,
  reason          VARCHAR(100) NOT NULL,
  description     TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
