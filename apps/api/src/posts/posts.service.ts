import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { PostVisibility, Prisma, ReportTargetType, User } from "@prisma/client";
import { unlink } from "fs/promises";
import { resolve } from "path";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePostCommentDto, CreatePostDto, FeedQueryDto, UpdatePostDto } from "./posts.dto";
import { NotificationsService } from "../notifications/notifications.service";

const authorSelect = { id: true, name: true, username: true, profileVerifiedAt: true } as const;

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService, private readonly notifications: NotificationsService) {}

  async feed(query: FeedQueryDto, viewer?: User) {
    const blockedIds = viewer ? await this.blockedUserIds(viewer.id) : [];
    const direct = viewer ? await this.followingIds(viewer.id) : [];
    const network = viewer ? await this.networkIds(viewer.id, direct) : [];
    const personalizedAuthorIds = viewer ? await this.affinityAuthorIds(viewer.id) : [];
    const visible: Prisma.PostWhereInput[] = [{ visibility: PostVisibility.everybody }];
    if (viewer) {
      visible.push(
        { authorId: viewer.id },
        { visibility: PostVisibility.following, authorId: { in: direct } },
        { visibility: PostVisibility.network, authorId: { in: network } }
      );
    }
    const where: Prisma.PostWhereInput = {
      status: "active",
      authorId: { notIn: blockedIds },
      OR: visible,
      ...(query.scope === "following" && viewer ? { authorId: { in: [viewer.id, ...direct], notIn: blockedIds } } : {}),
      ...(query.scope === "for_you" && viewer && (personalizedAuthorIds.length || viewer.city || viewer.country) ? { author: { OR: [
        ...(personalizedAuthorIds.length ? [{ id: { in: personalizedAuthorIds } }] : []),
        ...(viewer.city ? [{ city: { equals: viewer.city, mode: "insensitive" as const } }] : []),
        ...(viewer.country ? [{ country: { equals: viewer.country, mode: "insensitive" as const } }] : [])
      ] } } : {}),
      ...((query.from || query.to) ? { createdAt: { ...(query.from ? { gte: new Date(query.from) } : {}), ...(query.to ? { lte: new Date(query.to) } : {}) } } : {})
    };
    const [items, total] = await this.prisma.$transaction([
      this.prisma.post.findMany({
        where,
        orderBy: query.scope === "popular" ? [{ likeCount: "desc" }, { commentCount: "desc" }, { createdAt: "desc" }] : { createdAt: "desc" },
        skip: (query.page - 1) * query.pageSize,
        take: query.pageSize,
        include: { author: { select: authorSelect }, media: { orderBy: { sortOrder: "asc" } }, likes: viewer ? { where: { userId: viewer.id }, select: { userId: true } } : false }
      }),
      this.prisma.post.count({ where })
    ]);
    const avatars = await this.avatars(items.map((item) => item.authorId));
    return { items: items.map((item) => this.presentPost(item, avatars)), page: query.page, pageSize: query.pageSize, total, hasMore: query.page * query.pageSize < total };
  }

  async create(input: CreatePostDto, files: Express.Multer.File[], user: User) {
    const post = await this.prisma.post.create({
      data: { authorId: user.id, body: input.body.trim(), visibility: input.visibility, media: { create: files.map((file, index) => ({ url: `/uploads/${file.filename}`, type: file.mimetype.startsWith("video/") ? "video" : "image", sortOrder: index })) } },
      include: { author: { select: authorSelect }, media: { orderBy: { sortOrder: "asc" } }, likes: { where: { userId: user.id }, select: { userId: true } } }
    });
    await this.notifyMentions(post.id, input.body, user.id);
    return this.presentPost(post, await this.avatars([user.id]));
  }

  async update(id: string, input: UpdatePostDto, user: User) {
    const existing = await this.prisma.post.findUnique({ where: { id } });
    if (!existing || existing.status !== "active") throw new NotFoundException("Gönderi bulunamadı.");
    if (existing.authorId !== user.id) throw new ForbiddenException("Bu gönderiyi düzenleyemezsiniz.");
    const post = await this.prisma.post.update({ where: { id }, data: { body: input.body.trim() }, include: { author: { select: authorSelect }, media: { orderBy: { sortOrder: "asc" } }, likes: { where: { userId: user.id }, select: { userId: true } } } });
    await this.notifyMentions(post.id, input.body, user.id);
    return this.presentPost(post, await this.avatars([user.id]));
  }

  async remove(id: string, user: User) {
    const post = await this.prisma.post.findUnique({ where: { id }, include: { media: true } });
    if (!post || post.status !== "active") throw new NotFoundException("Gönderi bulunamadı.");
    if (post.authorId !== user.id && !["admin", "super_admin"].includes(user.role)) throw new ForbiddenException("Bu gönderiyi silemezsiniz.");
    await this.prisma.post.update({ where: { id }, data: { status: "deleted" } });
    await Promise.all(post.media.map((media) => unlink(resolve(process.cwd(), media.url.replace(/^\//, ""))).catch(() => undefined)));
    return { success: true };
  }

  async toggleLike(id: string, user: User) {
    await this.ensureVisible(id, user);
    const existing = await this.prisma.postLike.findUnique({ where: { postId_userId: { postId: id, userId: user.id } } });
    const post = await this.prisma.$transaction(async (tx) => {
      if (existing) {
        await tx.postLike.delete({ where: { postId_userId: { postId: id, userId: user.id } } });
        return tx.post.update({ where: { id }, data: { likeCount: { decrement: 1 } }, select: { likeCount: true } });
      }
      await tx.postLike.create({ data: { postId: id, userId: user.id } });
      return tx.post.update({ where: { id }, data: { likeCount: { increment: 1 } }, select: { likeCount: true } });
    });
    return { liked: !existing, likeCount: Math.max(0, post.likeCount) };
  }

  async comments(postId: string, viewer?: User) {
    await this.ensureVisible(postId, viewer);
    const comments = await this.prisma.postComment.findMany({ where: { postId, status: "active" }, orderBy: { createdAt: "asc" }, include: { author: { select: authorSelect } } });
    const avatars = await this.avatars(comments.map((comment) => comment.authorId));
    return comments.map((comment) => ({ ...comment, author: { ...comment.author, avatarUrl: avatars.get(comment.authorId) ?? null } }));
  }

  async createComment(postId: string, input: CreatePostCommentDto, user: User) {
    const post = await this.ensureVisible(postId, user);
    if (input.parentId) {
      const parent = await this.prisma.postComment.findFirst({ where: { id: input.parentId, postId, status: "active" } });
      if (!parent) throw new NotFoundException("Yanıtlanacak yorum bulunamadı.");
    }
    const comment = await this.prisma.$transaction(async (tx) => {
      const created = await tx.postComment.create({ data: { postId, authorId: user.id, parentId: input.parentId, body: input.body.trim() }, include: { author: { select: authorSelect } } });
      await tx.post.update({ where: { id: postId }, data: { commentCount: { increment: 1 } } });
      return created;
    });
    if (post.authorId !== user.id) await this.notifications.dispatch({ userId: post.authorId, topic: "comment", type: "comment", title: "Gönderine yorum geldi", body: `${user.name}: ${input.body.trim().slice(0, 120)}`, targetType: "post", targetId: postId });
    await this.notifyMentions(postId, input.body, user.id);
    const avatar = await this.avatars([user.id]);
    return { ...comment, author: { ...comment.author, avatarUrl: avatar.get(user.id) ?? null } };
  }

  async removeComment(postId: string, commentId: string, user: User) {
    const comment = await this.prisma.postComment.findFirst({ where: { id: commentId, postId, status: "active" }, include: { post: { select: { authorId: true } } } });
    if (!comment) throw new NotFoundException("Yorum bulunamadı.");
    if (![comment.authorId, comment.post.authorId].includes(user.id) && !["admin", "super_admin"].includes(user.role)) throw new ForbiddenException("Bu yorumu silemezsiniz.");
    await this.prisma.$transaction([this.prisma.postComment.update({ where: { id: commentId }, data: { status: "deleted" } }), this.prisma.post.update({ where: { id: postId }, data: { commentCount: { decrement: 1 } } })]);
    return { success: true };
  }

  private async ensureVisible(id: string, viewer?: User) {
    const post = await this.prisma.post.findUnique({ where: { id } });
    if (!post || post.status !== "active") throw new NotFoundException("Gönderi bulunamadı.");
    if (post.visibility === PostVisibility.everybody || viewer?.id === post.authorId) return post;
    if (!viewer) throw new ForbiddenException("Bu gönderiyi görüntüleyemezsiniz.");
    const blocked = await this.blockedUserIds(viewer.id);
    if (blocked.includes(post.authorId)) throw new ForbiddenException("Bu gönderiyi görüntüleyemezsiniz.");
    const direct = await this.followingIds(viewer.id);
    if (post.visibility === PostVisibility.following && direct.includes(post.authorId)) return post;
    if (post.visibility === PostVisibility.network && (await this.networkIds(viewer.id, direct)).includes(post.authorId)) return post;
    throw new ForbiddenException("Bu gönderiyi görüntüleyemezsiniz.");
  }

  private followingIds(userId: string) { return this.prisma.userFollow.findMany({ where: { followerId: userId }, select: { followingId: true } }).then((rows) => rows.map((row) => row.followingId)); }
  private async affinityAuthorIds(userId: string) {
    const interests = await this.prisma.userInterestTag.findMany({ where: { userId, sentiment: { in: ["like", "ok"] } }, select: { tagId: true } });
    if (!interests.length) return [];
    const matches = await this.prisma.userInterestTag.findMany({ where: { userId: { not: userId }, tagId: { in: interests.map((item) => item.tagId) }, sentiment: { in: ["like", "ok"] } }, select: { userId: true }, take: 200 });
    return [...new Set(matches.map((item) => item.userId))];
  }
  private async networkIds(userId: string, direct: string[]) { const second = direct.length ? await this.prisma.userFollow.findMany({ where: { followerId: { in: direct } }, select: { followingId: true } }) : []; return [...new Set([...direct, ...second.map((row) => row.followingId)])].filter((id) => id !== userId); }
  private async blockedUserIds(userId: string) { const rows = await this.prisma.userBlock.findMany({ where: { OR: [{ userId, targetType: "user" }, { targetType: "user", targetId: userId }] }, select: { userId: true, targetId: true } }); return [...new Set(rows.map((row) => row.userId === userId ? row.targetId : row.userId))]; }
  private async avatars(ids: string[]) { const media = await this.prisma.mediaFile.findMany({ where: { contentType: ReportTargetType.user, contentId: { in: [...new Set(ids)] }, status: "active", isProfilePicture: true }, select: { contentId: true, url: true } }); return new Map(media.map((item) => [item.contentId, item.url])); }
  private presentPost(post: any, avatars: Map<string, string>) { return { ...post, liked: Boolean(post.likes?.length), likes: undefined, author: { ...post.author, avatarUrl: avatars.get(post.authorId) ?? null } }; }
  private async notifyMentions(postId: string, body: string, actorId: string) { const usernames = [...new Set([...body.matchAll(/@([a-zA-Z0-9_.]{2,30})/g)].map((match) => match[1]!.toLowerCase()))]; if (!usernames.length) return; const users = await this.prisma.user.findMany({ where: { username: { in: usernames }, status: "active", id: { not: actorId } }, select: { id: true } }); await Promise.all(users.map((user) => this.notifications.dispatch({ userId: user.id, topic: "mention", type: "mention", title: "Bir gönderide senden bahsedildi", body: body.slice(0, 160), targetType: "post", targetId: postId }))); }
}
