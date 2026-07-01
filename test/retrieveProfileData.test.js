import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getPaginationSettings,
  buildSortClause,
} from "../models/retrieveProfileData.js";

test("uses the requested limit and page values when present", () => {
  const settings = getPaginationSettings({ page: "2", limit: "50" });

  assert.deepEqual(settings, {
    currentPage: 2,
    currentLimit: 50,
    offset: 50,
  });
});

test("caps the requested limit at 50 and defaults to page 1", () => {
  const settings = getPaginationSettings({ limit: "1000" });

  assert.deepEqual(settings, {
    currentPage: 1,
    currentLimit: 50,
    offset: 0,
  });
});

test("builds a sort clause for supported columns and direction", () => {
  const clause = buildSortClause({ sort_by: "created_at", order: "desc" });

  assert.equal(clause, " ORDER BY created_at DESC");
});

test("returns no sort clause for unsupported sort inputs", () => {
  const clause = buildSortClause({ sort_by: "unknown", order: "desc" });

  assert.equal(clause, null);
});
