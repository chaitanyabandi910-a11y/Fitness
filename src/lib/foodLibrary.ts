import { supabase } from './supabase'
import type { FoodSource } from '../types/database'

interface PersonalFoodInput {
  userId: string
  name: string
  source: Extract<FoodSource, 'user' | 'ai_vision'>
  grams: number
  calories_kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g?: number | null
  sugar_g?: number | null
  sodium_mg?: number | null
}

function per100g(value: number | null | undefined, factor: number): number | null {
  if (value == null) return null
  return Math.round(value * factor * 10) / 10
}

/**
 * Manually-entered and photo-scanned foods are the only realistic way this
 * app ever gets non-US dishes (USDA has essentially no Indian/regional
 * prepared food) -- so every one logged gets saved into the shared `foods`
 * table too, normalized to per-100g, making it searchable from then on.
 * Returns the food id to link on `food_logs`, or null if it couldn't be
 * saved (never blocks the actual log entry -- caller falls back to
 * custom_name).
 */
export async function upsertPersonalFood(input: PersonalFoodInput): Promise<string | null> {
  const name = input.name.trim()
  if (!name || input.grams <= 0) return null

  const { data: existing } = await supabase
    .from('foods')
    .select('id')
    .eq('created_by', input.userId)
    .ilike('name', name)
    .limit(1)
    .maybeSingle()
  if (existing) return existing.id

  const factor = 100 / input.grams
  const { data: created, error } = await supabase
    .from('foods')
    .insert({
      name,
      source: input.source,
      created_by: input.userId,
      calories_kcal: per100g(input.calories_kcal, factor) ?? 0,
      protein_g: per100g(input.protein_g, factor) ?? 0,
      carbs_g: per100g(input.carbs_g, factor) ?? 0,
      fat_g: per100g(input.fat_g, factor) ?? 0,
      fiber_g: per100g(input.fiber_g, factor),
      sugar_g: per100g(input.sugar_g, factor),
      sodium_mg: per100g(input.sodium_mg, factor),
    })
    .select('id')
    .single()

  if (error) {
    console.error('Failed to save personal food:', error)
    return null
  }
  return created.id
}
