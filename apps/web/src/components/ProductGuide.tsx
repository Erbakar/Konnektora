import { productGuideContent } from "../lib/productGuideContent";
import { useLanguage } from "../lib/i18n";
const titles = { intro: {tr:"Konnektora'yı keşfet",en:"Discover Konnektora"}, help: {tr:"Konnektora kullanım rehberi",en:"Konnektora user guide"}, business: {tr:"Konnektora işletme rehberi",en:"Konnektora business guide"} };
export function ProductGuide({kind, onPlay}: {kind: keyof typeof productGuideContent; onPlay?: () => void}) {
 const {language}=useLanguage(); const guide=productGuideContent[kind];
 const revised = kind === "intro" || kind === "business";
 const mediaName = revised ? `${kind}-20261012` : kind;
 return <section className="product-guide" aria-label={titles[kind][language]}>

  <video key={`${kind}:${language}`} controls playsInline preload="none" poster={`/media/guides/${mediaName}.jpg`} onPlay={onPlay} aria-label={titles[kind][language]}>
   <source src={`/media/guides/${mediaName}.mp4`} type="video/mp4"/>
   {!revised && <track kind="captions" srcLang="tr" label="Türkçe" src={`/media/guides/${kind}.tr.vtt`} default={language === "tr"}/>}
   <track kind="subtitles" srcLang="en" label="English" src={`/media/guides/${mediaName}.en.vtt`} default={language === "en"}/>
   {language === "tr" ? "Tarayıcınız video oynatmayı desteklemiyor." : "Your browser does not support video playback."}
  </video>
  <details><summary>{language === "tr" ? "Rehber metnini oku" : "Read the guide transcript"}</summary>{guide.scenes.map((scene,index)=><section key={index}><h3>{language === "tr" ? scene.title : scene.titleEn}</h3><p>{scene[language]}</p></section>)}</details>
 </section>;
}
