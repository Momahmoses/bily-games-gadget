'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { ShoppingCart, Heart, Star, Check, ChevronRight, Minus, Plus, Shield, Truck, RotateCcw, Package } from 'lucide-react';
import api from '@/lib/api';
import { Product, ProductVariant } from '@/types';
import { formatPrice, getDiscountPercentage } from '@/lib/utils';
import { useCartStore } from '@/store/useCartStore';
import { cn } from '@/lib/utils';
import ProductCard from '@/components/product/ProductCard';

export default function ProductDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<'description' | 'specs' | 'reviews'>('description');
  const { addItem } = useCartStore();

  const { data, isLoading } = useQuery({
    queryKey: ['product', slug],
    queryFn: () => api.get(`/products/${slug}`) as Promise<any>,
    enabled: !!slug,
  });

  const { data: relatedData } = useQuery({
    queryKey: ['related-products', data?.data?.id],
    queryFn: () => api.get(`/products/${data?.data?.id}/related`) as Promise<any>,
    enabled: !!data?.data?.id,
  });

  const product: Product = data?.data;
  const relatedProducts: Product[] = relatedData?.data?.slice(0, 4) || [];

  if (isLoading) return <ProductDetailSkeleton />;
  if (!product) return <div className="container mx-auto px-4 py-20 text-center"><h2 className="text-2xl font-bold">Product not found</h2></div>;

  const displayPrice = selectedVariant
    ? Number(selectedVariant.salePrice || selectedVariant.price)
    : Number(product.salePrice || product.basePrice);
  const originalPrice = selectedVariant
    ? Number(selectedVariant.price)
    : Number(product.basePrice);
  const hasDiscount = displayPrice < originalPrice;
  const discountPct = hasDiscount ? getDiscountPercentage(originalPrice, displayPrice) : 0;
  const stock = selectedVariant
    ? selectedVariant.inventory?.quantity || 0
    : product.inventory?.quantity || 0;
  const inStock = stock > 0;

  const images = product.images?.length ? product.images : [{ url: 'https://placehold.co/600x600', isPrimary: true, altText: product.name }];

  const handleAddToCart = async () => {
    await addItem(product.id, quantity, selectedVariant?.id);
    setQuantity(1);
  };

  // Group variant options by type
  const variantGroups: Record<string, Set<string>> = {};
  product.variants?.forEach((v) => {
    if (v.options) {
      Object.entries(v.options as Record<string, string>).forEach(([key, val]) => {
        if (!variantGroups[key]) variantGroups[key] = new Set();
        variantGroups[key].add(val);
      });
    }
  });

  return (
    <div className="bg-white min-h-screen">
      {/* Breadcrumb */}
      <div className="bg-gray-50 border-b">
        <div className="container mx-auto px-4 py-3">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/home" className="hover:text-yellow-600">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link href="/products" className="hover:text-yellow-600">Products</Link>
            <ChevronRight className="w-3 h-3" />
            {product.category && (
              <>
                <Link href={`/products?category=${product.category.slug}`} className="hover:text-yellow-600">{product.category.name}</Link>
                <ChevronRight className="w-3 h-3" />
              </>
            )}
            <span className="text-gray-900 font-medium truncate max-w-[200px]">{product.name}</span>
          </nav>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-2 gap-10 mb-16">
          {/* Images */}
          <div className="space-y-3">
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-100">
              <Image
                src={images[selectedImage]?.url}
                alt={images[selectedImage]?.altText || product.name}
                fill
                className="object-contain p-6"
                priority
              />
              {hasDiscount && (
                <div className="absolute top-4 left-4 bg-red-500 text-white text-sm font-bold px-3 py-1 rounded-full">
                  -{discountPct}%
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedImage(i)}
                    className={cn(
                      'relative w-16 h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all',
                      i === selectedImage ? 'border-yellow-500' : 'border-gray-200 hover:border-gray-300',
                    )}
                  >
                    <Image src={img.url} alt="" fill className="object-contain p-1" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product info */}
          <div className="space-y-5">
            {product.brand && (
              <Link href={`/products?brand=${product.brand.slug}`} className="inline-block text-sm font-semibold text-yellow-600 hover:text-yellow-700 uppercase tracking-wider">
                {product.brand.name}
              </Link>
            )}

            <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 leading-tight">{product.name}</h1>

            {/* Rating */}
            {product.totalReviews > 0 && (
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[1,2,3,4,5].map((s) => (
                    <Star key={s} className={cn('w-4 h-4', s <= Math.round(product.averageRating) ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200')} />
                  ))}
                </div>
                <span className="text-sm font-semibold text-gray-700">{Number(product.averageRating).toFixed(1)}</span>
                <button onClick={() => setActiveTab('reviews')} className="text-sm text-gray-500 hover:text-yellow-600 transition-colors">
                  ({product.totalReviews} reviews)
                </button>
              </div>
            )}

            {/* Price */}
            <div className="flex items-end gap-3">
              <span className="text-4xl font-extrabold text-gray-900">{formatPrice(displayPrice)}</span>
              {hasDiscount && (
                <>
                  <span className="text-xl text-gray-400 line-through mb-1">{formatPrice(originalPrice)}</span>
                  <span className="mb-1 px-2 py-0.5 bg-red-100 text-red-600 text-sm font-bold rounded-lg">Save {formatPrice(originalPrice - displayPrice)}</span>
                </>
              )}
            </div>

            {/* Stock */}
            <div className="flex items-center gap-2">
              {inStock ? (
                <>
                  <Check className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-green-700">
                    In Stock {stock <= 10 && `(Only ${stock} left)`}
                  </span>
                </>
              ) : (
                <span className="text-sm font-medium text-red-600">Out of Stock</span>
              )}
            </div>

            {/* Variants */}
            {Object.entries(variantGroups).map(([optionName, values]) => (
              <div key={optionName}>
                <p className="text-sm font-semibold text-gray-700 mb-2">{optionName}:</p>
                <div className="flex flex-wrap gap-2">
                  {Array.from(values).map((val) => {
                    const variant = product.variants?.find((v) => (v.options as any)[optionName] === val);
                    const isSelected = selectedVariant && (selectedVariant.options as any)[optionName] === val;
                    return (
                      <button
                        key={val}
                        onClick={() => setSelectedVariant(variant || null)}
                        className={cn(
                          'px-4 py-2 rounded-lg text-sm font-medium border-2 transition-all',
                          isSelected ? 'border-yellow-500 bg-yellow-50 text-yellow-700' : 'border-gray-200 text-gray-700 hover:border-yellow-300',
                        )}
                      >
                        {val}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Quantity */}
            <div className="flex items-center gap-4">
              <span className="text-sm font-semibold text-gray-700">Quantity:</span>
              <div className="flex items-center gap-2 border border-gray-200 rounded-xl p-1">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center font-bold">{quantity}</span>
                <button
                  onClick={() => setQuantity(Math.min(stock, quantity + 1))}
                  disabled={quantity >= stock}
                  className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleAddToCart}
                disabled={!inStock}
                className={cn(
                  'flex-1 py-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 transition-all',
                  inStock ? 'bg-yellow-500 text-black hover:bg-yellow-400 active:scale-95' : 'bg-gray-100 text-gray-400 cursor-not-allowed',
                )}
              >
                <ShoppingCart className="w-5 h-5" />
                {inStock ? 'Add to Cart' : 'Out of Stock'}
              </button>
              <button className="p-4 border-2 border-gray-200 rounded-2xl hover:border-red-300 hover:bg-red-50 transition-all">
                <Heart className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Trust signals */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              {[
                { icon: Shield, text: 'Genuine Product' },
                { icon: Truck, text: 'Fast Delivery' },
                { icon: RotateCcw, text: '7-Day Returns' },
                { icon: Package, text: 'Secure Packaging' },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-2 text-xs text-gray-600">
                  <Icon className="w-4 h-4 text-yellow-500 shrink-0" />
                  {text}
                </div>
              ))}
            </div>

            {/* SKU */}
            <p className="text-xs text-gray-400">SKU: {product.sku}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-t border-gray-100">
          <div className="flex border-b">
            {(['description', 'specs', 'reviews'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'px-6 py-4 text-sm font-semibold capitalize transition-colors border-b-2 -mb-px',
                  activeTab === tab ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-500 hover:text-gray-700',
                )}
              >
                {tab} {tab === 'reviews' && product.totalReviews > 0 && `(${product.totalReviews})`}
              </button>
            ))}
          </div>

          <div className="py-8">
            {activeTab === 'description' && (
              <div className="prose prose-gray max-w-none text-sm leading-relaxed text-gray-600">
                <p>{product.description}</p>
              </div>
            )}

            {activeTab === 'specs' && (
              <div className="grid sm:grid-cols-2 gap-3">
                {product.attributes?.map((attr) => (
                  <div key={attr.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl">
                    <span className="text-sm font-semibold text-gray-700 min-w-[120px] shrink-0">{attr.name}</span>
                    <span className="text-sm text-gray-600">{attr.value}</span>
                  </div>
                ))}
                {(!product.attributes || product.attributes.length === 0) && (
                  <p className="text-gray-500 text-sm">No specifications available.</p>
                )}
              </div>
            )}

            {activeTab === 'reviews' && (
              <div className="space-y-4">
                {product.reviews?.map((review) => (
                  <div key={review.id} className="border border-gray-100 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-[#1a1a2e] text-yellow-500 text-xs font-bold flex items-center justify-center">
                          {review.user?.firstName?.charAt(0)}{review.user?.lastName?.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-gray-900">{review.user?.firstName} {review.user?.lastName}</p>
                          {review.isVerified && <span className="text-xs text-green-600 font-medium flex items-center gap-0.5"><Check className="w-3 h-3" />Verified Purchase</span>}
                        </div>
                      </div>
                      <div className="flex">
                        {[1,2,3,4,5].map((s) => (
                          <Star key={s} className={cn('w-3.5 h-3.5', s <= review.rating ? 'fill-yellow-400 text-yellow-400' : 'fill-gray-200 text-gray-200')} />
                        ))}
                      </div>
                    </div>
                    {review.title && <p className="font-semibold text-gray-900 text-sm mb-1">{review.title}</p>}
                    <p className="text-sm text-gray-600 leading-relaxed">{review.comment}</p>
                  </div>
                ))}
                {(!product.reviews || product.reviews.length === 0) && (
                  <p className="text-gray-500 text-sm">No reviews yet. Be the first to review!</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Related products */}
        {relatedProducts.length > 0 && (
          <div className="border-t border-gray-100 pt-12">
            <h2 className="text-xl font-extrabold text-gray-900 mb-6">You May Also Like</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {relatedProducts.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProductDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8 animate-pulse">
      <div className="grid lg:grid-cols-2 gap-10">
        <div className="space-y-3">
          <div className="aspect-square bg-gray-200 rounded-2xl" />
          <div className="flex gap-2">
            {[...Array(4)].map((_, i) => <div key={i} className="w-16 h-16 bg-gray-200 rounded-xl" />)}
          </div>
        </div>
        <div className="space-y-4">
          <div className="h-5 bg-gray-200 rounded w-24" />
          <div className="h-8 bg-gray-200 rounded w-3/4" />
          <div className="h-4 bg-gray-200 rounded w-1/2" />
          <div className="h-10 bg-gray-200 rounded w-1/3" />
          <div className="h-12 bg-gray-200 rounded-2xl" />
        </div>
      </div>
    </div>
  );
}
