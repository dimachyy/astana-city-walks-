import { useCallback, useEffect, useState } from 'react'
import { fetchAccount, loginAccount, logoutAccount, registerAccount, updateAccount } from '../api/index.js'

export function useAccount() {
  const [account, setAccount] = useState(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    fetchAccount().then((data) => setAccount(data.user)).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const submit = useCallback(async (action, email, password) => {
    setBusy(true)
    try {
      const data = await action(email, password)
      setAccount(data.user)
      return data.user
    } finally {
      setBusy(false)
    }
  }, [])

  const login = useCallback((email, password) => submit(loginAccount, email, password), [submit])
  const register = useCallback((email, password) => submit(registerAccount, email, password), [submit])
  const logout = useCallback(async () => {
    setBusy(true)
    try { await logoutAccount(); setAccount(null) } finally { setBusy(false) }
  }, [])
  const update = useCallback(async (values) => {
    const data = await updateAccount(values)
    setAccount(data.user)
    return data.user
  }, [])

  return { account, loading, busy, login, register, logout, update }
}
