// One-off/periodic ingestion: pulls USDA Foundation + SR Legacy foods (whole
// foods: veggies, fruits, meats, grains, dairy, etc.) and upserts them into
// the shared `foods` table via the Supabase service role key.
//
// Usage: npm run ingest:usda
import { createClient } from "@supabase/supabase-js";

const USDA_API_KEY = process.env.USDA_API_KEY;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!USDA_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "Missing env vars. Required: USDA_API_KEY, SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Run with: node --env-file=.env.local --import tsx scripts/ingest-usda.ts"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const PAGE_SIZE = 200;
const DATA_TYPES = ["Foundation", "SR Legacy"];

// Standard USDA nutrient numbers (stable across releases).
const NUTRIENT_NUMBER = {
  calories: "208", // Energy, KCAL
  protein: "203",
  fat: "204",
  carbs: "205",
  fiber: "291",
  sugar: "269",
  sodium: "307",
  potassium: "306",
  cholesterol: "601",
  saturatedFat: "606",
} as const;

interface UsdaNutrient {
  // The abridged /v1/foods/list endpoint uses `number`/`amount` -- NOT
  // `nutrientNumber`/`value`, which is what the full /v1/food/{fdcId} and
  // /v1/foods/search endpoints use. Mixing these up silently yields all-zero
  // macros (no type error, since both fields are optional).
  number?: string;
  name?: string;
  unitName?: string;
  amount?: number;
}

interface UsdaFood {
  fdcId: number;
  description: string;
  dataType: string;
  foodCategory?: string | { description?: string };
  foodNutrients?: UsdaNutrient[];
}

function findNutrient(nutrients: UsdaNutrient[] | undefined, nutrientNumber: string): number {
  const match = nutrients?.find((n) => n.number === nutrientNumber);
  return match?.amount ?? 0;
}

function categoryOf(food: UsdaFood): string | null {
  if (!food.foodCategory) return null;
  if (typeof food.foodCategory === "string") return food.foodCategory;
  return food.foodCategory.description ?? null;
}

function sourceFor(dataType: string): string {
  return dataType === "Foundation" ? "usda_foundation" : "usda_sr_legacy";
}

async function fetchPage(dataType: string, pageNumber: number): Promise<UsdaFood[]> {
  const url = new URL("https://api.nal.usda.gov/fdc/v1/foods/list");
  url.searchParams.set("api_key", USDA_API_KEY!);
  url.searchParams.set("dataType", dataType);
  url.searchParams.set("pageSize", String(PAGE_SIZE));
  url.searchParams.set("pageNumber", String(pageNumber));

  const res = await fetch(url);
  if (res.status === 429) {
    console.warn("Rate limited, waiting 60s...");
    await new Promise((r) => setTimeout(r, 60_000));
    return fetchPage(dataType, pageNumber);
  }
  if (!res.ok) {
    throw new Error(`USDA API error ${res.status}: ${await res.text()}`);
  }
  return res.json();
}

async function main() {
  let totalUpserted = 0;

  for (const dataType of DATA_TYPES) {
    let pageNumber = 1;
    while (true) {
      console.log(`Fetching ${dataType} page ${pageNumber}...`);
      const foods = await fetchPage(dataType, pageNumber);
      if (foods.length === 0) break;

      const rows = foods.map((food) => ({
        usda_fdc_id: food.fdcId,
        name: food.description,
        category: categoryOf(food),
        source: sourceFor(food.dataType),
        calories_kcal: findNutrient(food.foodNutrients, NUTRIENT_NUMBER.calories),
        protein_g: findNutrient(food.foodNutrients, NUTRIENT_NUMBER.protein),
        carbs_g: findNutrient(food.foodNutrients, NUTRIENT_NUMBER.carbs),
        fat_g: findNutrient(food.foodNutrients, NUTRIENT_NUMBER.fat),
        saturated_fat_g: findNutrient(food.foodNutrients, NUTRIENT_NUMBER.saturatedFat),
        fiber_g: findNutrient(food.foodNutrients, NUTRIENT_NUMBER.fiber),
        sugar_g: findNutrient(food.foodNutrients, NUTRIENT_NUMBER.sugar),
        sodium_mg: findNutrient(food.foodNutrients, NUTRIENT_NUMBER.sodium),
        potassium_mg: findNutrient(food.foodNutrients, NUTRIENT_NUMBER.potassium),
        cholesterol_mg: findNutrient(food.foodNutrients, NUTRIENT_NUMBER.cholesterol),
      }));

      const { error } = await supabase.from("foods").upsert(rows, { onConflict: "usda_fdc_id" });
      if (error) throw error;

      totalUpserted += rows.length;
      console.log(`Upserted ${rows.length} (running total: ${totalUpserted})`);

      if (foods.length < PAGE_SIZE) break;
      pageNumber += 1;
      // Stay well under the 1000 req/hour default USDA rate limit.
      await new Promise((r) => setTimeout(r, 500));
    }
  }

  console.log(`Done. Total foods upserted: ${totalUpserted}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
