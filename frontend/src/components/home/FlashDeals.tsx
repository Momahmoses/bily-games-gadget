'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Zap, ChevronRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Product } from '@/types';
import ProductCard from '@/components/product/ProductCard';

function useCountdown(targetHours = 24) {
  const [time, setTime] = useState({ h: targetHours, m: 0, s: 0 });
  useEffect(() => {
    const timer = setInterval(() => {
      setTime((t) => {
        const total = t.h * 3600 + t.m * 60 + t.s - 1;
        if (total <= 0) return { h: targetHours, m: 0, s: 0 };
        return { h: Math.floor(total / 3600), m: Math.floor((total % 3600) / 60), s: total % 60 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [targetHours]);
  return time;
}

export default function FlashDeals() {
  const time = useCountdown(12);
  const { data } = useQuery({
    queryKey: ['products', 'sale'],
    queryFn: () => api.get('/products?sortBy=popular&limit=4') as Promise<any>,
  });
  const products: Product[] = data?.data || [];

  if (!products.length) return null;

  return (
    <section className="py-14 bg-[#1a1a2e]">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-500 rounded-xl flex items-center justify-center">
              <Zap className="w-5 h-5 text-black fill-black" />
            </div>
            <div>
              <h2 className="text-2xl font-extrabold text-white">Flash Deals</h2>
              <p className="text-gray-400 text-xs">Limited time offers</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm">Ends in:</span>
            <div className="flex items-center gap-1">
              {[
                { v: time.h, l: 'h' },
                { v: time.m, l: 'm' },
                { v: time.s, l: 's' },
              ].map(({ v, l }, i) => (
                <div key={l} className="flex items-center gap-1">
                  <span className="bg-yellow-500 text-black font-mono font-bold text-lg w-10 h-10 rounded-lg flex items-center justify-center">
                    {String(v).padStart(2, '0')}
                  </span>
                  {i < 2 && <span className="text-yellow-500 font-bold">:</span>}
                </div>
              ))}
            </div>
            <Link
              href="/products?sortBy=popular"
              className="flex items-center gap-1 text-yellow-500 hover:text-yellow-400 font-semibold text-sm ml-4"
            >
              View All <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
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
