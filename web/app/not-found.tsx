import Link from "next/link";

export default function NotFound() {
  return (
    <div className="stack">
      <h1>Page not found</h1>
      <p>
        This page doesn&apos;t exist, or it belongs to a different browser session. <Link href="/">Go to the shop</Link>.
      </p>
    </div>
  );
}
