'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, ShoppingCart, Heart, User, Menu, X, Bell, Gamepad2, ChevronDown } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';
import api from '@/lib/api';
import { cn } from '@/lib/utils';

export default function Navbar() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { cart, toggleCart } = useCartStore();
  const { user, isAuthenticated, logout } = useAuthStore();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const debounce = setTimeout(async () => {
      if (searchQuery.length >= 2) {
        try {
          const response = await api.get(`/search/suggestions?q=${searchQuery}`) as any;
          setSuggestions(response.data || []);
          setShowSuggestions(true);
        } catch {}
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);
    return () => clearTimeout(debounce);
  }, [searchQuery]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
      setShowSuggestions(false);
    }
  };

  const cartCount = cart?.itemCount || 0;

  const navLinks = [
    { label: 'Mobile & Phones', href: '/products?category=mobile-devices' },
    { label: 'Computers', href: '/products?category=computers-laptops' },
    { label: 'Gaming', href: '/products?category=gaming' },
    { label: 'Audio', href: '/products?category=audio-entertainment' },
    { label: 'Smart Home', href: '/products?category=smart-home' },
    { label: 'Accessories', href: '/products?category=phone-accessories' },
  ];

  return (
    <header className={cn(
      'fixed top-0 left-0 right-0 z-50 transition-all duration-300',
      scrolled ? 'bg-[#1a1a2e] shadow-lg' : 'bg-[#1a1a2e]',
    )}>
      {/* Top banner */}
      <div className="bg-yellow-500 text-black text-center py-1.5 text-xs font-medium px-4">
        <span className="hidden sm:inline">🚚 Free Shipping on orders above ₦50,000 | Use code </span>
        <span className="sm:hidden">Use code </span>
        <strong>BILY10</strong> for 10% off
      </div>

      {/* Main nav */}
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-3 h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <div className="w-9 h-9 bg-yellow-500 rounded-lg flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-black" />
            </div>
            <div className="hidden sm:block">
              <span className="text-white font-bold text-lg leading-none">BILY</span>
              <p className="text-yellow-500 text-[10px] leading-none font-medium tracking-wider">GAMES & GADGET</p>
            </div>
          </Link>

          {/* Search */}
          <div ref={searchRef} className="flex-1 relative">
            <form onSubmit={handleSearch} className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search products..."
                className="w-full bg-white/10 text-white placeholder-gray-400 rounded-full py-2.5 pl-4 pr-10 text-sm border border-white/20 focus:outline-none focus:border-yellow-500 focus:bg-white/15 transition-all"
              />
              <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-yellow-500 transition-colors">
                <Search className="w-4 h-4" />
              </button>
            </form>

            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden z-50">
                {suggestions.map((s) => (
                  <Link
                    key={s.id}
                    href={`/products/${s.slug}`}
                    className="flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors text-sm text-gray-700"
                    onClick={() => setShowSuggestions(false)}
                  >
                    <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    {s.text}
                  </Link>
                ))}
                <Link
                  href={`/products?search=${encodeURIComponent(searchQuery)}`}
                  className="flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 text-yellow-600 text-sm font-medium hover:bg-gray-100 transition-colors border-t border-gray-100"
                  onClick={() => setShowSuggestions(false)}
                >
                  See all results for "{searchQuery}"
                </Link>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {isAuthenticated ? (
              <>
                <Link href="/wishlist" className="hidden sm:flex p-2 text-gray-300 hover:text-yellow-500 transition-colors">
                  <Heart className="w-5 h-5" />
                </Link>

                {/* User dropdown — click-based for touch support */}
                <div ref={userMenuRef} className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen((v) => !v)}
                    className="flex items-center gap-1 p-2 text-gray-300 hover:text-yellow-500 transition-colors"
                    aria-expanded={isUserMenuOpen}
                  >
                    <div className="w-7 h-7 rounded-full bg-yellow-500 flex items-center justify-center">
                      <span className="text-black font-bold text-xs">
                        {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
                      </span>
                    </div>
                    <ChevronDown className={cn('w-3 h-3 transition-transform hidden sm:block', isUserMenuOpen && 'rotate-180')} />
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 w-52 bg-white rounded-xl shadow-xl border border-gray-100 py-2 z-50">
                      <div className="px-4 py-2 border-b border-gray-100">
                        <p className="font-semibold text-gray-900 text-sm">{user?.firstName} {user?.lastName}</p>
                        <p className="text-gray-500 text-xs truncate">{user?.email}</p>
                      </div>
                      {(user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN') && (
                        <Link href="/admin/dashboard" onClick={() => setIsUserMenuOpen(false)} className="flex items-center gap-2 px-4 py-2 text-sm text-yellow-600 hover:bg-yellow-50 font-medium">
                          Admin Dashboard
                        </Link>
                      )}
                      <Link href="/account" onClick={() => setIsUserMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">My Account</Link>
                      <Link href="/account/orders" onClick={() => setIsUserMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">My Orders</Link>
                      <Link href="/wishlist" onClick={() => setIsUserMenuOpen(false)} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Wishlist</Link>
                      <button
                        onClick={() => { logout(); setIsUserMenuOpen(false); }}
                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 border-t border-gray-100 mt-1"
                      >
                        Sign Out
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-300 hover:text-yellow-500 transition-colors"
              >
                <User className="w-4 h-4" />
                <span className="hidden sm:block">Sign In</span>
              </Link>
            )}

            <button
              onClick={toggleCart}
              className="relative p-2 text-gray-300 hover:text-yellow-500 transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 bg-yellow-500 text-black text-[10px] font-bold rounded-full flex items-center justify-center min-w-[18px] h-[18px] px-0.5">
                  {cartCount > 99 ? '99+' : cartCount}
                </span>
              )}
            </button>

            <button
              className="lg:hidden p-2 text-gray-300 hover:text-yellow-500 transition-colors"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Category nav — desktop only */}
        <nav className="hidden lg:flex items-center gap-6 py-2.5 border-t border-white/10">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-gray-300 hover:text-yellow-500 transition-colors whitespace-nowrap font-medium"
            >
              {link.label}
            </Link>
          ))}
          <Link href="/products" className="text-sm text-yellow-500 hover:text-yellow-400 transition-colors font-semibold ml-auto">
            All Products →
          </Link>
        </nav>
      </div>

      {/* Mobile menu */}
      {isMenuOpen && (
        <div className="lg:hidden bg-[#16213e] border-t border-white/10 pb-4">
          <div className="container mx-auto px-4">
            {/* Categories */}
            <div className="py-3 space-y-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="block py-2.5 text-sm text-gray-300 hover:text-yellow-500 transition-colors font-medium border-b border-white/5"
                  onClick={() => setIsMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
              <Link href="/products" className="block py-2.5 text-sm text-yellow-500 font-semibold" onClick={() => setIsMenuOpen(false)}>
                All Products →
              </Link>
            </div>

            {/* Account links for logged-in users on mobile */}
            {isAuthenticated && (
              <div className="border-t border-white/10 pt-3 space-y-1">
                <Link href="/account" className="block py-2.5 text-sm text-gray-300 hover:text-yellow-500 font-medium" onClick={() => setIsMenuOpen(false)}>My Account</Link>
                <Link href="/account/orders" className="block py-2.5 text-sm text-gray-300 hover:text-yellow-500 font-medium" onClick={() => setIsMenuOpen(false)}>My Orders</Link>
                <Link href="/wishlist" className="block py-2.5 text-sm text-gray-300 hover:text-yellow-500 font-medium" onClick={() => setIsMenuOpen(false)}>Wishlist</Link>
                <button onClick={() => { logout(); setIsMenuOpen(false); }} className="block w-full text-left py-2.5 text-sm text-red-400 font-medium">Sign Out</button>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
