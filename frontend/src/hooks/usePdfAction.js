import { useState } from 'react'

export default function usePdfAction() {
  const [loading, setLoading] = useState(false)

  const _fetchPdf = async (path) => {
    const base = import.meta.env.VITE_API_URL ?? ''
    const token = localStorage.getItem('loophire_token')
    const res = await fetch(`${base}/api${path}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
    if (!res.ok) throw new Error(`PDF request failed: ${res.status}`)
    return res.blob()
  }

  const openInNewTab = async (path) => {
    setLoading(true)
    try {
      const blob = await _fetchPdf(path)
      const url = URL.createObjectURL(blob)
      window.open(url, '_blank', 'noopener')
      setTimeout(() => URL.revokeObjectURL(url), 60000)
    } finally {
      setLoading(false)
    }
  }

  const download = async (path, filename) => {
    setLoading(true)
    try {
      const blob = await _fetchPdf(path)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      setTimeout(() => URL.revokeObjectURL(url), 10000)
    } finally {
      setLoading(false)
    }
  }

  return { loading, openInNewTab, download }
}
