import { StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime:           1000 * 60 * 5,  // data fresh for 5 mins
      gcTime:              1000 * 60 * 10, // cache kept for 10 mins
      refetchOnWindowFocus: true,
      retry:               2,
    },
  },
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Suspense fallback={<div className="min-h-screen bg-[#0d0f14]" />}>
          <App />
        </Suspense>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)
