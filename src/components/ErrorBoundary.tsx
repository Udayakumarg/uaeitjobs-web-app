import { Component, type ErrorInfo, type ReactNode } from 'react'
import { Button, Card } from './ui'

export class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error(error, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mx-auto max-w-2xl px-4 py-16">
          <Card className="text-center">
            <h1 className="text-2xl font-bold text-slate-950">Something broke</h1>
            <p className="mt-2 text-slate-600">Refresh the page or return to the job board.</p>
            <Button className="mt-5" onClick={() => window.location.assign('/jobs')}>Go to jobs</Button>
          </Card>
        </div>
      )
    }
    return this.props.children
  }
}
