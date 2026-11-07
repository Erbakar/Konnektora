import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";
import type { User } from "@prisma/client";
import type { PrismaService } from "../prisma/prisma.service";

/** Etkinlik/mekân iletisi anketleri (07/11 #21). Oylar anonimdir; sonuçlar oy verdikten veya anket kapandıktan sonra görünür. */
export type PollInput = {
  question: string;
  options: string[];
  allowMultiple?: boolean;
  maxChoices?: number;
  allowOpenAnswer?: boolean;
  audience?: "everyone" | "participants";
  closesAt?: string | null;
};

const clean = (value: string) => value.replace(/\s+/g, " ").trim();

export async function createPoll(db: PrismaService, commentId: string, input: PollInput, user: User) {
  const comment = await db.contentComment.findUnique({ where: { id: commentId }, select: { id: true, authorId: true, status: true, parentId: true, targetType: true, targetId: true, poll: { select: { id: true } } } });
  if (!comment || comment.status !== "active") throw new NotFoundException("İleti bulunamadı.");
  if (comment.authorId !== user.id) throw new ForbiddenException("Ankete yalnız ileti sahibi eklenebilir.");
  if (comment.parentId || !["event", "place"].includes(comment.targetType)) throw new BadRequestException("Anket yalnız etkinlik ve mekân iletilerine eklenebilir.");
  if (comment.poll) throw new BadRequestException("Bu iletide zaten bir anket var.");
  const question = clean(input.question ?? "");
  const options = [...new Map((input.options ?? []).map(clean).filter(Boolean).map((label) => [label.toLocaleLowerCase("tr-TR"), label])).values()];
  if (question.length < 2 || question.length > 300) throw new BadRequestException("Anket sorusu 2-300 karakter olmalıdır.");
  if (options.length < 2 || options.length > 20 || options.some((label) => label.length > 160)) throw new BadRequestException("Ankette 2-20 farklı seçenek bulunmalıdır; her seçenek en fazla 160 karakter olabilir.");
  const allowMultiple = Boolean(input.allowMultiple);
  const maxChoices = allowMultiple ? Math.max(2, Math.min(Number(input.maxChoices) || options.length, options.length)) : 1;
  let closesAt: Date | null = null;
  if (input.closesAt) {
    closesAt = new Date(input.closesAt);
    if (Number.isNaN(closesAt.getTime()) || closesAt.getTime() <= Date.now()) throw new BadRequestException("Anket kapanma zamanı gelecekte olmalıdır.");
  }
  await db.contentPoll.create({
    data: {
      commentId,
      question,
      allowMultiple,
      maxChoices,
      allowOpenAnswer: Boolean(input.allowOpenAnswer),
      audience: input.audience === "participants" ? "participants" : "everyone",
      closesAt,
      options: { create: options.map((label, sortOrder) => ({ label, sortOrder })) },
    },
  });
  return (await pollSummaries(db, [commentId], user.id)).get(commentId);
}

async function participantIds(db: PrismaService, targetType: string, targetId: string) {
  if (targetType === "event") {
    const [event, rows] = await Promise.all([
      db.event.findUnique({ where: { id: targetId }, select: { createdById: true } }),
      db.eventParticipant.findMany({ where: { eventId: targetId, status: { in: ["accepted", "attended"] } }, select: { userId: true } }),
    ]);
    return new Set([...rows.map((row) => row.userId), ...(event?.createdById ? [event.createdById] : [])]);
  }
  const [place, rows] = await Promise.all([
    db.place.findUnique({ where: { id: targetId }, select: { createdById: true } }),
    db.placeMember.findMany({ where: { placeId: targetId, status: "accepted" }, select: { userId: true } }),
  ]);
  return new Set([...rows.map((row) => row.userId), ...(place?.createdById ? [place.createdById] : [])]);
}

export async function votePoll(db: PrismaService, pollId: string, input: { optionIds?: string[]; openAnswer?: string }, user: User) {
  const poll = await db.contentPoll.findUnique({ where: { id: pollId }, include: { comment: { select: { id: true, status: true, targetType: true, targetId: true } }, options: { select: { id: true, label: true } } } });
  if (!poll || poll.comment.status !== "active") throw new NotFoundException("Anket bulunamadı.");
  const closesAt = await effectiveClosesAt(db, poll.closesAt, poll.comment.targetType, poll.comment.targetId);
  if (closesAt && closesAt.getTime() <= Date.now()) throw new BadRequestException("Anket kapandı.");
  if (poll.audience === "participants" && !(await participantIds(db, poll.comment.targetType, poll.comment.targetId)).has(user.id)) {
    throw new ForbiddenException(poll.comment.targetType === "event" ? "Bu anketi yalnız etkinlik katılımcıları yanıtlayabilir." : "Bu anketi yalnız mekân katılımcıları yanıtlayabilir.");
  }
  const known = new Set(poll.options.map((option) => option.id));
  const selected = [...new Set(input.optionIds ?? [])];
  if (selected.some((id) => !known.has(id))) throw new BadRequestException("Geçersiz anket seçeneği.");
  const openAnswer = clean(input.openAnswer ?? "");
  if (openAnswer && !poll.allowOpenAnswer) throw new BadRequestException("Bu ankette açık uçlu cevap kapalı.");
  if (openAnswer.length > 160) throw new BadRequestException("Açık uçlu cevap en fazla 160 karakter olabilir.");
  const total = selected.length + (openAnswer ? 1 : 0);
  if (!total) throw new BadRequestException("En az bir seçenek işaretleyin.");
  if (total > (poll.allowMultiple ? poll.maxChoices : 1)) throw new BadRequestException(poll.allowMultiple ? `En fazla ${poll.maxChoices} seçenek işaretleyebilirsiniz.` : "Yalnız bir seçenek işaretleyebilirsiniz.");
  await db.$transaction(async (tx) => {
    let ids = selected;
    if (openAnswer) {
      const existing = poll.options.find((option) => option.label.toLocaleLowerCase("tr-TR") === openAnswer.toLocaleLowerCase("tr-TR"));
      const option = existing ?? await tx.contentPollOption.create({ data: { pollId, label: openAnswer, isOpenAnswer: true, createdById: user.id, sortOrder: poll.options.length } });
      ids = [...new Set([...ids, option.id])];
    }
    await tx.contentPollVote.deleteMany({ where: { pollId, userId: user.id } });
    await tx.contentPollVote.createMany({ data: ids.map((optionId) => ({ pollId, optionId, userId: user.id })), skipDuplicates: true });
    // Hiç oyu kalmayan açık uçlu cevaplar listede kalmaz.
    await tx.contentPollOption.deleteMany({ where: { pollId, isOpenAnswer: true, votes: { none: {} } } });
  });
  return (await pollSummaries(db, [poll.comment.id], user.id)).get(poll.comment.id);
}

async function effectiveClosesAt(db: PrismaService, closesAt: Date | null, targetType: string, targetId: string) {
  if (closesAt) return closesAt;
  if (targetType !== "event") return null;
  const event = await db.event.findUnique({ where: { id: targetId }, select: { endsAt: true } });
  return event?.endsAt ?? null;
}

export async function pollSummaries(db: PrismaService, commentIds: string[], viewerId?: string) {
  const result = new Map<string, unknown>();
  if (!commentIds.length) return result;
  const polls = await db.contentPoll.findMany({ where: { commentId: { in: commentIds } }, include: { comment: { select: { targetType: true, targetId: true } }, options: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], include: { _count: { select: { votes: true } } } }, votes: { select: { userId: true, optionId: true } } } });
  const eligibleCache = new Map<string, Set<string>>();
  for (const poll of polls) {
    const targetKey = `${poll.comment.targetType}:${poll.comment.targetId}`;
    if (!eligibleCache.has(targetKey)) eligibleCache.set(targetKey, await participantIds(db, poll.comment.targetType, poll.comment.targetId));
    const eligible = eligibleCache.get(targetKey)!;
    const closesAt = await effectiveClosesAt(db, poll.closesAt, poll.comment.targetType, poll.comment.targetId);
    const closed = Boolean(closesAt && closesAt.getTime() <= Date.now());
    const viewerOptionIds = viewerId ? poll.votes.filter((vote) => vote.userId === viewerId).map((vote) => vote.optionId) : [];
    const viewerVoted = viewerOptionIds.length > 0;
    const resultsVisible = viewerVoted || closed;
    const voters = new Set(poll.votes.map((vote) => vote.userId));
    const totalVotes = poll.votes.length;
    const canVote = Boolean(viewerId) && !closed && (poll.audience !== "participants" || eligible.has(viewerId!));
    result.set(poll.commentId, {
      id: poll.id,
      question: poll.question,
      allowMultiple: poll.allowMultiple,
      maxChoices: poll.maxChoices,
      allowOpenAnswer: poll.allowOpenAnswer,
      audience: poll.audience,
      closesAt: closesAt ? closesAt.toISOString() : null,
      closed,
      canVote,
      viewerVoted,
      viewerOptionIds,
      resultsVisible,
      totalVoters: resultsVisible ? voters.size : null,
      eligibleCount: eligible.size,
      participationRate: resultsVisible ? (eligible.size ? Math.round((voters.size / eligible.size) * 100) : null) : null,
      options: poll.options.map((option) => ({
        id: option.id,
        label: option.label,
        isOpenAnswer: option.isOpenAnswer,
        votes: resultsVisible ? option._count.votes : null,
        percent: resultsVisible ? (totalVotes ? Math.round((option._count.votes / totalVotes) * 100) : 0) : null,
      })),
    });
  }
  return result;
}
