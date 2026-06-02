'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Heart, ShoppingCart, Star, Eye, Zap } from 'lucide-react';
import { Product } from '@/types';
import { formatPrice, getDiscountPercentage } from '@/lib/utils';
import { useCartStore } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import toast from 'react-hot-toast';
import api from '@/lib/api';

interface ProductCardProps {
  product: Product;
  className?: string;
}

export default function ProductCard({ product, className }: ProductCardProps) {
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [addingToCart, setAddingToCart] = useState(false);
  const { addItem } = useCartStore();
  const { isAuthenticated } = useAuthStore();

  const primaryImage = product.images?.[0]?.url || 'https://placehold.co/400x400/1a1a2e/ffffff?text=Product';
  const hasDiscount = product.salePrice && product.salePrice < product.basePrice;
  const displayPrice = product.salePrice || product.basePrice;
  const discountPct = hasDiscount ? getDiscountPercentage(Number(product.basePrice), Number(product.salePrice!)) : 0;
  const isInStock = (product.inventory?.quantity || 0) > 0;

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isInStock) return;

    setAddingToCart(true);
    try {
      await addItem(product.id, 1);
    } catch {}
    finally {
      setAddingToCart(false);
    }
  };

  const handleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!isAuthenticated) {
      toast.error('Please sign in to save items');
      return;
    }

    try {
      if (isWishlisted) {
        await api.delete(`/wishlist/${product.id}`);
        setIsWishlisted(false);
        toast.success('Removed from wishlist');
      } else {
        await api.post(`/wishlist/${product.id}`);
        setIsWishlisted(true);
        toast.success('Saved to wishlist!');
      }
    } catch {}
  };

  return (
    <div className={cn('group relative bg-white rounded-2xl overflow-hidden border border-gray-100 hover:border-yellow-200 hover:shadow-lg transition-all duration-300', className)}>
      {/* Badges */}
      <div className="absolute top-3 left-3 z-10 flex flex-col gap-1.5">
        {hasDiscount && (
          <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            -{discountPct}%
          </span>
        )}
        {product.isNew && (
          <span className="bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">NEW</span>
        )}
        {!isInStock && (
          <span className="bg-gray-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">Out of Stock</span>
        )}
      </div>

      {/* Wishlist */}
      <button
        onClick={handleWishlist}
        className="absolute top-3 right-3 z-10 w-8 h-8 bg-white rounded-full shadow flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-50"
      >
        <Heart className={cn('w-4 h-4 transition-colors', isWishlisted ? 'fill-red-500 text-red-500' : 'text-gray-400')} />
      </button>

      {/* Image */}
      <Link href={`/products/${product.slug}`} className="block relative pt-[100%] overflow-hidden bg-gray-50">
        <Image
          src={primaryImage}
          alt={product.name}
          fill
          className="object-contain p-4 group-hover:scale-105 transition-transform duration-300"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
        />

        {/* Quick view overlay */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
          <Link
            href={`/products/${product.slug}`}
            className="bg-white text-gray-900 text-xs font-semibold px-4 py-2 rounded-full hover:bg-yellow-500 transition-colors flex items-center gap-1.5"
            onClick={(e) => e.stopPropagation()}
          >
            <Eye className="w-3.5 h-3.5" />
            Quick View
          </Link>
        </div>
      </Link>

      {/* Info */}
      <div className="p-4">
        {product.brand && (
          <p className="text-xs text-yellow-600 font-semibold uppercase tracking-wider mb-1">
            {product.brand.name}
          </p>
        )}

        <Link href={`/products/${product.slug}`}>
          <h3 className="text-sm font-medium text-gray-900 hover:text-yellow-600 transition-colors line-clamp-2 leading-snug mb-2">
            {product.name}
          </h3>
        </Link>

        {/* Rating */}
        {product.totalReviews > 0 && (
          <div className="flex items-center gap-1 mb-2">
            <div className="flex">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  className={cn('w-3 h-3', star <= Math.round(product.averageRating) ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200')}
                />
              ))}
            </div>
            <span className="text-xs text-gray-500">({product.totalReviews})</span>
          </div>
        )}

        {/* Price */}
        <div className="flex items-center justify-between mt-3">
          <div className="flex items-center gap-2">
            <span className="text-base font-bold text-gray-900">{formatPrice(Number(displayPrice))}</span>
            {hasDiscount && (
              <span className="text-xs text-gray-400 line-through">{formatPrice(Number(product.basePrice))}</span>
            )}
          </div>
        </div>

        {/* Add to cart */}
        <button
          onClick={handleAddToCart}
          disabled={!isInStock || addingToCart}
          className={cn(
            'w-full mt-3 py-2.5 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2',
            isInStock
              ? 'bg-[#1a1a2e] text-white hover:bg-yellow-500 hover:text-black active:scale-95'
              : 'bg-gray-100 text-gray-400 cursor-not-allowed',
          )}
        >
          {addingToCart ? (
            <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          ) : (
            <ShoppingCart className="w-4 h-4" />
          )}
          {!isInStock ? 'Out of Stock' : addingToCart ? 'Adding...' : 'Add to Cart'}
        </button>
      </div>
    </div>
  );
}
