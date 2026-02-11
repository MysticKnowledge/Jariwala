# 📱 Waziper WhatsApp Bot Setup Guide

Complete guide to integrate Waziper WhatsApp Business API with your retail system.

## 🎯 Overview

Waziper provides a robust WhatsApp Business API that allows:
- ✅ Automated order status updates
- ✅ Stock inquiries
- ✅ Customer opt-in/opt-out management
- ✅ Message templates
- ✅ Rich media support (images, documents)

## 📋 Prerequisites

1. **Waziper Account**
   - Sign up at [waziper.com](https://waziper.com)
   - Verify your business
   - Get WhatsApp Business API approval

2. **Phone Number**
   - Dedicated business phone number
   - Not used on regular WhatsApp
   - Verified on Waziper platform

## 🚀 Step 1: Waziper Panel Setup

### 1.1 Create Instance

1. Login to [Waziper Dashboard](https://panel.waziper.com)
2. Go to **Instances** → **Create New Instance**
3. Select **WhatsApp Business API**
4. Name your instance (e.g., "RetailStore")
5. Connect your phone number

### 1.2 Get API Credentials

1. Go to **Settings** → **API Tokens**
2. Create a new API token
3. Copy and save:
   - `API Token` (Bearer token)
   - `Instance ID` (your instance identifier)

### 1.3 Configure Webhook

1. Go to **Webhooks** → **Configure**
2. Set webhook URL:
   ```
   https://YOUR-PROJECT.supabase.co/functions/v1/waziper-webhook
   ```
3. Enable events:
   - ✅ Messages
   - ✅ Status updates
4. Set verification token: `your-secret-token-here`
5. Save configuration

## 🔧 Step 2: Supabase Configuration

### 2.1 Set Environment Variables

```bash
# Add to Supabase Edge Function secrets
supabase secrets set WAZIPER_API_TOKEN="your-waziper-api-token"
supabase secrets set WAZIPER_INSTANCE_ID="your-instance-id"
supabase secrets set WAZIPER_VERIFY_TOKEN="your-verification-token"
```

### 2.2 Deploy Edge Function

```bash
# Deploy the Waziper webhook function
supabase functions deploy waziper-webhook

# Verify deployment
supabase functions list
```

### 2.3 Test Webhook

```bash
# Test webhook endpoint
curl -X GET "https://YOUR-PROJECT.supabase.co/functions/v1/waziper-webhook?hub.challenge=test&hub.verify_token=your-verification-token"

# Should return: "test"
```

## 📱 Step 3: Message Templates (Optional)

Create message templates in Waziper Dashboard for:

### Template 1: Welcome Message
```
Name: welcome_message
Category: MARKETING
Language: English

Body:
Welcome to {{store_name}}! 🛍️

You're now subscribed to order updates.

You can:
• Check order status: "ORDER <number>"
• Check stock: "STOCK <product>"
• Get help: "HELP"

Send STOP to unsubscribe.
```

### Template 2: Order Confirmation
```
Name: order_confirmation
Category: TRANSACTIONAL
Language: English

Body:
✅ Order Confirmed!

Order: {{order_number}}
Amount: ₹{{amount}}
Items: {{item_count}}

Track your order: ORDER {{order_number}}
```

### Template 3: Low Stock Alert
```
Name: low_stock_alert
Category: MARKETING
Language: English

Body:
⚠️ Limited Stock Alert!

{{product_name}} is running low.

Only {{quantity}} pieces left!
Visit us or order online now.
```

## 🧪 Step 4: Testing

### 4.1 Opt-In Test

1. Open WhatsApp on your phone
2. Message your business number: `START`
3. You should receive welcome message

### 4.2 Order Status Test

```
Message: ORDER INV-2026-0125
Expected: Order details with items and balance
```

### 4.3 Stock Check Test

```
Message: STOCK Cotton T-Shirt
Expected: Available sizes, colors, and prices
```

### 4.4 Help Test

```
Message: HELP
Expected: List of all available commands
```

### 4.5 Opt-Out Test

```
Message: STOP
Expected: Unsubscription confirmation
```

## 📊 Step 5: Monitor & Analytics

### View Logs in Supabase

```bash
# Watch function logs
supabase functions logs waziper-webhook --tail

# Check recent interactions
supabase db query "
SELECT * FROM audit_log 
WHERE action = 'WHATSAPP_MESSAGE' 
ORDER BY created_at DESC 
LIMIT 10;
"
```

### View Analytics in Waziper

1. Go to **Analytics** in Waziper Dashboard
2. Monitor:
   - Message delivery rate
   - Response time
   - Failed messages
   - Active conversations

## 🔐 Security Best Practices

### 1. Webhook Verification
```typescript
// Always verify webhook token
if (verify_token !== waziperToken) {
  return new Response('Invalid token', { status: 403 });
}
```

### 2. Rate Limiting
```sql
-- Create rate limit function
CREATE OR REPLACE FUNCTION check_whatsapp_rate_limit(
  p_phone_number TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  message_count INT;
BEGIN
  -- Count messages in last 5 minutes
  SELECT COUNT(*) INTO message_count
  FROM audit_log
  WHERE action = 'WHATSAPP_MESSAGE'
    AND performed_by = p_phone_number
    AND created_at > NOW() - INTERVAL '5 minutes';
  
  RETURN message_count < 10; -- Max 10 messages per 5 mins
END;
$$ LANGUAGE plpgsql;
```

### 3. Opt-In Enforcement
```typescript
// Never send messages without opt-in
const { data: optIn } = await supabase
  .from('whatsapp_opt_ins')
  .select('*')
  .eq('phone_number', phoneNumber)
  .eq('opted_in', true)
  .single();

if (!optIn) {
  return; // Don't send message
}
```

## 🎨 Advanced Features

### 1. Send Rich Media

```typescript
// Send image
await fetch('https://api.waziper.com/v1/messages/media', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    instance_id: instanceId,
    to: `${phoneNumber}@s.whatsapp.net`,
    type: 'image',
    image: {
      url: 'https://example.com/product.jpg',
      caption: 'New Arrival! Cotton T-Shirt - ₹499',
    },
  }),
});
```

### 2. Send Document (Invoice)

```typescript
// Send PDF invoice
await fetch('https://api.waziper.com/v1/messages/media', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    instance_id: instanceId,
    to: `${phoneNumber}@s.whatsapp.net`,
    type: 'document',
    document: {
      url: 'https://example.com/invoice.pdf',
      filename: 'Invoice-INV-2026-0125.pdf',
      caption: 'Your invoice is ready!',
    },
  }),
});
```

### 3. Interactive Buttons

```typescript
// Send with buttons
await fetch('https://api.waziper.com/v1/messages/interactive', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    instance_id: instanceId,
    to: `${phoneNumber}@s.whatsapp.net`,
    interactive: {
      type: 'button',
      body: {
        text: 'How would you like to pay?',
      },
      action: {
        buttons: [
          { type: 'reply', reply: { id: 'cash', title: 'Cash' } },
          { type: 'reply', reply: { id: 'card', title: 'Card' } },
          { type: 'reply', reply: { id: 'upi', title: 'UPI' } },
        ],
      },
    },
  }),
});
```

## 🔔 Automated Notifications

### Order Confirmation (Triggered by POS)

```typescript
// In sync_event Edge Function
if (eventType === 'SALE' && channel === 'STORE') {
  // Get customer phone from customer_ledger
  const { data: customer } = await supabase
    .from('customer_profiles')
    .select('phone, whatsapp_opt_in')
    .eq('id', customerId)
    .single();

  if (customer?.whatsapp_opt_in) {
    // Send order confirmation via Waziper
    await sendWaziperMessage(
      customer.phone,
      `✅ Order Confirmed!\n\nOrder: ${referenceNumber}\nAmount: ₹${totalAmount}\n\nTrack: ORDER ${referenceNumber}`,
      waziperToken,
      instanceId
    );
  }
}
```

### Low Stock Alert (Scheduled)

```typescript
// Create cron job in Supabase
// supabase/functions/daily-stock-alerts/index.ts

Deno.cron('Daily Stock Alerts', '0 9 * * *', async () => {
  // Get opted-in customers
  const { data: customers } = await supabase
    .from('whatsapp_opt_ins')
    .select('phone_number')
    .eq('opted_in', true);

  // Get low stock items
  const { data: lowStock } = await supabase
    .from('current_stock_view')
    .select('product_name, size, current_quantity')
    .lt('current_quantity', 5)
    .gt('current_quantity', 0);

  // Notify customers
  for (const customer of customers) {
    let message = '⚠️ Limited Stock Alert!\n\n';
    lowStock.forEach((item: any) => {
      message += `${item.product_name} (${item.size}) - Only ${item.current_quantity} left!\n`;
    });
    
    await sendWaziperMessage(customer.phone_number, message, waziperToken, instanceId);
  }
});
```

## 🐛 Troubleshooting

### Webhook Not Receiving Messages

1. Check Waziper webhook configuration
2. Verify URL is publicly accessible
3. Test webhook verification:
   ```bash
   curl "https://YOUR-PROJECT.supabase.co/functions/v1/waziper-webhook?hub.challenge=test&hub.verify_token=YOUR-TOKEN"
   ```
4. Check Edge Function logs:
   ```bash
   supabase functions logs waziper-webhook
   ```

### Messages Not Sending

1. Verify API token is correct
2. Check instance_id matches
3. Ensure phone number format: `919876543210@s.whatsapp.net`
4. Check Waziper API status
5. Review error logs

### Opt-In Issues

1. Check `whatsapp_opt_ins` table:
   ```sql
   SELECT * FROM whatsapp_opt_ins WHERE phone_number = '919876543210';
   ```
2. Verify `opted_in` is `true`
3. Test with `START` command

## 📈 Cost Optimization

### Message Batching

```typescript
// Batch multiple notifications
const messages = [];
for (const customer of customers) {
  messages.push({
    to: `${customer.phone}@s.whatsapp.net`,
    message: generatePersonalizedMessage(customer),
  });
}

// Send in batches of 50
for (let i = 0; i < messages.length; i += 50) {
  const batch = messages.slice(i, i + 50);
  await sendBatchMessages(batch);
  await new Promise(resolve => setTimeout(resolve, 1000)); // Rate limit
}
```

### Template Usage

Use approved templates (cheaper) instead of session messages when possible.

## 📞 Support

- **Waziper Support**: support@waziper.com
- **Documentation**: https://docs.waziper.com
- **API Reference**: https://api.waziper.com/docs

## ✅ Checklist

Before going live:

- [ ] Waziper account created and verified
- [ ] Phone number connected
- [ ] API token generated
- [ ] Webhook configured and verified
- [ ] Edge Function deployed
- [ ] Environment variables set
- [ ] Opt-in flow tested
- [ ] Order status query tested
- [ ] Stock inquiry tested
- [ ] Help command tested
- [ ] Opt-out flow tested
- [ ] Rate limiting enabled
- [ ] Message templates approved
- [ ] Analytics monitoring set up
- [ ] Team trained on system

---

**Ready to go live! 🚀**

Your customers can now get instant order updates and stock information via WhatsApp!
