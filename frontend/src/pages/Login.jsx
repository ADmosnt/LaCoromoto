import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { authLogin, recoverPassword } from '../api'
import { useAuth } from '../context/AuthContext'
import Alert from '../components/Alert'
import { inputClass } from '../lib/styles'

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

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Left brand panel */}
      <div className="bg-brand-900 text-white flex flex-col items-center justify-center md:w-[45%] px-10 py-8 md:py-0 min-h-[96px] md:min-h-screen">
        <div className="flex flex-col items-center gap-3 md:gap-5">
          <span className="bg-maiz-400 text-brand-900 font-display font-extrabold rounded-2xl flex items-center justify-center w-14 h-14 md:w-20 md:h-20 text-2xl md:text-4xl">
            LC
          </span>
          <div className="text-center">
            <h1 className="font-display text-2xl md:text-4xl font-bold tracking-tight">La Coromoto</h1>
            <p className="text-maiz-400 text-xs md:text-sm mt-1.5 uppercase tracking-[0.18em]">Consignaciones</p>
          </div>
        </div>
        <p className="text-brand-200 text-xs mt-auto pt-6 hidden md:block">© 2026 La Coromoto</p>
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-10">
        <div className="w-full max-w-sm">
          {mode === 'login' ? (
            <>
              <h2 className="font-display text-3xl font-bold text-ink mb-1 tracking-tight">Bienvenido</h2>
              <p className="text-sm text-gray-500 mb-6">Inicia sesión para continuar</p>
              <Alert type="error" message={error} />
              <form onSubmit={submit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                  <input autoFocus className={inputClass} value={username}
                    onChange={(e) => setUsername(e.target.value)} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                  <input type="password" className={inputClass} value={password}
                    onChange={(e) => setPassword(e.target.value)} required />
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-2.5 rounded-lg disabled:opacity-50 transition-colors">
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
              </form>
              <button onClick={() => setMode('recover')}
                className="mt-5 w-full text-xs text-gray-400 hover:text-gray-600 text-center">
                ¿Olvidaste tu contraseña?
              </button>
            </>
          ) : recDone ? (
            <div className="text-center">
              <div className="text-5xl mb-4">✓</div>
              <h2 className="text-lg font-bold text-gray-800 mb-2">Contraseña restablecida</h2>
              <p className="text-sm text-gray-500 mb-6">Ya puedes iniciar sesión con tu nueva contraseña.</p>
              <button
                onClick={() => { setMode('login'); setRecDone(false); setRecForm({ username: '', recovery_code: '', new_password: '', confirm: '' }) }}
                className="w-full bg-brand-600 text-white text-sm font-medium py-2.5 rounded-lg hover:bg-brand-700 transition-colors"
              >
                Ir al inicio de sesión
              </button>
            </div>
          ) : (
            <>
              <h2 className="font-display text-2xl font-bold text-ink mb-1 tracking-tight">Recuperar contraseña</h2>
              <p className="text-sm text-gray-500 mb-5">Ingresa tu usuario y el código de recuperación que guardaste.</p>
              <Alert type="error" message={recError} />
              <form onSubmit={submitRecover} className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Usuario</label>
                  <input autoFocus className={inputClass} value={recForm.username}
                    onChange={(e) => setRecForm({ ...recForm, username: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Código de recuperación</label>
                  <input className={inputClass} value={recForm.recovery_code}
                    onChange={(e) => setRecForm({ ...recForm, recovery_code: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña</label>
                  <input type="password" className={inputClass} value={recForm.new_password}
                    onChange={(e) => setRecForm({ ...recForm, new_password: e.target.value })} required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar contraseña</label>
                  <input type="password" className={inputClass} value={recForm.confirm}
                    onChange={(e) => setRecForm({ ...recForm, confirm: e.target.value })} required />
                </div>
                <button type="submit" disabled={recLoading}
                  className="w-full bg-brand-600 text-white font-medium py-2.5 rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors">
                  {recLoading ? 'Verificando...' : 'Restablecer contraseña'}
                </button>
              </form>
              <button onClick={() => setMode('login')}
                className="mt-5 w-full text-xs text-gray-400 hover:text-gray-600 text-center">
                ← Volver al inicio de sesión
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
