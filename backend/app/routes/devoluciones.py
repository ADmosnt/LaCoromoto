from flask import Blueprint, jsonify, request
import datetime
from app import db
from app.models import (
    Devolucion, DevolucionDetalle, StockConsignacion,
    Cliente, Producto, InventarioCentral,
)
from app.auth import require_role

bp = Blueprint('devoluciones', __name__)


@bp.route('', methods=['GET'])
@require_role('admin')
def list_devoluciones():
    q = Devolucion.query
    cliente_id = request.args.get('cliente_id')
    if cliente_id:
        q = q.filter(Devolucion.cliente_id == int(cliente_id))
    fecha_desde = request.args.get('fecha_desde')
    if fecha_desde:
        q = q.filter(Devolucion.fecha >= datetime.date.fromisoformat(fecha_desde))
    fecha_hasta = request.args.get('fecha_hasta')
    if fecha_hasta:
        q = q.filter(Devolucion.fecha <= datetime.date.fromisoformat(fecha_hasta))
    devoluciones = q.order_by(Devolucion.fecha.desc()).all()
    return jsonify([d.to_dict() for d in devoluciones])


@bp.route('/<int:id>', methods=['GET'])
@require_role('admin')
def get_devolucion(id):
    d = Devolucion.query.get_or_404(id)
    return jsonify(d.to_dict(include_detalles=True))


@bp.route('', methods=['POST'])
@require_role('admin')
def create_devolucion():
    data = request.get_json()

    if not data.get('cliente_id'):
        return jsonify({'error': 'cliente_id requerido'}), 400
    if not data.get('detalles'):
        return jsonify({'error': 'La devolución debe tener al menos un producto'}), 400

    cliente = Cliente.query.get_or_404(data['cliente_id'])

    fecha = datetime.date.fromisoformat(data.get('fecha', datetime.date.today().isoformat()))
    reingresar = bool(data.get('reingresar_almacen', False))
    devolucion = Devolucion(
        cliente_id=cliente.id,
        orden_origen_id=data.get('orden_origen_id'),
        fecha=fecha,
        nota=data.get('nota'),
        reingresar_almacen=reingresar,
    )
    db.session.add(devolucion)
    db.session.flush()

    for item in data['detalles']:
        cantidad = int(item.get('cantidad_unidades', 0))
        if cantidad <= 0:
            return jsonify({'error': 'La cantidad debe ser mayor a 0'}), 400

        producto = Producto.query.get_or_404(item['producto_id'])
        stock = StockConsignacion.query.filter_by(
            cliente_id=cliente.id, producto_id=producto.id
        ).with_for_update().first()
        disponible = stock.cantidad_unidades if stock else 0
        if disponible < cantidad:
            return jsonify({
                'error': f"No se pueden devolver más unidades de las que tiene '{producto.descripcion}'. "
                         f"Disponible: {disponible}"
            }), 400

        db.session.add(DevolucionDetalle(
            devolucion_id=devolucion.id,
            producto_id=producto.id,
            cantidad_unidades=cantidad,
        ))
        stock.cantidad_unidades -= cantidad

        if reingresar:
            inv = InventarioCentral.query.filter_by(
                producto_id=producto.id
            ).with_for_update().first()
            if inv:
                inv.cantidad_unidades += cantidad
            else:
                db.session.add(InventarioCentral(
                    producto_id=producto.id,
                    cantidad_unidades=cantidad,
                ))

    db.session.commit()
    return jsonify(devolucion.to_dict(include_detalles=True)), 201
