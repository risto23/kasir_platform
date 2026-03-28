// pos_api/src/modules/business-product/product.mapper.ts
import { Prisma } from '@prisma/client';

const productWithCategorySelect = Prisma.validator<Prisma.ProductDefaultArgs>()({
  include: {
    category: {
      select: {
        id: true,
        name: true,
        code: true,
      },
    },
  },
});

export type ProductWithCategory = Prisma.ProductGetPayload<
  typeof productWithCategorySelect
>;

export function mapProduct(product: ProductWithCategory) {
  return {
    id: product.id,
    businessId: product.businessId,
    categoryId: product.categoryId,
    name: product.name,
    code: product.code,
    sku: product.sku,
    brand: product.brand,
    unit: product.unit,
    description: product.description,
    imageUrl: product.imageUrl,
    basePrice: Number(product.basePrice),
    status: product.status,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
    category: product.category
      ? {
          id: product.category.id,
          name: product.category.name,
          code: product.category.code,
        }
      : null,
  };
}