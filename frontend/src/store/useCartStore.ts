import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import { Cart, CartItem } from '@/types';
import api from '@/lib/api';
import toast from 'react-hot-toast';

interface CartState {
  cart: Cart | null;
  isLoading: boolean;
  isOpen: boolean;

  fetchCart: () => Promise<void>;
  addItem: (productId: string, quantity: number, variantId?: string) => Promise<void>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  clearCart: () => Promise<void>;
  toggleCart: () => void;
  closeCart: () => void;
}

export const useCartStore = create<CartState>()(
  immer((set, get) => ({
    cart: null,
    isLoading: false,
    isOpen: false,

    fetchCart: async () => {
      set((s) => { s.isLoading = true; });
      try {
        const response = await api.get('/cart') as any;
        set((s) => { s.cart = response.data; s.isLoading = false; });
      } catch {
        set((s) => { s.isLoading = false; });
      }
    },

    addItem: async (productId, quantity, variantId) => {
      try {
        const response = await api.post('/cart/items', { productId, quantity, variantId }) as any;
        set((s) => { s.cart = response.data; });
        toast.success('Added to cart!');
      } catch (error: any) {
        toast.error(error?.message || 'Failed to add to cart');
        throw error;
      }
    },

    updateItem: async (itemId, quantity) => {
      try {
        const response = await api.put(`/cart/items/${itemId}`, { quantity }) as any;
        set((s) => { s.cart = response.data; });
      } catch (error: any) {
        toast.error(error?.message || 'Failed to update cart');
      }
    },

    removeItem: async (itemId) => {
      try {
        const response = await api.delete(`/cart/items/${itemId}`) as any;
        set((s) => { s.cart = response.data; });
        toast.success('Item removed');
      } catch (error: any) {
        toast.error('Failed to remove item');
      }
    },

    clearCart: async () => {
      try {
        await api.delete('/cart');
        set((s) => { s.cart = { id: '', items: [], subtotal: 0, itemCount: 0 }; });
      } catch {}
    },

    toggleCart: () => set((s) => { s.isOpen = !s.isOpen; }),
    closeCart: () => set((s) => { s.isOpen = false; }),
  })),
);
