import { ticketAmounts } from "./ticket-pricing";

describe("approved ticket commission", () => {
  it.each([[100, 5, 95], [19.99, 1, 18.99], [0.1, 0.01, 0.09], [0, 0, 0], [599.97, 30, 569.97]])("settles %s at 5 percent with cent rounding", (gross, fee, net) => {
    expect(ticketAmounts(gross)).toEqual({ gross, fee, net });
  });
  it("rejects invalid amounts", () => {
    expect(() => ticketAmounts(-1)).toThrow();
    expect(() => ticketAmounts(Infinity)).toThrow();
  });
});
