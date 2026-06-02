'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Link from 'next/link';
import Image from 'next/image';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { Product } from '@/types';
import { formatPrice, getDiscountPercentage } from '@/lib/utils';
import { useCartStore } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface WishlistItem {
  id: string;
  product: Product;
}

export default function WishlistPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const { addItem } = useCartStore();
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!isAuthenticated) router.push('/login?redirect=/wishlist');
  }, [isAuthenticated, router]);

  const { data, isLoading } = useQuery({
    queryKey: ['wishlist'],
    queryFn: () => api.get('/wishlist') as Promise<any>,
    enabled: isAuthenticated,
  });

  const items: WishlistItem[] = data?.data || [];

  const removeMutation = useMutation({
    mutationFn: (productId: string) => api.delete(`/wishlist/${productId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['wishlist'] });
      toast.success('Removed from wishlist');
    },
  });

  const handleAddToCart = async (item: WishlistItem) => {
    await addItem(item.product.id, 1);
    toast.success(`${item.product.name} added to cart`);
  };

  if (!isAuthenticated) return null;

  return (
    <div className="bg-gray-50 min-h-screen py-8">
      <div className="container mx-auto px-4 max-w-5xl">
        <div className="flex items-center gap-3 mb-6">
          <Heart className="w-6 h-6 text-red-500 fill-red-500" />
          <h1 className="text-2xl font-extrabold text-gray-900">My Wishlist</h1>
          {items.length > 0 && (
            <span className="ml-auto text-sm text-gray-500">{items.length} item{items.length !== 1 ? 's' : ''}</span>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-white rounded-2xl border border-gray-200 overflow-hidden animate-pulse">
                <div className="h-48 bg-gray-100" />
                <div className="p-3 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-3/4" />
                  <div className="h-4 bg-gray-100 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="bg-white rounded-3xl border border-gray-200 p-16 text-center">
            <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Heart className="w-8 h-8 text-red-300" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Your wishlist is empty</h3>
            <p className="text-gray-500 mb-6">Save items you love and come back to them anytime.</p>
            <Link href="/products" className="px-8 py-3 bg-yellow-500 text-black font-bold rounded-2xl text-sm hover:bg-yellow-400 transition-colors">
              Explore Products
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {items.map(({ id, product }) => {
              const isOnSale = product.salePrice && Number(product.salePrice) < Number(product.basePrice);
              const currentPrice = isOnSale ? Number(product.salePrice) : Number(product.basePrice);
              const inStock = (product.inventory?.quantity ?? 0) > (product.inventory?.reservedQty ?? 0);

              return (
                <div key={id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden group hover:shadow-md transition-shadow">
                  <Link href={`/products/${product.slug}`} className="block relative">
                    <div className="relative h-48 bg-gray-50 overflow-hidden">
                      <Image
                        src={product.images?.[0]?.url || 'https://placehold.co/300x300'}
                        alt={product.name}
                        fill
                        className="object-contain p-3 group-hover:scale-105 transition-transform duration-300"
                      />
                      {isOnSale && (
                        <span className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                          -{getDiscountPercentage(Number(product.basePrice), Number(product.salePrice))}%
                        </span>
                      )}
                      {!inStock && (
                        <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                          <span className="bg-gray-800 text-white text-xs font-bold px-3 py-1.5 rounded-full">Out of Stock</span>
                        </div>
                      )}
                    </div>
                  </Link>

                  <div className="p-3">
                    <p className="text-xs text-gray-400 mb-0.5">{product.brand?.name}</p>
                    <Link href={`/products/${product.slug}`}>
                      <p className="text-sm font-semibold text-gray-900 line-clamp-2 hover:text-yellow-600 transition-colors leading-snug">
                        {product.name}
                      </p>
                    </Link>
                    <div className="flex items-baseline gap-1.5 mt-1.5">
                      <span className="font-bold text-gray-900">{formatPrice(currentPrice)}</span>
                      {isOnSale && (
                        <span className="text-xs text-gray-400 line-through">{formatPrice(product.basePrice)}</span>
                      )}
                    </div>

                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleAddToCart({ id, product })}
                        disabled={!inStock}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-xl text-xs transition-colors"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        Add to Cart
                      </button>
                      <button
                        onClick={() => removeMutation.mutate(product.id)}
                        disabled={removeMutation.isPending}
                        className="p-2 border border-gray-200 rounded-xl hover:bg-red-50 hover:border-red-200 text-gray-400 hover:text-red-500 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
