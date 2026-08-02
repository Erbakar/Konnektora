import { Fragment } from "react";
import { Link } from "react-router-dom";

const tokens = /(“[^”]+”|"[^"]+"|[^\s|]+\|(?:https?:\/\/)?[^\s]+|[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}|@[A-Za-z0-9_.]{2,30})/g;

export function RichText({ text }: { text: string }) {
  return <>{text.split(tokens).filter(Boolean).map((part, index) => {
    if (part.startsWith("@")) return <Link key={index} to={`/users/${part.slice(1)}`}>{part}</Link>;
    if (/^[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}$/.test(part)) return <a key={index} href={`mailto:${part}`}>{part}</a>;
    if (part.includes("|")) {
      const [label, raw] = part.split("|", 2);
      return <a key={index} href={/^https?:\/\//i.test(raw ?? "") ? raw : `https://${raw}`} rel="noreferrer" target="_blank">{label}</a>;
    }
    if (/^[“"].+[”"]$/.test(part)) {
      const label = part.slice(1, -1);
      return <Link key={index} to={`/tags/${encodeURIComponent(label.toLocaleLowerCase("tr-TR").replace(/\s+/g, "-"))}`}>{part}</Link>;
    }
    return <Fragment key={index}>{part}</Fragment>;
  })}</>;
}
