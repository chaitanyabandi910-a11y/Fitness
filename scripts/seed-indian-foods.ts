// USDA has essentially no Indian/regional prepared dishes, so the shared
// `foods` table only grows for these from what users log over time (see
// src/lib/foodLibrary.ts). This script jump-starts it with ~35 common dishes
// so search isn't empty on day one.
//
// Values are typical estimates for home-style/restaurant preparation, not
// lab-measured like USDA's data -- Indian cooking varies a lot by recipe and
// region. Treat as a reasonable starting point, not ground truth.
//
// Usage: npm run seed:indian
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.SUPABASE_URL
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing env vars. Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

// All values per 100g, cooked/prepared.
const INDIAN_FOODS = [
  { name: 'Roti / Chapati', calories_kcal: 260, protein_g: 8, carbs_g: 50, fat_g: 3, fiber_g: 5 },
  { name: 'Naan', calories_kcal: 291, protein_g: 9, carbs_g: 50, fat_g: 5, fiber_g: 2 },
  { name: 'Paratha, plain', calories_kcal: 280, protein_g: 6, carbs_g: 36, fat_g: 12, fiber_g: 3 },
  { name: 'Aloo Paratha', calories_kcal: 233, protein_g: 5, carbs_g: 30, fat_g: 9, fiber_g: 3 },
  { name: 'Bhatura', calories_kcal: 340, protein_g: 7, carbs_g: 40, fat_g: 16, fiber_g: 2 },
  { name: 'Dal Tadka', calories_kcal: 116, protein_g: 7, carbs_g: 15, fat_g: 3, fiber_g: 5 },
  { name: 'Dal Makhani', calories_kcal: 175, protein_g: 7, carbs_g: 14, fat_g: 10, fiber_g: 5 },
  { name: 'Sambar', calories_kcal: 70, protein_g: 3, carbs_g: 10, fat_g: 2, fiber_g: 3 },
  { name: 'Chana Masala', calories_kcal: 164, protein_g: 7, carbs_g: 20, fat_g: 6, fiber_g: 6 },
  { name: 'Rajma (Kidney Bean Curry)', calories_kcal: 140, protein_g: 7, carbs_g: 18, fat_g: 4, fiber_g: 6 },
  { name: 'Kadhi', calories_kcal: 85, protein_g: 3, carbs_g: 8, fat_g: 4, fiber_g: 1 },
  { name: 'Paneer Butter Masala', calories_kcal: 220, protein_g: 8, carbs_g: 8, fat_g: 17, fiber_g: 1 },
  { name: 'Palak Paneer', calories_kcal: 180, protein_g: 9, carbs_g: 6, fat_g: 13, fiber_g: 3 },
  { name: 'Shahi Paneer', calories_kcal: 230, protein_g: 8, carbs_g: 9, fat_g: 18, fiber_g: 1 },
  { name: 'Chicken Curry', calories_kcal: 160, protein_g: 16, carbs_g: 5, fat_g: 9, fiber_g: 1 },
  { name: 'Butter Chicken', calories_kcal: 215, protein_g: 15, carbs_g: 6, fat_g: 14, fiber_g: 1 },
  { name: 'Chicken Biryani', calories_kcal: 200, protein_g: 9, carbs_g: 25, fat_g: 7, fiber_g: 1 },
  { name: 'Vegetable Biryani', calories_kcal: 160, protein_g: 4, carbs_g: 24, fat_g: 5, fiber_g: 2 },
  { name: 'Mutton Curry', calories_kcal: 220, protein_g: 18, carbs_g: 4, fat_g: 15, fiber_g: 1 },
  { name: 'Fish Curry', calories_kcal: 140, protein_g: 15, carbs_g: 4, fat_g: 7, fiber_g: 1 },
  { name: 'Egg Curry', calories_kcal: 155, protein_g: 9, carbs_g: 5, fat_g: 11, fiber_g: 1 },
  { name: 'Aloo Gobi', calories_kcal: 110, protein_g: 3, carbs_g: 14, fat_g: 5, fiber_g: 3 },
  { name: 'Bhindi Masala', calories_kcal: 95, protein_g: 2, carbs_g: 9, fat_g: 6, fiber_g: 4 },
  { name: 'Baingan Bharta', calories_kcal: 100, protein_g: 2, carbs_g: 10, fat_g: 6, fiber_g: 4 },
  { name: 'Mixed Vegetable Curry', calories_kcal: 110, protein_g: 3, carbs_g: 12, fat_g: 6, fiber_g: 3 },
  { name: 'Vegetable Pulao', calories_kcal: 160, protein_g: 3, carbs_g: 25, fat_g: 5, fiber_g: 2 },
  { name: 'Khichdi', calories_kcal: 120, protein_g: 4, carbs_g: 20, fat_g: 3, fiber_g: 2 },
  { name: 'Poha', calories_kcal: 130, protein_g: 2.5, carbs_g: 24, fat_g: 3, fiber_g: 2 },
  { name: 'Upma', calories_kcal: 130, protein_g: 3, carbs_g: 20, fat_g: 4, fiber_g: 2 },
  { name: 'Idli', calories_kcal: 112, protein_g: 4, carbs_g: 22, fat_g: 0.5, fiber_g: 2 },
  { name: 'Dosa, plain', calories_kcal: 166, protein_g: 4, carbs_g: 29, fat_g: 3.7, fiber_g: 1 },
  { name: 'Masala Dosa', calories_kcal: 190, protein_g: 4, carbs_g: 28, fat_g: 7, fiber_g: 2 },
  { name: 'Medu Vada', calories_kcal: 245, protein_g: 8, carbs_g: 24, fat_g: 13, fiber_g: 3 },
  { name: 'Samosa', calories_kcal: 308, protein_g: 5, carbs_g: 33, fat_g: 17, fiber_g: 3 },
  { name: 'Pakora / Bhaji', calories_kcal: 315, protein_g: 6, carbs_g: 25, fat_g: 20, fiber_g: 3 },
  { name: 'Dhokla', calories_kcal: 160, protein_g: 6, carbs_g: 25, fat_g: 4, fiber_g: 2 },
  { name: 'Raita', calories_kcal: 60, protein_g: 3, carbs_g: 5, fat_g: 3, fiber_g: 0 },
  { name: 'Chole Bhature', calories_kcal: 300, protein_g: 7, carbs_g: 35, fat_g: 14, fiber_g: 4 },
  { name: 'Chole', calories_kcal: 150, protein_g: 7, carbs_g: 20, fat_g: 5, fiber_g: 6 },
  { name: 'Paneer Malai / Malai Paneer Curry', calories_kcal: 240, protein_g: 9, carbs_g: 7, fat_g: 19, fiber_g: 1 },
  { name: 'Malai Kofta', calories_kcal: 260, protein_g: 6, carbs_g: 14, fat_g: 20, fiber_g: 2 },
  { name: 'Paneer Tikka', calories_kcal: 210, protein_g: 14, carbs_g: 6, fat_g: 15, fiber_g: 1 },
  { name: 'Kadai Paneer', calories_kcal: 210, protein_g: 9, carbs_g: 9, fat_g: 15, fiber_g: 2 },
  { name: 'Paneer Bhurji', calories_kcal: 230, protein_g: 13, carbs_g: 5, fat_g: 18, fiber_g: 1 },
  { name: 'Vegetable Korma', calories_kcal: 160, protein_g: 4, carbs_g: 12, fat_g: 11, fiber_g: 2 },
  { name: 'Chicken Tikka', calories_kcal: 180, protein_g: 22, carbs_g: 3, fat_g: 9, fiber_g: 0 },
  { name: 'Chicken Tikka Masala', calories_kcal: 195, protein_g: 16, carbs_g: 7, fat_g: 12, fiber_g: 1 },
  { name: 'Tandoori Chicken', calories_kcal: 165, protein_g: 24, carbs_g: 2, fat_g: 7, fiber_g: 0 },
  { name: 'Chicken Korma', calories_kcal: 210, protein_g: 15, carbs_g: 7, fat_g: 14, fiber_g: 1 },
  { name: 'Kadai Chicken', calories_kcal: 175, protein_g: 17, carbs_g: 6, fat_g: 10, fiber_g: 1 },
  { name: 'Keema Curry', calories_kcal: 210, protein_g: 16, carbs_g: 5, fat_g: 14, fiber_g: 1 },
  { name: 'Egg Bhurji', calories_kcal: 160, protein_g: 11, carbs_g: 3, fat_g: 12, fiber_g: 0 },
  { name: 'Dum Aloo', calories_kcal: 150, protein_g: 3, carbs_g: 16, fat_g: 9, fiber_g: 2 },
  { name: 'Pav Bhaji', calories_kcal: 150, protein_g: 4, carbs_g: 20, fat_g: 6, fiber_g: 3 },
  { name: 'Vada Pav', calories_kcal: 280, protein_g: 6, carbs_g: 38, fat_g: 12, fiber_g: 2 },
  { name: 'Misal Pav', calories_kcal: 180, protein_g: 7, carbs_g: 22, fat_g: 7, fiber_g: 4 },
  { name: 'Methi Paratha', calories_kcal: 250, protein_g: 6, carbs_g: 32, fat_g: 11, fiber_g: 4 },
  { name: 'Gobi Paratha', calories_kcal: 220, protein_g: 5, carbs_g: 30, fat_g: 9, fiber_g: 3 },
  { name: 'Puri', calories_kcal: 330, protein_g: 6, carbs_g: 35, fat_g: 19, fiber_g: 2 },
  { name: 'Paneer Pakora', calories_kcal: 290, protein_g: 10, carbs_g: 18, fat_g: 20, fiber_g: 2 },
  { name: 'Rasgulla', calories_kcal: 186, protein_g: 4, carbs_g: 32, fat_g: 5, fiber_g: 0 },
  { name: 'Kheer', calories_kcal: 150, protein_g: 4, carbs_g: 22, fat_g: 5, fiber_g: 0 },
  { name: 'Gajar Halwa', calories_kcal: 300, protein_g: 5, carbs_g: 35, fat_g: 16, fiber_g: 2 },
  { name: 'Sweet Lassi', calories_kcal: 90, protein_g: 3, carbs_g: 14, fat_g: 2.5, fiber_g: 0 },
  { name: 'Gulab Jamun', calories_kcal: 375, protein_g: 4, carbs_g: 50, fat_g: 17, fiber_g: 0 },
  { name: 'Jalebi', calories_kcal: 380, protein_g: 2, carbs_g: 70, fat_g: 10, fiber_g: 0 },
] as const

async function main() {
  // No unique constraint on `name` (manual user entries can't be globally
  // unique), so dedupe by checking existence first -- same pattern as
  // src/lib/foodLibrary.ts's upsertPersonalFood. Keeps this script safe to
  // re-run after editing the list above.
  let inserted = 0
  for (const food of INDIAN_FOODS) {
    const { data: existing } = await supabase.from('foods').select('id').ilike('name', food.name).limit(1).maybeSingle()
    if (existing) continue

    const { error } = await supabase.from('foods').insert({ ...food, category: 'Indian', source: 'user', created_by: null })
    if (error) throw error
    inserted++
  }

  console.log(`Seeded ${inserted} new Indian dishes (${INDIAN_FOODS.length - inserted} already present).`)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
