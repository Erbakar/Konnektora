// 26/11 #109, #110: Leaflet haritası gizli bir form adımında (display:none / hidden) kurulduğunda
// boyutunu 0x0 hesaplar ve adım görünür olduğunda karo (tile) yüklemez; harita gri kalır.
// Kapsayıcının boyutu değiştikçe invalidateSize çağrılır; gizliden görünüre geçişte görünüm yeniden ortalanır.
type ResizableMap = { invalidateSize: (options?: { pan?: boolean }) => unknown };

export function keepMapSized(map: ResizableMap, element: HTMLElement, onReveal?: () => void) {
  if (typeof ResizeObserver === "undefined") return () => undefined;
  let wasHidden = element.clientWidth === 0 || element.clientHeight === 0;
  const observer = new ResizeObserver(() => {
    const hidden = element.clientWidth === 0 || element.clientHeight === 0;
    if (hidden) { wasHidden = true; return; }
    map.invalidateSize({ pan: false });
    if (wasHidden) onReveal?.();
    wasHidden = false;
  });
  observer.observe(element);
  return () => observer.disconnect();
}
