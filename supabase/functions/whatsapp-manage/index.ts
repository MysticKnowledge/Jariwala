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
    const { action } = await req.json()

    let endpoint = ''
    
    switch (action) {
      case 'status':
        // Get QR code to check status (if authenticated, won't return QR)
        const params = new URLSearchParams({
          instance_id: WAZIPER_CONFIG.instanceId,
          access_token: WAZIPER_CONFIG.accessToken,
        })
        endpoint = `get_qrcode?${params.toString()}`
        break
        
      case 'reboot':
        const rebootParams = new URLSearchParams({
          instance_id: WAZIPER_CONFIG.instanceId,
          access_token: WAZIPER_CONFIG.accessToken,
        })
        endpoint = `reboot?${rebootParams.toString()}`
        break
        
      case 'reconnect':
        const reconnectParams = new URLSearchParams({
          instance_id: WAZIPER_CONFIG.instanceId,
          access_token: WAZIPER_CONFIG.accessToken,
        })
        endpoint = `reconnect?${reconnectParams.toString()}`
        break
        
      default:
        throw new Error('Invalid action')
    }

    const response = await fetch(
      `${WAZIPER_CONFIG.baseUrl}/${endpoint}`,
      { method: 'POST' }
    )

    const data = await response.json()

    return new Response(
      JSON.stringify({
        success: response.ok,
        data: data,
        connected: data.authenticated || data.connected || false,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: response.status,
      }
    )
  } catch (error) {
    console.error('Error managing instance:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to manage instance',
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
