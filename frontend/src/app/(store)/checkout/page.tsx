'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { MapPin, CreditCard, Tag, Plus, Check, ArrowRight, Lock } from 'lucide-react';
import api from '@/lib/api';
import { useCartStore } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';
import { Address } from '@/types';
import { formatPrice } from '@/lib/utils';
import Link from 'next/link';
import Image from 'next/image';
import toast from 'react-hot-toast';

export default function CheckoutPage() {
  const router = useRouter();
  const { cart } = useCartStore();
  const { isAuthenticated, user } = useAuthStore();
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [paymentProvider, setPaymentProvider] = useState<'paystack' | 'flutterwave'>('paystack');
  const [couponCode, setCouponCode] = useState('');
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);
  const [couponError, setCouponError] = useState('');
  const [shippingNotes, setShippingNotes] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      router.push('/login?redirect=/checkout');
      return;
    }
    if (!cart?.items?.length) {
      router.push('/products');
    }
  }, [isAuthenticated, cart, router]);

  const { data: addressesData } = useQuery({
    queryKey: ['addresses'],
    queryFn: () => api.get('/users/addresses') as Promise<any>,
    enabled: isAuthenticated,
  });

  const addresses: Address[] = addressesData?.data || [];

  useEffect(() => {
    const defaultAddr = addresses.find((a) => a.isDefault) || addresses[0];
    if (defaultAddr && !selectedAddress) setSelectedAddress(defaultAddr.id);
  }, [addresses, selectedAddress]);

  const applyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponError('');
    try {
      const response = await api.get(`/coupons/validate/${couponCode}`) as any;
      const coupon = response.data;

      const subtotal = cart?.subtotal || 0;
      let discount = 0;

      if (coupon.type === 'PERCENTAGE') {
        discount = (subtotal * Number(coupon.value)) / 100;
        if (coupon.maxDiscount) discount = Math.min(discount, Number(coupon.maxDiscount));
      } else if (coupon.type === 'FIXED') {
        discount = Math.min(Number(coupon.value), subtotal);
      }

      setCouponDiscount(discount);
      setCouponApplied(true);
      toast.success('Coupon applied!');
    } catch (error: any) {
      setCouponError(error?.message || 'Invalid coupon');
      setCouponDiscount(0);
      setCouponApplied(false);
    }
  };

  const shippingFee = (cart?.subtotal || 0) >= 50000 ? 0 : 2500;
  const total = (cart?.subtotal || 0) - couponDiscount + shippingFee;

  const placeOrderMutation = useMutation({
    mutationFn: async () => {
      const orderRes = await api.post('/orders', {
        addressId: selectedAddress,
        couponCode: couponApplied ? couponCode : undefined,
        shippingNotes,
      }) as any;

      const order = orderRes.data;

      const paymentRes = await api.post('/payments/initiate', {
        orderId: order.id,
        provider: paymentProvider,
      }) as any;

      return paymentRes.data;
    },
    onSuccess: (data) => {
      if (data.authorizationUrl) {
        window.location.href = data.authorizationUrl;
      } else if (data.paymentLink) {
        window.location.href = data.paymentLink;
      }
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to place order');
    },
  });

  if (!cart?.items?.length) return null;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex items-center gap-2 mb-8">
          <Lock className="w-4 h-4 text-green-500" />
          <h1 className="text-2xl font-extrabold text-gray-900">Secure Checkout</h1>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping Address */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="font-bold text-lg flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-yellow-500" /> Shipping Address
                </h2>
                <Link href="/account/addresses/new" className="text-sm text-yellow-600 hover:text-yellow-700 font-medium flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Add New
                </Link>
              </div>

              {addresses.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 mb-4">No addresses saved yet</p>
                  <Link href="/account/addresses/new" className="px-4 py-2 bg-yellow-500 text-black font-semibold rounded-xl text-sm">
                    Add Address
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  {addresses.map((addr) => (
                    <label key={addr.id} className={`flex items-start gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${selectedAddress === addr.id ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-yellow-200'}`}>
                      <input
                        type="radio"
                        name="address"
                        value={addr.id}
                        checked={selectedAddress === addr.id}
                        onChange={() => setSelectedAddress(addr.id)}
                        className="mt-0.5 accent-yellow-500"
                      />
                      <div className="flex-1 text-sm">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="font-semibold text-gray-900">{addr.firstName} {addr.lastName}</span>
                          {addr.isDefault && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">Default</span>}
                          {addr.label && <span className="text-xs text-gray-500">{addr.label}</span>}
                        </div>
                        <p className="text-gray-600">{addr.address}, {addr.city}, {addr.state}</p>
                        <p className="text-gray-500">{addr.phone}</p>
                      </div>
                    </label>
                  ))}
                </div>
              )}

              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Delivery Notes (optional)</label>
                <textarea
                  value={shippingNotes}
                  onChange={(e) => setShippingNotes(e.target.value)}
                  placeholder="Any special delivery instructions..."
                  rows={2}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500 resize-none"
                />
              </div>
            </div>

            {/* Payment */}
            <div className="bg-white rounded-2xl border border-gray-200 p-6">
              <h2 className="font-bold text-lg flex items-center gap-2 mb-5">
                <CreditCard className="w-5 h-5 text-yellow-500" /> Payment Method
              </h2>
              <div className="space-y-3">
                {[
                  { id: 'paystack', name: 'Paystack', desc: 'Pay securely with card, bank transfer, or USSD', color: '#0BA4DB' },
                  { id: 'flutterwave', name: 'Flutterwave', desc: 'Multiple payment options including mobile money', color: '#F5A623' },
                ].map((p) => (
                  <label key={p.id} className={`flex items-center gap-3 p-4 rounded-xl border-2 cursor-pointer transition-all ${paymentProvider === p.id ? 'border-yellow-500 bg-yellow-50' : 'border-gray-200 hover:border-yellow-200'}`}>
                    <input type="radio" name="payment" value={p.id} checked={paymentProvider === p.id as any} onChange={() => setPaymentProvider(p.id as any)} className="accent-yellow-500" />
                    <div>
                      <p className="font-semibold text-gray-900">{p.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{p.desc}</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="space-y-5">
            {/* Cart items */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h2 className="font-bold text-lg mb-4">Order Summary ({cart.itemCount} items)</h2>
              <div className="space-y-3 max-h-64 overflow-y-auto scrollbar-hide">
                {cart.items.map((item) => (
                  <div key={item.id} className="flex gap-3">
                    <div className="relative w-14 h-14 bg-gray-50 rounded-lg overflow-hidden shrink-0 border">
                      <Image src={item.product?.images?.[0]?.url || 'https://placehold.co/56x56'} alt="" fill className="object-contain p-1" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 line-clamp-1">{item.product?.name}</p>
                      <p className="text-xs text-gray-500">Qty: {item.quantity}</p>
                    </div>
                    <p className="text-sm font-bold whitespace-nowrap">{formatPrice(Number(item.price) * item.quantity)}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Coupon */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2 mb-3">
                <Tag className="w-4 h-4 text-yellow-500" /> Coupon Code
              </h3>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => { setCouponCode(e.target.value.toUpperCase()); setCouponApplied(false); setCouponError(''); }}
                  placeholder="Enter code"
                  className="flex-1 px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:border-yellow-500 font-mono tracking-wider"
                  disabled={couponApplied}
                />
                <button
                  onClick={applyCoupon}
                  disabled={!couponCode.trim() || couponApplied}
                  className="px-4 py-2.5 bg-yellow-500 text-black font-bold rounded-xl text-sm hover:bg-yellow-400 disabled:opacity-50 transition-colors"
                >
                  {couponApplied ? <Check className="w-4 h-4" /> : 'Apply'}
                </button>
              </div>
              {couponError && <p className="text-red-500 text-xs mt-1">{couponError}</p>}
              {couponApplied && <p className="text-green-600 text-xs mt-1 flex items-center gap-1"><Check className="w-3 h-3" />Coupon applied! Saving {formatPrice(couponDiscount)}</p>}
            </div>

            {/* Totals */}
            <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-3">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Subtotal</span>
                <span>{formatPrice(cart.subtotal)}</span>
              </div>
              {couponDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600 font-medium">
                  <span>Coupon Discount</span>
                  <span>-{formatPrice(couponDiscount)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-gray-600">
                <span>Shipping</span>
                <span className={shippingFee === 0 ? 'text-green-600 font-medium' : ''}>
                  {shippingFee === 0 ? 'FREE' : formatPrice(shippingFee)}
                </span>
              </div>
              <div className="flex justify-between font-extrabold text-xl border-t border-gray-100 pt-3">
                <span>Total</span>
                <span>{formatPrice(total)}</span>
              </div>

              <button
                onClick={() => placeOrderMutation.mutate()}
                disabled={!selectedAddress || placeOrderMutation.isPending}
                className="w-full py-4 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-60 text-black font-extrabold rounded-2xl flex items-center justify-center gap-2 transition-all active:scale-95 text-sm mt-2"
              >
                {placeOrderMutation.isPending ? (
                  <span className="w-5 h-5 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    Place Order & Pay
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <p className="text-xs text-gray-500 text-center">🔒 Your information is encrypted and secure</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
