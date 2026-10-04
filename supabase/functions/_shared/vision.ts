// Swappable vision-model client. Talks to any OpenAI-compatible
// /chat/completions endpoint, so the active provider/model is just
// configuration -- no code change needed to switch:
//
//   VISION_API_BASE_URL  e.g. https://openrouter.ai/api/v1 (default)
//   VISION_API_KEY       provider API key
//   VISION_MODEL         e.g. qwen/qwen2.5-vl-72b-instruct:free (default)
//
// Any OpenAI-compatible host works here: OpenRouter, Together.ai,
// Fireworks, a local Ollama/vLLM/LM Studio server, etc. To point at a
// paid provider (e.g. OpenAI, Anthropic via a compatibility proxy)
// later, just change these three env vars -- this file doesn't change.

const VISION_API_BASE_URL = Deno.env.get('VISION_API_BASE_URL') ?? 'https://openrouter.ai/api/v1'
const VISION_API_KEY = Deno.env.get('VISION_API_KEY') ?? ''
const VISION_MODEL = Deno.env.get('VISION_MODEL') ?? 'qwen/qwen2.5-vl-72b-instruct:free'

export interface AnalysisItem {
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

export interface AnalysisResult {
  scan_type: 'label_ocr' | 'food_vision'
  serving_description?: string
  items: AnalysisItem[]
  confidence: 'high' | 'medium' | 'low'
  notes?: string
}

const SYSTEM_PROMPT = `You are a nutrition-label reader and food-recognition assistant.
Look at the photo you are given and respond with ONLY a single JSON object (no markdown
fences, no commentary) matching exactly this shape:

{
  "scan_type": "label_ocr" | "food_vision",
  "serving_description": string,
  "items": [
    {
      "name": string,
      "estimated_grams": number,
      "calories_kcal": number,
      "protein_g": number,
      "carbs_g": number,
      "fat_g": number,
      "fiber_g": number,
      "sugar_g": number,
      "sodium_mg": number
    }
  ],
  "confidence": "high" | "medium" | "low",
  "notes": string
}

Rules:
- If a printed Nutrition Facts label is visible, set scan_type to "label_ocr", read the exact
  values and serving size printed on it, and use confidence "high" (or "medium" if partially
  obscured/blurry).
- Otherwise the photo shows food itself (a plate, produce, a container) -- set scan_type to
  "food_vision", identify each distinct food item, estimate its portion size in grams, and
  estimate its nutrition from your own knowledge. Use confidence "low" or "medium" since this
  is a visual estimate.
- items must have at least one entry.
- Output raw JSON only -- it will be parsed directly.`

function extractJson(text: string): unknown {
  try {
    return JSON.parse(text)
  } catch {
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error(`Model response was not valid JSON: ${text.slice(0, 500)}`)
    return JSON.parse(match[0])
  }
}

export async function analyzeFoodPhoto(base64Image: string, mediaType: string): Promise<AnalysisResult> {
  if (!VISION_API_KEY) {
    throw new Error('VISION_API_KEY is not set (see supabase secrets set VISION_API_KEY=...)')
  }

  const res = await fetch(`${VISION_API_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${VISION_API_KEY}`,
    },
    body: JSON.stringify({
      model: VISION_MODEL,
      response_format: { type: 'json_object' },
      max_tokens: 1024,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mediaType};base64,${base64Image}` } },
            { type: 'text', text: 'Analyze this photo and return the JSON object described in your instructions.' },
          ],
        },
      ],
    }),
  })

  if (!res.ok) {
    throw new Error(`Vision API error (${res.status}): ${await res.text()}`)
  }

  const data = await res.json()
  const content = data.choices?.[0]?.message?.content
  if (!content) {
    throw new Error(`Vision API returned no content: ${JSON.stringify(data).slice(0, 500)}`)
  }

  const parsed = extractJson(content) as AnalysisResult
  if (!parsed.items || parsed.items.length === 0) {
    throw new Error('Model did not return any food items')
  }
  return parsed
}
