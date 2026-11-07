import type { ReactNode } from "react";
import { Link } from "react-router-dom";

export function LinkedEntities({ text, references }: { text: string; references: Array<{ label: string; href: string }> }) {
  const parts: ReactNode[] = [];
  let cursor = 0;
  const lower = text.toLocaleLowerCase("tr");
  while (cursor < text.length) {
    const next = references.filter(ref => ref.label.trim()).map(ref => ({ ref, index: lower.indexOf(ref.label.toLocaleLowerCase("tr"), cursor) })).filter(item => item.index >= cursor).sort((a, b) => a.index - b.index || b.ref.label.length - a.ref.label.length)[0];
    if (!next) { parts.push(text.slice(cursor)); break; }
    parts.push(text.slice(cursor, next.index));
    parts.push(<Link key={next.index} to={next.ref.href}>{text.slice(next.index, next.index + next.ref.label.length)}</Link>);
    cursor = next.index + next.ref.label.length;
  }
  return <>{parts}</>;
}
