import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getUserSession, recordInviteLinkVisit } from "./api";

/**
 * 23/11 #74, #75: "?ref=<davet eden>" ile açılan etkinlik/mekân sayfasında, giriş yapmış üye bağlantıyı paylaşanın davetlisi olarak kaydedilir.
 * Giriş yapılmamışsa ref saklanır ve aynı sayfaya giriş yapılmış olarak dönüldüğünde kaydedilir.
 */
export function useInviteLinkRef(kind: "event" | "place", id: string | undefined, slug: string) {
  const client = useQueryClient();
  useEffect(() => {
    if (!id || !slug) return;
    const key = `konnektora:invite-ref:${kind}:${slug}`;
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get("ref");
    let ref = fromUrl;
    try {
      if (fromUrl) window.localStorage.setItem(key, fromUrl);
      else ref = window.localStorage.getItem(key);
    } catch { /* depolama kapalıysa yalnız URL'deki ref kullanılır */ }
    const user = getUserSession();
    if (!ref || !user || user.id === ref) return;
    void recordInviteLinkVisit(kind, id, ref).then((result) => {
      try { window.localStorage.removeItem(key); } catch { /* yok say */ }
      if (result.recorded) void client.invalidateQueries({ queryKey: [kind] });
    }).catch(() => undefined);
  }, [kind, id, slug, client]);
}
