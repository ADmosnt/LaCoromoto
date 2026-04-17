from flask import Blueprint, jsonify, request
from app import db
from app.models import Producto, ProductoPrecio, ListaPrecio

bp = Blueprint('productos', __name__)


@bp.route('', methods=['GET'])
def list_productos():
    q = Producto.query
    search = request.args.get('search', '')
    if search:
        q = q.filter(
            db.or_(
                Producto.descripcion.ilike(f'%{search}%'),
                Producto.codigo.ilike(f'%{search}%'),
            )
        )
    grupo_id = request.args.get('grupo_id')
    if grupo_id:
        q = q.filter(Producto.grupo_id == int(grupo_id))
    activo = request.args.get('activo')
    if activo is not None:
        q = q.filter(Producto.activo == (activo.lower() == 'true'))
    productos = q.order_by(Producto.descripcion).all()
    return jsonify([p.to_dict() for p in productos])


@bp.route('/<int:id>', methods=['GET'])
def get_producto(id):
    p = Producto.query.get_or_404(id)
    return jsonify(p.to_dict())


@bp.route('', methods=['POST'])
def create_producto():
    data = request.get_json()
    if not data.get('codigo') or not data.get('descripcion'):
        return jsonify({'error': 'codigo y descripcion son requeridos'}), 400

    if Producto.query.filter_by(codigo=data['codigo']).first():
        return jsonify({'error': 'El código ya existe'}), 409

    p = Producto(
        codigo=data['codigo'],
        descripcion=data['descripcion'],
        unidades_por_bulto=data.get('unidades_por_bulto', 1),
        grupo_id=data.get('grupo_id'),
        activo=data.get('activo', True),
    )
    db.session.add(p)
    db.session.flush()

    for precio_data in data.get('precios', []):
        lista = ListaPrecio.query.get(precio_data['lista_id'])
        if lista:
            db.session.add(ProductoPrecio(
                producto_id=p.id,
                lista_id=precio_data['lista_id'],
                precio_usd=precio_data['precio_usd'],
            ))

    db.session.commit()
    return jsonify(p.to_dict()), 201


@bp.route('/<int:id>', methods=['PUT'])
def update_producto(id):
    p = Producto.query.get_or_404(id)
    data = request.get_json()

    for field in ('descripcion', 'unidades_por_bulto', 'grupo_id', 'activo'):
        if field in data:
            setattr(p, field, data[field])

    if 'precios' in data:
        ProductoPrecio.query.filter_by(producto_id=id).delete()
        for precio_data in data['precios']:
            db.session.add(ProductoPrecio(
                producto_id=id,
                lista_id=precio_data['lista_id'],
                precio_usd=precio_data['precio_usd'],
            ))

    db.session.commit()
    return jsonify(p.to_dict())


@bp.route('/<int:id>', methods=['DELETE'])
def delete_producto(id):
    p = Producto.query.get_or_404(id)
    p.activo = False
    db.session.commit()
    return '', 204
