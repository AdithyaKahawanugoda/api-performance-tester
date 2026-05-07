import type { Request, Response } from 'express';
import * as configService from '../services/config.service';

export async function list(req: Request, res: Response): Promise<void> {
  const result = await configService.listConfigs(req.query as Record<string, string>);
  res.json({ success: true, data: result });
}

export async function getOne(req: Request, res: Response): Promise<void> {
  const config = await configService.getConfig(req.params.id as string);
  res.json({ success: true, data: config });
}

export async function create(req: Request, res: Response): Promise<void> {
  const config = await configService.createConfig(req.body);
  res.status(201).json({ success: true, data: config });
}

export async function update(req: Request, res: Response): Promise<void> {
  const config = await configService.updateConfig(req.params.id as string, req.body);
  res.json({ success: true, data: config });
}

export async function remove(req: Request, res: Response): Promise<void> {
  await configService.deleteConfig(req.params.id as string);
  res.status(204).send();
}
