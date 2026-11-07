// Run inside the existing API container after db:deploy and before replacing it.
// Copies existing public media and private camera evidence into their own stores.
const { PrismaClient } = require('@prisma/client');
const { readdir, readFile, lstat } = require('node:fs/promises');
const { resolve, basename, extname } = require('node:path');
const mime = { '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif', '.mp4': 'video/mp4', '.webm': 'video/webm', '.mov': 'video/quicktime', '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.ogg': 'audio/ogg', '.m4a': 'audio/mp4', '.pdf': 'application/pdf', '.txt': 'text/plain' };
const db = new PrismaClient();
(async () => {
  let publicCopied = 0, privateCopied = 0, missingEvidence = 0;
  const directory = resolve(process.cwd(), 'uploads');
  let names;
  try { names = await readdir(directory); } catch (error) { if (error.code !== 'ENOENT') throw error; names = []; }
  for (const filename of names) {
    if (!/^[a-zA-Z0-9_-]+\.[a-zA-Z0-9]+$/.test(filename) || !mime[extname(filename).toLowerCase()]) continue;
    const path = resolve(directory, filename); if (!(await lstat(path)).isFile()) continue;
    const bytes = await readFile(path);
    publicCopied += await db.$executeRaw`INSERT INTO stored_uploads (filename, mime_type, bytes, created_at) VALUES (${filename}, ${mime[extname(filename).toLowerCase()]}, ${bytes}, NOW()) ON CONFLICT (filename) DO NOTHING`;
  }
  const requests = await db.$queryRaw`SELECT id, selfie_url FROM profile_verifications WHERE selfie_bytes IS NULL`;
  for (const request of requests) {
    const path = resolve(process.cwd(), 'verification-uploads', basename(request.selfie_url));
    let bytes; try { if (!(await lstat(path)).isFile()) { missingEvidence++; continue; } bytes = await readFile(path); }
    catch (error) { if (error.code === 'ENOENT') { missingEvidence++; continue; } throw error; }
    privateCopied += await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT set_config('konnektora.launch_maintenance', 'bypass', true)`;
      return tx.$executeRaw`UPDATE profile_verifications SET selfie_bytes=${bytes} WHERE id=${request.id} AND selfie_bytes IS NULL`;
    });
  }
  console.log(JSON.stringify({ publicCopied, privateCopied, missingEvidence }));
})().catch(() => { console.error('Legacy media copy failed; private data suppressed.'); process.exitCode = 1; }).finally(() => db.$disconnect());
