import { useQuery } from "@tanstack/react-query";
import { Search, Tag as TagIcon } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { DiscoverySearch } from "@konnektora/shared";
import { createUserTag, getUserSession, resolveMediaUrl, searchDiscovery } from "../lib/api";

type SearchItem = DiscoverySearch["items"][number];
const RECENT_KEY = "konnektora:recent-searches";
const RECENT_LIMIT = 5;

function readRecent(): SearchItem[] {
  try { const value = JSON.parse(window.localStorage.getItem(RECENT_KEY) ?? "[]"); return Array.isArray(value) ? value.slice(0, RECENT_LIMIT) : []; } catch { return []; }
}
function rememberRecent(item: SearchItem) {
  try { window.localStorage.setItem(RECENT_KEY, JSON.stringify([item, ...readRecent().filter((row) => row.id !== item.id)].slice(0, RECENT_LIMIT))); } catch { /* depolama kapalı */ }
}

/**
 * 23/11 #50: masaüstü başlığında navigasyonun başındaki "Ara".
 * Üzerine gelince kutu sağa doğru açılır; tıklanınca odaklanır ve son aramalar listelenir; yazdıkça etkinlik, mekân,
 * etiket ve üyelerde anlık arama yapılır. Birebir etiket yoksa "Etiket oluştur", en altta "Arama sayfasında göster".
 * Kutu ve pencere dışına tıklanınca her şey kapanır. Tablette (≤1100px) doğrudan arama sayfasına gider.
 */
export function HeaderSearch({ language }: { language: "tr" | "en" }) {
  const t = (tr: string, en: string) => (language === "tr" ? tr : en);
  const navigate = useNavigate();
  const user = getUserSession();
  const root = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [hover, setHover] = useState(false);
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [recent, setRecent] = useState<SearchItem[]>([]);
  const [tagError, setTagError] = useState("");
  useEffect(() => { const timer = window.setTimeout(() => setDebounced(query.trim()), 200); return () => window.clearTimeout(timer); }, [query]);
  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent) => { if (!root.current?.contains(event.target as Node)) { setOpen(false); setQuery(""); setTagError(""); } };
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") { setOpen(false); setQuery(""); input.current?.blur(); } };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", escape);
    return () => { document.removeEventListener("mousedown", close); document.removeEventListener("keydown", escape); };
  }, [open]);
  const results = useQuery({ queryKey: ["header-search", debounced], queryFn: () => searchDiscovery(debounced), enabled: open && debounced.length >= 1, staleTime: 30_000 });
  const items = results.data?.items ?? [];
  const exactTag = items.some((item) => item.kind === "tag" && item.title.replace(/^#/, "").toLocaleLowerCase("tr-TR") === debounced.replace(/^#/, "").toLocaleLowerCase("tr-TR"));
  const expanded = open || hover || Boolean(query);

  function activate() {
    if (window.matchMedia("(max-width: 1100px)").matches) { navigate("/search"); return; }
    setRecent(readRecent());
    setOpen(true);
    window.requestAnimationFrame(() => input.current?.focus());
  }
  function choose(item: SearchItem) { rememberRecent(item); setOpen(false); setQuery(""); navigate(item.href); }
  async function createTag() {
    const name = debounced.replace(/^#/, "").trim();
    if (!name) return;
    if (!user) { navigate(`/login?next=${encodeURIComponent("/tags")}`); return; }
    try { const tag = await createUserTag({ name }); setOpen(false); setQuery(""); navigate(`/tags/${tag.slug}`); }
    catch (error) { setTagError(error instanceof Error ? error.message : t("Etiket oluşturulamadı.", "The tag could not be created.")); }
  }
  const row = (item: SearchItem) => <button className="header-search-row" key={`${item.kind}-${item.id}`} onClick={() => choose(item)} type="button">
    <span className="header-search-thumb">{item.kind === "tag" ? <TagIcon size={18}/> : item.imageUrl ? <img alt="" src={resolveMediaUrl(item.imageUrl)}/> : <span>{item.title.slice(0, 1).toUpperCase()}</span>}</span>
    <span><strong>{item.kind === "tag" ? `# ${item.title.replace(/^#/, "")}` : item.title}</strong>{item.subtitle || item.meta ? <small>{item.subtitle ?? item.meta}</small> : null}</span>
  </button>;

  return <div className={`header-search${expanded ? " is-expanded" : ""}${open ? " is-open" : ""}`} ref={root} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
    {expanded ? <label className="header-search-box">
      <Search size={17} aria-hidden="true"/>
      <input ref={input} aria-label={t("Ara", "Search")} onChange={(event) => { setQuery(event.target.value); setTagError(""); }} onFocus={() => { setRecent(readRecent()); setOpen(true); }} onKeyDown={(event) => { if (event.key === "Enter" && query.trim()) { setOpen(false); navigate(`/search?q=${encodeURIComponent(query.trim())}`); } }} placeholder={t("Herhangi bir şey ara…", "Search anything…")} value={query}/>
    </label> : <button className="header-search-trigger" onClick={activate} onFocus={() => setHover(true)} type="button"><Search size={17} aria-hidden="true"/><span>{t("Ara", "Search")}</span></button>}
    {open ? <div className="header-search-panel" role="dialog" aria-label={t("Arama", "Search")}>
      {!debounced ? <>
        <small className="header-search-caption">{t("Son aramalarınız", "Your recent searches")}</small>
        {recent.length ? recent.map(row) : <p className="header-search-empty">{t("Henüz arama yapmadınız. Etkinlik, mekân, etiket veya üye arayın.", "No searches yet. Search events, places, tags or members.")}</p>}
      </> : <>
        <small className="header-search-caption">{results.isLoading ? t("Aranıyor…", "Searching…") : t(`${results.data?.total ?? items.length} sonuç:`, `${results.data?.total ?? items.length} results:`)}</small>
        <div className="header-search-results">
          {items.map(row)}
          {!results.isLoading && debounced.replace(/^#/, "").trim() && !exactTag ? <button className="header-search-row is-create" onClick={() => void createTag()} type="button"><span className="header-search-thumb"><TagIcon size={18}/></span><span><strong><span className="muted">{t("Etiket oluştur:", "Create tag:")}</span> # {debounced.replace(/^#/, "").trim()}</strong></span></button> : null}
          {tagError ? <p className="form-error">{tagError}</p> : null}
        </div>
        <Link className="header-search-more" onClick={() => setOpen(false)} to={`/search?q=${encodeURIComponent(debounced)}`}>{t("Arama sayfasında göster", "Show on search page")}</Link>
      </>}
    </div> : null}
  </div>;
}
