-- Small local-dev sample so the food search UI has something to show before
-- the real USDA ingestion (npm run ingest:usda) is run against a live key.
insert into public.foods (name, category, source, calories_kcal, protein_g, carbs_g, fat_g, fiber_g, sugar_g, sodium_mg)
values
  ('Broccoli, raw', 'Vegetables', 'usda_foundation', 34, 2.8, 6.6, 0.4, 2.6, 1.7, 33),
  ('Spinach, raw', 'Vegetables', 'usda_foundation', 23, 2.9, 3.6, 0.4, 2.2, 0.4, 79),
  ('Chicken breast, grilled', 'Protein', 'usda_sr_legacy', 165, 31, 0, 3.6, 0, 0, 74),
  ('Brown rice, cooked', 'Grains', 'usda_sr_legacy', 112, 2.3, 23.5, 0.8, 1.8, 0.4, 5),
  ('Banana, raw', 'Fruits', 'usda_foundation', 89, 1.1, 22.8, 0.3, 2.6, 12.2, 1),
  ('Egg, whole, cooked', 'Protein', 'usda_sr_legacy', 155, 13, 1.1, 11, 0, 1.1, 124),
  ('Almonds, raw', 'Nuts & Seeds', 'usda_foundation', 579, 21.2, 21.6, 49.9, 12.5, 4.4, 1),
  ('Greek yogurt, plain', 'Dairy', 'usda_sr_legacy', 59, 10, 3.6, 0.4, 0, 3.6, 36);
