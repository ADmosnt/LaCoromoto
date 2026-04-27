from flask import Blueprint, jsonify, request, Response
from app import db
from app.models import (
    ConfigEmpresa, Zona, GrupoCliente, GrupoProducto, ListaPrecio,
    Cliente, ClienteTelefono, Producto, ProductoPrecio, TasaBCV,
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


def _date_str(d):
    return d.isoformat() if d else None


@bp.route('/export', methods=['GET'])
@require_role('admin')
def export_data():
    data = {
        'version': '1',
        'exported_at': datetime.datetime.utcnow().isoformat(),
        'data': {
            'config_empresa': [
                {'id': r.id, 'nombre': r.nombre, 'rif': r.rif,
                 'direccion': r.direccion, 'ciudad': r.ciudad}
                for r in ConfigEmpresa.query.all()
            ],
            'zonas': [{'id': r.id, 'nombre': r.nombre} for r in Zona.query.all()],
            'grupos_clientes': [{'id': r.id, 'nombre': r.nombre} for r in GrupoCliente.query.all()],
            'grupos_productos': [{'id': r.id, 'nombre': r.nombre} for r in GrupoProducto.query.all()],
            'listas_precios': [{'id': r.id, 'nombre': r.nombre} for r in ListaPrecio.query.all()],
            'clientes': [
                {
                    'id': c.id, 'codigo': c.codigo, 'razon_social': c.razon_social,
                    'rif': c.rif, 'direccion': c.direccion,
                    'zona_id': c.zona_id, 'grupo_id': c.grupo_id,
                    'contacto': c.contacto, 'cobrador': c.cobrador, 'vendedor': c.vendedor,
                    'observaciones': c.observaciones, 'activo': c.activo,
                }
                for c in Cliente.query.all()
            ],
            'clientes_telefonos': [
                {'id': t.id, 'cliente_id': t.cliente_id, 'numero': t.numero}
                for t in ClienteTelefono.query.all()
            ],
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
            'tasas_bcv': [
                {'id': r.id, 'fecha': _date_str(r.fecha),
                 'valor': float(r.valor), 'fuente': r.fuente}
                for r in TasaBCV.query.all()
            ],
            'ordenes_despacho': [
                {
                    'id': o.id, 'numero_orden': o.numero_orden,
                    'cliente_id': o.cliente_id,
                    'fecha_emision': _date_str(o.fecha_emision),
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
                    'fecha': _date_str(d.fecha), 'nota': d.nota,
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
                    'fecha': _date_str(r.fecha), 'tasa_bcv_id': r.tasa_bcv_id,
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
                    'fecha': _date_str(e.fecha), 'nota': e.nota,
                    'creado_en': e.creado_en.isoformat() if e.creado_en else None,
                }
                for e in EntradaInventario.query.all()
            ],
            'usuarios': [
                {
                    'id': u.id, 'username': u.username,
                    'password_hash': u.password_hash,
                    'recovery_code_hash': u.recovery_code_hash,
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


# ────────────────────────────────────────────────────────────────────────────
# Import
# ────────────────────────────────────────────────────────────────────────────

# Tablas en orden inverso de dependencias para borrado / orden directo para inserción
_TABLES_DELETE_ORDER = [
    'entradas_inventario', 'inventario_central',
    'reportes_venta_detalle', 'reportes_venta',
    'devoluciones_detalle', 'devoluciones',
    'stock_consignacion',
    'ordenes_despacho_detalle', 'ordenes_despacho',
    'tasas_bcv',
    'productos_precios', 'productos',
    'clientes_lista_precios', 'clientes_telefonos', 'clientes',
    'listas_precios', 'grupos_productos', 'grupos_clientes', 'zonas',
    'usuarios', 'config_empresa',
]


def _parse_date(s):
    return datetime.date.fromisoformat(s) if s else None


def _parse_datetime(s):
    return datetime.datetime.fromisoformat(s) if s else None


def _bump_sequence(table, rows, id_field='id'):
    if not rows:
        return
    max_id = max(r[id_field] for r in rows if r.get(id_field) is not None)
    db.session.execute(text(
        f"SELECT setval(pg_get_serial_sequence('{table}', '{id_field}'), :v)"
    ), {'v': max_id})


@bp.route('/import', methods=['POST'])
@require_role('admin')
def import_data():
    payload = request.get_json(silent=True) or {}
    if not payload.get('confirm'):
        return jsonify({'error': 'Falta confirmación explícita'}), 400
    backup = payload.get('backup')
    if not isinstance(backup, dict) or backup.get('version') != '1' or 'data' not in backup:
        return jsonify({'error': 'Archivo de backup inválido o versión incompatible'}), 400
    d = backup['data']

    required = [
        'config_empresa', 'zonas', 'grupos_clientes', 'grupos_productos',
        'listas_precios', 'clientes', 'clientes_telefonos', 'clientes_lista_precios',
        'productos', 'productos_precios', 'tasas_bcv',
        'ordenes_despacho', 'ordenes_despacho_detalle', 'stock_consignacion',
        'devoluciones', 'devoluciones_detalle',
        'reportes_venta', 'reportes_venta_detalle',
        'inventario_central', 'entradas_inventario', 'usuarios',
    ]
    for k in required:
        if k not in d:
            return jsonify({'error': f'Falta tabla "{k}" en el backup'}), 400

    try:
        # Wipe — TRUNCATE CASCADE limpia todas las tablas y resetea secuencias
        db.session.execute(text(
            f"TRUNCATE {', '.join(_TABLES_DELETE_ORDER)} RESTART IDENTITY CASCADE"
        ))

        # Insertar respetando IDs originales
        for r in d['config_empresa']:
            db.session.add(ConfigEmpresa(**r))

        for r in d['zonas']:
            db.session.add(Zona(**r))
        for r in d['grupos_clientes']:
            db.session.add(GrupoCliente(**r))
        for r in d['grupos_productos']:
            db.session.add(GrupoProducto(**r))
        for r in d['listas_precios']:
            db.session.add(ListaPrecio(**r))

        for r in d['usuarios']:
            db.session.add(Usuario(**r))

        for r in d['clientes']:
            db.session.add(Cliente(**r))
        for r in d['clientes_telefonos']:
            db.session.add(ClienteTelefono(**r))

        db.session.flush()

        # Tabla de unión clientes_lista_precios (no tiene modelo ORM)
        for r in d['clientes_lista_precios']:
            db.session.execute(text(
                'INSERT INTO clientes_lista_precios (cliente_id, lista_id) VALUES (:c, :l)'
            ), {'c': r['cliente_id'], 'l': r['lista_id']})

        for r in d['productos']:
            db.session.add(Producto(**r))
        db.session.flush()

        for r in d['productos_precios']:
            db.session.add(ProductoPrecio(**r))

        for r in d['tasas_bcv']:
            db.session.add(TasaBCV(
                id=r['id'], fecha=_parse_date(r['fecha']),
                valor=r['valor'], fuente=r.get('fuente') or 'manual',
            ))
        db.session.flush()

        for r in d['ordenes_despacho']:
            db.session.add(OrdenDespacho(
                id=r['id'], numero_orden=r['numero_orden'],
                cliente_id=r['cliente_id'],
                fecha_emision=_parse_date(r['fecha_emision']),
                tasa_bcv_id=r['tasa_bcv_id'],
                total_usd=r['total_usd'], total_bs=r['total_bs'],
                nota=r.get('nota'), status=r.get('status') or 'activa',
                creado_en=_parse_datetime(r.get('creado_en')),
            ))
        db.session.flush()

        for r in d['ordenes_despacho_detalle']:
            db.session.add(OrdenDespachoDetalle(**r))

        for r in d['stock_consignacion']:
            db.session.add(StockConsignacion(**r))

        for r in d['devoluciones']:
            db.session.add(Devolucion(
                id=r['id'], cliente_id=r['cliente_id'],
                orden_origen_id=r.get('orden_origen_id'),
                fecha=_parse_date(r['fecha']), nota=r.get('nota'),
                reingresar_almacen=r.get('reingresar_almacen', False),
                creado_en=_parse_datetime(r.get('creado_en')),
            ))
        db.session.flush()

        for r in d['devoluciones_detalle']:
            db.session.add(DevolucionDetalle(**r))

        for r in d['reportes_venta']:
            db.session.add(ReporteVenta(
                id=r['id'], cliente_id=r['cliente_id'],
                orden_id=r.get('orden_id'),
                fecha=_parse_date(r['fecha']), tasa_bcv_id=r['tasa_bcv_id'],
                total_usd=r['total_usd'], total_bs=r['total_bs'],
                status=r.get('status') or 'pendiente',
                creado_en=_parse_datetime(r.get('creado_en')),
            ))
        db.session.flush()

        for r in d['reportes_venta_detalle']:
            db.session.add(ReporteVentaDetalle(**r))

        for r in d['inventario_central']:
            db.session.add(InventarioCentral(**r))

        for r in d['entradas_inventario']:
            db.session.add(EntradaInventario(
                id=r['id'], producto_id=r['producto_id'],
                cantidad_unidades=r['cantidad_unidades'],
                fecha=_parse_date(r['fecha']), nota=r.get('nota'),
                creado_en=_parse_datetime(r.get('creado_en')),
            ))

        db.session.flush()

        # Reajustar secuencias para que los próximos INSERTs no choquen con IDs existentes
        for table in (
            'config_empresa', 'zonas', 'grupos_clientes', 'grupos_productos',
            'listas_precios', 'usuarios', 'clientes', 'clientes_telefonos',
            'productos', 'productos_precios', 'tasas_bcv',
            'ordenes_despacho', 'ordenes_despacho_detalle', 'stock_consignacion',
            'devoluciones', 'devoluciones_detalle',
            'reportes_venta', 'reportes_venta_detalle',
            'inventario_central', 'entradas_inventario',
        ):
            _bump_sequence(table, d.get(table, []))

        db.session.commit()
        return jsonify({'ok': True})
    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'{type(e).__name__}: {str(e)}'}), 500
