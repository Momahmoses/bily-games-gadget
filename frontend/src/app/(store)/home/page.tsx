import { Suspense } from 'react';
import HeroSection from '@/components/home/HeroSection';
import CategoryGrid from '@/components/home/CategoryGrid';
import FeaturedProducts from '@/components/home/FeaturedProducts';
import PromoSection from '@/components/home/PromoSection';
import BrandShowcase from '@/components/home/BrandShowcase';
import FlashDeals from '@/components/home/FlashDeals';
import Testimonials from '@/components/home/Testimonials';
import ProductSkeleton from '@/components/shared/ProductSkeleton';

export const metadata = {
  title: 'Bily Games and Gadget | Premium Tech & Gaming Store Nigeria',
};

export default function HomePage() {
  return (
    <div>
      <HeroSection />
      <CategoryGrid />
      <Suspense fallback={<ProductSkeleton />}>
        <FeaturedProducts />
      </Suspense>
      <PromoSection />
      <Suspense fallback={<ProductSkeleton />}>
        <FlashDeals />
      </Suspense>
      <BrandShowcase />
      <Testimonials />
    </div>
  );
}
