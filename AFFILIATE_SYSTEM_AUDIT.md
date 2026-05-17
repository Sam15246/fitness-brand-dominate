# Affiliate System Audit Report

## Overview
The affiliate system has **partial implementation** with critical gaps. The core logic exists but the admin interface is incomplete.

---

## ✅ What's Working

### 1. Affiliate Profile Creation
**Flow**: Admin creates affiliate profile → AffiliateProfile record created
- **Endpoint**: `POST /admin/users/{user_id}/affiliate-profile`
- **Parameters**: `commission_percent` (0-100)
- **Auto-generated**: `affiliate_code` (e.g., "JOHN123")
- **Status**: Active by default

### 2. Affiliate Code Validation
**Flow**: Customer uses affiliate code at checkout → Code validated
- **Logic in** `app/routes/api_v1.py:_resolve_coupon()` (lines 404-410)
- **Behavior**: If code matches `AffiliateProfile.affiliate_code`, no error returned (valid)
- **Result**: System allows the code to be used

### 3. Affiliate Attribution at Checkout
**Flow**: Coupon code applied → Order linked to affiliate
- **Location**: `app/routes/api_v1_checkout_orders.py` (lines 140-143)
- **Logic**:
  ```python
  if coupon and coupon.coupon_type == 'affiliate':
      order.affiliate_id = coupon.affiliate_id
  else:
      affiliate_profile, _ = validate_affiliate_code(coupon_code)
      if affiliate_profile:
          order.affiliate_id = affiliate_profile.user_id
  ```
- **Status**: ✅ Working for both coupon and direct code paths

### 4. Discount Application at Checkout
**Flow**: Coupon with discount applied → Order saved with discount
- **Stored in**: `order.applied_discount` (in paise)
- **Calculation**: `coupon.calculate_discount(cart_total)`
- **Status**: ✅ Working correctly

### 5. Commission Calculation (Order Confirmation)
**Flow**: Admin confirms order → Commission calculated
- **Location**: `app/models.py:Order.confirm()` (lines 1599-1603)
- **Formula**: 
  ```python
  commission_base = subtotal_amount - discount_amount  # ACTUAL REVENUE
  commission = commission_base * (affiliate_percent / 100)
  ```
- **Key Feature**: Commission calculated on **ACTUAL REVENUE AFTER DISCOUNT** ✅
- **Status**: ✅ Correctly handles affiliate discount impact

### 6. Commission Approval & Wallet Credit
**Flow**: Admin approves commission → Affiliate wallet credited
- **Endpoint**: `POST /admin/affiliates/{affiliate_id}/approve-commission`
- **Business Logic** in `app/business_logic.py:AffiliateManager.approve_commission()`
- **Result**: Payment record created, wallet_balance updated
- **Status**: ✅ Working

### 7. Affiliate Dashboard
**Endpoint**: `GET /affiliate/dashboard`
- **Shows**:
  - Affiliate code
  - Total orders
  - Pending commissions
  - Approved commissions
  - Total redeemed amount
  - Recent orders with status
- **Status**: ✅ API ready (frontend needed)

---

## ⚠️ Critical Missing Features

### ISSUE #1: No Way to Link Coupon to Affiliate ❌
**Problem**: Admin can create a coupon with `coupon_type='affiliate'` but cannot set `affiliate_id`

**Affected Functions**:
- `app/routes/api_v1_admin.py:admin_create_coupon()` (line 1376)
  - Missing `affiliate_id` parameter in payload
  - Never sets coupon.affiliate_id
  
- `app/routes/api_v1_admin.py:admin_update_coupon()` (line 1425)
  - Missing `affiliate_id` parameter in payload
  - Never updates coupon.affiliate_id

**Impact**: Even if admin creates a coupon with `coupon_type='affiliate'`, it won't work because `coupon.affiliate_id` will be NULL.

**Test Case That Fails**:
1. Admin creates affiliate profile for User A → affiliate_code="USER_A_123"
2. Admin creates coupon "PROMO_A" with coupon_type='affiliate'
3. **MISSING**: Admin cannot link "PROMO_A" to User A's affiliate profile
4. Customer uses "PROMO_A" → Gets discount ✅ but affiliate gets NO commission ❌

---

### ISSUE #2: No Auto-Coupon Creation for Affiliate ❌
**Current State**: When affiliate profile is created, no coupon is automatically generated

**Current Workaround**: Use affiliate code directly (no discount, referral only)

**Ideal Flow**:
1. Admin makes user affiliate → System should auto-create coupon
2. Coupon code = affiliate code (e.g., "USER_A_123")
3. Coupon type = "affiliate"
4. Coupon affiliate_id = user_id
5. Coupon has default discount (e.g., 5% off)

**Missing**: No automation in `AffiliateManager.create_affiliate_profile()`

---

## 📊 Current System Behavior

### Scenario A: Using Affiliate Code Directly (e.g., "USER_A_123")
```
Customer → Enters "USER_A_123" at checkout
    ↓
Coupon not found in CouponCode table
    ↓
Affiliate code found in AffiliateProfile table ✅
    ↓
Order.affiliate_id = User A's ID ✅
    ↓
NO DISCOUNT APPLIED ❌ (discount=0)
    ↓
Order Confirmed
    ↓
Commission = 0 ❌ (because no revenue was lost)
```

### Scenario B: Using Affiliate Coupon (if one exists)
```
Customer → Enters coupon code at checkout
    ↓
Coupon found + coupon.coupon_type='affiliate'
    ↓
coupon.affiliate_id = NULL ❌ (BUG: never set by admin)
    ↓
Order.affiliate_id = NULL ❌ (not linked to affiliate)
    ↓
DISCOUNT APPLIED ✅ (customer gets discount)
    ↓
Order Confirmed
    ↓
Commission = 0 ❌ (no affiliate linked)
```

### Scenario C: What SHOULD Happen
```
Customer → Enters coupon code linked to affiliate
    ↓
Coupon found + coupon.coupon_type='affiliate'
    ↓
coupon.affiliate_id = User A's ID ✅
    ↓
Order.affiliate_id = User A's ID ✅
    ↓
DISCOUNT APPLIED ✅ (customer gets discount)
    ↓
Order Confirmed
    ↓
commission_base = subtotal - discount ✅
    ↓
Commission = commission_base * percent ✅ (CORRECT)
```

---

## 🔧 Required Fixes

### Fix #1: Add affiliate_id to coupon create endpoint
**File**: `app/routes/api_v1_admin.py:admin_create_coupon()` (line 1376)

**Add to endpoint**:
```python
@api_v1_bp.post('/admin/coupons')
def admin_create_coupon():
    # ... existing code ...
    
    affiliate_id = parse_int(payload.get('affiliate_id'), 0) or None
    if affiliate_id and affiliate_id > 0:
        # Validate affiliate exists
        affiliate = AffiliateProfile.query.get(affiliate_id)  # Wrong! AffiliateProfile.id is not user_id
        # Should be:
        affiliate = AffiliateProfile.query.filter_by(user_id=affiliate_id).first()
        if not affiliate:
            return api_error('Affiliate not found', status=404)
    
    coupon = CouponCode(
        code=code,
        # ... existing fields ...
        affiliate_id=affiliate_id,  # ADD THIS LINE
        # ...
    )
```

### Fix #2: Add affiliate_id to coupon update endpoint
**File**: `app/routes/api_v1_admin.py:admin_update_coupon()` (line 1425)

**Add to endpoint**:
```python
if 'affiliate_id' in payload:
    affiliate_id = parse_int(payload.get('affiliate_id'), 0) or None
    if affiliate_id and affiliate_id > 0:
        affiliate = AffiliateProfile.query.filter_by(user_id=affiliate_id).first()
        if not affiliate:
            return api_error('Affiliate not found', status=404)
    coupon.affiliate_id = affiliate_id
```

### Fix #3: Update serializer to include affiliate_id
**File**: `app/routes/api_v1.py:_serialize_admin_coupon()` (line 48)

**Check if it includes**:
```python
'affiliate_id': coupon.affiliate_id,
'affiliate_code': coupon.affiliate.name if coupon.affiliate else None,
```

### Fix #4: Auto-coupon creation (Optional but recommended)
**File**: `app/business_logic.py:AffiliateManager.create_affiliate_profile()`

**Add after profile creation**:
```python
# Auto-create coupon for affiliate
coupon = CouponCode(
    code=affiliate_code,
    discount_percent=5,  # Default 5% discount
    coupon_type='affiliate',
    affiliate_id=user_id,
    is_active=True,
    max_uses=None,  # Unlimited
    min_order_value=0
)
db.session.add(coupon)
```

---

## ✅ Verification Checklist

After implementing fixes:

- [ ] Admin can create coupon with `coupon_type='affiliate'`
- [ ] Admin can select affiliate when creating affiliate coupon
- [ ] Affiliate coupon has `affiliate_id` set correctly
- [ ] Customer uses affiliate coupon → gets discount
- [ ] Order.affiliate_id is set to correct affiliate
- [ ] When order confirmed → commission calculated correctly
- [ ] Commission = (subtotal - discount) * percent
- [ ] Admin can approve commission
- [ ] Affiliate wallet credited

---

## 📈 Commission Logic Verification

**Test Order**:
- Product: ₹1000
- Quantity: 1
- Subtotal: ₹1000
- Affiliate Discount: 10% = ₹100
- **Actual subtotal after discount: ₹900**
- Affiliate commission: 10%
- **Expected commission: ₹900 * 10% = ₹90** ✅

This is **CORRECT BEHAVIOR** - affiliate benefits from the discount they give to customers.

---

## 🎯 Recommended Implementation Order

1. **HIGH PRIORITY**: Fix coupon affiliate_id endpoints (Fixes #1, #2, #3)
2. **MEDIUM**: Add auto-coupon creation (Fix #4)
3. **LOW**: Create affiliate dashboard UI (frontend)

All backend logic for discount & commission calculation is **already correct** ✅
