import { firstValueFrom, of } from "rxjs";
import { ActivityLogInterceptor } from "./activity-log.interceptor";

describe("ActivityLogInterceptor", () => {
  const create = jest.fn().mockResolvedValue({});
  const interceptor = new ActivityLogInterceptor({
    adminActivityLog: { create },
  } as never);

  beforeEach(() => jest.clearAllMocks());

  async function record(path: string) {
    const request = {
      user: { id: "88888888-8888-4888-8888-888888888888" },
      method: "GET",
      originalUrl: path,
      url: path,
      ip: "127.0.0.1",
      query: { page: "1" },
      headers: {
        "user-agent": "Test Browser",
        "accept-language": "tr-TR",
        "x-vercel-ip-country": "TR",
        "x-vercel-ip-city": "Istanbul",
        referer: "https://konnektora.com/",
      },
    };
    const context = {
      getType: () => "http",
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => ({ statusCode: 200 }),
      }),
    };
    await firstValueFrom(
      interceptor.intercept(context as never, { handle: () => of({ ok: true }) }),
    );
    await new Promise((resolve) => setImmediate(resolve));
    return create.mock.calls[0]?.[0]?.data;
  }

  it("classifies nested finance and ticket operations as finance", async () => {
    await expect(record("/me/ticket-orders/order-id/refund")).resolves.toMatchObject({
      targetType: "finance",
    });
  });

  it("classifies profile privacy operations as settings", async () => {
    await expect(record("/profile/privacy")).resolves.toMatchObject({
      targetType: "settings",
    });
  });

  it("records non-sensitive environment context", async () => {
    const data = await record("/events/example-event");
    expect(data).toMatchObject({
      targetType: "events",
      metadata: expect.objectContaining({
        language: "tr-TR",
        country: "TR",
        city: "Istanbul",
        referer: "https://konnektora.com/",
        queryFields: ["page"],
      }),
    });
    expect(data.metadata).not.toHaveProperty("query");
    expect(data.metadata).not.toHaveProperty("body");
  });
});
