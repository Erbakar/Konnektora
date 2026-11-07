export const supportedMediaAccept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/bmp,video/mp4,video/webm";
export const supportedMediaHelp="Desteklenen medya türleri: JPG, PNG, WebP, GIF, AVIF, BMP, MP4 ve WebM. / Supported media: JPG, PNG, WebP, GIF, AVIF, BMP, MP4 and WebM.";
export function normalizeMediaFile(file:File){
 const types:Record<string,string>={jpg:"image/jpeg",jpeg:"image/jpeg",png:"image/png",webp:"image/webp",gif:"image/gif",avif:"image/avif",bmp:"image/bmp",mp4:"video/mp4",webm:"video/webm"};
 const type=file.type||types[file.name.split(".").at(-1)?.toLowerCase()??""];
 if(!type||!supportedMediaAccept.split(",").includes(type))throw new Error(supportedMediaHelp);
 return file.type?file:new File([file],file.name,{type});
}
