import { NavLink } from 'react-router-dom'
import { HomeIcon, WalletIcon, CartIcon, HistoryIcon, SettingsIcon } from './icons'

const items = [
  { to: '/', label: 'Home', icon: HomeIcon, end: true },
  { to: '/flex', label: 'Flex', icon: WalletIcon, end: false },
  { to: '/household', label: 'Household', icon: CartIcon, end: false },
  { to: '/history', label: 'History', icon: HistoryIcon, end: false },
  { to: '/settings', label: 'Settings', icon: SettingsIcon, end: false },
]

export default function BottomNav() {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 mx-auto flex w-full max-w-[560px] justify-around border-t border-border bg-card/90 px-2 pb-[env(safe-area-inset-bottom)] pt-2 backdrop-blur-lg dark:border-border-dark dark:bg-card-dark/90">
      {items.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex flex-1 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-[11px] font-medium transition-colors ${
              isActive ? 'text-brand' : 'text-muted dark:text-muted-dark'
            }`
          }
        >
          <Icon className="h-6 w-6" />
          {label}
        </NavLink>
      ))}
    </nav>
  )
}
