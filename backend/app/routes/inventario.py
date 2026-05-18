from flask import Blueprint, jsonify, request
import datetime
from app import db
from app.models import (
    InventarioCentral, EntradaInventario, EntradaInventarioDetalle, Producto,
)
from app.utils import siguiente_numero_entrada
from app.auth import require_role

bp = Blueprint('inventario', __name__)


@bp.route('', methods=['GET'])
@require_role('admin')
def list_inventario():
    items = (
        InventarioCentral.query
        .join(Producto)
        .filter(Producto.activo == True)
        .order_by(Producto.descripcion)
        .all()
    )
    return jsonify([i.to_dict() for i in items])


@bp.route('/entradas', methods=['GET'])
@require_role('admin')
def list_entradas():
    q = EntradaInventario.query
    producto_id = request.args.get('producto_id')
    if producto_id:
        q = (
            q.join(EntradaInventarioDetalle)
             .filter(EntradaInventarioDetalle.producto_id == int(producto_id))
             .distinct()
        )
    entradas = q.order_by(EntradaInventario.fecha.desc(),
                          EntradaInventario.id.desc()).limit(200).all()
    return jsonify([e.to_dict(include_detalles=True) for e in entradas])


@bp.route('/entradas/<int:id>', methods=['GET'])
@require_role('admin')
def get_entrada(id):
    entrada = EntradaInventario.query.get_or_404(id)
    return jsonify(entrada.to_dict(include_detalles=True))


def _validate_detalles(detalles):
    """Returns (cleaned_list, error_message)."""
    if not isinstance(detalles, list) or not detalles:
        return None, 'La entrada debe tener al menos un producto'
    cleaned = []
    for item in detalles:
        try:
            producto_id = int(item.get('producto_id'))
            cantidad = int(item.get('cantidad_unidades'))
        except (TypeError, ValueError):
            return None, 'producto_id y cantidad_unidades inválidos'
        if cantidad <= 0:
            return None, 'La cantidad debe ser mayor a 0'
        prod = Producto.query.get(producto_id)
        if not prod:
            return None, f'Producto id={producto_id} no existe'
        cleaned.append({'producto_id': producto_id, 'cantidad_unidades': cantidad, 'descripcion': prod.descripcion})
    return cleaned, None


def _agregar_a_inventario(producto_id, cantidad):
    inv = InventarioCentral.query.filter_by(producto_id=producto_id).with_for_update().first()
    if inv:
        inv.cantidad_unidades += cantidad
    else:
        db.session.add(InventarioCentral(producto_id=producto_id, cantidad_unidades=cantidad))


def _quitar_de_inventario(producto_id, cantidad, descripcion=None):
    """Returns error message if stock is insufficient."""
    inv = InventarioCentral.query.filter_by(producto_id=producto_id).with_for_update().first()
    disponible = inv.cantidad_unidades if inv else 0
    if disponible < cantidad:
        nombre = descripcion or f'id={producto_id}'
        return (
            f"Stock insuficiente para revertir '{nombre}'. "
            f"Disponible: {disponible} uds, necesario: {cantidad} uds. "
            "Probablemente ya se despacharon esas unidades."
        )
    inv.cantidad_unidades -= cantidad
    return None


@bp.route('/entradas', methods=['POST'])
@require_role('admin')
def create_entrada():
    data = request.get_json() or {}
    detalles, err = _validate_detalles(data.get('detalles'))
    if err:
        return jsonify({'error': err}), 400

    try:
        fecha = datetime.date.fromisoformat(
            data.get('fecha', datetime.date.today().isoformat())
        )
    except ValueError:
        return jsonify({'error': 'Fecha inválida'}), 400

    # Agregar al inventario y crear cabecera+detalles
    entrada = EntradaInventario(
        numero_entrada=siguiente_numero_entrada(db, EntradaInventario),
        fecha=fecha,
        nota=data.get('nota'),
    )
    db.session.add(entrada)
    db.session.flush()

    for d in detalles:
        db.session.add(EntradaInventarioDetalle(
            entrada_id=entrada.id,
            producto_id=d['producto_id'],
            cantidad_unidades=d['cantidad_unidades'],
        ))
        _agregar_a_inventario(d['producto_id'], d['cantidad_unidades'])

    db.session.commit()
    return jsonify(entrada.to_dict(include_detalles=True)), 201


@bp.route('/entradas/<int:id>', methods=['PUT'])
@require_role('admin')
def update_entrada(id):
    entrada = EntradaInventario.query.get_or_404(id)
    data = request.get_json() or {}

    detalles_nuevos, err = _validate_detalles(data.get('detalles'))
    if err:
        return jsonify({'error': err}), 400

    # Cantidades viejas por producto (puede repetirse producto)
    viejos = {}
    for d in entrada.detalles:
        viejos[d.producto_id] = viejos.get(d.producto_id, 0) + d.cantidad_unidades

    # Cantidades nuevas por producto
    nuevos = {}
    nombres = {}
    for d in detalles_nuevos:
        nuevos[d['producto_id']] = nuevos.get(d['producto_id'], 0) + d['cantidad_unidades']
        nombres[d['producto_id']] = d['descripcion']

    # Delta por producto = nuevo - viejo (positivo: agregar, negativo: revertir)
    producto_ids = set(viejos) | set(nuevos)
    for pid in producto_ids:
        delta = nuevos.get(pid, 0) - viejos.get(pid, 0)
        if delta > 0:
            _agregar_a_inventario(pid, delta)
        elif delta < 0:
            err = _quitar_de_inventario(pid, -delta, nombres.get(pid))
            if err:
                db.session.rollback()
                return jsonify({'error': err}), 400

    # Reemplazar detalles
    for d in list(entrada.detalles):
        db.session.delete(d)
    db.session.flush()
    for d in detalles_nuevos:
        db.session.add(EntradaInventarioDetalle(
            entrada_id=entrada.id,
            producto_id=d['producto_id'],
            cantidad_unidades=d['cantidad_unidades'],
        ))

    # Actualizar fecha y nota
    if 'fecha' in data:
        try:
            entrada.fecha = datetime.date.fromisoformat(data['fecha'])
        except ValueError:
            return jsonify({'error': 'Fecha inválida'}), 400
    if 'nota' in data:
        entrada.nota = data['nota']

    db.session.commit()
    return jsonify(entrada.to_dict(include_detalles=True))


@bp.route('/entradas/<int:id>', methods=['DELETE'])
@require_role('admin')
def delete_entrada(id):
    entrada = EntradaInventario.query.get_or_404(id)

    # Revertir cada detalle del inventario
    for d in entrada.detalles:
        producto = Producto.query.get(d.producto_id)
        nombre = producto.descripcion if producto else None
        err = _quitar_de_inventario(d.producto_id, d.cantidad_unidades, nombre)
        if err:
            db.session.rollback()
            return jsonify({'error': err}), 400

    db.session.delete(entrada)
    db.session.commit()
    return jsonify({'ok': True})
