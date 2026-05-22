import { useState } from 'react'

export default function useDemoGuard() {
  const isDemo = localStorage.getItem('loophire_is_demo') === 'true'
  const [visible, setVisible] = useState(false)

  const guard = (action) => {
    if (!isDemo) return action()
    setVisible(true)
    setTimeout(() => setVisible(false), 3000)
  }

  return { isDemo, guard, visible }
}
