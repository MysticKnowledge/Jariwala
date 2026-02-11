/**
 * Waziper WhatsApp API Client - Via Supabase Edge Functions (No CORS!)
 * This client calls Supabase Edge Functions which proxy to Waziper API
 */

import { supabase, isSupabaseConfigured } from '@/app/config/supabase';

const WAZIPER_CONFIG = {
  accessToken: '68f200af61c2c',
  instanceId: '696EEF066DBC0',
  baseUrl: 'https://wapp.synthory.space/api',
};

// Use Edge Functions if Supabase is configured
const USE_EDGE_FUNCTIONS = isSupabaseConfigured;

// Show warning if Supabase not configured
if (!isSupabaseConfigured) {
  console.warn('⚠️ Supabase not configured. Using direct API calls (may have CORS issues).');
  console.warn('📝 To fix: Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to .env');
  console.warn('📚 See /DEPLOY-EDGE-FUNCTIONS.md for setup instructions');
}

// CORS Error constant for clear messaging
const CORS_ERROR_MESSAGE = 'CORS_BLOCKED';

export interface WaziperMessage {
  number: string;
  type: 'text' | 'media';
  message: string;
  media_url?: string;
  filename?: string;
}

export interface WaziperResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  corsBlocked?: boolean;
  data?: any;
}

export interface QRCodeResponse {
  qrcode?: string;
  status?: string;
  authenticated?: boolean;
  corsBlocked?: boolean;
  errorMessage?: string;
}

export interface InstanceStatus {
  connected: boolean;
  authenticated?: boolean;
  phoneNumber?: string;
  battery?: number;
  platform?: string;
  corsBlocked?: boolean;
}

/**
 * Build query string from params
 */
function buildQueryString(params: Record<string, any>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query.append(key, String(value));
    }
  });
  return query.toString();
}

/**
 * Check if error is a CORS error
 */
function isCorsError(error: any): boolean {
  if (!error) return false;
  const errorString = error.toString().toLowerCase();
  return (
    errorString.includes('cors') ||
    errorString.includes('failed to fetch') ||
    errorString.includes('network') ||
    error.name === 'TypeError'
  );
}

/**
 * Send a WhatsApp text message
 */
export async function sendWhatsAppMessage(
  phoneNumber: string,
  message: string
): Promise<WaziperResponse> {
  try {
    if (USE_EDGE_FUNCTIONS) {
      // Call via Supabase Edge Function (no CORS!)
      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          phoneNumber: phoneNumber,
          message: message,
          type: 'text',
        },
      });

      if (error) {
        console.error('Edge Function error:', error);
        return {
          success: false,
          error: error.message || 'Failed to send message',
        };
      }

      return {
        success: data.success,
        messageId: data.messageId,
        data: data.data,
      };
    } else {
      // Direct API call (may have CORS issues)
      return sendWhatsAppMessageDirect(phoneNumber, message);
    }
  } catch (error) {
    console.error('Waziper send error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Direct API call (fallback)
 */
async function sendWhatsAppMessageDirect(
  phoneNumber: string,
  message: string
): Promise<WaziperResponse> {
  try {
    const params = {
      number: phoneNumber,
      type: 'text',
      message: message,
      instance_id: WAZIPER_CONFIG.instanceId,
      access_token: WAZIPER_CONFIG.accessToken,
    };

    const response = await fetch(
      `${WAZIPER_CONFIG.baseUrl}/send?${buildQueryString(params)}`,
      { 
        method: 'POST',
        mode: 'no-cors',
      }
    );

    // Note: no-cors mode means we can't read the response
    // This is a limitation when CORS is not enabled on the API
    return {
      success: true,
      messageId: 'unknown',
    };
  } catch (error) {
    console.error('Direct API error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Send media/file message
 */
export async function sendMediaMessage(
  phoneNumber: string,
  message: string,
  mediaUrl: string,
  filename?: string
): Promise<WaziperResponse> {
  try {
    if (USE_EDGE_FUNCTIONS) {
      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: {
          phoneNumber: phoneNumber,
          message: message,
          type: 'media',
          mediaUrl: mediaUrl,
          filename: filename,
        },
      });

      if (error) {
        return {
          success: false,
          error: error.message || 'Failed to send media',
        };
      }

      return {
        success: data.success,
        data: data.data,
      };
    } else {
      return sendMediaMessageDirect(phoneNumber, message, mediaUrl, filename);
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

async function sendMediaMessageDirect(
  phoneNumber: string,
  message: string,
  mediaUrl: string,
  filename?: string
): Promise<WaziperResponse> {
  try {
    const params = {
      number: phoneNumber,
      type: 'media',
      message: message,
      media_url: mediaUrl,
      filename: filename,
      instance_id: WAZIPER_CONFIG.instanceId,
      access_token: WAZIPER_CONFIG.accessToken,
    };

    const response = await fetch(
      `${WAZIPER_CONFIG.baseUrl}/send?${buildQueryString(params)}`,
      { method: 'POST', mode: 'no-cors' }
    );

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Network error',
    };
  }
}

/**
 * Send broadcast message to multiple recipients
 */
export async function sendBroadcast(
  phoneNumbers: string[],
  message: string
): Promise<{ sent: number; failed: number; errors: any[] }> {
  let sent = 0;
  let failed = 0;
  const errors: any[] = [];

  for (const phoneNumber of phoneNumbers) {
    const result = await sendWhatsAppMessage(phoneNumber, message);
    
    if (result.success) {
      sent++;
    } else {
      failed++;
      errors.push({
        phoneNumber,
        error: result.error,
      });
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 200));
  }

  return { sent, failed, errors };
}

/**
 * Get QR Code for WhatsApp authentication
 */
export async function getQRCode(): Promise<QRCodeResponse> {
  try {
    if (USE_EDGE_FUNCTIONS) {
      // Call via Supabase Edge Function (no CORS!)
      const { data, error } = await supabase.functions.invoke('whatsapp-qrcode', {
        body: {},
      });

      if (error) {
        console.error('Edge Function error:', error);
        return {
          authenticated: false,
          status: 'error',
          errorMessage: error.message,
        };
      }

      return {
        qrcode: data.qrcode,
        status: data.status,
        authenticated: data.authenticated,
      };
    } else {
      return getQRCodeDirect();
    }
  } catch (error) {
    console.error('Failed to get QR code:', error);
    return {
      authenticated: false,
      status: 'error',
      corsBlocked: isCorsError(error),
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function getQRCodeDirect(): Promise<QRCodeResponse> {
  // CORS will block this - return helpful error immediately
  console.warn('⚠️ QR Code requires Supabase Edge Functions to bypass CORS');
  console.warn('📝 See /QUICK-START.md for setup instructions');
  
  return {
    authenticated: false,
    status: 'error',
    corsBlocked: true,
    errorMessage: 'QR Code feature requires Supabase configuration to bypass CORS restrictions. See /QUICK-START.md for setup.',
  };
}

/**
 * Reboot instance (logout and re-scan)
 */
export async function rebootInstance(): Promise<{ success: boolean; corsBlocked?: boolean }> {
  try {
    if (USE_EDGE_FUNCTIONS) {
      const { data, error } = await supabase.functions.invoke('whatsapp-manage', {
        body: { action: 'reboot' },
      });

      return { success: !error && data?.success };
    } else {
      return rebootInstanceDirect();
    }
  } catch (error) {
    return { 
      success: false,
      corsBlocked: isCorsError(error),
    };
  }
}

async function rebootInstanceDirect(): Promise<{ success: boolean; corsBlocked?: boolean }> {
  try {
    const params = {
      instance_id: WAZIPER_CONFIG.instanceId,
      access_token: WAZIPER_CONFIG.accessToken,
    };

    await fetch(
      `${WAZIPER_CONFIG.baseUrl}/reboot?${buildQueryString(params)}`,
      { method: 'POST', mode: 'no-cors' }
    );

    return { success: true };
  } catch (error) {
    return { 
      success: false,
      corsBlocked: isCorsError(error),
    };
  }
}

/**
 * Reconnect to WhatsApp
 */
export async function reconnectInstance(): Promise<{ success: boolean; corsBlocked?: boolean }> {
  try {
    if (USE_EDGE_FUNCTIONS) {
      const { data, error } = await supabase.functions.invoke('whatsapp-manage', {
        body: { action: 'reconnect' },
      });

      return { success: !error && data?.success };
    } else {
      return reconnectInstanceDirect();
    }
  } catch (error) {
    return { 
      success: false,
      corsBlocked: isCorsError(error),
    };
  }
}

async function reconnectInstanceDirect(): Promise<{ success: boolean; corsBlocked?: boolean }> {
  try {
    const params = {
      instance_id: WAZIPER_CONFIG.instanceId,
      access_token: WAZIPER_CONFIG.accessToken,
    };

    await fetch(
      `${WAZIPER_CONFIG.baseUrl}/reconnect?${buildQueryString(params)}`,
      { method: 'POST', mode: 'no-cors' }
    );

    return { success: true };
  } catch (error) {
    return { 
      success: false,
      corsBlocked: isCorsError(error),
    };
  }
}

/**
 * Get instance status (check if authenticated)
 */
export async function getInstanceStatus(): Promise<InstanceStatus> {
  try {
    if (USE_EDGE_FUNCTIONS) {
      const { data, error } = await supabase.functions.invoke('whatsapp-manage', {
        body: { action: 'status' },
      });

      if (error) {
        return { connected: false };
      }

      return {
        connected: data.connected || data.data?.authenticated || false,
        authenticated: data.connected || data.data?.authenticated,
      };
    } else {
      // Can't get status without Edge Functions due to CORS
      return {
        connected: false,
        authenticated: false,
        corsBlocked: true,
      };
    }
  } catch (error) {
    console.error('Failed to get instance status:', error);
    return { 
      connected: false,
      corsBlocked: isCorsError(error),
    };
  }
}

/**
 * Send template message (with variable replacement)
 */
export async function sendTemplate(
  phoneNumber: string,
  templateName: string,
  variables: Record<string, string>
): Promise<WaziperResponse> {
  // Replace variables in template
  let message = getTemplateMessage(templateName);
  
  Object.entries(variables).forEach(([key, value]) => {
    message = message.replace(new RegExp(`{{${key}}}`, 'g'), value);
  });

  return sendWhatsAppMessage(phoneNumber, message);
}

/**
 * Get template message by name
 */
function getTemplateMessage(templateName: string): string {
  const templates: Record<string, string> = {
    'welcome': '🎉 Welcome to our store!\n\nThank you for choosing us. We look forward to serving you!',
    'new-arrival': '🎉 New Arrival Alert!\n\n{{product_name}} now available in store.\n\nPrice: ₹{{price}}\n\nVisit us today!',
    'low-stock': '⚠️ Limited Stock Alert!\n\n{{product_name}} - Only {{quantity}} left.\n\nOrder now before it\'s gone!',
    'order-confirmation': '✅ Order Confirmed!\n\nOrder: {{order_number}}\nAmount: ₹{{amount}}\nDate: {{date}}\n\nThank you for your purchase!',
    'payment-reminder': '💰 Payment Reminder\n\nDear customer,\n\nOutstanding balance: ₹{{amount}}\nDue date: {{due_date}}\n\nPlease make payment at your earliest convenience.\n\nReply HELP for payment options.',
    'order-shipped': '📦 Order Shipped!\n\nYour order {{order_number}} has been shipped!\n\nExpected delivery: {{delivery_date}}\n\nTrack your order: {{tracking_url}}',
    'order-delivered': '✅ Order Delivered!\n\nOrder {{order_number}} has been delivered!\n\nThank you for your business. Reply HELP for support.',
    'exchange-initiated': '🔄 Exchange Request Received\n\nExchange ID: {{exchange_id}}\nOriginal Invoice: {{invoice_number}}\n\nWe will process your exchange request shortly.',
  };

  return templates[templateName] || '';
}

/**
 * Validate phone number format
 */
export function validatePhoneNumber(phone: string): boolean {
  // Should be digits only, 10-15 chars
  return /^\d{10,15}$/.test(phone);
}

/**
 * Format phone number for Waziper
 */
export function formatPhoneNumber(phone: string, countryCode = '91'): string {
  // Remove any non-digit characters
  const cleaned = phone.replace(/\D/g, '');
  
  // If already has country code, return as is
  if (cleaned.length > 10) {
    return cleaned;
  }
  
  // Add country code
  return countryCode + cleaned;
}

/**
 * Test connection to Waziper API
 */
export async function testConnection(): Promise<{
  success: boolean;
  message: string;
  details?: any;
}> {
  try {
    const status = await getInstanceStatus();
    
    if (status.corsBlocked) {
      return {
        success: false,
        message: 'CORS blocked. Setup Supabase Edge Functions to fix.',
        details: status,
      };
    }
    
    if (status.connected) {
      return {
        success: true,
        message: 'Successfully connected to Waziper API via Supabase Edge Functions',
        details: status,
      };
    } else {
      return {
        success: false,
        message: 'Instance not authenticated. Please scan QR code.',
        details: status,
      };
    }
  } catch (error) {
    return {
      success: false,
      message: 'Failed to connect to Waziper API',
      details: error,
    };
  }
}

/**
 * Export configuration for display in UI
 */
export function getWaziperConfig() {
  return {
    instanceId: WAZIPER_CONFIG.instanceId,
    apiUrl: WAZIPER_CONFIG.baseUrl,
    accessToken: WAZIPER_CONFIG.accessToken.substring(0, 6) + '...',
    usingEdgeFunctions: USE_EDGE_FUNCTIONS,
    supabaseConfigured: isSupabaseConfigured,
  };
}

/**
 * Get list of available templates
 */
export function getAvailableTemplates(): Array<{
  name: string;
  label: string;
  variables: string[];
}> {
  return [
    {
      name: 'welcome',
      label: 'Welcome Message',
      variables: [],
    },
    {
      name: 'new-arrival',
      label: 'New Arrival Alert',
      variables: ['product_name', 'price'],
    },
    {
      name: 'low-stock',
      label: 'Low Stock Alert',
      variables: ['product_name', 'quantity'],
    },
    {
      name: 'order-confirmation',
      label: 'Order Confirmation',
      variables: ['order_number', 'amount', 'date'],
    },
    {
      name: 'payment-reminder',
      label: 'Payment Reminder',
      variables: ['amount', 'due_date'],
    },
    {
      name: 'order-shipped',
      label: 'Order Shipped',
      variables: ['order_number', 'delivery_date', 'tracking_url'],
    },
    {
      name: 'order-delivered',
      label: 'Order Delivered',
      variables: ['order_number'],
    },
    {
      name: 'exchange-initiated',
      label: 'Exchange Initiated',
      variables: ['exchange_id', 'invoice_number'],
    },
  ];
}
