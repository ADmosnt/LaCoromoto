from flask import Blueprint, jsonify, request
from decimal import Decimal
import datetime
from app import db
from app.models import (ReporteVenta, ReporteVentaDetalle,
                         StockConsignacion, TasaBCV, Cliente, Producto)

bp = Blueprint('reportes_venta', __name__)


@bp.route('', methods=['GET'])
def list_reportes():
    q = ReporteVenta.query
    cliente_id = request.args.get('cliente_id')
    if cliente_id:
        q = q.filter(ReporteVenta.cliente_id == int(cliente_id))
    status = request.args.get('status')
    if status:
        q = q.filter(ReporteVenta.status == status)
    fecha_desde = request.args.get('fecha_desde')
    if fecha_desde:
        q = q.filter(ReporteVenta.fecha >= datetime.date.fromisoformat(fecha_desde))
    fecha_hasta = request.args.get('fecha_hasta')
    if fecha_hasta:
        q = q.filter(ReporteVenta.fecha <= datetime.date.fromisoformat(fecha_hasta))
    reportes = q.order_by(ReporteVenta.fecha.desc()).all()
    return jsonify([r.to_dict() for r in reportes])


@bp.route('/<int:id>', methods=['GET'])
def get_reporte(id):
    r = ReporteVenta.query.get_or_404(id)
    return jsonify(r.to_dict(include_detalles=True))


@bp.route('', methods=['POST'])
def create_reporte():
    data = request.get_json()

    if not data.get('cliente_id'):
        return jsonify({'error': 'cliente_id requerido'}), 400
    if not data.get('detalles'):
        return jsonify({'error': 'El reporte debe tener al menos un producto'}), 400

    cliente = Cliente.query.get_or_404(data['cliente_id'])

    fecha = datetime.date.fromisoformat(data.get('fecha', datetime.date.today().isoformat()))
    tasa = TasaBCV.query.filter_by(fecha=fecha).first()
    if not tasa:
        tasa_id = data.get('tasa_bcv_id')
        if tasa_id:
            tasa = TasaBCV.query.get(tasa_id)
        if not tasa:
            tasa = TasaBCV.query.order_by(TasaBCV.fecha.desc()).first()
        if not tasa:
            return jsonify({'error': 'No hay tasa BCV disponible'}), 400

    # Validate stock before creating
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
                'error': f"Stock insuficiente para '{nombre}'. Disponible: {disponible} unidades"
            }), 400

    reporte = ReporteVenta(
        cliente_id=cliente.id,
        fecha=fecha,
        tasa_bcv_id=tasa.id,
        status='pendiente',
    )
    db.session.add(reporte)
    db.session.flush()

    total_usd = Decimal('0')
    for item in data['detalles']:
        precio = Decimal(str(item['precio_usd_momento']))
        cantidad = int(item['cantidad_unidades'])
        det = ReporteVentaDetalle(
            reporte_id=reporte.id,
            producto_id=item['producto_id'],
            cantidad_unidades=cantidad,
            precio_usd_momento=precio,
        )
        db.session.add(det)
        total_usd += precio * cantidad

    reporte.total_usd = total_usd
    reporte.total_bs = total_usd * tasa.valor
    db.session.commit()
    return jsonify(reporte.to_dict(include_detalles=True)), 201


@bp.route('/<int:id>/confirmar', methods=['PUT'])
def confirmar_reporte(id):
    reporte = ReporteVenta.query.get_or_404(id)
    if reporte.status == 'confirmado':
        return jsonify({'error': 'El reporte ya está confirmado'}), 400

    for det in reporte.detalles:
        stock = StockConsignacion.query.filter_by(
            cliente_id=reporte.cliente_id, producto_id=det.producto_id
        ).first()
        if not stock or stock.cantidad_unidades < det.cantidad_unidades:
            producto = Producto.query.get(det.producto_id)
            nombre = producto.descripcion if producto else f"ID {det.producto_id}"
            return jsonify({'error': f"Stock insuficiente para '{nombre}'"}), 400
        stock.cantidad_unidades -= det.cantidad_unidades

    reporte.status = 'confirmado'
    db.session.commit()
    return jsonify(reporte.to_dict(include_detalles=True))
