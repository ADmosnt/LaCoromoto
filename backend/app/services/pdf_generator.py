import os
from jinja2 import Environment, FileSystemLoader
from weasyprint import HTML
from app.utils import numero_a_letras

TEMPLATE_DIR = os.path.join(os.path.dirname(__file__), '..', 'templates')


def generar_pdf_orden(orden, config) -> bytes:
    env = Environment(loader=FileSystemLoader(TEMPLATE_DIR))
    template = env.get_template('nota_entrega.html')

    detalles = [det.to_dict() for det in orden.detalles]
    total_usd = float(orden.total_usd)
    total_bs = float(orden.total_bs)
    tasa = float(orden.tasa.valor) if orden.tasa else 0
    telefonos = ', '.join(t.numero for t in orden.cliente.telefonos)

    html_str = template.render(
        config=config,
        orden=orden,
        detalles=detalles,
        total_usd=total_usd,
        total_bs=total_bs,
        tasa=tasa,
        telefonos=telefonos,
        total_letras=numero_a_letras(total_usd),
    )

    return HTML(string=html_str).write_pdf()
