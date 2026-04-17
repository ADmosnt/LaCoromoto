from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
import os

db = SQLAlchemy()
migrate = Migrate()


def create_app():
    app = Flask(__name__)

    app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get(
        'DATABASE_URL', 'postgresql://appuser:dev@localhost:5432/consignacion'
    )
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')

    db.init_app(app)
    migrate.init_app(app, db)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    from app import models  # noqa: F401

    from app.routes.config import bp as config_bp
    from app.routes.maestras import bp as maestras_bp
    from app.routes.clientes import bp as clientes_bp
    from app.routes.productos import bp as productos_bp
    from app.routes.tasas import bp as tasas_bp
    from app.routes.ordenes import bp as ordenes_bp
    from app.routes.reportes_venta import bp as reportes_bp
    from app.routes.devoluciones import bp as devoluciones_bp
    from app.routes.dashboard import bp as dashboard_bp

    app.register_blueprint(config_bp, url_prefix='/api/config')
    app.register_blueprint(maestras_bp, url_prefix='/api')
    app.register_blueprint(clientes_bp, url_prefix='/api/clientes')
    app.register_blueprint(productos_bp, url_prefix='/api/productos')
    app.register_blueprint(tasas_bp, url_prefix='/api/tasas')
    app.register_blueprint(ordenes_bp, url_prefix='/api/ordenes')
    app.register_blueprint(reportes_bp, url_prefix='/api/reportes-venta')
    app.register_blueprint(devoluciones_bp, url_prefix='/api/devoluciones')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')

    with app.app_context():
        db.create_all()
        _seed_config(db)

    return app


def _seed_config(db):
    from app.models import ConfigEmpresa
    if not ConfigEmpresa.query.first():
        db.session.add(ConfigEmpresa(
            nombre='MI EMPRESA C.A.',
            rif='J-00000000-0',
            direccion='Dirección de la empresa',
            ciudad='Ciudad'
        ))
        db.session.commit()
