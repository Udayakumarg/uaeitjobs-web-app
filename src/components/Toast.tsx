import { create } from 'zustand'
import { CheckCircle2, Info, X, XCircle } from 'lucide-react'

type ToastTone = 'success' | 'error' | 'info'

interface ToastItem {
  id: string
  title?: string
  message?: string
  tone: ToastTone
}

interface ToastState {
  toasts: ToastItem[]
  add: (toast: { type?: ToastTone; title?: string; message?: string }) => void
  push: (message: string, tone?: ToastTone) => void
  remove: (id: string) => void
}

export const useToast = create<ToastState>((set) => ({
  toasts: [],
  add: ({ type = 'info', title, message }) => {
    const id = crypto.randomUUID()
    set((state) => ({ toasts: [...state.toasts, { id, title, message, tone: type }] }))
    window.setTimeout(() => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })), 4200)
  },
  push: (message, tone = 'info') => {
    const id = crypto.randomUUID()
    set((state) => ({ toasts: [...state.toasts, { id, message, tone }] }))
    window.setTimeout(() => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })), 4200)
  },
  remove: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}))

export const useToastStore = useToast

export function Toasts() {
  const { toasts, remove } = useToast()
  return (
    <div className="fixed right-4 top-4 z-50 grid w-[calc(100%-2rem)] max-w-sm gap-3" aria-live="polite">
      {toasts.map((toast) => {
        const Icon = toast.tone === 'success' ? CheckCircle2 : toast.tone === 'error' ? XCircle : Info
        return (
          <div key={toast.id} className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-4 text-sm text-slate-800 shadow-lg">
            <Icon className={toast.tone === 'success' ? 'mt-0.5 h-5 w-5 text-green-600' : toast.tone === 'error' ? 'mt-0.5 h-5 w-5 text-red-600' : 'mt-0.5 h-5 w-5 text-blue-600'} />
            <div className="flex-1">
              {toast.title ? <p className="font-semibold text-slate-950">{toast.title}</p> : null}
              {toast.message ? <p className={toast.title ? 'mt-0.5 text-slate-600' : ''}>{toast.message}</p> : null}
            </div>
            <button aria-label="Dismiss notification" onClick={() => remove(toast.id)} className="rounded p-1 text-slate-500 hover:bg-slate-100">
              <X className="h-4 w-4" />
            </button>
          </div>
        )
      })}
    </div>
  )
}
