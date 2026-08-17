import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { BudgetProvider } from './context/BudgetContext'
import LoginPage from './pages/LoginPage'
import DashboardPage from './pages/DashboardPage'
import FlexPage from './pages/FlexPage'
import HistoryPage from './pages/HistoryPage'
import MonthDetailPage from './pages/MonthDetailPage'
import SettingsPage from './pages/SettingsPage'
import AppShell from './components/AppShell'

function RequireAuth({ children }: { children: ReactNode }) {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex h-dvh items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-brand border-t-transparent" />
      </div>
    )
  }

  if (!session) return <Navigate to="/login" replace />

  return <>{children}</>
}

function AuthedApp() {
  return (
    <BudgetProvider>
      <AppShell>
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/flex" element={<FlexPage />} />
          <Route path="/history" element={<HistoryPage />} />
          <Route path="/history/:year/:month" element={<MonthDetailPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AppShell>
    </BudgetProvider>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            path="/*"
            element={
              <RequireAuth>
                <AuthedApp />
              </RequireAuth>
            }
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
