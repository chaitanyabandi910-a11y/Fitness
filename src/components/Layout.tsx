import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

const NAV_ITEMS = [
  { to: '/', label: 'Dashboard' },
  { to: '/log', label: 'Log Food' },
  { to: '/scan', label: 'Scan Photo' },
  { to: '/history', label: 'History' },
  { to: '/profile', label: 'Profile' },
]

export function Layout() {
  const { signOut } = useAuth()
  const location = useLocation()

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-100 via-sky-50 to-violet-100 dark:from-slate-950 dark:via-emerald-950/30 dark:to-slate-950 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <span className="flex items-center gap-2 text-lg font-semibold">
            <img src="/logo.png" alt="" className="h-7 w-7 rounded-lg" />
            Fitness Tracker
          </span>
          <button
            onClick={signOut}
            className="text-sm text-slate-500 transition-colors hover:text-slate-800 dark:hover:text-slate-200"
          >
            Sign out
          </button>
        </div>
        <nav className="mx-auto flex max-w-4xl gap-1 overflow-x-auto px-4 pb-2">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-full px-3 py-1.5 text-sm font-medium transition-all duration-150 active:scale-95 ${
                  isActive
                    ? 'bg-emerald-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="mx-auto max-w-4xl px-4 py-6">
        <div key={location.pathname} className="animate-page-enter">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
