# 📱 Waziper WhatsApp Bot Integration

Complete WhatsApp Business API integration using Waziper for automated customer support.

## 🎯 What This Does

Your customers can now interact with your store via WhatsApp:

- ✅ **Check Order Status** - `ORDER INV-2026-0125`
- ✅ **Check Stock** - `STOCK Cotton T-Shirt`
- ✅ **Get Help** - `HELP`
- ✅ **Opt-In/Out** - `START` or `STOP`

## 🚀 Quick Start

### 1. Sign Up for Waziper

1. Go to [waziper.com](https://waziper.com)
2. Create business account
3. Connect your business phone number
4. Get WhatsApp Business API approval

### 2. Get API Credentials

From Waziper Dashboard:
- **API Token** - Your authentication token
- **Instance ID** - Your WhatsApp instance identifier
- **Verification Token** - For webhook security

### 3. Deploy the Bot

```bash
# Set environment variables
export WAZIPER_API_TOKEN="your-token-here"
export WAZIPER_INSTANCE_ID="your-instance-id"
export WAZIPER_VERIFY_TOKEN="your-verify-token"

# Add to Supabase secrets
supabase secrets set WAZIPER_API_TOKEN="$WAZIPER_API_TOKEN"
supabase secrets set WAZIPER_INSTANCE_ID="$WAZIPER_INSTANCE_ID"
supabase secrets set WAZIPER_VERIFY_TOKEN="$WAZIPER_VERIFY_TOKEN"

# Deploy Edge Function
supabase functions deploy waziper-webhook

# Get webhook URL
echo "Your webhook URL:"
echo "https://YOUR-PROJECT.supabase.co/functions/v1/waziper-webhook"
```

### 4. Configure Waziper Webhook

In Waziper Dashboard → Webhooks:

```
Webhook URL: https://YOUR-PROJECT.supabase.co/functions/v1/waziper-webhook
Verification Token: your-verify-token
Events: ✅ Messages, ✅ Status Updates
```

### 5. Test It!

```bash
# Run test suite
chmod +x deployment-scripts/test-waziper.sh
./deployment-scripts/test-waziper.sh

# Or test manually from WhatsApp
# Message your business number: START
```

## 📖 Customer Commands

### Opt-In (Subscribe)
```
Customer: START
Bot: Welcome to our store! 🛍️ You're now subscribed...
```

### Check Order
```
Customer: ORDER INV-2026-0125
Bot: ✅ Order Status: INV-2026-0125
     Customer: Rajesh Kumar
     Date: Jan 30, 2026
     Total: ₹1,498.00
     Balance: ₹0.00 (Fully Paid)
     
     Items:
     1. Cotton T-Shirt (M) × 2
```

### Check Stock
```
Customer: STOCK Cotton T-Shirt
Bot: ✅ Cotton T-Shirt
     
     Available Stock:
     
     📍 Main Store Mumbai
       • Size M (Red) - 27 pcs - ₹599
       • Size L (Blue) - 19 pcs - ₹599
     
     Visit our store or order online!
```

### Get Help
```
Customer: HELP
Bot: 📱 Available Commands
     
     🔹 ORDER <number> - Check order status
        Example: ORDER INV-2026-0125
     
     🔹 STOCK <product> - Check availability
        Example: STOCK Cotton T-Shirt
     
     🔹 HELP - Show this menu
     🔹 STOP - Unsubscribe
```

### Opt-Out (Unsubscribe)
```
Customer: STOP
Bot: You have been unsubscribed. Send START to subscribe again.
```

## 🏗️ Architecture

```
Customer WhatsApp Message
         ↓
   Waziper Platform
         ↓
 Waziper Webhook (POST)
         ↓
Supabase Edge Function
         ↓
   ┌─────┴─────┐
   ↓           ↓
Database    Response
(Supabase)     ↓
         ↓
   Waziper API
         ↓
 Customer WhatsApp
```

## 🔐 Security Features

### 1. Opt-In Enforcement
- Only opted-in users receive messages
- GDPR/WhatsApp Business Policy compliant
- Easy opt-out with `STOP` command

### 2. Webhook Verification
```typescript
if (verify_token !== waziperToken) {
  return new Response('Invalid token', { status: 403 });
}
```

### 3. RLS Protection
- Customer can only see their own orders
- Phone number verification for queries
- Audit logging for all interactions

### 4. Rate Limiting
- Prevents spam and abuse
- Configurable limits per user
- Automatic throttling

## 📊 Monitoring

### View Logs
```bash
# Real-time logs
supabase functions logs waziper-webhook --tail

# Recent interactions
supabase db query "
SELECT 
  performed_by as phone,
  details->>'message' as message,
  details->>'response' as response,
  created_at
FROM audit_log
WHERE action = 'WHATSAPP_MESSAGE'
ORDER BY created_at DESC
LIMIT 10;
"
```

### Analytics Dashboard

In Waziper panel, view:
- Message delivery rates
- Response times
- Active conversations
- Failed messages

## 🎨 Advanced Features

### 1. Send Order Confirmation (Auto)

Triggered when POS creates sale:

```typescript
// In sync_event Edge Function
if (eventType === 'SALE' && customerPhone) {
  await sendWaziperMessage(
    customerPhone,
    `✅ Order Confirmed!\n\nOrder: ${orderNumber}\nAmount: ₹${amount}\n\nTrack: ORDER ${orderNumber}`,
    waziperToken,
    instanceId
  );
}
```

### 2. Send Images

```typescript
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

### 3. Send Invoice PDF

```typescript
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
      filename: 'Invoice.pdf',
    },
  }),
});
```

### 4. Interactive Buttons

```typescript
await fetch('https://api.waziper.com/v1/messages/interactive', {
  method: 'POST',
  body: JSON.stringify({
    instance_id: instanceId,
    to: `${phoneNumber}@s.whatsapp.net`,
    interactive: {
      type: 'button',
      body: { text: 'How would you like to pay?' },
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

### Low Stock Alert (Daily)

```typescript
// Cron job - runs daily at 9 AM
Deno.cron('Daily Stock Alerts', '0 9 * * *', async () => {
  const { data: lowStock } = await supabase
    .from('current_stock_view')
    .select('*')
    .lt('current_quantity', 5);

  const { data: customers } = await supabase
    .from('whatsapp_opt_ins')
    .select('phone_number')
    .eq('opted_in', true);

  for (const customer of customers) {
    let message = '⚠️ Limited Stock Alert!\n\n';
    lowStock.forEach((item) => {
      message += `${item.product_name} - Only ${item.current_quantity} left!\n`;
    });
    
    await sendWaziperMessage(customer.phone_number, message);
  }
});
```

### Payment Reminder

```typescript
// Cron job - runs weekly
Deno.cron('Payment Reminders', '0 10 * * MON', async () => {
  const { data: outstanding } = await supabase
    .from('customer_ledger')
    .select('*')
    .gt('balance', 0);

  for (const customer of outstanding) {
    await sendWaziperMessage(
      customer.phone,
      `Friendly reminder: You have an outstanding balance of ₹${customer.balance.toFixed(2)}. Reply HELP for payment options.`
    );
  }
});
```

## 🐛 Troubleshooting

### Messages Not Received

1. Check webhook configuration in Waziper
2. Verify webhook URL is accessible
3. Test verification:
   ```bash
   curl "https://YOUR-PROJECT.supabase.co/functions/v1/waziper-webhook?hub.challenge=test&hub.verify_token=YOUR-TOKEN"
   ```
4. Check Edge Function logs:
   ```bash
   supabase functions logs waziper-webhook
   ```

### Customer Can't Opt-In

1. Check if they sent `START` exactly
2. Verify phone number format in database
3. Check audit_log for errors:
   ```sql
   SELECT * FROM audit_log 
   WHERE action = 'WHATSAPP_MESSAGE' 
   ORDER BY created_at DESC LIMIT 10;
   ```

### Order Status Not Working

1. Verify order exists in `customer_ledger`
2. Check phone number matches customer
3. Ensure customer is opted-in:
   ```sql
   SELECT * FROM whatsapp_opt_ins WHERE phone_number = '919876543210';
   ```

## 💰 Cost Optimization

### Use Templates

WhatsApp approved templates are cheaper:
- Session messages: Higher cost
- Template messages: Lower cost

### Message Batching

```typescript
// Batch messages instead of sending individually
const messages = customers.map(c => ({
  to: `${c.phone}@s.whatsapp.net`,
  message: generateMessage(c),
}));

// Send in batches of 50
for (let i = 0; i < messages.length; i += 50) {
  await sendBatch(messages.slice(i, i + 50));
  await sleep(1000); // Rate limit
}
```

## 📞 Support

- **Waziper**: support@waziper.com
- **Docs**: https://docs.waziper.com
- **API**: https://api.waziper.com/docs

## ✅ Production Checklist

- [ ] Waziper account verified
- [ ] Phone number connected
- [ ] API credentials obtained
- [ ] Edge Function deployed
- [ ] Webhook configured
- [ ] Webhook verified
- [ ] Test commands working
- [ ] Opt-in flow tested
- [ ] Order query tested
- [ ] Stock query tested
- [ ] Opt-out flow tested
- [ ] Database logging verified
- [ ] Monitoring set up
- [ ] Team trained
- [ ] Customer communication sent

---

## 🎉 You're Ready!

Your customers can now get instant updates and support via WhatsApp! 🚀

**Test it now**: Message your business number with `START`
