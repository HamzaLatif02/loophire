import { useState } from 'react'
import axios from 'axios'

export function useApi() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function request(method, url, data) {
    setLoading(true)
    setError(null)
    try {
      const res = await axios({ method, url: `/api${url}`, data })
      return res.data
    } catch (err) {
      setError(err)
      throw err
    } finally {
      setLoading(false)
    }
  }

  return { request, loading, error }
}
