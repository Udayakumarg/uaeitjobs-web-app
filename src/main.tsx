import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

const requiredEnv = ['VITE_API_URL']
const missingEnv = requiredEnv.filter((env) => !import.meta.env[env])
const root = createRoot(document.getElementById('root')!)

if (missingEnv.length > 0) {
  console.error(
    [
      'UAEITJOBS configuration error',
      `Missing environment variables: ${missingEnv.join(', ')}`,
      'Create a .env file with VITE_API_URL=http://localhost:8080 for development.',
      'For Vercel, set VITE_API_URL in project Settings > Environment Variables.',
    ].join('\n'),
  )

  root.render(
    <div className="flex min-h-screen items-center justify-center bg-red-50 px-4">
      <div className="max-w-lg rounded-lg border border-red-200 bg-white p-8 shadow-xl">
        <h1 className="text-3xl font-bold text-red-700">Configuration error</h1>
        <p className="mt-4 text-slate-700">The frontend is missing a required environment variable.</p>
        <pre className="mt-4 overflow-auto rounded-md bg-slate-100 p-4 text-sm text-slate-900">VITE_API_URL=http://localhost:8080</pre>
        <p className="mt-4 text-sm text-slate-600">For production, set `VITE_API_URL=https://api.uaeitjobs.com` in Vercel before deploying.</p>
      </div>
    </div>,
  )
} else {
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  )
}
