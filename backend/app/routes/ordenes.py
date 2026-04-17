from flask import Blueprint, jsonify, request, send_file
from decimal import Decimal
import io
import datetime
from app import db
from app.models import (OrdenDespacho, OrdenDespachoDetalle,
                         StockConsignacion, TasaBCV, Cliente, Producto)
from app.utils import siguiente_numero_orden
from app.services.pdf_generator import generar_pdf_orden

bp = Blueprint('ordenes', __name__)


@bp.route('', methods=['GET'])
def list_ordenes():
    q = OrdenDespacho.query
    cliente_id = request.args.get('cliente_id')
    if cliente_id:
        q = q.filter(OrdenDespacho.cliente_id == int(cliente_id))
    fecha_desde = request.args.get('fecha_desde')
    if fecha_desde:
        q = q.filter(OrdenDespacho.fecha_emision >= datetime.date.fromisoformat(fecha_desde))
    fecha_hasta = request.args.get('fecha_hasta')
    if fecha_hasta:
        q = q.filter(OrdenDespacho.fecha_emision <= datetime.date.fromisoformat(fecha_hasta))
    ordenes = q.order_by(OrdenDespacho.fecha_emision.desc(), OrdenDespacho.numero_orden.desc()).all()
    return jsonify([o.to_dict() for o in ordenes])


@bp.route('/<int:id>', methods=['GET'])
def get_orden(id):
    o = OrdenDespacho.query.get_or_404(id)
    return jsonify(o.to_dict(include_detalles=True))


@bp.route('', methods=['POST'])
def create_orden():
    data = request.get_json()

    if not data.get('cliente_id'):
        return jsonify({'error': 'cliente_id requerido'}), 400
    if not data.get('detalles'):
        return jsonify({'error': 'La orden debe tener al menos un producto'}), 400

    cliente = Cliente.query.get_or_404(data['cliente_id'])

    # Get or create today's rate
    fecha = datetime.date.fromisoformat(data.get('fecha_emision', datetime.date.today().isoformat()))
    tasa = TasaBCV.query.filter_by(fecha=fecha).first()
    if not tasa:
        tasa_id = data.get('tasa_bcv_id')
        if tasa_id:
            tasa = TasaBCV.query.get(tasa_id)
        if not tasa:
            tasa = TasaBCV.query.order_by(TasaBCV.fecha.desc()).first()
        if not tasa:
            return jsonify({'error': 'No hay tasa BCV disponible para hoy'}), 400

    numero_orden = siguiente_numero_orden(db, OrdenDespacho)

    orden = OrdenDespacho(
        numero_orden=numero_orden,
        cliente_id=cliente.id,
        fecha_emision=fecha,
        tasa_bcv_id=tasa.id,
        nota=data.get('nota'),
    )
    db.session.add(orden)
    db.session.flush()

    total_usd = Decimal('0')
    for item in data['detalles']:
        producto = Producto.query.get_or_404(item['producto_id'])
        cantidad = int(item['cantidad_unidades'])
        precio = Decimal(str(item['precio_usd_momento']))

        det = OrdenDespachoDetalle(
            orden_id=orden.id,
            producto_id=producto.id,
            cantidad_unidades=cantidad,
            precio_usd_momento=precio,
        )
        db.session.add(det)
        total_usd += precio * cantidad

        # Update consignment stock (upsert)
        stock = StockConsignacion.query.filter_by(
            cliente_id=cliente.id, producto_id=producto.id
        ).first()
        if stock:
            stock.cantidad_unidades += cantidad
        else:
            db.session.add(StockConsignacion(
                cliente_id=cliente.id,
                producto_id=producto.id,
                cantidad_unidades=cantidad,
            ))

    orden.total_usd = total_usd
    orden.total_bs = total_usd * tasa.valor
    db.session.commit()
    return jsonify(orden.to_dict(include_detalles=True)), 201


@bp.route('/<int:id>/pdf', methods=['GET'])
def download_pdf(id):
    orden = OrdenDespacho.query.get_or_404(id)
    from app.models import ConfigEmpresa
    config = ConfigEmpresa.query.first()
    pdf_bytes = generar_pdf_orden(orden, config)
    return send_file(
        io.BytesIO(pdf_bytes),
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f'orden_{orden.numero_orden}.pdf',
    )
