import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler';
import { validateBody } from '../middleware/validate.middleware';
import { CreateTestConfigSchema, UpdateTestConfigSchema } from '@api-perf/shared';
import * as ctrl from '../controllers/configs.controller';

const router: Router = Router();

router.get('/', asyncHandler(ctrl.list));
router.get('/:id', asyncHandler(ctrl.getOne));
router.post('/', validateBody(CreateTestConfigSchema), asyncHandler(ctrl.create));
router.patch('/:id', validateBody(UpdateTestConfigSchema), asyncHandler(ctrl.update));
router.delete('/:id', asyncHandler(ctrl.remove));

export default router;
