# 🔧 Waziper Integration Troubleshooting

## ❌ Common Errors & Solutions

### **Error: "Failed to fetch" or CORS Error**

**Problem**: Browser blocks the API request due to CORS (Cross-Origin Resource Sharing) policy.

**Why it happens**:
- The Waziper API (`wapp.synthory.space`) may not have CORS headers enabled
- Your frontend app is running on `localhost` and trying to call a different domain
- Some API endpoints don't allow direct browser calls

**Solutions**:

#### **Option 1: Use Backend Proxy (Recommended for Production)**

Instead of calling Waziper directly from the frontend, call it from your backend (Supabase Edge Functions):

```typescript
// Create Supabase Edge Function: /supabase/functions/send-whatsapp/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  const { phoneNumber, message } = await req.json()
  
  // Call Waziper from backend (no CORS issues!)
  const response = await fetch(
    `https://wapp.synthory.space/api/send?number=${phoneNumber}&type=text&message=${encodeURIComponent(message)}&instance_id=696EEF066DBC0&access_token=68f200af61c2c`,
    { method: 'POST' }
  )
  
  const data = await response.json()
  
  return new Response(JSON.stringify(data), {
    headers: { 'Content-Type': 'application/json' }
  })
})
```

Then call from frontend:
```typescript
// Frontend call
const result = await supabase.functions.invoke('send-whatsapp', {
  body: { phoneNumber: '919876543210', message: 'Hello!' }
})
```

#### **Option 2: Test with Browser Extension (Dev Only)**

For development/testing, install a CORS browser extension:
- Chrome: "CORS Unblock" or "Allow CORS"
- Firefox: "CORS Everywhere"

**⚠️ Only use for testing! Not for production.**

#### **Option 3: Contact Waziper Support**

Ask Waziper to add CORS headers to their API:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: POST, GET, OPTIONS
```

---

### **Error: QR Code Not Loading**

**Symptoms**: 
- Click "Generate QR Code" but nothing appears
- Console shows "Failed to get QR code"

**Solutions**:

1. **Check API credentials**:
   ```typescript
   // In /src/app/services/waziper-client.ts
   const WAZIPER_CONFIG = {
     accessToken: '68f200af61c2c',  // Correct?
     instanceId: '696EEF066DBC0',    // Correct?
     baseUrl: 'https://wapp.synthory.space/api',  // Correct?
   };
   ```

2. **Test API manually** with cURL:
   ```bash
   curl -X POST "https://wapp.synthory.space/api/get_qrcode?instance_id=696EEF066DBC0&access_token=68f200af61c2c"
   ```

3. **Check network tab**:
   - Open browser DevTools (F12)
   - Go to Network tab
   - Click "Generate QR Code"
   - Look at the request - what's the response?

4. **Instance might be already connected**:
   - If already authenticated, API won't return QR code
   - Try "Reboot" button to force logout

---

### **Error: Message Not Sending**

**Symptoms**:
- "Send Test Message" fails
- No error but message not received

**Solutions**:

1. **Check WhatsApp connection**:
   - Must see "Connected to WhatsApp" status
   - Green indicator should be showing
   - If not, scan QR code first

2. **Verify phone number format**:
   ```typescript
   // ✅ Correct format (no + or spaces)
   '919876543210'  // India
   '14155551234'   // USA
   '6281234567890' // Indonesia
   
   // ❌ Wrong formats
   '+91 9876543210'
   '091-9876543210'
   '9876543210' (missing country code)
   ```

3. **Test with cURL**:
   ```bash
   curl -X POST "https://wapp.synthory.space/api/send?number=919876543210&type=text&message=Test&instance_id=696EEF066DBC0&access_token=68f200af61c2c"
   ```

4. **Check rate limits**:
   - Waziper may have message limits
   - Wait a few seconds between messages

---

### **Error: Instance Status Shows "Not Connected"**

**Symptoms**:
- Red dot indicator
- Can't send messages
- QR code keeps appearing

**Solutions**:

1. **Scan QR Code**:
   - Click "Generate QR Code"
   - Open WhatsApp on phone
   - Go to: Settings → Linked Devices → Link a Device
   - Scan the QR code

2. **Try Reconnect**:
   - Click "Reconnect" button
   - Wait 10 seconds
   - Check status again

3. **Try Reboot**:
   - Click "Reboot" button
   - Wait for new QR code
   - Scan again

4. **Check WhatsApp Web**:
   - Make sure you're not logged out on WhatsApp Web
   - Check if other linked devices are working

---

## 🧪 Testing Checklist

Use this checklist to verify your integration:

### **1. API Connectivity**
```bash
# Test if API is reachable
curl -X POST "https://wapp.synthory.space/api/get_qrcode?instance_id=696EEF066DBC0&access_token=68f200af61c2c"

# Expected: JSON response with QR code or status
# If error: Check internet, API URL, credentials
```

### **2. Credentials**
- [ ] Access Token: `68f200af61c2c`
- [ ] Instance ID: `696EEF066DBC0`
- [ ] API URL: `https://wapp.synthory.space/api`

### **3. WhatsApp Connection**
- [ ] QR code displays correctly
- [ ] Can scan QR code with phone
- [ ] Status changes to "Connected" after scan
- [ ] Green indicator shows

### **4. Send Message**
- [ ] Phone number in correct format (country code + number)
- [ ] Message appears in WhatsApp
- [ ] No errors in console

---

## 🔍 Debug Mode

Enable detailed logging:

```typescript
// In /src/app/services/waziper-client.ts

// Add this at the top
const DEBUG = true;

// Update sendWhatsAppMessage function
export async function sendWhatsAppMessage(
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

    const url = `${WAZIPER_CONFIG.baseUrl}/send?${buildQueryString(params)}`;
    
    if (DEBUG) {
      console.log('🔵 Waziper API Call:', url);
      console.log('🔵 Params:', params);
    }

    const response = await fetch(url, { method: 'POST' });
    const data = await response.json();

    if (DEBUG) {
      console.log('🔵 Response:', data);
    }

    // ... rest of function
  }
}
```

---

## 📞 Get Help

### **Check Browser Console**
1. Open DevTools (F12)
2. Go to Console tab
3. Look for red errors
4. Check Network tab for failed requests

### **Common Console Errors**

| Error | Meaning | Solution |
|-------|---------|----------|
| `CORS policy` | Browser blocking request | Use backend proxy or CORS extension |
| `404 Not Found` | Wrong API URL | Check endpoint spelling |
| `401 Unauthorized` | Wrong credentials | Verify access token |
| `Failed to fetch` | Network issue or CORS | Check internet, use backend |
| `TypeError` | Code error | Check phone number format |

---

## ✅ Working Configuration

If everything works correctly, you should see:

```typescript
// Browser console when sending message:
🔵 Waziper API Call: https://wapp.synthory.space/api/send?number=919876543210&type=text&message=Hello&instance_id=696EEF066DBC0&access_token=68f200af61c2c
🔵 Params: {number: "919876543210", type: "text", message: "Hello", ...}
🔵 Response: {success: true, messageId: "msg_xyz"}
✅ Message sent successfully!
```

---

## 🚀 Production Recommendations

1. **Use Backend API Calls**:
   - Never expose API credentials in frontend
   - Call Waziper from Supabase Edge Functions
   - Frontend calls Supabase, Supabase calls Waziper

2. **Secure Credentials**:
   - Store in Supabase Secrets
   - Use environment variables
   - Never commit to Git

3. **Error Handling**:
   - Show user-friendly error messages
   - Log errors to database
   - Implement retry logic

4. **Rate Limiting**:
   - Add delays between messages
   - Queue messages for bulk sending
   - Monitor API limits

---

## 📚 Resources

- **Waziper API**: https://wapp.synthory.space
- **Your Instance**: 696EEF066DBC0
- **Support**: Contact Waziper support for API issues
- **CORS Info**: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS

---

**Last Updated**: January 30, 2026  
**Version**: 1.0  
**Status**: Production Ready (with backend proxy)
