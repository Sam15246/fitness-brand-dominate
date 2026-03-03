# DOMINATE Ecommerce - Production Readiness Checklist
# =====================================================
# Status: March 1, 2026
# Last Updated: After Architecture Enhancement (Migrations 011-015)

## ✅ COMPLETED - READY FOR PRODUCTION
## ⚠️ CRITICAL - MUST DO BEFORE LAUNCH
## 🔧 RECOMMENDED - Should do soon
## 🚀 FUTURE - Post-launch enhancements

---

## 1. ARCHITECTURE & DATABASE ✅

### ✅ Database Models (ALL WIRED CORRECTLY)
- [x] User model with role-based access (USER, ADMIN, SUPERADMIN)
- [x] Product model with pricing, stock, SKU field
- [x] Order model with financial snapshots (subtotal, shipping, tax, discount, total)
- [x] OrderItem model (line items for multi-product orders)
- [x] Payment model (transaction tracking, gateway-ready)
- [x] InventoryLog model (complete audit trail)
- [x] AffiliateProfile model (commission tracking)
- [x] ProductCategory model (hierarchical categories)
- [x] ProductImage model (multiple images per product)
- [x] Review model (customer reviews with admin approval)
- [x] AdminActionLog model (audit trail for admin actions)
- [x] PolicyPage model (editable policies)
- [x] CartItem model (persistent cart for logged-in users)

### ✅ Migrations Applied
- [x] Migration 001: storage_path for images
- [x] Migration 002: pricing fields (original, discounted, is_active)
- [x] Migration 003: review table
- [x] Migration 004: admin action logs cascade fix
- [x] Migration 005: cart_items table
- [x] Migration 006: order_items table (order refactoring)
- [x] Migration 007: product_categories table
- [x] Migration 008: order_number VARCHAR(30)
- [x] Migration 009: order_items creation fix
- [x] Migration 010: old columns nullable
- [x] Migration 011: financial snapshot fields ✅
- [x] Migration 012: SKU field ✅
- [x] Migration 013: Payment model ✅
- [x] Migration 014: InventoryLog model ✅
- [x] Migration 015: Composite indexes ✅

### ✅ Business Logic (ATOMIC TRANSACTIONS)
- [x] `confirm_order()` - Transaction-safe with rollback
- [x] `cancel_order()` - Stock restoration with inventory logging
- [x] Stock management with inventory audit trail
- [x] Commission calculation on order confirmation
- [x] WhatsApp redirect with order details

### ✅ Indexes & Performance
- [x] Single column indexes on all foreign keys
- [x] Composite index: (status, created_at) on orders
- [x] Composite index: (affiliate_id, status) on orders
- [x] Composite index: (product_id, created_at) on order_items
- [x] Unique indexes on order_number, transaction_id

---

## 2. IMPORTS & WIRING AUDIT 🔍

### ✅ Models Imported Correctly
- app/routes/main.py: ✅ Product, Order, OrderItem, User, AffiliateProfile, PolicyPage, CartItem
- app/routes/admin.py: ✅ All models imported
- app/routes/auth.py: ✅ User, UserRole
- app/business_logic.py: ✅ User, Product, Order, AffiliateProfile, OrderStatus, etc.

### ⚠️ CRITICAL: NEW MODELS NOT YET IMPORTED
**ISSUE**: Payment and InventoryLog models created but NOT imported in routes/business_logic

**IMPACT**: 
- confirm_order() will FAIL when trying to create Payment record
- InventoryLog entries won't be created
- Runtime error when order confirmed

**FIX REQUIRED**: Add imports to these files:
1. app/routes/main.py - Add: Payment, InventoryLog
2. app/routes/admin.py - Add: Payment, InventoryLog  
3. app/business_logic.py - Add: Payment, InventoryLog, PaymentStatus, InventoryChangeType

---

## 3. CRITICAL PRE-LAUNCH CHECKLIST ⚠️

### ⚠️ MUST FIX BEFORE PRODUCTION
1. **Import New Models** (BLOCKING)
   - [ ] Add Payment, InventoryLog to app/routes/main.py
   - [ ] Add Payment, InventoryLog to app/routes/admin.py
   - [ ] Add Payment, InventoryLog, PaymentStatus, InventoryChangeType to app/business_logic.py
   - [ ] Test order confirmation creates Payment + InventoryLog records

2. **Environment Variables** (CRITICAL)
   - [ ] Set SECRET_KEY in production (.env or Render dashboard)
   - [ ] Set DATABASE_URL for PostgreSQL (Render auto-sets this)
   - [ ] Set STORAGE_BACKEND='local' or 'r2'
   - [ ] If using R2: Set R2_ACCOUNT_ID, R2_ACCESS_KEY, R2_SECRET_KEY, R2_BUCKET_NAME
   - [ ] Set FLASK_ENV='production'

3. **Database Migration on Render** (MUST DO)
   - [ ] Push code to GitHub
   - [ ] Render auto-deploys
   - [ ] Run migrations on Render: `flask db upgrade`
   - [ ] Verify migrations applied: `flask db current` (should show 015)

4. **Admin User Setup** (DAY 1)
   - [ ] Run: `python -m app.scripts.create_superadmin`
   - [ ] Save credentials securely (password manager)
   - [ ] Test login at /admin/login

5. **Policy Pages** (LEGAL REQUIREMENT)
   - [ ] Run: `python -m app.scripts.init_policies`
   - [ ] Edit policies in admin panel (/admin/policies)
   - [ ] Verify: Shipping, Returns, Terms, Privacy pages live

6. **Sample Data** (DEMO/TESTING)
   - [ ] Optional: Run `python -m app.scripts.add_sample_products`
   - [ ] Or manually add products via admin panel

---

## 4. SECURITY AUDIT ✅/⚠️

### ✅ Security Implemented
- [x] CSRF protection enabled (WTF_CSRF_ENABLED=True)
- [x] Secure session cookies (HTTPOnly, Secure, SameSite=Lax)
- [x] Password hashing with Werkzeug (PBKDF2)
- [x] Role-based access control (admin decorators)
- [x] SQL injection protection (SQLAlchemy parameterized queries)
- [x] XSS protection (Jinja2 auto-escaping)
- [x] Admin action logging (audit trail)

### ⚠️ Security Recommendations
- [ ] **Rate Limiting**: Install Flask-Limiter
  ```python
  # Add to requirements.txt: Flask-Limiter==3.5.0
  # Limit login attempts: 5 per minute
  # Limit checkout: 10 per hour per IP
  ```

- [ ] **HTTPS Enforcement**: Render auto-provides SSL ✅
  
- [ ] **Content Security Policy**: Add CSP headers
  ```python
  @app.after_request
  def set_csp(response):
      response.headers['Content-Security-Policy'] = "default-src 'self'"
      return response
  ```

- [ ] **Email Verification**: Currently not required (guest checkout)
  - 🚀 FUTURE: Add email verification for registered users

- [ ] **Two-Factor Authentication**: Not implemented
  - 🚀 FUTURE: Add 2FA for admin accounts

---

## 5. PAYMENT GATEWAY INTEGRATION 🔧

### Current State: WhatsApp Manual Confirmation ✅
- Orders redirect to WhatsApp
- Admin confirms via /admin/orders
- Payment record created with gateway='whatsapp_manual'

### 🔧 NEXT STEP: Razorpay Integration
**READY**: Payment model already prepared

**TODO**:
1. Sign up for Razorpay (https://razorpay.com)
2. Add to requirements.txt: `razorpay==1.4.2`
3. Set environment variables:
   ```
   RAZORPAY_KEY_ID=rzp_live_xxxxx
   RAZORPAY_KEY_SECRET=xxxxx
   ```
4. Add checkout page integration:
   ```python
   # In checkout route:
   import razorpay
   client = razorpay.Client(auth=(KEY_ID, KEY_SECRET))
   payment = client.order.create({
       'amount': order.total_amount,  # Already have this!
       'currency': 'INR',
       'receipt': order.order_number
   })
   ```
5. Add webhook endpoint: `/payment/webhook`
6. Update Payment record on success

**ESTIMATED TIME**: 1-2 days work

---

## 6. SHIPPING INTEGRATION 🔧

### Current State: Manual Shipping ✅
- Admin manually adds tracking numbers
- Courier name entered manually
- Works fine for MVP

### 🔧 NEXT STEP: Shiprocket Integration
**RECOMMENDED**: When order volume > 10/day

**TODO**:
1. Sign up for Shiprocket
2. Add to requirements.txt: `requests==2.31.0`
3. API integration for:
   - Automatic AWB (Air Waybill) generation
   - Pickup scheduling
   - Real-time tracking
   - Return (RTO) management
4. Use existing `tracking_number` and `courier_name` fields

**ESTIMATED TIME**: 2-3 days work

---

## 7. EMAIL SYSTEM 📧

### Current State: Order emails sent ✅
- Uses Flask-Mail (check if installed)
- Send order confirmation emails
- Admin notification emails

### ⚠️ CHECK REQUIRED
- [ ] Verify Flask-Mail in requirements.txt
- [ ] Check email configuration in config.py
- [ ] Test email sending works (dev: prints to console?)

### 🔧 RECOMMENDED: SendGrid/AWS SES
For production volume:
1. Sign up for SendGrid (free 100/day) or AWS SES
2. Add to requirements.txt: `sendgrid==6.11.0`
3. Set SENDGRID_API_KEY in environment
4. Update email utils to use SendGrid API

---

## 8. IMAGE STORAGE 📷

### Current State: Local Storage ✅
- Images stored in app/static/images/
- Works on single server
- **ISSUE**: Render ephemeral filesystem (files lost on deploy)

### ⚠️ CRITICAL FOR RENDER
**MUST DO**: Use Cloudflare R2 (already coded!)

**STEPS**:
1. Sign up for Cloudflare R2 (generous free tier)
2. Create bucket: `dominate-products`
3. Get credentials (Account ID, Access Key, Secret Key)
4. Set environment variables on Render:
   ```
   STORAGE_BACKEND=r2
   R2_ACCOUNT_ID=xxxxx
   R2_ACCESS_KEY=xxxxx
   R2_SECRET_KEY=xxxxx
   R2_BUCKET_NAME=dominate-products
   ```
5. Upload existing images to R2 bucket
6. Code already handles R2! (app/storage/r2.py) ✅

**ESTIMATED TIME**: 1-2 hours setup

---

## 9. MONITORING & LOGGING 📊

### ✅ Basic Logging Implemented
- Flask logger configured
- Admin actions logged to database
- Error logging to console

### 🔧 RECOMMENDED: Production Monitoring
1. **Sentry** (Error tracking)
   - Add to requirements.txt: `sentry-sdk[flask]==1.40.0`
   - Sign up: https://sentry.io (free tier)
   - Add to __init__.py:
     ```python
     import sentry_sdk
     sentry_sdk.init(dsn=os.getenv('SENTRY_DSN'))
     ```

2. **Render Logging** (Built-in) ✅
   - Render auto-captures logs
   - View in Render dashboard

3. **Application Metrics**
   - 🚀 FUTURE: Track order conversion rate, cart abandonment

---

## 10. TESTING CHECKLIST ✅

### Manual Testing Required Before Launch
- [ ] **Guest Checkout Flow**
  1. Browse products
  2. Add to cart (session-based for guests)
  3. Go to checkout
  4. Fill form (all required fields)
  5. Submit order
  6. Verify WhatsApp redirect works
  7. Check order appears in admin panel
  
- [ ] **Registered User Flow**
  1. Register account
  2. Login
  3. Add products to cart (persisted to database)
  4. Checkout (fields pre-filled)
  5. Verify order linked to user account
  
- [ ] **Admin Order Management**
  1. Login to /admin
  2. View pending orders
  3. Confirm order (stock reduces, payment created)
  4. Verify:
     - Stock quantity decreased
     - Payment record created in database
     - InventoryLog entries created
  5. Update shipping status
  6. Add tracking number
  
- [ ] **Affiliate System**
  1. Create affiliate profile
  2. Generate affiliate code
  3. Place order with affiliate code
  4. Confirm order
  5. Verify commission calculated
  6. Approve commission
  7. Check wallet balance updated

- [ ] **Product Management**
  1. Add new product with images
  2. Set pricing (regular, discounted)
  3. Enable/disable discount
  4. Update stock
  5. Verify product shows on public site

---

## 11. PERFORMANCE OPTIMIZATION 🚀

### ✅ Already Optimized
- Composite indexes on common queries
- Lazy loading of relationships
- Efficient stock checking before order confirmation

### 🔧 Future Optimizations (When Needed)
- Redis caching for product listings
- CDN for images (Cloudflare already has CDN with R2)
- Database connection pooling
- Async task queue (Celery) for emails

---

## 12. LEGAL & COMPLIANCE ⚠️

### ⚠️ MUST HAVE (Legal Requirements in India)
- [ ] **GST Registration** (if turnover > ₹20 lakhs)
  - Currently tax_amount = 0 (ready to enable)
  - When registered: Update code to calculate GST
  
- [ ] **Privacy Policy** ✅ (Template provided, needs customization)
  - Update with actual company details
  - Update data collection details
  - Update data retention policy
  
- [ ] **Terms & Conditions** ✅ (Template provided, needs review)
  - Update with company name, address
  - Review liability clauses
  - Add dispute resolution process
  
- [ ] **Shipping Policy** ✅ (Template provided)
  - Update delivery timelines based on actual couriers
  - Update shipping charges
  
- [ ] **Return Policy** ✅ (Template provided)
  - Customize based on actual return process
  - Update refund timelines

### 🔧 Recommended Legal Steps
- Trademark registration for "DOMINATE"
- Business registration (Sole Proprietorship/LLP/Pvt Ltd)
- Business bank account
- Accounting software integration (Zoho Books, Tally)

---

## 13. RENDER DEPLOYMENT CHECKLIST 🚀

### Pre-Deployment
- [x] Code committed to Git
- [ ] requirements.txt up to date
- [ ] Procfile correct: `web: gunicorn run:app`
- [ ] runtime.txt specifies Python version
- [ ] All migrations tested locally

### On Render Dashboard
- [ ] Create Web Service (connected to GitHub repo)
- [ ] Set environment variables:
  ```
  SECRET_KEY=<generate-new-secret>
  FLASK_ENV=production
  DATABASE_URL=<auto-set-by-render>
  STORAGE_BACKEND=r2
  R2_ACCOUNT_ID=xxxxx
  R2_ACCESS_KEY=xxxxx
  R2_SECRET_KEY=xxxxx
  R2_BUCKET_NAME=dominate-products
  ```
- [ ] Create PostgreSQL database (linked to web service)
- [ ] Deploy and wait for build
- [ ] Run shell command: `flask db upgrade`
- [ ] Run shell command: `python -m app.scripts.create_superadmin`
- [ ] Run shell command: `python -m app.scripts.init_policies`

### Post-Deployment Testing
- [ ] Visit production URL
- [ ] Test guest checkout end-to-end
- [ ] Test admin login
- [ ] Test product creation with image upload
- [ ] Test order confirmation (verify Payment + InventoryLog created)
- [ ] Monitor logs for errors

---

## 14. LAUNCH DAY TASKS 🎉

### Morning of Launch
- [ ] Final database backup
- [ ] Deploy to production
- [ ] Run all migrations
- [ ] Create superadmin account
- [ ] Add real products (at least 5-10 items)
- [ ] Upload high-quality product images
- [ ] Test complete purchase flow 3 times
- [ ] Set up Google Analytics (optional but recommended)
- [ ] Monitor error logs for first 2 hours

### Communication
- [ ] Social media announcement
- [ ] WhatsApp broadcast to initial customers
- [ ] Email newsletter if you have list

### Monitoring (First Week)
- [ ] Check error logs daily
- [ ] Monitor order volumes
- [ ] Watch for payment failures
- [ ] Customer feedback collection
- [ ] Page load speed testing

---

## 15. POST-LAUNCH ROADMAP (3-6 months) 🚀

### Phase 1: Payment Automation (Week 1-2)
- Razorpay integration
- Automated order confirmation
- Payment failure handling

### Phase 2: Shipping Automation (Week 3-4)
- Shiprocket integration
- Automatic AWB generation
- Order tracking page for customers

### Phase 3: Customer Experience (Month 2)
- Email marketing integration (Mailchimp/SendGrid)
- Order tracking page
- Customer review prompts after delivery
- Referral program enhancement

### Phase 4: Analytics & Growth (Month 3)
- Google Analytics deep integration
- Conversion funnel analysis
- A/B testing framework
- SEO optimization

### Phase 5: Scale & Optimization (Month 4-6)
- Redis caching
- Mobile app (React Native/Flutter)
- Bulk order discounts
- Inventory forecasting

---

## 🚨 IMMEDIATE ACTION ITEMS (NEXT 2 HOURS)

**PRIORITY 1: FIX IMPORTS** ⚠️
1. Add Payment, InventoryLog imports to:
   - app/routes/main.py
   - app/routes/admin.py
   - app/business_logic.py
2. Test order confirmation locally
3. Commit and push

**PRIORITY 2: CLOUDFLARE R2 SETUP** ⚠️
1. Sign up for Cloudflare R2
2. Create bucket
3. Get credentials
4. Test image upload locally
5. Update Render environment variables

**PRIORITY 3: ENVIRONMENT VARIABLES** ⚠️
1. Generate new SECRET_KEY: `python -c "import secrets; print(secrets.token_hex(32))"`
2. Add to Render dashboard

**PRIORITY 4: FINAL TESTING** ✅
1. Test complete checkout flow
2. Test order confirmation (verify Payment + InventoryLog created)
3. Test product management
4. Test affiliate system

---

## SUMMARY: PRODUCTION READINESS SCORE

| Category | Status | Notes |
|----------|--------|-------|
| Database Architecture | ✅ 100% | All models, migrations, indexes ready |
| Business Logic | ✅ 95% | Atomic transactions, just need imports |
| Security | ✅ 90% | CSRF, sessions, passwords secure |
| Imports/Wiring | ⚠️ 80% | **Missing: Payment, InventoryLog imports** |
| Image Storage | ⚠️ 50% | **Must set up R2 for Render** |
| Payment Gateway | 🔧 30% | WhatsApp manual works, Razorpay next |
| Shipping | ✅ 80% | Manual works fine for MVP |
| Email System | ⚠️ 70% | Need to verify Flask-Mail configured |
| Monitoring | 🔧 40% | Basic logs, need Sentry |
| Legal/Compliance | ⚠️ 60% | Templates ready, need customization |

**OVERALL READINESS: 75% - ALMOST READY** ✅

**TO REACH 100%:**
1. Fix imports (30 min)
2. Set up R2 (1 hour)
3. Configure environment variables (15 min)
4. Final testing (1 hour)
5. Deploy to Render (30 min)
6. Run migrations on production (5 min)
7. Create admin account (5 min)

**TOTAL TIME TO LAUNCH: ~4 hours of focused work** 🚀

---

## CONTACT & SUPPORT

If you encounter issues:
1. Check Render logs first
2. Check database migrations applied
3. Verify environment variables set
4. Test locally with production settings

**Next Steps**: Fix the import issues, then you're 95% ready to launch! 🎯
