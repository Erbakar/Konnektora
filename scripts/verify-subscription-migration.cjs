// Read-only aggregate verification; no personal user data is printed.
const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();
async function main() {
  const [result] = await db.$queryRaw`
    SELECT COUNT(*)::int AS checked,
      COUNT(*) FILTER (WHERE u.member_plan IS DISTINCT FROM CASE b.member_plan WHEN 'plus' THEN 'premium' WHEN 'premium' THEN 'platinum' ELSE b.member_plan END
        OR u.business_plan IS DISTINCT FROM CASE b.business_plan WHEN 'starter' THEN 'free' WHEN 'growth' THEN 'pro' WHEN 'scale' THEN 'venue' ELSE b.business_plan END)::int AS mismatches,
      COUNT(*) FILTER (WHERE u.member_plan_started_at IS DISTINCT FROM b.member_plan_started_at
        OR u.business_plan_started_at IS DISTINCT FROM b.business_plan_started_at)::int AS changed_dates
    FROM subscription_catalog_migration_backup b JOIN users u ON u.id = b.user_id`;
  console.log(JSON.stringify(result));
  if (result.mismatches || result.changed_dates) process.exitCode = 1;
}
main().catch(error => { console.error(error.message); process.exitCode = 1; }).finally(() => db.$disconnect());
