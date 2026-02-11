# Sync Event Edge Function

## Overview

The `sync_event` Edge Function is responsible for synchronizing inventory events from clients (stores, godowns, mobile apps) to the central database. It provides comprehensive validation, authorization, and stock checking before accepting events.

## Key Features

✅ **Stateless** - No session state maintained between requests  
✅ **Fast** - Optimized for minimal latency (~50-200ms typical)  
✅ **Idempotent** - Same event_id will not be inserted twice  
✅ **Stock Validation** - Prevents negative stock for SALE/TRANSFER_OUT  
✅ **Role-Based Authorization** - Enforces user permissions  
✅ **Location Access Control** - Validates location permissions  
✅ **Offline-Sync Ready** - Supports client_timestamp for conflict resolution

## Endpoint

```
POST /functions/v1/sync_event
```

## Authentication

Requires Supabase JWT token in Authorization header:

```
Authorization: Bearer <supabase_jwt_token>
```

## Request Format

### Headers

```
Content-Type: application/json
Authorization: Bearer <token>
```

### Body

```json
{
  "event_id": "550e8400-e29b-41d4-a716-446655440000", // Optional, auto-generated if not provided
  "event_type": "SALE",
  "variant_id": "123e4567-e89b-12d3-a456-426614174000",
  "quantity": -5,
  "from_location_id": "789e4567-e89b-12d3-a456-426614174000",
  "to_location_id": null,
  "channel": "STORE",
  "reference_type": "BILL",
  "reference_id": "456e8400-e29b-41d4-a716-446655440000",
  "reference_number": "INV-2026-0001",
  "unit_cost_price": 250.00,
  "unit_selling_price": 499.00,
  "total_amount": 2495.00,
  "notes": "Cash sale",
  "metadata": {
    "cashier": "John Doe",
    "register_id": "POS-001"
  },
  "sync_source": "POS-STORE-001",
  "client_timestamp": "2026-01-30T10:30:00Z"
}
```

### Required Fields

- `event_type` - Type of event (see Event Types below)
- `variant_id` - UUID of the product variant
- `quantity` - Integer quantity (positive or negative based on event type)

### Optional Fields

- `event_id` - UUID for idempotency (auto-generated if not provided)
- `from_location_id` - Source location UUID
- `to_location_id` - Destination location UUID
- `channel` - Sales channel (default: "STORE")
- `reference_type` - Type of reference document
- `reference_id` - UUID of reference document
- `reference_number` - Human-readable reference
- `unit_cost_price` - Cost price per unit
- `unit_selling_price` - Selling price per unit
- `total_amount` - Total transaction amount
- `notes` - Additional notes
- `metadata` - Flexible JSON object for additional data
- `sync_source` - Device/location identifier
- `client_timestamp` - Original timestamp from client

## Event Types

### SALE
- **Description**: Sale to customer
- **Quantity**: Negative (e.g., -5)
- **Requires**: `from_location_id`
- **Stock Check**: Yes

### PURCHASE
- **Description**: Purchase from supplier
- **Quantity**: Positive (e.g., +100)
- **Requires**: `to_location_id`
- **Stock Check**: No

### TRANSFER_OUT
- **Description**: Transfer out to another location
- **Quantity**: Negative (e.g., -20)
- **Requires**: `from_location_id`, `to_location_id`
- **Stock Check**: Yes

### TRANSFER_IN
- **Description**: Transfer in from another location
- **Quantity**: Positive (e.g., +20)
- **Requires**: `from_location_id`, `to_location_id`
- **Stock Check**: No

### RETURN
- **Description**: Customer return
- **Quantity**: Positive (e.g., +2)
- **Requires**: `to_location_id`
- **Stock Check**: No

### EXCHANGE_IN / EXCHANGE_OUT
- **Description**: Product exchange
- **Quantity**: Positive/Negative
- **Requires**: Location based on direction
- **Stock Check**: For EXCHANGE_OUT only

### ADJUSTMENT
- **Description**: Manual stock adjustment
- **Quantity**: Positive or Negative
- **Requires**: At least one location
- **Stock Check**: For negative adjustments

### DAMAGE / LOSS / FOUND
- **Description**: Damaged goods, lost items, found items
- **Quantity**: Negative for DAMAGE/LOSS, Positive for FOUND
- **Requires**: At least one location
- **Stock Check**: For DAMAGE/LOSS

## Channels

- `STORE` - Physical store sale
- `AMAZON` - Amazon marketplace sale
- `WEBSITE` - Website/online sale
- `WHOLESALE` - Wholesale transaction
- `MANUAL` - Manual entry

## Response Format

### Success Response

```json
{
  "success": true,
  "event_id": "550e8400-e29b-41d4-a716-446655440000",
  "message": "Event synchronized successfully"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Insufficient stock",
  "details": {
    "product": "Cotton T-Shirt",
    "sku": "TS-001-RED-L",
    "available": 3,
    "requested": 5,
    "shortfall": 2
  }
}
```

## Validation Rules

### 1. Event Structure Validation

- All required fields must be present
- Event type must be valid
- Quantity cannot be zero
- Quantity sign must match event type

### 2. Location Logic Validation

- PURCHASE: Must have `to_location_id`, no `from_location_id`
- SALE: Must have `from_location_id`, no `to_location_id`
- TRANSFER: Must have both locations, and they must be different
- Other events: Must have at least one location

### 3. User Authorization

- User must be authenticated
- User profile must exist and be active
- User role must be allowed to perform the event type:
  - **OWNER**: All event types ✅
  - **MANAGER**: All event types ✅
  - **STORE_STAFF**: SALE, RETURN, EXCHANGE ✅
  - **GODOWN_STAFF**: PURCHASE, TRANSFER, ADJUSTMENT ✅
  - **ACCOUNTANT**: No event types ❌

### 4. Location Access

- User must have access to all specified locations
- Checked against `user_location_access` table
- OWNER and MANAGER bypass this check

### 5. Stock Validation

For **SALE** and **TRANSFER_OUT** events:
- Queries `current_stock_view` to get available quantity
- Compares available stock vs requested quantity
- Rejects if insufficient stock
- Applies even during offline sync

## Idempotency

The function is idempotent using `event_id`:

1. Client can provide `event_id` (recommended for offline sync)
2. If `event_id` already exists in database, returns success without inserting
3. If not provided, function generates new UUID

**Example**: Same event synced twice won't create duplicate entries.

## Error Codes

| Status | Error | Description |
|--------|-------|-------------|
| 200 | - | Success |
| 400 | Validation failed | Invalid event structure |
| 400 | Insufficient stock | Not enough stock available |
| 401 | Unauthorized | Missing or invalid auth token |
| 403 | User profile not found | User not set up in system |
| 403 | Not authorized | User role cannot perform event type |
| 403 | No location access | User lacks access to location |
| 405 | Method not allowed | Non-POST request |
| 500 | Internal server error | Database or system error |

## Usage Examples

### Example 1: Sale Event

```typescript
const response = await fetch('https://your-project.supabase.co/functions/v1/sync_event', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    event_type: 'SALE',
    variant_id: 'abc-123',
    quantity: -3,
    from_location_id: 'store-001',
    channel: 'STORE',
    reference_type: 'BILL',
    reference_number: 'INV-001',
    unit_selling_price: 499,
    total_amount: 1497,
  }),
});

const result = await response.json();
console.log(result);
// { success: true, event_id: "...", message: "..." }
```

### Example 2: Purchase Event

```typescript
const response = await fetch('https://your-project.supabase.co/functions/v1/sync_event', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    event_type: 'PURCHASE',
    variant_id: 'abc-123',
    quantity: 50,
    to_location_id: 'godown-001',
    reference_type: 'PURCHASE_ORDER',
    reference_number: 'PO-2026-001',
    unit_cost_price: 250,
  }),
});
```

### Example 3: Transfer Event

```typescript
// TRANSFER_OUT from Store to Godown
const response = await fetch('https://your-project.supabase.co/functions/v1/sync_event', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    event_type: 'TRANSFER_OUT',
    variant_id: 'abc-123',
    quantity: -10,
    from_location_id: 'store-001',
    to_location_id: 'godown-001',
    reference_type: 'TRANSFER_NOTE',
    reference_number: 'TN-001',
  }),
});
```

### Example 4: Offline Sync with Idempotency

```typescript
// Generate event_id on client for offline sync
const eventId = crypto.randomUUID();

const response = await fetch('https://your-project.supabase.co/functions/v1/sync_event', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabaseToken}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    event_id: eventId, // Ensures idempotency
    event_type: 'SALE',
    variant_id: 'abc-123',
    quantity: -2,
    from_location_id: 'store-001',
    sync_source: 'POS-STORE-001',
    client_timestamp: new Date().toISOString(),
  }),
});

// If network fails and retried, same event_id prevents duplicate
```

## Performance

- **Average latency**: 50-150ms
- **Stock check query**: ~10-20ms
- **Authorization check**: ~20-30ms
- **Insert operation**: ~20-40ms

## Security

- ✅ JWT-based authentication required
- ✅ Row Level Security (RLS) enforced on database
- ✅ Role-based authorization at function level
- ✅ Location access control
- ✅ No SQL injection possible (parameterized queries)
- ✅ CORS enabled for web clients

## Deployment

```bash
# Deploy to Supabase
supabase functions deploy sync_event

# Test locally
supabase functions serve sync_event

# View logs
supabase functions logs sync_event
```

## Monitoring

Key metrics to monitor:
- Request count
- Success/failure rate
- Stock validation failures
- Authorization failures
- Average response time
- Idempotent event count (duplicates)

## Troubleshooting

### "Insufficient stock" error during sync

**Cause**: Stock was sold elsewhere between offline event creation and sync

**Solution**: 
1. Check current stock on server
2. Prompt user to adjust quantity
3. Create new event with correct quantity

### "User profile not found"

**Cause**: User not set up in `user_profiles` table

**Solution**: Admin must create user profile with role and location

### "Not authorized to perform event type"

**Cause**: User role doesn't have permission for that event

**Solution**: Check role permissions, or assign different role

## Related Tables

- `event_ledger` - Where events are stored
- `current_stock_view` - Used for stock validation
- `user_profiles` - User role and location mapping
- `user_location_access` - Multi-location access control

## Future Enhancements

- [ ] Batch event sync endpoint
- [ ] Webhook for real-time event notifications
- [ ] Advanced conflict resolution for offline sync
- [ ] Event scheduling/delayed processing
- [ ] Stock reservation for pending orders
