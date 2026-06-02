# 🏷️ BILY GAMES AND GADGET
### Enterprise-Grade E-Commerce Platform

A world-class, production-ready digital marketplace for premium gadgets, gaming gear, and tech accessories — built to compete with Amazon's architecture, Apple Store's UI/UX, and Shopify's scalability.

---

## 📋 Table of Contents
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Development Setup](#development-setup)
- [Production Deployment](#production-deployment)
- [API Documentation](#api-documentation)
- [Environment Variables](#environment-variables)

---

## ✨ Features

### Customer Features
- **Product Catalog** — 9 categories with hierarchy: Mobile, Computers, Gaming, Audio, Wearables, Cameras, Smart Home, Accessories, Power
- **Advanced Search** — Real-time suggestions, category/price/brand/rating filters
- **Shopping Cart** — Persistent cart for logged-in users + guest cart via session
- **Secure Checkout** — Address management, coupon codes, order summary
- **Payment Integration** — Paystack & Flutterwave with webhook verification
- **Order Tracking** — Full lifecycle: Pending → Paid → Processing → Shipped → Delivered
- **Wishlist** — Save & sync favorites across devices
- **Reviews & Ratings** — Star ratings with verified purchase tagging
- **Real-time Notifications** — Order updates, payment confirmations
- **Customer Support** — Ticket-based support system

### Admin Features
- **Analytics Dashboard** — Revenue charts, order distribution, top products
- **Product Management** — Full CRUD, image gallery, variants, attributes
- **Inventory Control** — Stock tracking, low-stock alerts, adjustment history
- **Order Management** — Status updates, timeline tracking
- **Customer Management** — User list, account toggle
- **Coupon Engine** — Percentage, fixed, free-shipping coupons
- **Banner Management** — Homepage banner CMS
- **Review Moderation** — Approve/reject reviews

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Frontend** | Next.js 14 (App Router), TypeScript, Tailwind CSS, ShadCN UI |
| **State Management** | Zustand + TanStack Query |
| **Backend** | NestJS, TypeScript, REST API |
| **Database** | PostgreSQL + Prisma ORM |
| **Cache** | Redis |
| **Auth** | JWT + bcrypt + RBAC |
| **Payments** | Paystack + Flutterwave |
| **Storage** | AWS S3 / Cloudinary |
| **Email** | SendGrid |
| **SMS** | Twilio |
| **Containerization** | Docker + Docker Compose |
| **Reverse Proxy** | Nginx |

---

## 📁 Project Structure

```
bily-games-gadget/
├── backend/                    # NestJS API
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/           # JWT authentication
│   │   │   ├── users/          # User profiles & addresses
│   │   │   ├── products/       # Product catalog CRUD
│   │   │   ├── categories/     # Category hierarchy
│   │   │   ├── cart/           # Shopping cart
│   │   │   ├── orders/         # Order lifecycle
│   │   │   ├── payments/       # Paystack + Flutterwave
│   │   │   ├── reviews/        # Product reviews
│   │   │   ├── wishlist/       # Saved products
│   │   │   ├── inventory/      # Stock management
│   │   │   ├── notifications/  # Email/SMS alerts
│   │   │   ├── support/        # Customer tickets
│   │   │   ├── analytics/      # Dashboard stats
│   │   │   ├── search/         # Product search
│   │   │   ├── coupons/        # Discount codes
│   │   │   └── banners/        # Homepage banners
│   │   ├── prisma/             # Database service
│   │   └── common/             # Guards, filters, decorators
│   ├── prisma/
│   │   ├── schema.prisma       # Full database schema
│   │   └── seed.ts             # Database seeder
│   └── Dockerfile
│
├── frontend/                   # Next.js App
│   ├── src/
│   │   ├── app/
│   │   │   ├── (store)/        # Customer storefront
│   │   │   │   ├── home/       # Homepage
│   │   │   │   ├── products/   # Product listing + detail
│   │   │   │   ├── checkout/   # Checkout flow
│   │   │   │   ├── account/    # User account
│   │   │   │   └── wishlist/   # Wishlist
│   │   │   ├── (admin)/        # Admin dashboard
│   │   │   │   └── admin/
│   │   │   │       ├── dashboard/
│   │   │   │       ├── products/
│   │   │   │       ├── orders/
│   │   │   │       ├── customers/
│   │   │   │       ├── inventory/
│   │   │   │       ├── analytics/
│   │   │   │       └── coupons/
│   │   │   └── (auth)/         # Auth pages
│   │   ├── components/
│   │   │   ├── layout/         # Navbar, Footer
│   │   │   ├── product/        # ProductCard
│   │   │   ├── cart/           # CartDrawer
│   │   │   └── home/           # Hero, Categories, etc.
│   │   ├── store/              # Zustand stores
│   │   ├── lib/                # API client, utils
│   │   └── types/              # TypeScript types
│   └── Dockerfile
│
├── nginx/
│   └── nginx.conf              # Production Nginx config
├── docker-compose.yml
└── .env.example
```

---

## 🚀 Quick Start (Docker)

The fastest way to run the full platform:

```bash
# 1. Clone and navigate
cd bily-games-gadget

# 2. Copy environment files
cp .env.example .env
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local

# 3. Edit environment variables (see below)
nano backend/.env

# 4. Start all services
docker compose up -d

# 5. Run database migrations and seed
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx ts-node prisma/seed.ts

# 6. Access the application
# Frontend: http://localhost:3000
# Admin:    http://localhost:3000/admin/dashboard
# API Docs: http://localhost:4000/api/docs
```

**Default Admin Credentials:**
- Email: `admin@bilygamesgadget.com`
- Password: `Admin@123456`

---

## 💻 Development Setup

### Prerequisites
- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- pnpm or npm

### Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Copy and configure environment
cp .env.example .env
# Edit .env with your values

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma migrate dev --name init

# Seed database
npx ts-node prisma/seed.ts

# Start development server
npm run start:dev
# API: http://localhost:4000/api/v1
# Docs: http://localhost:4000/api/docs
```

### Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Copy environment
cp .env.local.example .env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:4000/api/v1

# Start development server
npm run dev
# App: http://localhost:3000
```

---

## 🌐 Production Deployment

### Option 1: Docker Compose (Recommended)

```bash
# 1. Set production environment variables
cp backend/.env.example backend/.env
# Configure: DATABASE_URL, JWT_SECRET, payment keys, email keys

# 2. Build and start
docker compose -f docker-compose.yml up -d --build

# 3. Run migrations
docker compose exec backend npx prisma migrate deploy

# 4. Set up SSL (Let's Encrypt)
certbot --nginx -d bilygamesgadget.com -d www.bilygamesgadget.com
```

### Option 2: Manual Deployment

```bash
# Backend
cd backend
npm install --production
npm run build
npx prisma migrate deploy
npm start

# Frontend
cd frontend
npm install
npm run build
npm start
```

---

## 📚 API Documentation

Full Swagger documentation is available at `/api/docs` in development mode.

### Key Endpoints

#### Authentication
```
POST /api/v1/auth/register     Register new user
POST /api/v1/auth/login        Login
POST /api/v1/auth/refresh      Refresh access token
POST /api/v1/auth/logout       Logout
GET  /api/v1/auth/profile      Get current user
```

#### Products
```
GET  /api/v1/products                  List products (with filters)
GET  /api/v1/products/featured         Featured products
GET  /api/v1/products/:slug            Product detail
POST /api/v1/products                  Create product [Admin]
PUT  /api/v1/products/:id              Update product [Admin]
```

#### Cart
```
GET    /api/v1/cart                    Get cart
POST   /api/v1/cart/items              Add item
PUT    /api/v1/cart/items/:id          Update quantity
DELETE /api/v1/cart/items/:id          Remove item
```

#### Orders
```
POST /api/v1/orders                    Place order
GET  /api/v1/orders/my-orders          My orders
PUT  /api/v1/orders/my-orders/:id/cancel  Cancel order
GET  /api/v1/orders/admin              All orders [Admin]
PUT  /api/v1/orders/admin/:id/status   Update status [Admin]
```

#### Payments
```
POST /api/v1/payments/initiate                  Initiate payment
GET  /api/v1/payments/verify/paystack/:ref      Verify Paystack
GET  /api/v1/payments/verify/flutterwave/:id    Verify Flutterwave
POST /api/v1/payments/webhooks/paystack         Paystack webhook
POST /api/v1/payments/webhooks/flutterwave      Flutterwave webhook
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `REDIS_HOST/PORT/PASSWORD` | Redis connection |
| `JWT_SECRET` | JWT signing secret (min 32 chars) |
| `JWT_REFRESH_SECRET` | Refresh token secret |
| `PAYSTACK_SECRET_KEY` | Paystack secret key |
| `FLUTTERWAVE_SECRET_KEY` | Flutterwave secret key |
| `CLOUDINARY_*` | Cloudinary credentials |
| `SENDGRID_API_KEY` | SendGrid API key |
| `TWILIO_*` | Twilio credentials |

### Frontend (`frontend/.env.local`)

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL |
| `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` | Paystack public key |

---

## 🔒 Security Features

- **JWT Authentication** with refresh token rotation
- **bcrypt** password hashing (12 rounds)
- **RBAC** — SUPER_ADMIN, ADMIN, CUSTOMER roles
- **Rate limiting** — 100 req/min globally, 5 req/min for auth
- **Input validation** — All endpoints use class-validator DTOs
- **Helmet.js** — Security headers
- **CORS** — Restricted to configured origins
- **SQL injection protection** — Prisma ORM parameterized queries
- **Webhook verification** — HMAC signature validation for Paystack & Flutterwave
- **Nginx** — SSL termination, rate limiting, security headers

---

## 📊 Database Schema

Complete PostgreSQL schema with:
- **Users** — Authentication, profiles, roles
- **Products** — Full catalog with variants, images, attributes
- **Categories** — Unlimited hierarchy depth
- **Inventory** — Per-product and per-variant stock tracking
- **Orders** — Full lifecycle with timeline history
- **Payments** — Multi-provider payment records
- **Reviews** — Verified purchase reviews
- **Wishlist** — User saved products
- **Coupons** — Flexible discount system
- **Notifications** — User notification system
- **Support Tickets** — Customer support threads

---

## 👥 Default Roles

| Role | Access |
|------|--------|
| `SUPER_ADMIN` | Full platform access |
| `ADMIN` | Products, orders, customers, inventory |
| `CUSTOMER` | Store, cart, orders, profile |

---

Built with ❤️ for **BILY GAMES AND GADGET** — A world-class tech marketplace.
