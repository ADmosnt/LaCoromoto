import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'
import { getMe, setUnauthorizedHandler } from '../api'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

const TIMEOUT_MS = 15 * 60 * 1000
const WARN_MS    = 14 * 60 * 1000

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined)
  const [sessionWarning, setSessionWarning] = useState(false)
  const logoutTimer = useRef(null)
  const warnTimer   = useRef(null)

  const clearTimers = () => {
    clearTimeout(logoutTimer.current)
    clearTimeout(warnTimer.current)
  }

  const doLogout = useCallback(() => {
    localStorage.removeItem('token')
    setUser(null)
    setSessionWarning(false)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(() => {
      if (!localStorage.getItem('token')) return
      doLogout()
      toast.error('Tu sesión expiró. Inicia sesión nuevamente.')
    })
  }, [doLogout])

  const resetTimer = useCallback(() => {
    clearTimers()
    setSessionWarning(false)
    warnTimer.current   = setTimeout(() => setSessionWarning(true), WARN_MS)
    logoutTimer.current = setTimeout(doLogout, TIMEOUT_MS)
  }, [doLogout])

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { setUser(null); return }
    getMe()
      .then((r) => setUser(r.data))
      .catch(() => { localStorage.removeItem('token'); setUser(null) })
  }, [])

  useEffect(() => {
    if (!user) { clearTimers(); setSessionWarning(false); return }
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart']
    events.forEach((e) => window.addEventListener(e, resetTimer, { passive: true }))
    resetTimer()
    return () => {
      events.forEach((e) => window.removeEventListener(e, resetTimer))
      clearTimers()
    }
  }, [user, resetTimer])

  const login = (token, userData) => {
    localStorage.setItem('token', token)
    setUser(userData)
  }

  const logout = () => {
    clearTimers()
    setSessionWarning(false)
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthCtx.Provider value={{ user, login, logout, sessionWarning, resetTimer }}>
      {children}
    </AuthCtx.Provider>
  )
}
