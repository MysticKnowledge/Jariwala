import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { corsHeaders } from '../_shared/cors.ts'

const WAZIPER_CONFIG = {
  accessToken: '68f200af61c2c',
  instanceId: '696EEF066DBC0',
  baseUrl: 'https://wapp.synthory.space/api',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Build query params
    const params = new URLSearchParams({
      instance_id: WAZIPER_CONFIG.instanceId,
      access_token: WAZIPER_CONFIG.accessToken,
    })

    // Call Waziper API to get QR code
    const response = await fetch(
      `${WAZIPER_CONFIG.baseUrl}/get_qrcode?${params.toString()}`,
      { method: 'POST' }
    )

    const data = await response.json()

    return new Response(
      JSON.stringify({
        success: response.ok,
        qrcode: data.qrcode || data.qr_code || data.qr,
        status: data.status,
        authenticated: data.authenticated || data.connected,
        data: data,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      }
    )
  } catch (error) {
    console.error('Error getting QR code:', error)
    return new Response(
      JSON.stringify({
        success: false,
        authenticated: false,
        error: error.message || 'Failed to get QR code',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
