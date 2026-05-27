import type { Request, Response } from 'express';
import * as runService from '../services/run.service';
import { BadRequestError } from '../lib/errors';

export async function start(req: Request, res: Response): Promise<void> {
  const run = await runService.startRun(req.body.configId);
  res.status(201).json({ success: true, data: run });
}

export async function list(req: Request, res: Response): Promise<void> {
  const result = await runService.listRuns(req.query as Record<string, string>);
  res.json({ success: true, data: result });
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const run = await runService.getRun(req.params.id as string);
  res.json({ success: true, data: run });
}

export async function cancel(req: Request, res: Response): Promise<void> {
  const run = await runService.cancelRun(req.params.id as string);
  res.json({ success: true, data: run });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await runService.deleteRun(req.params.id as string);
  res.status(204).send();
}

export async function bulkRemove(req: Request, res: Response): Promise<void> {
  const ids = req.body?.ids;
  if (!Array.isArray(ids) || ids.length === 0) {
    throw new BadRequestError('Body must contain a non-empty `ids` array');
  }
  const deleted = await runService.bulkDeleteRuns(ids as string[]);
  res.json({ success: true, data: { deleted } });
}

export async function compare(req: Request, res: Response): Promise<void> {
  const ids = req.query['ids'];
  if (!ids || typeof ids !== 'string') {
    throw new BadRequestError('Query param `ids` is required (comma-separated run IDs)');
  }
  const runIds = ids.split(',').map((s) => s.trim()).filter(Boolean);
  if (runIds.length < 2 || runIds.length > 4) {
    throw new BadRequestError('Provide 2-4 run IDs to compare');
  }
  const runs = await runService.compareRuns(runIds);
  res.json({ success: true, data: runs });
}
