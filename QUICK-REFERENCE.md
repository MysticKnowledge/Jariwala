# 📋 Quick Reference Card

## 🚀 **Deploy to Production**

```bash
./deploy-whatsapp-edge-functions.sh
```

---

## 📚 **Key Documents**

| Read This First | Purpose |
|----------------|---------|
| **`/START-HERE.md`** | ⭐ One-command deployment |
| **`/FINAL-SUMMARY.md`** | What's ready & next steps |
| **`/PRODUCTION-SETUP.md`** | Complete production guide |

---

## 🔗 **Your App**

**URL:** https://jariwala.figma.site  
**Login:** owner001 / password123  
**WhatsApp:** Dashboard → WhatsApp Panel

---

## ⚡ **Quick Commands**

```bash
# Deploy all Edge Functions
./deploy-whatsapp-edge-functions.sh

# List deployed functions
supabase functions list

# View logs
supabase functions logs

# Login to Supabase
supabase login
```

---

## ✅ **After Deployment**

1. Go to jariwala.figma.site
2. Login as owner001
3. Open WhatsApp panel
4. Click "Generate QR Code"
5. ✅ Should work!

---

## 🔍 **Verify Success**

### **Browser Console:**
```
✅ Using Supabase Edge Functions
✅ No CORS errors
```

### **Command Line:**
```bash
supabase functions list
# Should show 5 functions
```

---

## 🐛 **Troubleshooting**

| Issue | Solution |
|-------|----------|
| Command not found | `npm install -g supabase` |
| Not logged in | `supabase login` |
| Still CORS errors | Hard refresh (Ctrl+Shift+R) |
| Need help | See `/TROUBLESHOOTING-WAZIPER.md` |

---

## 📊 **What Gets Deployed**

- ✅ whatsapp-send (Send messages)
- ✅ whatsapp-qrcode (QR authentication)
- ✅ whatsapp-manage (Status, reboot, reconnect)
- ✅ waziper-webhook (Receive messages)
- ✅ whatsapp_bot (AI support)

---

## 🎯 **Configuration**

**Waziper API:**
- Instance: 696EEF066DBC0
- Token: 68f200af61c2c
- Status: ✅ Configured

**Supabase:**
- Status: ✅ Connected
- Edge Functions: ✅ Ready

---

## 💡 **Quick Tips**

- **Deploy:** Run the script once
- **Verify:** Check console for "Using Edge Functions"
- **Test:** QR code should work
- **Monitor:** Use `supabase functions logs`
- **Help:** See START-HERE.md

---

## 🎉 **Deploy Now!**

```bash
./deploy-whatsapp-edge-functions.sh
```

**Time:** 2 minutes  
**Result:** Production-ready!

---

**Status:** ✅ Ready  
**Action:** 🚀 Deploy
