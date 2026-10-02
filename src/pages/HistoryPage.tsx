import { useQuery } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'

function daysAgoISO(days: number) {
  const d = new Date()
  d.setDate(d.getDate() - days)
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

export function HistoryPage() {
  const { user } = useAuth()

  const { data: logs, isLoading } = useQuery({
    queryKey: ['food_logs', 'history', user!.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('food_logs')
        .select('*, foods(name)')
        .eq('user_id', user!.id)
        .gte('logged_at', daysAgoISO(30))
        .order('logged_at', { ascending: false })
      if (error) throw error
      return data as (typeof data[number] & { foods: { name: string } | null })[]
    },
  })

  const grouped = (logs ?? []).reduce<Record<string, typeof logs>>((acc, log) => {
    const day = new Date(log.logged_at).toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    })
    acc[day] = acc[day] ? [...acc[day]!, log] : [log]
    return acc
  }, {})

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">History</h1>
      {isLoading && <p className="text-slate-500">Loading...</p>}
      {!isLoading && Object.keys(grouped).length === 0 && <p className="text-slate-500">No entries in the last 30 days.</p>}

      {Object.entries(grouped).map(([day, dayLogs]) => {
        const totalCalories = dayLogs!.reduce((sum, l) => sum + l.calories_kcal, 0)
        const totalProtein = dayLogs!.reduce((sum, l) => sum + l.protein_g, 0)
        return (
          <div key={day} className="rounded-xl bg-white shadow-sm dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-800">
              <h2 className="font-medium text-slate-700 dark:text-slate-200">{day}</h2>
              <span className="text-sm text-slate-500">{Math.round(totalCalories)} kcal · {Math.round(totalProtein)}g protein</span>
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {dayLogs!.map((log) => (
                <li key={log.id} className="flex items-center justify-between px-5 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{log.foods?.name ?? log.custom_name}</p>
                    <p className="text-xs uppercase tracking-wide text-slate-400">{log.meal_type} · {log.quantity_g}g</p>
                  </div>
                  <span className="text-sm text-slate-500">{Math.round(log.calories_kcal)} kcal</span>
                </li>
              ))}
            </ul>
          </div>
        )
      })}
    </div>
  )
}
