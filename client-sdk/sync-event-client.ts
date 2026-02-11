// =====================================================
// SYNC EVENT CLIENT SDK
// TypeScript client helper for calling sync_event function
// =====================================================

import { SupabaseClient } from "@supabase/supabase-js";

// =====================================================
// TYPES
// =====================================================

export type EventType =
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

export type Channel = "STORE" | "AMAZON" | "WEBSITE" | "WHOLESALE" | "MANUAL";

export interface SyncEventRequest {
  event_id?: string;
  event_type: EventType;
  variant_id: string;
  quantity: number;
  from_location_id?: string | null;
  to_location_id?: string | null;
  channel?: Channel;
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

export interface SyncEventResponse {
  success: boolean;
  event_id?: string;
  message?: string;
  error?: string;
  details?: any;
}

// =====================================================
// EVENT BUILDER HELPERS
// =====================================================

export class EventBuilder {
  private event: Partial<SyncEventRequest> = {};

  static sale(variantId: string, quantity: number, fromLocationId: string): EventBuilder {
    const builder = new EventBuilder();
    builder.event = {
      event_type: "SALE",
      variant_id: variantId,
      quantity: -Math.abs(quantity), // Ensure negative
      from_location_id: fromLocationId,
      channel: "STORE",
    };
    return builder;
  }

  static purchase(variantId: string, quantity: number, toLocationId: string): EventBuilder {
    const builder = new EventBuilder();
    builder.event = {
      event_type: "PURCHASE",
      variant_id: variantId,
      quantity: Math.abs(quantity), // Ensure positive
      to_location_id: toLocationId,
    };
    return builder;
  }

  static transfer(
    variantId: string,
    quantity: number,
    fromLocationId: string,
    toLocationId: string
  ): EventBuilder {
    const builder = new EventBuilder();
    builder.event = {
      event_type: "TRANSFER_OUT",
      variant_id: variantId,
      quantity: -Math.abs(quantity), // Ensure negative
      from_location_id: fromLocationId,
      to_location_id: toLocationId,
    };
    return builder;
  }

  static return(variantId: string, quantity: number, toLocationId: string): EventBuilder {
    const builder = new EventBuilder();
    builder.event = {
      event_type: "RETURN",
      variant_id: variantId,
      quantity: Math.abs(quantity), // Ensure positive
      to_location_id: toLocationId,
    };
    return builder;
  }

  static adjustment(
    variantId: string,
    quantity: number,
    locationId: string,
    reason: string
  ): EventBuilder {
    const builder = new EventBuilder();
    builder.event = {
      event_type: "ADJUSTMENT",
      variant_id: variantId,
      quantity: quantity,
      to_location_id: quantity > 0 ? locationId : undefined,
      from_location_id: quantity < 0 ? locationId : undefined,
      notes: reason,
    };
    return builder;
  }

  withEventId(eventId: string): this {
    this.event.event_id = eventId;
    return this;
  }

  withChannel(channel: Channel): this {
    this.event.channel = channel;
    return this;
  }

  withReference(type: string, id?: string, number?: string): this {
    this.event.reference_type = type;
    this.event.reference_id = id || null;
    this.event.reference_number = number || null;
    return this;
  }

  withPricing(costPrice?: number, sellingPrice?: number, totalAmount?: number): this {
    this.event.unit_cost_price = costPrice || null;
    this.event.unit_selling_price = sellingPrice || null;
    this.event.total_amount = totalAmount || null;
    return this;
  }

  withNotes(notes: string): this {
    this.event.notes = notes;
    return this;
  }

  withMetadata(metadata: Record<string, any>): this {
    this.event.metadata = metadata;
    return this;
  }

  withSyncSource(source: string): this {
    this.event.sync_source = source;
    return this;
  }

  withClientTimestamp(timestamp: string | Date): this {
    this.event.client_timestamp =
      timestamp instanceof Date ? timestamp.toISOString() : timestamp;
    return this;
  }

  build(): SyncEventRequest {
    if (!this.event.event_type || !this.event.variant_id || this.event.quantity === undefined) {
      throw new Error("Missing required fields: event_type, variant_id, quantity");
    }
    return this.event as SyncEventRequest;
  }
}

// =====================================================
// SYNC EVENT CLIENT
// =====================================================

export class SyncEventClient {
  private supabase: SupabaseClient;
  private functionUrl: string;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
    // Get function URL from Supabase client
    const url = (supabase as any).supabaseUrl || "";
    this.functionUrl = `${url}/functions/v1/sync_event`;
  }

  /**
   * Sync a single event to the server
   */
  async sync(event: SyncEventRequest): Promise<SyncEventResponse> {
    try {
      // Get auth token
      const {
        data: { session },
      } = await this.supabase.auth.getSession();

      if (!session) {
        return {
          success: false,
          error: "Not authenticated. Please log in.",
        };
      }

      // Call edge function
      const response = await fetch(this.functionUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(event),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Sync multiple events (batch operation)
   * Note: Current implementation sends them sequentially
   * TODO: Implement proper batch endpoint for better performance
   */
  async syncBatch(events: SyncEventRequest[]): Promise<SyncEventResponse[]> {
    const results: SyncEventResponse[] = [];

    for (const event of events) {
      const result = await this.sync(event);
      results.push(result);

      // Stop on first failure (optional behavior)
      if (!result.success) {
        console.warn("Batch sync stopped due to error:", result.error);
        // Optionally continue with other events
      }
    }

    return results;
  }

  /**
   * Sync with retry logic for offline scenarios
   */
  async syncWithRetry(
    event: SyncEventRequest,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<SyncEventResponse> {
    let lastError: SyncEventResponse | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      const result = await this.sync(event);

      if (result.success) {
        return result;
      }

      lastError = result;

      // Don't retry on validation errors (4xx)
      if (result.error?.includes("Validation") || result.error?.includes("Insufficient stock")) {
        return result;
      }

      // Wait before retry
      if (attempt < maxRetries - 1) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay * (attempt + 1)));
      }
    }

    return lastError || { success: false, error: "Max retries exceeded" };
  }
}

// =====================================================
// OFFLINE QUEUE MANAGER
// =====================================================

export interface QueuedEvent {
  id: string;
  event: SyncEventRequest;
  attempts: number;
  lastAttempt?: Date;
  error?: string;
  status: "pending" | "syncing" | "synced" | "failed";
}

export class OfflineQueueManager {
  private client: SyncEventClient;
  private storageKey: string = "sync_event_queue";

  constructor(client: SyncEventClient) {
    this.client = client;
  }

  /**
   * Add event to offline queue
   */
  async enqueue(event: SyncEventRequest): Promise<string> {
    const queue = this.getQueue();
    const queuedEvent: QueuedEvent = {
      id: event.event_id || crypto.randomUUID(),
      event: {
        ...event,
        event_id: event.event_id || crypto.randomUUID(),
      },
      attempts: 0,
      status: "pending",
    };

    queue.push(queuedEvent);
    this.saveQueue(queue);

    return queuedEvent.id;
  }

  /**
   * Process pending events in queue
   */
  async processPending(): Promise<{
    synced: number;
    failed: number;
    pending: number;
  }> {
    const queue = this.getQueue();
    let synced = 0;
    let failed = 0;

    for (const queuedEvent of queue) {
      if (queuedEvent.status !== "pending") continue;

      queuedEvent.status = "syncing";
      queuedEvent.attempts++;
      queuedEvent.lastAttempt = new Date();
      this.saveQueue(queue);

      const result = await this.client.sync(queuedEvent.event);

      if (result.success) {
        queuedEvent.status = "synced";
        synced++;
      } else {
        queuedEvent.status = queuedEvent.attempts >= 3 ? "failed" : "pending";
        queuedEvent.error = result.error;
        if (queuedEvent.status === "failed") {
          failed++;
        }
      }

      this.saveQueue(queue);
    }

    const pending = queue.filter((e) => e.status === "pending").length;

    return { synced, failed, pending };
  }

  /**
   * Get current queue
   */
  getQueue(): QueuedEvent[] {
    const stored = localStorage.getItem(this.storageKey);
    if (!stored) return [];

    try {
      return JSON.parse(stored);
    } catch {
      return [];
    }
  }

  /**
   * Save queue to storage
   */
  private saveQueue(queue: QueuedEvent[]): void {
    localStorage.setItem(this.storageKey, JSON.stringify(queue));
  }

  /**
   * Clear synced events from queue
   */
  clearSynced(): void {
    const queue = this.getQueue();
    const filtered = queue.filter((e) => e.status !== "synced");
    this.saveQueue(filtered);
  }

  /**
   * Get queue status
   */
  getStatus(): {
    total: number;
    pending: number;
    synced: number;
    failed: number;
  } {
    const queue = this.getQueue();
    return {
      total: queue.length,
      pending: queue.filter((e) => e.status === "pending").length,
      synced: queue.filter((e) => e.status === "synced").length,
      failed: queue.filter((e) => e.status === "failed").length,
    };
  }
}

// =====================================================
// USAGE EXAMPLES
// =====================================================

/*
// Example 1: Simple sale
const client = new SyncEventClient(supabase);

const saleEvent = EventBuilder
  .sale("variant-uuid", 5, "store-location-uuid")
  .withChannel("STORE")
  .withReference("BILL", "bill-uuid", "INV-001")
  .withPricing(250, 499, 2495)
  .build();

const result = await client.sync(saleEvent);
console.log(result);

// Example 2: Purchase with metadata
const purchaseEvent = EventBuilder
  .purchase("variant-uuid", 100, "godown-uuid")
  .withReference("PURCHASE_ORDER", "po-uuid", "PO-2026-001")
  .withPricing(250)
  .withMetadata({
    supplier: "ABC Suppliers",
    invoice_number: "SUP-123"
  })
  .build();

await client.sync(purchaseEvent);

// Example 3: Transfer between locations
const transferEvent = EventBuilder
  .transfer("variant-uuid", 20, "store-uuid", "godown-uuid")
  .withReference("TRANSFER_NOTE", null, "TN-001")
  .withNotes("Replenishment transfer")
  .build();

await client.sync(transferEvent);

// Example 4: Offline queue
const queueManager = new OfflineQueueManager(client);

// Add to queue when offline
await queueManager.enqueue(saleEvent);

// Process when back online
const status = await queueManager.processPending();
console.log(`Synced: ${status.synced}, Failed: ${status.failed}, Pending: ${status.pending}`);

// Example 5: Retry on failure
const result = await client.syncWithRetry(saleEvent, 3, 2000);
if (!result.success) {
  console.error("Failed after retries:", result.error);
}
*/
