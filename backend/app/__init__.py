from flask import Flask, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_migrate import Migrate
from flask_cors import CORS
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address
import os

db = SQLAlchemy()
migrate = Migrate()
limiter = Limiter(key_func=get_remote_address, default_limits=[])

# Carpeta donde el Dockerfile de Railway copia el build de React
REACT_BUILD = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'react_build')


def create_app():
    app = Flask(__name__)

    # Railway entrega "postgres://..." pero SQLAlchemy requiere "postgresql://..."
    db_url = os.environ.get('DATABASE_URL', 'postgresql://appuser:dev@localhost:5432/consignacion')
    if db_url.startswith('postgres://'):
        db_url = db_url.replace('postgres://', 'postgresql://', 1)

    app.config['SQLALCHEMY_DATABASE_URI'] = db_url
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key')

    db.init_app(app)
    migrate.init_app(app, db)
    limiter.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    @app.after_request
    def _security_headers(response):
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Referrer-Policy'] = 'strict-origin-when-cross-origin'
        response.headers['Permissions-Policy'] = 'geolocation=(), microphone=(), camera=()'
        return response

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
    from app.routes.inventario import bp as inventario_bp
    from app.routes.auth import bp as auth_bp
    from app.routes.usuarios import bp as usuarios_bp

    app.register_blueprint(config_bp, url_prefix='/api/config')
    app.register_blueprint(maestras_bp, url_prefix='/api')
    app.register_blueprint(clientes_bp, url_prefix='/api/clientes')
    app.register_blueprint(productos_bp, url_prefix='/api/productos')
    app.register_blueprint(tasas_bp, url_prefix='/api/tasas')
    app.register_blueprint(ordenes_bp, url_prefix='/api/ordenes')
    app.register_blueprint(reportes_bp, url_prefix='/api/reportes-venta')
    app.register_blueprint(devoluciones_bp, url_prefix='/api/devoluciones')
    app.register_blueprint(dashboard_bp, url_prefix='/api/dashboard')
    app.register_blueprint(inventario_bp, url_prefix='/api/inventario')
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(usuarios_bp, url_prefix='/api/usuarios')

    # Defer DB init to first request so the app starts even if Postgres
    # isn't ready yet (e.g. Railway cold start, wrong DATABASE_URL, etc.)
    _ready = {'done': False}

    @app.before_request
    def _init_db():
        if not _ready['done']:
            db.create_all()
            _run_migrations()
            _seed_config(db)
            _seed_admin(db)
            _ready['done'] = True

    # Serve React build when running as monolith (Railway deploy)
    if os.path.isdir(REACT_BUILD):
        @app.route('/', defaults={'path': ''})
        @app.route('/<path:path>')
        def serve_react(path):
            full = os.path.join(REACT_BUILD, path)
            if path and os.path.isfile(full):
                return send_from_directory(REACT_BUILD, path)
            return send_from_directory(REACT_BUILD, 'index.html')

    return app


def _run_migrations():
    from sqlalchemy import text
    with db.engine.connect() as conn:
        conn.execute(text(
            "ALTER TABLE ordenes_despacho ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'activa'"
        ))
        conn.execute(text(
            "ALTER TABLE reportes_venta ADD COLUMN IF NOT EXISTS orden_id INTEGER REFERENCES ordenes_despacho(id)"
        ))
        conn.execute(text(
            "ALTER TABLE devoluciones ADD COLUMN IF NOT EXISTS reingresar_almacen BOOLEAN NOT NULL DEFAULT FALSE"
        ))
        conn.commit()


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


def _seed_admin(db):
    from app.models import Usuario
    if not Usuario.query.filter_by(rol='admin').first():
        u = Usuario(username='admin', rol='admin')
        u.set_password('admin123')
        db.session.add(u)
        db.session.commit()
