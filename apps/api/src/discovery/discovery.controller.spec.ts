import { DiscoveryController } from "./discovery.controller";

describe("DiscoveryController", () => {
  const discovery = { feed: jest.fn(), search: jest.fn() };
  const controller = new DiscoveryController(discovery as never);

  beforeEach(() => jest.clearAllMocks());

  it("uses the device location headers for signed-in members too", async () => {
    discovery.feed.mockResolvedValue({ location: "Ankara" });

    await controller.feed(
      {},
      { headers: { "x-vercel-ip-city": "Ankara", "x-vercel-ip-country": "TR" } },
      { id: "member-1" } as never,
    );

    expect(discovery.feed).toHaveBeenCalledWith("member-1", {
      city: "Ankara",
      country: "TR",
    });
  });

  it("keeps an explicitly selected city ahead of location headers", async () => {
    await controller.feed(
      { city: "İzmir" },
      { headers: { "x-vercel-ip-city": "Ankara" } },
      undefined,
    );

    expect(discovery.feed).toHaveBeenCalledWith(undefined, {
      city: "İzmir",
      country: undefined,
    });
  });
});
