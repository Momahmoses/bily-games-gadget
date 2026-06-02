'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowRight, ChevronLeft, ChevronRight, Zap, Shield, Truck } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { Banner } from '@/types';
import { cn } from '@/lib/utils';

export default function HeroSection() {
  const [current, setCurrent] = useState(0);
  const { data: bannersData } = useQuery({
    queryKey: ['banners'],
    queryFn: () => api.get('/banners/active') as Promise<any>,
    staleTime: 5 * 60 * 1000,
  });

  const banners: Banner[] = bannersData?.data || [
    {
      id: '1',
      title: 'Next-Gen Gaming Awaits',
      subtitle: 'PS5, Xbox Series X & Nintendo Switch — Find your perfect console',
      image: 'https://placehold.co/1920x600/1a1a2e/F59E0B?text=BILY+GAMES+%26+GADGET',
      link: '/products?category=gaming-consoles',
      badge: 'NEW ARRIVALS',
      isActive: true,
    },
    {
      id: '2',
      title: 'Flagship Smartphones',
      subtitle: 'Latest iPhones, Samsung Galaxy & more at unbeatable prices',
      image: 'https://placehold.co/1920x600/16213e/F59E0B?text=Latest+Smartphones',
      link: '/products?category=smartphones',
      badge: 'HOT DEALS',
      isActive: true,
    },
    {
      id: '3',
      title: 'Pro Gaming Setup',
      subtitle: 'Complete your battle station with premium gaming gear',
      image: 'https://placehold.co/1920x600/0f3460/F59E0B?text=Pro+Gaming+Setup',
      link: '/products?category=gaming',
      badge: 'TRENDING',
      isActive: true,
    },
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [banners.length]);

  const prev = () => setCurrent((c) => (c - 1 + banners.length) % banners.length);
  const next = () => setCurrent((c) => (c + 1) % banners.length);

  const activeBanner = banners[current];

  return (
    <section>
      {/* Hero slider */}
      <div className="relative h-[420px] md:h-[520px] overflow-hidden">
        {banners.map((banner, i) => (
          <div
            key={banner.id}
            className={cn(
              'absolute inset-0 transition-all duration-700',
              i === current ? 'opacity-100 translate-x-0' : i < current ? 'opacity-0 -translate-x-full' : 'opacity-0 translate-x-full',
            )}
          >
            <Image
              src={banner.image}
              alt={banner.title}
              fill
              className="object-cover"
              priority={i === 0}
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a2e]/90 via-[#1a1a2e]/60 to-transparent" />
          </div>
        ))}

        <div className="relative z-10 container mx-auto px-4 h-full flex items-center">
          <div className="max-w-lg">
            {activeBanner?.badge && (
              <span className="inline-block px-3 py-1 bg-yellow-500 text-black text-xs font-bold rounded-full mb-4 animate-fade-in">
                {activeBanner.badge}
              </span>
            )}
            <h1 className="text-4xl md:text-5xl font-extrabold text-white leading-tight mb-4 animate-fade-in">
              {activeBanner?.title}
            </h1>
            <p className="text-gray-300 text-lg mb-8 leading-relaxed animate-fade-in">
              {activeBanner?.subtitle}
            </p>
            <div className="flex items-center gap-4 animate-fade-in">
              <Link
                href={activeBanner?.link || '/products'}
                className="inline-flex items-center gap-2 px-8 py-3.5 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition-all hover:gap-3"
              >
                Shop Now
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/products"
                className="inline-flex items-center gap-2 px-6 py-3.5 border-2 border-white/30 text-white font-semibold rounded-xl hover:border-yellow-500 hover:text-yellow-500 transition-all text-sm"
              >
                View All Products
              </Link>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <button
          onClick={prev}
          className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-all"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <button
          onClick={next}
          className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-10 h-10 bg-black/40 hover:bg-black/60 text-white rounded-full flex items-center justify-center transition-all"
        >
          <ChevronRight className="w-5 h-5" />
        </button>

        {/* Dots */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 flex gap-2">
          {banners.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={cn(
                'rounded-full transition-all',
                i === current ? 'w-6 h-2 bg-yellow-500' : 'w-2 h-2 bg-white/50',
              )}
            />
          ))}
        </div>
      </div>

      {/* Trust badges */}
      <div className="bg-[#1a1a2e] border-t border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { icon: Truck, title: 'Free Delivery', desc: 'On orders above ₦50,000' },
              { icon: Shield, title: 'Genuine Products', desc: '100% authentic gadgets' },
              { icon: Zap, title: 'Fast Shipping', desc: 'Same day Lagos delivery' },
            ].map(({ icon: Icon, title, desc }) => (
              <div key={title} className="flex items-center gap-3 text-white px-2">
                <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-yellow-500" />
                </div>
                <div>
                  <p className="font-semibold text-sm">{title}</p>
                  <p className="text-gray-400 text-xs">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
