import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export default function PromoSection() {
  return (
    <section className="py-14 bg-white">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-6">
          <div
            className="relative rounded-2xl overflow-hidden p-10 flex flex-col justify-end min-h-[220px]"
            style={{ background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 60%, #0f3460 100%)' }}
          >
            <div className="absolute top-6 right-6 text-6xl opacity-20">🎮</div>
            <p className="text-yellow-500 font-semibold text-sm mb-1">GAMING WEEK</p>
            <h3 className="text-white font-extrabold text-2xl mb-2">Up to 40% OFF</h3>
            <p className="text-gray-400 text-sm mb-4">PlayStation, Xbox & Nintendo Switch deals</p>
            <Link
              href="/products?category=gaming"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-yellow-500 text-black font-bold rounded-xl text-sm hover:bg-yellow-400 transition-colors self-start"
            >
              Shop Gaming <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div
            className="relative rounded-2xl overflow-hidden p-10 flex flex-col justify-end min-h-[220px]"
            style={{ background: 'linear-gradient(135deg, #1e3a5f 0%, #0f2444 100%)' }}
          >
            <div className="absolute top-6 right-6 text-6xl opacity-20">📱</div>
            <p className="text-green-400 font-semibold text-sm mb-1">NEW ARRIVALS</p>
            <h3 className="text-white font-extrabold text-2xl mb-2">Latest Smartphones</h3>
            <p className="text-gray-400 text-sm mb-4">iPhone 16, Samsung S25, Pixel 9 & more</p>
            <Link
              href="/products?category=smartphones"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-green-500 text-white font-bold rounded-xl text-sm hover:bg-green-400 transition-colors self-start"
            >
              Explore Now <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
