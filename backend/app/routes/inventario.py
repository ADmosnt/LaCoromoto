from flask import Blueprint, jsonify, request
import datetime
from app import db
from app.models import InventarioCentral, EntradaInventario, Producto
from app.auth import require_role

bp = Blueprint('inventario', __name__)


@bp.route('', methods=['GET'])
@require_role('admin')
def list_inventario():
    items = (
        InventarioCentral.query
        .join(Producto)
        .filter(Producto.activo == True)
        .order_by(Producto.descripcion)
        .all()
    )
    return jsonify([i.to_dict() for i in items])


@bp.route('/entradas', methods=['GET'])
@require_role('admin')
def list_entradas():
    q = EntradaInventario.query
    producto_id = request.args.get('producto_id')
    if producto_id:
        q = q.filter(EntradaInventario.producto_id == int(producto_id))
    entradas = q.order_by(EntradaInventario.fecha.desc()).limit(200).all()
    return jsonify([e.to_dict() for e in entradas])


@bp.route('/entradas', methods=['POST'])
@require_role('admin')
def create_entrada():
    data = request.get_json()
    if not data.get('producto_id') or not data.get('cantidad_unidades'):
        return jsonify({'error': 'producto_id y cantidad_unidades son requeridos'}), 400

    cantidad = int(data['cantidad_unidades'])
    if cantidad <= 0:
        return jsonify({'error': 'La cantidad debe ser mayor a 0'}), 400

    Producto.query.get_or_404(data['producto_id'])

    fecha = datetime.date.fromisoformat(data.get('fecha', datetime.date.today().isoformat()))
    entrada = EntradaInventario(
        producto_id=data['producto_id'],
        cantidad_unidades=cantidad,
        fecha=fecha,
        nota=data.get('nota'),
    )
    db.session.add(entrada)

    inv = InventarioCentral.query.filter_by(producto_id=data['producto_id']).first()
    if inv:
        inv.cantidad_unidades += cantidad
    else:
        db.session.add(InventarioCentral(
            producto_id=data['producto_id'],
            cantidad_unidades=cantidad,
        ))

    db.session.commit()
    return jsonify(entrada.to_dict()), 201
