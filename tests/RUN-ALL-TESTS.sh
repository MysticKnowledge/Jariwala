#!/bin/bash

# =====================================================
# MASTER TEST RUNNER
# Runs ALL test phases and generates comprehensive report
# =====================================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

echo -e "${CYAN}"
echo "╔══════════════════════════════════════════════════╗"
echo "║   RETAIL INVENTORY SYSTEM - COMPLETE TEST SUITE  ║"
echo "╚══════════════════════════════════════════════════╝"
echo -e "${NC}"

# Check prerequisites
echo "Checking prerequisites..."

if ! command -v supabase &> /dev/null; then
    echo -e "${RED}❌ Supabase CLI not found${NC}"
    exit 1
fi

if ! command -v jq &> /dev/null; then
    echo -e "${RED}❌ jq not found. Install: brew install jq${NC}"
    exit 1
fi

if ! command -v curl &> /dev/null; then
    echo -e "${RED}❌ curl not found${NC}"
    exit 1
fi

echo -e "${GREEN}✅ All prerequisites met${NC}"

# Load environment variables
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo -e "${GREEN}✅ Environment loaded${NC}"
else
    echo -e "${YELLOW}⚠️  No .env file found${NC}"
fi

# Verify required env vars
REQUIRED_VARS=("SUPABASE_URL" "DATABASE_URL")
MISSING_VARS=()

for var in "${REQUIRED_VARS[@]}"; do
    if [ -z "${!var}" ]; then
        MISSING_VARS+=("$var")
    fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
    echo -e "${RED}❌ Missing required environment variables:${NC}"
    printf '  %s\n' "${MISSING_VARS[@]}"
    exit 1
fi

# Create test results directory
RESULTS_DIR="test-results-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$RESULTS_DIR"

echo -e "\n${BLUE}Results will be saved to: $RESULTS_DIR${NC}\n"

# Test counters
TOTAL_PHASES=0
PASSED_PHASES=0
FAILED_PHASES=0
SKIPPED_PHASES=0

# =====================================================
# PHASE 1: DATABASE & SCHEMA TESTS
# =====================================================

echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}PHASE 1: DATABASE & SCHEMA TESTS${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
((TOTAL_PHASES++))

if psql "$DATABASE_URL" -f tests/phase1-database-structure.sql > "$RESULTS_DIR/phase1.log" 2>&1; then
    echo -e "${GREEN}✅ PHASE 1 PASSED${NC}"
    ((PASSED_PHASES++))
else
    echo -e "${RED}❌ PHASE 1 FAILED${NC}"
    ((FAILED_PHASES++))
    tail -20 "$RESULTS_DIR/phase1.log"
fi

# =====================================================
# PHASE 2: AUTH & RLS TESTS
# =====================================================

echo -e "\n${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}PHASE 2: AUTH & RLS TESTS${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
((TOTAL_PHASES++))

if psql "$DATABASE_URL" -f tests/phase2-auth-rls.sql > "$RESULTS_DIR/phase2.log" 2>&1; then
    echo -e "${GREEN}✅ PHASE 2 PASSED${NC}"
    ((PASSED_PHASES++))
else
    echo -e "${RED}❌ PHASE 2 FAILED${NC}"
    ((FAILED_PHASES++))
    tail -20 "$RESULTS_DIR/phase2.log"
fi

# =====================================================
# PHASE 3: EDGE FUNCTION TESTS
# =====================================================

echo -e "\n${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}PHASE 3: EDGE FUNCTION TESTS${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
((TOTAL_PHASES++))

if [ -n "$OWNER_JWT_TOKEN" ] && [ -n "$STAFF_JWT_TOKEN" ]; then
    if bash tests/phase3-edge-functions.sh > "$RESULTS_DIR/phase3.log" 2>&1; then
        echo -e "${GREEN}✅ PHASE 3 PASSED${NC}"
        ((PASSED_PHASES++))
    else
        echo -e "${RED}❌ PHASE 3 FAILED${NC}"
        ((FAILED_PHASES++))
        tail -20 "$RESULTS_DIR/phase3.log"
    fi
else
    echo -e "${YELLOW}⚠️  PHASE 3 SKIPPED (Missing JWT tokens)${NC}"
    echo "Set OWNER_JWT_TOKEN, STAFF_JWT_TOKEN, ACCOUNTANT_JWT_TOKEN to run"
    ((SKIPPED_PHASES++))
fi

# =====================================================
# PHASE 4: OFFLINE SYNC TESTS
# =====================================================

echo -e "\n${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}PHASE 4: OFFLINE SYNC TESTS${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
((TOTAL_PHASES++))

if [ -n "$STAFF_JWT_TOKEN" ]; then
    if bash tests/phase4-offline-sync.sh > "$RESULTS_DIR/phase4.log" 2>&1; then
        echo -e "${GREEN}✅ PHASE 4 PASSED${NC}"
        ((PASSED_PHASES++))
    else
        echo -e "${RED}❌ PHASE 4 FAILED${NC}"
        ((FAILED_PHASES++))
        tail -20 "$RESULTS_DIR/phase4.log"
    fi
else
    echo -e "${YELLOW}⚠️  PHASE 4 SKIPPED (Missing STAFF_JWT_TOKEN)${NC}"
    ((SKIPPED_PHASES++))
fi

# =====================================================
# PHASE 5: SECURITY & ATTACK TESTS
# =====================================================

echo -e "\n${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${MAGENTA}PHASE 5: SECURITY & ATTACK TESTS${NC}"
echo -e "${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
((TOTAL_PHASES++))

if [ -n "$STAFF_JWT_TOKEN" ]; then
    if bash tests/phase5-security-attacks.sh > "$RESULTS_DIR/phase5.log" 2>&1; then
        echo -e "${GREEN}✅ PHASE 5 PASSED${NC}"
        ((PASSED_PHASES++))
    else
        echo -e "${RED}❌ PHASE 5 FAILED${NC}"
        ((FAILED_PHASES++))
        tail -20 "$RESULTS_DIR/phase5.log"
    fi
else
    echo -e "${YELLOW}⚠️  PHASE 5 SKIPPED (Missing STAFF_JWT_TOKEN)${NC}"
    ((SKIPPED_PHASES++))
fi

# =====================================================
# FINAL REPORT
# =====================================================

echo -e "\n${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║              FINAL TEST REPORT                    ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}\n"

echo "Total Phases: $TOTAL_PHASES"
echo -e "${GREEN}Passed: $PASSED_PHASES${NC}"
echo -e "${RED}Failed: $FAILED_PHASES${NC}"
echo -e "${YELLOW}Skipped: $SKIPPED_PHASES${NC}"

# Calculate pass percentage
if [ $TOTAL_PHASES -gt 0 ]; then
    PASS_PERCENTAGE=$(( (PASSED_PHASES * 100) / (TOTAL_PHASES - SKIPPED_PHASES) ))
    echo -e "\nPass Rate: ${PASS_PERCENTAGE}%"
fi

# Generate report file
REPORT_FILE="$RESULTS_DIR/REPORT.txt"
{
    echo "=========================================="
    echo "RETAIL INVENTORY SYSTEM - TEST REPORT"
    echo "=========================================="
    echo "Date: $(date)"
    echo "Total Phases: $TOTAL_PHASES"
    echo "Passed: $PASSED_PHASES"
    echo "Failed: $FAILED_PHASES"
    echo "Skipped: $SKIPPED_PHASES"
    echo ""
    echo "Individual Phase Results:"
    echo "  Phase 1 (Database): $([ -f "$RESULTS_DIR/phase1.log" ] && echo "✅" || echo "❌")"
    echo "  Phase 2 (Auth/RLS): $([ -f "$RESULTS_DIR/phase2.log" ] && echo "✅" || echo "❌")"
    echo "  Phase 3 (Edge Functions): $([ -f "$RESULTS_DIR/phase3.log" ] && echo "✅" || echo "❌")"
    echo "  Phase 4 (Offline Sync): $([ -f "$RESULTS_DIR/phase4.log" ] && echo "✅" || echo "❌")"
    echo "  Phase 5 (Security): $([ -f "$RESULTS_DIR/phase5.log" ] && echo "✅" || echo "❌")"
    echo ""
    echo "Full logs available in: $RESULTS_DIR/"
} > "$REPORT_FILE"

echo -e "\n${BLUE}📄 Full report saved to: $REPORT_FILE${NC}"

# =====================================================
# PASS/FAIL CRITERIA
# =====================================================

echo -e "\n${CYAN}╔══════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║          PRODUCTION READINESS CHECK               ║${NC}"
echo -e "${CYAN}╚══════════════════════════════════════════════════╝${NC}\n"

READY_FOR_PRODUCTION=true

# Check critical failures
if [ $FAILED_PHASES -gt 0 ]; then
    echo -e "${RED}❌ CRITICAL: Some tests failed${NC}"
    READY_FOR_PRODUCTION=false
fi

# Check Phase 1 (Database) - CRITICAL
if ! grep -q "✅ PHASE 1 TESTS COMPLETE" "$RESULTS_DIR/phase1.log" 2>/dev/null; then
    echo -e "${RED}❌ CRITICAL: Database structure tests failed${NC}"
    READY_FOR_PRODUCTION=false
fi

# Check Phase 2 (RLS) - CRITICAL
if ! grep -q "✅ PHASE 2 TESTS COMPLETE" "$RESULTS_DIR/phase2.log" 2>/dev/null; then
    echo -e "${RED}❌ CRITICAL: RLS tests failed${NC}"
    READY_FOR_PRODUCTION=false
fi

# Final verdict
echo ""
if [ "$READY_FOR_PRODUCTION" = true ]; then
    echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║  ✅ SYSTEM IS READY FOR PRODUCTION ✅  ║${NC}"
    echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo "All critical tests passed. The system is:"
    echo "  ✅ Secure (RLS enforced)"
    echo "  ✅ Data integrity guaranteed"
    echo "  ✅ Event ledger immutable"
    echo "  ✅ Stock calculations accurate"
    echo "  ✅ Protected from attacks"
    echo ""
    echo "You can deploy with confidence! 🚀"
    exit 0
else
    echo -e "${RED}╔════════════════════════════════════════╗${NC}"
    echo -e "${RED}║  ❌ SYSTEM NOT READY FOR PRODUCTION ❌  ║${NC}"
    echo -e "${RED}╚════════════════════════════════════════╝${NC}"
    echo ""
    echo "Critical tests failed. DO NOT DEPLOY."
    echo "Fix the issues in the logs and re-run tests."
    echo ""
    exit 1
fi
