// =====================================================
// WHATSAPP BOT Edge Function
// Handles incoming WhatsApp webhook messages
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// =====================================================
// TYPES & INTERFACES
// =====================================================

interface WhatsAppWebhookMessage {
  object: string;
  entry: Array<{
    id: string;
    changes: Array<{
      value: {
        messaging_product: string;
        metadata: {
          display_phone_number: string;
          phone_number_id: string;
        };
        contacts?: Array<{
          profile: {
            name: string;
          };
          wa_id: string;
        }>;
        messages?: Array<{
          from: string;
          id: string;
          timestamp: string;
          text: {
            body: string;
          };
          type: string;
        }>;
      };
      field: string;
    }>;
  }>;
}

interface CustomerOptIn {
  phone: string;
  customer_name: string;
  opted_in: boolean;
  opted_in_at: string;
}

interface OrderStatus {
  reference_number: string;
  date: string;
  total_amount: number;
  status: string;
  items_count: number;
}

interface StockInfo {
  product_name: string;
  sku_code: string;
  size: string;
  color: string;
  available_stock: number;
  location: string;
}

// =====================================================
// INTENT DETECTION
// =====================================================

function detectIntent(message: string): {
  intent: "order_status" | "stock_enquiry" | "help" | "unknown";
  entities: Record<string, any>;
} {
  const lowerMessage = message.toLowerCase().trim();

  // Order status patterns
  const orderPatterns = [
    /order\s*(?:status|track|tracking)?/i,
    /track\s*(?:my)?.*order/i,
    /where\s*is.*order/i,
    /bill\s*(?:number|no)?.*?([a-zA-Z0-9-]+)/i,
    /invoice.*?([a-zA-Z0-9-]+)/i,
  ];

  // Stock enquiry patterns
  const stockPatterns = [
    /stock\s*(?:available|check)?/i,
    /available.*?(?:stock|quantity)/i,
    /do\s*you\s*have/i,
    /in\s*stock/i,
    /(?:size|colour|color).*?available/i,
  ];

  // Check order status
  for (const pattern of orderPatterns) {
    const match = lowerMessage.match(pattern);
    if (match) {
      return {
        intent: "order_status",
        entities: {
          order_number: match[1] || extractOrderNumber(message),
        },
      };
    }
  }

  // Check stock enquiry
  for (const pattern of stockPatterns) {
    if (pattern.test(lowerMessage)) {
      return {
        intent: "stock_enquiry",
        entities: {
          product: extractProductInfo(message),
          size: extractSize(message),
          color: extractColor(message),
        },
      };
    }
  }

  // Help keywords
  if (/help|hi|hello|hey|start/i.test(lowerMessage)) {
    return {
      intent: "help",
      entities: {},
    };
  }

  return {
    intent: "unknown",
    entities: {},
  };
}

function extractOrderNumber(message: string): string | null {
  const patterns = [
    /(?:INV|BILL|ORD)[-\s]?(\d+)/i,
    /\b([A-Z]{2,3}-\d{4}-\d{4})\b/i,
    /\b(\d{4,})\b/,
  ];

  for (const pattern of patterns) {
    const match = message.match(pattern);
    if (match) return match[1] || match[0];
  }

  return null;
}

function extractProductInfo(message: string): string {
  // Extract product keywords
  const products = ["shirt", "jeans", "t-shirt", "tshirt", "trouser", "jacket"];
  const lowerMessage = message.toLowerCase();

  for (const product of products) {
    if (lowerMessage.includes(product)) {
      return product;
    }
  }

  return "";
}

function extractSize(message: string): string | null {
  const sizePattern = /\b(XXS|XS|S|M|L|XL|XXL|XXXL|\d{2,3})\b/i;
  const match = message.match(sizePattern);
  return match ? match[1].toUpperCase() : null;
}

function extractColor(message: string): string | null {
  const colors = [
    "red",
    "blue",
    "black",
    "white",
    "green",
    "yellow",
    "pink",
    "grey",
    "gray",
    "brown",
    "orange",
    "purple",
  ];
  const lowerMessage = message.toLowerCase();

  for (const color of colors) {
    if (lowerMessage.includes(color)) {
      return color.charAt(0).toUpperCase() + color.slice(1);
    }
  }

  return null;
}

// =====================================================
// DATABASE QUERIES
// =====================================================

async function checkCustomerOptIn(
  supabase: any,
  phone: string
): Promise<CustomerOptIn | null> {
  const { data, error } = await supabase
    .from("whatsapp_opt_ins")
    .select("*")
    .eq("phone", phone)
    .eq("opted_in", true)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

async function getOrderStatus(
  supabase: any,
  orderNumber: string,
  customerPhone?: string
): Promise<OrderStatus | null> {
  try {
    // Query event_ledger for sale events matching the reference number
    const { data, error } = await supabase
      .from("event_ledger")
      .select(
        `
        reference_number,
        created_at,
        total_amount,
        metadata
      `
      )
      .eq("event_type", "SALE")
      .ilike("reference_number", `%${orderNumber}%`)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    // Get item count for this order
    const { count } = await supabase
      .from("event_ledger")
      .select("*", { count: "exact", head: true })
      .eq("reference_number", data.reference_number)
      .eq("event_type", "SALE");

    return {
      reference_number: data.reference_number,
      date: new Date(data.created_at).toLocaleDateString("en-IN"),
      total_amount: data.total_amount || 0,
      status: "Completed", // Could be enhanced with order status tracking
      items_count: count || 0,
    };
  } catch (error) {
    console.error("Error fetching order status:", error);
    return null;
  }
}

async function getStockInfo(
  supabase: any,
  filters: { product?: string; size?: string | null; color?: string | null }
): Promise<StockInfo[]> {
  try {
    let query = supabase
      .from("current_stock_view")
      .select(
        `
        product_name,
        sku_code,
        size,
        color,
        current_quantity,
        location_name,
        location_type
      `
      )
      .eq("location_type", "STORE") // Only show store stock to customers
      .gt("current_quantity", 0);

    if (filters.product) {
      query = query.ilike("product_name", `%${filters.product}%`);
    }

    if (filters.size) {
      query = query.eq("size", filters.size);
    }

    if (filters.color) {
      query = query.ilike("color", `%${filters.color}%`);
    }

    const { data, error } = await query.limit(10);

    if (error || !data) {
      return [];
    }

    return data.map((item: any) => ({
      product_name: item.product_name,
      sku_code: item.sku_code,
      size: item.size,
      color: item.color,
      available_stock: item.current_quantity,
      location: item.location_name,
    }));
  } catch (error) {
    console.error("Error fetching stock info:", error);
    return [];
  }
}

// =====================================================
// RESPONSE GENERATION
// =====================================================

function generateHelpMessage(): string {
  return `👋 *Welcome to our Store Assistant!*

I can help you with:

📦 *Order Status*
Send your order/bill number
Example: "Order status INV-2026-0001"

📊 *Stock Availability*
Ask about products in stock
Example: "Red T-shirt M size available?"

Just send me your query and I'll assist you!`;
}

function generateOrderStatusMessage(order: OrderStatus | null): string {
  if (!order) {
    return `❌ Sorry, I couldn't find that order.

Please check:
• Order number is correct
• Order was placed with this phone number

Need help? Visit our store or call us.`;
  }

  return `📦 *Order Status*

*Order:* ${order.reference_number}
*Date:* ${order.date}
*Items:* ${order.items_count}
*Total:* ₹${order.total_amount.toFixed(2)}
*Status:* ✅ ${order.status}

Thank you for shopping with us! 🛍️`;
}

function generateStockMessage(stocks: StockInfo[], filters: any): string {
  if (stocks.length === 0) {
    let message = `❌ Sorry, `;

    if (filters.product) {
      message += `*${filters.product}*`;
    } else {
      message += `that item`;
    }

    if (filters.size) {
      message += ` in size *${filters.size}*`;
    }

    if (filters.color) {
      message += ` in *${filters.color}* color`;
    }

    message += ` is currently out of stock.

Would you like to:
• Check other sizes/colors?
• Get notified when available?

Call us for more details!`;

    return message;
  }

  let message = `✅ *Available Stock*\n\n`;

  stocks.forEach((stock, index) => {
    message += `${index + 1}. *${stock.product_name}*\n`;
    message += `   Size: ${stock.size} | Color: ${stock.color}\n`;
    message += `   SKU: ${stock.sku_code}\n`;
    message += `   Stock: ${stock.available_stock} units\n`;
    message += `   Location: ${stock.location}\n\n`;
  });

  message += `\n🛒 Visit us to purchase!\nCall for more details.`;

  return message;
}

function generateUnknownMessage(): string {
  return `🤔 I didn't quite understand that.

I can help with:
• 📦 Order status - send your bill number
• 📊 Stock check - ask about products

Type *help* to see examples.`;
}

// =====================================================
// WHATSAPP API
// =====================================================

async function sendWhatsAppMessage(
  phoneNumberId: string,
  recipientPhone: string,
  message: string
): Promise<boolean> {
  const accessToken = Deno.env.get("WHATSAPP_ACCESS_TOKEN");

  if (!accessToken) {
    console.error("WHATSAPP_ACCESS_TOKEN not set");
    return false;
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v18.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          recipient_type: "individual",
          to: recipientPhone,
          type: "text",
          text: {
            preview_url: false,
            body: message,
          },
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error("WhatsApp API error:", error);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    return false;
  }
}

// =====================================================
// AUDIT LOGGING
// =====================================================

async function logBotInteraction(
  supabase: any,
  phone: string,
  message: string,
  intent: string,
  response: string
): Promise<void> {
  try {
    await supabase.from("whatsapp_bot_logs").insert({
      phone,
      message,
      intent,
      response,
      processed_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error logging bot interaction:", error);
  }
}

// =====================================================
// MAIN HANDLER
// =====================================================

serve(async (req: Request): Promise<Response> => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  // Handle OPTIONS for CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Handle GET (webhook verification)
  if (req.method === "GET") {
    const url = new URL(req.url);
    const mode = url.searchParams.get("hub.mode");
    const token = url.searchParams.get("hub.verify_token");
    const challenge = url.searchParams.get("hub.challenge");

    const verifyToken = Deno.env.get("WHATSAPP_VERIFY_TOKEN") || "YOUR_VERIFY_TOKEN";

    if (mode === "subscribe" && token === verifyToken) {
      console.log("Webhook verified");
      return new Response(challenge, { status: 200 });
    } else {
      return new Response("Forbidden", { status: 403 });
    }
  }

  // Handle POST (incoming messages)
  if (req.method === "POST") {
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      const payload: WhatsAppWebhookMessage = await req.json();

      // Process webhook
      if (payload.object === "whatsapp_business_account") {
        for (const entry of payload.entry) {
          for (const change of entry.changes) {
            const value = change.value;

            if (value.messages && value.messages.length > 0) {
              for (const message of value.messages) {
                const senderPhone = message.from;
                const messageText = message.text?.body || "";
                const phoneNumberId = value.metadata.phone_number_id;

                console.log(`Message from ${senderPhone}: ${messageText}`);

                // Check opt-in status
                const optIn = await checkCustomerOptIn(supabase, senderPhone);

                if (!optIn) {
                  await sendWhatsAppMessage(
                    phoneNumberId,
                    senderPhone,
                    `❌ You are not opted in to receive messages.

To opt-in, please visit our store or reply with your details.

This service is only for registered customers.`
                  );
                  continue;
                }

                // Detect intent
                const { intent, entities } = detectIntent(messageText);
                let responseMessage = "";

                // Process based on intent
                switch (intent) {
                  case "help":
                    responseMessage = generateHelpMessage();
                    break;

                  case "order_status": {
                    const orderNumber = entities.order_number;
                    if (orderNumber) {
                      const order = await getOrderStatus(
                        supabase,
                        orderNumber,
                        senderPhone
                      );
                      responseMessage = generateOrderStatusMessage(order);
                    } else {
                      responseMessage = `Please provide your order/bill number.

Example: "Order status INV-2026-0001"`;
                    }
                    break;
                  }

                  case "stock_enquiry": {
                    const stocks = await getStockInfo(supabase, entities);
                    responseMessage = generateStockMessage(stocks, entities);
                    break;
                  }

                  default:
                    responseMessage = generateUnknownMessage();
                }

                // Send response
                await sendWhatsAppMessage(phoneNumberId, senderPhone, responseMessage);

                // Log interaction
                await logBotInteraction(
                  supabase,
                  senderPhone,
                  messageText,
                  intent,
                  responseMessage
                );
              }
            }
          }
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      console.error("Error processing webhook:", error);

      return new Response(
        JSON.stringify({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }
  }

  return new Response("Method not allowed", { status: 405 });
});
