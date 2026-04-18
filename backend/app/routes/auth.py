from flask import Blueprint, jsonify, request
from app.models import Usuario
from app.auth import make_token, get_current_user

bp = Blueprint('auth', __name__)


@bp.route('/login', methods=['POST'])
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
