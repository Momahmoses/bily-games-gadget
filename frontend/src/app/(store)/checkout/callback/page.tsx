'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, ArrowRight, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import api from '@/lib/api';
import { formatPrice } from '@/lib/utils';

type Status = 'verifying' | 'success' | 'failed';

interface OrderSummary {
  orderNumber: string;
  total: number;
  itemCount: number;
}

export default function PaymentCallbackPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<Status>('verifying');
  const [order, setOrder] = useState<OrderSummary | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const verify = async () => {
      const reference = searchParams.get('reference');
      const txRef = searchParams.get('tx_ref');
      const transactionId = searchParams.get('transaction_id');
      const flwStatus = searchParams.get('status');

      try {
        let data: any;

        if (reference) {
          const res = await api.get(`/payments/verify/paystack/${reference}`) as any;
          data = res.data;
        } else if (txRef && transactionId) {
          if (flwStatus === 'cancelled') {
            setStatus('failed');
            setErrorMsg('Payment was cancelled.');
            return;
          }
          const res = await api.get(`/payments/verify/flutterwave/${transactionId}`) as any;
          data = res.data;
        } else {
          setStatus('failed');
          setErrorMsg('No payment reference found.');
          return;
        }

        if (data?.order) {
          setOrder({
            orderNumber: data.order.orderNumber,
            total: data.order.total,
            itemCount: data.order.items?.length || 0,
          });
        }
        setStatus('success');
      } catch (err: any) {
        setStatus('failed');
        setErrorMsg(err?.message || 'Payment verification failed. Please contact support.');
      }
    };

    verify();
  }, [searchParams]);

  if (status === 'verifying') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-yellow-500 animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900">Verifying your payment...</h2>
          <p className="text-gray-500 mt-1">Please don't close this page</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-5">
            <CheckCircle2 className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Payment Successful!</h1>
          <p className="text-gray-500 mb-6">Thank you for your order. We'll send you a confirmation email shortly.</p>

          {order && (
            <div className="bg-gray-50 rounded-2xl p-4 mb-6 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Order Number</span>
                <span className="font-mono font-bold text-gray-900">#{order.orderNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Items</span>
                <span className="font-semibold text-gray-700">{order.itemCount} item{order.itemCount !== 1 ? 's' : ''}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-500">Total Paid</span>
                <span className="font-bold text-gray-900">{formatPrice(order.total)}</span>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Link
              href="/account/orders"
              className="flex items-center justify-center gap-2 w-full py-3.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-2xl transition-colors"
            >
              Track Your Order <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/products"
              className="flex items-center justify-center gap-2 w-full py-3.5 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-2xl transition-colors text-sm"
            >
              <ShoppingBag className="w-4 h-4" /> Continue Shopping
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl border border-gray-200 shadow-sm p-10 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-5">
          <XCircle className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="text-2xl font-extrabold text-gray-900 mb-2">Payment Failed</h1>
        <p className="text-gray-500 mb-6">{errorMsg || 'Something went wrong with your payment.'}</p>

        <div className="flex flex-col gap-3">
          <Link
            href="/checkout"
            className="flex items-center justify-center gap-2 w-full py-3.5 bg-yellow-500 hover:bg-yellow-400 text-black font-bold rounded-2xl transition-colors"
          >
            Try Again <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/account/orders"
            className="w-full py-3.5 border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-2xl transition-colors text-sm"
          >
            View My Orders
          </Link>
        </div>
      </div>
    </div>
  );
}
