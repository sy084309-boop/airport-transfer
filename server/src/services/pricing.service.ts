import { db } from '../config/database';
import { v4 as uuid } from 'uuid';

interface PriceCalc {
  vehicleType: string; origin: string; dest: string;
  isNight?: boolean; isHoliday?: boolean; extraStops?: number;
}

export function calculatePrice(params: PriceCalc) {
  const { vehicleType, origin, dest, isNight, isHoliday, extraStops = 0 } = params;

  let rule = db.prepare(
    `SELECT * FROM pricing_rules WHERE vehicle_type = ? AND origin_zone = ? AND dest_zone = ? AND is_active = 1 LIMIT 1`
  ).get(vehicleType, origin, dest) as any;

  if (!rule) {
    rule = db.prepare(`SELECT * FROM pricing_rules WHERE vehicle_type = ? AND is_active = 1 LIMIT 1`).get(vehicleType) as any;
    if (!rule) throw new Error('找不到適用的費率規則');
  }

  const basePrice = rule.base_price;
  const nightSurcharge = isNight ? rule.night_surcharge : 0;
  const holidaySurcharge = isHoliday ? rule.holiday_surcharge : 0;
  const extraFee = extraStops * rule.extra_stop_fee;

  return { basePrice, nightSurcharge, holidaySurcharge, extraStopsFee: extraFee,
    totalPrice: basePrice + nightSurcharge + holidaySurcharge + extraFee, matchedRule: rule.rule_name };
}

export function getPricingRules() {
  return db.prepare(`SELECT * FROM pricing_rules WHERE is_active = 1 ORDER BY vehicle_type, origin_zone`).all();
}

export function createPricingRule(data: any) {
  const id = uuid();
  db.prepare(`INSERT INTO pricing_rules (id, rule_name, vehicle_type, origin_zone, dest_zone, base_price, night_surcharge, holiday_surcharge, extra_stop_fee)
    VALUES (?,?,?,?,?,?,?,?,?)`).run(id, data.ruleName, data.vehicleType, data.originZone, data.destZone, data.basePrice, data.nightSurcharge || 0, data.holidaySurcharge || 0, data.extraStopFee || 200);
  return db.prepare(`SELECT * FROM pricing_rules WHERE id = ?`).get(id);
}
