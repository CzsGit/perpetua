'use client'

import { create } from 'zustand'
import { useEffect } from 'react'

type ToastType = 'error' | 'success' | 'info'

interface ToastState {
  message: string | null
  type: ToastType
  show: (message: string, type?: ToastType) => void
  dismiss: () => void
}

export const useToastStore = create<ToastState>((set) => ({
  message: null,
  type: 'info',
  show: (message, type = 'info') => set({ message, type }),
  dismiss: () => set({ message: null }),
}))

export default function Toast() {
  const { message, type, dismiss } = useToastStore()

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(dismiss, 5000)
    return () => clearTimeout(timer)
  }, [message, dismiss])

  if (!message) return null

  const colorClasses = {
    error: 'border-red-500/50 bg-red-900/90 text-red-100',
    success: 'border-green-500/50 bg-green-900/90 text-green-100',
    info: 'border-blue-500/50 bg-blue-900/90 text-blue-100',
  }

  return (
    <div className="fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 animate-[slideUp_0.3s_ease-out]">
      <div
        className={`flex items-center gap-3 rounded-xl border px-5 py-3 shadow-lg ${colorClasses[type]}`}
      >
        <span className="text-sm">{message}</span>
        <button
          onClick={dismiss}
          className="ml-2 text-xs opacity-70 hover:opacity-100"
        >
          ✕
        </button>
      </div>
    </div>
  )
}
