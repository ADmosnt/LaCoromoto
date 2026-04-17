from fpdf import FPDF
from app.utils import numero_a_letras


def generar_pdf_orden(orden, config) -> bytes:
    pdf = FPDF(orientation='P', unit='mm', format='Letter')
    pdf.set_margins(15, 15, 15)
    pdf.set_auto_page_break(auto=True, margin=20)
    pdf.add_page()

    W = 180  # usable width (215.9mm - 2*15 margins)
    L = 15   # left margin

    # ── Header ────────────────────────────────────────────────────────────────
    # Left: company info
    pdf.set_xy(L, 15)
    pdf.set_font('Helvetica', 'B', 13)
    pdf.set_text_color(30, 30, 30)
    pdf.cell(W * 0.52, 7, config.nombre, ln=True)

    pdf.set_font('Helvetica', '', 9)
    pdf.set_text_color(90, 90, 90)
    pdf.set_x(L)
    pdf.cell(W * 0.52, 5, config.direccion, ln=True)
    pdf.set_x(L)
    pdf.cell(W * 0.52, 5, config.ciudad, ln=True)

    # Right: document box
    bx = L + W * 0.55
    bw = W * 0.45
    tasa_val = float(orden.tasa.valor) if orden.tasa else 0

    pdf.set_xy(bx, 15)
    pdf.set_font('Helvetica', 'B', 11)
    pdf.set_text_color(255, 255, 255)
    pdf.set_fill_color(30, 30, 30)
    pdf.cell(bw, 8, 'NOTA DE ENTREGA', border=0, align='C', fill=True, ln=True)

    doc_rows = [
        ('N\u00b0:', orden.numero_orden),
        ('RIF:', config.rif),
        ('FECHA:', str(orden.fecha_emision)),
        ('TASA BCV:', f'Bs. {tasa_val:.4f}'),
    ]
    pdf.set_text_color(30, 30, 30)
    for label, value in doc_rows:
        pdf.set_xy(bx, pdf.get_y())
        pdf.set_font('Helvetica', 'B', 9)
        pdf.cell(bw * 0.45, 5, label, align='R')
        pdf.set_font('Helvetica', '', 9)
        pdf.cell(bw * 0.55, 5, value, ln=True)

    # ── Separator ─────────────────────────────────────────────────────────────
    pdf.set_y(max(pdf.get_y(), 40))
    pdf.set_draw_color(0, 0, 0)
    pdf.line(L, pdf.get_y(), L + W, pdf.get_y())
    pdf.ln(3)

    # ── Client section ────────────────────────────────────────────────────────
    def row(label, value):
        if not value:
            return
        pdf.set_font('Helvetica', 'B', 9)
        pdf.set_text_color(30, 30, 30)
        pdf.cell(30, 5, label + ':', ln=False)
        pdf.set_font('Helvetica', '', 9)
        pdf.multi_cell(0, 5, str(value))

    row('CLIENTE', orden.cliente.razon_social)
    row('RIF', orden.cliente.rif)
    row('DIRECCIÓN', orden.cliente.direccion)
    telefonos = ', '.join(t.numero for t in orden.cliente.telefonos)
    row('TELÉFONOS', telefonos)
    row('NOTA', orden.nota)

    pdf.ln(2)
    pdf.line(L, pdf.get_y(), L + W, pdf.get_y())
    pdf.ln(3)

    # ── Table header ──────────────────────────────────────────────────────────
    col_w = [24, 82, 18, 28, 28]
    headers = ['CÓDIGO', 'DESCRIPCIÓN', 'CANT.', 'PRECIO USD', 'TOTAL USD']
    aligns  = ['C',      'L',           'C',      'R',          'R']

    pdf.set_fill_color(30, 30, 30)
    pdf.set_text_color(255, 255, 255)
    pdf.set_font('Helvetica', 'B', 8)
    for w, h, a in zip(col_w, headers, aligns):
        pdf.cell(w, 6, h, border=0, align=a, fill=True)
    pdf.ln()

    # ── Table rows ────────────────────────────────────────────────────────────
    pdf.set_text_color(30, 30, 30)
    shade = False
    for det in orden.detalles:
        pdf.set_fill_color(245, 245, 245)
        pdf.set_font('Helvetica', '', 8)
        total = float(det.cantidad_unidades) * float(det.precio_usd_momento)
        vals = [
            det.producto.codigo,
            det.producto.descripcion,
            str(det.cantidad_unidades),
            f'{float(det.precio_usd_momento):.2f}',
            f'{total:.2f}',
        ]
        for w, v, a in zip(col_w, vals, aligns):
            pdf.cell(w, 5, v, border='B', align=a, fill=shade)
        pdf.ln()
        shade = not shade

    # ── Totals ────────────────────────────────────────────────────────────────
    pdf.ln(3)
    pdf.line(L, pdf.get_y(), L + W, pdf.get_y())
    pdf.ln(2)

    total_usd = float(orden.total_usd)
    total_bs  = float(orden.total_bs)
    label_w   = 30
    val_w     = 35

    for label, value in [('TOTAL USD:', f'$ {total_usd:.2f}'), ('TOTAL Bs.:', f'Bs. {total_bs:.2f}')]:
        pdf.set_font('Helvetica', 'B', 10)
        pdf.cell(W - label_w - val_w, 6, '')
        pdf.cell(label_w, 6, label, align='R')
        pdf.cell(val_w,   6, value, align='R', ln=True)

    pdf.ln(1)
    pdf.set_font('Helvetica', 'I', 8)
    pdf.set_text_color(90, 90, 90)
    pdf.cell(0, 5, f'SON: {numero_a_letras(total_usd)} DÓLARES', ln=True)

    # ── Signatures ────────────────────────────────────────────────────────────
    pdf.ln(15)
    y = pdf.get_y()
    sx1 = L + 10
    sx2 = L + W - 70
    sw  = 60
    pdf.set_draw_color(0, 0, 0)
    pdf.line(sx1, y, sx1 + sw, y)
    pdf.line(sx2, y, sx2 + sw, y)
    pdf.set_font('Helvetica', '', 8)
    pdf.set_text_color(30, 30, 30)
    pdf.set_xy(sx1, y + 2)
    pdf.cell(sw, 5, 'DESPACHADO POR', align='C')
    pdf.set_xy(sx2, y + 2)
    pdf.cell(sw, 5, 'RECIBIDO POR', align='C')

    return bytes(pdf.output())
