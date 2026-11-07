type Summary = {title?:string;owner?:{username?:string|null}|null;payload?:unknown}|null;
export function moderationCopy(targetType:string,summary:Summary) {
 const data=(summary?.payload??{}) as {rootLabel?:string;rootKind?:string;parent?:{author?:{username?:string|null}};excerpt?:string};
 const root=data.rootLabel?`“${data.rootLabel}” ${data.rootKind==="tag"?"etiketinde":data.rootKind==="event"?"etkinliğinde":"mekânında"}`:"";
 const username=summary?.owner?.username?`“@${summary.owner.username}” adlı kullanıcının`:"Kullanıcının";
 const comment=["tag_comment","event_comment","place_comment","comment_reply","post_comment"].includes(targetType);
 const reply=Boolean(data.parent);
 const description=targetType==="media"?`${root||"Profilinizde"} paylaştığınız medya`:comment?`${root} ${reply?`${data.parent?.author?.username?`“@${data.parent.author.username}” adlı kullanıcının `:""}iletisine yazdığınız yorum`:"yazdığınız ileti"}`:`“${summary?.title??"İlgili içerik"}” içeriğiniz`;
 const subject=targetType==="media"?`${root} ${username} paylaştığı medya dosyasına`:comment?`${root} ${username} ${reply?"yaptığı yoruma":"yazdığı iletiye"}`:`“${summary?.title??"İlgili içerik"}” ile ilgili`;
 return {description:description.trim(),subject:subject.trim(),excerpt:comment?(data.excerpt??summary?.title)?.slice(0,500):undefined};
}
