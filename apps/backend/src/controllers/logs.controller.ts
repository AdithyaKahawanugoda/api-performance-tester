import type { Request, Response } from 'express';
import { RequestLogModel } from '../db/models/index';
import { parsePagination, buildPaginatedResponse } from '../lib/pagination';

export async function getLogs(req: Request, res: Response): Promise<void> {
  const { page, pageSize, skip } = parsePagination(req.query as Record<string, string>);
  const runId = req.params.id as string;

  const [docs, total] = await Promise.all([
    RequestLogModel.find({ runId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(pageSize)
      .lean(),
    RequestLogModel.countDocuments({ runId }),
  ]);

  const items = docs.map((d) => ({ ...d, id: String(d._id), runId: String(d.runId) }));
  res.json({ success: true, data: buildPaginatedResponse(items, total, page, pageSize) });
}
