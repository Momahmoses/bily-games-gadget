'use client';

import { useQuery } from '@tanstack/react-query';
import Link from 'next/link';
import api from '@/lib/api';
import { Brand } from '@/types';

export default function BrandShowcase() {
  const { data } = useQuery({
    queryKey: ['brands'],
    queryFn: () => api.get('/products?limit=1') as Promise<any>,
    staleTime: 10 * 60 * 1000,
  });

  const brands = [
    { name: 'Apple', slug: 'apple' },
    { name: 'Samsung', slug: 'samsung' },
    { name: 'Sony', slug: 'sony' },
    { name: 'Microsoft', slug: 'microsoft' },
    { name: 'Xiaomi', slug: 'xiaomi' },
    { name: 'Tecno', slug: 'tecno' },
    { name: 'HP', slug: 'hp' },
    { name: 'Dell', slug: 'dell' },
    { name: 'Anker', slug: 'anker' },
    { name: 'JBL', slug: 'jbl' },
  ];

  return (
    <section className="py-14 bg-white border-t border-gray-100">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-extrabold text-gray-900">Top Brands</h2>
          <p className="text-gray-500 mt-1 text-sm">Shop from world-renowned brands</p>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-4">
          {brands.map((brand) => (
            <Link
              key={brand.slug}
              href={`/products?brand=${brand.slug}`}
              className="px-6 py-3 bg-gray-50 hover:bg-yellow-50 border border-gray-200 hover:border-yellow-300 rounded-xl font-semibold text-gray-700 hover:text-yellow-700 transition-all text-sm"
            >
              {brand.name}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
