'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react'
import { AlertCircle, CheckCircle2, Info, TriangleAlert, X } from 'lucide-react'

type ToastVariant = 'success' | 'error' | 'info' | 'warning'

type ToastItem = {
  id: string
  title?: string
  message: string
  variant: ToastVariant
}

type ConfirmOptions = {
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'danger'
}

type PromptOptions = ConfirmOptions & {
  inputLabel?: string
  inputPlaceholder?: string
  initialValue?: string
  validate?: (value: string) => string | null
}

type DialogState =
  | {
      kind: 'confirm'
      options: Required<ConfirmOptions>
      resolve: (value: boolean) => void
    }
  | {
      kind: 'prompt'
      options: Required<Omit<PromptOptions, 'validate'>> & {
        validate?: PromptOptions['validate']
      }
      resolve: (value: string | null) => void
    }

type PopupContextValue = {
  notify: (input: { title?: string; message: string; variant?: ToastVariant }) => void
  confirm: (options: ConfirmOptions) => Promise<boolean>
  prompt: (options: PromptOptions) => Promise<string | null>
}

const PopupContext = createContext<PopupContextValue | null>(null)

function getToastIcon(variant: ToastVariant) {
  switch (variant) {
    case 'success':
      return <CheckCircle2 size={18} />
    case 'error':
      return <AlertCircle size={18} />
    case 'warning':
      return <TriangleAlert size={18} />
    default:
      return <Info size={18} />
  }
}

function getToastStyles(variant: ToastVariant) {
  switch (variant) {
    case 'success':
      return 'border-green-200 bg-green-50 text-green-800'
    case 'error':
      return 'border-red-200 bg-red-50 text-red-800'
    case 'warning':
      return 'border-amber-200 bg-amber-50 text-amber-800'
    default:
      return 'border-blue-200 bg-blue-50 text-blue-800'
  }
}

export function PopupProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [dialogState, setDialogState] = useState<DialogState | null>(null)
  const [promptValue, setPromptValue] = useState('')
  const [promptError, setPromptError] = useState<string | null>(null)
  const idCounter = useRef(0)

  const notify = useCallback(
    ({
      title,
      message,
      variant = 'info',
    }: {
      title?: string
      message: string
      variant?: ToastVariant
    }) => {
      const id = `toast-${Date.now()}-${idCounter.current++}`
      setToasts((current) => [...current, { id, title, message, variant }])
      window.setTimeout(() => {
        setToasts((current) => current.filter((toast) => toast.id !== id))
      }, 3200)
    },
    []
  )

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      setDialogState({
        kind: 'confirm',
        options: {
          title: options.title,
          message: options.message,
          confirmLabel: options.confirmLabel ?? 'Confirm',
          cancelLabel: options.cancelLabel ?? 'Cancel',
          variant: options.variant ?? 'default',
        },
        resolve,
      })
    })
  }, [])

  const prompt = useCallback((options: PromptOptions) => {
    return new Promise<string | null>((resolve) => {
      setPromptValue(options.initialValue ?? '')
      setPromptError(null)
      setDialogState({
        kind: 'prompt',
        options: {
          title: options.title,
          message: options.message,
          confirmLabel: options.confirmLabel ?? 'Confirm',
          cancelLabel: options.cancelLabel ?? 'Cancel',
          variant: options.variant ?? 'default',
          inputLabel: options.inputLabel ?? 'Your response',
          inputPlaceholder: options.inputPlaceholder ?? '',
          initialValue: options.initialValue ?? '',
          validate: options.validate,
        },
        resolve,
      })
    })
  }, [])

  const value = useMemo(
    () => ({
      notify,
      confirm,
      prompt,
    }),
    [confirm, notify, prompt]
  )

  return (
    <PopupContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed right-4 top-4 z-[120] flex w-full max-w-sm flex-col gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl border px-4 py-3 shadow-lg ${getToastStyles(toast.variant)}`}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5">{getToastIcon(toast.variant)}</div>
              <div className="min-w-0 flex-1">
                {toast.title ? <p className="text-sm font-bold">{toast.title}</p> : null}
                <p className="text-sm leading-6">{toast.message}</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setToasts((current) => current.filter((item) => item.id !== toast.id))
                }
                className="rounded-full p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100"
              >
                <X size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {dialogState ? (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-3xl border border-gray-200 bg-white p-6 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-bold text-slate-900">
                  {dialogState.options.title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-slate-600">
                  {dialogState.options.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (dialogState.kind === 'confirm') {
                    dialogState.resolve(false)
                  } else {
                    dialogState.resolve(null)
                  }
                  setDialogState(null)
                }}
                className="rounded-full p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            {dialogState.kind === 'prompt' ? (
              <div className="mb-5">
                <label className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                  {dialogState.options.inputLabel}
                </label>
                <textarea
                  value={promptValue}
                  onChange={(event) => {
                    setPromptValue(event.target.value)
                    if (promptError) {
                      setPromptError(null)
                    }
                  }}
                  rows={4}
                  placeholder={dialogState.options.inputPlaceholder}
                  className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-blue-500"
                />
                {promptError ? (
                  <p className="mt-2 text-sm font-medium text-red-600">{promptError}</p>
                ) : null}
              </div>
            ) : null}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  if (dialogState.kind === 'confirm') {
                    dialogState.resolve(false)
                  } else {
                    dialogState.resolve(null)
                  }
                  setDialogState(null)
                }}
                className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {dialogState.options.cancelLabel}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (dialogState.kind === 'confirm') {
                    dialogState.resolve(true)
                    setDialogState(null)
                    return
                  }

                  const validationMessage = dialogState.options.validate?.(promptValue) ?? null

                  if (validationMessage) {
                    setPromptError(validationMessage)
                    return
                  }

                  dialogState.resolve(promptValue)
                  setDialogState(null)
                }}
                className={`flex-1 rounded-2xl px-4 py-3 text-sm font-semibold text-white transition ${
                  dialogState.options.variant === 'danger'
                    ? 'bg-red-600 hover:bg-red-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {dialogState.options.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </PopupContext.Provider>
  )
}

export function usePopup() {
  const context = useContext(PopupContext)

  if (!context) {
    throw new Error('usePopup must be used within a PopupProvider.')
  }

  return context
}
