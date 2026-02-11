# WhatsApp Bot Edge Function

## Overview

Automated WhatsApp customer support bot for retail inventory system. Handles order status inquiries and stock availability checks for opted-in customers only.

## Features

✅ **Order Status Lookup** - Track orders by bill number  
✅ **Stock Availability** - Check product stock in real-time  
✅ **Intent Detection** - Natural language understanding  
✅ **Opt-in Verification** - Only responds to registered customers  
✅ **No Persistent Sessions** - Stateless, privacy-focused  
✅ **No Bulk Messaging** - Responds only to incoming messages  

## Setup

### 1. WhatsApp Business API Setup

1. Create Facebook Business Account
2. Set up WhatsApp Business API
3. Get Access Token and Phone Number ID
4. Configure webhook URL: `https://your-project.supabase.co/functions/v1/whatsapp_bot`

### 2. Environment Variables

```bash
# Set in Supabase
supabase secrets set WHATSAPP_ACCESS_TOKEN="your-access-token"
supabase secrets set WHATSAPP_VERIFY_TOKEN="your-verify-token"
```

### 3. Webhook Verification

WhatsApp will send GET request for verification:

```
GET /functions/v1/whatsapp_bot?hub.mode=subscribe&hub.verify_token=YOUR_TOKEN&hub.challenge=CHALLENGE
```

Bot will respond with challenge if token matches.

## Intents & Responses

### 1. Order Status

**Customer**: "Where is my order INV-2026-0001?"  
**Bot**: 
```
📦 *Order Status*

*Order:* INV-2026-0001
*Date:* 30/01/2026
*Items:* 3
*Total:* ₹2,495.00
*Status:* ✅ Completed

Thank you for shopping with us! 🛍️
```

**Patterns**:
- "order status"
- "track my order"
- "where is my order"
- "bill number INV-001"

### 2. Stock Enquiry

**Customer**: "Do you have Red T-Shirt size M?"  
**Bot**:
```
✅ *Available Stock*

1. *Cotton T-Shirt*
   Size: M | Color: Red
   SKU: TS-RED-M
   Stock: 27 units
   Location: Main Store Mumbai

🛒 Visit us to purchase!
Call for more details.
```

**Patterns**:
- "stock available"
- "do you have"
- "in stock"
- "size M available"

### 3. Help

**Customer**: "Hi" or "Help"  
**Bot**:
```
👋 *Welcome to our Store Assistant!*

I can help you with:

📦 *Order Status*
Send your order/bill number
Example: "Order status INV-2026-0001"

📊 *Stock Availability*
Ask about products in stock
Example: "Red T-shirt M size available?"

Just send me your query and I'll assist you!
```

### 4. Unknown Intent

**Customer**: "random message"  
**Bot**:
```
🤔 I didn't quite understand that.

I can help with:
• 📦 Order status - send your bill number
• 📊 Stock check - ask about products

Type *help* to see examples.
```

## Customer Opt-in Management

### Add Customer to Opt-in List

```sql
INSERT INTO whatsapp_opt_ins (phone, customer_name, opted_in)
VALUES ('+919876543210', 'John Doe', true);
```

### Check Opt-in Status

```sql
SELECT * FROM whatsapp_opt_ins
WHERE phone = '+919876543210' AND opted_in = true;
```

### Opt-out Customer

```sql
UPDATE whatsapp_opt_ins
SET opted_in = false, opted_out_at = NOW()
WHERE phone = '+919876543210';
```

## Testing

### Webhook Verification (GET)

```bash
curl "https://your-project.supabase.co/functions/v1/whatsapp_bot?hub.mode=subscribe&hub.verify_token=YOUR_VERIFY_TOKEN&hub.challenge=CHALLENGE_STRING"

# Expected: CHALLENGE_STRING
```

### Incoming Message (POST)

```bash
curl -X POST https://your-project.supabase.co/functions/v1/whatsapp_bot \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
      "changes": [{
        "value": {
          "messaging_product": "whatsapp",
          "metadata": {
            "display_phone_number": "15550000000",
            "phone_number_id": "123456789"
          },
          "messages": [{
            "from": "+919876543210",
            "id": "wamid.xxxxx",
            "timestamp": "1706606400",
            "type": "text",
            "text": {
              "body": "Order status INV-2026-0001"
            }
          }]
        },
        "field": "messages"
      }]
    }]
  }'
```

## Intent Detection Logic

### Order Status Extraction

```typescript
// Patterns
/order\s*(?:status|track|tracking)?/i
/track\s*(?:my)?.*order/i
/where\s*is.*order/i
/bill\s*(?:number|no)?.*?([a-zA-Z0-9-]+)/i
/invoice.*?([a-zA-Z0-9-]+)/i

// Examples
"order status INV-2026-0001" → order_number: "INV-2026-0001"
"track my order BILL-123" → order_number: "BILL-123"
"where is order 12345" → order_number: "12345"
```

### Product Information Extraction

```typescript
// Size extraction
/\b(XXS|XS|S|M|L|XL|XXL|XXXL|\d{2,3})\b/i

// Color extraction
["red", "blue", "black", "white", "green", "yellow", ...]

// Product keywords
["shirt", "jeans", "t-shirt", "tshirt", "trouser", "jacket"]

// Example
"Red T-shirt M size available?" 
  → product: "t-shirt", color: "Red", size: "M"
```

## Database Queries

### Order Status Query

```sql
SELECT 
  reference_number,
  created_at,
  total_amount,
  metadata
FROM event_ledger
WHERE event_type = 'SALE'
  AND reference_number ILIKE '%INV-2026-0001%'
ORDER BY created_at DESC
LIMIT 1;
```

### Stock Availability Query

```sql
SELECT 
  product_name,
  sku_code,
  size,
  color,
  current_quantity,
  location_name
FROM current_stock_view
WHERE location_type = 'STORE'
  AND product_name ILIKE '%t-shirt%'
  AND size = 'M'
  AND color ILIKE '%red%'
  AND current_quantity > 0
LIMIT 10;
```

## Logging

All interactions are logged to `whatsapp_bot_logs`:

```sql
SELECT 
  phone,
  message,
  intent,
  response,
  processed_at
FROM whatsapp_bot_logs
WHERE phone = '+919876543210'
ORDER BY processed_at DESC
LIMIT 10;
```

## Security & Privacy

✅ **Opt-in Required** - Only responds to registered customers  
✅ **No Data Storage** - Stateless, no conversation history  
✅ **Phone Validation** - E.164 format required  
✅ **Rate Limiting** - WhatsApp API enforced  
✅ **No Bulk Messaging** - Responds only to incoming messages  
✅ **PII Protection** - Customer data access via RLS  

## Error Handling

### Customer Not Opted In

```
❌ You are not opted in to receive messages.

To opt-in, please visit our store or reply with your details.

This service is only for registered customers.
```

### Order Not Found

```
❌ Sorry, I couldn't find that order.

Please check:
• Order number is correct
• Order was placed with this phone number

Need help? Visit our store or call us.
```

### No Stock Available

```
❌ Sorry, Red T-Shirt in size M in Red color is currently out of stock.

Would you like to:
• Check other sizes/colors?
• Get notified when available?

Call us for more details!
```

## Monitoring

### Check Bot Activity

```sql
-- Messages processed today
SELECT COUNT(*) FROM whatsapp_bot_logs
WHERE processed_at::date = CURRENT_DATE;

-- Intent breakdown
SELECT intent, COUNT(*) as count
FROM whatsapp_bot_logs
WHERE processed_at >= CURRENT_DATE - INTERVAL '7 days'
GROUP BY intent
ORDER BY count DESC;

-- Top customers
SELECT phone, COUNT(*) as interactions
FROM whatsapp_bot_logs
WHERE processed_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY phone
ORDER BY interactions DESC
LIMIT 10;
```

### View Logs

```bash
supabase functions logs whatsapp_bot --tail
```

## Limitations

❌ **No Conversations** - Each message is independent  
❌ **No Media** - Text-only responses  
❌ **No Proactive Messages** - Only responds to incoming  
❌ **No Order Placement** - Information only  
❌ **No Payment Links** - Not a commerce bot  

## Future Enhancements

- [ ] Product catalog with images
- [ ] Order placement via WhatsApp
- [ ] Payment integration
- [ ] Delivery tracking
- [ ] Product recommendations
- [ ] Multi-language support
- [ ] Voice message support
- [ ] Interactive buttons/menus

## Troubleshooting

### Bot not responding

1. Check webhook is configured correctly
2. Verify access token is valid
3. Check customer is opted in
4. View function logs for errors

### Incorrect intent detection

1. Review message pattern in logs
2. Add more keywords to patterns
3. Improve extraction logic
4. Test with variations

### Order not found

1. Verify order exists in event_ledger
2. Check reference_number format
3. Ensure customer has access (RLS)
4. Check order was a SALE event

## Support

WhatsApp Business API documentation:
https://developers.facebook.com/docs/whatsapp

Supabase Edge Functions:
https://supabase.com/docs/guides/functions

## License

Part of retail inventory system - internal use only
