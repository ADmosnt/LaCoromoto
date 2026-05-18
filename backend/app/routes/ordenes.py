from flask import Blueprint, jsonify, request, send_file
from decimal import Decimal
import io
import datetime
from sqlalchemy import func
from app import db
from app.models import (OrdenDespacho, OrdenDespachoDetalle, OrdenDespachoEdicion,
                         StockConsignacion, InventarioCentral,
                         TasaBCV, Cliente, Producto, Devolucion, ReporteVenta)
from app.utils import siguiente_numero_orden, resolv_tasa
from app.services.pdf_generator import generar_pdf_orden
from app.auth import require_role, get_current_user

bp = Blueprint('ordenes', __name__)


def _ediciones_count_map():
    rows = (
        db.session.query(
            OrdenDespachoEdicion.orden_id,
            func.count(OrdenDespachoEdicion.id),
        )
        .group_by(OrdenDespachoEdicion.orden_id)
        .all()
    )
    return {r[0]: r[1] for r in rows}


def _editabilidad(orden):
    """Devuelve (puede_editar: bool, razon: str)."""
    if orden.status != 'activa':
        return False, f'Orden con estado "{orden.status}"'
    reportes_bloq = [
        r for r in getattr(orden, 'reportes', [])
        if r.status in ('pendiente', 'confirmado')
    ]
    if reportes_bloq:
        return False, 'Tiene reporte de venta'
    devs = Devolucion.query.filter_by(orden_origen_id=orden.id).count()
    if devs > 0:
        return False, 'Tiene devoluciones registradas'
    return True, ''


@bp.route('', methods=['GET'])
@require_role('admin', 'cliente')
def list_ordenes():
    current_user = get_current_user()
    q = OrdenDespacho.query
    if current_user.rol == 'cliente':
        q = q.filter(OrdenDespacho.cliente_id == current_user.cliente_id)
    else:
        cliente_id = request.args.get('cliente_id')
        if cliente_id:
            q = q.filter(OrdenDespacho.cliente_id == int(cliente_id))
    fecha_desde = request.args.get('fecha_desde')
    if fecha_desde:
        q = q.filter(OrdenDespacho.fecha_emision >= datetime.date.fromisoformat(fecha_desde))
    fecha_hasta = request.args.get('fecha_hasta')
    if fecha_hasta:
        q = q.filter(OrdenDespacho.fecha_emision <= datetime.date.fromisoformat(fecha_hasta))
    status = request.args.get('status')
    if status:
        q = q.filter(OrdenDespacho.status == status)
    ordenes = q.order_by(OrdenDespacho.fecha_emision.desc(), OrdenDespacho.numero_orden.desc()).all()

    counts = _ediciones_count_map()
    result = []
    for o in ordenes:
        d = o.to_dict()
        d['ediciones_count'] = counts.get(o.id, 0)
        result.append(d)
    return jsonify(result)


@bp.route('/<int:id>', methods=['GET'])
@require_role('admin', 'cliente')
def get_orden(id):
    current_user = get_current_user()
    o = OrdenDespacho.query.get_or_404(id)
    if current_user.rol == 'cliente' and o.cliente_id != current_user.cliente_id:
        return jsonify({'error': 'Sin permiso'}), 403
    d = o.to_dict(include_detalles=True)
    d['ediciones_count'] = OrdenDespachoEdicion.query.filter_by(orden_id=id).count()
    if current_user.rol == 'admin':
        puede, razon = _editabilidad(o)
        d['puede_editar'] = puede
        d['no_editable_razon'] = razon if not puede else ''
    return jsonify(d)


@bp.route('/<int:id>/ediciones', methods=['GET'])
@require_role('admin')
def list_ediciones(id):
    OrdenDespacho.query.get_or_404(id)
    ediciones = (
        OrdenDespachoEdicion.query
        .filter_by(orden_id=id)
        .order_by(OrdenDespachoEdicion.editado_en.desc())
        .all()
    )
    return jsonify([e.to_dict() for e in ediciones])


@bp.route('', methods=['POST'])
@require_role('admin')
def create_orden():
    data = request.get_json()

    if not data.get('cliente_id'):
        return jsonify({'error': 'cliente_id requerido'}), 400
    if not data.get('detalles'):
        return jsonify({'error': 'La orden debe tener al menos un producto'}), 400

    cliente = Cliente.query.get_or_404(data['cliente_id'])

    fecha = datetime.date.fromisoformat(data.get('fecha_emision', datetime.date.today().isoformat()))
    tasa = resolv_tasa(TasaBCV, fecha, data.get('tasa_bcv_id'))
    if not tasa:
        return jsonify({'error': 'No hay tasa BCV disponible'}), 400

    numero_orden = siguiente_numero_orden(db, OrdenDespacho)
    orden = OrdenDespacho(
        numero_orden=numero_orden,
        cliente_id=cliente.id,
        fecha_emision=fecha,
        tasa_bcv_id=tasa.id,
        nota=data.get('nota'),
        status='activa',
    )
    db.session.add(orden)
    db.session.flush()

    total_usd = Decimal('0')
    for item in data['detalles']:
        cantidad = int(item.get('cantidad_unidades', 0))
        precio = Decimal(str(item.get('precio_usd_momento', 0)))

        if cantidad <= 0:
            return jsonify({'error': 'La cantidad debe ser mayor a 0'}), 400
        if precio < 0:
            return jsonify({'error': 'El precio no puede ser negativo'}), 400

        producto = Producto.query.get_or_404(item['producto_id'])

        inv = InventarioCentral.query.filter_by(
            producto_id=producto.id
        ).with_for_update().first()
        disponible = inv.cantidad_unidades if inv else 0
        if disponible < cantidad:
            return jsonify({
                'error': f"Stock insuficiente para '{producto.descripcion}'. "
                         f"Disponible: {disponible} uds, solicitado: {cantidad} uds."
            }), 400

        inv.cantidad_unidades -= cantidad

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

        db.session.add(OrdenDespachoDetalle(
            orden_id=orden.id,
            producto_id=producto.id,
            cantidad_unidades=cantidad,
            precio_usd_momento=precio,
        ))
        total_usd += precio * cantidad

    orden.total_usd = total_usd
    orden.total_bs = total_usd * tasa.valor
    db.session.commit()
    return jsonify(orden.to_dict(include_detalles=True)), 201


def _validate_detalles(detalles_in):
    cleaned = []
    for item in detalles_in:
        try:
            producto_id = int(item['producto_id'])
            cantidad = int(item['cantidad_unidades'])
            precio = Decimal(str(item['precio_usd_momento']))
        except (KeyError, TypeError, ValueError):
            return None, 'Detalles inválidos'
        if cantidad <= 0:
            return None, 'La cantidad debe ser mayor a 0'
        if precio < 0:
            return None, 'El precio no puede ser negativo'
        prod = Producto.query.get(producto_id)
        if not prod:
            return None, f'Producto id={producto_id} no existe'
        cleaned.append({
            'producto_id': producto_id,
            'cantidad_unidades': cantidad,
            'precio_usd_momento': precio,
            'descripcion': prod.descripcion,
        })
    return cleaned, None


@bp.route('/<int:id>', methods=['PUT'])
@require_role('admin')
def update_orden(id):
    orden = OrdenDespacho.query.get_or_404(id)

    puede, razon = _editabilidad(orden)
    if not puede:
        return jsonify({'error': f'No se puede editar esta orden: {razon}.'}), 400

    data = request.get_json() or {}
    detalles_in = data.get('detalles')
    if not detalles_in:
        return jsonify({'error': 'La orden debe tener al menos un producto'}), 400

    cleaned, err = _validate_detalles(detalles_in)
    if err:
        return jsonify({'error': err}), 400

    # Snapshot ANTES
    snapshot_antes = orden.to_dict(include_detalles=True)

    # Cantidades antes y después por producto
    antes_qty = {}
    for d in orden.detalles:
        antes_qty[d.producto_id] = antes_qty.get(d.producto_id, 0) + d.cantidad_unidades
    despues_qty = {}
    for d in cleaned:
        despues_qty[d['producto_id']] = despues_qty.get(d['producto_id'], 0) + d['cantidad_unidades']

    nombres = {d['producto_id']: d['descripcion'] for d in cleaned}
    for d in orden.detalles:
        if d.producto_id not in nombres and d.producto:
            nombres[d.producto_id] = d.producto.descripcion

    # Aplicar deltas
    for pid in set(antes_qty) | set(despues_qty):
        delta = despues_qty.get(pid, 0) - antes_qty.get(pid, 0)
        if delta == 0:
            continue
        nombre = nombres.get(pid, f'id={pid}')

        if delta > 0:
            inv = InventarioCentral.query.filter_by(
                producto_id=pid
            ).with_for_update().first()
            disponible = inv.cantidad_unidades if inv else 0
            if disponible < delta:
                db.session.rollback()
                return jsonify({
                    'error': f"Stock insuficiente para '{nombre}'. "
                             f"Disponible: {disponible} uds, faltan: {delta - disponible} uds."
                }), 400
            inv.cantidad_unidades -= delta
            stock = StockConsignacion.query.filter_by(
                cliente_id=orden.cliente_id, producto_id=pid
            ).first()
            if stock:
                stock.cantidad_unidades += delta
            else:
                db.session.add(StockConsignacion(
                    cliente_id=orden.cliente_id,
                    producto_id=pid,
                    cantidad_unidades=delta,
                ))
        else:
            abs_delta = -delta
            stock = StockConsignacion.query.filter_by(
                cliente_id=orden.cliente_id, producto_id=pid
            ).with_for_update().first()
            disponible = stock.cantidad_unidades if stock else 0
            if disponible < abs_delta:
                db.session.rollback()
                return jsonify({
                    'error': f"No se puede reducir '{nombre}': el cliente tiene "
                             f"{disponible} uds en consignación pero necesitamos "
                             f"revertir {abs_delta} uds."
                }), 400
            stock.cantidad_unidades -= abs_delta
            inv = InventarioCentral.query.filter_by(producto_id=pid).first()
            if inv:
                inv.cantidad_unidades += abs_delta
            else:
                db.session.add(InventarioCentral(
                    producto_id=pid,
                    cantidad_unidades=abs_delta,
                ))

    # Reemplazar detalles
    for d in list(orden.detalles):
        db.session.delete(d)
    db.session.flush()

    total_usd = Decimal('0')
    for d in cleaned:
        db.session.add(OrdenDespachoDetalle(
            orden_id=orden.id,
            producto_id=d['producto_id'],
            cantidad_unidades=d['cantidad_unidades'],
            precio_usd_momento=d['precio_usd_momento'],
        ))
        total_usd += d['precio_usd_momento'] * d['cantidad_unidades']

    # Campos editables
    if 'fecha_emision' in data and data['fecha_emision']:
        try:
            orden.fecha_emision = datetime.date.fromisoformat(data['fecha_emision'])
        except ValueError:
            db.session.rollback()
            return jsonify({'error': 'Fecha inválida'}), 400
    if 'nota' in data:
        orden.nota = data.get('nota')

    # Tasa: resolver según fecha o id
    if data.get('tasa_bcv_id') or 'fecha_emision' in data:
        nueva_tasa = resolv_tasa(TasaBCV, orden.fecha_emision, data.get('tasa_bcv_id'))
        if nueva_tasa:
            orden.tasa_bcv_id = nueva_tasa.id

    orden.total_usd = total_usd
    orden.total_bs = total_usd * orden.tasa.valor

    db.session.flush()
    # Force SQLAlchemy to re-query the relationship so snapshot reflects new rows
    db.session.expire(orden, ['detalles'])

    # Snapshot DESPUÉS
    snapshot_despues = orden.to_dict(include_detalles=True)
    for snap in (snapshot_antes, snapshot_despues):
        snap.pop('devoluciones', None)
        snap.pop('reporte_id', None)

    current_user = get_current_user()
    edicion = OrdenDespachoEdicion(
        orden_id=orden.id,
        editado_por_id=current_user.id if current_user else None,
        snapshot_antes=snapshot_antes,
        snapshot_despues=snapshot_despues,
        motivo=data.get('motivo'),
    )
    db.session.add(edicion)
    db.session.commit()

    return jsonify(orden.to_dict(include_detalles=True))


@bp.route('/<int:id>/anular', methods=['PUT'])
@require_role('admin')
def anular_orden(id):
    orden = OrdenDespacho.query.get_or_404(id)
    if orden.status == 'anulada':
        return jsonify({'error': 'La orden ya está anulada'}), 400

    for det in orden.detalles:
        stock = StockConsignacion.query.filter_by(
            cliente_id=orden.cliente_id, producto_id=det.producto_id
        ).with_for_update().first()
        disponible = stock.cantidad_unidades if stock else 0
        if disponible < det.cantidad_unidades:
            producto = Producto.query.get(det.producto_id)
            nombre = producto.descripcion if producto else f'ID {det.producto_id}'
            return jsonify({
                'error': f"No se puede anular: el cliente ya consumió parte de '{nombre}'. "
                         f"Stock actual: {disponible} uds, necesario revertir: {det.cantidad_unidades} uds."
            }), 400
        stock.cantidad_unidades -= det.cantidad_unidades

        inv = InventarioCentral.query.filter_by(producto_id=det.producto_id).first()
        if inv:
            inv.cantidad_unidades += det.cantidad_unidades
        else:
            db.session.add(InventarioCentral(
                producto_id=det.producto_id,
                cantidad_unidades=det.cantidad_unidades,
            ))

    orden.status = 'anulada'
    db.session.commit()
    return jsonify(orden.to_dict(include_detalles=True))


@bp.route('/<int:id>/pdf', methods=['GET'])
@require_role('admin', 'cliente')
def download_pdf(id):
    current_user = get_current_user()
    orden = OrdenDespacho.query.get_or_404(id)
    if current_user.rol == 'cliente' and orden.cliente_id != current_user.cliente_id:
        return jsonify({'error': 'Sin permiso'}), 403
    from app.models import ConfigEmpresa
    config = ConfigEmpresa.query.first()
    pdf_bytes = generar_pdf_orden(orden, config)
    return send_file(
        io.BytesIO(pdf_bytes),
        mimetype='application/pdf',
        as_attachment=True,
        download_name=f'orden_{orden.numero_orden}.pdf',
    )
