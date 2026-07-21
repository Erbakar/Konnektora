import { BadRequestException, Injectable } from "@nestjs/common";
import { createHash } from "crypto";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import { SmsService } from "../sms/sms.service";
import { ImportContactsDto, InviteContactsDto } from "./contacts.dto";

@Injectable()
export class ContactsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly sms: SmsService,
  ) {}

  async import(userId: string, input: ImportContactsDto) {
    const contacts = input.contacts
      .map((contact) => ({
        ...contact,
        email: contact.email?.trim().toLowerCase(),
        phone: this.normalizePhone(contact.phone),
      }))
      .filter((contact) => contact.email || contact.phone);
    const emails = [
      ...new Set(
        contacts.flatMap((contact) => (contact.email ? [contact.email] : [])),
      ),
    ];
    const phones = [
      ...new Set(
        contacts.flatMap((contact) => (contact.phone ? [contact.phone] : [])),
      ),
    ];
    const users = await this.prisma.user.findMany({
      where: {
        id: { not: userId },
        status: "active",
        privacySettings: { directoryDiscoverable: true },
        OR: [{ email: { in: emails } }, { phone: { in: phones } }],
      },
      select: {
        id: true,
        name: true,
        username: true,
        accountType: true,
        city: true,
        country: true,
        followerCount: true,
        email: true,
        phone: true,
        followers: {
          where: { followerId: userId },
          select: { followerId: true },
        },
        interestTags: { select: { tagId: true } },
      },
    });
    const me = await this.prisma.userInterestTag.findMany({
      where: { userId },
      select: { tagId: true },
    });
    const myTags = new Set(me.map((item) => item.tagId));
    const matchedIdentifiers = new Set<string>();
    const matches = users.map((member) => {
      const contact = contacts.find(
        (item) => item.email === member.email || item.phone === member.phone,
      )!;
      if (contact.email) matchedIdentifiers.add(`email:${contact.email}`);
      if (contact.phone) matchedIdentifiers.add(`phone:${contact.phone}`);
      return {
        contactName: contact.name,
        member: {
          id: member.id,
          name: member.name,
          username: member.username,
          accountType: member.accountType as "individual" | "corporate",
          city: member.city,
          country: member.country,
          followerCount: member.followerCount,
          commonTagCount: member.interestTags.filter((tag) =>
            myTags.has(tag.tagId),
          ).length,
          following: member.followers.length > 0,
        },
      };
    });
    const invitees = contacts.filter(
      (contact) =>
        !(contact.email && matchedIdentifiers.has(`email:${contact.email}`)) &&
        !(contact.phone && matchedIdentifiers.has(`phone:${contact.phone}`)),
    );
    return {
      source: input.source,
      importedCount: contacts.length,
      matches,
      invitees,
    };
  }

  async invite(userId: string, input: InviteContactsDto) {
    const sender = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { name: true },
    });
    if (!sender) throw new BadRequestException("Kullanıcı bulunamadı.");
    const recipients: Array<{
      channel: "email" | "sms";
      value: string;
      name: string;
    }> = [];
    for (const contact of input.contacts) {
      if (contact.email)
        recipients.push({
          channel: "email",
          value: contact.email.trim().toLowerCase(),
          name: contact.name,
        });
      else if (contact.phone && this.normalizePhone(contact.phone))
        recipients.push({
          channel: "sms",
          value: this.normalizePhone(contact.phone)!,
          name: contact.name,
        });
    }
    await Promise.all(
      recipients.map(async (recipient) => {
        if (recipient.channel === "email")
          await this.mail.sendContactInviteEmail({
            to: recipient.value,
            name: recipient.name,
            invitedByName: sender.name,
          });
        else await this.sms.sendContactInvite(recipient.value, sender.name);
        await this.prisma.contactInvite.create({
          data: {
            userId,
            channel: recipient.channel,
            recipientHash: createHash("sha256")
              .update(recipient.value)
              .digest("hex"),
          },
        });
      }),
    );
    return { ok: true, invitedCount: recipients.length };
  }

  private normalizePhone(value?: string) {
    if (!value) return undefined;
    const normalized = value.trim().replace(/[\s()-]/g, "");
    return /^\+[1-9]\d{7,14}$/.test(normalized) ? normalized : undefined;
  }
}
