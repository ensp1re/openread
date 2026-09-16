import type { UrlFormProps } from "@/types/pages";

/** A plain GET form: works before JavaScript loads, and the reader URL stays shareable. */
export function UrlForm({ defaultValue, autoFocus }: UrlFormProps) {
  return (
    <form action="/read" method="get" className="url-form" role="search" aria-label="Read an article">
      <label htmlFor="url" className="sr-only">
        Article link
      </label>
      <input
        id="url"
        name="url"
        type="text"
        inputMode="url"
        autoComplete="off"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="go"
        required
        placeholder="Paste an article link"
        defaultValue={defaultValue}
        autoFocus={autoFocus}
      />
      <button type="submit">Read</button>
    </form>
  );
}
