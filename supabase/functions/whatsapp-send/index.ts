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
    const { phoneNumber, message, type = 'text', mediaUrl, filename } = await req.json()

    // Build query params
    const params = new URLSearchParams({
      number: phoneNumber,
      type: type,
      message: message,
      instance_id: WAZIPER_CONFIG.instanceId,
      access_token: WAZIPER_CONFIG.accessToken,
    })

    if (mediaUrl) params.append('media_url', mediaUrl)
    if (filename) params.append('filename', filename)

    // Call Waziper API (server-side, no CORS issues!)
    const response = await fetch(
      `${WAZIPER_CONFIG.baseUrl}/send?${params.toString()}`,
      { method: 'POST' }
    )

    const data = await response.json()

    return new Response(
      JSON.stringify({
        success: response.ok,
        data: data,
        messageId: data.messageId || data.id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      }
    )
  } catch (error) {
    console.error('Error sending WhatsApp message:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to send message',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
