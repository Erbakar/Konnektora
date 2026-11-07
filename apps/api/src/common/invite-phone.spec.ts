import { invitePhone, invitePhoneVariants } from "./invite-phone";
it.each(["+905551234567", "905551234567", "00905551234567", "+90 (555) 123-45-67"])("matches the same invitee for %s", input => { expect(invitePhone(input)).toBe("+905551234567"); expect(invitePhoneVariants(input)).toEqual(["+905551234567", "905551234567", "00905551234567"]); });
it.each(["", "05551234567", "abc", "+123"])("rejects ambiguous or invalid phone %s", input => expect(() => invitePhone(input)).toThrow());
