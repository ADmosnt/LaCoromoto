from flask import Blueprint, jsonify, request
from sqlalchemy import func, text, case
import datetime
from app import db
from app.models import (OrdenDespacho, Cliente, Producto,
                         TasaBCV, ReporteVenta)
from app.auth import require_role

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


def _chart_data(periodo):
    hoy = datetime.date.today()

    if periodo == 'semanal':
        # last 10 ISO weeks
        weeks = []
        seen = set()
        for i in range(20):
            d = hoy - datetime.timedelta(weeks=i)
            key = d.strftime('%G-%V')
            if key not in seen:
                seen.add(key)
                weeks.append((key, d))
        weeks = [(k, d) for k, d in reversed(weeks)][-10:]
        inicio = weeks[0][1] - datetime.timedelta(days=weeks[0][1].weekday())

        desp_q = db.session.query(
            func.to_char(OrdenDespacho.fecha_emision, 'IYYY-IW').label('k'),
            func.sum(OrdenDespacho.total_usd).label('total'),
        ).filter(
            OrdenDespacho.status != 'anulada',
            OrdenDespacho.fecha_emision >= inicio,
        ).group_by('k').all()

        vent_q = db.session.query(
            func.to_char(ReporteVenta.fecha, 'IYYY-IW').label('k'),
            func.sum(ReporteVenta.total_usd).label('total'),
        ).filter(
            ReporteVenta.status == 'confirmado',
            ReporteVenta.fecha >= inicio,
        ).group_by('k').all()

        desp_map = {r.k: float(r.total) for r in desp_q}
        vent_map = {r.k: float(r.total) for r in vent_q}

        result = []
        for k, d in weeks:
            w_num = k.split('-')[1]
            result.append({
                'mes': f"S{w_num}",
                'despachos': round(desp_map.get(k, 0), 2),
                'ventas': round(vent_map.get(k, 0), 2),
            })
        return result

    elif periodo == 'trimestral':
        # last 6 quarters
        quarters = []
        seen = set()
        for i in range(24):
            d = (hoy.replace(day=1) - datetime.timedelta(days=i * 15)).replace(day=1)
            q = (d.month - 1) // 3 + 1
            key = f"{d.year}-Q{q}"
            if key not in seen:
                seen.add(key)
                quarters.append(key)
        quarters = list(reversed(quarters))[-6:]
        q_start = quarters[0]
        y0, qn = q_start.split('-Q')
        inicio = datetime.date(int(y0), (int(qn) - 1) * 3 + 1, 1)

        desp_q = db.session.query(
            (func.extract('year', OrdenDespacho.fecha_emision).cast(db.Integer).cast(db.String)
             + '-Q'
             + func.ceil(func.extract('month', OrdenDespacho.fecha_emision) / 3).cast(db.Integer).cast(db.String)
             ).label('k'),
            func.sum(OrdenDespacho.total_usd).label('total'),
        ).filter(
            OrdenDespacho.status != 'anulada',
            OrdenDespacho.fecha_emision >= inicio,
        ).group_by('k').all()

        vent_q = db.session.query(
            (func.extract('year', ReporteVenta.fecha).cast(db.Integer).cast(db.String)
             + '-Q'
             + func.ceil(func.extract('month', ReporteVenta.fecha) / 3).cast(db.Integer).cast(db.String)
             ).label('k'),
            func.sum(ReporteVenta.total_usd).label('total'),
        ).filter(
            ReporteVenta.status == 'confirmado',
            ReporteVenta.fecha >= inicio,
        ).group_by('k').all()

        desp_map = {r.k: float(r.total) for r in desp_q}
        vent_map = {r.k: float(r.total) for r in vent_q}

        y_now = str(hoy.year)
        return [
            {
                'mes': f"{k.split('-')[1]} '{k.split('-')[0][2:]}",
                'despachos': round(desp_map.get(k, 0), 2),
                'ventas': round(vent_map.get(k, 0), 2),
            }
            for k in quarters
        ]

    elif periodo == 'semestral':
        # last 4 semesters
        semesters = []
        seen = set()
        for i in range(24):
            d = (hoy.replace(day=1) - datetime.timedelta(days=i * 15)).replace(day=1)
            s = 1 if d.month <= 6 else 2
            key = f"{d.year}-S{s}"
            if key not in seen:
                seen.add(key)
                semesters.append(key)
        semesters = list(reversed(semesters))[-4:]
        y0, sn = semesters[0].split('-S')
        inicio = datetime.date(int(y0), 1 if int(sn) == 1 else 7, 1)

        def sem_key_expr(col):
            return (
                func.extract('year', col).cast(db.Integer).cast(db.String)
                + '-S'
                + func.cast(
                    case((func.extract('month', col) <= 6, 1), else_=2),
                    db.String
                )
            )

        desp_q = db.session.query(
            sem_key_expr(OrdenDespacho.fecha_emision).label('k'),
            func.sum(OrdenDespacho.total_usd).label('total'),
        ).filter(
            OrdenDespacho.status != 'anulada',
            OrdenDespacho.fecha_emision >= inicio,
        ).group_by('k').all()

        vent_q = db.session.query(
            sem_key_expr(ReporteVenta.fecha).label('k'),
            func.sum(ReporteVenta.total_usd).label('total'),
        ).filter(
            ReporteVenta.status == 'confirmado',
            ReporteVenta.fecha >= inicio,
        ).group_by('k').all()

        desp_map = {r.k: float(r.total) for r in desp_q}
        vent_map = {r.k: float(r.total) for r in vent_q}

        return [
            {
                'mes': f"{k.split('-')[1]} '{k.split('-')[0][2:]}",
                'despachos': round(desp_map.get(k, 0), 2),
                'ventas': round(vent_map.get(k, 0), 2),
            }
            for k in semesters
        ]

    else:  # mensual (default)
        meses = _last_n_months(6)
        inicio_rango = datetime.date.fromisoformat(meses[0] + '-01')

        desp_q = db.session.query(
            func.to_char(OrdenDespacho.fecha_emision, 'YYYY-MM').label('k'),
            func.sum(OrdenDespacho.total_usd).label('total'),
        ).filter(
            OrdenDespacho.status != 'anulada',
            OrdenDespacho.fecha_emision >= inicio_rango,
        ).group_by('k').all()

        vent_q = db.session.query(
            func.to_char(ReporteVenta.fecha, 'YYYY-MM').label('k'),
            func.sum(ReporteVenta.total_usd).label('total'),
        ).filter(
            ReporteVenta.status == 'confirmado',
            ReporteVenta.fecha >= inicio_rango,
        ).group_by('k').all()

        desp_map = {r.k: float(r.total) for r in desp_q}
        vent_map = {r.k: float(r.total) for r in vent_q}

        return [
            {
                'mes': _mes_label(m),
                'despachos': round(desp_map.get(m, 0), 2),
                'ventas': round(vent_map.get(m, 0), 2),
            }
            for m in meses
        ], desp_map, vent_map, meses


@bp.route('', methods=['GET'])
@require_role('admin')
def get_dashboard():
    hoy = datetime.date.today()
    mes_inicio = hoy.replace(day=1)
    periodo = request.args.get('periodo', 'mensual')

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

    # KPI totals always based on current month
    mes_key = hoy.strftime('%Y-%m')
    mes_inicio_iso = mes_inicio.isoformat()
    desp_mes = db.session.query(func.sum(OrdenDespacho.total_usd)).filter(
        OrdenDespacho.status != 'anulada',
        OrdenDespacho.fecha_emision >= mes_inicio,
    ).scalar() or 0
    vent_mes = db.session.query(func.sum(ReporteVenta.total_usd)).filter(
        ReporteVenta.status == 'confirmado',
        ReporteVenta.fecha >= mes_inicio,
    ).scalar() or 0

    chart_result = _chart_data(periodo)
    if isinstance(chart_result, tuple):
        mensual = chart_result[0]
    else:
        mensual = chart_result

    return jsonify({
        'total_clientes': total_clientes,
        'total_productos': total_productos,
        'ordenes_mes': ordenes_mes,
        'reportes_pendientes': reportes_pendientes,
        'total_despachos_mes': round(float(desp_mes), 2),
        'total_ventas_mes': round(float(vent_mes), 2),
        'tasa_hoy': tasa_hoy.to_dict() if tasa_hoy else None,
        'ultimas_ordenes': [o.to_dict() for o in ultimas_ordenes],
        'ultimos_reportes': [r.to_dict() for r in ultimos_reportes],
        'mensual': mensual,
    })
