import type { Request, Response } from 'express';
import { parseOpenAPISpec } from '../services/openapi.service';
import { BadRequestError } from '../lib/errors';

export async function importOpenAPI(req: Request, res: Response): Promise<void> {
  const file = req.file;
  if (!file) throw new BadRequestError('No file uploaded');

  const content = file.buffer.toString('utf-8');
  const format = (file.originalname.endsWith('.yaml') || file.originalname.endsWith('.yml')) ? 'yaml' : 'json';

  const configDraft = await parseOpenAPISpec(content, format);
  res.json({ success: true, data: configDraft });
}
