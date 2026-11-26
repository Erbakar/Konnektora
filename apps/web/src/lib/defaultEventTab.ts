/**
 * 26/11 #119–#120: "Güncel" sekmesinde gösterilecek etkinlik yok ama "Geçmiş" sekmesinde
 * varsa, sayfa açılışında varsayılan sekme "Geçmiş" olur. İkisi de boşsa "Güncel" kalır.
 */
export function defaultEventTab<T>(items: readonly T[], isFinished: (item: T) => boolean): "future" | "past" {
  let hasPast = false;
  for (const item of items) {
    if (!isFinished(item)) return "future";
    hasPast = true;
  }
  return hasPast ? "past" : "future";
}
