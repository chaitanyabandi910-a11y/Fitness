// Hand-written types mirroring supabase/migrations/20260101000000_init.sql.
// Regenerate with `supabase gen types typescript` once the schema stabilizes.

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type Goal = 'lose' | 'maintain' | 'gain'
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type FoodSource = 'usda_foundation' | 'usda_sr_legacy' | 'usda_branded' | 'open_food_facts' | 'user' | 'ai_vision'
export type LogSource = 'manual' | 'search' | 'photo_label' | 'photo_vision'
export type ScanType = 'label_ocr' | 'food_vision'

export type Profile = {
  id: string
  full_name: string | null
  sex: 'male' | 'female' | 'other' | null
  date_of_birth: string | null
  height_cm: number | null
  weight_kg: number | null
  activity_level: ActivityLevel
  goal: Goal
  daily_calorie_goal: number | null
  daily_protein_goal_g: number | null
  daily_carbs_goal_g: number | null
  daily_fat_goal_g: number | null
  created_at: string
  updated_at: string
}

export type Food = {
  id: string
  usda_fdc_id: number | null
  name: string
  brand: string | null
  category: string | null
  source: FoodSource
  calories_kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  saturated_fat_g: number | null
  fiber_g: number | null
  sugar_g: number | null
  sodium_mg: number | null
  potassium_mg: number | null
  cholesterol_mg: number | null
  created_by: string | null
  created_at: string
}

export type FoodLog = {
  id: string
  user_id: string
  food_id: string | null
  custom_name: string | null
  meal_type: MealType
  quantity_g: number
  calories_kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number | null
  sugar_g: number | null
  sodium_mg: number | null
  source: LogSource
  photo_url: string | null
  notes: string | null
  logged_at: string
  created_at: string
}

export type PhotoScan = {
  id: string
  user_id: string
  storage_path: string
  scan_type: ScanType
  raw_response: unknown
  parsed_result: unknown
  food_log_id: string | null
  created_at: string
}

export type BodyMetric = {
  id: string
  user_id: string
  logged_date: string
  weight_kg: number | null
  body_fat_pct: number | null
  notes: string | null
  created_at: string
}

export type ExerciseLog = {
  id: string
  user_id: string
  activity: string
  duration_minutes: number | null
  calories_burned: number
  logged_at: string
  created_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: Profile
        Insert: Partial<Profile> & { id: string }
        Update: Partial<Profile>
        Relationships: []
      }
      foods: {
        Row: Food
        Insert: Partial<Food> & { name: string; source: FoodSource }
        Update: Partial<Food>
        Relationships: []
      }
      food_logs: {
        Row: FoodLog
        Insert: Partial<FoodLog> & { user_id: string; meal_type: MealType; quantity_g: number; calories_kcal: number }
        Update: Partial<FoodLog>
        Relationships: [
          {
            foreignKeyName: 'food_logs_food_id_fkey'
            columns: ['food_id']
            isOneToOne: false
            referencedRelation: 'foods'
            referencedColumns: ['id']
          },
        ]
      }
      photo_scans: {
        Row: PhotoScan
        Insert: Partial<PhotoScan> & { user_id: string; storage_path: string; scan_type: ScanType }
        Update: Partial<PhotoScan>
        Relationships: []
      }
      body_metrics: {
        Row: BodyMetric
        Insert: Partial<BodyMetric> & { user_id: string }
        Update: Partial<BodyMetric>
        Relationships: []
      }
      exercise_logs: {
        Row: ExerciseLog
        Insert: Partial<ExerciseLog> & { user_id: string; activity: string }
        Update: Partial<ExerciseLog>
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: Record<string, never>
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
