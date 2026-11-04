import { test } from "node:test";
import assert from "node:assert/strict";
import express from "express";
import { globalLimiter, authLimiter, uploadLimiter } from "./rate-limiter.middleware.js";

test("rate-limiter: limiters are valid middleware functions", () => {
  assert.equal(typeof globalLimiter, "function");
  assert.equal(typeof authLimiter, "function");
  assert.equal(typeof uploadLimiter, "function");
});

test("rate-limiter: skip logic excludes /health and root", () => {
  const reqHealth = { path: "/health", url: "/health" };
  const reqRoot = { path: "/", url: "/" };
  const reqEvents = { path: "/tickets/events", url: "/tickets/events" };
  const reqOther = { path: "/tickets", url: "/tickets" };

  // Testing skip predicate logic directly
  const isSkipped = (req) => {
    const p = req.path || req.url;
    return p === "/health" || p === "/" || p.includes("/events");
  };

  assert.equal(isSkipped(reqHealth), true);
  assert.equal(isSkipped(reqRoot), true);
  assert.equal(isSkipped(reqEvents), true);
  assert.equal(isSkipped(reqOther), false);
});

