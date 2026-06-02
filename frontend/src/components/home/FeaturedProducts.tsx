'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Product } from '@/types';
import ProductCard from '@/components/product/ProductCard';

export default function FeaturedProducts() {
  const { data } = useQuery({
    queryKey: ['featured-products'],
    queryFn: () => api.get('/products/featured?limit=8') as Promise<any>,
  });

  const products: Product[] = data?.data || [];

  if (!products.length) return null;

  return (
    <section className="py-14 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900">Featured Products</h2>
            <p className="text-gray-500 mt-1 text-sm">Handpicked premium picks for you</p>
          </div>
          <Link
            href="/products?isFeatured=true"
            className="flex items-center gap-1 text-yellow-600 hover:text-yellow-700 font-semibold text-sm transition-colors"
          >
            View All <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </section>
  );
}
