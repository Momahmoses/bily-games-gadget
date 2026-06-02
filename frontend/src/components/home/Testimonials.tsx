import { Star } from 'lucide-react';

const testimonials = [
  {
    name: 'Chidinma Okafor',
    location: 'Lagos, Nigeria',
    rating: 5,
    text: "Ordered a PS5 and it arrived same day in perfect condition. The packaging was amazing and the price was the best I found anywhere online. Definitely my go-to store!",
    product: 'PlayStation 5',
    avatar: 'CO',
  },
  {
    name: 'Emeka Eze',
    location: 'Abuja, FCT',
    rating: 5,
    text: "Got my iPhone 15 Pro Max from here. Came sealed, with all accessories. Customer service helped me track it in real time. Super satisfied!",
    product: 'iPhone 15 Pro Max',
    avatar: 'EE',
  },
  {
    name: 'Fatima Abdullahi',
    location: 'Kano, Nigeria',
    rating: 5,
    text: "The Samsung Galaxy S25 arrived faster than expected. Competitive prices and excellent after-sales support. Will order again!",
    product: 'Samsung Galaxy S25',
    avatar: 'FA',
  },
  {
    name: 'David Okonkwo',
    location: 'Port Harcourt',
    rating: 5,
    text: "Bought gaming PC components — RAM, SSD, and GPU. All genuine, sealed. The prices beat every other store. Absolutely world-class experience!",
    product: 'PC Components',
    avatar: 'DO',
  },
];

export default function Testimonials() {
  return (
    <section className="py-14 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-extrabold text-gray-900">What Our Customers Say</h2>
          <p className="text-gray-500 mt-1 text-sm">Thousands of happy customers across Nigeria</p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {testimonials.map((t, i) => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-gray-100 hover:shadow-md transition-shadow">
              <div className="flex gap-0.5 mb-3">
                {[...Array(t.rating)].map((_, j) => (
                  <Star key={j} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                ))}
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-4 line-clamp-3">"{t.text}"</p>
              <div className="flex items-center gap-3 border-t border-gray-100 pt-4">
                <div className="w-9 h-9 rounded-full bg-[#1a1a2e] text-yellow-500 flex items-center justify-center font-bold text-xs shrink-0">
                  {t.avatar}
                </div>
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                  <p className="text-xs text-gray-500">{t.location}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
