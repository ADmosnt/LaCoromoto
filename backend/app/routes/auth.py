from flask import Blueprint, jsonify, request
from app.models import Usuario
from app.auth import make_token, get_current_user
from app import db, limiter
import secrets

bp = Blueprint('auth', __name__)


@bp.route('/login', methods=['POST'])
@limiter.limit('10 per minute; 50 per hour')
def login():
    data = request.get_json() or {}
    user = Usuario.query.filter_by(username=data.get('username'), activo=True).first()
    if not user or not user.check_password(data.get('password', '')):
        return jsonify({'error': 'Credenciales incorrectas'}), 401
    return jsonify({'token': make_token(user), 'user': user.to_dict()})


@bp.route('/me', methods=['GET'])
def me():
    user = get_current_user()
    if not user or not user.activo:
        return jsonify({'error': 'No autenticado'}), 401
    return jsonify(user.to_dict())


@bp.route('/me/password', methods=['PUT'])
def change_password():
    user = get_current_user()
    if not user or not user.activo:
        return jsonify({'error': 'No autenticado'}), 401
    data = request.get_json() or {}
    if not user.check_password(data.get('current_password', '')):
        return jsonify({'error': 'Contraseña actual incorrecta'}), 400
    new_username = data.get('new_username', '').strip()
    new_password = data.get('new_password', '').strip()
    if new_username and new_username != user.username:
        if Usuario.query.filter_by(username=new_username).first():
            return jsonify({'error': 'Ese nombre de usuario ya está en uso'}), 409
        user.username = new_username
    if new_password:
        if len(new_password) < 6:
            return jsonify({'error': 'La contraseña debe tener al menos 6 caracteres'}), 400
        user.set_password(new_password)
    db.session.commit()
    return jsonify({'ok': True, 'user': user.to_dict()})


@bp.route('/setup-recovery', methods=['POST'])
def setup_recovery():
    user = get_current_user()
    if not user or not user.activo:
        return jsonify({'error': 'No autenticado'}), 401
    code = secrets.token_urlsafe(18)
    from werkzeug.security import generate_password_hash
    user.recovery_code_hash = generate_password_hash(code)
    db.session.commit()
    return jsonify({'code': code})


@bp.route('/recover', methods=['POST'])
@limiter.limit('5 per minute; 20 per hour')
def recover_password():
    data = request.get_json() or {}
    username = data.get('username', '').strip()
    code = data.get('recovery_code', '').strip()
    new_password = data.get('new_password', '').strip()
    if not username or not code or not new_password:
        return jsonify({'error': 'username, recovery_code y new_password son requeridos'}), 400
    if len(new_password) < 6:
        return jsonify({'error': 'La contraseña debe tener al menos 6 caracteres'}), 400
    user = Usuario.query.filter_by(username=username, activo=True).first()
    if not user or not user.recovery_code_hash:
        return jsonify({'error': 'Código de recuperación inválido'}), 400
    from werkzeug.security import check_password_hash
    if not check_password_hash(user.recovery_code_hash, code):
        return jsonify({'error': 'Código de recuperación inválido'}), 400
    user.set_password(new_password)
    user.recovery_code_hash = None
    db.session.commit()
    return jsonify({'ok': True})
