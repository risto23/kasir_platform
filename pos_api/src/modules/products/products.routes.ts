import fs from 'fs';
import path from 'path';
import multer from 'multer';
import { Router } from 'express';
import { BusinessPermissionCode } from '@prisma/client';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { businessAccessMiddleware } from '../../middlewares/business-access.middleware';
import { requireBusinessPermission } from '../../middlewares/require-business-permission.middleware';
import { validateUploadedImage } from '../../middlewares/validate-uploaded-image.middleware';
import {
  listProductsHandler,
  getProductDetailHandler,
  createProductHandler,
  updateProductHandler,
  updateProductStatusHandler,
} from './products.controller';
import {
  validateListProducts,
  validateProductParams,
  validateCreateProduct,
  validateUpdateProduct,
  validateUpdateProductStatus,
} from './products.validation';

const router = Router();

const uploadDirectory = path.resolve(process.cwd(), 'uploads/products');

if (!fs.existsSync(uploadDirectory)) {
  fs.mkdirSync(uploadDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, callback) => {
    callback(null, uploadDirectory);
  },
  filename: (_req, file, callback) => {
    const extensionByMimeType: Record<string, string> = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    const safeExt = extensionByMimeType[file.mimetype] ?? '.jpg';
    const fileName = `product-${Date.now()}-${Math.round(Math.random() * 1_000_000)}${safeExt}`;
    callback(null, fileName);
  },
});

const imageUpload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
  fileFilter: (_req, file, callback) => {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

    if (!allowedMimeTypes.includes(file.mimetype)) {
      return callback(new Error('File foto produk harus berupa JPG, PNG, atau WEBP.'));
    }

    return callback(null, true);
  },
});

router.use(authMiddleware);
router.use(businessAccessMiddleware);

router.get(
  '/',
  requireBusinessPermission(BusinessPermissionCode.PRODUCT_VIEW),
  validateListProducts,
  listProductsHandler,
);

router.get(
  '/:id',
  requireBusinessPermission(BusinessPermissionCode.PRODUCT_VIEW),
  validateProductParams,
  getProductDetailHandler,
);

router.post(
  '/',
  requireBusinessPermission(BusinessPermissionCode.PRODUCT_CREATE),
  imageUpload.single('image'),
  validateUploadedImage,
  validateCreateProduct,
  createProductHandler,
);

router.put(
  '/:id',
  requireBusinessPermission(BusinessPermissionCode.PRODUCT_UPDATE),
  imageUpload.single('image'),
  validateUploadedImage,
  validateProductParams,
  validateUpdateProduct,
  updateProductHandler,
);

router.patch(
  '/:id/status',
  requireBusinessPermission(BusinessPermissionCode.PRODUCT_STATUS_UPDATE),
  validateProductParams,
  validateUpdateProductStatus,
  updateProductStatusHandler,
);

export default router;
