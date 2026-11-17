import type { Event } from "@konnektora/shared";

/**
 * 17/10 #29 — "Etkinliği kopyala" ekranının ön doldurma verisi.
 * Kaynak etkinliğin içeriği aynen gelir; tarihe bağlı alanlar boşaltılır:
 * etkinlik başlangıç/bitişi, line-up başlangıç saatleri ve biletlerin
 * gate açılış/kapanış ile satış (geçerlilik) tarihleri. Kaynak nesne değiştirilmez.
 */
export function eventCopyPrefill<T extends Pick<Event, "startsAt" | "endsAt" | "lineup" | "ticketTypes">>(source: T): T {
  return {
    ...source,
    startsAt: "",
    endsAt: null,
    lineup: source.lineup?.map((item) => {
      const { startsAt: _startsAt, ...rest } = item;
      void _startsAt;
      return rest;
    }) ?? source.lineup,
    ticketTypes: source.ticketTypes?.map((ticket) => {
      const { gateOpensAt: _gateOpensAt, gateClosesAt: _gateClosesAt, saleStartsAt: _saleStartsAt, saleEndsAt: _saleEndsAt, ...rest } = ticket as typeof ticket & { gateOpensAt?: string; gateClosesAt?: string; saleStartsAt?: string; saleEndsAt?: string };
      void _gateOpensAt; void _gateClosesAt; void _saleStartsAt; void _saleEndsAt;
      return { ...rest, status: "active" };
    }) ?? source.ticketTypes,
  } as T;
}
