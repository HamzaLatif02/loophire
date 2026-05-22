export default function DemoBlockedMessage({ visible }) {
  if (!visible) return null
  return (
    <p className="text-xs text-amber-400 mt-1.5">
      Not available in demo mode.{' '}
      <a href="/register" className="underline hover:text-amber-300 transition-colors">
        Create a free account
      </a>{' '}
      to use all features.
    </p>
  )
}
