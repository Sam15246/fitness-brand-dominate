# DOMINATE - Fitness Ecommerce MVP

A production-ready Flask ecommerce MVP for DOMINATE (premium calisthenics equipment). Includes guest checkout, admin dashboard, affiliate tracking, and editable policy pages.

## Highlights
- Guest checkout (no forced sign-up)
- Admin dashboard for orders, products, users, affiliates
- Editable policy pages (Shipping, Returns, Terms, Privacy)
- Smart address UX (Indian states + 6-digit pincode validation)
- Affiliate commission tracking
- Production-ready WSGI entrypoint for Gunicorn

## Tech Stack
- Flask 2.3
- SQLAlchemy + Flask-Migrate
- Flask-Login (session auth)
- Bootstrap 5
- PostgreSQL (production) / SQLite (development)

## Project Structure
```
app/
  models.py
  routes/
  templates/
  static/
config.py
run.py
wsgi.py
requirements.txt
Procfile
runtime.txt
```

## Local Development

### 1) Create and activate venv
```
python -m venv .venv
.venv\Scripts\activate
```

### 2) Install dependencies
```
pip install -r requirements.txt
```

### 3) Set environment variables
Create a `.env` file (optional) or set in shell:
```
SECRET_KEY=dev-secret-key-12345
FLASK_ENV=development
```

### 4) Initialize database
```
flask db upgrade
```

### 5) Seed policies (one-time)
```
python -c "from app.scripts.init_policies import init_policies; init_policies()"
```

### 6) Run the app
```
python run.py
```
Open http://127.0.0.1:5000

## Admin Access
Default admin credentials are created via seed scripts or manual setup.

To create a superadmin quickly (example):
```
python -c "from app import create_app, db; from app.models import User, UserRole; app=create_app();
with app.app_context():
    u=User.query.filter_by(email='admin@dominate.com').first()
    if not u:
        u=User(name='Admin', email='admin@dominate.com', role=UserRole.SUPERADMIN.value, is_active=True)
        u.set_password('admin123')
        db.session.add(u)
        db.session.commit()
        print('Admin created')
    else:
        print('Admin exists')"
```

## Policy Pages
Editable policies are stored in the database and rendered dynamically:
- /shipping
- /returns
- /terms
- /privacy

Admin UI: /admin/policies

## Deployment (Render)

### Required files
- `Procfile`
- `runtime.txt` (pins Python version)

### Environment variables
- `FLASK_ENV=production`
- `SECRET_KEY=<random hex>`
- `DATABASE_URL=<Render PostgreSQL URL>`
- `FLASK_APP=run.py`

### Build + Start
Build command:
```
pip install -r requirements.txt && flask db upgrade
```
Start command:
```
gunicorn -w 4 -b 0.0.0.0:$PORT "wsgi:app"
```

### Post-deploy tasks
```
python -c "from app.scripts.init_policies import init_policies; init_policies()"
```

## Common Troubleshooting

**Pillow build fails on Render**
- Ensure `runtime.txt` pins Python 3.11.x.

**Database connection errors**
- Double-check `DATABASE_URL` in Render Environment.

**Missing policies**
- Run the policy init command above.

## License
All rights reserved. Internal use only.
