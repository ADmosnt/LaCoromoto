from flask import Blueprint, jsonify, Response
from app import db
from app.models import (
    ConfigEmpresa, Zona, GrupoCliente, GrupoProducto, ListaPrecio,
    Cliente, Producto, ProductoPrecio, TasaBCV,
    OrdenDespacho, OrdenDespachoDetalle, StockConsignacion,
    Devolucion, DevolucionDetalle, ReporteVenta, ReporteVentaDetalle,
    InventarioCentral, EntradaInventario, Usuario,
)
from app.auth import require_role
from sqlalchemy import text
import datetime
import json

bp = Blueprint('admin', __name__)


def _join_table(table_name):
    with db.engine.connect() as conn:
        result = conn.execute(text(f'SELECT * FROM {table_name}'))
        rows = result.mappings().all()
        return [dict(r) for r in rows]


@bp.route('/export', methods=['GET'])
@require_role('admin')
def export_data():
    data = {
        'version': '1',
        'exported_at': datetime.datetime.utcnow().isoformat(),
        'data': {
            'config_empresa': [r.to_dict() for r in ConfigEmpresa.query.all()],
            'zonas': [r.to_dict() for r in Zona.query.all()],
            'grupos_clientes': [r.to_dict() for r in GrupoCliente.query.all()],
            'grupos_productos': [r.to_dict() for r in GrupoProducto.query.all()],
            'listas_precios': [r.to_dict() for r in ListaPrecio.query.all()],
            'clientes': [r.to_dict() for r in Cliente.query.all()],
            'clientes_lista_precios': _join_table('clientes_lista_precios'),
            'productos': [
                {
                    'id': p.id, 'codigo': p.codigo, 'descripcion': p.descripcion,
                    'unidades_por_bulto': p.unidades_por_bulto,
                    'grupo_id': p.grupo_id, 'activo': p.activo,
                }
                for p in Producto.query.all()
            ],
            'productos_precios': [
                {
                    'id': pp.id, 'producto_id': pp.producto_id,
                    'lista_id': pp.lista_id, 'precio_usd': float(pp.precio_usd),
                }
                for pp in ProductoPrecio.query.all()
            ],
            'tasas_bcv': [r.to_dict() for r in TasaBCV.query.all()],
            'ordenes_despacho': [
                {
                    'id': o.id, 'numero_orden': o.numero_orden,
                    'cliente_id': o.cliente_id,
                    'fecha_emision': o.fecha_emision.isoformat(),
                    'tasa_bcv_id': o.tasa_bcv_id,
                    'total_usd': float(o.total_usd), 'total_bs': float(o.total_bs),
                    'nota': o.nota, 'status': o.status,
                    'creado_en': o.creado_en.isoformat() if o.creado_en else None,
                }
                for o in OrdenDespacho.query.all()
            ],
            'ordenes_despacho_detalle': [
                {
                    'id': d.id, 'orden_id': d.orden_id, 'producto_id': d.producto_id,
                    'cantidad_unidades': d.cantidad_unidades,
                    'precio_usd_momento': float(d.precio_usd_momento),
                }
                for d in OrdenDespachoDetalle.query.all()
            ],
            'stock_consignacion': [
                {
                    'id': s.id, 'cliente_id': s.cliente_id,
                    'producto_id': s.producto_id, 'cantidad_unidades': s.cantidad_unidades,
                }
                for s in StockConsignacion.query.all()
            ],
            'devoluciones': [
                {
                    'id': d.id, 'cliente_id': d.cliente_id,
                    'orden_origen_id': d.orden_origen_id,
                    'fecha': d.fecha.isoformat(), 'nota': d.nota,
                    'reingresar_almacen': d.reingresar_almacen,
                    'creado_en': d.creado_en.isoformat() if d.creado_en else None,
                }
                for d in Devolucion.query.all()
            ],
            'devoluciones_detalle': [
                {
                    'id': d.id, 'devolucion_id': d.devolucion_id,
                    'producto_id': d.producto_id, 'cantidad_unidades': d.cantidad_unidades,
                }
                for d in DevolucionDetalle.query.all()
            ],
            'reportes_venta': [
                {
                    'id': r.id, 'cliente_id': r.cliente_id, 'orden_id': r.orden_id,
                    'fecha': r.fecha.isoformat(), 'tasa_bcv_id': r.tasa_bcv_id,
                    'total_usd': float(r.total_usd), 'total_bs': float(r.total_bs),
                    'status': r.status,
                    'creado_en': r.creado_en.isoformat() if r.creado_en else None,
                }
                for r in ReporteVenta.query.all()
            ],
            'reportes_venta_detalle': [
                {
                    'id': d.id, 'reporte_id': d.reporte_id, 'producto_id': d.producto_id,
                    'cantidad_unidades': d.cantidad_unidades,
                    'precio_usd_momento': float(d.precio_usd_momento),
                }
                for d in ReporteVentaDetalle.query.all()
            ],
            'inventario_central': [
                {
                    'id': inv.id, 'producto_id': inv.producto_id,
                    'cantidad_unidades': inv.cantidad_unidades,
                }
                for inv in InventarioCentral.query.all()
            ],
            'entradas_inventario': [
                {
                    'id': e.id, 'producto_id': e.producto_id,
                    'cantidad_unidades': e.cantidad_unidades,
                    'fecha': e.fecha.isoformat(), 'nota': e.nota,
                    'creado_en': e.creado_en.isoformat() if e.creado_en else None,
                }
                for e in EntradaInventario.query.all()
            ],
            'usuarios': [
                {
                    'id': u.id, 'username': u.username,
                    'password_hash': u.password_hash,
                    'rol': u.rol, 'cliente_id': u.cliente_id, 'activo': u.activo,
                }
                for u in Usuario.query.all()
            ],
        }
    }

    filename = f"lacoromoto_backup_{datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')}.json"
    return Response(
        json.dumps(data, ensure_ascii=False, indent=2),
        mimetype='application/json',
        headers={'Content-Disposition': f'attachment; filename="{filename}"'},
    )
