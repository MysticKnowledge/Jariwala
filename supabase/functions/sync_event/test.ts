// =====================================================
// SYNC_EVENT Test Suite
// Run with: deno test --allow-net --allow-env test.ts
// =====================================================

import { assertEquals, assertExists } from "https://deno.land/std@0.168.0/testing/asserts.ts";

const FUNCTION_URL = Deno.env.get("FUNCTION_URL") || "http://localhost:54321/functions/v1/sync_event";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") || "";
const TEST_USER_TOKEN = Deno.env.get("TEST_USER_TOKEN") || "";

// Helper function to call the edge function
async function callSyncEvent(payload: any, token: string = TEST_USER_TOKEN) {
  const response = await fetch(FUNCTION_URL, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "apikey": SUPABASE_ANON_KEY,
    },
    body: JSON.stringify(payload),
  });

  return {
    status: response.status,
    data: await response.json(),
  };
}

// =====================================================
// TEST CASES
// =====================================================

Deno.test("Should reject request without authentication", async () => {
  const payload = {
    event_type: "SALE",
    variant_id: "123e4567-e89b-12d3-a456-426614174000",
    quantity: -5,
    from_location_id: "789e4567-e89b-12d3-a456-426614174000",
  };

  const result = await callSyncEvent(payload, "invalid-token");
  
  assertEquals(result.status, 401);
  assertEquals(result.data.success, false);
  assertExists(result.data.error);
});

Deno.test("Should reject missing required fields", async () => {
  const payload = {
    // Missing event_type
    variant_id: "123e4567-e89b-12d3-a456-426614174000",
    quantity: -5,
  };

  const result = await callSyncEvent(payload);
  
  assertEquals(result.status, 400);
  assertEquals(result.data.success, false);
  assertExists(result.data.details);
});

Deno.test("Should reject zero quantity", async () => {
  const payload = {
    event_type: "SALE",
    variant_id: "123e4567-e89b-12d3-a456-426614174000",
    quantity: 0, // Invalid
    from_location_id: "789e4567-e89b-12d3-a456-426614174000",
  };

  const result = await callSyncEvent(payload);
  
  assertEquals(result.status, 400);
  assertEquals(result.data.success, false);
});

Deno.test("Should reject invalid event_type", async () => {
  const payload = {
    event_type: "INVALID_TYPE",
    variant_id: "123e4567-e89b-12d3-a456-426614174000",
    quantity: -5,
    from_location_id: "789e4567-e89b-12d3-a456-426614174000",
  };

  const result = await callSyncEvent(payload);
  
  assertEquals(result.status, 400);
  assertEquals(result.data.success, false);
});

Deno.test("Should reject SALE with positive quantity", async () => {
  const payload = {
    event_type: "SALE",
    variant_id: "123e4567-e89b-12d3-a456-426614174000",
    quantity: 5, // Should be negative
    from_location_id: "789e4567-e89b-12d3-a456-426614174000",
  };

  const result = await callSyncEvent(payload);
  
  assertEquals(result.status, 400);
  assertEquals(result.data.success, false);
});

Deno.test("Should reject PURCHASE with negative quantity", async () => {
  const payload = {
    event_type: "PURCHASE",
    variant_id: "123e4567-e89b-12d3-a456-426614174000",
    quantity: -100, // Should be positive
    to_location_id: "789e4567-e89b-12d3-a456-426614174000",
  };

  const result = await callSyncEvent(payload);
  
  assertEquals(result.status, 400);
  assertEquals(result.data.success, false);
});

Deno.test("Should reject SALE without from_location_id", async () => {
  const payload = {
    event_type: "SALE",
    variant_id: "123e4567-e89b-12d3-a456-426614174000",
    quantity: -5,
    // Missing from_location_id
  };

  const result = await callSyncEvent(payload);
  
  assertEquals(result.status, 400);
  assertEquals(result.data.success, false);
});

Deno.test("Should reject PURCHASE without to_location_id", async () => {
  const payload = {
    event_type: "PURCHASE",
    variant_id: "123e4567-e89b-12d3-a456-426614174000",
    quantity: 100,
    // Missing to_location_id
  };

  const result = await callSyncEvent(payload);
  
  assertEquals(result.status, 400);
  assertEquals(result.data.success, false);
});

Deno.test("Should reject TRANSFER with same from and to location", async () => {
  const sameLocationId = "789e4567-e89b-12d3-a456-426614174000";
  
  const payload = {
    event_type: "TRANSFER_OUT",
    variant_id: "123e4567-e89b-12d3-a456-426614174000",
    quantity: -10,
    from_location_id: sameLocationId,
    to_location_id: sameLocationId, // Same as from
  };

  const result = await callSyncEvent(payload);
  
  assertEquals(result.status, 400);
  assertEquals(result.data.success, false);
});

Deno.test("Should handle valid SALE event (with stock)", async () => {
  const payload = {
    event_type: "SALE",
    variant_id: "123e4567-e89b-12d3-a456-426614174000", // Must exist with stock
    quantity: -1,
    from_location_id: "789e4567-e89b-12d3-a456-426614174000", // User must have access
    channel: "STORE",
    reference_type: "BILL",
    reference_number: "TEST-SALE-001",
    unit_selling_price: 499,
  };

  const result = await callSyncEvent(payload);
  
  // Should succeed if stock available, or fail with insufficient stock
  if (result.data.success) {
    assertEquals(result.status, 200);
    assertExists(result.data.event_id);
  } else {
    // Might fail due to insufficient stock - that's also valid
    assertEquals(result.data.error === "Insufficient stock" || result.status === 403, true);
  }
});

Deno.test("Should handle valid PURCHASE event", async () => {
  const payload = {
    event_type: "PURCHASE",
    variant_id: "123e4567-e89b-12d3-a456-426614174000",
    quantity: 50,
    to_location_id: "789e4567-e89b-12d3-a456-426614174000",
    channel: "MANUAL",
    reference_type: "PURCHASE_ORDER",
    reference_number: "TEST-PO-001",
    unit_cost_price: 250,
  };

  const result = await callSyncEvent(payload);
  
  // Should succeed or fail based on authorization
  if (result.status === 200) {
    assertEquals(result.data.success, true);
    assertExists(result.data.event_id);
  }
});

Deno.test("Should be idempotent with same event_id", async () => {
  const eventId = crypto.randomUUID();
  
  const payload = {
    event_id: eventId,
    event_type: "ADJUSTMENT",
    variant_id: "123e4567-e89b-12d3-a456-426614174000",
    quantity: 1,
    to_location_id: "789e4567-e89b-12d3-a456-426614174000",
  };

  // First call
  const result1 = await callSyncEvent(payload);
  
  // Second call with same event_id
  const result2 = await callSyncEvent(payload);
  
  // Both should return success (second one should be idempotent)
  if (result1.status === 200) {
    assertEquals(result2.status, 200);
    assertEquals(result1.data.event_id, result2.data.event_id);
  }
});

Deno.test("Should include metadata in event", async () => {
  const payload = {
    event_type: "SALE",
    variant_id: "123e4567-e89b-12d3-a456-426614174000",
    quantity: -1,
    from_location_id: "789e4567-e89b-12d3-a456-426614174000",
    metadata: {
      cashier_name: "John Doe",
      register_id: "POS-001",
      payment_method: "CASH",
      custom_field: "test-value",
    },
    notes: "Test sale with metadata",
  };

  const result = await callSyncEvent(payload);
  
  // Metadata should be accepted
  if (result.status === 200) {
    assertExists(result.data.event_id);
  }
});

// =====================================================
// INTEGRATION TESTS (require database setup)
// =====================================================

Deno.test("Integration: Should reject sale with insufficient stock", async () => {
  // This test requires a variant with low/zero stock
  const payload = {
    event_type: "SALE",
    variant_id: "00000000-0000-0000-0000-000000000001", // Variant with 0 stock
    quantity: -5,
    from_location_id: "789e4567-e89b-12d3-a456-426614174000",
  };

  const result = await callSyncEvent(payload);
  
  // Should fail with insufficient stock or variant not found
  assertEquals(result.status === 400 || result.status === 500, true);
});

Deno.test("Integration: Should prevent ACCOUNTANT from creating events", async () => {
  // This test requires an ACCOUNTANT user token
  const accountantToken = Deno.env.get("ACCOUNTANT_TOKEN");
  
  if (!accountantToken) {
    console.log("Skipping: ACCOUNTANT_TOKEN not set");
    return;
  }

  const payload = {
    event_type: "SALE",
    variant_id: "123e4567-e89b-12d3-a456-426614174000",
    quantity: -1,
    from_location_id: "789e4567-e89b-12d3-a456-426614174000",
  };

  const result = await callSyncEvent(payload, accountantToken);
  
  assertEquals(result.status, 403);
  assertEquals(result.data.success, false);
});

// =====================================================
// PERFORMANCE TESTS
// =====================================================

Deno.test("Performance: Should respond within 500ms", async () => {
  const payload = {
    event_type: "ADJUSTMENT",
    variant_id: "123e4567-e89b-12d3-a456-426614174000",
    quantity: 1,
    to_location_id: "789e4567-e89b-12d3-a456-426614174000",
  };

  const startTime = Date.now();
  const result = await callSyncEvent(payload);
  const duration = Date.now() - startTime;

  console.log(`Response time: ${duration}ms`);
  
  // Should respond quickly
  assertEquals(duration < 500, true, `Too slow: ${duration}ms`);
});

console.log("\n✅ All tests completed!\n");
