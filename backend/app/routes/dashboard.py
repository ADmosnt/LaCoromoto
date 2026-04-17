from flask import Blueprint, jsonify
import datetime
from app import db
from app.models import (OrdenDespacho, Cliente, Producto,
                         StockConsignacion, TasaBCV, ReporteVenta)

bp = Blueprint('dashboard', __name__)


@bp.route('', methods=['GET'])
def get_dashboard():
    hoy = datetime.date.today()
    mes_inicio = hoy.replace(day=1)

    total_clientes = Cliente.query.filter_by(activo=True).count()
    total_productos = Producto.query.filter_by(activo=True).count()
    ordenes_mes = OrdenDespacho.query.filter(
        OrdenDespacho.fecha_emision >= mes_inicio
    ).count()
    reportes_pendientes = ReporteVenta.query.filter_by(status='pendiente').count()

    tasa_hoy = TasaBCV.query.filter_by(fecha=hoy).first()
    if not tasa_hoy:
        tasa_hoy = TasaBCV.query.order_by(TasaBCV.fecha.desc()).first()

    ultimas_ordenes = OrdenDespacho.query.order_by(
        OrdenDespacho.fecha_emision.desc()
    ).limit(5).all()

    return jsonify({
        'total_clientes': total_clientes,
        'total_productos': total_productos,
        'ordenes_mes': ordenes_mes,
        'reportes_pendientes': reportes_pendientes,
        'tasa_hoy': tasa_hoy.to_dict() if tasa_hoy else None,
        'ultimas_ordenes': [o.to_dict() for o in ultimas_ordenes],
    })
