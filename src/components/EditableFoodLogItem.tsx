import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import type { FoodLog, MealType } from '../types/database'

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

interface Props {
  log: FoodLog & { foods: { name: string } | null }
}

export function EditableFoodLogItem({ log }: Props) {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [mealType, setMealType] = useState<MealType>(log.meal_type)
  const [quantity, setQuantity] = useState(log.quantity_g)
  const [calories, setCalories] = useState(log.calories_kcal)
  const [protein, setProtein] = useState(log.protein_g)
  const [carbs, setCarbs] = useState(log.carbs_g)
  const [fat, setFat] = useState(log.fat_g)

  const name = log.foods?.name ?? log.custom_name ?? 'Food'

  async function handleSave() {
    setSaving(true)
    const { error } = await supabase
      .from('food_logs')
      .update({ meal_type: mealType, quantity_g: quantity, calories_kcal: calories, protein_g: protein, carbs_g: carbs, fat_g: fat })
      .eq('id', log.id)
    setSaving(false)
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['food_logs'] })
      setEditing(false)
    }
  }

  async function handleDelete() {
    if (!confirm(`Delete "${name}"?`)) return
    setSaving(true)
    const { error } = await supabase.from('food_logs').delete().eq('id', log.id)
    setSaving(false)
    if (!error) queryClient.invalidateQueries({ queryKey: ['food_logs'] })
  }

  if (!editing) {
    return (
      <li>
        <button onClick={() => setEditing(true)} className="flex w-full items-center justify-between px-5 py-3 text-left transition-colors hover:bg-slate-50 active:scale-[0.99] dark:hover:bg-slate-800">
          <div>
            <p className="font-medium text-slate-700 dark:text-slate-200">{name}</p>
            <p className="text-xs uppercase tracking-wide text-slate-400">{log.meal_type} · {log.quantity_g}g</p>
          </div>
          <span className="text-sm font-medium text-slate-600 dark:text-slate-300">{Math.round(log.calories_kcal)} kcal</span>
        </button>
      </li>
    )
  }

  return (
    <li className="animate-fade-in space-y-3 bg-slate-50 px-5 py-4 dark:bg-slate-800/50">
      <p className="font-medium text-slate-700 dark:text-slate-200">{name}</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-1 block text-xs text-slate-500">Quantity (g)</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-slate-500">Meal</label>
          <select
            value={mealType}
            onChange={(e) => setMealType(e.target.value as MealType)}
            className="w-full rounded-lg border border-slate-300 px-2 py-1.5 dark:border-slate-700 dark:bg-slate-800"
          >
            {MEAL_TYPES.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid grid-cols-4 gap-2">
        <NumberField label="kcal" value={calories} onChange={setCalories} />
        <NumberField label="protein g" value={protein} onChange={setProtein} />
        <NumberField label="carbs g" value={carbs} onChange={setCarbs} />
        <NumberField label="fat g" value={fat} onChange={setFat} />
      </div>
      <div className="flex gap-2">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex-1 rounded-lg bg-emerald-600 py-2 text-sm font-medium text-white transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button
          onClick={handleDelete}
          disabled={saving}
          className="rounded-lg border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-950"
        >
          Delete
        </button>
        <button
          onClick={() => setEditing(false)}
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 dark:border-slate-700 dark:text-slate-300"
        >
          Cancel
        </button>
      </div>
    </li>
  )
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded border border-slate-200 px-1 py-1 text-center [appearance:textfield] dark:border-slate-700 dark:bg-slate-800 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <p className="mt-0.5 text-center text-slate-400">{label}</p>
    </div>
  )
}
