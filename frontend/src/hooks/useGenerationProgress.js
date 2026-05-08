import { useCallback, useRef, useState } from 'react'

const getWsBase = () => {
  const apiUrl = import.meta.env.VITE_API_URL
  if (apiUrl) {
    return apiUrl.replace('https://', 'wss://').replace('http://', 'ws://')
  }
  const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${proto}//${window.location.host}`
}

export const STAGES = {
  cv:           { label: 'Loading your CV',             icon: '📄' },
  research:     { label: 'Researching the company',     icon: '🔍' },
  tone:         { label: 'Analysing job tone',          icon: '🎯' },
  fit:          { label: 'Scoring your fit',            icon: '📊' },
  cv_tailor:    { label: 'Tailoring your CV',           icon: '✏️'  },
  cover_letter: { label: 'Writing cover letter',        icon: '💌' },
  saving:       { label: 'Saving your application',     icon: '💾' },
  done:         { label: 'Application ready!',          icon: '✅' },
  error:        { label: 'Something went wrong',        icon: '❌' },
}

export function useGenerationProgress() {
  const [progress, setProgress]     = useState(null)
  const [isComplete, setIsComplete] = useState(false)
  const [wsError, setWsError]       = useState(null)
  const [applicationId, setAppId]   = useState(null)
  const wsRef = useRef(null)

  const connect = useCallback((jobId) => {
    const ws = new WebSocket(`${getWsBase()}/ws/progress/${jobId}`)
    wsRef.current = ws

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data)

      if (data.stage === 'complete') {
        setAppId(data.application_id)
        setIsComplete(true)
        ws.close()
        return
      }

      if (data.status === 'error') {
        setWsError(data.message)
        ws.close()
        return
      }

      const stageInfo = STAGES[data.stage] || {}
      setProgress({
        stage:   data.stage,
        label:   stageInfo.label || data.message,
        icon:    stageInfo.icon  || '⚙️',
        message: data.message,
        percent: data.percent,
        status:  data.status,
      })
    }

    ws.onerror = () => {
      setWsError('Connection lost. Please try again.')
    }
  }, [])

  const disconnect = useCallback(() => {
    wsRef.current?.close()
    wsRef.current = null
  }, [])

  const reset = useCallback(() => {
    setProgress(null)
    setIsComplete(false)
    setWsError(null)
    setAppId(null)
    disconnect()
  }, [disconnect])

  return { progress, isComplete, wsError, applicationId, connect, disconnect, reset }
}
