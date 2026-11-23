/** 23/11 #54, #60, #61: "Medya" sekmesi — yüklenen resim/video ve YouTube / SoundCloud paylaşımları. */
const embedPattern = /https?:\/\/(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?v=|shorts\/|live\/|embed\/)|youtu\.be\/|soundcloud\.com\/|on\.soundcloud\.com\/)\S+/gi;
const fileUrlPattern = /https?:\/\/\S+\.(?:png|jpe?g|webp|gif|mp4|webm|mov)(?:\?\S*)?/gi;

export function postMediaCount(post: { body?: string | null; media?: Array<{ type?: string | null }> | null }) {
  const uploaded = (post.media ?? []).filter((item) => item.type === "image" || item.type === "video").length;
  const body = post.body ?? "";
  const links = new Set([...(body.match(embedPattern) ?? []), ...(body.match(fileUrlPattern) ?? [])]);
  return uploaded + links.size;
}

export const hasPostMedia = (post: Parameters<typeof postMediaCount>[0]) => postMediaCount(post) > 0;
export const totalPostMedia = (posts: Array<Parameters<typeof postMediaCount>[0]>) => posts.reduce((sum, post) => sum + postMediaCount(post), 0);
