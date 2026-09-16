import { describe, expect, it } from "vitest";
import { EXTRACT_ERROR } from "@/constants/extract";
import { fetchPage, isBlockedAddress, parsePublicUrl } from "./fetch-page";

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
