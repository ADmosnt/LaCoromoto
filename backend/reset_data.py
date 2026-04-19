"""
Reset data script — Sistema de Consignación La Coromoto

Borra TODOS los datos de la base (clientes, productos, órdenes, etc.) y deja
la base vacía. El admin (admin/admin123) y la fila de ConfigEmpresa se
regeneran automáticamente en el próximo arranque de la app.

Uso local:
    cd backend && python reset_data.py

Uso en Railway:
    railway run python backend/reset_data.py

El script PIDE CONFIRMACIÓN antes de borrar. Para saltarla (por ejemplo en
un script automático) pasa --yes como argumento.
"""
import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

from app import create_app, db
from app.models import Usuario, ConfigEmpresa


def reset():
    app = create_app()
    with app.app_context():
        print('⚠️  Esto borrará TODOS los datos: clientes, productos, órdenes,')
        print('    reportes, devoluciones, inventario, tasas y catálogos.')
        print('    Se regeneran solo: admin/admin123 y ConfigEmpresa vacía.')
        print()

        if '--yes' not in sys.argv:
            confirm = input('Escribe "BORRAR" para confirmar: ').strip()
            if confirm != 'BORRAR':
                print('Cancelado. No se borró nada.')
                return

        print('🗑️  Borrando todas las tablas...')
        db.drop_all()

        print('🔧 Recreando esquema...')
        db.create_all()

        print('🌱 Recreando admin y ConfigEmpresa...')
        db.session.add(ConfigEmpresa(
            nombre='MI EMPRESA C.A.',
            rif='J-00000000-0',
            direccion='Dirección de la empresa',
            ciudad='Ciudad',
        ))
        u = Usuario(username='admin', rol='admin')
        u.set_password('admin123')
        db.session.add(u)
        db.session.commit()

        print()
        print('✅ Base reseteada.')
        print('   Login: admin / admin123')


if __name__ == '__main__':
    reset()
