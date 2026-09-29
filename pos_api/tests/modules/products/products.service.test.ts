import { BusinessType, Prisma, ProductStatus, PromoDiscountType, PromoOutletScope, PromoStatus, PromoTargetType } from '@prisma/client';
import {
  createProduct,
  getProductDetail,
  listProducts,
  updateProduct,
  updateProductStatus,
} from '../../../src/modules/products/products.service';

jest.mock('../../../src/config/prisma', () => ({
  prisma: {
    businessSubscription: {
      findFirst: jest.fn(),
    },
    business: {
      findFirst: jest.fn(),
    },
    product: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    category: {
      findFirst: jest.fn(),
    },
    outlet: {
      findFirst: jest.fn(),
    },
    promo: {
      findMany: jest.fn(),
    },
    productOutletSetting: {
      findMany: jest.fn(),
    },
  },
}));

type ProductsPrismaMock = {
  prisma: {
    businessSubscription: {
      findFirst: jest.Mock;
    };
    business: {
      findFirst: jest.Mock;
    };
    product: {
      findFirst: jest.Mock;
      findMany: jest.Mock;
      count: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    category: {
      findFirst: jest.Mock;
    };
    outlet: {
      findFirst: jest.Mock;
    };
    promo: {
      findMany: jest.Mock;
    };
    productOutletSetting: {
      findMany: jest.Mock;
    };
  };
};

describe('products.service', () => {
  const prismaMock = jest.requireMock('../../../src/config/prisma') as ProductsPrismaMock;

  beforeEach(() => {
    jest.resetAllMocks();
    prismaMock.prisma.businessSubscription.findFirst.mockResolvedValue({
      id: 'sub-1',
      status: 'ACTIVE',
      plan: {
        id: 'plan-1',
        code: 'BASIC',
        name: 'Basic',
        maxOutlets: 2,
        maxUsers: 10,
        maxProducts: 500,
        maxMonthlyTransactions: 1000,
      },
    });
    prismaMock.prisma.product.count.mockResolvedValue(0);
    prismaMock.prisma.productOutletSetting.findMany.mockResolvedValue([]);
  });

  it('rejects when category or outlet does not belong to business', async () => {
    prismaMock.prisma.category.findFirst.mockResolvedValueOnce(null);

    await expect(
      listProducts('biz-1', {
        categoryId: 'cat-1',
        page: 1,
        perPage: 10,
      }),
    ).rejects.toThrow('Kategori tidak ditemukan pada business ini.');

    prismaMock.prisma.outlet.findFirst.mockResolvedValueOnce(null);

    await expect(
      listProducts('biz-1', {
        outletId: 'outlet-1',
        page: 1,
        perPage: 10,
      }),
    ).rejects.toThrow('Outlet tidak ditemukan pada business ini.');
  });

  it('lists products and stacks all active regular promos', async () => {
    prismaMock.prisma.outlet.findFirst.mockResolvedValueOnce({ id: 'outlet-1' });
    prismaMock.prisma.product.findMany.mockResolvedValueOnce([
      {
        id: 'product-1',
        businessId: 'biz-1',
        categoryId: 'cat-1',
        name: 'Fried Rice',
        code: 'PRD-1',
        sku: 'SKU-1',
        barcode: 'BC-1',
        brand: 'House Brand',
        unit: 'plate',
        description: 'Best seller',
        imageUrl: null,
        basePrice: new Prisma.Decimal(100),
        status: ProductStatus.ACTIVE,
        category: { id: 'cat-1', name: 'Main Course' },
      },
    ]);
    prismaMock.prisma.product.count.mockResolvedValueOnce(1);
    prismaMock.prisma.promo.findMany.mockResolvedValueOnce([
      {
        id: 'promo-1',
        name: 'Brand Discount',
        targetType: PromoTargetType.BRAND,
        categoryId: null,
        productId: null,
        targetTextValue: 'House Brand',
        discountType: PromoDiscountType.FIXED,
        discountValue: new Prisma.Decimal(20),
        startDate: new Date('2000-01-01T00:00:00.000Z'),
        endDate: new Date('2099-12-31T00:00:00.000Z'),
        startTime: '00:00',
        endTime: '23:59',
        status: PromoStatus.ACTIVE,
        outletScope: PromoOutletScope.ALL_OUTLETS,
        promoOutlets: [],
      },
      {
        id: 'promo-2',
        name: 'Product Discount',
        targetType: PromoTargetType.PRODUCT,
        categoryId: null,
        productId: 'product-1',
        targetTextValue: null,
        discountType: PromoDiscountType.PERCENTAGE,
        discountValue: new Prisma.Decimal(10),
        startDate: new Date('2000-01-01T00:00:00.000Z'),
        endDate: new Date('2099-12-31T00:00:00.000Z'),
        startTime: '00:00',
        endTime: '23:59',
        status: PromoStatus.ACTIVE,
        outletScope: PromoOutletScope.ALL_OUTLETS,
        promoOutlets: [],
      },
    ]);

    const result = await listProducts('biz-1', {
      outletId: 'outlet-1',
      search: '  fried  ',
      page: 1,
      perPage: 10,
    });

    expect(prismaMock.prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: expect.any(Array),
        }),
      }),
    );
    // Brand fixed 20 + product 10% of 100 = 30 stacked; representative label is
    // the largest single promo (Brand Discount, 20).
    expect(result.items[0]?.promoDiscountAmount).toBe(30);
    expect(result.items[0]?.effectivePrice).toBe(70);
    expect(result.items[0]?.appliedPromo?.name).toBe('Brand Discount');
  });

  it('prices outlet listing with priceOverride and hides unavailable products', async () => {
    prismaMock.prisma.outlet.findFirst.mockResolvedValueOnce({ id: 'outlet-2' });
    prismaMock.prisma.product.findMany.mockResolvedValueOnce([
      {
        id: 'product-1',
        businessId: 'biz-1',
        categoryId: null,
        name: 'QA Ayam Bakar',
        code: 'MENU-1',
        sku: null,
        barcode: null,
        brand: null,
        unit: null,
        description: null,
        imageUrl: null,
        basePrice: new Prisma.Decimal(35000),
        status: ProductStatus.ACTIVE,
        category: null,
      },
    ]);
    prismaMock.prisma.product.count.mockResolvedValueOnce(1);
    prismaMock.prisma.promo.findMany.mockResolvedValueOnce([
      {
        id: 'promo-1',
        name: 'Ayam 10%',
        targetType: PromoTargetType.PRODUCT,
        categoryId: null,
        productId: 'product-1',
        targetTextValue: null,
        discountType: PromoDiscountType.PERCENTAGE,
        discountValue: new Prisma.Decimal(10),
        startDate: new Date('2000-01-01T00:00:00.000Z'),
        endDate: new Date('2099-12-31T00:00:00.000Z'),
        startTime: '00:00',
        endTime: '23:59',
        status: PromoStatus.ACTIVE,
        outletScope: PromoOutletScope.ALL_OUTLETS,
        promoOutlets: [],
      },
    ]);
    prismaMock.prisma.productOutletSetting.findMany.mockResolvedValueOnce([
      { productId: 'product-1', priceOverride: new Prisma.Decimal(40000) },
    ]);

    const result = await listProducts('biz-1', {
      outletId: 'outlet-2',
      page: 1,
      perPage: 10,
    });

    expect(prismaMock.prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          NOT: {
            productOutletSettings: {
              some: expect.objectContaining({ outletId: 'outlet-2' }),
            },
          },
        }),
      }),
    );
    // Master price stays visible; outlet price and promo use the override.
    expect(result.items[0]?.basePrice).toBe(35000);
    expect(result.items[0]?.outletPrice).toBe(40000);
    expect(result.items[0]?.promoDiscountAmount).toBe(4000);
    expect(result.items[0]?.effectivePrice).toBe(36000);
  });

  it('does not filter by outlet availability when no outletId is given', async () => {
    prismaMock.prisma.product.findMany.mockResolvedValueOnce([]);
    prismaMock.prisma.promo.findMany.mockResolvedValueOnce([]);

    await listProducts('biz-1', { page: 1, perPage: 10 });

    const call = prismaMock.prisma.product.findMany.mock.calls[0]?.[0] as {
      where: Record<string, unknown>;
    };
    expect(call.where.NOT).toBeUndefined();
    expect(prismaMock.prisma.productOutletSetting.findMany).not.toHaveBeenCalled();
  });

  it('returns product detail or throws when product is missing', async () => {
    prismaMock.prisma.product.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'product-1',
        businessId: 'biz-1',
        category: null,
      });

    await expect(
      getProductDetail('biz-1', { id: 'product-404' }),
    ).rejects.toThrow('Product tidak ditemukan.');

    const result = await getProductDetail('biz-1', { id: 'product-1' });

    expect(result).toEqual({
      id: 'product-1',
      businessId: 'biz-1',
      category: null,
    });
  });

  it('creates product with generated code and normalized values', async () => {
    prismaMock.prisma.business.findFirst.mockResolvedValueOnce({
      id: 'biz-1',
      businessType: BusinessType.RETAIL,
    });
    prismaMock.prisma.product.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null);
    prismaMock.prisma.product.create.mockResolvedValueOnce({
      id: 'product-1',
      code: 'PRD-MY-PRODUCT-001',
    });

    const result = await createProduct('biz-1', {
      name: '  My Product  ',
      categoryId: null,
      sku: ' sku-1 ',
      barcode: ' bar-1 ',
      brand: ' Brand ',
      unit: ' pcs ',
      description: '  desc ',
      imageUrl: '  /img.jpg ',
      basePrice: 5000,
    });

    expect(prismaMock.prisma.product.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          code: 'PRD-MY-PRODUCT-001',
          sku: 'SKU-1',
          barcode: 'BAR-1',
          brand: 'Brand',
          unit: 'pcs',
          description: 'desc',
          imageUrl: '/img.jpg',
        }),
      }),
    );
    expect(result).toEqual({
      id: 'product-1',
      code: 'PRD-MY-PRODUCT-001',
    });
  });

  it('rejects duplicate product name during create', async () => {
    prismaMock.prisma.business.findFirst.mockResolvedValueOnce({
      id: 'biz-1',
      businessType: BusinessType.RESTAURANT,
    });
    prismaMock.prisma.product.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'exists' });

    await expect(
      createProduct('biz-1', {
        name: 'Menu A',
        categoryId: null,
        sku: null,
        barcode: null,
        brand: null,
        unit: null,
        description: null,
        imageUrl: null,
        basePrice: 1000,
      }),
    ).rejects.toThrow('Nama product sudah digunakan di business ini.');
  });

  it('blocks create product when product limit is reached', async () => {
    prismaMock.prisma.businessSubscription.findFirst.mockResolvedValueOnce({
      id: 'sub-1',
      status: 'ACTIVE',
      plan: {
        id: 'plan-1',
        code: 'BASIC',
        name: 'Basic',
        maxOutlets: 2,
        maxUsers: 10,
        maxProducts: 2,
        maxMonthlyTransactions: 1000,
      },
    });
    prismaMock.prisma.product.count.mockResolvedValueOnce(2);

    await expect(
      createProduct('biz-1', {
        name: 'Menu Baru',
        categoryId: null,
        sku: null,
        barcode: null,
        brand: null,
        unit: null,
        description: null,
        imageUrl: null,
        basePrice: 1000,
      }),
    ).rejects.toMatchObject({
      statusCode: 403,
      errors: {
        blockedAction: 'CREATE_PRODUCT',
        limit: 2,
        usage: 2,
      },
    });
  });

  it('updates product and status with normalized values', async () => {
    prismaMock.prisma.product.findFirst
      .mockResolvedValueOnce({
        id: 'product-1',
        businessId: 'biz-1',
        category: null,
      })
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'product-1',
        businessId: 'biz-1',
        category: null,
      });
    prismaMock.prisma.product.update
      .mockResolvedValueOnce({ id: 'product-1', name: 'Updated Product' })
      .mockResolvedValueOnce({ id: 'product-1', status: ProductStatus.INACTIVE });

    const updated = await updateProduct(
      'biz-1',
      { id: 'product-1' },
      {
        name: '  Updated Product ',
        categoryId: null,
        sku: ' sku-2 ',
        barcode: ' bar-2 ',
        brand: ' Brand 2 ',
        unit: ' box ',
        description: ' desc 2 ',
        imageUrl: ' /img-2.jpg ',
        basePrice: 7000,
      },
    );

    const statusUpdated = await updateProductStatus(
      'biz-1',
      { id: 'product-1' },
      { status: ProductStatus.INACTIVE },
    );

    expect(prismaMock.prisma.product.update).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          name: 'Updated Product',
          sku: 'SKU-2',
          barcode: 'BAR-2',
          brand: 'Brand 2',
          unit: 'box',
          description: 'desc 2',
          imageUrl: '/img-2.jpg',
        }),
      }),
    );
    expect(updated).toEqual({ id: 'product-1', name: 'Updated Product' });
    expect(statusUpdated).toEqual({ id: 'product-1', status: ProductStatus.INACTIVE });
  });

  it('blocks re-activating product when product limit is reached', async () => {
    prismaMock.prisma.product.findFirst.mockResolvedValueOnce({
      id: 'product-1',
      businessId: 'biz-1',
      status: ProductStatus.INACTIVE,
      category: null,
    });
    prismaMock.prisma.businessSubscription.findFirst.mockResolvedValueOnce({
      id: 'sub-1',
      status: 'SUSPENDED',
      plan: {
        id: 'plan-1',
        code: 'BASIC',
        name: 'Basic',
        maxOutlets: 2,
        maxUsers: 10,
        maxProducts: 2,
        maxMonthlyTransactions: 1000,
      },
    });
    prismaMock.prisma.product.count.mockResolvedValueOnce(2);

    await expect(
      updateProductStatus('biz-1', { id: 'product-1' }, { status: ProductStatus.ACTIVE }),
    ).rejects.toMatchObject({
      statusCode: 403,
      errors: {
        blockedAction: 'ACTIVATE_PRODUCT',
        limit: 2,
        usage: 2,
      },
    });
  });
});
