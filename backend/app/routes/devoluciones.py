from flask import Blueprint, jsonify, request
import datetime
from app import db
from app.models import Devolucion, DevolucionDetalle, StockConsignacion, Cliente, Producto

bp = Blueprint('devoluciones', __name__)


@bp.route('', methods=['GET'])
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
def get_devolucion(id):
    d = Devolucion.query.get_or_404(id)
    return jsonify(d.to_dict(include_detalles=True))


@bp.route('', methods=['POST'])
def create_devolucion():
    data = request.get_json()

    if not data.get('cliente_id'):
        return jsonify({'error': 'cliente_id requerido'}), 400
    if not data.get('detalles'):
        return jsonify({'error': 'La devolución debe tener al menos un producto'}), 400

    cliente = Cliente.query.get_or_404(data['cliente_id'])

    # Validate stock
    for item in data['detalles']:
        stock = StockConsignacion.query.filter_by(
            cliente_id=cliente.id, producto_id=item['producto_id']
        ).first()
        cantidad = int(item['cantidad_unidades'])
        if not stock or stock.cantidad_unidades < cantidad:
            producto = Producto.query.get(item['producto_id'])
            nombre = producto.descripcion if producto else f"ID {item['producto_id']}"
            disponible = stock.cantidad_unidades if stock else 0
            return jsonify({
                'error': f"No se pueden devolver más unidades de las que tiene '{nombre}'. Disponible: {disponible}"
            }), 400

    fecha = datetime.date.fromisoformat(data.get('fecha', datetime.date.today().isoformat()))
    devolucion = Devolucion(
        cliente_id=cliente.id,
        orden_origen_id=data.get('orden_origen_id'),
        fecha=fecha,
        nota=data.get('nota'),
    )
    db.session.add(devolucion)
    db.session.flush()

    for item in data['detalles']:
        cantidad = int(item['cantidad_unidades'])
        db.session.add(DevolucionDetalle(
            devolucion_id=devolucion.id,
            producto_id=item['producto_id'],
            cantidad_unidades=cantidad,
        ))
        stock = StockConsignacion.query.filter_by(
            cliente_id=cliente.id, producto_id=item['producto_id']
        ).first()
        stock.cantidad_unidades -= cantidad

    db.session.commit()
    return jsonify(devolucion.to_dict(include_detalles=True)), 201
