import { describe, expect, it } from "vitest";
import { readPath, readQuery, readSegments, urlFromSegments } from "./read-path";

describe("readPath", () => {
  it("writes a link the way a person would say it", () => {
    expect(readPath("https://www.highagency.com/")).toBe("/read/highagency.com");
    expect(readPath("https://www.paulgraham.com/powerful.html")).toBe("/read/paulgraham.com/powerful.html");
    expect(readPath("https://example.com/a/b/")).toBe("/read/example.com/a/b");
    expect(readPath("https://example.com/", true)).toBe("/read/example.com?mode=simple");
  });

  it("keeps the long form for links the short one would change", () => {
    for (const url of [
      "http://example.com/a", // plain http
      "https://example.com/a?id=5", // a query of its own
      "https://example.com:8443/a", // a port
      "https://example.com/a%2Fb", // a slash inside one segment
      "https://example.com/a%FF", // a broken escape
    ]) {
      expect(readPath(url), url).toBe(`/read?url=${encodeURIComponent(url)}`);
    }
  });

  it("leads back to the same page", () => {
    for (const url of [
      "https://example.com/",
      "https://www.example.com/posts/hello-world",
      "https://example.com/café/a b",
      "https://example.co.uk/2024/01/a.html",
    ]) {
      const segments = readSegments(url);
      expect(segments, url).not.toBeNull();
      expect(urlFromSegments(segments!)).toBe(new URL(url.replace("://www.", "://")).href);
    }
  });
});

describe("urlFromSegments", () => {
  it("refuses a path that is not the address it looks like", () => {
    expect(urlFromSegments([])).toBeNull();
    expect(urlFromSegments(["example.com/evil.com", "a"])).toBeNull();
    expect(urlFromSegments(["user@evil.com"])).toBeNull();
    expect(urlFromSegments(["example.com:8443"])).toBeNull();
    expect(urlFromSegments(["localhost"])).toBe("https://localhost/"); // the fetcher blocks it, not this
  });

  it("puts the path back together", () => {
    expect(urlFromSegments(["example.com"])).toBe("https://example.com/");
    expect(urlFromSegments(["example.com", "a b"])).toBe("https://example.com/a%20b");
  });
});

describe("readQuery", () => {
  it("reads an encoded link", () => {
    expect(readQuery("?url=https%3A%2F%2Fexample.com%2Fa")).toEqual({ url: "https://example.com/a", simple: false });
    expect(readQuery("?url=https%3A%2F%2Fexample.com%2Fa&mode=simple")).toEqual({ url: "https://example.com/a", simple: true });
  });

  it("keeps a link pasted straight onto the address whole", () => {
    expect(readQuery("?url=https://site.com/a?utm_source=x&utm_medium=y").url).toBe("https://site.com/a?utm_source=x&utm_medium=y");
    expect(readQuery("?url=https://site.com/a+b").url).toBe("https://site.com/a+b");
    expect(readQuery("?url=https://site.com/a?b=1&mode=simple")).toEqual({ url: "https://site.com/a?b=1", simple: true });
    expect(readQuery("?url=https://site.com/100%").url).toBe("https://site.com/100%");
  });

  it("has nothing to read without a link", () => {
    expect(readQuery("")).toEqual({ url: "", simple: false });
    expect(readQuery("?mode=simple")).toEqual({ url: "", simple: false });
    expect(readQuery("?myurl=https://site.com")).toEqual({ url: "", simple: false });
  });

  it("settles: what the redirect sends you to never redirects again", () => {
    // The same two steps the proxy (src/proxy.ts) takes, so a wrong pair here would be a redirect loop.
    const tidy = (search: string) => {
      const { url, simple } = readQuery(search);
      return url ? readPath(url, simple) : `/read${search}`;
    };
    for (const messy of [
      "?url=https://site.com/a?b=1&c=2",
      "?url=https://www.site.com/a+b",
      "?url=https://site.com/100%",
      "?url=site.com",
      "?url=https%3A%2F%2Fsite.com%2Fa%2526b",
      "?url=https://site.com/a&mode=simple",
    ]) {
      const once = tidy(messy);
      const search = once.slice(once.indexOf("?"));
      // A short address leaves the query behind and is never seen here again.
      if (!once.startsWith("/read?")) continue;
      expect(tidy(search), messy).toBe(once);
    }
  });

});
