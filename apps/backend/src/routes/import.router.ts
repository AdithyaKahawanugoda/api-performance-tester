import { Router } from 'express';
import multer from 'multer';
import { asyncHandler } from '../middleware/asyncHandler';
import * as ctrl from '../controllers/import.controller';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['.json', '.yaml', '.yml'];
    const ext = '.' + file.originalname.split('.').pop()?.toLowerCase();
    cb(null, allowed.includes(ext));
  },
});

const router: Router = Router();

router.post('/openapi', upload.single('spec'), asyncHandler(ctrl.importOpenAPI));

export default router;
