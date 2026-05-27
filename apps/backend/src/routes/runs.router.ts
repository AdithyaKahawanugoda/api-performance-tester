import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateBody } from '../middleware/validate.middleware';
import { StartTestRunSchema } from '@api-perf/shared';
import { testRunRateLimiter } from '../middleware/rateLimiter.middleware';
import * as ctrl from '../controllers/runs.controller';

const router: Router = Router();

router.get('/compare', asyncHandler(ctrl.compare));
router.get('/', asyncHandler(ctrl.list));
router.get('/:id', asyncHandler(ctrl.getOne));
router.post('/', testRunRateLimiter, validateBody(StartTestRunSchema), asyncHandler(ctrl.start));
router.post('/:id/cancel', asyncHandler(ctrl.cancel));
router.post('/bulk-delete', asyncHandler(ctrl.bulkRemove));
router.delete('/:id', asyncHandler(ctrl.remove));

export default router;
