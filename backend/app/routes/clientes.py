from flask import Blueprint, jsonify, request
from app import db
from app.models import Cliente, ClienteTelefono, ListaPrecio

bp = Blueprint('clientes', __name__)


@bp.route('', methods=['GET'])
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
def get_cliente(id):
    c = Cliente.query.get_or_404(id)
    return jsonify(c.to_dict())


@bp.route('', methods=['POST'])
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
def delete_cliente(id):
    c = Cliente.query.get_or_404(id)
    c.activo = False
    db.session.commit()
    return '', 204


@bp.route('/<int:id>/stock', methods=['GET'])
def get_cliente_stock(id):
    Cliente.query.get_or_404(id)
    from app.models import StockConsignacion, OrdenDespacho, OrdenDespachoDetalle
    from sqlalchemy import and_
    stock = StockConsignacion.query.filter_by(cliente_id=id).all()
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
        d['ordenes'] = [
            {
                'id': o.id,
                'numero_orden': o.numero_orden,
                'fecha_emision': o.fecha_emision.isoformat(),
                'status': o.status,
                'cantidad_unidades': o.uds_orden,
            }
            for o in ordenes_q
        ]
        result.append(d)
    return jsonify(result)
