import { useState, useEffect, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import { scaleNutrition } from '../lib/nutrition'
import type { Food, MealType } from '../types/database'

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

export function LogFoodPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [query, setQuery] = useState('')
  const [results, setResults] = useState<Food[]>([])
  const [searching, setSearching] = useState(false)
  const [selectedFood, setSelectedFood] = useState<Food | null>(null)
  const [grams, setGrams] = useState(100)
  const [mealType, setMealType] = useState<MealType>('breakfast')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [manualMode, setManualMode] = useState(false)
  const [manualName, setManualName] = useState('')
  const [manualCalories, setManualCalories] = useState(0)
  const [manualProtein, setManualProtein] = useState(0)
  const [manualCarbs, setManualCarbs] = useState(0)
  const [manualFat, setManualFat] = useState(0)

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([])
      return
    }
    const timeout = setTimeout(async () => {
      setSearching(true)
      const { data, error } = await supabase
        .from('foods')
        .select('*')
        .ilike('name', `%${query.trim()}%`)
        .order('name')
        .limit(20)
      setSearching(false)
      if (!error) setResults(data ?? [])
    }, 300)
    return () => clearTimeout(timeout)
  }, [query])

  const preview = selectedFood
    ? scaleNutrition(
        {
          calories_kcal: selectedFood.calories_kcal,
          protein_g: selectedFood.protein_g,
          carbs_g: selectedFood.carbs_g,
          fat_g: selectedFood.fat_g,
          fiber_g: selectedFood.fiber_g,
          sugar_g: selectedFood.sugar_g,
          sodium_mg: selectedFood.sodium_mg,
        },
        grams
      )
    : null

  async function handleSubmitFood(e: FormEvent) {
    e.preventDefault()
    if (!selectedFood || !preview) return
    setSaving(true)
    setError(null)
    const { error } = await supabase.from('food_logs').insert({
      user_id: user!.id,
      food_id: selectedFood.id,
      meal_type: mealType,
      quantity_g: grams,
      calories_kcal: preview.calories_kcal,
      protein_g: preview.protein_g,
      carbs_g: preview.carbs_g,
      fat_g: preview.fat_g,
      fiber_g: preview.fiber_g,
      sugar_g: preview.sugar_g,
      sodium_mg: preview.sodium_mg,
      source: 'search',
    })
    setSaving(false)
    if (error) setError(error.message)
    else navigate('/')
  }

  async function handleSubmitManual(e: FormEvent) {
    e.preventDefault()
    if (!manualName.trim()) return
    setSaving(true)
    setError(null)
    const { error } = await supabase.from('food_logs').insert({
      user_id: user!.id,
      custom_name: manualName.trim(),
      meal_type: mealType,
      quantity_g: grams,
      calories_kcal: manualCalories,
      protein_g: manualProtein,
      carbs_g: manualCarbs,
      fat_g: manualFat,
      source: 'manual',
    })
    setSaving(false)
    if (error) setError(error.message)
    else navigate('/')
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Log Food</h1>
        <button
          onClick={() => {
            setManualMode((m) => !m)
            setSelectedFood(null)
          }}
          className="text-sm font-medium text-emerald-600 hover:underline"
        >
          {manualMode ? 'Search database instead' : "Can't find it? Add manually"}
        </button>
      </div>

      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">{error}</p>}

      {!manualMode && !selectedFood && (
        <div>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search foods, e.g. 'broccoli' or 'chicken breast'"
            className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
          />
          {searching && <p className="mt-2 text-sm text-slate-400">Searching...</p>}
          <ul className="mt-2 divide-y divide-slate-100 rounded-lg border border-slate-100 dark:divide-slate-800 dark:border-slate-800">
            {results.map((food) => (
              <li key={food.id}>
                <button
                  onClick={() => setSelectedFood(food)}
                  className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <span>
                    <span className="font-medium text-slate-700 dark:text-slate-200">{food.name}</span>
                    {food.category && <span className="ml-2 text-xs text-slate-400">{food.category}</span>}
                  </span>
                  <span className="text-sm text-slate-500">{Math.round(food.calories_kcal)} kcal/100g</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!manualMode && selectedFood && preview && (
        <form onSubmit={handleSubmitFood} className="space-y-4 rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-slate-800 dark:text-slate-100">{selectedFood.name}</h2>
            <button type="button" onClick={() => setSelectedFood(null)} className="text-sm text-slate-400 hover:text-slate-600">
              Change
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">Quantity (g)</label>
              <input
                type="number"
                min={1}
                value={grams}
                onChange={(e) => setGrams(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">Meal</label>
              <select
                value={mealType}
                onChange={(e) => setMealType(e.target.value as MealType)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
              >
                {MEAL_TYPES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2 rounded-lg bg-slate-50 p-3 text-center text-sm dark:bg-slate-800">
            <div><p className="font-semibold">{preview.calories_kcal}</p><p className="text-slate-400">kcal</p></div>
            <div><p className="font-semibold">{preview.protein_g}g</p><p className="text-slate-400">protein</p></div>
            <div><p className="font-semibold">{preview.carbs_g}g</p><p className="text-slate-400">carbs</p></div>
            <div><p className="font-semibold">{preview.fat_g}g</p><p className="text-slate-400">fat</p></div>
          </div>
          <button type="submit" disabled={saving} className="w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Add to log'}
          </button>
        </form>
      )}

      {manualMode && (
        <form onSubmit={handleSubmitManual} className="space-y-4 rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">Food name</label>
            <input
              required
              value={manualName}
              onChange={(e) => setManualName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">Quantity (g)</label>
              <input type="number" min={1} value={grams} onChange={(e) => setGrams(Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-600 dark:text-slate-300">Meal</label>
              <select value={mealType} onChange={(e) => setMealType(e.target.value as MealType)} className="w-full rounded-lg border border-slate-300 px-3 py-2 dark:border-slate-700 dark:bg-slate-800">
                {MEAL_TYPES.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            <div>
              <label className="mb-1 block text-xs text-slate-500">kcal</label>
              <input type="number" min={0} value={manualCalories} onChange={(e) => setManualCalories(Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">protein g</label>
              <input type="number" min={0} value={manualProtein} onChange={(e) => setManualProtein(Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">carbs g</label>
              <input type="number" min={0} value={manualCarbs} onChange={(e) => setManualCarbs(Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-slate-500">fat g</label>
              <input type="number" min={0} value={manualFat} onChange={(e) => setManualFat(Number(e.target.value))} className="w-full rounded-lg border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800" />
            </div>
          </div>
          <button type="submit" disabled={saving} className="w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50">
            {saving ? 'Saving...' : 'Add to log'}
          </button>
        </form>
      )}
    </div>
  )
}
