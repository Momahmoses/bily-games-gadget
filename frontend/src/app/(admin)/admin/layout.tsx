'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Package, ShoppingBag, Users, BarChart3,
  Tag, Settings, Bell, Gamepad2, LogOut, Image as ImageIcon,
  MessageSquare, Warehouse, Percent,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Products', href: '/admin/products', icon: Package },
  { label: 'Orders', href: '/admin/orders', icon: ShoppingBag },
  { label: 'Customers', href: '/admin/customers', icon: Users },
  { label: 'Inventory', href: '/admin/inventory', icon: Warehouse },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { label: 'Coupons', href: '/admin/coupons', icon: Percent },
  { label: 'Banners', href: '/admin/banners', icon: ImageIcon },
  { label: 'Support', href: '/admin/support', icon: MessageSquare },
  { label: 'Settings', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, isAuthenticated, logout } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !['ADMIN', 'SUPER_ADMIN'].includes(user?.role || '')) {
      router.push('/login');
    }
  }, [isAuthenticated, user, router]);

  if (!isAuthenticated || !['ADMIN', 'SUPER_ADMIN'].includes(user?.role || '')) return null;

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-[#1a1a2e] text-white flex flex-col fixed top-0 bottom-0 left-0 z-40">
        {/* Logo */}
        <div className="p-5 border-b border-white/10">
          <Link href="/admin/dashboard" className="flex items-center gap-2">
            <div className="w-9 h-9 bg-yellow-500 rounded-lg flex items-center justify-center">
              <Gamepad2 className="w-5 h-5 text-black" />
            </div>
            <div>
              <p className="text-white font-bold text-sm leading-none">BILY ADMIN</p>
              <p className="text-yellow-500 text-[10px] font-medium tracking-wider">Control Panel</p>
            </div>
          </Link>
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  isActive ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:bg-white/10 hover:text-white',
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-full bg-yellow-500 flex items-center justify-center font-bold text-black text-sm shrink-0">
              {user?.firstName?.charAt(0)}{user?.lastName?.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-white text-sm font-semibold truncate">{user?.firstName} {user?.lastName}</p>
              <p className="text-gray-400 text-xs truncate">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={() => logout().then(() => router.push('/login'))}
            className="w-full flex items-center gap-2 px-3 py-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 ml-64">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-30">
          <div className="text-sm text-gray-500">
            Welcome back, <span className="font-semibold text-gray-900">{user?.firstName}</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/home" className="text-sm text-gray-500 hover:text-gray-700 transition-colors">
              ← Back to Store
            </Link>
            <button className="relative p-2 text-gray-500 hover:text-gray-700">
              <Bell className="w-5 h-5" />
            </button>
          </div>
        </header>

        <main className="p-6 min-h-screen">{children}</main>
      </div>
    </div>
  );
}
