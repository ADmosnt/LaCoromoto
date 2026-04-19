from app import db
import datetime


class Usuario(db.Model):
    __tablename__ = 'usuarios'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    rol = db.Column(db.String(20), nullable=False, default='admin')
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id'), nullable=True)
    activo = db.Column(db.Boolean, default=True)

    def set_password(self, pw):
        from werkzeug.security import generate_password_hash
        self.password_hash = generate_password_hash(pw)

    def check_password(self, pw):
        from werkzeug.security import check_password_hash
        return check_password_hash(self.password_hash, pw)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'rol': self.rol,
            'cliente_id': self.cliente_id,
            'activo': self.activo,
        }


class ConfigEmpresa(db.Model):
    __tablename__ = 'config_empresa'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(200), nullable=False)
    rif = db.Column(db.String(20), nullable=False)
    direccion = db.Column(db.Text, nullable=False)
    ciudad = db.Column(db.String(100), nullable=False)

    def to_dict(self):
        return {
            'id': self.id,
            'nombre': self.nombre,
            'rif': self.rif,
            'direccion': self.direccion,
            'ciudad': self.ciudad,
        }


class Zona(db.Model):
    __tablename__ = 'zonas'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False, unique=True)

    def to_dict(self):
        return {'id': self.id, 'nombre': self.nombre}


class GrupoCliente(db.Model):
    __tablename__ = 'grupos_clientes'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False, unique=True)

    def to_dict(self):
        return {'id': self.id, 'nombre': self.nombre}


class GrupoProducto(db.Model):
    __tablename__ = 'grupos_productos'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False, unique=True)

    def to_dict(self):
        return {'id': self.id, 'nombre': self.nombre}


class ListaPrecio(db.Model):
    __tablename__ = 'listas_precios'
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(100), nullable=False, unique=True)

    def to_dict(self):
        return {'id': self.id, 'nombre': self.nombre}


clientes_lista_precios = db.Table(
    'clientes_lista_precios',
    db.Column('cliente_id', db.Integer, db.ForeignKey('clientes.id', ondelete='CASCADE'), primary_key=True),
    db.Column('lista_id', db.Integer, db.ForeignKey('listas_precios.id', ondelete='CASCADE'), primary_key=True),
)


class Cliente(db.Model):
    __tablename__ = 'clientes'
    id = db.Column(db.Integer, primary_key=True)
    codigo = db.Column(db.String(20), nullable=False, unique=True)
    razon_social = db.Column(db.String(200), nullable=False)
    rif = db.Column(db.String(20))
    direccion = db.Column(db.Text)
    zona_id = db.Column(db.Integer, db.ForeignKey('zonas.id'))
    grupo_id = db.Column(db.Integer, db.ForeignKey('grupos_clientes.id'))
    contacto = db.Column(db.String(100))
    cobrador = db.Column(db.String(100))
    vendedor = db.Column(db.String(100))
    observaciones = db.Column(db.Text)
    activo = db.Column(db.Boolean, default=True)

    zona = db.relationship('Zona', backref='clientes')
    grupo = db.relationship('GrupoCliente', backref='clientes')
    telefonos = db.relationship('ClienteTelefono', backref='cliente', cascade='all, delete-orphan')
    listas_precios = db.relationship('ListaPrecio', secondary=clientes_lista_precios, backref='clientes')

    def to_dict(self, include_relations=False):
        d = {
            'id': self.id,
            'codigo': self.codigo,
            'razon_social': self.razon_social,
            'rif': self.rif,
            'direccion': self.direccion,
            'zona_id': self.zona_id,
            'zona': self.zona.nombre if self.zona else None,
            'grupo_id': self.grupo_id,
            'grupo': self.grupo.nombre if self.grupo else None,
            'contacto': self.contacto,
            'cobrador': self.cobrador,
            'vendedor': self.vendedor,
            'observaciones': self.observaciones,
            'activo': self.activo,
            'telefonos': [t.numero for t in self.telefonos],
            'listas_precios': [lp.id for lp in self.listas_precios],
        }
        return d


class ClienteTelefono(db.Model):
    __tablename__ = 'clientes_telefonos'
    id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id', ondelete='CASCADE'), nullable=False)
    numero = db.Column(db.String(30), nullable=False)


class Producto(db.Model):
    __tablename__ = 'productos'
    id = db.Column(db.Integer, primary_key=True)
    codigo = db.Column(db.String(30), nullable=False, unique=True)
    descripcion = db.Column(db.String(200), nullable=False)
    unidades_por_bulto = db.Column(db.Integer, nullable=False, default=1)
    grupo_id = db.Column(db.Integer, db.ForeignKey('grupos_productos.id'))
    activo = db.Column(db.Boolean, default=True)

    grupo = db.relationship('GrupoProducto', backref='productos')
    precios = db.relationship('ProductoPrecio', backref='producto', cascade='all, delete-orphan')

    def to_dict(self):
        return {
            'id': self.id,
            'codigo': self.codigo,
            'descripcion': self.descripcion,
            'unidades_por_bulto': self.unidades_por_bulto,
            'grupo_id': self.grupo_id,
            'grupo': self.grupo.nombre if self.grupo else None,
            'activo': self.activo,
            'precios': [p.to_dict() for p in self.precios],
        }


class ProductoPrecio(db.Model):
    __tablename__ = 'productos_precios'
    id = db.Column(db.Integer, primary_key=True)
    producto_id = db.Column(db.Integer, db.ForeignKey('productos.id', ondelete='CASCADE'), nullable=False)
    lista_id = db.Column(db.Integer, db.ForeignKey('listas_precios.id', ondelete='CASCADE'), nullable=False)
    precio_usd = db.Column(db.Numeric(15, 2), nullable=False)

    lista = db.relationship('ListaPrecio')
    __table_args__ = (db.UniqueConstraint('producto_id', 'lista_id'),)

    def to_dict(self):
        return {
            'id': self.id,
            'lista_id': self.lista_id,
            'lista': self.lista.nombre if self.lista else None,
            'precio_usd': float(self.precio_usd),
        }


class TasaBCV(db.Model):
    __tablename__ = 'tasas_bcv'
    id = db.Column(db.Integer, primary_key=True)
    fecha = db.Column(db.Date, nullable=False, unique=True)
    valor = db.Column(db.Numeric(15, 4), nullable=False)
    fuente = db.Column(db.String(20), default='manual')

    def to_dict(self):
        return {
            'id': self.id,
            'fecha': self.fecha.isoformat(),
            'valor': float(self.valor),
            'fuente': self.fuente,
        }


class OrdenDespacho(db.Model):
    __tablename__ = 'ordenes_despacho'
    id = db.Column(db.Integer, primary_key=True)
    numero_orden = db.Column(db.String(20), nullable=False, unique=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id'), nullable=False)
    fecha_emision = db.Column(db.Date, nullable=False, default=datetime.date.today)
    tasa_bcv_id = db.Column(db.Integer, db.ForeignKey('tasas_bcv.id'), nullable=False)
    total_usd = db.Column(db.Numeric(15, 2), nullable=False, default=0)
    total_bs = db.Column(db.Numeric(15, 2), nullable=False, default=0)
    nota = db.Column(db.Text)
    status = db.Column(db.String(20), default='activa')
    creado_en = db.Column(db.DateTime(timezone=True), default=datetime.datetime.utcnow)

    cliente = db.relationship('Cliente', backref='ordenes')
    tasa = db.relationship('TasaBCV')
    detalles = db.relationship('OrdenDespachoDetalle', backref='orden', cascade='all, delete-orphan')

    def to_dict(self, include_detalles=False):
        d = {
            'id': self.id,
            'numero_orden': self.numero_orden,
            'cliente_id': self.cliente_id,
            'cliente': self.cliente.razon_social if self.cliente else None,
            'cliente_codigo': self.cliente.codigo if self.cliente else None,
            'cliente_rif': self.cliente.rif if self.cliente else None,
            'cliente_direccion': self.cliente.direccion if self.cliente else None,
            'cliente_telefonos': [t.numero for t in self.cliente.telefonos] if self.cliente else [],
            'fecha_emision': self.fecha_emision.isoformat(),
            'tasa_bcv_id': self.tasa_bcv_id,
            'tasa_valor': float(self.tasa.valor) if self.tasa else None,
            'total_usd': float(self.total_usd),
            'total_bs': float(self.total_bs),
            'nota': self.nota,
            'status': self.status,
            'creado_en': self.creado_en.isoformat() if self.creado_en else None,
        }
        if include_detalles:
            d['detalles'] = [det.to_dict() for det in self.detalles]
            active_rep = next(
                (r for r in self.reportes if r.status in ('pendiente', 'confirmado')),
                None
            ) if hasattr(self, 'reportes') else None
            d['reporte_id'] = active_rep.id if active_rep else None
            devs = Devolucion.query.filter_by(orden_origen_id=self.id).all()
            d['devoluciones'] = [
                {
                    'id': dev.id,
                    'fecha': dev.fecha.isoformat(),
                    'nota': dev.nota,
                    'detalles': [det.to_dict() for det in dev.detalles],
                }
                for dev in devs
            ]
        return d


class OrdenDespachoDetalle(db.Model):
    __tablename__ = 'ordenes_despacho_detalle'
    id = db.Column(db.Integer, primary_key=True)
    orden_id = db.Column(db.Integer, db.ForeignKey('ordenes_despacho.id', ondelete='CASCADE'), nullable=False)
    producto_id = db.Column(db.Integer, db.ForeignKey('productos.id'), nullable=False)
    cantidad_unidades = db.Column(db.Integer, nullable=False)
    precio_usd_momento = db.Column(db.Numeric(15, 2), nullable=False)

    producto = db.relationship('Producto')

    def to_dict(self):
        p = self.producto
        return {
            'id': self.id,
            'producto_id': self.producto_id,
            'codigo': p.codigo if p else None,
            'descripcion': p.descripcion if p else None,
            'unidades_por_bulto': p.unidades_por_bulto if p else 1,
            'cantidad_unidades': self.cantidad_unidades,
            'precio_usd_momento': float(self.precio_usd_momento),
            'total_usd': float(self.cantidad_unidades * self.precio_usd_momento),
        }


class StockConsignacion(db.Model):
    __tablename__ = 'stock_consignacion'
    id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id'), nullable=False)
    producto_id = db.Column(db.Integer, db.ForeignKey('productos.id'), nullable=False)
    cantidad_unidades = db.Column(db.Integer, nullable=False, default=0)

    cliente = db.relationship('Cliente', backref='stock')
    producto = db.relationship('Producto')
    __table_args__ = (db.UniqueConstraint('cliente_id', 'producto_id'),)

    def to_dict(self):
        p = self.producto
        upb = p.unidades_por_bulto if p else 1
        bultos = self.cantidad_unidades // upb
        unidades_sueltas = self.cantidad_unidades % upb
        return {
            'id': self.id,
            'cliente_id': self.cliente_id,
            'producto_id': self.producto_id,
            'codigo': p.codigo if p else None,
            'descripcion': p.descripcion if p else None,
            'unidades_por_bulto': upb,
            'cantidad_unidades': self.cantidad_unidades,
            'bultos': bultos,
            'unidades_sueltas': unidades_sueltas,
        }


class Devolucion(db.Model):
    __tablename__ = 'devoluciones'
    id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id'), nullable=False)
    orden_origen_id = db.Column(db.Integer, db.ForeignKey('ordenes_despacho.id'))
    fecha = db.Column(db.Date, nullable=False, default=datetime.date.today)
    nota = db.Column(db.Text)
    creado_en = db.Column(db.DateTime(timezone=True), default=datetime.datetime.utcnow)

    cliente = db.relationship('Cliente', backref='devoluciones')
    orden_origen = db.relationship('OrdenDespacho')
    detalles = db.relationship('DevolucionDetalle', backref='devolucion', cascade='all, delete-orphan')

    def to_dict(self, include_detalles=False):
        d = {
            'id': self.id,
            'cliente_id': self.cliente_id,
            'cliente': self.cliente.razon_social if self.cliente else None,
            'orden_origen_id': self.orden_origen_id,
            'numero_orden_origen': self.orden_origen.numero_orden if self.orden_origen else None,
            'fecha': self.fecha.isoformat(),
            'nota': self.nota,
            'creado_en': self.creado_en.isoformat() if self.creado_en else None,
        }
        if include_detalles:
            d['detalles'] = [det.to_dict() for det in self.detalles]
        return d


class DevolucionDetalle(db.Model):
    __tablename__ = 'devoluciones_detalle'
    id = db.Column(db.Integer, primary_key=True)
    devolucion_id = db.Column(db.Integer, db.ForeignKey('devoluciones.id', ondelete='CASCADE'), nullable=False)
    producto_id = db.Column(db.Integer, db.ForeignKey('productos.id'), nullable=False)
    cantidad_unidades = db.Column(db.Integer, nullable=False)

    producto = db.relationship('Producto')

    def to_dict(self):
        p = self.producto
        return {
            'id': self.id,
            'producto_id': self.producto_id,
            'codigo': p.codigo if p else None,
            'descripcion': p.descripcion if p else None,
            'cantidad_unidades': self.cantidad_unidades,
        }


class ReporteVenta(db.Model):
    __tablename__ = 'reportes_venta'
    id = db.Column(db.Integer, primary_key=True)
    cliente_id = db.Column(db.Integer, db.ForeignKey('clientes.id'), nullable=False)
    orden_id = db.Column(db.Integer, db.ForeignKey('ordenes_despacho.id'), nullable=True)
    fecha = db.Column(db.Date, nullable=False, default=datetime.date.today)
    tasa_bcv_id = db.Column(db.Integer, db.ForeignKey('tasas_bcv.id'), nullable=False)
    total_usd = db.Column(db.Numeric(15, 2), nullable=False, default=0)
    total_bs = db.Column(db.Numeric(15, 2), nullable=False, default=0)
    status = db.Column(db.String(20), default='pendiente')
    creado_en = db.Column(db.DateTime(timezone=True), default=datetime.datetime.utcnow)

    cliente = db.relationship('Cliente', backref='reportes_venta')
    orden = db.relationship('OrdenDespacho', backref='reportes', foreign_keys=[orden_id])
    tasa = db.relationship('TasaBCV')
    detalles = db.relationship('ReporteVentaDetalle', backref='reporte', cascade='all, delete-orphan')

    def to_dict(self, include_detalles=False):
        d = {
            'id': self.id,
            'cliente_id': self.cliente_id,
            'orden_id': self.orden_id,
            'cliente': self.cliente.razon_social if self.cliente else None,
            'fecha': self.fecha.isoformat(),
            'tasa_bcv_id': self.tasa_bcv_id,
            'tasa_valor': float(self.tasa.valor) if self.tasa else None,
            'total_usd': float(self.total_usd),
            'total_bs': float(self.total_bs),
            'status': self.status,
            'creado_en': self.creado_en.isoformat() if self.creado_en else None,
        }
        if include_detalles:
            d['detalles'] = [det.to_dict() for det in self.detalles]
        return d


class ReporteVentaDetalle(db.Model):
    __tablename__ = 'reportes_venta_detalle'
    id = db.Column(db.Integer, primary_key=True)
    reporte_id = db.Column(db.Integer, db.ForeignKey('reportes_venta.id', ondelete='CASCADE'), nullable=False)
    producto_id = db.Column(db.Integer, db.ForeignKey('productos.id'), nullable=False)
    cantidad_unidades = db.Column(db.Integer, nullable=False)
    precio_usd_momento = db.Column(db.Numeric(15, 2), nullable=False)

    producto = db.relationship('Producto')

    def to_dict(self):
        p = self.producto
        return {
            'id': self.id,
            'producto_id': self.producto_id,
            'codigo': p.codigo if p else None,
            'descripcion': p.descripcion if p else None,
            'cantidad_unidades': self.cantidad_unidades,
            'precio_usd_momento': float(self.precio_usd_momento),
            'total_usd': float(self.cantidad_unidades * self.precio_usd_momento),
        }


class InventarioCentral(db.Model):
    __tablename__ = 'inventario_central'
    id = db.Column(db.Integer, primary_key=True)
    producto_id = db.Column(db.Integer, db.ForeignKey('productos.id'), nullable=False, unique=True)
    cantidad_unidades = db.Column(db.Integer, nullable=False, default=0)

    producto = db.relationship('Producto')

    def to_dict(self):
        p = self.producto
        upb = p.unidades_por_bulto if p else 1
        return {
            'id': self.id,
            'producto_id': self.producto_id,
            'codigo': p.codigo if p else None,
            'descripcion': p.descripcion if p else None,
            'grupo': p.grupo.nombre if p and p.grupo else None,
            'unidades_por_bulto': upb,
            'cantidad_unidades': self.cantidad_unidades,
            'bultos': self.cantidad_unidades // upb,
            'unidades_sueltas': self.cantidad_unidades % upb,
        }


class EntradaInventario(db.Model):
    __tablename__ = 'entradas_inventario'
    id = db.Column(db.Integer, primary_key=True)
    producto_id = db.Column(db.Integer, db.ForeignKey('productos.id'), nullable=False)
    cantidad_unidades = db.Column(db.Integer, nullable=False)
    fecha = db.Column(db.Date, nullable=False, default=datetime.date.today)
    nota = db.Column(db.Text)
    creado_en = db.Column(db.DateTime(timezone=True), default=datetime.datetime.utcnow)

    producto = db.relationship('Producto')

    def to_dict(self):
        p = self.producto
        upb = p.unidades_por_bulto if p else 1
        return {
            'id': self.id,
            'producto_id': self.producto_id,
            'codigo': p.codigo if p else None,
            'descripcion': p.descripcion if p else None,
            'unidades_por_bulto': upb,
            'cantidad_unidades': self.cantidad_unidades,
            'bultos': self.cantidad_unidades // upb,
            'fecha': self.fecha.isoformat(),
            'nota': self.nota,
        }
