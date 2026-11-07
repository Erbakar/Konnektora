import { ForbiddenException } from "@nestjs/common";
import { Prisma, User } from "@prisma/client";
import { limitsFor } from "../common/plan-policy";

export async function checkConversationQuota(tx: Prisma.TransactionClient, sender: User, recipientId: string) {
  const limits = limitsFor(sender);
  if (limits.messages === null) return;
  // Serialize both the pair and this sender so concurrent requests cannot exceed a quota.
  const pair = [sender.id, recipientId].sort().join(":");
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`chat-pair:${pair}`}, 0))`;
  await tx.$queryRaw`SELECT 1 AS locked FROM pg_advisory_xact_lock(hashtextextended(${`chat-quota:${sender.id}`}, 0))`;
  const existing = await tx.privateMessage.findFirst({ where: { OR: [{ senderId: sender.id, recipientId }, { senderId: recipientId, recipientId: sender.id }] }, select: { id: true } });
  // Deleted/hidden messages still establish a conversation; replies never consume new-chat quota.
  if (existing) return;
  const usage = await conversationUsage(tx, sender.id);
  if (Number(usage?.daily ?? 0) >= limits.messages || limits.sixHours !== null && Number(usage?.recent ?? 0) >= limits.sixHours) {
    throw new ForbiddenException("Yeni sohbet başlatma hakkınız doldu. Mevcut sohbetlerinize devam edebilir veya paketinizi yükseltebilirsiniz.");
  }
}

export async function conversationUsage(tx: Pick<Prisma.TransactionClient, "$queryRaw">, senderId: string) {
  const rows = await tx.$queryRaw<Array<{ daily: bigint; recent: bigint }>>`
    WITH first_messages AS (
      SELECT DISTINCT ON (LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id)) sender_id, created_at
      FROM private_messages
      WHERE sender_id = ${senderId} OR recipient_id = ${senderId}
      ORDER BY LEAST(sender_id, recipient_id), GREATEST(sender_id, recipient_id), created_at, id
    )
    SELECT COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours') AS daily,
           COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '6 hours') AS recent
    FROM first_messages WHERE sender_id = ${senderId}`;
  return { daily: Number(rows[0]?.daily ?? 0), recent: Number(rows[0]?.recent ?? 0) };
}
