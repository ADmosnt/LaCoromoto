from flask import Blueprint, jsonify, request
from app import db
from app.models import Zona, GrupoCliente, GrupoProducto, ListaPrecio
from app.auth import require_role

bp = Blueprint('maestras', __name__)


def _crud(model):
    def get_all():
        items = model.query.order_by(model.nombre).all()
        return jsonify([i.to_dict() for i in items])

    def create():
        data = request.get_json()
        if not data.get('nombre'):
            return jsonify({'error': 'nombre requerido'}), 400
        item = model(nombre=data['nombre'])
        db.session.add(item)
        db.session.commit()
        return jsonify(item.to_dict()), 201

    def update(id):
        item = model.query.get_or_404(id)
        data = request.get_json()
        if 'nombre' in data:
            item.nombre = data['nombre']
        db.session.commit()
        return jsonify(item.to_dict())

    def delete(id):
        item = model.query.get_or_404(id)
        db.session.delete(item)
        db.session.commit()
        return '', 204

    return get_all, create, update, delete


# Zonas
@bp.route('/zonas', methods=['GET'])
@require_role('admin')
def get_zonas():
    return _crud(Zona)[0]()


@bp.route('/zonas', methods=['POST'])
@require_role('admin')
def create_zona():
    return _crud(Zona)[1]()


@bp.route('/zonas/<int:id>', methods=['PUT'])
@require_role('admin')
def update_zona(id):
    return _crud(Zona)[2](id)


@bp.route('/zonas/<int:id>', methods=['DELETE'])
@require_role('admin')
def delete_zona(id):
    return _crud(Zona)[3](id)


# Grupos Clientes
@bp.route('/grupos-clientes', methods=['GET'])
@require_role('admin')
def get_grupos_clientes():
    return _crud(GrupoCliente)[0]()


@bp.route('/grupos-clientes', methods=['POST'])
@require_role('admin')
def create_grupo_cliente():
    return _crud(GrupoCliente)[1]()


@bp.route('/grupos-clientes/<int:id>', methods=['PUT'])
@require_role('admin')
def update_grupo_cliente(id):
    return _crud(GrupoCliente)[2](id)


@bp.route('/grupos-clientes/<int:id>', methods=['DELETE'])
@require_role('admin')
def delete_grupo_cliente(id):
    return _crud(GrupoCliente)[3](id)


# Grupos Productos
@bp.route('/grupos-productos', methods=['GET'])
@require_role('admin')
def get_grupos_productos():
    return _crud(GrupoProducto)[0]()


@bp.route('/grupos-productos', methods=['POST'])
@require_role('admin')
def create_grupo_producto():
    return _crud(GrupoProducto)[1]()


@bp.route('/grupos-productos/<int:id>', methods=['PUT'])
@require_role('admin')
def update_grupo_producto(id):
    return _crud(GrupoProducto)[2](id)


@bp.route('/grupos-productos/<int:id>', methods=['DELETE'])
@require_role('admin')
def delete_grupo_producto(id):
    return _crud(GrupoProducto)[3](id)


# Listas de Precios
@bp.route('/listas-precios', methods=['GET'])
@require_role('admin')
def get_listas_precios():
    return _crud(ListaPrecio)[0]()


@bp.route('/listas-precios', methods=['POST'])
@require_role('admin')
def create_lista_precio():
    return _crud(ListaPrecio)[1]()


@bp.route('/listas-precios/<int:id>', methods=['PUT'])
@require_role('admin')
def update_lista_precio(id):
    return _crud(ListaPrecio)[2](id)


@bp.route('/listas-precios/<int:id>', methods=['DELETE'])
@require_role('admin')
def delete_lista_precio(id):
    return _crud(ListaPrecio)[3](id)
