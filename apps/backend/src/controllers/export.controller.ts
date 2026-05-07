import type { Request, Response } from 'express';
import { exportRunAsCSV, generateRunPDF } from '../services/export.service';

export async function exportCSV(req: Request, res: Response): Promise<void> {
  const csv = await exportRunAsCSV(req.params.id as string);
  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', `attachment; filename="run-${req.params['id']}.csv"`);
  res.send(csv);
}

export async function exportPDF(req: Request, res: Response): Promise<void> {
  const pdf = await generateRunPDF(req.params.id as string);
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="run-${req.params['id']}.pdf"`);
  res.send(pdf);
}
