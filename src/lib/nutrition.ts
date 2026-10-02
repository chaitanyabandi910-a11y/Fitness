import type { ActivityLevel, Goal, Profile } from '../types/database'

const ACTIVITY_MULTIPLIER: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

const GOAL_CALORIE_ADJUSTMENT: Record<Goal, number> = {
  lose: -500,
  maintain: 0,
  gain: 300,
}

function ageFromDob(dateOfBirth: string): number {
  const dob = new Date(dateOfBirth)
  const now = new Date()
  let age = now.getFullYear() - dob.getFullYear()
  const monthDiff = now.getMonth() - dob.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age -= 1
  return age
}

/** Mifflin-St Jeor BMR, then TDEE via activity multiplier, then goal-adjusted calorie target. */
export function suggestedCalorieGoal(
  profile: Pick<Profile, 'sex' | 'date_of_birth' | 'height_cm' | 'weight_kg' | 'activity_level' | 'goal'>
): number | null {
  const { sex, date_of_birth, height_cm, weight_kg, activity_level, goal } = profile
  if (!sex || !date_of_birth || !height_cm || !weight_kg) return null

  const age = ageFromDob(date_of_birth)
  const sexOffset = sex === 'male' ? 5 : sex === 'female' ? -161 : -78 // midpoint for 'other'
  const bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + sexOffset
  const tdee = bmr * ACTIVITY_MULTIPLIER[activity_level]
  return Math.round(tdee + GOAL_CALORIE_ADJUSTMENT[goal])
}

/** Standard macro split: 30% protein / 40% carbs / 30% fat, converted to grams. */
export function suggestedMacroGoals(calorieGoal: number) {
  return {
    protein_g: Math.round((calorieGoal * 0.3) / 4),
    carbs_g: Math.round((calorieGoal * 0.4) / 4),
    fat_g: Math.round((calorieGoal * 0.3) / 9),
  }
}

export function scaleNutrition<T extends Record<string, number | null>>(
  per100g: T,
  grams: number
): { [K in keyof T]: number } {
  const factor = grams / 100
  const result = {} as { [K in keyof T]: number }
  for (const key in per100g) {
    result[key] = Math.round(((per100g[key] ?? 0) * factor) * 10) / 10
  }
  return result
}
