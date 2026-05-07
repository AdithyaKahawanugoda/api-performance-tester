import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import * as ctrl from '../controllers/export.controller';

const router: Router = Router({ mergeParams: true });

router.get('/csv', asyncHandler(ctrl.exportCSV));
router.get('/pdf', asyncHandler(ctrl.exportPDF));

export default router;
