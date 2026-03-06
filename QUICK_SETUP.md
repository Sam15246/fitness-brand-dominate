# Password Reset - Quick Setup (5 Minutes)

## 1. Install Dependency
```bash
pip install Flask-Mail==0.9.1
```

## 2. Get Brevo Credentials (FREE - 9,000 emails/month) ⭐
- Visit: https://app.brevo.com/
- Sign up → Go to Settings → SMTP & API → SMTP
- Copy your SMTP Key

**Why Brevo?** 
- ✅ 3X more generous than Mailgun (9,000 vs 3,000/month)
- ✅ No credit card required
- ✅ Better deliverability

## 3. Create `.env` File
```bash
# Add these lines to .env file:
MAIL_BACKEND=brevo
BREVO_API_KEY=xsmtpsib-YOUR_API_KEY_HERE
MAIL_FROM_ADDRESS=noreply@yourdomain.com
MAIL_FROM_NAME=Fitness Brand
```

**Note**: Use any email as `MAIL_FROM_ADDRESS` - you'll verify your domain later

## 4. Run Migration
```bash
flask db upgrade
```

## 5. Test It!
```bash
flask run
# Visit: http://localhost:5000/auth/login
# Click: "Forgot password?"
```

---

## ✅ Files Modified (Summary)

- ✅ `requirements.txt` - Added Flask-Mail
- ✅ `app/__init__.py` - Initialize Flask-Mail
- ✅ `app/models.py` - Added reset fields + methods
- ✅ `app/routes/auth.py` - Added reset routes
- ✅ `app/utils/email.py` - Added email service
- ✅ `app/config/__init__.py` - Email config
- ✅ `migrations/versions/017_*.py` - Migration
- ✅ `app/templates/auth/forgot_password.html` - UI
- ✅ `app/templates/auth/reset_password.html` - UI
- ✅ `app/templates/admin/login.html` - Added link

**Zero breaking changes. All backward compatible.**

---

## 🔄 When You Buy Domain (Later)

Just update 2 lines in `.env`:
```bash
# Verify your domain in Brevo dashboard first
MAIL_FROM_ADDRESS=noreply@fitnessbrand.com
MAIL_FROM_NAME=Fitness Brand
```

**That's it! Zero code changes.**

---

## 💰 Cost Comparison

| Provider | Free Tier | Recommendation |
|----------|-----------|----------------|
| **Brevo** | 9,000/mo | ⭐ **Best for startups** |
| Resend | 3,000/mo | Good alternative |
| Mailgun | 3,000/mo | OK but Brevo better |
| Amazon SES | $0.10/1k | Best for scale |

---

See `FORGOT_PASSWORD_SETUP.md` for complete documentation.
