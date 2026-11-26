// 26/11 #62.11 test dönüşü: iPhone videoları (MOV) de kabul edilir; sunucudaki medya politikasıyla aynı liste.
export const supportedMediaAccept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/bmp,video/mp4,video/webm,video/quicktime";
export const supportedMediaHelp="Desteklenen medya türleri: JPG, PNG, WebP, GIF, AVIF, BMP, MP4, WebM ve MOV. / Supported media: JPG, PNG, WebP, GIF, AVIF, BMP, MP4, WebM and MOV.";
const mediaTypesByExtension:Record<string,string>={jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp",gif:"image/gif",avif:"image/avif",bmp:"image/bmp",mp4:"video/mp4",webm:"video/webm",mov:"video/quicktime"};
/** Dosyanın gerçek medya türü (tarayıcı tür vermezse uzantıdan); desteklenmiyorsa boş döner. */
export function resolveMediaType(file:File){
 const type=file.type||mediaTypesByExtension[file.name.split(".").at(-1)?.toLowerCase()??""]||"";
 return supportedMediaAccept.split(",").includes(type)?type:"";
}
export function normalizeMediaFile(file:File){
 const type=resolveMediaType(file);
 if(!type)throw new Error(supportedMediaHelp);
 return file.type?file:new File([file],file.name,{type});
}
