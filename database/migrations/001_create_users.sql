-- 001: Users & Auth
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE users (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email           VARCHAR(255) UNIQUE NOT NULL,
  password_hash   VARCHAR(255) NOT NULL,
  full_name       VARCHAR(100) NOT NULL,
  phone           VARCHAR(20),
  role            VARCHAR(20) NOT NULL CHECK (role IN ('admin','agent','driver','member')),
  status          VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active','inactive','suspended')),
  avatar_url      VARCHAR(500),
  last_login_at   TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Default admin user (password: admin123)
INSERT INTO users (email, password_hash, full_name, role) VALUES
('admin@airport.com', '$2b$10$placeholder', '系統管理員', 'admin');
