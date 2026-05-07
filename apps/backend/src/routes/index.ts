import { Router } from 'express';
import configsRouter from './configs.router';
import runsRouter from './runs.router';
import metricsRouter from './metrics.router';
import logsRouter from './logs.router';
import importRouter from './import.router';
import exportRouter from './export.router';

const router: Router = Router();

router.get('/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok', timestamp: new Date().toISOString() } });
});

router.use('/configs', configsRouter);
router.use('/runs', runsRouter);
router.use('/runs/:id/metrics', metricsRouter);
router.use('/runs/:id/logs', logsRouter);
router.use('/import', importRouter);
router.use('/runs/:id/export', exportRouter);

export default router;
