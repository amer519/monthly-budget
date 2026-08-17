import type { ReactNode } from 'react'
import BottomNav from './BottomNav'

export default function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-surface dark:bg-surface-dark">
      <main className="flex-1 overflow-y-auto pb-28">{children}</main>
      <BottomNav />
    </div>
  )
}
