import { afterEach, expect, test, vi } from "vitest";
import { api } from "./api";

afterEach(() => {
  vi.unstubAllGlobals();
});

test("api sends GET requests without a body and tolerates an empty JSON response", async () => {
  const json = vi.fn().mockRejectedValue(new Error("empty"));
  const fetchMock = vi.fn().mockResolvedValue({ ok: true, json });
  vi.stubGlobal("fetch", fetchMock);

  await expect(api("/api/example")).resolves.toEqual({});
  expect(fetchMock).toHaveBeenCalledWith("/api/example", {
    method: "GET",
    credentials: "same-origin",
    headers: undefined,
    body: undefined,
  });
});

test("api serializes request bodies and returns successful JSON", async () => {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    json: vi.fn().mockResolvedValue({ saved: true }),
  });
  vi.stubGlobal("fetch", fetchMock);

  await expect(api("/api/example", { method: "POST", body: { value: 3 } }))
    .resolves.toEqual({ saved: true });
  expect(fetchMock).toHaveBeenCalledWith("/api/example", {
    method: "POST",
    credentials: "same-origin",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ value: 3 }),
  });
});

test("api uses server errors when available and a fallback otherwise", async () => {
  const fetchMock = vi.fn()
    .mockResolvedValueOnce({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: "Specific failure" }),
    })
    .mockResolvedValueOnce({
      ok: false,
      json: vi.fn().mockResolvedValue({ error: 42 }),
    })
    .mockResolvedValueOnce({
      ok: false,
      json: vi.fn().mockResolvedValue(null),
    });
  vi.stubGlobal("fetch", fetchMock);

  await expect(api("/specific")).rejects.toThrow("Specific failure");
  await expect(api("/invalid-error")).rejects.toThrow("Request failed.");
  await expect(api("/missing-error")).rejects.toThrow("Request failed.");
});
