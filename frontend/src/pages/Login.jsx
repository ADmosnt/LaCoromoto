import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authLogin, recoverPassword } from '../api'
import { useAuth } from '../context/AuthContext'
import Alert from '../components/Alert'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [mode, setMode] = useState('login') // 'login' | 'recover'

  const [recForm, setRecForm] = useState({ username: '', recovery_code: '', new_password: '', confirm: '' })
  const [recError, setRecError] = useState('')
  const [recLoading, setRecLoading] = useState(false)
  const [recDone, setRecDone] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const r = await authLogin({ username, password })
      login(r.data.token, r.data.user)
      navigate(r.data.user.rol === 'cliente' ? '/mis-ordenes' : '/dashboard', { replace: true })
    } catch (err) {
      setError(err.response?.data?.error ?? 'Error al iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  const submitRecover = async (e) => {
    e.preventDefault()
    setRecError('')
    if (recForm.new_password !== recForm.confirm) {
      setRecError('Las contraseñas no coinciden')
      return
    }
    setRecLoading(true)
    try {
      await recoverPassword({
        username: recForm.username,
        recovery_code: recForm.recovery_code,
        new_password: recForm.new_password,
      })
      setRecDone(true)
    } catch (err) {
      setRecError(err.response?.data?.error ?? 'Error al recuperar la contraseña')
    } finally {
      setRecLoading(false)
    }
  }

  const inp = 'w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500'

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-8">
        {mode === 'login' ? (
          <>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">Sistema de Consignación</h1>
            <p className="text-sm text-gray-500 mb-6">Inicia sesión para continuar</p>
            <Alert type="error" message={error} />
            <form onSubmit={submit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                <input autoFocus className={inp} value={username}
                  onChange={(e) => setUsername(e.target.value)} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                <input type="password" className={inp} value={password}
                  onChange={(e) => setPassword(e.target.value)} required />
              </div>
              <button type="submit" disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-md disabled:opacity-50">
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </form>
            <button onClick={() => setMode('recover')}
              className="mt-4 w-full text-xs text-gray-400 hover:text-gray-600 text-center">
              ¿Olvidaste tu contraseña?
            </button>
          </>
        ) : recDone ? (
          <>
            <div className="text-center">
              <div className="text-4xl mb-3">✓</div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">Contraseña restablecida</h2>
              <p className="text-sm text-gray-500 mb-5">Ya puedes iniciar sesión con tu nueva contraseña.</p>
              <button onClick={() => { setMode('login'); setRecDone(false); setRecForm({ username: '', recovery_code: '', new_password: '', confirm: '' }) }}
                className="w-full bg-blue-600 text-white text-sm font-medium py-2 rounded-md hover:bg-blue-700">
                Ir al inicio de sesión
              </button>
            </div>
          </>
        ) : (
          <>
            <h1 className="text-xl font-bold text-gray-800 mb-1">Recuperar contraseña</h1>
            <p className="text-sm text-gray-500 mb-5">Ingresa tu usuario y el código de recuperación que guardaste.</p>
            <Alert type="error" message={recError} />
            <form onSubmit={submitRecover} className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                <input autoFocus className={inp} value={recForm.username}
                  onChange={(e) => setRecForm({ ...recForm, username: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código de recuperación</label>
                <input className={inp} value={recForm.recovery_code}
                  onChange={(e) => setRecForm({ ...recForm, recovery_code: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
                <input type="password" className={inp} value={recForm.new_password}
                  onChange={(e) => setRecForm({ ...recForm, new_password: e.target.value })} required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
                <input type="password" className={inp} value={recForm.confirm}
                  onChange={(e) => setRecForm({ ...recForm, confirm: e.target.value })} required />
              </div>
              <button type="submit" disabled={recLoading}
                className="w-full bg-blue-600 text-white font-medium py-2 rounded-md hover:bg-blue-700 disabled:opacity-50">
                {recLoading ? 'Verificando...' : 'Restablecer contraseña'}
              </button>
            </form>
            <button onClick={() => setMode('login')}
              className="mt-4 w-full text-xs text-gray-400 hover:text-gray-600 text-center">
              ← Volver al inicio de sesión
            </button>
          </>
        )}
      </div>
    </div>
  )
}
