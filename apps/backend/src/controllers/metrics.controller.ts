import type { Request, Response } from 'express';
import * as metricsService from '../services/metrics.service';

export async function getMetrics(req: Request, res: Response): Promise<void> {
  const metrics = await metricsService.getRunMetrics(req.params.id as string);
  res.json({ success: true, data: metrics });
}

export async function getTimeline(req: Request, res: Response): Promise<void> {
  const timeline = await metricsService.getTimelineData(req.params.id as string);
  res.json({ success: true, data: timeline });
}
