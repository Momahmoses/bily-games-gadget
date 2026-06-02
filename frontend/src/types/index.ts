export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  avatar?: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'CUSTOMER';
  emailVerified: boolean;
  createdAt: string;
  _count?: { orders: number; wishlists: number; reviews: number };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  icon?: string;
  parentId?: string;
  parent?: Category;
  children?: Category[];
  _count?: { products: number };
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  description?: string;
}

export interface ProductImage {
  id: string;
  url: string;
  altText?: string;
  isPrimary: boolean;
  sortOrder: number;
}

export interface ProductAttribute {
  id: string;
  name: string;
  value: string;
}

export interface VariantInventory {
  quantity: number;
  reservedQty: number;
}

export interface ProductVariant {
  id: string;
  name: string;
  sku: string;
  price: number;
  salePrice?: number;
  options: Record<string, string>;
  image?: string;
  isActive: boolean;
  inventory?: VariantInventory;
}

export interface Inventory {
  quantity: number;
  reservedQty: number;
  lowStockAlert: number;
  trackStock: boolean;
  allowBackorder: boolean;
}

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDesc?: string;
  categoryId: string;
  category: Category;
  brandId?: string;
  brand?: Brand;
  basePrice: number;
  salePrice?: number;
  sku: string;
  isActive: boolean;
  isFeatured: boolean;
  isDigital: boolean;
  tags: string[];
  averageRating: number;
  totalReviews: number;
  totalSold: number;
  images: ProductImage[];
  variants?: ProductVariant[];
  inventory?: Inventory;
  attributes?: ProductAttribute[];
  reviews?: Review[];
  createdAt: string;
}

export interface CartItem {
  id: string;
  cartId: string;
  productId: string;
  product: Product;
  variantId?: string;
  variant?: ProductVariant;
  quantity: number;
  price: number;
}

export interface Cart {
  id: string;
  items: CartItem[];
  subtotal: number;
  itemCount: number;
}

export interface Address {
  id: string;
  label?: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  country: string;
  postalCode?: string;
  isDefault: boolean;
}

export interface OrderItem {
  id: string;
  productId: string;
  product?: Product;
  variantId?: string;
  name: string;
  image?: string;
  sku: string;
  options?: Record<string, string>;
  price: number;
  quantity: number;
  total: number;
}

export interface OrderTimeline {
  id: string;
  status: OrderStatus;
  comment?: string;
  createdAt: string;
  createdBy?: string;
}

export type OrderStatus =
  | 'PENDING'
  | 'PAID'
  | 'PROCESSING'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'REFUNDED';

export type PaymentStatus = 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED' | 'PARTIALLY_REFUNDED';

export interface Payment {
  id: string;
  provider: 'PAYSTACK' | 'FLUTTERWAVE';
  reference: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  paidAt?: string;
  createdAt: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  userId: string;
  user?: User;
  address: Address;
  coupon?: { code: string; type: string; value: number };
  subtotal: number;
  discount: number;
  shippingFee: number;
  tax: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  trackingCode?: string;
  items: OrderItem[];
  payments: Payment[];
  timeline: OrderTimeline[];
  createdAt: string;
  updatedAt: string;
}

export interface Review {
  id: string;
  productId: string;
  userId: string;
  user?: { firstName: string; lastName: string; avatar?: string };
  rating: number;
  title?: string;
  comment: string;
  isVerified: boolean;
  isApproved: boolean;
  images?: string[];
  createdAt: string;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  data?: any;
  isRead: boolean;
  createdAt: string;
}

export interface Banner {
  id: string;
  title: string;
  subtitle?: string;
  image: string;
  mobileImage?: string;
  link?: string;
  badge?: string;
  isActive: boolean;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  meta?: PaginationMeta;
}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage?: boolean;
  hasPrevPage?: boolean;
}

export interface DashboardStats {
  revenue: { total: number; monthly: number; daily: number };
  orders: { total: number; pending: number; processing: number };
  products: { total: number; active: number };
  customers: { total: number; newThisMonth: number };
  reviews: { total: number; pending: number };
}

export interface SupportTicket {
  id: string;
  ticketNo: string;
  subject: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  category?: string;
  messages?: TicketMessage[];
  user?: User;
  createdAt: string;
  updatedAt: string;
}

export interface TicketMessage {
  id: string;
  senderId: string;
  message: string;
  isStaff: boolean;
  createdAt: string;
}
