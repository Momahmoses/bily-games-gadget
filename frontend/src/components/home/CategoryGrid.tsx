'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Category } from '@/types';
import { Smartphone, Laptop, Gamepad2, Headphones, Watch, Camera, Home, Plug, ChevronRight } from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  '📱': <Smartphone className="w-6 h-6" />,
  '💻': <Laptop className="w-6 h-6" />,
  '🎮': <Gamepad2 className="w-6 h-6" />,
  '🎧': <Headphones className="w-6 h-6" />,
  '⌚': <Watch className="w-6 h-6" />,
  '📷': <Camera className="w-6 h-6" />,
  '🏠': <Home className="w-6 h-6" />,
  '🔋': <Plug className="w-6 h-6" />,
  '🔌': <Plug className="w-6 h-6" />,
};

const colorMap = [
  'from-blue-500 to-blue-700',
  'from-purple-500 to-purple-700',
  'from-green-500 to-green-700',
  'from-red-500 to-red-700',
  'from-yellow-500 to-yellow-700',
  'from-indigo-500 to-indigo-700',
  'from-pink-500 to-pink-700',
  'from-cyan-500 to-cyan-700',
  'from-orange-500 to-orange-700',
];

export default function CategoryGrid() {
  const { data } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories') as Promise<any>,
    staleTime: 10 * 60 * 1000,
  });

  const categories: Category[] = data?.data?.slice(0, 9) || [];

  return (
    <section className="py-14 bg-white">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-extrabold text-gray-900">Shop by Category</h2>
            <p className="text-gray-500 mt-1 text-sm">Find exactly what you're looking for</p>
          </div>
          <Link
            href="/products"
            className="flex items-center gap-1 text-yellow-600 hover:text-yellow-700 font-semibold text-sm transition-colors"
          >
            All Categories <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-9 gap-3">
          {categories.map((cat, i) => (
            <Link
              key={cat.id}
              href={`/products?category=${cat.slug}`}
              className="group flex flex-col items-center gap-2 p-3"
            >
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${colorMap[i % colorMap.length]} flex items-center justify-center text-white shadow-md group-hover:scale-110 group-hover:shadow-lg transition-all duration-200`}>
                {iconMap[cat.icon || ''] || <span className="text-2xl">{cat.icon}</span>}
              </div>
              <span className="text-xs font-medium text-gray-700 text-center leading-tight group-hover:text-yellow-600 transition-colors">
                {cat.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
