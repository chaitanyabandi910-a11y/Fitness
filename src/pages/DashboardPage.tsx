import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'
import { MacroProgress } from '../components/MacroProgress'

function startOfTodayISO() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.toISOString()
}

function endOfTodayISO() {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d.toISOString()
}

export function DashboardPage() {
  const { user } = useAuth()

  const { data: profile } = useQuery({
    queryKey: ['profile', user!.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user!.id).single()
      if (error) throw error
      return data
    },
  })

  const { data: logs, isLoading } = useQuery({
    queryKey: ['food_logs', 'today', user!.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('food_logs')
        .select('*, foods(name)')
        .eq('user_id', user!.id)
        .gte('logged_at', startOfTodayISO())
        .lte('logged_at', endOfTodayISO())
        .order('logged_at', { ascending: false })
      if (error) throw error
      return data as (typeof data[number] & { foods: { name: string } | null })[]
    },
  })

  const { data: exerciseLogs } = useQuery({
    queryKey: ['exercise_logs', 'today', user!.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('exercise_logs')
        .select('*')
        .eq('user_id', user!.id)
        .gte('logged_at', startOfTodayISO())
        .lte('logged_at', endOfTodayISO())
      if (error) throw error
      return data
    },
  })

  const totals = (logs ?? []).reduce(
    (acc, log) => ({
      calories: acc.calories + log.calories_kcal,
      protein: acc.protein + log.protein_g,
      carbs: acc.carbs + log.carbs_g,
      fat: acc.fat + log.fat_g,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  )

  const caloriesBurned = (exerciseLogs ?? []).reduce((sum, e) => sum + e.calories_burned, 0)
  const netCalories = totals.calories - caloriesBurned

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Today</h1>
        <p className="text-slate-500">{new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
      </div>

      {!profile?.daily_calorie_goal && (
        <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          Set your body stats and goals on the <Link to="/profile" className="underline">Profile</Link> page to see progress against targets.
        </div>
      )}

      <div className="space-y-4 rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
        <MacroProgress label="Calories" consumed={totals.calories} goal={profile?.daily_calorie_goal ?? null} unit=" kcal" colorClassName="bg-emerald-500" />
        <MacroProgress label="Protein" consumed={totals.protein} goal={profile?.daily_protein_goal_g ?? null} unit="g" colorClassName="bg-sky-500" />
        <MacroProgress label="Carbs" consumed={totals.carbs} goal={profile?.daily_carbs_goal_g ?? null} unit="g" colorClassName="bg-amber-500" />
        <MacroProgress label="Fat" consumed={totals.fat} goal={profile?.daily_fat_goal_g ?? null} unit="g" colorClassName="bg-violet-500" />
      </div>

      {caloriesBurned > 0 && (
        <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">Calories burned (exercise)</span>
            <span className="font-medium text-slate-700 dark:text-slate-200">-{Math.round(caloriesBurned)} kcal</span>
          </div>
          <div className="mt-1 flex justify-between text-sm">
            <span className="text-slate-500">Net intake</span>
            <span className="font-medium text-slate-700 dark:text-slate-200">{Math.round(netCalories)} kcal</span>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Link to="/log" className="flex-1 rounded-lg bg-emerald-600 py-2.5 text-center font-medium text-white hover:bg-emerald-700">
          + Log Food
        </Link>
        <Link to="/scan" className="flex-1 rounded-lg border border-emerald-600 py-2.5 text-center font-medium text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950">
          📷 Scan Photo
        </Link>
      </div>

      <div className="rounded-xl bg-white shadow-sm dark:bg-slate-900">
        <h2 className="border-b border-slate-100 px-5 py-3 font-medium text-slate-700 dark:border-slate-800 dark:text-slate-200">
          Today's entries
        </h2>
        {isLoading && <p className="px-5 py-4 text-slate-500">Loading...</p>}
        {!isLoading && (logs ?? []).length === 0 && (
          <p className="px-5 py-4 text-slate-500">Nothing logged yet today.</p>
        )}
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {(logs ?? []).map((log) => (
            <li key={log.id} className="flex items-center justify-between px-5 py-3">
              <div>
                <p className="font-medium text-slate-700 dark:text-slate-200">{log.foods?.name ?? log.custom_name ?? 'Food'}</p>
                <p className="text-xs uppercase tracking-wide text-slate-400">{log.meal_type} · {log.quantity_g}g</p>
              </div>
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{Math.round(log.calories_kcal)} kcal</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
