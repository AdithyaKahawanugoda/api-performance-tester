import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import * as ctrl from '../controllers/metrics.controller';

const router: Router = Router({ mergeParams: true });

router.get('/', asyncHandler(ctrl.getMetrics));
router.get('/timeline', asyncHandler(ctrl.getTimeline));

export default router;
