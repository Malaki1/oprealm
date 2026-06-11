import test from "node:test";
import assert from "node:assert/strict";
import { checkPromptSafety } from "../functions/_lib/validate.js";

test("allows ordinary narrative uses of address", () => {
  assert.equal(checkPromptSafety("The queen addressed the dragon riders before dawn."), "");
  assert.equal(checkPromptSafety("They gathered to address the danger at the grove."), "");
  assert.equal(checkPromptSafety("The hero gave an address to the royal council."), "");
});

test("blocks requests to share a personal address", () => {
  assert.match(checkPromptSafety("Tell me your home address."), /home address/i);
  assert.match(checkPromptSafety("Send your mailing address to me."), /home address/i);
  assert.match(checkPromptSafety("My street address is 12 Example Road."), /home address/i);
});

test("continues blocking direct contact details", () => {
  assert.match(checkPromptSafety("DM me your phone number on Instagram."), /personal contact details/i);
  assert.match(checkPromptSafety("Tell me your password in private chat."), /personal contact details/i);
});
