// Supabase Edge Function: downloads a user's uploaded food photo from private
// storage, sends it to Claude's vision API, and returns structured nutrition
// data. Auto-detects whether the photo is a nutrition facts label (OCR it
// precisely) or a plate of food / produce (identify items, estimate macros).
//
// The Anthropic API key lives only here as a Supabase secret -- it is never
// sent to or readable by the browser.
import { createClient } from "npm:@supabase/supabase-js@2";

const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const CLAUDE_MODEL = "claude-sonnet-5";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const NUTRITION_TOOL = {
  name: "report_nutrition",
  description: "Report the nutrition analysis of the photographed item(s).",
  input_schema: {
    type: "object",
    properties: {
      scan_type: {
        type: "string",
        enum: ["label_ocr", "food_vision"],
        description: "'label_ocr' if a printed Nutrition Facts label is visible, otherwise 'food_vision'.",
      },
      serving_description: {
        type: "string",
        description: "The serving size this analysis is based on, e.g. '1 cup (240g)' or 'estimated 150g portion'.",
      },
      items: {
        type: "array",
        description: "One entry per distinct food identified (usually one for a label, possibly several for a plate).",
        items: {
          type: "object",
          properties: {
            name: { type: "string" },
            estimated_grams: { type: "number" },
            calories_kcal: { type: "number" },
            protein_g: { type: "number" },
            carbs_g: { type: "number" },
            fat_g: { type: "number" },
            fiber_g: { type: "number" },
            sugar_g: { type: "number" },
            sodium_mg: { type: "number" },
          },
          required: ["name", "estimated_grams", "calories_kcal", "protein_g", "carbs_g", "fat_g"],
        },
      },
      confidence: {
        type: "string",
        enum: ["high", "medium", "low"],
        description: "'high' for a clearly read label, 'low' for a rough visual estimate.",
      },
      notes: { type: "string", description: "Any caveats, e.g. assumptions made about portion size." },
    },
    required: ["scan_type", "items", "confidence"],
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header" }, 401);
    }

    const { storagePath } = await req.json();
    if (!storagePath || typeof storagePath !== "string") {
      return jsonResponse({ error: "storagePath is required" }, 400);
    }

    // Client scoped to the caller's JWT: RLS ensures they can only read
    // files under their own storage folder and insert their own rows.
    const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      return jsonResponse({ error: "Invalid session" }, 401);
    }
    if (!storagePath.startsWith(`${user.id}/`)) {
      return jsonResponse({ error: "Forbidden" }, 403);
    }

    const { data: fileBlob, error: downloadError } = await userClient.storage
      .from("food-photos")
      .download(storagePath);
    if (downloadError || !fileBlob) {
      return jsonResponse({ error: `Could not read photo: ${downloadError?.message}` }, 404);
    }

    const mediaType = fileBlob.type || "image/jpeg";
    const bytes = new Uint8Array(await fileBlob.arrayBuffer());
    const base64 = encodeBase64(bytes);

    const anthropicRes = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: CLAUDE_MODEL,
        max_tokens: 1024,
        tools: [NUTRITION_TOOL],
        tool_choice: { type: "tool", name: "report_nutrition" },
        messages: [
          {
            role: "user",
            content: [
              {
                type: "image",
                source: { type: "base64", media_type: mediaType, data: base64 },
              },
              {
                type: "text",
                text:
                  "Look at this photo. If it shows a printed Nutrition Facts label, read it precisely " +
                  "(scan_type='label_ocr') and report the exact values and serving size printed on it. " +
                  "Otherwise, it shows food itself (a plate, produce, a container) -- identify each distinct " +
                  "food item, estimate its portion size in grams, and estimate its nutrition from your own " +
                  "knowledge (scan_type='food_vision'). Always call report_nutrition with your findings.",
              },
            ],
          },
        ],
      }),
    });

    if (!anthropicRes.ok) {
      const errText = await anthropicRes.text();
      return jsonResponse({ error: `Claude API error: ${errText}` }, 502);
    }

    const anthropicData = await anthropicRes.json();
    const toolUse = anthropicData.content?.find((block: { type: string }) => block.type === "tool_use");
    if (!toolUse) {
      return jsonResponse({ error: "Model did not return structured nutrition data" }, 502);
    }

    const parsed = toolUse.input;

    const { error: insertError } = await userClient.from("photo_scans").insert({
      user_id: user.id,
      storage_path: storagePath,
      scan_type: parsed.scan_type,
      raw_response: anthropicData,
      parsed_result: parsed,
    });
    if (insertError) {
      console.error("Failed to record photo scan:", insertError);
    }

    return jsonResponse({ result: parsed });
  } catch (err) {
    console.error(err);
    return jsonResponse({ error: String(err) }, 500);
  }
});

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "content-type": "application/json" },
  });
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
}
