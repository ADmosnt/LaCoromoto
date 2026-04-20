from flask import Blueprint, jsonify, request
from app import db
from app.models import Producto, ProductoPrecio, ListaPrecio, GrupoProducto
from app.auth import require_role
import decimal

bp = Blueprint('productos', __name__)


@bp.route('', methods=['GET'])
@require_role('admin')
def list_productos():
    q = Producto.query
    search = request.args.get('search', '')
    if search:
        q = q.filter(
            db.or_(
                Producto.descripcion.ilike(f'%{search}%'),
                Producto.codigo.ilike(f'%{search}%'),
            )
        )
    grupo_id = request.args.get('grupo_id')
    if grupo_id:
        q = q.filter(Producto.grupo_id == int(grupo_id))
    activo = request.args.get('activo')
    if activo is not None:
        q = q.filter(Producto.activo == (activo.lower() == 'true'))
    productos = q.order_by(Producto.descripcion).all()
    return jsonify([p.to_dict() for p in productos])


@bp.route('/<int:id>', methods=['GET'])
@require_role('admin')
def get_producto(id):
    p = Producto.query.get_or_404(id)
    return jsonify(p.to_dict())


@bp.route('', methods=['POST'])
@require_role('admin')
def create_producto():
    data = request.get_json()
    if not data.get('codigo') or not data.get('descripcion'):
        return jsonify({'error': 'codigo y descripcion son requeridos'}), 400

    if Producto.query.filter_by(codigo=data['codigo']).first():
        return jsonify({'error': 'El código ya existe'}), 409

    p = Producto(
        codigo=data['codigo'],
        descripcion=data['descripcion'],
        unidades_por_bulto=data.get('unidades_por_bulto', 1),
        grupo_id=data.get('grupo_id'),
        activo=data.get('activo', True),
    )
    db.session.add(p)
    db.session.flush()

    for precio_data in data.get('precios', []):
        lista = ListaPrecio.query.get(precio_data['lista_id'])
        if lista:
            db.session.add(ProductoPrecio(
                producto_id=p.id,
                lista_id=precio_data['lista_id'],
                precio_usd=precio_data['precio_usd'],
            ))

    db.session.commit()
    return jsonify(p.to_dict()), 201


@bp.route('/<int:id>', methods=['PUT'])
@require_role('admin')
def update_producto(id):
    p = Producto.query.get_or_404(id)
    data = request.get_json()

    for field in ('descripcion', 'unidades_por_bulto', 'grupo_id', 'activo'):
        if field in data:
            setattr(p, field, data[field])

    if 'precios' in data:
        ProductoPrecio.query.filter_by(producto_id=id).delete()
        for precio_data in data['precios']:
            db.session.add(ProductoPrecio(
                producto_id=id,
                lista_id=precio_data['lista_id'],
                precio_usd=precio_data['precio_usd'],
            ))

    db.session.commit()
    return jsonify(p.to_dict())


@bp.route('/<int:id>', methods=['DELETE'])
@require_role('admin')
def delete_producto(id):
    from app.models import OrdenDespachoDetalle, OrdenDespacho
    from sqlalchemy import exists
    p = Producto.query.get_or_404(id)
    activa = db.session.query(
        exists().where(
            OrdenDespachoDetalle.producto_id == id
        ).where(
            OrdenDespachoDetalle.orden_id == OrdenDespacho.id
        ).where(
            OrdenDespacho.status == 'activa'
        )
    ).scalar()
    if activa:
        return jsonify({
            'error': 'No se puede desactivar: este producto tiene órdenes activas en curso. '
                     'Espera a que sean reportadas y confirmadas.'
        }), 409
    p.activo = False
    db.session.commit()
    return '', 204


@bp.route('/<int:id>/reactivar', methods=['POST'])
@require_role('admin')
def reactivar_producto(id):
    p = Producto.query.get_or_404(id)
    p.activo = True
    db.session.commit()
    return jsonify(p.to_dict())


@bp.route('/precios/ajuste', methods=['POST'])
@require_role('admin')
def ajuste_precios():
    data = request.get_json()

    lista_id = data.get('lista_id')
    if not lista_id:
        return jsonify({'error': 'lista_id es requerido'}), 400
    ListaPrecio.query.get_or_404(lista_id)

    tipo = data.get('tipo', 'porcentaje')
    if tipo not in ('porcentaje', 'monto'):
        return jsonify({'error': "tipo debe ser 'porcentaje' o 'monto'"}), 400

    try:
        valor = decimal.Decimal(str(data.get('valor', 0)))
    except Exception:
        return jsonify({'error': 'valor inválido'}), 400

    grupo_id = data.get('grupo_id')
    dry_run = bool(data.get('dry_run', True))

    q = (
        db.session.query(ProductoPrecio)
        .join(Producto, Producto.id == ProductoPrecio.producto_id)
        .filter(ProductoPrecio.lista_id == lista_id, Producto.activo == True)
    )
    if grupo_id:
        q = q.filter(Producto.grupo_id == int(grupo_id))

    precios = q.all()
    if not precios:
        return jsonify({'afectados': [], 'total': 0})

    afectados = []
    for pp in precios:
        anterior = decimal.Decimal(str(pp.precio_usd))
        if tipo == 'porcentaje':
            nuevo = anterior * (1 + valor / 100)
        else:
            nuevo = anterior + valor

        nuevo = max(nuevo, decimal.Decimal('0.01'))
        nuevo = nuevo.quantize(decimal.Decimal('0.01'), rounding=decimal.ROUND_HALF_UP)

        afectados.append({
            'producto_id': pp.producto_id,
            'codigo': pp.producto.codigo,
            'descripcion': pp.producto.descripcion,
            'precio_anterior': float(anterior),
            'precio_nuevo': float(nuevo),
        })
        if not dry_run:
            pp.precio_usd = nuevo

    if not dry_run:
        db.session.commit()

    return jsonify({'afectados': afectados, 'total': len(afectados)})
