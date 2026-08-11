import type { Tag } from "@konnektora/shared";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { createUserTag } from "../lib/api";

export function TagPicker({ tags, name = "tagIds", initialIds = [], label = "Etiketler" }: { tags: Tag[]; name?: string; initialIds?: string[]; label?: string }) {
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
  const suggestions = availableTags.filter((tag) => !selectedIds.includes(tag.id) && (!normalized || tag.name.toLocaleLowerCase("tr-TR").includes(normalized))).slice(0, 10);
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
    <legend>{label} (en fazla 10)</legend>
    {selected.length ? <div className="tag-picker-selected">{selected.map((tag) => <span key={tag.id}>#{tag.name}<button aria-label={`${tag.name} etiketini kaldır`} onClick={() => setSelectedIds((ids) => ids.filter((id) => id !== tag.id))} type="button"><X size={13}/></button><input name={name} type="hidden" value={tag.id}/></span>)}</div> : null}
    <input aria-label="Etiket ara veya oluştur" disabled={selectedIds.length >= 10} onChange={(event) => setQuery(event.target.value)} placeholder="Enter an existing or new tag…" type="search" value={query}/>
    {selectedIds.length >= 10 ? <small>10 etiket sınırına ulaştınız.</small> : <div className="tag-picker-suggestions">{suggestions.map((tag) => <button key={tag.id} onClick={() => add(tag.id)} type="button">#{tag.name}</button>)}{normalized.length >= 2 && !exactMatch ? <button className="create-tag-option" disabled={create.isPending} onClick={() => create.mutate()} type="button"><Plus size={14}/>{create.isPending ? "Oluşturuluyor…" : `“${query.trim()}” etiketini oluştur`}</button> : null}</div>}
    {create.isError ? <small className="form-error">Etiket oluşturulamadı veya bu ad zaten kullanımda.</small> : null}
  </fieldset>;
}
