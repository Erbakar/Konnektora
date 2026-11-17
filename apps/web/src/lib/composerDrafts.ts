import { useCallback, useEffect, useState } from "react";

/**
 * 17/10 #22–#23: gönderilmemiş mesaj / gönderi taslakları kullanıcıya ve hedefe (konuşma, etkinlik,
 * mekân, ilgi alanı) özel olarak tarayıcıda saklanır; sayfadan çıkılsa bile kutuda kalır.
 */
export type ComposerDraftScope = "message" | "event" | "place" | "tag";

const PREFIX = "konnektora:draft";

export function composerDraftKey(userId: string | undefined | null, scope: ComposerDraftScope, targetId: string | undefined | null) {
  return userId && targetId ? `${PREFIX}:${userId}:${scope}:${targetId}` : null;
}

export function readComposerDraft(key: string | null) {
  if (!key) return "";
  try {
    return window.localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

export function writeComposerDraft(key: string | null, value: string) {
  if (!key) return;
  try {
    if (value.trim()) window.localStorage.setItem(key, value);
    else window.localStorage.removeItem(key);
  } catch {
    // Depolama kapalıysa taslak yalnızca açık sayfada yaşar.
  }
}

export function clearComposerDraft(key: string | null) {
  writeComposerDraft(key, "");
}

/** Metin kutusu değerini taslak deposuyla eşitler; hedef değişince o hedefin taslağını yükler. */
export function useComposerDraft(userId: string | undefined | null, scope: ComposerDraftScope, targetId: string | undefined | null) {
  const key = composerDraftKey(userId, scope, targetId);
  const [state, setState] = useState(() => ({ key, value: readComposerDraft(key) }));
  const value = state.key === key ? state.value : readComposerDraft(key);
  useEffect(() => {
    setState((current) => current.key === key ? current : { key, value: readComposerDraft(key) });
  }, [key]);
  const setValue = useCallback((next: string) => {
    setState({ key, value: next });
    writeComposerDraft(key, next);
  }, [key]);
  const clear = useCallback(() => {
    setState({ key, value: "" });
    clearComposerDraft(key);
  }, [key]);
  return [value, setValue, clear] as const;
}
