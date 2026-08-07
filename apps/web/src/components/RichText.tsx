import { Fragment } from "react";
import { Link } from "react-router-dom";
import { parseRichText } from "@konnektora/shared";

export function RichText({ text }: { text: string }) {
  return <>{parseRichText(text).map((token, index) => {
    if (token.type === "mention" || token.type === "tag") return <Link key={index} to={token.href!}>{token.text}</Link>;
    if (token.type === "email") return <a key={index} href={token.href}>{token.text}</a>;
    if (token.type === "url") return <a key={index} href={token.href} rel="noopener noreferrer" target="_blank">{token.text}</a>;
    return <Fragment key={index}>{token.text}</Fragment>;
  })}</>;
}
