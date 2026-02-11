// =====================================================
// WAZIPER WHATSAPP BOT - Edge Function
// Webhook receiver for Waziper WhatsApp Business API
// =====================================================

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface WaziperMessage {
  id: string;
  from: string;
  to: string;
  type: 'text' | 'image' | 'video' | 'document' | 'audio';
  timestamp: number;
  text?: {
    body: string;
  };
  name?: string;
}

interface WaziperWebhook {
  event: 'message' | 'status';
  instance_id: string;
  data: {
    key: {
      remoteJid: string;
      fromMe: boolean;
      id: string;
    };
    message?: {
      conversation?: string;
      extendedTextMessage?: {
        text: string;
      };
    };
    pushName?: string;
    messageTimestamp?: number;
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const waziperToken = Deno.env.get('WAZIPER_API_TOKEN')!;
    const waziperInstanceId = Deno.env.get('WAZIPER_INSTANCE_ID')!;

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Webhook verification (GET request)
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const challenge = url.searchParams.get('hub.challenge');
      const verify_token = url.searchParams.get('hub.verify_token');

      if (verify_token === waziperToken) {
        return new Response(challenge, { 
          headers: { ...corsHeaders, 'Content-Type': 'text/plain' } 
        });
      }

      return new Response('Invalid verification token', { 
        status: 403,
        headers: corsHeaders 
      });
    }

    // Handle incoming webhook (POST request)
    if (req.method === 'POST') {
      const webhook: WaziperWebhook = await req.json();

      console.log('Waziper webhook received:', JSON.stringify(webhook, null, 2));

      // Only process incoming messages (not sent by us)
      if (webhook.event !== 'message' || webhook.data.key.fromMe) {
        return new Response(JSON.stringify({ success: true, message: 'Ignored' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Extract message details
      const phoneNumber = webhook.data.key.remoteJid.replace('@s.whatsapp.net', '');
      const messageText = webhook.data.message?.conversation || 
                         webhook.data.message?.extendedTextMessage?.text || 
                         '';
      const senderName = webhook.data.pushName || 'Customer';

      if (!messageText.trim()) {
        return new Response(JSON.stringify({ success: true, message: 'Empty message' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Check if user has opted in
      const { data: optInData, error: optInError } = await supabase
        .from('whatsapp_opt_ins')
        .select('*')
        .eq('phone_number', phoneNumber)
        .eq('opted_in', true)
        .single();

      if (optInError || !optInData) {
        console.log(`User ${phoneNumber} not opted in`);
        
        // Check if message is opt-in request
        const lowerMessage = messageText.toLowerCase().trim();
        if (lowerMessage === 'start' || lowerMessage === 'subscribe' || lowerMessage === 'optin') {
          // Create opt-in
          await supabase.from('whatsapp_opt_ins').upsert({
            phone_number: phoneNumber,
            customer_name: senderName,
            opted_in: true,
            opted_in_at: new Date().toISOString(),
          });

          await sendWaziperMessage(
            phoneNumber,
            `Welcome to our store! 🛍️\n\nYou're now subscribed to order updates.\n\nYou can:\n• Check order status: "ORDER <number>"\n• Check stock: "STOCK <product name>"\n• Get help: "HELP"\n\nSend STOP to unsubscribe anytime.`,
            waziperToken,
            waziperInstanceId
          );

          return new Response(JSON.stringify({ success: true, message: 'Opt-in processed' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }

        // User not opted in and not requesting opt-in
        return new Response(JSON.stringify({ success: true, message: 'User not opted in' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Handle opt-out
      const lowerMessage = messageText.toLowerCase().trim();
      if (lowerMessage === 'stop' || lowerMessage === 'unsubscribe' || lowerMessage === 'optout') {
        await supabase
          .from('whatsapp_opt_ins')
          .update({ 
            opted_in: false,
            opted_out_at: new Date().toISOString(),
          })
          .eq('phone_number', phoneNumber);

        await sendWaziperMessage(
          phoneNumber,
          'You have been unsubscribed from our WhatsApp updates. Send START to subscribe again.',
          waziperToken,
          waziperInstanceId
        );

        return new Response(JSON.stringify({ success: true, message: 'Opt-out processed' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Process customer query
      const response = await processCustomerQuery(messageText, phoneNumber, supabase);

      // Send response via Waziper
      await sendWaziperMessage(phoneNumber, response, waziperToken, waziperInstanceId);

      // Log interaction
      await supabase.from('audit_log').insert({
        action: 'WHATSAPP_MESSAGE',
        table_name: 'whatsapp_opt_ins',
        performed_by: phoneNumber,
        details: {
          message: messageText,
          response: response,
          sender_name: senderName,
        },
      });

      return new Response(JSON.stringify({ success: true, message: 'Response sent' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response('Method not allowed', { 
      status: 405,
      headers: corsHeaders 
    });

  } catch (error) {
    console.error('Error in Waziper webhook:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});

// =====================================================
// HELPER FUNCTIONS
// =====================================================

async function processCustomerQuery(message: string, phoneNumber: string, supabase: any): Promise<string> {
  const lowerMessage = message.toLowerCase().trim();

  // Help command
  if (lowerMessage === 'help' || lowerMessage === 'menu') {
    return `📱 *Available Commands*\n\n` +
           `🔹 *ORDER <number>* - Check order status\n` +
           `   Example: ORDER INV-2026-0125\n\n` +
           `🔹 *STOCK <product>* - Check product availability\n` +
           `   Example: STOCK Cotton T-Shirt\n\n` +
           `🔹 *HELP* - Show this menu\n` +
           `🔹 *STOP* - Unsubscribe from updates\n\n` +
           `Need more help? Call us at +91-XXXXXXXXXX`;
  }

  // Order status query
  if (lowerMessage.startsWith('order ')) {
    const orderNumber = message.substring(6).trim().toUpperCase();
    return await getOrderStatus(orderNumber, phoneNumber, supabase);
  }

  // Stock inquiry
  if (lowerMessage.startsWith('stock ')) {
    const productName = message.substring(6).trim();
    return await getStockInfo(productName, supabase);
  }

  // Default response
  return `Hi! 👋\n\n` +
         `I can help you with:\n` +
         `• Order status updates\n` +
         `• Product stock availability\n\n` +
         `Send *HELP* to see all commands.`;
}

async function getOrderStatus(orderNumber: string, phoneNumber: string, supabase: any): Promise<string> {
  try {
    // Find order in customer_ledger
    const { data: orderData, error } = await supabase
      .from('customer_ledger')
      .select(`
        *,
        customer_profiles (full_name, phone)
      `)
      .eq('reference_number', orderNumber)
      .single();

    if (error || !orderData) {
      return `❌ Order ${orderNumber} not found.\n\nPlease check the order number and try again.`;
    }

    // Verify customer owns this order
    if (orderData.customer_profiles?.phone !== phoneNumber) {
      return `❌ This order doesn't belong to your registered phone number.`;
    }

    // Get order details from event_ledger
    const { data: events } = await supabase
      .from('event_ledger')
      .select(`
        *,
        variants (
          product_id,
          size,
          color,
          products (name)
        )
      `)
      .eq('reference_number', orderNumber)
      .eq('event_type', 'SALE');

    if (!events || events.length === 0) {
      return `❌ Order details not found for ${orderNumber}.`;
    }

    // Build response
    let response = `✅ *Order Status: ${orderNumber}*\n\n`;
    response += `Customer: ${orderData.customer_profiles?.full_name || 'N/A'}\n`;
    response += `Date: ${new Date(events[0].created_at).toLocaleDateString('en-IN')}\n`;
    response += `Total Amount: ₹${Math.abs(orderData.credit_amount).toFixed(2)}\n`;
    response += `Balance: ₹${orderData.balance.toFixed(2)}\n\n`;
    
    if (orderData.balance > 0) {
      response += `⚠️ *Outstanding Balance: ₹${orderData.balance.toFixed(2)}*\n\n`;
    } else {
      response += `✅ *Fully Paid*\n\n`;
    }

    response += `*Items:*\n`;
    events.forEach((event: any, index: number) => {
      const product = event.variants?.products?.name || 'Unknown';
      const size = event.variants?.size || '';
      const qty = Math.abs(event.quantity);
      response += `${index + 1}. ${product} (${size}) × ${qty}\n`;
    });

    response += `\n_Need help? Reply HELP_`;

    return response;

  } catch (error) {
    console.error('Error fetching order:', error);
    return `❌ Error fetching order details. Please try again later.`;
  }
}

async function getStockInfo(productName: string, supabase: any): Promise<string> {
  try {
    // Search for product
    const { data: products, error } = await supabase
      .from('products')
      .select('id, name, category')
      .ilike('name', `%${productName}%`)
      .limit(5);

    if (error || !products || products.length === 0) {
      return `❌ No products found matching "${productName}".\n\nTry searching with different keywords.`;
    }

    if (products.length > 1) {
      let response = `Found ${products.length} products:\n\n`;
      products.forEach((p: any, i: number) => {
        response += `${i + 1}. ${p.name} (${p.category})\n`;
      });
      response += `\nPlease be more specific in your search.`;
      return response;
    }

    // Get stock for all variants
    const { data: variants } = await supabase
      .from('current_stock_view')
      .select(`
        variant_id,
        location_name,
        current_quantity,
        variants (size, color, selling_price)
      `)
      .eq('variants.product_id', products[0].id)
      .gt('current_quantity', 0);

    if (!variants || variants.length === 0) {
      return `❌ *${products[0].name}* is currently out of stock.\n\nCheck back soon or call us for availability.`;
    }

    let response = `✅ *${products[0].name}*\n\n`;
    response += `*Available Stock:*\n\n`;

    // Group by location
    const locationGroups: any = {};
    variants.forEach((v: any) => {
      if (!locationGroups[v.location_name]) {
        locationGroups[v.location_name] = [];
      }
      locationGroups[v.location_name].push(v);
    });

    Object.keys(locationGroups).forEach((location) => {
      response += `📍 *${location}*\n`;
      locationGroups[location].forEach((v: any) => {
        response += `  • Size ${v.variants.size} (${v.variants.color}) - ${v.current_quantity} pcs - ₹${v.variants.selling_price}\n`;
      });
      response += `\n`;
    });

    response += `_Visit our store or order online!_`;

    return response;

  } catch (error) {
    console.error('Error fetching stock:', error);
    return `❌ Error fetching stock information. Please try again later.`;
  }
}

async function sendWaziperMessage(
  phoneNumber: string,
  message: string,
  apiToken: string,
  instanceId: string
): Promise<void> {
  try {
    const waziperApiUrl = `https://api.waziper.com/v1/messages/text`;

    const response = await fetch(waziperApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instance_id: instanceId,
        to: `${phoneNumber}@s.whatsapp.net`,
        message: message,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Waziper API error:', errorText);
      throw new Error(`Waziper API error: ${response.status}`);
    }

    console.log(`Message sent to ${phoneNumber} via Waziper`);
  } catch (error) {
    console.error('Error sending Waziper message:', error);
    throw error;
  }
}
