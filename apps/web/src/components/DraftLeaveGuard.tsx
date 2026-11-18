import { useContext, useEffect, useId, useRef } from "react";
import { UNSAFE_DataRouterContext, useBlocker, type BlockerFunction } from "react-router-dom";
import { useLanguage } from "../lib/i18n";

type DraftLeaveGuardProps = {
  /** Kutuda gönderilmemiş bir taslak var mı? */
  active: boolean;
  kind: "message" | "post";
  /** "Sil" seçilince taslağı temizler. */
  onDiscard: () => void;
  /** Hangi geçişlerin "sayfadan çıkış" sayılacağını belirler; varsayılan: adres yolu değişimi. */
  isLeaving?: BlockerFunction;
};

const leavesPath: BlockerFunction = ({ currentLocation, nextLocation }) => currentLocation.pathname !== nextLocation.pathname;

/**
 * 17/10 #22–#23: taslak varken uygulama içi gezinmeyle sayfadan çıkılırsa taslağın saklanıp
 * saklanmayacağını sorar. Veri yönlendiricisi olmayan ortamlarda (ör. bileşen testleri) pasiftir.
 */
export function DraftLeaveGuard(props: DraftLeaveGuardProps) {
  return useContext(UNSAFE_DataRouterContext) ? <ActiveDraftLeaveGuard {...props} /> : null;
}

function ActiveDraftLeaveGuard({ active, kind, onDiscard, isLeaving = leavesPath }: DraftLeaveGuardProps) {
  const { language } = useLanguage();
  const t = (tr: string, en: string) => language === "tr" ? tr : en;
  const titleId = useId();
  const blocker = useBlocker((args) => active && isLeaving(args));
  // "Sil" hem taslağı temizler hem geçişi sürdürür; aynı engelleme için proceed() iki kez çağrılırsa
  // yönlendirici "unblocked -> proceeding" hatası fırlatır. Bu yüzden her engelleme yalnız bir kez sürdürülür.
  const proceeded = useRef(false);
  const proceedOnce = () => {
    if (blocker.state !== "blocked" || proceeded.current) return;
    proceeded.current = true;
    blocker.proceed();
  };
  useEffect(() => {
    if (blocker.state !== "blocked") proceeded.current = false;
    else if (!active) proceedOnce();
  });
  if (blocker.state !== "blocked" || !active) return null;
  return (
    <div className="emotion-modal draft-leave-modal" role="presentation">
      <section aria-labelledby={titleId} aria-modal="true" className="content-dialog draft-leave-dialog" role="dialog">
        <h2 id={titleId}>{kind === "message" ? t("Mesaj taslağı", "Message draft") : t("Gönderi taslağı", "Post draft")}</h2>
        <p>
          {kind === "message"
            ? t("Bir mesaj taslağı yazdınız. Silinsin mi yoksa taslak olarak kalmaya devam mı etsin?", "You wrote a message draft. Delete it or keep it as a draft?")
            : t("Bir gönderi taslağı yazdınız. Silinsin mi yoksa taslak olarak kalmaya devam mı etsin?", "You wrote a post draft. Delete it or keep it as a draft?")}
        </p>
        <div className="row-actions">
          <button autoFocus className="primary-action" onClick={proceedOnce} type="button">
            {t("Taslak olarak dursun", "Keep as draft")}
          </button>
          <button className="danger-action" onClick={() => { onDiscard(); proceedOnce(); }} type="button">
            {t("Sil", "Delete")}
          </button>
        </div>
      </section>
    </div>
  );
}
