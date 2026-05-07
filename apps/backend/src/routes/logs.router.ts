import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import * as ctrl from '../controllers/logs.controller';

const router: Router = Router({ mergeParams: true });

router.get('/', asyncHandler(ctrl.getLogs));

export default router;
