from flask import Blueprint, jsonify, request
import datetime
from app import db
from app.models import TasaBCV
from app.services.bcv_scraper import obtener_tasa_bcv

bp = Blueprint('tasas', __name__)


@bp.route('', methods=['GET'])
def list_tasas():
    tasas = TasaBCV.query.order_by(TasaBCV.fecha.desc()).limit(30).all()
    return jsonify([t.to_dict() for t in tasas])


@bp.route('/hoy', methods=['GET'])
def get_tasa_hoy():
    hoy = datetime.date.today()
    tasa = TasaBCV.query.filter_by(fecha=hoy).first()

    if not tasa:
        # Try scraping
        valor_scraper = obtener_tasa_bcv()
        if valor_scraper:
            tasa = TasaBCV(fecha=hoy, valor=valor_scraper, fuente='scraper')
            db.session.add(tasa)
            db.session.commit()
        else:
            # Fall back to last known rate
            tasa = TasaBCV.query.order_by(TasaBCV.fecha.desc()).first()
            if not tasa:
                return jsonify({'error': 'No hay tasa registrada. Ingrese la tasa manualmente.'}), 404
            return jsonify({**tasa.to_dict(), 'fecha': hoy.isoformat(), 'fallback': True})

    return jsonify(tasa.to_dict())


@bp.route('', methods=['POST'])
def create_tasa():
    data = request.get_json()
    if not data.get('valor'):
        return jsonify({'error': 'valor requerido'}), 400

    fecha = datetime.date.fromisoformat(data.get('fecha', datetime.date.today().isoformat()))
    tasa = TasaBCV.query.filter_by(fecha=fecha).first()

    if tasa:
        tasa.valor = data['valor']
        tasa.fuente = 'manual'
    else:
        tasa = TasaBCV(fecha=fecha, valor=data['valor'], fuente='manual')
        db.session.add(tasa)

    db.session.commit()
    return jsonify(tasa.to_dict()), 201


@bp.route('/scrape', methods=['POST'])
def scrape_tasa():
    valor = obtener_tasa_bcv()
    if not valor:
        return jsonify({'error': 'No se pudo obtener la tasa del BCV'}), 503

    hoy = datetime.date.today()
    tasa = TasaBCV.query.filter_by(fecha=hoy).first()
    if tasa:
        tasa.valor = valor
        tasa.fuente = 'scraper'
    else:
        tasa = TasaBCV(fecha=hoy, valor=valor, fuente='scraper')
        db.session.add(tasa)
    db.session.commit()
    return jsonify(tasa.to_dict())
