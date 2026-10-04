// Supabase Edge Function: downloads a user's uploaded food photo from private
// storage, sends it to a vision model, and returns structured nutrition data.
// Auto-detects whether the photo is a nutrition facts label (OCR it
// precisely) or a plate of food / produce (identify items, estimate macros).
//
// The vision provider/model/key are swappable via env vars only -- see
// ../_shared/vision.ts. No code here needs to change to switch providers.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { analyzeFoodPhoto } from '../_shared/vision.ts'

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ error: 'Missing Authorization header' }, 401)
    }

    const { storagePath } = await req.json()
    if (!storagePath || typeof storagePath !== 'string') {
      return jsonResponse({ error: 'storagePath is required' }, 400)
    }

    // Client scoped to the caller's JWT: RLS ensures they can only read
    // files under their own storage folder and insert their own rows.
    const userClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      global: { headers: { Authorization: authHeader } },
    })

    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser()
    if (userError || !user) {
      return jsonResponse({ error: 'Invalid session' }, 401)
    }
    if (!storagePath.startsWith(`${user.id}/`)) {
      return jsonResponse({ error: 'Forbidden' }, 403)
    }

    const { data: fileBlob, error: downloadError } = await userClient.storage
      .from('food-photos')
      .download(storagePath)
    if (downloadError || !fileBlob) {
      return jsonResponse({ error: `Could not read photo: ${downloadError?.message}` }, 404)
    }

    const mediaType = fileBlob.type || 'image/jpeg'
    const bytes = new Uint8Array(await fileBlob.arrayBuffer())
    const base64 = encodeBase64(bytes)

    let parsed
    try {
      parsed = await analyzeFoodPhoto(base64, mediaType)
    } catch (err) {
      return jsonResponse({ error: `Vision analysis failed: ${err instanceof Error ? err.message : String(err)}` }, 502)
    }

    const { error: insertError } = await userClient.from('photo_scans').insert({
      user_id: user.id,
      storage_path: storagePath,
      scan_type: parsed.scan_type,
      raw_response: parsed,
      parsed_result: parsed,
    })
    if (insertError) {
      console.error('Failed to record photo scan:', insertError)
    }

    return jsonResponse({ result: parsed })
  } catch (err) {
    console.error(err)
    return jsonResponse({ error: String(err) }, 500)
  }
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
  })
}

function encodeBase64(bytes: Uint8Array): string {
  let binary = ''
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunkSize))
  }
  return btoa(binary)
}
