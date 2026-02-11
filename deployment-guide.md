# Deployment Guide - Retail Inventory System

Complete guide to deploying the event-driven retail inventory system with PostgreSQL database and Supabase Edge Functions.

## Prerequisites

- PostgreSQL 14+ (or Supabase project)
- Supabase CLI (for Edge Functions)
- Node.js 18+ (for client applications)
- TypeScript (optional, for type safety)

## Part 1: Database Setup

### Step 1: Create Database Schema

Execute the SQL files in this order:

```bash
# 1. Create master tables and basic structure
psql -U postgres -d your_database -f database-schema.sql

# 2. Create event ledger and RLS policies
psql -U postgres -d your_database -f database-event-ledger-rls.sql
```

Or if using Supabase:

```bash
# Copy contents of SQL files and execute in Supabase SQL Editor
# 1. Execute database-schema.sql
# 2. Execute database-event-ledger-rls.sql
```

### Step 2: Insert Initial Data

```sql
-- Create initial locations
INSERT INTO locations (name, type, address_line1, city, state, is_active) VALUES
('Main Store', 'STORE', '123 Main Street', 'Mumbai', 'Maharashtra', true),
('Warehouse 1', 'GODOWN', '456 Industrial Area', 'Mumbai', 'Maharashtra', true),
('Amazon India', 'AMAZON', 'Virtual', 'Online', 'Online', true);

-- Create sample products
INSERT INTO products (name, category, company, hsn_code) VALUES
('Cotton T-Shirt', 'T-Shirt', 'FashionBrand', '61091000'),
('Denim Jeans', 'Jeans', 'DenimCo', '62034200');

-- Create sample variants
INSERT INTO variants (product_id, size, color, sku_code, cost_price, mrp, selling_price, barcode)
SELECT 
    p.id,
    s.size,
    c.color,
    CONCAT('TS-', LEFT(c.color, 3), '-', s.size),
    250.00,
    799.00,
    599.00,
    CONCAT('BAR', LPAD((ROW_NUMBER() OVER())::text, 10, '0'))
FROM products p
CROSS JOIN (VALUES ('S'), ('M'), ('L'), ('XL'), ('XXL')) AS s(size)
CROSS JOIN (VALUES ('Red'), ('Blue'), ('Black'), ('White')) AS c(color)
WHERE p.name = 'Cotton T-Shirt';
```

### Step 3: Create Users

```sql
-- Note: This assumes Supabase Auth is handling user authentication
-- Create user profiles for existing auth users

-- Example: Create OWNER user
INSERT INTO user_profiles (
    user_id, 
    role_id, 
    full_name, 
    employee_code, 
    primary_location_id,
    is_active
)
SELECT 
    'AUTH_USER_UUID_HERE'::uuid,
    (SELECT id FROM roles WHERE name = 'OWNER'),
    'John Owner',
    'EMP001',
    (SELECT id FROM locations WHERE name = 'Main Store' LIMIT 1),
    true;

-- Create STORE_STAFF user
INSERT INTO user_profiles (
    user_id, 
    role_id, 
    full_name, 
    employee_code, 
    primary_location_id,
    is_active
)
SELECT 
    'AUTH_USER_UUID_HERE'::uuid,
    (SELECT id FROM roles WHERE name = 'STORE_STAFF'),
    'Jane Staff',
    'EMP002',
    (SELECT id FROM locations WHERE name = 'Main Store' LIMIT 1),
    true;
```

### Step 4: Grant Location Access

```sql
-- Grant multi-location access
INSERT INTO user_location_access (user_profile_id, location_id, can_view, can_edit)
SELECT 
    up.id,
    l.id,
    true,
    true
FROM user_profiles up
CROSS JOIN locations l
WHERE up.employee_code = 'EMP001'; -- Owner has access to all
```

### Step 5: Verify RLS Policies

```sql
-- Test RLS policies are active
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('event_ledger', 'products', 'variants', 'locations', 'user_profiles');

-- Should show rowsecurity = true for all tables
```

## Part 2: Edge Function Deployment

### Step 1: Install Supabase CLI

```bash
# macOS
brew install supabase/tap/supabase

# Windows (via Scoop)
scoop bucket add supabase https://github.com/supabase/scoop-bucket.git
scoop install supabase

# Linux
brew install supabase/tap/supabase
```

### Step 2: Login to Supabase

```bash
supabase login
```

### Step 3: Link to Your Project

```bash
supabase link --project-ref your-project-ref
```

### Step 4: Deploy Edge Function

```bash
# Deploy sync_event function
supabase functions deploy sync_event

# Verify deployment
supabase functions list
```

### Step 5: Set Environment Variables (if needed)

```bash
# Set secrets for edge function (if required)
supabase secrets set MY_SECRET_KEY=value
```

### Step 6: Test Edge Function

```bash
# Test locally first
supabase functions serve sync_event

# In another terminal, test with curl
curl -X POST http://localhost:54321/functions/v1/sync_event \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "PURCHASE",
    "variant_id": "VARIANT_UUID",
    "quantity": 100,
    "to_location_id": "LOCATION_UUID",
    "channel": "STORE"
  }'
```

## Part 3: Client Application Setup

### Step 1: Install Dependencies

```bash
# Install Supabase client
npm install @supabase/supabase-js

# Or with yarn
yarn add @supabase/supabase-js
```

### Step 2: Initialize Supabase Client

```typescript
// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
```

### Step 3: Use Sync Event Client

```typescript
// src/lib/sync-client.ts
import { SyncEventClient, EventBuilder } from './sync-event-client'
import { supabase } from './supabase'

export const syncClient = new SyncEventClient(supabase)

// Example: Create a sale
export async function createSale(
  variantId: string,
  quantity: number,
  locationId: string,
  billNumber: string,
  totalAmount: number
) {
  const event = EventBuilder
    .sale(variantId, quantity, locationId)
    .withReference('BILL', null, billNumber)
    .withPricing(undefined, undefined, totalAmount)
    .withChannel('STORE')
    .build()

  const result = await syncClient.sync(event)
  
  if (!result.success) {
    throw new Error(result.error || 'Failed to sync sale')
  }
  
  return result
}
```

## Part 4: Verification & Testing

### Test 1: Create Purchase Event

```typescript
const result = await syncClient.sync(
  EventBuilder
    .purchase('VARIANT_UUID', 100, 'GODOWN_UUID')
    .withReference('PURCHASE_ORDER', null, 'PO-001')
    .withPricing(250)
    .build()
)

console.log(result)
// Expected: { success: true, event_id: "...", message: "..." }
```

### Test 2: Verify Stock Calculation

```sql
-- Check current stock
SELECT 
    product_name,
    sku_code,
    location_name,
    current_quantity,
    stock_status
FROM current_stock_view
WHERE sku_code = 'YOUR_SKU_CODE';
```

### Test 3: Test Stock Validation

```typescript
// Try to sell more than available
const result = await syncClient.sync(
  EventBuilder
    .sale('VARIANT_UUID', 1000, 'STORE_UUID') // Too much
    .build()
)

console.log(result)
// Expected: { success: false, error: "Insufficient stock", details: {...} }
```

### Test 4: Test Role Restrictions

```sql
-- Login as ACCOUNTANT
-- Try to create sale event
-- Should fail with 403 error
```

### Test 5: View Event History

```sql
-- View all events for a variant
SELECT 
    event_type,
    quantity,
    channel,
    reference_number,
    created_at,
    created_by
FROM event_ledger
WHERE variant_id = 'YOUR_VARIANT_UUID'
ORDER BY created_at DESC;
```

## Part 5: Performance Optimization

### Refresh Materialized Views (if using)

```sql
-- Set up scheduled refresh (example for daily refresh)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily refresh at 2 AM
SELECT cron.schedule(
    'refresh-stock-view',
    '0 2 * * *',
    'REFRESH MATERIALIZED VIEW CONCURRENTLY current_stock_levels'
);
```

### Create Indexes for Common Queries

```sql
-- Additional indexes based on your query patterns
CREATE INDEX IF NOT EXISTS idx_event_ledger_created_at_variant 
    ON event_ledger(created_at DESC, variant_id);

CREATE INDEX IF NOT EXISTS idx_event_ledger_location_date 
    ON event_ledger(from_location_id, created_at DESC) 
    WHERE from_location_id IS NOT NULL;
```

### Monitor Query Performance

```sql
-- Check slow queries
SELECT 
    query,
    calls,
    total_time,
    mean_time,
    max_time
FROM pg_stat_statements
WHERE query LIKE '%event_ledger%'
ORDER BY mean_time DESC
LIMIT 10;
```

## Part 6: Backup & Recovery

### Database Backup

```bash
# Full database backup
pg_dump -U postgres -d your_database -F c -f backup_$(date +%Y%m%d).dump

# Restore
pg_restore -U postgres -d your_database backup_20260130.dump
```

### Supabase Backup

```bash
# Supabase handles automatic backups
# Manual backup via CLI
supabase db dump -f backup.sql

# Restore
psql -U postgres -d your_database -f backup.sql
```

## Part 7: Monitoring & Alerts

### Set Up Monitoring

```sql
-- Create monitoring view
CREATE VIEW system_health AS
SELECT 
    (SELECT COUNT(*) FROM event_ledger WHERE created_at > NOW() - INTERVAL '1 hour') as events_last_hour,
    (SELECT COUNT(*) FROM event_ledger WHERE created_at > NOW() - INTERVAL '1 day') as events_last_day,
    (SELECT COUNT(*) FROM current_stock_view WHERE current_quantity < 0) as negative_stock_count,
    (SELECT COUNT(*) FROM current_stock_view WHERE stock_status = 'LOW_STOCK') as low_stock_count,
    pg_size_pretty(pg_database_size(current_database())) as database_size;

-- Check health
SELECT * FROM system_health;
```

### Edge Function Logs

```bash
# View edge function logs
supabase functions logs sync_event --tail

# Filter by time
supabase functions logs sync_event --since 1h
```

## Part 8: Production Checklist

- [ ] Database schema deployed
- [ ] RLS policies enabled and tested
- [ ] Initial data loaded (locations, products, roles)
- [ ] User profiles created
- [ ] Edge function deployed
- [ ] Edge function tested
- [ ] Client SDK integrated
- [ ] Stock validation working
- [ ] Role-based access working
- [ ] Offline sync tested
- [ ] Performance indexes created
- [ ] Backup strategy in place
- [ ] Monitoring set up
- [ ] Documentation updated
- [ ] Team trained

## Troubleshooting

### Issue: RLS blocks all queries

**Solution**: Check if user has valid profile and role
```sql
SELECT * FROM user_profiles WHERE user_id = auth.uid();
```

### Issue: Edge function returns 401

**Solution**: Check JWT token is valid and not expired

### Issue: Insufficient stock error on valid sale

**Solution**: Refresh current_stock_view or check for concurrent transactions
```sql
SELECT * FROM current_stock_view WHERE variant_id = '...' AND location_id = '...';
```

### Issue: Event ledger insert fails

**Solution**: Check constraints and validation
```sql
-- Check last error
SELECT * FROM pg_stat_activity WHERE state = 'idle in transaction (aborted)';
```

## Support

For issues and questions:
1. Check Edge Function logs: `supabase functions logs sync_event`
2. Check database logs: Review PostgreSQL logs
3. Verify RLS policies are correct
4. Test with direct SQL queries first

## Next Steps

1. Set up automated testing
2. Configure CI/CD pipeline
3. Set up monitoring dashboards
4. Plan for scaling (sharding, read replicas)
5. Document business processes
6. Train staff on new system
