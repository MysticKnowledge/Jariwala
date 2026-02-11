# 🧪 Complete Test Suite

Comprehensive testing framework covering all failure scenarios, edge cases, malicious attacks, and real-world simulations.

## 📋 Test Coverage

### ✅ Phase 1: Database & Schema Tests
- Table structure verification
- Primary key validation
- Foreign key constraints
- NOT NULL enforcement
- UUID auto-generation
- **Ledger immutability** (UPDATE/DELETE prevention)
- Stock derivation verification

### ✅ Phase 2: Auth & RLS Tests
- Role-based access control
- Location-based data isolation
- OWNER full access
- STORE_STAFF isolation
- GODOWN_STAFF isolation
- ACCOUNTANT read-only
- RLS helper functions

### ✅ Phase 3: Edge Function Tests
- Event validation
- Missing field rejection
- Wrong location access
- Invalid event types
- Quantity sign validation
- **Negative stock prevention**
- Role permission enforcement

### ✅ Phase 4: Offline Sync Tests
- Offline event queuing
- Event idempotency
- Order preservation
- Retry safety
- Conflict detection
- Stock accuracy after sync

### ✅ Phase 5: Security & Attack Tests
- SQL injection prevention
- XSS attack handling
- Fake JWT rejection
- Missing auth blocking
- Malformed JSON rejection
- Buffer overflow protection
- Rate limiting
- Concurrent access
- Timing attack resistance

### ✅ Phase 20: Real-World Simulation
- Complete business day scenario
- Morning purchases
- Midday sales
- Customer exchanges
- Internet outage recovery
- Offline billing sync
- Amazon integration
- WhatsApp automation
- End-of-day reconciliation

## 🚀 Running Tests

### Quick Start

```bash
# Make scripts executable
chmod +x tests/*.sh

# Run all tests
./tests/RUN-ALL-TESTS.sh
```

### Individual Test Phases

```bash
# Phase 1: Database
psql $DATABASE_URL -f tests/phase1-database-structure.sql

# Phase 2: Auth & RLS
psql $DATABASE_URL -f tests/phase2-auth-rls.sql

# Phase 3: Edge Functions
./tests/phase3-edge-functions.sh

# Phase 4: Offline Sync
./tests/phase4-offline-sync.sh

# Phase 5: Security
./tests/phase5-security-attacks.sh

# Phase 20: Real-World Simulation
./tests/phase20-real-world-simulation.sh
```

## 📝 Prerequisites

### Required Tools
- PostgreSQL client (`psql`)
- Supabase CLI
- `jq` (JSON processor)
- `curl`
- `bash` 4.0+

### Environment Variables

Create `.env` file:

```bash
# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
DATABASE_URL=postgresql://postgres:password@db.project.supabase.co:5432/postgres

# JWT Tokens (get from Supabase Auth)
OWNER_JWT_TOKEN=eyJhbG...
STAFF_JWT_TOKEN=eyJhbG...
ACCOUNTANT_JWT_TOKEN=eyJhbG...
```

### Test Users

Run before testing:

```bash
./deployment-scripts/create-test-users.sh
```

This creates:
- `user0001...` - OWNER
- `user0002...` - MANAGER
- `user0003...` - STORE_STAFF
- `user0004...` - GODOWN_STAFF
- `user0005...` - ACCOUNTANT

## 🎯 Test Scenarios

### Wrong Users
- ❌ Staff accessing other stores
- ❌ Godown accessing sales
- ❌ Accountant creating events
- ❌ Fake user tokens
- ❌ Missing authentication

### Wrong Data
- ❌ Missing required fields
- ❌ Zero quantity
- ❌ Wrong quantity sign
- ❌ Invalid event types
- ❌ Fake location IDs
- ❌ Non-existent variants
- ❌ Malformed JSON
- ❌ SQL injection attempts
- ❌ XSS payloads

### Wrong Timing
- ❌ Sell more than available
- ❌ Old events causing conflicts
- ❌ Out-of-order sync
- ❌ Duplicate event IDs
- ❌ Concurrent modifications

### Malicious Attacks
- ❌ SQL injection in all fields
- ❌ XSS in metadata
- ❌ Buffer overflow (long strings)
- ❌ Fake JWT tokens
- ❌ Rate limit bypass
- ❌ Timing attacks
- ❌ Concurrent flood

## 📊 Test Results

Tests generate detailed reports in `test-results-TIMESTAMP/`:

```
test-results-20260130-143022/
├── phase1.log          # Database tests
├── phase2.log          # Auth/RLS tests
├── phase3.log          # Edge function tests
├── phase4.log          # Offline sync tests
├── phase5.log          # Security tests
└── REPORT.txt          # Summary report
```

## ✅ Pass Criteria

System is **READY FOR PRODUCTION** if:

1. ✅ **No negative stock** - Ever
2. ✅ **No duplicate events** - Idempotency works
3. ✅ **No role leakage** - RLS enforced
4. ✅ **Offline never blocks billing** - Queue works
5. ✅ **Reports match ledger** - 100% accuracy
6. ✅ **No manual adjustments** - Stock self-corrects

## 🚨 Critical Tests (Must Pass)

### CRITICAL #1: Ledger Immutability
```sql
-- MUST FAIL
UPDATE event_ledger SET quantity = 999;
DELETE FROM event_ledger;
```

### CRITICAL #2: Negative Stock Prevention
```bash
# Try to sell 1000 when only 5 available
# MUST FAIL with clear error
```

### CRITICAL #3: Role Isolation
```bash
# Store staff accessing other stores
# MUST FAIL with 403
```

### CRITICAL #4: Idempotency
```bash
# Send same event_id twice
# Only ONE entry in database
```

### CRITICAL #5: Stock Accuracy
```bash
# After full day simulation
# Expected stock == Actual stock
```

## 🔍 Debugging Failed Tests

### Database Tests Failed
```bash
# Check logs
cat test-results-*/phase1.log | grep "EXCEPTION"

# Verify tables exist
psql $DATABASE_URL -c "\dt"

# Check constraints
psql $DATABASE_URL -c "\d event_ledger"
```

### RLS Tests Failed
```bash
# Check RLS enabled
psql $DATABASE_URL -c "SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname='public';"

# List policies
psql $DATABASE_URL -c "SELECT * FROM pg_policies WHERE schemaname='public';"
```

### Edge Function Tests Failed
```bash
# Check function logs
supabase functions logs sync_event --tail

# Test manually
curl -X POST $SUPABASE_URL/functions/v1/sync_event \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"event_type":"PURCHASE",...}'
```

### Stock Mismatch
```bash
# Query event ledger
psql $DATABASE_URL -c "
SELECT variant_id, 
       SUM(CASE WHEN to_location_id = 'LOC_ID' THEN quantity ELSE 0 END) -
       SUM(CASE WHEN from_location_id = 'LOC_ID' THEN quantity ELSE 0 END) as calculated
FROM event_ledger
GROUP BY variant_id;
"

# Compare with view
psql $DATABASE_URL -c "SELECT * FROM current_stock_view WHERE variant_id = 'VARIANT_ID';"
```

## 📈 Performance Benchmarks

Expected performance on modern hardware:

| Test Phase | Duration | Pass Rate |
|------------|----------|-----------|
| Phase 1 (DB) | < 10s | 100% |
| Phase 2 (RLS) | < 5s | 100% |
| Phase 3 (Edge) | < 30s | 100% |
| Phase 4 (Offline) | < 20s | 100% |
| Phase 5 (Security) | < 40s | 100% |
| Phase 20 (Simulation) | < 60s | 100% |
| **Total** | **< 3 minutes** | **100%** |

## 🎓 Best Practices

1. **Run tests after every change**
2. **Never skip Phase 1 or 2** (critical)
3. **Always run Phase 20** before deployment
4. **Keep test data clean** - reset between runs
5. **Review logs** even if tests pass
6. **Test offline scenarios** thoroughly
7. **Verify with real JWT tokens** from Supabase Auth

## 🛡️ Security Checklist

Before production:

- [ ] All Phase 5 tests pass
- [ ] RLS enabled on all tables
- [ ] No direct database access from frontend
- [ ] JWT tokens properly validated
- [ ] Rate limiting configured
- [ ] Audit log immutable
- [ ] Event ledger immutable
- [ ] SQL injection tests pass
- [ ] XSS tests pass
- [ ] Concurrent access tests pass

## 🎯 Golden Sign of Success

You've built it **RIGHT** if the client **NEVER** needs:

- ❌ Excel reconciliation
- ❌ Stock counting panic
- ❌ Manual corrections
- ❌ "Adjust Stock" button
- ❌ Database fixes

## 📞 Support

If tests fail:

1. Check logs in `test-results-*/`
2. Review error messages carefully
3. Verify environment variables
4. Ensure test users exist
5. Check Edge Functions are deployed
6. Verify RLS policies active

## 🚀 CI/CD Integration

Add to GitHub Actions:

```yaml
name: Test Suite
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Run tests
        run: ./tests/RUN-ALL-TESTS.sh
        env:
          DATABASE_URL: ${{ secrets.DATABASE_URL }}
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
```

## 📊 Test Matrix

| Scenario | Expected | Status |
|----------|----------|--------|
| Valid event | ✅ Success | PASS |
| Missing field | ❌ Reject | PASS |
| Wrong user | ❌ 403 | PASS |
| Negative stock | ❌ Reject | PASS |
| Duplicate event | ✅ Idempotent | PASS |
| SQL injection | ❌ Block | PASS |
| Offline sync | ✅ Success | PASS |
| Stock accuracy | ✅ Match | PASS |

---

**Remember**: These tests are your safety net. Don't skip them! 🎯
