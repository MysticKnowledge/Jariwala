# 🔧 Fix Bulk Import Errors - Troubleshooting Guide

## ❌ Error: "Failed to fetch"

This error means the server function either:
1. **Hasn't been deployed yet**
2. **CORS issues**
3. **Network connectivity issues**

---

## ✅ SOLUTION - Deploy Server Function

### **Step 1: Deploy the Server Function**

Run this command to deploy:

```bash
supabase functions deploy server
```

Or use the deployment script:

**Linux/Mac:**
```bash
chmod +x deploy-server-import.sh
./deploy-server-import.sh
```

**Windows:**
```cmd
deploy-server-import.bat
```

### **Step 2: Verify Deployment**

Test the health endpoint:

```bash
curl https://ydkavqhmbenwypuzitlw.supabase.co/functions/v1/make-server-c45d1eeb/health
```

Should return:
```json
{"status":"ok"}
```

### **Step 3: Test Bulk Import Endpoint**

The endpoint should be available at:
```
https://ydkavqhmbenwypuzitlw.supabase.co/functions/v1/make-server-c45d1eeb/bulk-import
```

---

## 🔍 Common Issues & Fixes

### **Issue 1: "Failed to fetch" - Server Not Deployed**

**Symptoms:**
- Error in console: `TypeError: Failed to fetch`
- No response from server

**Fix:**
```bash
# Deploy the server function
supabase functions deploy server

# Wait for deployment to complete (~30 seconds)
# Then refresh the page and try again
```

---

### **Issue 2: "Authorization header required"**

**Symptoms:**
- Error: `Authorization header required`
- 401 Unauthorized

**Fix:**
This is now handled! The updated code allows anon key for demo purposes. Make sure you've deployed the latest version:

```bash
supabase functions deploy server
```

---

### **Issue 3: "No file uploaded"**

**Symptoms:**
- Error: `No file uploaded`
- 400 Bad Request

**Fix:**
- Make sure you've selected a file
- File must be .xlsx, .xls, or .csv
- File size should be under 10MB

---

### **Issue 4: CORS Error**

**Symptoms:**
- Error in console: `CORS policy`
- Network tab shows OPTIONS request failed

**Fix:**
The server function already has CORS enabled. If you still see this:

1. Check server function has CORS middleware:
```typescript
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }),
);
```

2. Redeploy:
```bash
supabase functions deploy server
```

---

### **Issue 5: "SKU code not found" / "Location code not found"**

**Symptoms:**
- Validation errors for SKU or location codes
- Red error boxes in preview

**Fix:**
1. Make sure your database has product variants and locations created
2. Check the exact SKU codes in your database:
```sql
SELECT sku_code FROM product_variants;
```

3. Check location codes:
```sql
SELECT location_code FROM locations;
```

4. Update your Excel file to match the exact codes from database

---

## 📋 Deployment Checklist

Before importing, make sure:

- [ ] Server function deployed: `supabase functions deploy server`
- [ ] Health endpoint works: `curl https://ydkavqhmbenwypuzitlw.supabase.co/functions/v1/make-server-c45d1eeb/health`
- [ ] Database has product variants created
- [ ] Database has locations created
- [ ] Excel file has correct column names
- [ ] SKU codes match database exactly
- [ ] Location codes match database exactly

---

## 🧪 Test with Sample Data

### **Step 1: Create Test Data in Database**

First, make sure you have some product variants and locations:

```sql
-- Check if you have variants
SELECT sku_code FROM product_variants LIMIT 5;

-- Check if you have locations
SELECT location_code FROM locations LIMIT 5;
```

### **Step 2: Download Template**

Click "Download Template" button in the UI to get a sample CSV.

### **Step 3: Update Template**

Replace the SKU codes and location codes in the template with actual codes from your database.

### **Step 4: Upload & Test**

1. Upload the updated template
2. Click "Preview & Validate"
3. Should show 3 valid rows, 0 errors
4. Click "Import 3 Records"
5. Success! ✅

---

## 🔧 Debug Mode

To see detailed errors, open browser console (F12) and look for:

1. **Request URL:**
   ```
   https://ydkavqhmbenwypuzitlw.supabase.co/functions/v1/make-server-c45d1eeb/bulk-import
   ```

2. **Response Status:**
   - `200` = Success
   - `400` = Bad Request (check error message)
   - `401` = Unauthorized (should not happen with updated code)
   - `500` = Server Error (check server logs)

3. **Console Logs:**
   - "Sending preview request to: ..."
   - "Response status: ..."
   - "Response data: ..."

---

## ✅ Fixes Applied

I've already fixed these issues:

1. ✅ **Authentication**: Server now accepts anon key for demo
2. ✅ **CORS**: Enabled in server function
3. ✅ **Error Handling**: Better error messages in frontend
4. ✅ **Console Logging**: Added debug logs to track issues

---

## 🚀 Quick Fix - Redeploy Everything

If nothing works, redeploy everything:

```bash
# 1. Deploy server function
supabase functions deploy server

# 2. Wait 30 seconds for deployment

# 3. Test health endpoint
curl https://ydkavqhmbenwypuzitlw.supabase.co/functions/v1/make-server-c45d1eeb/health

# 4. Refresh browser page

# 5. Try uploading file again
```

---

## 📞 Still Having Issues?

Check these:

1. **Network Tab (F12):**
   - Look for the bulk-import request
   - Check response status and body
   - Look for CORS errors

2. **Console Tab (F12):**
   - Look for JavaScript errors
   - Check console.log messages
   - Look for "Failed to fetch" details

3. **Supabase Dashboard:**
   - Check if function is deployed
   - Check function logs for errors
   - Verify environment variables are set

---

## ✅ Expected Behavior After Fix

After deploying the server function:

1. **Upload file** → File name and size shown ✅
2. **Click "Preview & Validate"** → Shows "Validating..." ✅
3. **Wait 2-5 seconds** → Preview results shown ✅
4. **Click "Import X Records"** → Shows "Importing..." ✅
5. **Wait 2-5 seconds** → Success message shown ✅

---

## 🎉 Status After Fix

- ✅ Server function updated (allows anon key)
- ✅ Frontend updated (better error handling)
- ✅ Console logging added (debug mode)
- ✅ Ready to deploy and test!

---

**Next Step:** Deploy the server function!

```bash
supabase functions deploy server
```

Then refresh the page and try again! 🚀
