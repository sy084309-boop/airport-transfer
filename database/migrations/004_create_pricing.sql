-- 004: Pricing Rules
CREATE TABLE pricing_rules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name       VARCHAR(100) NOT NULL,
  vehicle_type    VARCHAR(30) NOT NULL,
  origin_zone     VARCHAR(100) NOT NULL,
  dest_zone       VARCHAR(100) NOT NULL,
  base_price      DECIMAL(10,2) NOT NULL,
  price_per_km    DECIMAL(6,2) DEFAULT 0,
  night_surcharge DECIMAL(10,2) DEFAULT 0,
  holiday_surcharge DECIMAL(10,2) DEFAULT 0,
  extra_stop_fee  DECIMAL(8,2) DEFAULT 200,
  is_active       BOOLEAN DEFAULT true,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default Taiwan pricing
INSERT INTO pricing_rules (rule_name, vehicle_type, origin_zone, dest_zone, base_price, night_surcharge) VALUES
('台北→桃園機場 轎車', 'sedan', 'taipei', 'taoyuan_airport', 799, 200),
('台北→桃園機場 休旅', 'suv', 'taipei', 'taoyuan_airport', 999, 200),
('台北→桃園機場 九人座', 'van', 'taipei', 'taoyuan_airport', 1299, 300),
('新北→桃園機場 轎車', 'sedan', 'new_taipei', 'taoyuan_airport', 899, 200),
('新北→桃園機場 休旅', 'suv', 'new_taipei', 'taoyuan_airport', 1099, 200),
('桃園→松山機場 轎車', 'sedan', 'taoyuan', 'songshan_airport', 699, 200),
('短程送機 轎車', 'sedan', 'taipei', 'taipei', 600, 0);
