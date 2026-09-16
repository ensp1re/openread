import Link from "next/link";
import { UrlForm } from "@/components/url-form";

export default function Home() {
  return (
    <main className="home">
      <div className="home-inner">
        <h1 className="home-title">OpenRead</h1>
        <p className="home-lede">Paste a link to an article. Read it in a quiet, well-set page.</p>
        <UrlForm autoFocus />
        <p className="home-alt">
          Have the text already? <Link href="/paste">Paste it instead</Link>.
        </p>
      </div>
      <p className="home-footnote">No account. Nothing to install. Your settings stay in this browser.</p>
    </main>
  );
}
