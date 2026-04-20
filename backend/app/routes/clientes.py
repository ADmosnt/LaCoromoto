from flask import Blueprint, jsonify, request
from app import db
from app.models import Cliente, ClienteTelefono, ListaPrecio, GrupoCliente
from app.auth import require_role

bp = Blueprint('clientes', __name__)


@bp.route('', methods=['GET'])
@require_role('admin')
def list_clientes():
    q = Cliente.query
    search = request.args.get('search', '')
    if search:
        q = q.filter(
            db.or_(
                Cliente.razon_social.ilike(f'%{search}%'),
                Cliente.codigo.ilike(f'%{search}%'),
                Cliente.rif.ilike(f'%{search}%'),
            )
        )
    activo = request.args.get('activo')
    if activo is not None:
        q = q.filter(Cliente.activo == (activo.lower() == 'true'))
    clientes = q.order_by(Cliente.razon_social).all()
    return jsonify([c.to_dict() for c in clientes])


@bp.route('/<int:id>', methods=['GET'])
@require_role('admin')
def get_cliente(id):
    c = Cliente.query.get_or_404(id)
    return jsonify(c.to_dict())


@bp.route('', methods=['POST'])
@require_role('admin')
def create_cliente():
    data = request.get_json()
    if not data.get('codigo') or not data.get('razon_social'):
        return jsonify({'error': 'codigo y razon_social son requeridos'}), 400

    if Cliente.query.filter_by(codigo=data['codigo']).first():
        return jsonify({'error': 'El código ya existe'}), 409

    c = Cliente(
        codigo=data['codigo'],
        razon_social=data['razon_social'],
        rif=data.get('rif'),
        direccion=data.get('direccion'),
        zona_id=data.get('zona_id'),
        grupo_id=data.get('grupo_id'),
        contacto=data.get('contacto'),
        cobrador=data.get('cobrador'),
        vendedor=data.get('vendedor'),
        observaciones=data.get('observaciones'),
        activo=data.get('activo', True),
    )
    db.session.add(c)
    db.session.flush()

    for num in data.get('telefonos', []):
        if num and num.strip():
            db.session.add(ClienteTelefono(cliente_id=c.id, numero=num.strip()))

    for lista_id in data.get('listas_precios', []):
        lista = ListaPrecio.query.get(lista_id)
        if lista:
            c.listas_precios.append(lista)

    db.session.commit()
    return jsonify(c.to_dict()), 201


@bp.route('/<int:id>', methods=['PUT'])
@require_role('admin')
def update_cliente(id):
    c = Cliente.query.get_or_404(id)
    data = request.get_json()

    for field in ('razon_social', 'rif', 'direccion', 'zona_id', 'grupo_id',
                  'contacto', 'cobrador', 'vendedor', 'observaciones', 'activo'):
        if field in data:
            setattr(c, field, data[field])

    if 'telefonos' in data:
        ClienteTelefono.query.filter_by(cliente_id=id).delete()
        for num in data['telefonos']:
            if num and num.strip():
                db.session.add(ClienteTelefono(cliente_id=id, numero=num.strip()))

    if 'listas_precios' in data:
        c.listas_precios = []
        for lista_id in data['listas_precios']:
            lista = ListaPrecio.query.get(lista_id)
            if lista:
                c.listas_precios.append(lista)

    db.session.commit()
    return jsonify(c.to_dict())


@bp.route('/<int:id>', methods=['DELETE'])
@require_role('admin')
def delete_cliente(id):
    c = Cliente.query.get_or_404(id)
    c.activo = False
    db.session.commit()
    return '', 204


@bp.route('/<int:id>/stock', methods=['GET'])
@require_role('admin')
def get_cliente_stock(id):
    Cliente.query.get_or_404(id)
    import datetime
    from app.models import StockConsignacion, OrdenDespacho, OrdenDespachoDetalle
    from sqlalchemy import and_
    stock = StockConsignacion.query.filter_by(cliente_id=id).all()
    today = datetime.date.today()
    result = []
    for s in stock:
        if s.cantidad_unidades <= 0:
            continue
        d = s.to_dict()
        ordenes_q = db.session.query(
            OrdenDespacho.id,
            OrdenDespacho.numero_orden,
            OrdenDespacho.fecha_emision,
            OrdenDespacho.status,
            OrdenDespachoDetalle.cantidad_unidades.label('uds_orden'),
        ).join(
            OrdenDespachoDetalle,
            and_(
                OrdenDespachoDetalle.orden_id == OrdenDespacho.id,
                OrdenDespachoDetalle.producto_id == s.producto_id,
            )
        ).filter(
            OrdenDespacho.cliente_id == id,
            OrdenDespacho.status.in_(['activa', 'pendiente']),
        ).all()
        ordenes = sorted(ordenes_q, key=lambda o: o.fecha_emision)
        d['ordenes'] = [
            {
                'id': o.id,
                'numero_orden': o.numero_orden,
                'fecha_emision': o.fecha_emision.isoformat(),
                'status': o.status,
                'cantidad_unidades': o.uds_orden,
            }
            for o in ordenes
        ]
        if ordenes:
            d['fecha_mas_antigua'] = ordenes[0].fecha_emision.isoformat()
            d['dias_antiguedad'] = (today - ordenes[0].fecha_emision).days
        else:
            d['fecha_mas_antigua'] = None
            d['dias_antiguedad'] = None
        result.append(d)
    return jsonify(result)


@bp.route('/grupos/<int:grupo_id>/consolidado', methods=['GET'])
@require_role('admin')
def get_grupo_consolidado(grupo_id):
    from app.models import StockConsignacion, Producto
    from sqlalchemy import func

    grupo = GrupoCliente.query.get_or_404(grupo_id)
    clientes = Cliente.query.filter_by(grupo_id=grupo_id, activo=True).order_by(Cliente.razon_social).all()
    cliente_ids = [c.id for c in clientes]

    if not cliente_ids:
        return jsonify({
            'grupo': grupo.to_dict(),
            'total_clientes': 0,
            'clientes': [],
            'stock_consolidado': [],
        })

    rows = (
        db.session.query(
            StockConsignacion.producto_id,
            StockConsignacion.cliente_id,
            StockConsignacion.cantidad_unidades,
        )
        .filter(
            StockConsignacion.cliente_id.in_(cliente_ids),
            StockConsignacion.cantidad_unidades > 0,
        )
        .all()
    )

    # Aggregate by product
    from collections import defaultdict
    prod_map = defaultdict(lambda: {'total': 0, 'clientes': []})
    for r in rows:
        prod_map[r.producto_id]['total'] += r.cantidad_unidades
        prod_map[r.producto_id]['clientes'].append({
            'cliente_id': r.cliente_id,
            'cantidad_unidades': r.cantidad_unidades,
        })

    # Build result
    consolidado = []
    for prod_id, data in prod_map.items():
        p = Producto.query.get(prod_id)
        if not p:
            continue
        upb = p.unidades_por_bulto
        total = data['total']
        # Enrich per-client rows with name
        clientes_stock = []
        for cs in data['clientes']:
            c = next((x for x in clientes if x.id == cs['cliente_id']), None)
            if c:
                clientes_stock.append({
                    'cliente_id': cs['cliente_id'],
                    'razon_social': c.razon_social,
                    'codigo': c.codigo,
                    'cantidad_unidades': cs['cantidad_unidades'],
                    'bultos': cs['cantidad_unidades'] // upb,
                    'sueltas': cs['cantidad_unidades'] % upb,
                })
        clientes_stock.sort(key=lambda x: x['razon_social'])
        consolidado.append({
            'producto_id': prod_id,
            'codigo': p.codigo,
            'descripcion': p.descripcion,
            'unidades_por_bulto': upb,
            'total_unidades': total,
            'total_bultos': total // upb,
            'total_sueltas': total % upb,
            'clientes_con_stock': len(clientes_stock),
            'por_cliente': clientes_stock,
        })

    consolidado.sort(key=lambda x: x['descripcion'])

    return jsonify({
        'grupo': grupo.to_dict(),
        'total_clientes': len(clientes),
        'clientes': [c.to_dict() for c in clientes],
        'stock_consolidado': consolidado,
    })
