import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const eventFormats = ["online", "offline", "hybrid"] as const;
type EventFormatValue = (typeof eventFormats)[number];
const SUGGESTION_LIMIT = 10;
const HALF_WINDOW_MS = 15 * 24 * 60 * 60 * 1000;

export type TagSuggestionQuery = { target?: string; format?: string; startsAt?: string; placeType?: string };

/**
 * 26/11 #107, #108: form etiket önerileri.
 * - Etkinlik: seçili formattaki (çevrim içi / yüz yüze / hibrit) ve başlangıç zamanının ±15 günlük (1 aylık)
 *   döneminde başlayan yayımlanmış etkinliklere en çok eklenen ilk 10 etiket.
 * - Mekân: seçili mekân türündeki aktif mekânlara en çok eklenen ilk 10 etiket.
 */
@Injectable()
export class TagSuggestionsService {
  constructor(private readonly prisma: PrismaService) {}

  async trendingTagIds(query: TagSuggestionQuery): Promise<{ tagIds: string[] }> {
    if (query.target === "place") return { tagIds: await this.placeTagIds(query.placeType) };
    if (query.target === "event") return { tagIds: await this.eventTagIds(query.format, query.startsAt) };
    throw new BadRequestException("target event veya place olmalıdır.");
  }

  private async eventTagIds(format?: string, startsAt?: string) {
    const center = startsAt ? new Date(startsAt) : new Date();
    const pivot = Number.isNaN(center.getTime()) ? new Date() : center;
    const rows = await this.prisma.eventTag.groupBy({
      by: ["tagId"],
      where: {
        tag: { status: "active" },
        event: {
          status: "published",
          ...(eventFormats.includes(format as EventFormatValue) ? { format: format as EventFormatValue } : {}),
          startsAt: { gte: new Date(pivot.getTime() - HALF_WINDOW_MS), lte: new Date(pivot.getTime() + HALF_WINDOW_MS) },
        },
      },
      _count: { tagId: true },
      orderBy: [{ _count: { tagId: "desc" } }, { tagId: "asc" }],
      take: SUGGESTION_LIMIT,
    });
    return rows.map((row) => row.tagId);
  }

  private async placeTagIds(placeType?: string) {
    const rows = await this.prisma.placeTag.groupBy({
      by: ["tagId"],
      where: {
        tag: { status: "active" },
        place: { status: "active", ...(placeType?.trim() ? { placeType: placeType.trim() } : {}) },
      },
      _count: { tagId: true },
      orderBy: [{ _count: { tagId: "desc" } }, { tagId: "asc" }],
      take: SUGGESTION_LIMIT,
    });
    return rows.map((row) => row.tagId);
  }
}
