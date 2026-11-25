import Link from "next/link";
import type { Crumb } from "@/lib/discovery";

export function Breadcrumb({ items }: { items: Crumb[] }) {
  return <nav className="breadcrumb" aria-label="面包屑"><ol>
    {items.map((item, index) => {
      const last = index === items.length - 1;
      return <li key={item.path}>
        {last ? <span aria-current="page">{item.name}</span> : <Link href={item.path}>{item.name}</Link>}
        {last ? null : <span className="crumb-sep" aria-hidden="true">&gt;</span>}
      </li>;
    })}
  </ol></nav>;
}
