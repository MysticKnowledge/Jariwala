// =====================================================
// SYNC_EVENT Edge Function
// Handles event synchronization with validation
// =====================================================

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

// =====================================================
// TYPES & INTERFACES
// =====================================================

interface EventPayload {
  event_id?: string; // Optional - will be generated if not provided
  event_type: 
    | "SALE"
    | "PURCHASE"
    | "TRANSFER_OUT"
    | "TRANSFER_IN"
    | "RETURN"
    | "EXCHANGE_IN"
    | "EXCHANGE_OUT"
    | "ADJUSTMENT"
    | "DAMAGE"
    | "LOSS"
    | "FOUND";
  variant_id: string;
  quantity: number;
  from_location_id?: string | null;
  to_location_id?: string | null;
  channel?: "STORE" | "AMAZON" | "WEBSITE" | "WHOLESALE" | "MANUAL";
  reference_type?: string | null;
  reference_id?: string | null;
  reference_number?: string | null;
  unit_cost_price?: number | null;
  unit_selling_price?: number | null;
  total_amount?: number | null;
  notes?: string | null;
  metadata?: Record<string, any> | null;
  sync_source?: string | null;
  client_timestamp?: string | null;
}

interface UserRole {
  role_name: string;
  location_ids: string[];
  is_active: boolean;
}

interface StockInfo {
  variant_id: string;
  location_id: string;
  current_quantity: number;
  sku_code: string;
  product_name: string;
}

interface ApiResponse {
  success: boolean;
  event_id?: string;
  message?: string;
  error?: string;
  details?: any;
}

// =====================================================
// VALIDATION FUNCTIONS
// =====================================================

function validateEventPayload(payload: any): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Required fields
  if (!payload.event_type) {
    errors.push("event_type is required");
  }

  if (!payload.variant_id) {
    errors.push("variant_id is required");
  }

  if (payload.quantity === undefined || payload.quantity === null) {
    errors.push("quantity is required");
  }

  if (payload.quantity === 0) {
    errors.push("quantity cannot be zero");
  }

  // Validate event_type
  const validEventTypes = [
    "SALE",
    "PURCHASE",
    "TRANSFER_OUT",
    "TRANSFER_IN",
    "RETURN",
    "EXCHANGE_IN",
    "EXCHANGE_OUT",
    "ADJUSTMENT",
    "DAMAGE",
    "LOSS",
    "FOUND",
  ];
  if (payload.event_type && !validEventTypes.includes(payload.event_type)) {
    errors.push(`Invalid event_type. Must be one of: ${validEventTypes.join(", ")}`);
  }

  // Validate channel
  const validChannels = ["STORE", "AMAZON", "WEBSITE", "WHOLESALE", "MANUAL"];
  if (payload.channel && !validChannels.includes(payload.channel)) {
    errors.push(`Invalid channel. Must be one of: ${validChannels.join(", ")}`);
  }

  // Location logic validation
  if (payload.event_type === "PURCHASE") {
    if (!payload.to_location_id) {
      errors.push("PURCHASE events must have to_location_id");
    }
    if (payload.from_location_id) {
      errors.push("PURCHASE events should not have from_location_id");
    }
  }

  if (payload.event_type === "SALE") {
    if (!payload.from_location_id) {
      errors.push("SALE events must have from_location_id");
    }
    if (payload.to_location_id) {
      errors.push("SALE events should not have to_location_id");
    }
  }

  if (payload.event_type === "TRANSFER_OUT" || payload.event_type === "TRANSFER_IN") {
    if (!payload.from_location_id || !payload.to_location_id) {
      errors.push("TRANSFER events must have both from_location_id and to_location_id");
    }
    if (payload.from_location_id === payload.to_location_id) {
      errors.push("TRANSFER events must have different from and to locations");
    }
  }

  // Quantity sign validation
  if (payload.event_type === "SALE" || payload.event_type === "TRANSFER_OUT" || payload.event_type === "DAMAGE" || payload.event_type === "LOSS") {
    if (payload.quantity > 0) {
      errors.push(`${payload.event_type} events must have negative quantity`);
    }
  }

  if (payload.event_type === "PURCHASE" || payload.event_type === "TRANSFER_IN" || payload.event_type === "RETURN" || payload.event_type === "FOUND") {
    if (payload.quantity < 0) {
      errors.push(`${payload.event_type} events must have positive quantity`);
    }
  }

  return { valid: errors.length === 0, errors };
}

// =====================================================
// DATABASE HELPER FUNCTIONS
// =====================================================

async function getUserRole(supabase: any, userId: string): Promise<UserRole | null> {
  try {
    // Get user role and accessible locations
    const { data: profile, error: profileError } = await supabase
      .from("user_profiles")
      .select(`
        id,
        is_active,
        primary_location_id,
        roles:role_id (
          name
        )
      `)
      .eq("user_id", userId)
      .eq("is_active", true)
      .single();

    if (profileError || !profile) {
      console.error("Error fetching user profile:", profileError);
      return null;
    }

    // Get all accessible locations
    const { data: accessibleLocations, error: accessError } = await supabase
      .from("user_location_access")
      .select("location_id")
      .eq("user_profile_id", profile.id)
      .eq("can_view", true);

    if (accessError) {
      console.error("Error fetching location access:", accessError);
    }

    const locationIds = [
      profile.primary_location_id,
      ...(accessibleLocations || []).map((loc: any) => loc.location_id),
    ].filter((id) => id !== null && id !== undefined);

    return {
      role_name: profile.roles?.name || "",
      location_ids: locationIds,
      is_active: profile.is_active,
    };
  } catch (error) {
    console.error("Error in getUserRole:", error);
    return null;
  }
}

async function getCurrentStock(
  supabase: any,
  variantId: string,
  locationId: string
): Promise<StockInfo | null> {
  try {
    const { data, error } = await supabase
      .from("current_stock_view")
      .select("variant_id, location_id, current_quantity, sku_code, product_name")
      .eq("variant_id", variantId)
      .eq("location_id", locationId)
      .single();

    if (error) {
      console.error("Error fetching stock:", error);
      return null;
    }

    return data;
  } catch (error) {
    console.error("Error in getCurrentStock:", error);
    return null;
  }
}

async function checkEventExists(supabase: any, eventId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase
      .from("event_ledger")
      .select("event_id")
      .eq("event_id", eventId)
      .single();

    return data !== null && !error;
  } catch (error) {
    return false;
  }
}

async function insertEvent(
  supabase: any,
  payload: EventPayload,
  userId: string
): Promise<{ success: boolean; eventId?: string; error?: string }> {
  try {
    // Generate event_id if not provided (for idempotency)
    const eventId = payload.event_id || crypto.randomUUID();

    // Check if event already exists (idempotency)
    const exists = await checkEventExists(supabase, eventId);
    if (exists) {
      return {
        success: true,
        eventId,
        error: "Event already processed (idempotent)",
      };
    }

    // Prepare event data
    const eventData = {
      event_id: eventId,
      event_type: payload.event_type,
      variant_id: payload.variant_id,
      quantity: payload.quantity,
      from_location_id: payload.from_location_id || null,
      to_location_id: payload.to_location_id || null,
      channel: payload.channel || "STORE",
      reference_type: payload.reference_type || null,
      reference_id: payload.reference_id || null,
      reference_number: payload.reference_number || null,
      unit_cost_price: payload.unit_cost_price || null,
      unit_selling_price: payload.unit_selling_price || null,
      total_amount: payload.total_amount || null,
      notes: payload.notes || null,
      metadata: payload.metadata || null,
      sync_source: payload.sync_source || null,
      client_timestamp: payload.client_timestamp || new Date().toISOString(),
      created_by: userId,
      created_at: new Date().toISOString(),
    };

    // Insert into event_ledger
    const { data, error } = await supabase
      .from("event_ledger")
      .insert([eventData])
      .select("event_id")
      .single();

    if (error) {
      console.error("Error inserting event:", error);
      return {
        success: false,
        error: error.message || "Failed to insert event",
      };
    }

    return {
      success: true,
      eventId: data.event_id,
    };
  } catch (error) {
    console.error("Error in insertEvent:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// =====================================================
// AUTHORIZATION CHECKS
// =====================================================

function hasLocationAccess(
  userRole: UserRole,
  fromLocationId?: string | null,
  toLocationId?: string | null
): boolean {
  // OWNER and MANAGER have access to all locations
  if (userRole.role_name === "OWNER" || userRole.role_name === "MANAGER") {
    return true;
  }

  // Check if user has access to required locations
  const requiredLocations = [fromLocationId, toLocationId].filter(
    (id) => id !== null && id !== undefined
  ) as string[];

  if (requiredLocations.length === 0) {
    return false;
  }

  return requiredLocations.every((locId) => userRole.location_ids.includes(locId));
}

function canPerformEventType(userRole: UserRole, eventType: string): boolean {
  const role = userRole.role_name;

  // OWNER and MANAGER can perform all event types
  if (role === "OWNER" || role === "MANAGER") {
    return true;
  }

  // ACCOUNTANT cannot perform any inventory events
  if (role === "ACCOUNTANT") {
    return false;
  }

  // STORE_STAFF can perform sales, returns, exchanges, adjustments
  if (role === "STORE_STAFF") {
    return ["SALE", "RETURN", "EXCHANGE_IN", "EXCHANGE_OUT", "ADJUSTMENT"].includes(
      eventType
    );
  }

  // GODOWN_STAFF can perform purchases, transfers, adjustments
  if (role === "GODOWN_STAFF") {
    return [
      "PURCHASE",
      "TRANSFER_OUT",
      "TRANSFER_IN",
      "ADJUSTMENT",
      "DAMAGE",
      "LOSS",
      "FOUND",
    ].includes(eventType);
  }

  return false;
}

// =====================================================
// MAIN HANDLER
// =====================================================

serve(async (req: Request): Promise<Response> => {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  // Handle OPTIONS request for CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only allow POST requests
  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Method not allowed. Use POST.",
      } as ApiResponse),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    // Get Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const authHeader = req.headers.get("Authorization")!;

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: { Authorization: authHeader },
      },
    });

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Unauthorized. Please authenticate.",
        } as ApiResponse),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse request body
    const payload: EventPayload = await req.json();

    // Step 1: Validate event structure
    const validation = validateEventPayload(payload);
    if (!validation.valid) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Validation failed",
          details: validation.errors,
        } as ApiResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 2: Get user role and location access
    const userRole = await getUserRole(supabase, user.id);
    if (!userRole) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "User profile not found or inactive",
        } as ApiResponse),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!userRole.is_active) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "User account is inactive",
        } as ApiResponse),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 3: Check if user can perform this event type
    if (!canPerformEventType(userRole, payload.event_type)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Role '${userRole.role_name}' is not authorized to perform '${payload.event_type}' events`,
        } as ApiResponse),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 4: Check location access
    if (
      !hasLocationAccess(
        userRole,
        payload.from_location_id,
        payload.to_location_id
      )
    ) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "You do not have access to the specified location(s)",
        } as ApiResponse),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 5: Check stock for SALE and TRANSFER_OUT events
    if (payload.event_type === "SALE" || payload.event_type === "TRANSFER_OUT") {
      const locationId = payload.from_location_id;

      if (!locationId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: `${payload.event_type} events must have from_location_id`,
          } as ApiResponse),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const stockInfo = await getCurrentStock(
        supabase,
        payload.variant_id,
        locationId
      );

      if (!stockInfo) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Unable to fetch current stock information",
          } as ApiResponse),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      // Check if sufficient stock is available
      const requiredQuantity = Math.abs(payload.quantity);
      if (stockInfo.current_quantity < requiredQuantity) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Insufficient stock",
            details: {
              product: stockInfo.product_name,
              sku: stockInfo.sku_code,
              available: stockInfo.current_quantity,
              requested: requiredQuantity,
              shortfall: requiredQuantity - stockInfo.current_quantity,
            },
          } as ApiResponse),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    // Step 6: Insert event into event_ledger
    const insertResult = await insertEvent(supabase, payload, user.id);

    if (!insertResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: insertResult.error || "Failed to insert event",
        } as ApiResponse),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Step 7: Return success response
    return new Response(
      JSON.stringify({
        success: true,
        event_id: insertResult.eventId,
        message: "Event synchronized successfully",
      } as ApiResponse),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error in sync_event:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      } as ApiResponse),
      {
        status: 500,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Content-Type": "application/json",
        },
      }
    );
  }
});
