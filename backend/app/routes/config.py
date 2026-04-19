from flask import Blueprint, jsonify, request
from app import db
from app.models import ConfigEmpresa
from app.auth import require_role

bp = Blueprint('config', __name__)


@bp.route('', methods=['GET'])
@require_role('admin')
def get_config():
    c = ConfigEmpresa.query.first()
    return jsonify(c.to_dict())


@bp.route('', methods=['PUT'])
@require_role('admin')
def update_config():
    c = ConfigEmpresa.query.first()
    data = request.get_json()
    for field in ('nombre', 'rif', 'direccion', 'ciudad'):
        if field in data:
            setattr(c, field, data[field])
    db.session.commit()
    return jsonify(c.to_dict())
