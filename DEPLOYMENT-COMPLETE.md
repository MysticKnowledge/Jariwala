# 🚀 Complete Deployment Guide

## Overview

This retail inventory system features:
- **Event-driven ledger** - Immutable transaction log
- **Row-level security** - Database-enforced permissions
- **Edge Functions** - Serverless sync and WhatsApp bot
- **Real-time reports** - 5 comprehensive reporting views
- **Offline-first** - Sync queue with idempotency
- **Multi-location** - Stores, godowns, and Amazon

## 📦 What's Included

### Database Components
1. **Master Tables**: products, variants, locations, roles, user_profiles
2. **Event Ledger**: Append-only transaction log
3. **Audit Log**: Complete user action tracking
4. **Views**: current_stock_view + 5 reporting views
5. **RLS Policies**: Role-based access control

### Edge Functions
1. **sync_event**: Syncs inventory events with validation
2. **whatsapp_bot**: Automated WhatsApp customer support

### Client SDK
- TypeScript client for sync_event
- Event builders for easy API usage
- Offline queue manager
- Retry logic

## 🎯 Quick Start

### Prerequisites

```bash
# Install Supabase CLI
brew install supabase/tap/supabase

# Login
supabase login

# Link to project
supabase link --project-ref YOUR_PROJECT_REF
```

### Environment Setup

Create `.env` file:

```bash
# Supabase (auto-provided in production)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Database connection
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.your-project.supabase.co:5432/postgres

# WhatsApp Business API
WHATSAPP_ACCESS_TOKEN=your-whatsapp-token
WHATSAPP_VERIFY_TOKEN=your-verify-token
```

### One-Command Deployment

```bash
chmod +x deployment-scripts/*.sh
./deployment-scripts/deploy-all.sh
```

This will:
1. ✅ Deploy database schema
2. ✅ Enable RLS policies
3. ✅ Create reporting views
4. ✅ Deploy Edge Functions
5. ✅ Set environment secrets

### Seed Test Data

```bash
./deployment-scripts/seed-data.sh
```

This creates:
- 4 locations (2 stores, 1 godown, 1 Amazon)
- 3 products with 15 variants
- Initial stock via purchase events
- Sample sales transactions
- WhatsApp opt-ins
- Customer outstanding records

### Create Test Users

```bash
./deployment-scripts/create-test-users.sh
```

Creates 5 test user profiles:
- **OWNER** - Full access
- **MANAGER** - All locations except Amazon
- **STORE_STAFF** - Main Store only
- **GODOWN_STAFF** - Warehouse only
- **ACCOUNTANT** - Read-only access

### Run Tests

```bash
./deployment-scripts/run-tests.sh
```

Validates:
- ✅ Schema integrity
- ✅ RLS enforcement
- ✅ Event ledger constraints
- ✅ Stock calculations
- ✅ Report views
- ✅ Edge functions
- ✅ Idempotency

## 📊 Database Schema

### Master Tables

```sql
products          -- Product catalog (T-Shirt, Jeans, etc.)
├── variants      -- SKU-level (Red T-Shirt Size M)
locations         -- Stores, godowns, Amazon
roles             -- OWNER, MANAGER, STORE_STAFF, GODOWN_STAFF, ACCOUNTANT
user_profiles     -- User-to-role mapping
└── user_location_access  -- Multi-location permissions
```

### Transaction Tables

```sql
event_ledger      -- Immutable transaction log (INSERT only)
├── PURCHASE      -- Stock incoming
├── SALE          -- Customer sale
├── TRANSFER_*    -- Between locations
├── RETURN        -- Customer return
├── EXCHANGE_*    -- Product exchange
└── ADJUSTMENT    -- Manual correction

audit_log         -- User action tracking (no DELETE)
customer_ledger   -- Credit/payment tracking
whatsapp_opt_ins  -- Customer consent
whatsapp_bot_logs -- Bot interaction history
```

### Views

```sql
current_stock_view            -- Real-time stock levels
daily_sales_report            -- Daily revenue breakdown
monthly_product_performance   -- Product rankings
size_wise_demand              -- Size popularity analysis
outstanding_ledger            -- Customer aging report
dead_stock_report             -- Slow-moving items
inventory_summary             -- Dashboard metrics
```

## 🔒 Row Level Security (RLS)

### Access Matrix

| Role | Products | Variants | Event Ledger | Locations | Reports |
|------|----------|----------|--------------|-----------|---------|
| **OWNER** | Read/Write | Read/Write | Read/Write | All | All |
| **MANAGER** | Read/Write | Read/Write | Read/Write | All | All |
| **STORE_STAFF** | Read | Read | Own Store | Own Store | Limited |
| **GODOWN_STAFF** | Read | Read | Own Godown | Own Godown | Limited |
| **ACCOUNTANT** | Read | Read | Read-only | All | All |

### RLS Functions

```sql
get_user_role()              -- Returns current user's role
is_owner_or_manager()        -- Check if user is owner/manager
get_user_location_ids()      -- Returns accessible location IDs
has_location_access(uuid)    -- Check specific location access
```

## ⚡ Edge Functions

### sync_event

**Purpose**: Sync inventory events from clients

**Endpoint**: `POST /functions/v1/sync_event`

**Request**:
```json
{
  "event_type": "SALE",
  "variant_id": "uuid",
  "quantity": -5,
  "from_location_id": "uuid",
  "channel": "STORE",
  "reference_number": "INV-2026-0001",
  "total_amount": 2495.00
}
```

**Response**:
```json
{
  "success": true,
  "event_id": "uuid",
  "message": "Event synchronized successfully"
}
```

**Validation**:
1. ✅ Authentication
2. ✅ Event structure
3. ✅ User role permissions
4. ✅ Location access
5. ✅ Stock availability (for SALE/TRANSFER_OUT)
6. ✅ Database constraints

### whatsapp_bot

**Purpose**: Handle WhatsApp customer inquiries

**Webhook**: `POST /functions/v1/whatsapp_bot`

**Capabilities**:
- Order status lookup
- Stock availability check
- Help messages
- Opt-in verification

**Intents**:
```
Order Status: "Where is my order INV-2026-0001?"
Stock Check:  "Do you have Red T-Shirt size M?"
Help:         "Hi" or "Help"
```

## 🧪 Testing Scenarios

### Test 1: OWNER - Full Access

```bash
# As OWNER user
curl -X POST https://your-project.supabase.co/functions/v1/sync_event \
  -H "Authorization: Bearer OWNER_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "PURCHASE",
    "variant_id": "10000000-0000-0000-0000-000000000001",
    "quantity": 100,
    "to_location_id": "33333333-3333-3333-3333-333333333333",
    "channel": "MANUAL"
  }'

# Expected: ✅ Success
```

### Test 2: STORE_STAFF - Limited Access

```bash
# As STORE_STAFF user, trying to access warehouse
curl -X POST https://your-project.supabase.co/functions/v1/sync_event \
  -H "Authorization: Bearer STAFF_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "PURCHASE",
    "variant_id": "10000000-0000-0000-0000-000000000001",
    "quantity": 50,
    "to_location_id": "33333333-3333-3333-3333-333333333333",
    "channel": "MANUAL"
  }'

# Expected: ❌ 403 - No access to warehouse
```

### Test 3: ACCOUNTANT - Read Only

```bash
# As ACCOUNTANT user, trying to create event
curl -X POST https://your-project.supabase.co/functions/v1/sync_event \
  -H "Authorization: Bearer ACCOUNTANT_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "SALE",
    "variant_id": "10000000-0000-0000-0000-000000000001",
    "quantity": -1,
    "from_location_id": "11111111-1111-1111-1111-111111111111",
    "channel": "STORE"
  }'

# Expected: ❌ 403 - ACCOUNTANT cannot create events
```

### Test 4: Insufficient Stock

```bash
# Try to sell more than available
curl -X POST https://your-project.supabase.co/functions/v1/sync_event \
  -H "Authorization: Bearer STAFF_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "SALE",
    "variant_id": "10000000-0000-0000-0000-000000000001",
    "quantity": -1000,
    "from_location_id": "11111111-1111-1111-1111-111111111111",
    "channel": "STORE"
  }'

# Expected: ❌ 400 - Insufficient stock
# Response includes available vs requested quantity
```

### Test 5: Offline Sync Idempotency

```bash
# First sync with specific event_id
curl -X POST https://your-project.supabase.co/functions/v1/sync_event \
  -H "Authorization: Bearer STAFF_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "offline1-1111-1111-1111-111111111111",
    "event_type": "SALE",
    "variant_id": "10000000-0000-0000-0000-000000000001",
    "quantity": -2,
    "from_location_id": "11111111-1111-1111-1111-111111111111",
    "sync_source": "POS-001",
    "client_timestamp": "2026-01-30T10:00:00Z"
  }'

# Expected: ✅ Success, returns event_id

# Retry same event (simulate network retry)
curl -X POST https://your-project.supabase.co/functions/v1/sync_event \
  -H "Authorization: Bearer STAFF_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "event_id": "offline1-1111-1111-1111-111111111111",
    "event_type": "SALE",
    "variant_id": "10000000-0000-0000-0000-000000000001",
    "quantity": -2,
    "from_location_id": "11111111-1111-1111-1111-111111111111",
    "sync_source": "POS-001",
    "client_timestamp": "2026-01-30T10:00:00Z"
  }'

# Expected: ✅ Success, same event_id (idempotent - no duplicate)
```

### Test 6: WhatsApp Bot - Order Status

```bash
# Simulate WhatsApp webhook
curl -X POST https://your-project.supabase.co/functions/v1/whatsapp_bot \
  -H "Content-Type: application/json" \
  -d '{
    "object": "whatsapp_business_account",
    "entry": [{
      "changes": [{
        "value": {
          "messaging_product": "whatsapp",
          "metadata": {
            "phone_number_id": "123456789"
          },
          "messages": [{
            "from": "+919876543210",
            "type": "text",
            "text": {
              "body": "Order status INV-2026-0001"
            }
          }]
        }
      }]
    }]
  }'

# Expected: Bot responds with order details
```

## 📈 Reports & Queries

### Daily Sales

```sql
SELECT * FROM daily_sales_report
WHERE sale_date = CURRENT_DATE
ORDER BY total_revenue DESC;
```

### Top Products This Month

```sql
SELECT 
  product_name, 
  color,
  units_sold, 
  net_revenue,
  sales_rank
FROM monthly_product_performance
WHERE month = DATE_TRUNC('month', CURRENT_DATE)
ORDER BY sales_rank;
```

### Size Demand Analysis

```sql
SELECT 
  product_category,
  size,
  units_sold_30d,
  current_stock,
  reorder_status
FROM size_wise_demand
WHERE product_category = 'T-Shirt'
ORDER BY size_popularity_rank;
```

### Dead Stock

```sql
SELECT 
  product_name,
  sku_code,
  size,
  color,
  current_stock,
  days_since_last_sale,
  stock_classification,
  action_recommendation
FROM dead_stock_report
WHERE stock_classification IN ('DEAD - NEVER_SOLD', 'DEAD - NO_MOVEMENT_6M')
ORDER BY stock_value_cost DESC;
```

### Outstanding Customers

```sql
SELECT 
  customer_name,
  customer_phone,
  outstanding_amount,
  outstanding_0_30_days,
  outstanding_31_60_days,
  outstanding_over_90_days,
  status
FROM outstanding_ledger
WHERE status = 'OVERDUE'
ORDER BY outstanding_amount DESC;
```

## 🔄 Offline Sync Workflow

```typescript
// Client-side sync queue
import { OfflineQueueManager, EventBuilder } from './sync-event-client'

// 1. Create event with client-generated ID
const event = EventBuilder
  .sale(variantId, quantity, locationId)
  .withEventId(crypto.randomUUID())  // Generate ID on client
  .withSyncSource('POS-STORE-001')
  .withClientTimestamp(new Date().toISOString())
  .build()

// 2. Add to offline queue
await queueManager.enqueue(event)

// 3. When online, process queue
const result = await queueManager.processPending()
console.log(`Synced: ${result.synced}, Failed: ${result.failed}`)

// 4. Idempotency ensures no duplicates on retry
```

## 📱 Client SDK Usage

```typescript
import { SyncEventClient, EventBuilder } from './sync-event-client'
import { supabase } from './supabase'

const client = new SyncEventClient(supabase)

// Sale
await client.sync(
  EventBuilder
    .sale(variantId, 5, storeId)
    .withChannel('STORE')
    .withReference('BILL', billId, 'INV-001')
    .withPricing(250, 599, 2995)
    .build()
)

// Purchase
await client.sync(
  EventBuilder
    .purchase(variantId, 100, godownId)
    .withReference('PURCHASE_ORDER', null, 'PO-001')
    .withPricing(250)
    .build()
)

// Transfer
await client.sync(
  EventBuilder
    .transfer(variantId, 20, storeId, godownId)
    .withReference('TRANSFER_NOTE', null, 'TN-001')
    .build()
)
```

## 🛠️ Maintenance

### Refresh Stock View (if using materialized)

```sql
REFRESH MATERIALIZED VIEW CONCURRENTLY current_stock_materialized;
```

### View Edge Function Logs

```bash
supabase functions logs sync_event --tail
supabase functions logs whatsapp_bot --tail
```

### Check Sync Queue

```sql
SELECT 
  status,
  COUNT(*) as count,
  MIN(created_at) as oldest,
  MAX(created_at) as newest
FROM sync_queue
GROUP BY status;
```

### Monitor Performance

```sql
SELECT 
  query,
  calls,
  mean_time,
  max_time
FROM pg_stat_statements
WHERE query LIKE '%event_ledger%'
ORDER BY mean_time DESC
LIMIT 10;
```

## 🚨 Troubleshooting

### Issue: RLS blocks all queries

```sql
-- Check user profile exists
SELECT * FROM user_profiles WHERE user_id = auth.uid();

-- Check role
SELECT get_user_role();

-- Check location access
SELECT * FROM get_user_location_ids();
```

### Issue: Insufficient stock on valid sale

```sql
-- Check current stock
SELECT * FROM current_stock_view 
WHERE variant_id = 'YOUR_VARIANT_ID' 
AND location_id = 'YOUR_LOCATION_ID';

-- Check recent events
SELECT * FROM event_ledger 
WHERE variant_id = 'YOUR_VARIANT_ID'
ORDER BY created_at DESC 
LIMIT 10;
```

### Issue: Edge function returns 401

- Check JWT token is valid
- Verify user has active profile
- Confirm auth.users entry exists

## 📞 Support

For issues:
1. Check Edge Function logs
2. Verify RLS policies
3. Test with direct SQL queries
4. Review audit_log for error details

## ✅ Production Checklist

- [ ] Database schema deployed
- [ ] RLS policies tested for all roles
- [ ] Edge functions deployed
- [ ] Secrets configured
- [ ] Initial data loaded
- [ ] User profiles created
- [ ] Stock calculations verified
- [ ] Reports accessible
- [ ] Offline sync tested
- [ ] Idempotency verified
- [ ] Backup strategy in place
- [ ] Monitoring configured
- [ ] Team trained

## 🎉 You're Ready!

Your retail inventory system is now fully deployed with:
- ✅ Event-driven architecture
- ✅ Database-level security
- ✅ Real-time stock tracking
- ✅ Comprehensive reporting
- ✅ Offline-first sync
- ✅ WhatsApp automation

Deploy with confidence! 🚀
