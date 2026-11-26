import { useEffect } from "react";

export const SITE_TITLE = "Konnektora";

/** "Başlık · Bölüm · Konnektora" biçiminde sekme başlığı üretir. */
export function formatDocumentTitle(...parts: Array<string | null | undefined>) {
  return [...parts.map((part) => part?.trim()).filter(Boolean), SITE_TITLE].join(" · ");
}

/**
 * 26/11 #85: sayfaya özgü tarayıcı sekmesi başlığı. Sayfadan çıkınca önceki başlık geri yüklenir.
 * Boş başlık verilirse (ör. veri yüklenirken) mevcut başlığa dokunulmaz.
 */
export function useDocumentTitle(title: string | null | undefined) {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = title;
    return () => { document.title = previous; };
  }, [title]);
}
