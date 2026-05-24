import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:            1000 * 60 * 5,
      gcTime:               1000 * 60 * 10,
      refetchOnWindowFocus: true,
      retry:                2,
      throwOnError:         false,
    },
  },
})

if (import.meta.env.DEV) {
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Loophire] Unhandled promise rejection:', event.reason)
  })
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ErrorBoundary
          level="page"
          fallback={({ error, onReset }) => (
            <div className="min-h-screen bg-[#111110] flex items-center justify-center px-4">
              <div className="max-w-md w-full bg-[#1e1d1c] border border-[#2e2c2a] rounded-xl p-8 text-center">
                <p className="text-2xl mb-4">⚠</p>
                <h1 className="text-lg font-semibold text-white mb-2">Loophire ran into a problem</h1>
                <p className="text-sm text-gray-400 mb-5">
                  Your data is safe. Please refresh the page to continue.
                </p>
                {import.meta.env.DEV && error && (
                  <p className="text-xs text-red-400 font-mono mb-5 text-left bg-[#111110] p-3 rounded">
                    {error.message}
                  </p>
                )}
                <button
                  onClick={() => { onReset(); window.location.href = '/' }}
                  className="px-5 py-2.5 bg-[#fd5a04] text-white text-sm rounded-lg"
                >
                  Return to homepage
                </button>
              </div>
            </div>
          )}
        >
          <Suspense fallback={<div className="min-h-screen bg-[#111110]" />}>
            <App />
          </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
