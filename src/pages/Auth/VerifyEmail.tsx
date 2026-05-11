import { CheckCircle2, XCircle } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button, Card } from '../../components/ui'
import { authApi, errorMessage } from '../../services/api'

export default function VerifyEmail() {
  const [params] = useSearchParams()
  const [state, setState] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    const token = params.get('token')
    if (!token) {
      setState('error')
      setMessage('Verification token is missing.')
      return
    }
    authApi.verifyEmail(token)
      .then(() => setState('success'))
      .catch((error) => {
        setState('error')
        setMessage(errorMessage(error))
      })
  }, [params])

  return (
    <main className="mx-auto max-w-xl px-4 py-16">
      <Card className="text-center">
        {state === 'loading' ? <p className="font-semibold text-slate-700">Verifying your email...</p> : null}
        {state === 'success' ? (
          <>
            <CheckCircle2 className="mx-auto text-green-600" size={42} />
            <h1 className="mt-4 text-2xl font-bold text-slate-950">Email verified</h1>
            <p className="mt-2 text-slate-600">Your account is ready to use.</p>
            <Link to="/login" className="mt-6 inline-flex"><Button>Login</Button></Link>
          </>
        ) : null}
        {state === 'error' ? (
          <>
            <XCircle className="mx-auto text-red-600" size={42} />
            <h1 className="mt-4 text-2xl font-bold text-slate-950">Verification failed</h1>
            <p className="mt-2 text-slate-600">{message}</p>
          </>
        ) : null}
      </Card>
    </main>
  )
}
