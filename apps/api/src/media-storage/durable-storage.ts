import { diskStorage, type StorageEngine } from "multer";
import { readFile, unlink } from "fs/promises";
import { basename } from "path";
import type { PrismaService } from "../prisma/prisma.service";

let mediaDatabase: PrismaService | undefined;
export function configureMediaDatabase(prisma: PrismaService) { mediaDatabase = prisma; }

// Multer's existing disk limits/filename validation stay in place. A successful
// upload is persisted before the controller creates its referencing content.
export function durableStorage(options: Parameters<typeof diskStorage>[0]): StorageEngine {
  const disk = diskStorage(options);
  return {
    _handleFile(request, file, callback) {
      disk._handleFile(request, file, (error, result) => {
        if (error || !result?.path || !result.filename) return callback(error ?? new Error("Dosya yazılamadı."));
        const info = result as Express.Multer.File;
        const persist = async () => {
          if (!mediaDatabase) throw new Error("Medya deposu hazır değil.");
          if ((file.stream as typeof file.stream & { truncated?: boolean }).truncated) throw new Error("Dosya boyutu sınırı aşıldı.");
          const bytes = await readFile(info.path);
          await mediaDatabase.storedUpload.create({ data: { filename: info.filename, mimeType: file.mimetype, bytes } });
        };
        void persist().then(() => callback(null, info)).catch(async (cause: unknown) => {
          await unlink(info.path).catch(() => undefined);
          callback(cause instanceof Error ? cause : new Error("Dosya kaydedilemedi."));
        });
      });
    },
    _removeFile(request, file, callback) {
      void mediaDatabase?.storedUpload.deleteMany({ where: { filename: file.filename } }).then(() => disk._removeFile(request, file, callback)).catch(callback);
      if (!mediaDatabase) disk._removeFile(request, file, callback);
    },
  };
}

export async function removeDurableUpload(path: string) {
  if (mediaDatabase) await mediaDatabase.storedUpload.deleteMany({ where: { filename: basename(path) } });
  await unlink(path).catch(() => undefined);
}
