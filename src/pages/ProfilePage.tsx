import { useEffect, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { suggestedCalorieGoal, suggestedMacroGoals } from '../lib/nutrition'
import type { ActivityLevel, Goal } from '../types/database'

const ACTIVITY_LEVELS: ActivityLevel[] = ['sedentary', 'light', 'moderate', 'active', 'very_active']
const GOALS: Goal[] = ['lose', 'maintain', 'gain']

export function ProfilePage() {
  const { user } = useAuth()
  const queryClient = useQueryClient()

  const { data: profile } = useQuery({
    queryKey: ['profile', user!.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user!.id).single()
      if (error) throw error
      return data
    },
  })

  const [sex, setSex] = useState<'male' | 'female' | 'other' | ''>('')
  const [dob, setDob] = useState('')
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderate')
  const [goal, setGoal] = useState<Goal>('maintain')
  const [calorieGoal, setCalorieGoal] = useState('')
  const [proteinGoal, setProteinGoal] = useState('')
  const [carbsGoal, setCarbsGoal] = useState('')
  const [fatGoal, setFatGoal] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedMessage, setSavedMessage] = useState<string | null>(null)

  useEffect(() => {
    if (!profile) return
    setSex(profile.sex ?? '')
    setDob(profile.date_of_birth ?? '')
    setHeight(profile.height_cm?.toString() ?? '')
    setWeight(profile.weight_kg?.toString() ?? '')
    setActivityLevel(profile.activity_level)
    setGoal(profile.goal)
    setCalorieGoal(profile.daily_calorie_goal?.toString() ?? '')
    setProteinGoal(profile.daily_protein_goal_g?.toString() ?? '')
    setCarbsGoal(profile.daily_carbs_goal_g?.toString() ?? '')
    setFatGoal(profile.daily_fat_goal_g?.toString() ?? '')
  }, [profile])

  function applySuggestedGoals() {
    const suggestion = suggestedCalorieGoal({
      sex: sex || null,
      date_of_birth: dob || null,
      height_cm: height ? Number(height) : null,
      weight_kg: weight ? Number(weight) : null,
      activity_level: activityLevel,
      goal,
    })
    if (!suggestion) {
      setSavedMessage('Fill in sex, birth date, height, and weight first.')
      return
    }
    const macros = suggestedMacroGoals(suggestion)
    setCalorieGoal(String(suggestion))
    setProteinGoal(String(macros.protein_g))
    setCarbsGoal(String(macros.carbs_g))
    setFatGoal(String(macros.fat_g))
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSaving(true)
    setSavedMessage(null)
    const { error } = await supabase
      .from('profiles')
      .update({
        sex: sex || null,
        date_of_birth: dob || null,
        height_cm: height ? Number(height) : null,
        weight_kg: weight ? Number(weight) : null,
        activity_level: activityLevel,
        goal,
        daily_calorie_goal: calorieGoal ? Number(calorieGoal) : null,
        daily_protein_goal_g: proteinGoal ? Number(proteinGoal) : null,
        daily_carbs_goal_g: carbsGoal ? Number(carbsGoal) : null,
        daily_fat_goal_g: fatGoal ? Number(fatGoal) : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user!.id)
    setSaving(false)
    if (error) setSavedMessage(error.message)
    else {
      setSavedMessage('Saved.')
      queryClient.invalidateQueries({ queryKey: ['profile', user!.id] })
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Profile & Goals</h1>

      <form onSubmit={handleSubmit} className="space-y-4 rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
        <h2 className="font-medium text-slate-700 dark:text-slate-200">Body stats</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">Sex</label>
            <select value={sex} onChange={(e) => setSex(e.target.value as typeof sex)} className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">Date of birth</label>
            <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">Height (cm)</label>
            <input type="number" value={height} onChange={(e) => setHeight(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">Weight (kg)</label>
            <input type="number" value={weight} onChange={(e) => setWeight(e.target.value)} className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">Activity level</label>
            <select value={activityLevel} onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)} className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
              {ACTIVITY_LEVELS.map((a) => (
                <option key={a} value={a}>{a.replace('_', ' ')}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">Goal</label>
            <select value={goal} onChange={(e) => setGoal(e.target.value as Goal)} className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
              {GOALS.map((g) => (
                <option key={g} value={g}>{g} weight</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between pt-2">
          <h2 className="font-medium text-slate-700 dark:text-slate-200">Daily targets</h2>
          <button type="button" onClick={applySuggestedGoals} className="text-sm font-medium text-emerald-600 hover:underline">
            Suggest from stats
          </button>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div>
            <label className="mb-1 block text-xs text-slate-500">kcal</label>
            <input type="number" value={calorieGoal} onChange={(e) => setCalorieGoal(e.target.value)} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">protein g</label>
            <input type="number" value={proteinGoal} onChange={(e) => setProteinGoal(e.target.value)} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">carbs g</label>
            <input type="number" value={carbsGoal} onChange={(e) => setCarbsGoal(e.target.value)} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800" />
          </div>
          <div>
            <label className="mb-1 block text-xs text-slate-500">fat g</label>
            <input type="number" value={fatGoal} onChange={(e) => setFatGoal(e.target.value)} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800" />
          </div>
        </div>

        {savedMessage && <p className="text-sm text-slate-500">{savedMessage}</p>}
        <button type="submit" disabled={saving} className="w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save'}
        </button>
      </form>
    </div>
  )
}
