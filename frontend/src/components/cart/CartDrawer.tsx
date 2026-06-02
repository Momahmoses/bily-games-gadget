'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight, ShoppingCart } from 'lucide-react';
import { useCartStore } from '@/store/useCartStore';
import { formatPrice } from '@/lib/utils';
import { cn } from '@/lib/utils';

export default function CartDrawer() {
  const { cart, isOpen, closeCart, updateItem, removeItem } = useCartStore();

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn('fixed inset-0 bg-black/50 z-50 transition-opacity', isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none')}
        onClick={closeCart}
      />

      {/* Drawer */}
      <div className={cn(
        'fixed top-0 right-0 bottom-0 w-full max-w-md bg-white z-50 flex flex-col shadow-2xl transition-transform duration-300',
        isOpen ? 'translate-x-0' : 'translate-x-full',
      )}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-yellow-500" />
            <h2 className="font-bold text-lg">Shopping Cart</h2>
            {(cart?.itemCount || 0) > 0 && (
              <span className="bg-yellow-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                {cart?.itemCount}
              </span>
            )}
          </div>
          <button onClick={closeCart} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto">
          {!cart?.items?.length ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 text-center px-8">
              <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center">
                <ShoppingCart className="w-10 h-10 text-gray-300" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-lg">Your cart is empty</p>
                <p className="text-gray-500 text-sm mt-1">Add some products to get started!</p>
              </div>
              <Link
                href="/products"
                onClick={closeCart}
                className="mt-2 px-6 py-2.5 bg-yellow-500 text-black font-semibold rounded-xl hover:bg-yellow-400 transition-colors text-sm"
              >
                Browse Products
              </Link>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {cart.items.map((item) => (
                <div key={item.id} className="flex gap-3 p-3 bg-gray-50 rounded-xl">
                  <div className="relative w-20 h-20 bg-white rounded-lg overflow-hidden shrink-0 border border-gray-100">
                    <Image
                      src={item.product?.images?.[0]?.url || 'https://placehold.co/80x80'}
                      alt={item.product?.name || ''}
                      fill
                      className="object-contain p-1"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/products/${item.product?.slug}`}
                      onClick={closeCart}
                      className="text-sm font-medium text-gray-900 hover:text-yellow-600 transition-colors line-clamp-2 leading-snug"
                    >
                      {item.product?.name}
                    </Link>

                    {item.variant && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        {Object.entries(item.variant.options as Record<string, string>).map(([k, v]) => `${k}: ${v}`).join(', ')}
                      </p>
                    )}

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => item.quantity > 1 ? updateItem(item.id, item.quantity - 1) : removeItem(item.id)}
                          className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold">{item.quantity}</span>
                        <button
                          onClick={() => updateItem(item.id, item.quantity + 1)}
                          className="w-7 h-7 rounded-lg bg-white border border-gray-200 flex items-center justify-center hover:bg-gray-100 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">{formatPrice(Number(item.price) * item.quantity)}</span>
                        <button
                          onClick={() => removeItem(item.id)}
                          className="p-1 text-red-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {(cart?.items?.length || 0) > 0 && (
          <div className="border-t p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Subtotal ({cart?.itemCount} items)</span>
              <span className="font-bold text-lg">{formatPrice(cart?.subtotal || 0)}</span>
            </div>
            <p className="text-xs text-gray-500 text-center">Shipping & taxes calculated at checkout</p>
            <Link
              href="/checkout"
              onClick={closeCart}
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-yellow-500 text-black font-bold rounded-xl hover:bg-yellow-400 transition-colors text-sm"
            >
              Proceed to Checkout
              <ArrowRight className="w-4 h-4" />
            </Link>
            <button
              onClick={closeCart}
              className="w-full py-2.5 border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors text-sm"
            >
              Continue Shopping
            </button>
          </div>
        )}
      </div>
    </>
  );
}
