"""
Demo seed script — Sistema de Consignación La Coromoto
Inserta datos realistas para probar todas las funcionalidades.

Uso local:
    cd backend && python seed_demo.py

Uso en Railway (requiere Railway CLI instalado):
    railway run python backend/seed_demo.py
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from decimal import Decimal
import datetime

from app import create_app, db
from app.models import (
    ConfigEmpresa, Zona, GrupoCliente, GrupoProducto, ListaPrecio,
    TasaBCV, Producto, ProductoPrecio, Cliente, ClienteTelefono,
    InventarioCentral, EntradaInventario, StockConsignacion,
    OrdenDespacho, OrdenDespachoDetalle,
    ReporteVenta, ReporteVentaDetalle,
    Devolucion, DevolucionDetalle,
)
from app.utils import siguiente_numero_orden

app = create_app()

with app.app_context():
    db.create_all()

    # ── Guardia: no duplicar si ya hay clientes ──────────────────────────────
    if Cliente.query.first():
        print("⚠️  Ya existen datos en la base. Abortando para no duplicar.")
        print("   Si quieres resetear: borra las tablas y vuelve a correr.")
        sys.exit(0)

    print("🌱 Insertando datos demo…")

    # ── 1. Configuración de empresa ──────────────────────────────────────────
    if not ConfigEmpresa.query.first():
        db.session.add(ConfigEmpresa(
            nombre='Distribuidora La Coromoto C.A.',
            rif='J-30456789-1',
            direccion='Av. Delicias Norte, C.C. Los Olivos, Local 12',
            ciudad='Maracaibo',
        ))

    # ── 2. Zonas ─────────────────────────────────────────────────────────────
    zonas_data = ['Norte', 'Sur', 'Este', 'Oeste', 'Centro']
    zonas = {}
    for nombre in zonas_data:
        z = Zona(nombre=nombre)
        db.session.add(z)
        zonas[nombre] = z

    # ── 3. Grupos de clientes ────────────────────────────────────────────────
    grupos_cli_data = ['Minorista', 'Mayorista', 'Preferencial']
    grupos_cli = {}
    for nombre in grupos_cli_data:
        g = GrupoCliente(nombre=nombre)
        db.session.add(g)
        grupos_cli[nombre] = g

    # ── 4. Grupos de productos ───────────────────────────────────────────────
    grupos_prod_data = ['Granos y Cereales', 'Aceites y Grasas', 'Lácteos', 'Higiene Personal']
    grupos_prod = {}
    for nombre in grupos_prod_data:
        g = GrupoProducto(nombre=nombre)
        db.session.add(g)
        grupos_prod[nombre] = g

    # ── 5. Listas de precios ─────────────────────────────────────────────────
    lista_a = ListaPrecio(nombre='Lista A — Minorista')
    lista_b = ListaPrecio(nombre='Lista B — Mayorista')
    db.session.add_all([lista_a, lista_b])

    db.session.flush()  # obtener IDs

    # ── 6. Tasas BCV ─────────────────────────────────────────────────────────
    tasas_data = [
        ('2025-04-01', Decimal('65.2500'), 'manual'),
        ('2025-04-05', Decimal('65.4800'), 'bcv'),
        ('2025-04-10', Decimal('65.7200'), 'bcv'),
        ('2025-04-14', Decimal('65.9000'), 'bcv'),
        ('2025-04-16', Decimal('66.1500'), 'bcv'),
    ]
    tasas = {}
    for fecha_str, valor, fuente in tasas_data:
        t = TasaBCV(fecha=datetime.date.fromisoformat(fecha_str), valor=valor, fuente=fuente)
        db.session.add(t)
        tasas[fecha_str] = t

    db.session.flush()

    # ── 7. Productos ─────────────────────────────────────────────────────────
    # (codigo, descripcion, upb, grupo, precio_lista_a, precio_lista_b)
    productos_data = [
        ('GR-001', 'Harina de Maíz PAN 1 kg',       24, 'Granos y Cereales',  Decimal('1.20'), Decimal('1.00')),
        ('GR-002', 'Arroz Cristal Extra 1 kg',        24, 'Granos y Cereales',  Decimal('0.95'), Decimal('0.80')),
        ('GR-003', 'Pasta Capri Espagueti 500 g',     24, 'Granos y Cereales',  Decimal('0.75'), Decimal('0.65')),
        ('GR-004', 'Azúcar Refinada 1 kg',            24, 'Granos y Cereales',  Decimal('0.85'), Decimal('0.72')),
        ('AC-001', 'Aceite Mazeite 1 L',              12, 'Aceites y Grasas',   Decimal('2.50'), Decimal('2.20')),
        ('LA-001', 'Leche en Polvo Completa 1 kg',    12, 'Lácteos',            Decimal('3.80'), Decimal('3.40')),
        ('LA-002', 'Café Venezuela Tostado 200 g',    24, 'Lácteos',            Decimal('1.50'), Decimal('1.30')),
        ('HI-001', 'Jabón Rey Lavaplatos 200 g',      24, 'Higiene Personal',   Decimal('0.60'), Decimal('0.50')),
    ]
    productos = {}
    for codigo, desc, upb, grupo, p_a, p_b in productos_data:
        prod = Producto(
            codigo=codigo,
            descripcion=desc,
            unidades_por_bulto=upb,
            grupo_id=grupos_prod[grupo].id,
            activo=True,
        )
        db.session.add(prod)
        productos[codigo] = prod

    db.session.flush()

    for codigo, _, _, _, p_a, p_b in productos_data:
        prod = productos[codigo]
        db.session.add(ProductoPrecio(producto_id=prod.id, lista_id=lista_a.id, precio_usd=p_a))
        db.session.add(ProductoPrecio(producto_id=prod.id, lista_id=lista_b.id, precio_usd=p_b))

    db.session.flush()

    # ── 8. Clientes ──────────────────────────────────────────────────────────
    clientes_data = [
        {
            'codigo': 'CLI-001', 'razon_social': 'Bodega El Sol',
            'rif': 'V-12345678-1', 'zona': 'Norte', 'grupo': 'Minorista',
            'contacto': 'Pedro Rodríguez', 'cobrador': 'Luis Méndez',
            'vendedor': 'Ana García', 'listas': ['Lista A — Minorista'],
            'telefonos': ['0414-6123456'],
            'direccion': 'Calle 72 con Av. 3E, Local 5, Maracaibo',
        },
        {
            'codigo': 'CLI-002', 'razon_social': 'Abastos La Central',
            'rif': 'V-22334455-6', 'zona': 'Sur', 'grupo': 'Minorista',
            'contacto': 'María López', 'cobrador': 'Luis Méndez',
            'vendedor': 'Carlos Soto', 'listas': ['Lista A — Minorista'],
            'telefonos': ['0424-7894561', '0261-7123456'],
            'direccion': 'Av. Circunvalación 2, Local 8, Maracaibo',
        },
        {
            'codigo': 'CLI-003', 'razon_social': 'Distribuidora Pérez e Hijos C.A.',
            'rif': 'J-30567890-2', 'zona': 'Centro', 'grupo': 'Mayorista',
            'contacto': 'Roberto Pérez', 'cobrador': 'Miguel Torres',
            'vendedor': 'Ana García', 'listas': ['Lista B — Mayorista'],
            'telefonos': ['0416-5678901'],
            'direccion': 'Av. El Milagro, Edif. Commerce, PB, Maracaibo',
        },
        {
            'codigo': 'CLI-004', 'razon_social': 'Mini-Mercado Don José',
            'rif': 'V-9876543-2', 'zona': 'Este', 'grupo': 'Minorista',
            'contacto': 'José Hernández', 'cobrador': 'Miguel Torres',
            'vendedor': 'Carlos Soto', 'listas': ['Lista A — Minorista'],
            'telefonos': ['0412-3456789'],
            'direccion': 'Sector La Victoria, Calle 45, Casa 12, Maracaibo',
        },
        {
            'codigo': 'CLI-005', 'razon_social': 'Supermercado Familiar Guanipa',
            'rif': 'J-40123456-7', 'zona': 'Oeste', 'grupo': 'Mayorista',
            'contacto': 'Carmen Guanipa', 'cobrador': 'Luis Méndez',
            'vendedor': 'Ana García', 'listas': ['Lista B — Mayorista'],
            'telefonos': ['0414-9012345', '0261-3451234'],
            'direccion': 'Av. 15 Las Delicias, C.C. Oeste Plaza, Local 22, Maracaibo',
        },
    ]

    listas_map = {'Lista A — Minorista': lista_a, 'Lista B — Mayorista': lista_b}
    clientes = {}

    for cd in clientes_data:
        c = Cliente(
            codigo=cd['codigo'],
            razon_social=cd['razon_social'],
            rif=cd['rif'],
            direccion=cd['direccion'],
            zona_id=zonas[cd['zona']].id,
            grupo_id=grupos_cli[cd['grupo']].id,
            contacto=cd['contacto'],
            cobrador=cd['cobrador'],
            vendedor=cd['vendedor'],
            activo=True,
        )
        for lname in cd['listas']:
            c.listas_precios.append(listas_map[lname])
        db.session.add(c)
        clientes[cd['codigo']] = c

    db.session.flush()

    for cd in clientes_data:
        for tel in cd['telefonos']:
            db.session.add(ClienteTelefono(
                cliente_id=clientes[cd['codigo']].id,
                numero=tel,
            ))

    # ── 9. Inventario inicial (entradas al almacén) ───────────────────────────
    # (codigo_producto, cantidad, fecha, nota)
    entradas_data = [
        ('GR-001', 960, '2025-03-15', 'Compra inicial — Proveedor Molinos Nacionales'),
        ('GR-002', 720, '2025-03-15', 'Compra inicial — Arrocera del Sur'),
        ('GR-003', 480, '2025-03-20', 'Compra inicial — Pasta Capri'),
        ('GR-004', 720, '2025-03-20', 'Compra inicial — Central Azucarera'),
        ('AC-001', 360, '2025-03-18', 'Compra inicial — Aceites Mazeite'),
        ('LA-001', 240, '2025-03-18', 'Compra inicial — Industrias Lácteas'),
        ('LA-002', 480, '2025-03-22', 'Compra inicial — Café Venezuela'),
        ('HI-001', 480, '2025-03-22', 'Compra inicial — Jabón Rey'),
    ]

    for cod, cant, fecha_str, nota in entradas_data:
        prod = productos[cod]
        entrada = EntradaInventario(
            producto_id=prod.id,
            cantidad_unidades=cant,
            fecha=datetime.date.fromisoformat(fecha_str),
            nota=nota,
        )
        db.session.add(entrada)
        inv = InventarioCentral.query.filter_by(producto_id=prod.id).first()
        if inv:
            inv.cantidad_unidades += cant
        else:
            db.session.add(InventarioCentral(producto_id=prod.id, cantidad_unidades=cant))

    db.session.flush()

    # ── Helper: crear orden completa ──────────────────────────────────────────
    def crear_orden(cliente_codigo, fecha_str, items, nota=None):
        """items = [(codigo_producto, cantidad, precio_usd)]"""
        cliente = clientes[cliente_codigo]
        fecha = datetime.date.fromisoformat(fecha_str)
        tasa = tasas.get(fecha_str) or list(tasas.values())[-1]

        numero = siguiente_numero_orden(db, OrdenDespacho)
        orden = OrdenDespacho(
            numero_orden=numero,
            cliente_id=cliente.id,
            fecha_emision=fecha,
            tasa_bcv_id=tasa.id,
            nota=nota,
            status='activa',
        )
        db.session.add(orden)
        db.session.flush()

        total_usd = Decimal('0')
        for cod, cant, precio in items:
            prod = productos[cod]
            precio_d = Decimal(str(precio))
            db.session.add(OrdenDespachoDetalle(
                orden_id=orden.id,
                producto_id=prod.id,
                cantidad_unidades=cant,
                precio_usd_momento=precio_d,
            ))
            total_usd += precio_d * cant

            inv = InventarioCentral.query.filter_by(producto_id=prod.id).first()
            inv.cantidad_unidades -= cant

            stock = StockConsignacion.query.filter_by(
                cliente_id=cliente.id, producto_id=prod.id
            ).first()
            if stock:
                stock.cantidad_unidades += cant
            else:
                db.session.add(StockConsignacion(
                    cliente_id=cliente.id, producto_id=prod.id, cantidad_unidades=cant
                ))

        orden.total_usd = total_usd
        orden.total_bs = total_usd * tasa.valor
        return orden

    # ── 10. Órdenes de despacho ──────────────────────────────────────────────
    o1 = crear_orden('CLI-001', '2025-04-05', [
        ('GR-001', 144, '1.20'),  # 6 bultos harina
        ('GR-002', 120, '0.95'),  # 5 bultos arroz
        ('AC-001', 48,  '2.50'),  # 4 bultos aceite
    ])

    o2 = crear_orden('CLI-002', '2025-04-08', [
        ('GR-001', 96,  '1.20'),  # 4 bultos harina
        ('LA-001', 36,  '3.80'),  # 3 bultos leche
        ('HI-001', 48,  '0.60'),  # 2 bultos jabón
    ], nota='Entrega en horario de mañana')

    o3 = crear_orden('CLI-003', '2025-04-10', [
        ('GR-001', 240, '1.00'),  # 10 bultos — precio mayorista
        ('GR-002', 192, '0.80'),
        ('AC-001', 60,  '2.20'),
        ('GR-004', 192, '0.72'),
    ])

    o4 = crear_orden('CLI-005', '2025-04-14', [
        ('LA-001', 48,  '3.40'),
        ('LA-002', 96,  '1.30'),
        ('GR-003', 120, '0.65'),
    ])

    # Orden 5: pendiente reciente (sin reporte aún)
    o5 = crear_orden('CLI-004', '2025-04-16', [
        ('GR-001', 72,  '1.20'),
        ('HI-001', 48,  '0.60'),
    ])

    db.session.flush()

    # ── 11. Reporte de venta confirmado (CLI-001 reporta parte de su venta) ───
    tasa_r1 = tasas['2025-04-10']
    r1 = ReporteVenta(
        cliente_id=clientes['CLI-001'].id,
        fecha=datetime.date(2025, 4, 10),
        tasa_bcv_id=tasa_r1.id,
        status='confirmado',
    )
    db.session.add(r1)
    db.session.flush()

    r1_items = [('GR-001', 72, Decimal('1.20')), ('GR-002', 48, Decimal('0.95'))]
    total_r1 = Decimal('0')
    for cod, cant, precio in r1_items:
        prod = productos[cod]
        db.session.add(ReporteVentaDetalle(
            reporte_id=r1.id,
            producto_id=prod.id,
            cantidad_unidades=cant,
            precio_usd_momento=precio,
        ))
        total_r1 += precio * cant
        # Descontar consignación (confirmado)
        stock = StockConsignacion.query.filter_by(
            cliente_id=clientes['CLI-001'].id, producto_id=prod.id
        ).first()
        if stock:
            stock.cantidad_unidades -= cant

    r1.total_usd = total_r1
    r1.total_bs = total_r1 * tasa_r1.valor

    # ── 12. Reporte de venta pendiente (CLI-002 reportó pero no confirmado) ───
    tasa_r2 = tasas['2025-04-14']
    r2 = ReporteVenta(
        cliente_id=clientes['CLI-002'].id,
        fecha=datetime.date(2025, 4, 14),
        tasa_bcv_id=tasa_r2.id,
        status='pendiente',
    )
    db.session.add(r2)
    db.session.flush()

    r2_items = [('GR-001', 48, Decimal('1.20')), ('HI-001', 24, Decimal('0.60'))]
    total_r2 = Decimal('0')
    for cod, cant, precio in r2_items:
        prod = productos[cod]
        db.session.add(ReporteVentaDetalle(
            reporte_id=r2.id,
            producto_id=prod.id,
            cantidad_unidades=cant,
            precio_usd_momento=precio,
        ))
        total_r2 += precio * cant

    r2.total_usd = total_r2
    r2.total_bs = total_r2 * tasa_r2.valor

    # ── 13. Devolución (CLI-003 devuelve parte del aceite) ───────────────────
    tasa_dev = tasas['2025-04-14']
    dev = Devolucion(
        cliente_id=clientes['CLI-003'].id,
        orden_origen_id=o3.id,
        fecha=datetime.date(2025, 4, 14),
        nota='Producto en mal estado — 5 unidades rotas',
    )
    db.session.add(dev)
    db.session.flush()

    dev_cant = 12  # 1 bulto de aceite
    dev_prod = productos['AC-001']
    db.session.add(DevolucionDetalle(
        devolucion_id=dev.id,
        producto_id=dev_prod.id,
        cantidad_unidades=dev_cant,
    ))
    # Revertir: quitar de consignación y devolver al almacén
    stock_dev = StockConsignacion.query.filter_by(
        cliente_id=clientes['CLI-003'].id, producto_id=dev_prod.id
    ).first()
    if stock_dev:
        stock_dev.cantidad_unidades -= dev_cant
    inv_dev = InventarioCentral.query.filter_by(producto_id=dev_prod.id).first()
    if inv_dev:
        inv_dev.cantidad_unidades += dev_cant

    # ── Commit ────────────────────────────────────────────────────────────────
    db.session.commit()

    print("\n✅ Datos demo insertados correctamente:\n")
    print(f"   • 1 configuración de empresa")
    print(f"   • {len(zonas_data)} zonas")
    print(f"   • {len(grupos_cli_data)} grupos de clientes")
    print(f"   • {len(grupos_prod_data)} grupos de productos")
    print(f"   • 2 listas de precios")
    print(f"   • {len(tasas_data)} tasas BCV")
    print(f"   • {len(productos_data)} productos con precios")
    print(f"   • {len(clientes_data)} clientes con teléfonos")
    print(f"   • {len(entradas_data)} entradas al almacén")
    print(f"   • 5 órdenes de despacho")
    print(f"   • 2 reportes de venta (1 confirmado, 1 pendiente)")
    print(f"   • 1 devolución")
    print(f"\n   Tasa más reciente: Bs. 66.1500 (2025-04-16)")
    print(f"   URL de prueba: http://localhost:5000 (o tu URL de Railway)\n")
