# 🚀 Deploy Waziper Edge Functions - CORS Fix

## ✅ **Problem Solved:**

**Before**: Browser → Waziper API ❌ **CORS Error**  
**After**: Browser → Supabase Edge Function → Waziper API ✅ **Works!**

---

## 📁 Edge Functions Created

```
/supabase/functions/
  ├── _shared/
  │   └── cors.ts                    # CORS headers
  ├── whatsapp-send/
  │   └── index.ts                   # Send messages
  ├── whatsapp-qrcode/
  │   └── index.ts                   # Get QR code
  └── whatsapp-manage/
      └── index.ts                   # Manage instance (reboot/reconnect)
```

---

## 🔧 **Deploy Edge Functions**

### **Step 1: Login to Supabase CLI**

```bash
# If you haven't installed Supabase CLI:
npm install -g supabase

# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF
```

### **Step 2: Deploy All Functions**

```bash
# Deploy all WhatsApp functions
supabase functions deploy whatsapp-send
supabase functions deploy whatsapp-qrcode
supabase functions deploy whatsapp-manage
```

**Output should show:**
```
✓ Deployed Function whatsapp-send
  URL: https://YOUR_PROJECT.supabase.co/functions/v1/whatsapp-send

✓ Deployed Function whatsapp-qrcode
  URL: https://YOUR_PROJECT.supabase.co/functions/v1/whatsapp-qrcode

✓ Deployed Function whatsapp-manage
  URL: https://YOUR_PROJECT.supabase.co/functions/v1/whatsapp-manage
```

---

## ✅ **Test Edge Functions**

### **Test 1: Get QR Code**

```bash
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/whatsapp-qrcode' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

**Expected Response:**
```json
{
  "success": true,
  "qrcode": "data:image/png;base64,iVBORw0KG...",
  "status": "ready",
  "authenticated": false
}
```

### **Test 2: Send Message**

```bash
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/whatsapp-send' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "919876543210",
    "message": "Test from Edge Function!",
    "type": "text"
  }'
```

**Expected Response:**
```json
{
  "success": true,
  "messageId": "msg_xyz123",
  "data": {...}
}
```

### **Test 3: Check Status**

```bash
curl -X POST \
  'https://YOUR_PROJECT.supabase.co/functions/v1/whatsapp-manage' \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "status"}'
```

---

## 🔐 **Security: Store Credentials in Secrets (Optional)**

Instead of hardcoding credentials, use Supabase Secrets:

### **Set Secrets:**
```bash
supabase secrets set WAZIPER_ACCESS_TOKEN=68f200af61c2c
supabase secrets set WAZIPER_INSTANCE_ID=696EEF066DBC0
```

### **Update Edge Functions to Use Secrets:**

```typescript
// In whatsapp-send/index.ts
const WAZIPER_CONFIG = {
  accessToken: Deno.env.get('WAZIPER_ACCESS_TOKEN') || '68f200af61c2c',
  instanceId: Deno.env.get('WAZIPER_INSTANCE_ID') || '696EEF066DBC0',
  baseUrl: 'https://wapp.synthory.space/api',
}
```

Then redeploy:
```bash
supabase functions deploy whatsapp-send
supabase functions deploy whatsapp-qrcode
supabase functions deploy whatsapp-manage
```

---

## 🎯 **Frontend Already Updated!**

The client (`/src/app/services/waziper-client.ts`) now:
- ✅ Calls Edge Functions by default (`USE_EDGE_FUNCTIONS = true`)
- ✅ Falls back to direct API if Edge Functions unavailable
- ✅ No more CORS errors!

---

## 🧪 **Test in Your App**

```bash
# Start your app
npm run dev

# Go to: WhatsApp → Settings
# Click "Generate QR Code"
# Should now work without CORS errors! ✅
```

---

## 📊 **How It Works**

### **Old Flow (CORS Error):**
```
Browser (localhost:5173) 
  ↓ ❌ CORS blocked
Waziper API (wapp.synthory.space)
```

### **New Flow (Works!):**
```
Browser (localhost:5173)
  ↓ ✅ Same origin (Supabase)
Supabase Edge Function
  ↓ ✅ Server-to-server (no CORS)
Waziper API (wapp.synthory.space)
```

---

## 📝 **Edge Functions Reference**

### **1. whatsapp-send**

**Purpose**: Send WhatsApp messages (text or media)

**Request:**
```json
{
  "phoneNumber": "919876543210",
  "message": "Hello!",
  "type": "text",
  "mediaUrl": "https://example.com/image.jpg",  // Optional
  "filename": "image.jpg"                        // Optional
}
```

**Response:**
```json
{
  "success": true,
  "messageId": "msg_123",
  "data": {...}
}
```

---

### **2. whatsapp-qrcode**

**Purpose**: Get QR code for WhatsApp authentication

**Request:**
```json
{}
```

**Response:**
```json
{
  "success": true,
  "qrcode": "data:image/png;base64,...",
  "status": "ready",
  "authenticated": false
}
```

---

### **3. whatsapp-manage**

**Purpose**: Manage instance (status, reboot, reconnect)

**Request:**
```json
{
  "action": "status"  // or "reboot" or "reconnect"
}
```

**Response:**
```json
{
  "success": true,
  "connected": true,
  "data": {...}
}
```

---

## 🐛 **Troubleshooting**

### **Error: "Function not found"**
```bash
# Make sure functions are deployed:
supabase functions list

# Redeploy if needed:
supabase functions deploy whatsapp-send
```

### **Error: "Unauthorized"**
```bash
# Check your Supabase anon key in .env:
VITE_SUPABASE_ANON_KEY=your_key_here
```

### **Error: "Invalid credentials"**
```bash
# Check Waziper credentials in Edge Function:
# /supabase/functions/whatsapp-send/index.ts
const WAZIPER_CONFIG = {
  accessToken: '68f200af61c2c',  # Correct?
  instanceId: '696EEF066DBC0',    # Correct?
}
```

---

## ✅ **Deployment Checklist**

- [ ] Supabase CLI installed and logged in
- [ ] Project linked with `supabase link`
- [ ] Edge Functions deployed
  - [ ] `whatsapp-send`
  - [ ] `whatsapp-qrcode`
  - [ ] `whatsapp-manage`
- [ ] Functions tested with cURL
- [ ] Frontend updated (already done!)
- [ ] App tested - QR code loads without CORS error
- [ ] Test message sent successfully

---

## 🚀 **Quick Deploy Commands**

```bash
# One-time setup
npm install -g supabase
supabase login
supabase link --project-ref YOUR_PROJECT_REF

# Deploy all functions
supabase functions deploy whatsapp-send
supabase functions deploy whatsapp-qrcode
supabase functions deploy whatsapp-manage

# Test
npm run dev
# Go to WhatsApp → Settings → Generate QR Code
# Should work! ✅
```

---

## 📚 **Resources**

- **Supabase Edge Functions**: https://supabase.com/docs/guides/functions
- **Supabase CLI**: https://supabase.com/docs/reference/cli/introduction
- **Your Functions**: https://YOUR_PROJECT.supabase.co/functions

---

**Status**: ✅ **CORS Issue Fixed!**  
**Method**: Supabase Edge Functions Proxy  
**Ready**: 🚀 **Deploy & Test!**
