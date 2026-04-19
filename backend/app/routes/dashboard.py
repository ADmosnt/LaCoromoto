from flask import Blueprint, jsonify
from sqlalchemy import func
import datetime
from app import db
from app.models import (OrdenDespacho, Cliente, Producto,
                         TasaBCV, ReporteVenta)

bp = Blueprint('dashboard', __name__)

MESES_ES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
            'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']


def _mes_label(yyyy_mm):
    y, m = yyyy_mm.split('-')
    return f"{MESES_ES[int(m) - 1]} '{y[2:]}"


def _last_n_months(n=6):
    hoy = datetime.date.today()
    seen, result = set(), []
    for i in range(n * 2 - 1, -1, -1):
        d = (hoy.replace(day=1) - datetime.timedelta(days=i * 15)).replace(day=1)
        key = d.strftime('%Y-%m')
        if key not in seen:
            seen.add(key)
            result.append(key)
    return result[-n:]


@bp.route('', methods=['GET'])
def get_dashboard():
    hoy = datetime.date.today()
    mes_inicio = hoy.replace(day=1)

    total_clientes = Cliente.query.filter_by(activo=True).count()
    total_productos = Producto.query.filter_by(activo=True).count()
    ordenes_mes = OrdenDespacho.query.filter(
        OrdenDespacho.fecha_emision >= mes_inicio,
        OrdenDespacho.status != 'anulada',
    ).count()
    reportes_pendientes = ReporteVenta.query.filter_by(status='pendiente').count()

    tasa_hoy = TasaBCV.query.filter_by(fecha=hoy).first()
    if not tasa_hoy:
        tasa_hoy = TasaBCV.query.order_by(TasaBCV.fecha.desc()).first()

    ultimas_ordenes = OrdenDespacho.query.order_by(
        OrdenDespacho.fecha_emision.desc()
    ).limit(5).all()

    ultimos_reportes = ReporteVenta.query.order_by(
        ReporteVenta.creado_en.desc()
    ).limit(8).all()

    # ── Monthly chart data (last 6 months) ────────────────────────────────────
    meses = _last_n_months(6)
    inicio_rango = datetime.date.fromisoformat(meses[0] + '-01')

    despachos_q = db.session.query(
        func.to_char(OrdenDespacho.fecha_emision, 'YYYY-MM').label('mes'),
        func.sum(OrdenDespacho.total_usd).label('total'),
        func.count(OrdenDespacho.id).label('n'),
    ).filter(
        OrdenDespacho.status != 'anulada',
        OrdenDespacho.fecha_emision >= inicio_rango,
    ).group_by('mes').all()

    ventas_q = db.session.query(
        func.to_char(ReporteVenta.fecha, 'YYYY-MM').label('mes'),
        func.sum(ReporteVenta.total_usd).label('total'),
    ).filter(
        ReporteVenta.status == 'confirmado',
        ReporteVenta.fecha >= inicio_rango,
    ).group_by('mes').all()

    desp_map = {r.mes: float(r.total) for r in despachos_q}
    vent_map = {r.mes: float(r.total) for r in ventas_q}

    mensual = [
        {
            'mes': _mes_label(m),
            'despachos': round(desp_map.get(m, 0), 2),
            'ventas': round(vent_map.get(m, 0), 2),
        }
        for m in meses
    ]

    return jsonify({
        'total_clientes': total_clientes,
        'total_productos': total_productos,
        'ordenes_mes': ordenes_mes,
        'reportes_pendientes': reportes_pendientes,
        'total_despachos_mes': round(desp_map.get(hoy.strftime('%Y-%m'), 0), 2),
        'total_ventas_mes': round(vent_map.get(hoy.strftime('%Y-%m'), 0), 2),
        'tasa_hoy': tasa_hoy.to_dict() if tasa_hoy else None,
        'ultimas_ordenes': [o.to_dict() for o in ultimas_ordenes],
        'ultimos_reportes': [r.to_dict() for r in ultimos_reportes],
        'mensual': mensual,
    })
