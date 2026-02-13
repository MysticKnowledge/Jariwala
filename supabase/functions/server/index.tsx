import { Hono } from "npm:hono@4";
import { cors } from "npm:hono/cors";
import { logger } from "npm:hono/logger";
import * as kv from "./kv_store.tsx";
import { handleCSVImport } from "./csv-import.tsx";
import { handleCreateUser, handleResetPassword } from "./user-management.tsx";

const app = new Hono();

// Enable logger
app.use('*', logger(console.log));

// Enable CORS for all routes and methods
app.use(
  "/*",
  cors({
    origin: "*",
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);

// Health check endpoint
app.get("/make-server-c45d1eeb/health", (c) => {
  return c.json({ status: "ok" });
});

// Bulk import endpoint for CSV only
app.post("/make-server-c45d1eeb/bulk-import-csv", async (c) => {
  const request = c.req.raw;
  return await handleCSVImport(request);
});

// User management endpoints
app.post("/make-server-c45d1eeb/create-user", async (c) => {
  const request = c.req.raw;
  return await handleCreateUser(request);
});

app.post("/make-server-c45d1eeb/reset-password", async (c) => {
  const request = c.req.raw;
  return await handleResetPassword(request);
});

Deno.serve(app.fetch);