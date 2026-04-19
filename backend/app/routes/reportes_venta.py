from flask import Blueprint, jsonify, request
from decimal import Decimal
import datetime
from app import db
from app.models import (ReporteVenta, ReporteVentaDetalle,
                         StockConsignacion, TasaBCV, Cliente, Producto,
                         OrdenDespacho)
from app.utils import resolv_tasa
from app.auth import require_role, get_current_user

bp = Blueprint('reportes_venta', __name__)


@bp.route('', methods=['GET'])
@require_role('admin')
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
@require_role('admin')
def get_reporte(id):
    r = ReporteVenta.query.get_or_404(id)
    return jsonify(r.to_dict(include_detalles=True))


@bp.route('', methods=['POST'])
@require_role('admin', 'cliente')
def create_reporte():
    current_user = get_current_user()
    data = request.get_json()

    if not data.get('cliente_id'):
        return jsonify({'error': 'cliente_id requerido'}), 400
    if not data.get('detalles'):
        return jsonify({'error': 'El reporte debe tener al menos un producto'}), 400

    # Clients can only report for their own linked client
    if current_user.rol == 'cliente' and int(data['cliente_id']) != current_user.cliente_id:
        return jsonify({'error': 'Sin permiso'}), 403

    cliente = Cliente.query.get_or_404(data['cliente_id'])

    orden = None
    orden_id = data.get('orden_id')
    if orden_id:
        orden = OrdenDespacho.query.get_or_404(orden_id)
        if current_user.rol == 'cliente' and orden.cliente_id != current_user.cliente_id:
            return jsonify({'error': 'Sin permiso'}), 403
        if orden.status != 'activa':
            return jsonify({'error': f'La orden está en estado "{orden.status}" y no acepta reportes'}), 400
        existing = ReporteVenta.query.filter_by(orden_id=orden_id).filter(
            ReporteVenta.status.in_(['pendiente', 'confirmado'])
        ).first()
        if existing:
            return jsonify({'error': 'Esta orden ya tiene un reporte registrado'}), 400

    fecha = datetime.date.fromisoformat(data.get('fecha', datetime.date.today().isoformat()))
    tasa = resolv_tasa(TasaBCV, fecha, data.get('tasa_bcv_id'))
    if not tasa:
        return jsonify({'error': 'No hay tasa BCV disponible'}), 400

    tasa_valor_manual = data.get('tasa_valor')
    tasa_valor = Decimal(str(tasa_valor_manual)) if tasa_valor_manual else tasa.valor

    for item in data['detalles']:
        cantidad = int(item.get('cantidad_unidades', 0))
        precio = Decimal(str(item.get('precio_usd_momento', 0)))
        if cantidad <= 0:
            return jsonify({'error': 'La cantidad debe ser mayor a 0'}), 400
        if precio < 0:
            return jsonify({'error': 'El precio no puede ser negativo'}), 400

    reporte = ReporteVenta(
        cliente_id=cliente.id,
        orden_id=orden_id,
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
        db.session.add(ReporteVentaDetalle(
            reporte_id=reporte.id,
            producto_id=item['producto_id'],
            cantidad_unidades=cantidad,
            precio_usd_momento=precio,
        ))
        total_usd += precio * cantidad

    reporte.total_usd = total_usd
    reporte.total_bs = total_usd * tasa_valor

    if orden:
        orden.status = 'pendiente'

    db.session.commit()
    return jsonify(reporte.to_dict(include_detalles=True)), 201


@bp.route('/<int:id>/confirmar', methods=['PUT'])
@require_role('admin')
def confirmar_reporte(id):
    reporte = ReporteVenta.query.get_or_404(id)
    if reporte.status == 'confirmado':
        return jsonify({'error': 'El reporte ya está confirmado'}), 400

    for det in reporte.detalles:
        stock = StockConsignacion.query.filter_by(
            cliente_id=reporte.cliente_id, producto_id=det.producto_id
        ).with_for_update().first()
        if not stock or stock.cantidad_unidades < det.cantidad_unidades:
            producto = Producto.query.get(det.producto_id)
            nombre = producto.descripcion if producto else f"ID {det.producto_id}"
            return jsonify({'error': f"Stock insuficiente para '{nombre}'"}), 400
        stock.cantidad_unidades -= det.cantidad_unidades

    reporte.status = 'confirmado'

    if reporte.orden_id:
        orden = OrdenDespacho.query.get(reporte.orden_id)
        if orden and orden.status == 'pendiente':
            orden.status = 'confirmado'

    db.session.commit()
    return jsonify(reporte.to_dict(include_detalles=True))
