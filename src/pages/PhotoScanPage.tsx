import { useState, type ChangeEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { supabase } from '../lib/supabase'
import type { MealType } from '../types/database'

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

interface AnalysisItem {
  name: string
  estimated_grams: number
  calories_kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g?: number
  sugar_g?: number
  sodium_mg?: number
}

interface AnalysisResult {
  scan_type: 'label_ocr' | 'food_vision'
  serving_description?: string
  items: AnalysisItem[]
  confidence: 'high' | 'medium' | 'low'
  notes?: string
}

export function PhotoScanPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [storagePath, setStoragePath] = useState<string | null>(null)
  const [mealType, setMealType] = useState<MealType>('breakfast')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    if (!f) return
    setFile(f)
    setPreviewUrl(URL.createObjectURL(f))
    setResult(null)
    setError(null)
  }

  async function handleAnalyze() {
    if (!file || !user) return
    setAnalyzing(true)
    setError(null)
    try {
      const path = `${user.id}/${crypto.randomUUID()}-${file.name}`
      const { error: uploadError } = await supabase.storage.from('food-photos').upload(path, file)
      if (uploadError) throw uploadError
      setStoragePath(path)

      const { data, error: fnError } = await supabase.functions.invoke('analyze-food-photo', {
        body: { storagePath: path },
      })
      if (fnError) throw new Error(await describeFunctionError(fnError))
      if (data?.error) throw new Error(data.error)
      setResult(data.result)
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    } finally {
      setAnalyzing(false)
    }
  }

  function updateItem(index: number, patch: Partial<AnalysisItem>) {
    if (!result) return
    const items = [...result.items]
    items[index] = { ...items[index], ...patch }
    setResult({ ...result, items })
  }

  async function handleConfirm() {
    if (!result || !user) return
    setSaving(true)
    setError(null)
    const source: 'photo_label' | 'photo_vision' = result.scan_type === 'label_ocr' ? 'photo_label' : 'photo_vision'
    const rows = result.items.map((item) => ({
      user_id: user.id,
      custom_name: item.name,
      meal_type: mealType,
      quantity_g: item.estimated_grams,
      calories_kcal: item.calories_kcal,
      protein_g: item.protein_g,
      carbs_g: item.carbs_g,
      fat_g: item.fat_g,
      fiber_g: item.fiber_g ?? null,
      sugar_g: item.sugar_g ?? null,
      sodium_mg: item.sodium_mg ?? null,
      source,
      photo_url: storagePath,
    }))
    const { error } = await supabase.from('food_logs').insert(rows)
    setSaving(false)
    if (error) setError(error.message)
    else navigate('/')
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-semibold text-slate-800 dark:text-slate-100">Scan a Photo</h1>
      <p className="text-slate-500">
        Snap a nutrition label for exact values, or a plate of food for an AI estimate.
      </p>

      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-600 dark:bg-red-950 dark:text-red-400">{error}</p>}

      <div className="rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
        <input type="file" accept="image/*" capture="environment" onChange={handleFileChange} className="block w-full text-sm" />
        {previewUrl && (
          <img src={previewUrl} alt="Selected food" className="mt-4 max-h-72 w-full rounded-lg object-contain" />
        )}
        {file && !result && (
          <button
            onClick={handleAnalyze}
            disabled={analyzing}
            className="mt-4 w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {analyzing ? 'Analyzing...' : 'Analyze photo'}
          </button>
        )}
        {analyzing && (
          <p className="mt-2 text-center text-sm text-slate-400">This can take up to a minute — hang tight.</p>
        )}
      </div>

      {result && (
        <div className="space-y-4 rounded-xl bg-white p-5 shadow-sm dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-slate-800 dark:text-slate-100">
              {result.scan_type === 'label_ocr' ? 'Nutrition label read' : 'Food identified'}
            </h2>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                result.confidence === 'high'
                  ? 'bg-emerald-100 text-emerald-700'
                  : result.confidence === 'medium'
                    ? 'bg-amber-100 text-amber-700'
                    : 'bg-red-100 text-red-700'
              }`}
            >
              {result.confidence} confidence
            </span>
          </div>
          {result.notes && <p className="text-sm italic text-slate-500">{result.notes}</p>}

          {result.items.map((item, i) => (
            <div key={i} className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
              <input
                value={item.name}
                onChange={(e) => updateItem(i, { name: e.target.value })}
                className="w-full rounded border border-slate-200 px-2 py-1 font-medium dark:border-slate-700 dark:bg-slate-800"
              />
              <div className="grid grid-cols-5 gap-2 text-center text-xs">
                <LabeledNumberInput label="grams" value={item.estimated_grams} onChange={(v) => updateItem(i, { estimated_grams: v })} />
                <LabeledNumberInput label="kcal" value={item.calories_kcal} onChange={(v) => updateItem(i, { calories_kcal: v })} />
                <LabeledNumberInput label="protein g" value={item.protein_g} onChange={(v) => updateItem(i, { protein_g: v })} />
                <LabeledNumberInput label="carbs g" value={item.carbs_g} onChange={(v) => updateItem(i, { carbs_g: v })} />
                <LabeledNumberInput label="fat g" value={item.fat_g} onChange={(v) => updateItem(i, { fat_g: v })} />
              </div>
            </div>
          ))}

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

          <button
            onClick={handleConfirm}
            disabled={saving}
            className="w-full rounded-lg bg-emerald-600 py-2.5 font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : `Add ${result.items.length} item(s) to log`}
          </button>
        </div>
      )}
    </div>
  )
}

// supabase-js only exposes a generic "non-2xx status code" message on
// FunctionsHttpError; the actual reason is in the response body we return
// from the Edge Function (e.g. "Vision analysis failed: ..."). Read it back.
async function describeFunctionError(error: unknown): Promise<string> {
  const context = (error as { context?: Response }).context
  if (context instanceof Response) {
    try {
      const body = await context.clone().json()
      if (typeof body?.error === 'string') return body.error
    } catch {
      // fall through to the generic message below
    }
  }
  return error instanceof Error ? error.message : String(error)
}

function LabeledNumberInput({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full rounded border border-slate-200 px-1 py-1 text-center [appearance:textfield] dark:border-slate-700 dark:bg-slate-800 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <p className="mt-0.5 text-slate-400">{label}</p>
    </div>
  )
}
