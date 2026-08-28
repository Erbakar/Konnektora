import { Fragment } from "react";
import { Link } from "react-router-dom";
import { parseRichText } from "@konnektora/shared";

export function RichText({ text, hideEmbeddableUrls = false }: { text: string; hideEmbeddableUrls?: boolean }) {
  const plainText = /<[^>]+>/.test(text)
    ? new DOMParser()
        .parseFromString(
          text
            .replace(/<br\s*\/?>/gi, "\n")
            .replace(/<\/(?:p|div|h[1-6]|li)>/gi, "$&\n"),
          "text/html",
        )
        .body.textContent?.trim() ?? text
    : text;
  const displayText = hideEmbeddableUrls
    ? plainText.replace(/https?:\/\/[^\s]+/gi, (match) => {
        const url = match.replace(/[),.!?;:]+$/g, "");
        return /(?:youtu\.be|youtube\.com|soundcloud\.com)\//i.test(url) ? "" : match;
      }).replace(/[ \t]{2,}/g, " ").trim()
    : plainText;

  return <>{parseRichText(displayText).map((token, index) => {
    if (token.type === "mention" || token.type === "tag") return <Link className="rich-text-link" key={index} to={token.href!}>{token.text}</Link>;
    if (token.type === "email") return <a className="rich-text-link" key={index} href={token.href}>{token.text}</a>;
    if (token.type === "url") {
      if (hideEmbeddableUrls && /(?:youtu\.be|youtube\.com|soundcloud\.com)\//i.test(token.href ?? token.text)) return null;
      return <a className="rich-text-link" key={index} href={token.href} rel="noopener noreferrer" target="_blank">{token.text}</a>;
    }
    return <Fragment key={index}>{token.text}</Fragment>;
  })}</>;
}
