/* Explicitly invoked demo-data repair. Never runs at application startup. */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { PrismaClient } = require('@prisma/client');
const hash = bytes => crypto.createHash('sha256').update(bytes).digest('hex');
async function restoreDemoMedia(db, directory, apply = false) {
  const { items } = JSON.parse(fs.readFileSync(path.join(directory, 'manifest.json'), 'utf8'));
  if (!items?.length || new Set(items.map(x => x.filename)).size !== items.length) throw Error('Invalid demo manifest');
  const prepared = [];
  for (const item of items) {
    if (path.basename(item.filename) !== item.filename) throw Error('Unsafe filename');
    const bytes = fs.readFileSync(path.join(directory, 'files', item.filename));
    if (bytes.length !== item.bytes || hash(bytes) !== item.sha256) throw Error('Asset checksum mismatch');
    const row = await db.mediaFile.findUnique({ where: { id: item.mediaId } });
    if (!row || row.status !== 'active' || row.url !== item.url || row.contentId !== item.contentId || row.type !== item.type) throw Error('Media record changed; repair aborted');
    prepared.push({ item, bytes });
  }
  const result = { planned: prepared.length, inserted: 0, preserved: 0, verified: 0, apply };
  for (const { item, bytes } of prepared) {
    const existing = await db.storedUpload.findUnique({ where: { filename: item.filename } });
    if (existing) { result.preserved++; continue; }
    if (!apply) continue;
    const created = await db.storedUpload.createMany({ data: [{ filename: item.filename, mimeType: item.mimeType, bytes }], skipDuplicates: true });
    if (!created.count) { result.preserved++; continue; }
    result.inserted++;
    const saved = await db.storedUpload.findUniqueOrThrow({ where: { filename: item.filename } });
    if (saved.mimeType !== item.mimeType || hash(saved.bytes) !== item.sha256) throw Error('Stored asset verification failed');
    result.verified++;
  }
  return result;
}
module.exports = { restoreDemoMedia };
if (require.main === module) {
  const db = new PrismaClient();
  restoreDemoMedia(db, path.resolve(process.argv[2] || 'output/demo-media'), process.argv.includes('--apply'))
    .then(result => console.log(JSON.stringify(result)))
    .catch(() => { console.error('Demo restoration failed; inspect connection, manifest and records.'); process.exitCode = 1; })
    .finally(() => db.$disconnect());
}
