import { BusinessType } from '@prisma/client';

type BusinessTypeItem = {
  code: BusinessType;
  name: string;
  description: string;
  rules: string[];
};

export async function listBusinessTypesService(): Promise<BusinessTypeItem[]> {
  return [
    {
      code: BusinessType.RESTAURANT,
      name: 'Restaurant',
      description:
        'Digunakan untuk bisnis makanan dan minuman dengan kebutuhan operasional restoran.',
      rules: [
        'Dipilih saat create business.',
        'Tidak editable bebas setelah business dibuat.',
        'Outlet mengikuti business type dari business induknya.',
      ],
    },
    {
      code: BusinessType.RETAIL,
      name: 'Retail',
      description:
        'Digunakan untuk bisnis penjualan barang seperti toko retail, minimarket, atau toko umum.',
      rules: [
        'Dipilih saat create business.',
        'Tidak editable bebas setelah business dibuat.',
        'Outlet mengikuti business type dari business induknya.',
      ],
    },
  ];
}