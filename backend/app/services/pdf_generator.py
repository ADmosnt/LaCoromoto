from fpdf import FPDF
from app.utils import numero_a_letras


def generar_pdf_orden(orden, config) -> bytes:
    pdf = FPDF(orientation='P', unit='mm', format='Letter')

    # Letter: 215.9 x 279.4 mm
    PAGE_H      = 279.4
    MARGIN      = 15
    W           = 180   # usable width
    L           = MARGIN
    FOOTER_H    = 32    # reserved height for the totals footer block

    pdf.set_margins(MARGIN, MARGIN, MARGIN)
    pdf.set_auto_page_break(auto=True, margin=FOOTER_H + MARGIN)
    pdf.add_page()

    # ── Header ────────────────────────────────────────────────────────────────
    # Left: company info
    pdf.set_xy(L, 15)
    pdf.set_font('Helvetica', 'B', 13)
    pdf.set_text_color(30, 30, 30)
    pdf.cell(W * 0.52, 7, config.nombre, ln=True)

    pdf.set_font('Helvetica', '', 9)
    pdf.set_text_color(90, 90, 90)
    pdf.set_x(L)
    pdf.cell(W * 0.52, 5, config.direccion or '', ln=True)
    pdf.set_x(L)
    pdf.cell(W * 0.52, 5, config.ciudad or '', ln=True)

    # Right: document box
    bx = L + W * 0.55
    bw = W * 0.45

    pdf.set_xy(bx, 15)
    pdf.set_font('Helvetica', 'B', 11)
    pdf.set_text_color(255, 255, 255)
    pdf.set_fill_color(30, 30, 30)
    pdf.cell(bw, 8, 'ORDEN DE DESPACHO', border=0, align='C', fill=True, ln=True)

    doc_rows = [
        ('N\u00b0:', orden.numero_orden),
        ('RIF:', config.rif or ''),
        ('FECHA:', str(orden.fecha_emision)),
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
        if value is None or str(value).strip() == '':
            return
        pdf.set_x(L)
        pdf.set_font('Helvetica', 'B', 9)
        pdf.set_text_color(30, 30, 30)
        pdf.cell(30, 5, label + ':')
        pdf.set_font('Helvetica', '', 9)
        pdf.multi_cell(W - 30, 5, str(value))

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
    col_w   = [24, 74, 18, 22, 22, 20]
    headers = ['CÓDIGO', 'DESCRIPCIÓN', 'CANT.', 'BULTOS', 'P/BULTO', 'TOTAL USD']
    aligns  = ['C',      'L',           'C',     'C',      'R',       'R']

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
        upb         = int(det.producto.unidades_por_bulto) or 1
        cant        = int(det.cantidad_unidades)
        precio_u    = float(det.precio_usd_momento)
        precio_b    = precio_u * upb
        total       = cant * precio_u
        bultos_str  = f'{cant // upb}B + {cant % upb}u' if cant % upb else f'{cant // upb}B'
        vals = [
            det.producto.codigo,
            det.producto.descripcion,
            str(cant),
            bultos_str,
            f'{precio_b:.2f}',
            f'{total:.2f}',
        ]
        for w, v, a in zip(col_w, vals, aligns):
            pdf.cell(w, 5, v, border='B', align=a, fill=shade)
        pdf.ln()
        shade = not shade

    # ── Footer (totals pinned to bottom of current page) ──────────────────────
    # Disable auto page break so set_y + cells don't trigger a new page.
    pdf.set_auto_page_break(auto=False)
    footer_y = PAGE_H - MARGIN - FOOTER_H
    pdf.set_y(footer_y)

    pdf.set_draw_color(0, 0, 0)
    pdf.line(L, pdf.get_y(), L + W, pdf.get_y())
    pdf.ln(3)

    total_usd = float(orden.total_usd)
    total_bs  = float(orden.total_bs)
    label_w   = 32
    val_w     = 38

    for label, value in [('TOTAL USD:', f'$ {total_usd:,.2f}'), ('TOTAL Bs.:', f'Bs. {total_bs:,.2f}')]:
        pdf.set_font('Helvetica', 'B', 10)
        pdf.set_text_color(30, 30, 30)
        pdf.cell(W - label_w - val_w, 6, '')
        pdf.cell(label_w, 6, label, align='R')
        pdf.cell(val_w,   6, value, align='R', ln=True)

    pdf.ln(2)
    pdf.set_font('Helvetica', 'I', 8)
    pdf.set_text_color(90, 90, 90)
    pdf.cell(0, 5, f'Son: {numero_a_letras(total_usd)} Dólares', ln=True)

    return bytes(pdf.output())
