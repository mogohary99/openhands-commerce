"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function NavLinks({ items }: { items: number }) {
  const path = usePathname();
  return (
    <ul>
      <li>
        <Link href="/" aria-current={path === "/" ? "page" : undefined}>
          Shop
        </Link>
      </li>
      <li>
        <Link href="/review" aria-current={path === "/review" ? "page" : undefined}>
          Your order
          {items > 0 && (
            <span className="count">
              {items}
              <span className="visually-hidden"> {items === 1 ? "item" : "items"}</span>
            </span>
          )}
        </Link>
      </li>
    </ul>
  );
}
