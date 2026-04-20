from flask import Blueprint, jsonify, request
from app import db
from app.models import Usuario, Cliente
from app.auth import require_role

bp = Blueprint('usuarios', __name__)


@bp.route('', methods=['GET'])
@require_role('admin')
def list_usuarios():
    usuarios = Usuario.query.order_by(Usuario.username).all()
    result = []
    for u in usuarios:
        d = u.to_dict()
        if u.cliente_id:
            c = Cliente.query.get(u.cliente_id)
            d['cliente_nombre'] = c.razon_social if c else None
        result.append(d)
    return jsonify(result)


@bp.route('', methods=['POST'])
@require_role('admin')
def create_usuario():
    data = request.get_json() or {}
    if not data.get('username') or not data.get('password'):
        return jsonify({'error': 'username y password son requeridos'}), 400
    if Usuario.query.filter_by(username=data['username']).first():
        return jsonify({'error': 'El nombre de usuario ya existe'}), 400
    rol = data.get('rol', 'cliente')
    if rol not in ('admin', 'cliente'):
        return jsonify({'error': 'rol debe ser admin o cliente'}), 400
    if rol == 'cliente' and not data.get('cliente_id'):
        return jsonify({'error': 'cliente_id es requerido para rol cliente'}), 400
    u = Usuario(
        username=data['username'],
        rol=rol,
        cliente_id=data.get('cliente_id'),
    )
    u.set_password(data['password'])
    db.session.add(u)
    db.session.commit()
    return jsonify(u.to_dict()), 201


@bp.route('/<int:id>', methods=['PUT'])
@require_role('admin')
def update_usuario(id):
    u = Usuario.query.get_or_404(id)
    data = request.get_json() or {}
    if 'password' in data and data['password']:
        u.set_password(data['password'])
    if 'activo' in data:
        u.activo = bool(data['activo'])
    if 'cliente_id' in data:
        u.cliente_id = data['cliente_id'] or None
    db.session.commit()
    return jsonify(u.to_dict())


@bp.route('/<int:id>', methods=['DELETE'])
@require_role('admin')
def delete_usuario(id):
    u = Usuario.query.get_or_404(id)
    u.activo = False
    db.session.commit()
    return jsonify({'ok': True})
