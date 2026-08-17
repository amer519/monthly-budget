import type { ReactNode } from 'react'
import { XIcon } from './icons'

export default function BottomSheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean
  onClose: () => void
  title: string
  children: ReactNode
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-[560px] animate-fade-up rounded-t-3xl bg-card px-5 pb-[calc(env(safe-area-inset-bottom)+20px)] pt-4 shadow-2xl dark:bg-card-dark">
        <div className="mx-auto mb-3 h-1.5 w-10 rounded-full bg-black/10 dark:bg-white/15" />
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-ink dark:text-ink-dark">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-muted dark:bg-white/10 dark:text-muted-dark"
          >
            <XIcon className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
