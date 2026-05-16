from app import create_app
from config import TestingConfig
from app.models import db

app = create_app(TestingConfig)
with app.app_context():
    inspector = db.inspect(db.engine)
    if 'coupon_codes' in inspector.get_table_names():
        cols = [c['name'] for c in inspector.get_columns('coupon_codes')]
        print('coupon_codes columns:', cols)
    else:
        print('coupon_codes table missing')
