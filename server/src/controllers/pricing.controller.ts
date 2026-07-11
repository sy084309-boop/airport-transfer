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

export async function createRule(req: Request, res: Response, next: NextFunction) {
  try {
    const rule = await pricingService.createPricingRule(req.body);
    res.status(201).json(rule);
  } catch (err: any) {
    next(err);
  }
}
