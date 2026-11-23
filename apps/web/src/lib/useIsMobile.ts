import { useEffect, useState } from "react";

/** 23/11 #55, #56: mobil (≤760px) görünümde farklı yerleşen kontroller için. */
export function useIsMobile(query = "(max-width: 760px)") {
  const read = () => typeof window !== "undefined" && typeof window.matchMedia === "function" && window.matchMedia(query).matches;
  const [mobile, setMobile] = useState(read);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const list = window.matchMedia(query);
    const update = () => setMobile(list.matches);
    update();
    list.addEventListener?.("change", update);
    return () => list.removeEventListener?.("change", update);
  }, [query]);
  return mobile;
}
