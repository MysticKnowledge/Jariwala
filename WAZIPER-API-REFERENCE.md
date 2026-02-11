# 🔌 Waziper API Reference - Custom Synthory Endpoint

## 🌐 Base Configuration

```javascript
Base URL: https://wapp.synthory.space/api
API Key: 8e122b95-69e1-4083-a0e5-d830501b9c97
Access Token: 68f200af61c2c
Instance ID: 696EEF066DBC0
```

## 📡 API Endpoints

### **1. Send Message**

```http
POST https://wapp.synthory.space/api/messages/send
Content-Type: application/json
Authorization: Bearer 68f200af61c2c
X-API-Key: 8e122b95-69e1-4083-a0e5-d830501b9c97

{
  "instanceId": "696EEF066DBC0",
  "to": "919876543210",
  "message": "Hello from your store!"
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "msg_123456",
  "status": "sent"
}
```

---

### **2. Get Instance Status**

```http
GET https://wapp.synthory.space/api/instance/696EEF066DBC0/status
Authorization: Bearer 68f200af61c2c
X-API-Key: 8e122b95-69e1-4083-a0e5-d830501b9c97
```

**Response:**
```json
{
  "connected": true,
  "phoneNumber": "919876543210",
  "status": "active"
}
```

---

### **3. Send Broadcast (Multiple Recipients)**

```http
POST https://wapp.synthory.space/api/messages/broadcast
Content-Type: application/json
Authorization: Bearer 68f200af61c2c
X-API-Key: 8e122b95-69e1-4083-a0e5-d830501b9c97

{
  "instanceId": "696EEF066DBC0",
  "recipients": ["919876543210", "919876543211", "919876543212"],
  "message": "New arrivals in store! Visit us today."
}
```

**Response:**
```json
{
  "success": true,
  "sent": 3,
  "failed": 0,
  "messageIds": ["msg_001", "msg_002", "msg_003"]
}
```

---

### **4. Get Message Status**

```http
GET https://wapp.synthory.space/api/messages/{messageId}/status
Authorization: Bearer 68f200af61c2c
X-API-Key: 8e122b95-69e1-4083-a0e5-d830501b9c97
```

**Response:**
```json
{
  "messageId": "msg_123456",
  "status": "delivered",
  "timestamp": "2026-01-30T10:30:00Z"
}
```

---

## 💻 Code Examples

### **JavaScript/TypeScript**

```typescript
// Send a message
async function sendMessage(phone: string, message: string) {
  const response = await fetch('https://wapp.synthory.space/api/messages/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer 68f200af61c2c',
      'X-API-Key': '8e122b95-69e1-4083-a0e5-d830501b9c97',
    },
    body: JSON.stringify({
      instanceId: '696EEF066DBC0',
      to: phone,
      message: message,
    }),
  });
  
  return await response.json();
}

// Usage
const result = await sendMessage('919876543210', 'Hello from store!');
console.log(result);
```

### **cURL**

```bash
# Send a message
curl -X POST https://wapp.synthory.space/api/messages/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 68f200af61c2c" \
  -H "X-API-Key: 8e122b95-69e1-4083-a0e5-d830501b9c97" \
  -d '{
    "instanceId": "696EEF066DBC0",
    "to": "919876543210",
    "message": "Test message"
  }'

# Get instance status
curl -X GET https://wapp.synthory.space/api/instance/696EEF066DBC0/status \
  -H "Authorization: Bearer 68f200af61c2c" \
  -H "X-API-Key: 8e122b95-69e1-4083-a0e5-d830501b9c97"
```

### **Python**

```python
import requests

def send_whatsapp_message(phone: str, message: str):
    url = "https://wapp.synthory.space/api/messages/send"
    headers = {
        "Content-Type": "application/json",
        "Authorization": "Bearer 68f200af61c2c",
        "X-API-Key": "8e122b95-69e1-4083-a0e5-d830501b9c97"
    }
    data = {
        "instanceId": "696EEF066DBC0",
        "to": phone,
        "message": message
    }
    
    response = requests.post(url, json=data, headers=headers)
    return response.json()

# Usage
result = send_whatsapp_message("919876543210", "Hello from store!")
print(result)
```

---

## 📝 Message Templates

### **Order Confirmation**
```json
{
  "to": "919876543210",
  "message": "✅ Order Confirmed!\n\nOrder: INV-2026-0125\nAmount: ₹2,500\n\nThank you for your purchase!"
}
```

### **Low Stock Alert**
```json
{
  "to": "919876543210",
  "message": "⚠️ Limited Stock Alert!\n\nCotton T-Shirt - Only 5 left\n\nOrder now before it's gone!"
}
```

### **Payment Reminder**
```json
{
  "to": "919876543210",
  "message": "Reminder: Outstanding balance of ₹5,000\n\nPlease make payment at your earliest convenience.\n\nReply HELP for assistance."
}
```

---

## 🔐 Authentication

All API requests require two headers:

```http
Authorization: Bearer 68f200af61c2c
X-API-Key: 8e122b95-69e1-4083-a0e5-d830501b9c97
```

---

## ⚠️ Error Handling

### **Common Error Responses:**

```json
// Invalid phone number
{
  "success": false,
  "error": "Invalid phone number format",
  "code": "INVALID_PHONE"
}

// Rate limit exceeded
{
  "success": false,
  "error": "Rate limit exceeded",
  "code": "RATE_LIMIT",
  "retryAfter": 60
}

// Instance not connected
{
  "success": false,
  "error": "Instance not connected",
  "code": "NOT_CONNECTED"
}

// Authentication failed
{
  "success": false,
  "error": "Invalid credentials",
  "code": "AUTH_FAILED"
}
```

---

## 📊 Rate Limits

- **Messages per minute**: 60
- **Messages per hour**: 1000
- **Broadcast size**: 100 recipients max
- **Message length**: 4096 characters max

---

## 🎯 Best Practices

1. **Phone Number Format**
   - Always include country code
   - No spaces, dashes, or special characters
   - Example: `919876543210` (India)

2. **Message Content**
   - Keep messages concise and clear
   - Use emojis sparingly
   - Include call-to-action when needed

3. **Error Handling**
   - Always check response status
   - Implement retry logic for failures
   - Log failed messages for review

4. **Rate Limiting**
   - Implement delays between bulk sends
   - Use broadcast endpoint for multiple recipients
   - Monitor rate limit headers

---

## 🔄 Webhooks (Optional)

If you want to receive incoming messages, configure webhook:

```json
POST https://your-domain.com/webhook/waziper
Content-Type: application/json

{
  "event": "message.received",
  "instanceId": "696EEF066DBC0",
  "from": "919876543210",
  "message": "ORDER INV-2026-0125",
  "timestamp": "2026-01-30T10:30:00Z"
}
```

---

## 📱 Testing

### **Quick Test Script:**

```bash
#!/bin/bash

# Test connection
echo "Testing Waziper API..."

curl -X GET https://wapp.synthory.space/api/instance/696EEF066DBC0/status \
  -H "Authorization: Bearer 68f200af61c2c" \
  -H "X-API-Key: 8e122b95-69e1-4083-a0e5-d830501b9c97"

# Send test message (replace with your number)
curl -X POST https://wapp.synthory.space/api/messages/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer 68f200af61c2c" \
  -H "X-API-Key: 8e122b95-69e1-4083-a0e5-d830501b9c97" \
  -d '{
    "instanceId": "696EEF066DBC0",
    "to": "919876543210",
    "message": "Test message from API"
  }'
```

---

## 🆘 Support

- **API Issues**: Check instance status first
- **Message Failures**: Verify phone number format
- **Rate Limits**: Implement delays and batching
- **Connection**: Test with curl command above

---

## ✅ Integration Checklist

- [x] API Key configured: `8e122b95-69e1-4083-a0e5-d830501b9c97`
- [x] Access Token configured: `68f200af61c2c`
- [x] Instance ID configured: `696EEF066DBC0`
- [x] Base URL updated: `https://wapp.synthory.space/api`
- [ ] Test connection successful
- [ ] Test message sent
- [ ] Broadcast tested
- [ ] Error handling implemented
- [ ] Rate limiting configured

---

**Last Updated**: January 30, 2026  
**API Version**: v1  
**Instance**: 696EEF066DBC0 (Active)
