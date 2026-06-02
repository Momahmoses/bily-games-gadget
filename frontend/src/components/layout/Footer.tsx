import Link from 'next/link';
import { Gamepad2, Facebook, Twitter, Instagram, Youtube, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  const categories = [
    { name: 'Smartphones', href: '/products?category=smartphones' },
    { name: 'Laptops', href: '/products?category=laptops' },
    { name: 'Gaming Consoles', href: '/products?category=gaming-consoles' },
    { name: 'Headphones', href: '/products?category=earphones-headsets' },
    { name: 'Smart Watches', href: '/products?category=smartwatches' },
    { name: 'Cameras', href: '/products?category=cameras-photography' },
    { name: 'Smart Home', href: '/products?category=smart-home' },
    { name: 'Accessories', href: '/products?category=phone-accessories' },
  ];

  const quickLinks = [
    { name: 'About Us', href: '/about' },
    { name: 'Contact Us', href: '/contact' },
    { name: 'Track Order', href: '/track-order' },
    { name: 'Return Policy', href: '/return-policy' },
    { name: 'Privacy Policy', href: '/privacy-policy' },
    { name: 'Terms of Service', href: '/terms' },
    { name: 'FAQ', href: '/faq' },
    { name: 'Careers', href: '/careers' },
  ];

  return (
    <footer className="bg-[#1a1a2e] text-gray-300">
      {/* Newsletter */}
      <div className="bg-yellow-500 py-10">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-2xl font-bold text-black">Stay in the Loop!</h3>
            <p className="text-black/70 mt-1">Get exclusive deals, new arrivals & tech news straight to your inbox.</p>
          </div>
          <form className="flex gap-2 w-full md:w-auto">
            <input
              type="email"
              placeholder="Enter your email address"
              className="flex-1 md:w-72 px-4 py-3 rounded-lg text-gray-900 text-sm focus:outline-none focus:ring-2 focus:ring-black"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-[#1a1a2e] text-white rounded-lg font-semibold text-sm hover:bg-[#16213e] transition-colors whitespace-nowrap"
            >
              Subscribe
            </button>
          </form>
        </div>
      </div>

      {/* Main footer */}
      <div className="container mx-auto px-4 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
                <Gamepad2 className="w-6 h-6 text-black" />
              </div>
              <div>
                <span className="text-white font-bold text-xl leading-none">BILY</span>
                <p className="text-yellow-500 text-xs leading-none font-medium tracking-wider">GAMES & GADGET</p>
              </div>
            </Link>
            <p className="text-gray-400 text-sm leading-relaxed mb-5">
              Your premium destination for the latest tech, gaming gear, and digital accessories in Nigeria. Quality products, competitive prices, fast delivery.
            </p>
            <div className="flex gap-3">
              {[
                { icon: Facebook, href: '#' },
                { icon: Twitter, href: '#' },
                { icon: Instagram, href: '#' },
                { icon: Youtube, href: '#' },
              ].map(({ icon: Icon, href }, i) => (
                <a
                  key={i}
                  href={href}
                  className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center hover:bg-yellow-500 hover:text-black transition-all"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          {/* Categories */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-base">Shop Categories</h4>
            <ul className="space-y-2.5">
              {categories.map((cat) => (
                <li key={cat.href}>
                  <Link href={cat.href} className="text-gray-400 hover:text-yellow-500 transition-colors text-sm flex items-center gap-1.5 group">
                    <span className="w-1 h-1 rounded-full bg-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {cat.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Quick links */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-base">Quick Links</h4>
            <ul className="space-y-2.5">
              {quickLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-gray-400 hover:text-yellow-500 transition-colors text-sm flex items-center gap-1.5 group">
                    <span className="w-1 h-1 rounded-full bg-yellow-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="text-white font-semibold mb-4 text-base">Contact Us</h4>
            <ul className="space-y-4">
              <li className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-yellow-500 shrink-0 mt-0.5" />
                <span className="text-gray-400 text-sm">Lagos State, Nigeria</span>
              </li>
              <li className="flex items-center gap-3">
                <Phone className="w-4 h-4 text-yellow-500 shrink-0" />
                <a href="tel:+2348000000000" className="text-gray-400 hover:text-yellow-500 transition-colors text-sm">+234 800 000 0000</a>
              </li>
              <li className="flex items-center gap-3">
                <Mail className="w-4 h-4 text-yellow-500 shrink-0" />
                <a href="mailto:support@bilygamesgadget.com" className="text-gray-400 hover:text-yellow-500 transition-colors text-sm">support@bilygamesgadget.com</a>
              </li>
            </ul>

            <div className="mt-6">
              <p className="text-gray-400 text-xs mb-3">Secure Payments</p>
              <div className="flex flex-wrap gap-2">
                {['Paystack', 'Flutterwave', 'Bank Transfer'].map((p) => (
                  <span key={p} className="px-2.5 py-1 bg-white/10 rounded text-xs text-gray-300 font-medium">{p}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-white/10">
        <div className="container mx-auto px-4 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-gray-500 text-xs">
            © {new Date().getFullYear()} Bily Games and Gadget. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <Link href="/privacy-policy" className="text-gray-500 hover:text-yellow-500 transition-colors text-xs">Privacy</Link>
            <Link href="/terms" className="text-gray-500 hover:text-yellow-500 transition-colors text-xs">Terms</Link>
            <Link href="/sitemap" className="text-gray-500 hover:text-yellow-500 transition-colors text-xs">Sitemap</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
