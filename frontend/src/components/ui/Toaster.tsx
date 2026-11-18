import { useToastStore } from '../../stores/toastStore'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'
import { clsx } from 'clsx'

export function Toaster() {
  const { toasts, dismiss } = useToastStore()

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <Toast key={toast.id} toast={toast} onDismiss={dismiss} />
      ))}
    </div>
  )
}

function Toast({ toast, onDismiss }: { toast: any; onDismiss: (id: string) => void }) {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
    default: Info,
  }

  const Icon = icons[toast.type] || icons.default

  const baseClasses = 'flex items-start gap-3 p-4 rounded-xl shadow-lg min-w-[300px] max-w-md animate-in slide-in-from-right'
  const typeClasses = {
    success: 'bg-success-50 text-success-900 border border-success-200',
    error: 'bg-danger-50 text-danger-900 border border-danger-200',
    info: 'bg-primary-50 text-primary-900 border border-primary-200',
    default: 'bg-dark-100 text-dark-900 border border-dark-200',
  }

  return (
    <div className={clsx(baseClasses, typeClasses[toast.type])}>
      <Icon className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <div className="flex-1">
        {toast.title && <p className="font-medium">{toast.title}</p>}
        {toast.message && <p className="text-sm opacity-90 mt-0.5">{toast.message}</p>}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 p-1 rounded hover:bg-black/10 transition-colors"
        aria-label="Dismiss"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}