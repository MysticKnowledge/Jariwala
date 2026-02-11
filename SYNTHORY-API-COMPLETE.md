# 🚀 Synthory WhatsApp API - Complete Integration Guide

## ✅ Your Credentials (Configured)

```
Access Token: 68f200af61c2c
Instance ID:  696EEF066DBC0
Base URL:     https://wapp.synthory.space/api
```

---

## 📡 API Endpoints

### **1. Instance Management**

#### **Create Instance**
```http
POST https://wapp.synthory.space/api/create_instance?access_token=68f200af61c2c
```

#### **Get QR Code (For Authentication)**
```http
POST https://wapp.synthory.space/api/get_qrcode?instance_id=696EEF066DBC0&access_token=68f200af61c2c
```
Returns QR code image to scan with WhatsApp mobile app.

#### **Set Webhook**
```http
POST https://wapp.synthory.space/api/set_webhook
  ?webhook_url=https://your-webhook-url.com/webhook
  &enable=true
  &instance_id=696EEF066DBC0
  &access_token=68f200af61c2c
```
Configure webhook to receive incoming messages and connection status updates.

#### **Reboot Instance**
```http
POST https://wapp.synthory.space/api/reboot?instance_id=696EEF066DBC0&access_token=68f200af61c2c
```
Logout WhatsApp web and initiate fresh scan.

#### **Reset Instance**
```http
POST https://wapp.synthory.space/api/reset_instance?instance_id=696EEF066DBC0&access_token=68f200af61c2c
```
Logout WhatsApp web, change Instance ID, delete all old instance data.

#### **Reconnect**
```http
POST https://wapp.synthory.space/api/reconnect?instance_id=696EEF066DBC0&access_token=68f200af61c2c
```
Re-initiate connection when lost.

---

### **2. Send Messages**

#### **Send Text Message**

**Query String Method:**
```http
POST https://wapp.synthory.space/api/send
  ?number=919876543210
  &type=text
  &message=Hello from store!
  &instance_id=696EEF066DBC0
  &access_token=68f200af61c2c
```

**JSON Body Method:**
```http
POST https://wapp.synthory.space/api/send
Content-Type: application/json

{
  "number": "919876543210",
  "type": "text",
  "message": "Hello from store!",
  "instance_id": "696EEF066DBC0",
  "access_token": "68f200af61c2c"
}
```

#### **Send Media/File**

**Query String:**
```http
POST https://wapp.synthory.space/api/send
  ?number=919876543210
  &type=media
  &message=Check this out!
  &media_url=https://example.com/image.jpg
  &filename=promo.jpg
  &instance_id=696EEF066DBC0
  &access_token=68f200af61c2c
```

**JSON Body:**
```json
{
  "number": "919876543210",
  "type": "media",
  "message": "Check this out!",
  "media_url": "https://example.com/image.jpg",
  "filename": "promo.jpg",
  "instance_id": "696EEF066DBC0",
  "access_token": "68f200af61c2c"
}
```

#### **Send Template Button**

```http
POST https://wapp.synthory.space/api/send_template
  ?instance_id=696EEF066DBC0
  &access_token=68f200af61c2c

Content-Type: application/json
{
  "number": "919876543210",
  "type": "button",
  "message": {
    "templateButtons": [
      {
        "index": 1,
        "quickReplyButton": {
          "displayText": "View Products",
          "id": "view_products"
        }
      },
      {
        "index": 2,
        "urlButton": {
          "displayText": "Visit Website",
          "url": "https://yourstore.com"
        }
      },
      {
        "index": 3,
        "callButton": {
          "displayText": "Call Us",
          "phoneNumber": "+919876543210"
        }
      }
    ],
    "footer": "Your Store Name",
    "title": "New Arrivals",
    "subtitle": "Check out our latest collection",
    "caption": "Limited time offer!",
    "image": {
      "url": "https://yourstore.com/promo.jpg"
    }
  }
}
```

#### **Send List Template**

```http
POST https://wapp.synthory.space/api/send_template
  ?instance_id=696EEF066DBC0
  &access_token=68f200af61c2c

Content-Type: application/json
{
  "number": "919876543210",
  "type": "list",
  "message": {
    "text": "Please select a category",
    "footer": "Your Store",
    "title": "Product Categories",
    "buttonText": "View Options",
    "sections": [
      {
        "title": "Men's Wear",
        "rows": [
          {
            "title": "T-Shirts",
            "rowId": "mens_tshirts",
            "description": "Cotton T-Shirts"
          },
          {
            "title": "Jeans",
            "rowId": "mens_jeans",
            "description": "Denim Jeans"
          }
        ]
      },
      {
        "title": "Women's Wear",
        "rows": [
          {
            "title": "Dresses",
            "rowId": "womens_dresses",
            "description": "Designer Dresses"
          }
        ]
      }
    ]
  }
}
```

---

### **3. Group Messages**

#### **Get Groups**
```http
POST https://wapp.synthory.space/api/get_groups
  ?instance_id=696EEF066DBC0
  &access_token=68f200af61c2c
```

#### **Send Group Text**
```http
POST https://wapp.synthory.space/api/send_group
  ?group_id=123456789@g.us
  &type=text
  &message=Hello group!
  &instance_id=696EEF066DBC0
  &access_token=68f200af61c2c
```

#### **Send Group Media**
```http
POST https://wapp.synthory.space/api/send_group
  ?group_id=123456789@g.us
  &type=media
  &message=Check this
  &media_url=https://example.com/image.jpg
  &instance_id=696EEF066DBC0
  &access_token=68f200af61c2c
```

---

## 💻 Code Examples

### **JavaScript/TypeScript Client**

```typescript
// Configuration
const WAZIPER_CONFIG = {
  accessToken: '68f200af61c2c',
  instanceId: '696EEF066DBC0',
  baseUrl: 'https://wapp.synthory.space/api',
};

// Helper function to build query string
function buildQueryString(params: Record<string, any>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      query.append(key, String(value));
    }
  });
  return query.toString();
}

// Send text message
async function sendMessage(phoneNumber: string, message: string) {
  const params = {
    number: phoneNumber,
    type: 'text',
    message: message,
    instance_id: WAZIPER_CONFIG.instanceId,
    access_token: WAZIPER_CONFIG.accessToken,
  };

  const response = await fetch(
    `${WAZIPER_CONFIG.baseUrl}/send?${buildQueryString(params)}`,
    { method: 'POST' }
  );

  return await response.json();
}

// Get QR Code
async function getQRCode() {
  const params = {
    instance_id: WAZIPER_CONFIG.instanceId,
    access_token: WAZIPER_CONFIG.accessToken,
  };

  const response = await fetch(
    `${WAZIPER_CONFIG.baseUrl}/get_qrcode?${buildQueryString(params)}`,
    { method: 'POST' }
  );

  const data = await response.json();
  return data.qrcode; // Base64 image or URL
}

// Send media
async function sendMedia(phoneNumber: string, message: string, mediaUrl: string) {
  const params = {
    number: phoneNumber,
    type: 'media',
    message: message,
    media_url: mediaUrl,
    instance_id: WAZIPER_CONFIG.instanceId,
    access_token: WAZIPER_CONFIG.accessToken,
  };

  const response = await fetch(
    `${WAZIPER_CONFIG.baseUrl}/send?${buildQueryString(params)}`,
    { method: 'POST' }
  );

  return await response.json();
}

// Usage
await sendMessage('919876543210', 'Hello from your store!');
const qr = await getQRCode();
await sendMedia('919876543210', 'New product!', 'https://store.com/product.jpg');
```

### **cURL Examples**

```bash
# Send text message
curl -X POST "https://wapp.synthory.space/api/send?number=919876543210&type=text&message=Hello&instance_id=696EEF066DBC0&access_token=68f200af61c2c"

# Get QR code
curl -X POST "https://wapp.synthory.space/api/get_qrcode?instance_id=696EEF066DBC0&access_token=68f200af61c2c"

# Reboot instance
curl -X POST "https://wapp.synthory.space/api/reboot?instance_id=696EEF066DBC0&access_token=68f200af61c2c"

# Send media
curl -X POST "https://wapp.synthory.space/api/send" \
  -H "Content-Type: application/json" \
  -d '{
    "number": "919876543210",
    "type": "media",
    "message": "Check this out!",
    "media_url": "https://example.com/image.jpg",
    "instance_id": "696EEF066DBC0",
    "access_token": "68f200af61c2c"
  }'
```

---

## 🎯 Message Templates for Retail

### **Order Confirmation**
```javascript
await sendMessage(customer.phone, `✅ Order Confirmed!

Order: ${orderNumber}
Amount: ₹${amount}
Items: ${itemCount}

Thank you for your purchase!

Reply TRACK to check status.`);
```

### **Low Stock Alert**
```javascript
await sendMessage(customer.phone, `⚠️ Hurry! Limited Stock

${productName}
Only ${quantity} left
Price: ₹${price}

Visit store or reply BUY to reserve.`);
```

### **Payment Reminder**
```javascript
await sendMessage(customer.phone, `💰 Payment Reminder

Dear ${customerName},
Outstanding: ₹${amount}
Due: ${dueDate}

Reply PAY for payment options.`);
```

### **With Buttons**
```javascript
await fetch('https://wapp.synthory.space/api/send_template?instance_id=696EEF066DBC0&access_token=68f200af61c2c', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    number: customer.phone,
    type: 'button',
    message: {
      title: 'New Arrivals!',
      caption: 'Check out our latest collection',
      image: { url: 'https://store.com/new-arrival.jpg' },
      templateButtons: [
        {
          index: 1,
          quickReplyButton: {
            displayText: 'View Products',
            id: 'view_products'
          }
        },
        {
          index: 2,
          urlButton: {
            displayText: 'Shop Now',
            url: 'https://yourstore.com/shop'
          }
        }
      ],
      footer: 'Your Store Name'
    }
  })
});
```

---

## 🔔 Webhook Events

When you configure a webhook, you'll receive:

### **Incoming Message**
```json
{
  "event": "message.received",
  "instanceId": "696EEF066DBC0",
  "from": "919876543210",
  "message": "ORDER INV-123",
  "timestamp": "2026-01-30T10:30:00Z",
  "messageId": "msg_xyz"
}
```

### **Connection Status**
```json
{
  "event": "connection.update",
  "instanceId": "696EEF066DBC0",
  "status": "connected",
  "phoneNumber": "919876543210",
  "battery": 85,
  "timestamp": "2026-01-30T10:30:00Z"
}
```

### **Message Status**
```json
{
  "event": "message.status",
  "instanceId": "696EEF066DBC0",
  "messageId": "msg_xyz",
  "status": "delivered",
  "timestamp": "2026-01-30T10:30:00Z"
}
```

---

## ✨ Integration Status

| Feature | Status | Endpoint |
|---------|--------|----------|
| Send Text | ✅ Ready | `POST /send` |
| Send Media | ✅ Ready | `POST /send` |
| Send Buttons | ✅ Ready | `POST /send_template` |
| Send Lists | ✅ Ready | `POST /send_template` |
| QR Code Auth | ✅ Ready | `POST /get_qrcode` |
| Webhooks | ✅ Ready | `POST /set_webhook` |
| Groups | ✅ Ready | `POST /get_groups`, `POST /send_group` |
| Reboot | ✅ Ready | `POST /reboot` |
| Reconnect | ✅ Ready | `POST /reconnect` |

---

## 🎊 Quick Start

### **1. Get QR Code & Authenticate**
```javascript
const qr = await getQRCode();
// Display QR code → Scan with WhatsApp mobile
```

### **2. Send Your First Message**
```javascript
await sendMessage('919876543210', 'Hello from your retail store!');
```

### **3. Send Broadcast**
```javascript
const customers = ['919876543210', '919876543211', '919876543212'];
for (const phone of customers) {
  await sendMessage(phone, 'New arrivals in store!');
  await new Promise(r => setTimeout(r, 200)); // Rate limit
}
```

### **4. Setup Webhook (Optional)**
```javascript
await setWebhook('https://yourapp.com/webhook', true);
// Now receive incoming messages!
```

---

## 📚 Documentation

- **Your Instance**: `696EEF066DBC0`
- **API Base**: `https://wapp.synthory.space/api`
- **Access Token**: `68f200af61c2c`
- **Status**: ✅ Configured & Ready

---

**Last Updated**: January 30, 2026  
**Integration**: ✅ Complete  
**Ready to Use**: 🚀 YES!
