# Jirani Shop POS - Deployment & Testing Guide

## Overview

This is a production-ready offline-first retail management system for small and medium businesses in Kenya. The system is built with Next.js 16, Supabase, and offline-first capabilities using IndexedDB.

## Features Implemented

### Core Features (Week 1)
- ✅ Offline-first architecture with automatic sync
- ✅ Point of Sale (POS) system
- ✅ Inventory management with stock tracking
- ✅ Customer management with credit limits
- ✅ Credit sales and debt tracking
- ✅ Expense tracking
- ✅ Comprehensive reporting with charts
- ✅ Notification center with alerts
- ✅ Receipt templates with QR codes
- ✅ Mobile-responsive design

### Technical Stack
- **Frontend**: Next.js 16, React 19, TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui
- **Database**: Supabase (PostgreSQL)
- **Offline Storage**: IndexedDB with Dexie.js
- **State Management**: Zustand, React Query, IndexedDB
- **Charts**: Recharts
- **Authentication**: Supabase Auth with JWT

## Prerequisites

1. Node.js 18+ and pnpm
2. Supabase project set up
3. Environment variables configured

## Installation

```bash
# Clone the repository
git clone <repo-url>
cd jirani-shop-pos

# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local

# Database setup (run migrations)
pnpm run migrate

# Start development server
pnpm dev
```

## Environment Variables

Create `.env.local` with:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Key Features & How They Work

### 1. Offline-First Architecture

The system automatically detects internet connectivity and:
- **When Online**: Syncs all queued changes to Supabase
- **When Offline**: Stores all operations locally in IndexedDB and queues them
- **Auto-Sync**: Automatically syncs when connection is restored

Status indicator in header shows: Online / Offline / Syncing / Sync Failed

**Technical Implementation**:
- `lib/offline/db.ts` - IndexedDB schema and setup
- `lib/offline/sync-queue.ts` - Manages queued operations
- `lib/offline/persistence.ts` - Persistence helpers
- `hooks/useOfflineSync.ts` - React hook for offline status

### 2. Point of Sale (POS)

**Features**:
- Customer lookup
- Barcode scanning ready
- Cash/M-Pesa/Card/Credit payment options
- Guest checkout
- Real-time inventory checks
- Receipt generation with QR code

**Files**:
- `app/dashboard/pos/page.tsx`
- `components/pos/pos-client.tsx`
- `app/actions/pos.ts` - POS server actions

### 3. Inventory Management

**Features**:
- Product CRUD with all details (cost, selling price, barcode, SKU)
- Stock level tracking
- Low stock and out-of-stock alerts
- Stock movement history
- Stock adjustments with reasons

**Files**:
- `app/dashboard/inventory/page.tsx`
- `components/inventory/inventory-client.tsx`
- `components/inventory/product-form.tsx`
- `app/actions/inventory.ts`

### 4. Customer & Credit Sales

**Features**:
- Customer profiles with credit limits
- Outstanding balance tracking
- Credit sale recording
- Payment tracking with automatic balance updates
- Overdue status tracking

**Files**:
- `app/dashboard/customers/page.tsx`
- `components/customers/customer-list.tsx`
- `components/customers/credit-sales.tsx`
- `app/actions/customers.ts`
- `app/actions/credit-sales.ts`

### 5. Expenses Tracking

**Features**:
- Track 7 expense categories (rent, electricity, water, salaries, internet, transport, misc)
- Daily and monthly summaries
- Included in profit calculations

**Files**:
- `app/dashboard/expenses/page.tsx`
- `components/expenses/expense-form.tsx`
- `components/expenses/expenses-list.tsx`
- `app/actions/expenses.ts`

### 6. Reports & Analytics

**Features**:
- Daily, weekly, monthly sales reports
- Inventory valuation reports
- Credit/debtors reports
- Profit reports (Revenue - COGS - Expenses)
- Charts and visualizations

**Files**:
- `app/dashboard/reports/page.tsx`
- `components/reports/reports-dashboard.tsx`
- `app/actions/reports.ts`

### 7. Notifications

**Features**:
- Low stock alerts
- Out of stock alerts
- Debt due notifications
- Debt overdue alerts
- Payment received confirmations
- Sync status notifications
- Future SMS/WhatsApp ready

**Files**:
- `app/dashboard/notifications/page.tsx`
- `components/notifications/notification-center.tsx`
- `app/actions/notifications.ts`

### 8. Receipt Management

**Features**:
- Professional receipt templates
- QR code support
- Credit sale details on receipts
- Print functionality
- PDF download ready

**Files**:
- `components/receipts/receipt-template.tsx`
- `components/receipts/receipt-preview-modal.tsx`

## Database Schema

Key tables (with shop_id for multi-tenancy):
- `shops` - Business information
- `profiles` - User information
- `products` - Product catalog
- `stock_movements` - Inventory history
- `customers` - Customer records
- `sales` - Sales transactions
- `sale_items` - Individual items in sales
- `payments` - Payment records
- `expenses` - Business expenses
- `notifications` - User alerts
- `sync_queue` - Offline operations queue

## Testing Checklist

### Offline Mode Testing

```bash
# 1. Start the app and open DevTools (F12)
# 2. Go to Network tab
# 3. Select "Offline" mode
# 4. Try these operations:
   - Create a new product
   - Adjust stock
   - Create a customer
   - Record a cash sale
   - Record a credit sale
   - Record an expense
# 5. Check that sync status shows "Offline"
# 6. Check IndexedDB for stored data (Application > IndexedDB > jirani_db)
# 7. Go back online
# 8. Verify sync status changes to "Syncing" then "Online"
# 9. Verify all operations were synced to Supabase
```

### Production Build

```bash
# Build for production
pnpm run build

# Test production build locally
pnpm run start

# Check for TypeScript errors
pnpm run type-check

# Run ESLint
pnpm run lint
```

### Mobile Testing

```bash
# Test on mobile viewport
pnpm dev
# DevTools > Toggle device toolbar (Ctrl+Shift+M)
# Test on:
  - iPhone 14 (390 x 844)
  - iPad Pro (1024 x 1366)
  - Android phone (412 x 915)
```

### End-to-End Testing

1. **Authentication Flow**
   - Sign up new user
   - Sign in
   - Sign out
   - Verify session persists

2. **POS Flow**
   - Create new customer
   - Record cash sale
   - Record credit sale
   - View receipt and print

3. **Inventory Flow**
   - Add products
   - Adjust stock
   - Verify low stock alert
   - Check stock movement history

4. **Credit Sales Flow**
   - Record credit sale for customer
   - Record partial payment
   - Record full payment
   - Verify balance updates

5. **Offline Sync**
   - Go offline
   - Make multiple transactions
   - Go online
   - Verify all sync

## Deployment

### Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set environment variables in Vercel dashboard
# Enable analytics and monitoring
```

### Deploy as PWA (Progressive Web App)

The app is already PWA-ready:
- Service Worker support
- Offline capability
- Add to home screen
- App-like experience on mobile

### Deploy as Android APK

Coming soon with Capacitor:
```bash
# Generate APK
npx cap add android
npx cap build android
```

## Performance Optimization

### Metrics to Monitor

- **LCP** (Largest Contentful Paint) - Target: < 2.5s
- **INP** (Interaction to Next Paint) - Target: < 200ms
- **CLS** (Cumulative Layout Shift) - Target: < 0.1

### Optimization Strategies

1. Code splitting for large pages
2. Image optimization (use Next.js Image component)
3. Database query optimization with indexes
4. Lazy loading for heavy components
5. CSS-in-JS optimization (Tailwind)

## Security Best Practices

1. ✅ Row Level Security (RLS) enabled on all tables
2. ✅ Server-side validation on all mutations
3. ✅ Input sanitization
4. ✅ SQL injection prevention (parameterized queries)
5. ✅ XSS prevention
6. ✅ CSRF protection (built-in with Next.js)
7. ✅ JWT session management
8. ✅ HTTPS enforcement

## Future Enhancements

1. M-Pesa Daraja integration
2. Barcode scanner integration
3. Multi-branch support
4. Payroll module
5. Supplier management
6. Loyalty program
7. Customer mobile app
8. AI sales forecasting
9. E-commerce integration
10. Advanced analytics

## Troubleshooting

### Offline Sync Not Working

```typescript
// Check sync status
import { useOfflineSync } from '@/hooks/useOfflineSync'

const { isSyncing, syncError, lastSync } = useOfflineSync()
console.log('[v0] Sync status:', { isSyncing, syncError, lastSync })
```

### IndexedDB Not Persisting

1. Check browser storage limits (usually 50MB+)
2. Verify IndexedDB is not in private mode
3. Clear browser cache and retry
4. Check browser console for errors

### Sync Queue Stuck

1. Check network connectivity
2. Verify Supabase connection
3. Clear sync queue: `await clearSyncQueue()`
4. Retry sync: `await performSync()`

## Support

For issues, questions, or contributions:
- GitHub Issues: [Project Issues]
- Email: support@jiranishop.ke
- Documentation: [Wiki]

## License

Proprietary - Jirani Shop

---

**Build Date**: July 2024
**Version**: 1.0.0
**Status**: Production Ready
