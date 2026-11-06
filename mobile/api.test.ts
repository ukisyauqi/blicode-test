import { afterEach, describe, it } from "node:test";
import assert from "node:assert/strict";
import { api, ApiError, getToken, setToken } from "./src/lib/api.ts";

const realFetch = globalThis.fetch;

function mockFetch(status: number, body: unknown, seen: unknown[]) {
  globalThis.fetch = (async (url: unknown, init: unknown) => {
    seen.push([url, init]);
    return { ok: status >= 200 && status < 300, status, json: async () => body };
  }) as unknown as typeof fetch;
}

afterEach(() => {
  globalThis.fetch = realFetch;
});

describe("api auth", () => {
  it("mengirim Bearer saat token tersimpan", async () => {
    await setToken("t123");
    const seen: [unknown, { headers: Record<string, string> }][] = [];
    mockFetch(200, { data: { ok: true } }, seen as unknown[]);

    await api("/auth/me");

    assert.equal(seen[0][1].headers.Authorization, "Bearer t123");
  });

  it("401 membersihkan token dan menampilkan pesan server", async () => {
    await setToken("basi");
    mockFetch(401, { error: { code: "X", message: "Sesi tidak valid" } }, []);

    const err = await api("/auth/me").catch((e: unknown) => e);
    assert.ok(err instanceof ApiError);
    assert.equal((err as ApiError).message, "Sesi tidak valid");
    assert.equal(await getToken(), null);
  });

  it("server mati menghasilkan kode NETWORK", async () => {
    globalThis.fetch = (async () => {
      throw new Error("down");
    }) as unknown as typeof fetch;

    const err = await api("/auth/me").catch((e: unknown) => e);
    assert.equal((err as ApiError).code, "NETWORK");
  });
});
