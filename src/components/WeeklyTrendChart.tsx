import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

function localDateKey(d: Date) {
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

function daysAgoISO(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

// Plain CSS bars, not a charting library -- one chart doesn't need a dependency.
export function WeeklyTrendChart() {
  const { user } = useAuth()

  const { data: logs } = useQuery({
    queryKey: ['food_logs', 'weekly-trend', user!.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('food_logs')
        .select('logged_at, calories_kcal')
        .eq('user_id', user!.id)
        .gte('logged_at', daysAgoISO(6))
      if (error) throw error
      return data
    },
  })

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d
  })

  const totalsByDay = days.map((date) => {
    const key = localDateKey(date)
    const total = (logs ?? [])
      .filter((l) => localDateKey(new Date(l.logged_at)) === key)
      .reduce((sum, l) => sum + l.calories_kcal, 0)
    return { date, total }
  })

  const max = Math.max(1, ...totalsByDay.map((d) => d.total))
  const today = localDateKey(new Date())

  return (
    <div className="flex h-32 items-end gap-2">
      {totalsByDay.map(({ date, total }, i) => (
        <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
          <div className="flex h-24 w-full items-end" title={`${Math.round(total)} kcal`}>
            <div
              className={`w-full rounded-t-md transition-all duration-700 ease-out ${
                localDateKey(date) === today ? 'bg-emerald-500' : 'bg-emerald-200 dark:bg-emerald-900'
              }`}
              style={{ height: `${total > 0 ? Math.max(6, (total / max) * 100) : 0}%` }}
            />
          </div>
          <span className="text-[11px] font-medium text-slate-400">
            {date.toLocaleDateString(undefined, { weekday: 'narrow' })}
          </span>
        </div>
      ))}
    </div>
  )
}
