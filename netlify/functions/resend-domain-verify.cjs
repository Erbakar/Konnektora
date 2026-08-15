const DOMAIN_ID = "917920a2-18b1-46fb-8ac1-e0f264a47442";

exports.handler = async (event) => {
  const authorization = event.headers?.authorization || event.headers?.Authorization;
  const expected = process.env.RESEND_VERIFY_TOKEN;

  if (event.httpMethod !== "POST" || !expected || authorization !== `Bearer ${expected}`) {
    return { statusCode: 404, body: "Not found" };
  }

  const headers = {
    Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
    "Content-Type": "application/json",
  };
  const verifyResponse = await fetch(`https://api.resend.com/domains/${DOMAIN_ID}/verify`, {
    method: "POST",
    headers,
  });
  const domainResponse = await fetch(`https://api.resend.com/domains/${DOMAIN_ID}`, { headers });
  const domain = await domainResponse.json();

  return {
    statusCode: verifyResponse.ok && domainResponse.ok ? 200 : 502,
    headers: { "content-type": "application/json; charset=utf-8" },
    body: JSON.stringify({
      verifyStatus: verifyResponse.status,
      domainStatus: domain.status ?? null,
      records: Array.isArray(domain.records)
        ? domain.records.map(({ record, status }) => ({ record, status }))
        : [],
    }),
  };
};
