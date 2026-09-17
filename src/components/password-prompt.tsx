"use client";

import Link from "next/link";
import { useState } from "react";
import type { PasswordPromptProps } from "@/types/reader";

/** A PDF can be locked; the password is used to open it and never stored. */
export function PasswordPrompt({ name, wrong, onSubmit }: PasswordPromptProps) {
  const [password, setPassword] = useState("");

  return (
    <main className="notice">
      <div className="notice-inner">
        <Link href="/" className="notice-home">
          OpenRead
        </Link>
        <h1>This PDF needs a password.</h1>
        <p className="notice-detail">{name}</p>
        <form
          className="paste-form"
          onSubmit={(e) => {
            e.preventDefault();
            if (password) onSubmit(password);
          }}
        >
          <label htmlFor="pdf-password">Password</label>
          <input
            id="pdf-password"
            type="password"
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
          />
          {wrong && (
            <p className="paste-hint" role="alert">
              That password didn&rsquo;t open it. Try again.
            </p>
          )}
          <p className="paste-hint">It is used to open the file on this device, and never kept.</p>
          <button type="submit">Open</button>
        </form>
      </div>
    </main>
  );
}
