import { Request, Response, NextFunction } from 'express';
import * as pricingService from '../services/pricing.service';

export async function calculate(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await pricingService.calculatePrice(req.body);
    res.json(result);
  } catch (err: any) {
    next(err);
  }
}

export async function getRules(req: Request, res: Response, next: NextFunction) {
  try {
    const rules = await pricingService.getPricingRules();
    res.json(rules);
  } catch (err: any) {
    next(err);
  }
}

export async function estimate(req: Request, res: Response, next: NextFunction) {
  try {
    const result = await pricingService.estimateRouteAndPrice(req.body);
    res.json(result);
  } catch (err: any) {
    if (err.message?.includes('無法定位')) return res.status(400).json({ error: err.message });
    next(err);
  }
}

export async function createRule(req: Request, res: Response, next: NextFunction) {
  try {
    const rule = await pricingService.createPricingRule(req.body);
    res.status(201).json(rule);
  } catch (err: any) {
    next(err);
  }
}
