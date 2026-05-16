from config import TestingConfig
from app import create_app

app = create_app(TestingConfig)
val = app.config.get('SQLALCHEMY_DATABASE_URI')
print('SQLALCHEMY_DATABASE_URI type:', type(val))
print('SQLALCHEMY_DATABASE_URI repr:', repr(val))
