-- 003: Agents
CREATE TABLE agents (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  agent_code      VARCHAR(20) UNIQUE NOT NULL,
  station_name    VARCHAR(100),
  total_commission DECIMAL(12,2) DEFAULT 0,
  commission_rate DECIMAL(5,4) DEFAULT 0.05,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
