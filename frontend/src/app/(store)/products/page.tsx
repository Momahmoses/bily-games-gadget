'use client';

import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { SlidersHorizontal, Grid3X3, List, ChevronDown, X, Search } from 'lucide-react';
import api from '@/lib/api';
import { Product, Category, Brand } from '@/types';
import ProductCard from '@/components/product/ProductCard';
import { cn } from '@/lib/utils';

export default function ProductsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [filters, setFilters] = useState({
    search: searchParams.get('search') || '',
    category: searchParams.get('category') || '',
    brand: searchParams.get('brand') || '',
    minPrice: searchParams.get('minPrice') || '',
    maxPrice: searchParams.get('maxPrice') || '',
    sortBy: searchParams.get('sortBy') || 'newest',
    inStock: searchParams.get('inStock') === 'true',
    page: 1,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories') as Promise<any>,
    staleTime: 10 * 60 * 1000,
  });

  const buildQuery = () => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== '' && v !== false && k !== 'page') params.set(k, String(v));
    });
    params.set('page', String(filters.page));
    params.set('limit', '20');
    return params.toString();
  };

  const { data, isLoading } = useQuery({
    queryKey: ['products', filters],
    queryFn: () => api.get(`/products?${buildQuery()}`) as Promise<any>,
  });

  const products: Product[] = data?.data || [];
  const meta = data?.meta;
  const categories: Category[] = categoriesData?.data || [];

  const updateFilter = (key: string, value: any) => {
    setFilters((prev) => ({ ...prev, [key]: value, page: 1 }));
  };

  const clearFilters = () => {
    setFilters({ search: '', category: '', brand: '', minPrice: '', maxPrice: '', sortBy: 'newest', inStock: false, page: 1 });
    router.push('/products');
  };

  const activeFilterCount = [filters.category, filters.brand, filters.minPrice, filters.maxPrice, filters.inStock]
    .filter(Boolean).length;

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'price_asc', label: 'Price: Low to High' },
    { value: 'price_desc', label: 'Price: High to Low' },
    { value: 'rating', label: 'Top Rated' },
    { value: 'popular', label: 'Most Popular' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-4 py-6">
          <h1 className="text-2xl font-extrabold text-gray-900">
            {filters.search ? `Results for "${filters.search}"` :
             filters.category ? categories.find((c) => c.slug === filters.category)?.name || 'Products' :
             'All Products'}
          </h1>
          {meta && (
            <p className="text-gray-500 mt-1 text-sm">{meta.total} products found</p>
          )}
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        <div className="flex gap-6">
          {/* Sidebar */}
          <aside className={cn(
            'w-64 shrink-0 hidden lg:block',
          )}>
            <div className="bg-white rounded-2xl border border-gray-200 p-5 sticky top-6 space-y-6">
              {/* Categories */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">Categories</h3>
                <div className="space-y-1">
                  <button
                    onClick={() => updateFilter('category', '')}
                    className={cn('w-full text-left px-3 py-2 rounded-lg text-sm transition-colors', !filters.category ? 'bg-yellow-50 text-yellow-700 font-semibold' : 'text-gray-600 hover:bg-gray-50')}
                  >
                    All Categories
                  </button>
                  {categories.map((cat) => (
                    <div key={cat.id}>
                      <button
                        onClick={() => updateFilter('category', cat.slug)}
                        className={cn('w-full text-left px-3 py-2 rounded-lg text-sm transition-colors', filters.category === cat.slug ? 'bg-yellow-50 text-yellow-700 font-semibold' : 'text-gray-600 hover:bg-gray-50')}
                      >
                        {cat.icon} {cat.name}
                        {cat._count && <span className="ml-auto text-xs text-gray-400 float-right">({cat._count.products})</span>}
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Price Range */}
              <div>
                <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide">Price Range</h3>
                <div className="space-y-2">
                  <input
                    type="number"
                    placeholder="Min price (₦)"
                    value={filters.minPrice}
                    onChange={(e) => updateFilter('minPrice', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-yellow-500"
                  />
                  <input
                    type="number"
                    placeholder="Max price (₦)"
                    value={filters.maxPrice}
                    onChange={(e) => updateFilter('maxPrice', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-yellow-500"
                  />
                </div>

                {/* Quick price ranges */}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {[
                    { label: 'Under ₦20k', min: '', max: '20000' },
                    { label: '₦20k–₦50k', min: '20000', max: '50000' },
                    { label: '₦50k–₦100k', min: '50000', max: '100000' },
                    { label: 'Above ₦100k', min: '100000', max: '' },
                  ].map((range) => (
                    <button
                      key={range.label}
                      onClick={() => setFilters((f) => ({ ...f, minPrice: range.min, maxPrice: range.max, page: 1 }))}
                      className="px-2 py-1.5 text-xs bg-gray-50 hover:bg-yellow-50 hover:text-yellow-700 border border-gray-200 hover:border-yellow-300 rounded-lg transition-colors text-gray-600"
                    >
                      {range.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* In Stock */}
              <div>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filters.inStock}
                    onChange={(e) => updateFilter('inStock', e.target.checked)}
                    className="w-4 h-4 accent-yellow-500"
                  />
                  <span className="text-sm font-medium text-gray-700">In Stock Only</span>
                </label>
              </div>

              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="w-full py-2 text-sm text-red-600 hover:bg-red-50 border border-red-200 rounded-lg transition-colors font-medium"
                >
                  Clear All Filters ({activeFilterCount})
                </button>
              )}
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0">
            {/* Toolbar */}
            <div className="flex items-center justify-between mb-5 bg-white rounded-xl border border-gray-200 px-4 py-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setFiltersOpen(!filtersOpen)}
                  className="lg:hidden flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50"
                >
                  <SlidersHorizontal className="w-4 h-4" />
                  Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
                </button>
                <span className="text-sm text-gray-500 hidden sm:block">
                  {meta ? `${((filters.page - 1) * 20) + 1}–${Math.min(filters.page * 20, meta.total)} of ${meta.total}` : ''}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={filters.sortBy}
                  onChange={(e) => updateFilter('sortBy', e.target.value)}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-yellow-500 bg-white text-gray-700"
                >
                  {sortOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <div className="hidden sm:flex items-center gap-1 border border-gray-200 rounded-lg overflow-hidden">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={cn('p-1.5 transition-colors', viewMode === 'grid' ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-gray-700')}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={cn('p-1.5 transition-colors', viewMode === 'list' ? 'bg-yellow-500 text-black' : 'text-gray-400 hover:text-gray-700')}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Products grid */}
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="bg-white rounded-2xl overflow-hidden border border-gray-100 animate-pulse">
                    <div className="pt-[100%] bg-gray-100" />
                    <div className="p-4 space-y-3">
                      <div className="h-3 bg-gray-200 rounded w-2/3" />
                      <div className="h-4 bg-gray-200 rounded" />
                      <div className="h-6 bg-gray-200 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="text-center py-20">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Search className="w-10 h-10 text-gray-300" />
                </div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">No products found</h3>
                <p className="text-gray-500 mb-4">Try adjusting your filters or search query</p>
                <button onClick={clearFilters} className="px-6 py-2.5 bg-yellow-500 text-black font-semibold rounded-xl hover:bg-yellow-400 transition-colors">
                  Clear Filters
                </button>
              </div>
            ) : (
              <div className={cn(
                'grid gap-4',
                viewMode === 'grid' ? 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4' : 'grid-cols-1',
              )}>
                {products.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            )}

            {/* Pagination */}
            {meta && meta.totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-2">
                <button
                  onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                  disabled={filters.page <= 1}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Previous
                </button>
                {[...Array(Math.min(meta.totalPages, 7))].map((_, i) => {
                  const page = i + 1;
                  return (
                    <button
                      key={page}
                      onClick={() => setFilters((f) => ({ ...f, page }))}
                      className={cn(
                        'w-9 h-9 rounded-lg text-sm font-medium transition-colors',
                        filters.page === page ? 'bg-yellow-500 text-black' : 'border border-gray-200 text-gray-600 hover:bg-gray-50',
                      )}
                    >
                      {page}
                    </button>
                  );
                })}
                <button
                  onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                  disabled={filters.page >= meta.totalPages}
                  className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  Next
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
