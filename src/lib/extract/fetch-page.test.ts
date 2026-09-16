import { describe, expect, it } from "vitest";
import { EXTRACT_ERROR } from "@/constants/extract";
import { parsePublicUrl } from "@/lib/url";
import { fetchPage, isBlockedAddress } from "./fetch-page";

describe("isBlockedAddress", () => {
  it.each(["127.0.0.1", "10.1.2.3", "172.16.0.1", "192.168.1.1", "169.254.169.254", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1", "not-an-ip"])(
    "blocks %s",
    (ip) => expect(isBlockedAddress(ip)).toBe(true),
  );
  it.each(["93.184.216.34", "1.1.1.1", "2606:4700:4700::1111"])("allows %s", (ip) => expect(isBlockedAddress(ip)).toBe(false));
});

describe("parsePublicUrl", () => {
  it("adds https to bare domains", () => expect(parsePublicUrl("example.com/a")?.href).toBe("https://example.com/a"));
  it("rejects other protocols and credentials", () => {
    expect(parsePublicUrl("file:///etc/passwd")).toBeNull();
    expect(parsePublicUrl("javascript:alert(1)")).toBeNull();
    expect(parsePublicUrl("https://user:pw@example.com")).toBeNull();
    expect(parsePublicUrl("http://")).toBeNull();
  });
});

describe("fetchPage", () => {
  it("refuses private addresses before connecting", async () => {
    expect(await fetchPage("http://127.0.0.1:3000/")).toMatchObject({ ok: false, code: EXTRACT_ERROR.BLOCKED_HOST });
    expect(await fetchPage("http://[::1]/")).toMatchObject({ ok: false, code: EXTRACT_ERROR.BLOCKED_HOST });
  });
  it("refuses hostnames that resolve to private addresses", async () => {
    expect(await fetchPage("http://localhost:3000/")).toMatchObject({ ok: false, code: EXTRACT_ERROR.BLOCKED_HOST });
  });
});

describe("isBlockedAddress: IPv6 forms embedding IPv4", () => {
  it.each(["::7f00:1", "::ffff:0:7f00:1", "64:ff9b:1::7f00:1", "2002:7f00:1::", "fec0::1"])("blocks %s", (ip) =>
    expect(isBlockedAddress(ip)).toBe(true),
  );
});

describe("isTooComplex", () => {
  it("rejects pages with more than 100k tags", async () => {
    const { isTooComplex } = await import("./fetch-page");
    expect(isTooComplex("<p>x</p>".repeat(60_000))).toBe(true);
    expect(isTooComplex("<p>x</p>".repeat(1000))).toBe(false);
  });
});

describe("decodeHtml", () => {
  const cp1252 = (s: string) => Uint8Array.from([...s].map((c) => ({ "—": 0x97, "’": 0x92, "è": 0xe8, "é": 0xe9 })[c] ?? c.charCodeAt(0)));
  const utf8 = (s: string) => new TextEncoder().encode(s);
  const TEXT = "Genève — it’s Gérald";

  it("decodes undeclared Windows-1252 pages (28 paulgraham.com essays) instead of producing �", async () => {
    const { decodeHtml } = await import("./fetch-page");
    expect(decodeHtml(cp1252(`<p>${TEXT}</p>`), "text/html")).toBe(`<p>${TEXT}</p>`);
  });

  it("falls back to Windows-1252 when a page wrongly declares UTF-8 and has no UTF-8 characters", async () => {
    const { decodeHtml } = await import("./fetch-page");
    expect(decodeHtml(cp1252(`<meta charset="utf-8"><p>${TEXT}</p>`), "text/html")).toContain(TEXT);
    expect(decodeHtml(cp1252(`<p>${TEXT}</p>`), "text/html; charset=UTF-8")).toContain(TEXT);
  });

  it("keeps real UTF-8, with or without a declaration or BOM", async () => {
    const { decodeHtml } = await import("./fetch-page");
    expect(decodeHtml(utf8(`<p>${TEXT} 日本</p>`), "text/html")).toBe(`<p>${TEXT} 日本</p>`);
    expect(decodeHtml(Uint8Array.from([0xef, 0xbb, 0xbf, ...utf8(TEXT)]), "text/html; charset=windows-1252")).toBe(TEXT);
  });

  it("keeps a mostly-UTF-8 page as UTF-8 even with one broken byte", async () => {
    const { decodeHtml } = await import("./fetch-page");
    const bytes = Uint8Array.from([...utf8("A dash — here "), 0x97, ...utf8(" and more — dashes")]);
    const out = decodeHtml(bytes, "text/html");
    expect(out.startsWith("A dash — here ")).toBe(true);
    expect(out.endsWith(" and more — dashes")).toBe(true);
  });

  it("honours a declared non-UTF-8 charset, including a meta tag after a long head", async () => {
    const { decodeHtml } = await import("./fetch-page");
    const head = `<head>${"<link rel=x>".repeat(800)}<meta http-equiv="Content-Type" content="text/html; charset=iso-8859-1">`;
    expect(decodeHtml(Uint8Array.from([...utf8(head), 0xe8]), "text/html")).toBe(`${head}è`);
  });
});
