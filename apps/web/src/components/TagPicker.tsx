import type { Tag } from "@konnektora/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createUserTag } from "../lib/api";
import { useLanguage } from "../lib/i18n";

export function TagPicker({ tags, name = "tagIds", initialIds = [], recommendedIds = [], label = "Etiketler" }: { tags: Tag[]; name?: string; initialIds?: string[]; recommendedIds?: string[]; label?: string }) {
  const { language } = useLanguage();
  const client = useQueryClient();
  const [query, setQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>(initialIds.slice(0, 10));
  const [initialized, setInitialized] = useState(initialIds.length > 0);
  const [createdTags, setCreatedTags] = useState<Tag[]>([]);
  useEffect(() => {
    if (!initialized && initialIds.length) {
      setSelectedIds(initialIds.slice(0, 10));
      setInitialized(true);
    }
  }, [initialIds, initialized]);
  const availableTags = useMemo(() => [...tags, ...createdTags.filter((created) => !tags.some((tag) => tag.id === created.id))], [createdTags, tags]);
  const normalized = query.trim().toLocaleLowerCase("tr-TR");
  const selected = useMemo(() => selectedIds.map((id) => availableTags.find((tag) => tag.id === id)).filter((tag): tag is Tag => Boolean(tag)), [availableTags, selectedIds]);
  const suggestions = availableTags.filter((tag) => !selectedIds.includes(tag.id) && (!normalized || tag.name.toLocaleLowerCase("tr-TR").includes(normalized))).sort((a, b) => Number(recommendedIds.includes(b.id)) - Number(recommendedIds.includes(a.id))).slice(0, 10);
  const exactMatch = availableTags.some((tag) => tag.name.toLocaleLowerCase("tr-TR") === normalized);
  const create = useMutation({
    mutationFn: () => createUserTag({ name: query.trim() }),
    onSuccess: async (tag) => {
      setCreatedTags((items) => [...items, tag]);
      setSelectedIds((ids) => [...ids, tag.id].slice(0, 10));
      setQuery("");
      await client.invalidateQueries({ queryKey: ["tags"] });
    },
  });
  const add = (id: string) => {
    setSelectedIds((ids) => ids.includes(id) || ids.length >= 10 ? ids : [...ids, id]);
    setQuery("");
  };
  return <fieldset className="tag-fieldset tag-picker">
    <legend>{label} ({language === "tr" ? "en fazla 10" : "up to 10"})</legend>
    {selected.length ? <div className="tag-picker-selected">{selected.map((tag) => <span key={tag.id}>#{tag.name}<button aria-label={language === "tr" ? `${tag.name} etiketini kaldır` : `Remove ${tag.name} tag`} onClick={() => setSelectedIds((ids) => ids.filter((id) => id !== tag.id))} type="button"><X size={13}/></button><input name={name} type="hidden" value={tag.id}/></span>)}</div> : null}
    <input aria-label={language === "tr" ? "Etiket ara veya oluştur" : "Search or create a tag"} disabled={selectedIds.length >= 10} onChange={(event) => setQuery(event.target.value)} placeholder={language === "tr" ? "Var olan veya yeni bir etiket girin…" : "Enter an existing or new tag…"} type="search" value={query}/>
    {recommendedIds.length && !query ? <small>{language === "tr" ? "Profiline göre önerilen etiketler önce gösteriliyor; seçmeden etkinliğe eklenmez." : "Tags suggested for your profile appear first and are not added until you select them."}</small> : null}
    {selectedIds.length >= 10 ? <small>{language === "tr" ? "10 etiket sınırına ulaştınız." : "You reached the 10-tag limit."}</small> : <div className="tag-picker-suggestions">{suggestions.map((tag) => <button className={recommendedIds.includes(tag.id) ? "recommended" : ""} key={tag.id} onClick={() => add(tag.id)} type="button">#{tag.name}{recommendedIds.includes(tag.id) ? language === "tr" ? " · önerilen" : " · recommended" : ""}</button>)}{normalized.length >= 2 && !exactMatch ? <button className="create-tag-option" disabled={create.isPending} onClick={() => create.mutate()} type="button"><Plus size={14}/>{create.isPending ? language === "tr" ? "Oluşturuluyor…" : "Creating…" : language === "tr" ? `“${query.trim()}” etiketini oluştur` : `Create “${query.trim()}” tag`}</button> : null}</div>}
    {create.isError ? <small className="form-error">{language === "tr" ? "Etiket oluşturulamadı veya bu ad zaten kullanımda." : "The tag could not be created or this name is already in use."}</small> : null}
  </fieldset>;
}
