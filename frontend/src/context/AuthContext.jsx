import { createContext, useContext, useState, useEffect } from 'react'
import { getMe } from '../api'

const AuthCtx = createContext(null)
export const useAuth = () => useContext(AuthCtx)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { setUser(null); return }
    getMe()
      .then((r) => setUser(r.data))
      .catch(() => { localStorage.removeItem('token'); setUser(null) })
  }, [])

  const login = (token, userData) => {
    localStorage.setItem('token', token)
    setUser(userData)
  }

  const logout = () => {
    localStorage.removeItem('token')
    setUser(null)
  }

  return (
    <AuthCtx.Provider value={{ user, login, logout }}>
      {children}
    </AuthCtx.Provider>
  )
}
