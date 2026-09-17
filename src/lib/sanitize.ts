import type createDOMPurify from "dompurify";

type Purifier = ReturnType<typeof createDOMPurify>;
type Config = Parameters<Purifier["sanitize"]>[1];

/**
 * One config for every untrusted document: extracted web pages, pasted text and opened files.
 * Scripts, styles, forms, frames and event handlers are dropped; ids are prefixed so a document
 * can't collide with the app's own elements.
 */
export const sanitizeConfig = (): Config => ({
  FORBID_TAGS: ["style", "form", "input", "button", "textarea", "select", "iframe", "object", "embed", "dialog", "base", "meta", "link"],
  FORBID_ATTR: ["style", "class", "align", "bgcolor", "color", "face", "size", "border"],
  SANITIZE_NAMED_PROPS: true,
});

export const sanitizeToHtml = (purify: Purifier, html: string): string => purify.sanitize(html, sanitizeConfig()) as string;

export const sanitizeToDom = (purify: Purifier, html: string): HTMLElement =>
  purify.sanitize(html, { ...sanitizeConfig(), RETURN_DOM: true }) as unknown as HTMLElement;
