import { test } from "node:test";
import assert from "node:assert/strict";
import { ITEM_TYPES, POWER_UP_KINDS } from "../src/items.ts";
import { ITEM_FEEDBACK, ItemNoticeState, pulsePeriod } from "../src/feedback.ts";
import { PowerUpState } from "../src/powerUps.ts";

test("each acquired item has a named notice and an independently configurable circular glow", () => {
  for (const kind of POWER_UP_KINDS) {
    const item = ITEM_TYPES[kind];
    assert.ok(item.name.length > 0 && /^#[0-9a-f]{6}$/i.test(item.glow.color));
    assert.ok(Number.isFinite(item.glow.diameterScale) && item.glow.diameterScale > 0);
  }
  assert.notEqual(ITEM_TYPES.tea.glow.diameterScale, ITEM_TYPES.shrimp.glow.diameterScale);
});

test("fish and fruits have named notices without power timers or glow definitions", () => {
  for (const [kind, name] of [["fish", "魚"], ["mandarin", "みかん"], ["strawberry", "いちご"]] as const) {
    const notices = new ItemNoticeState(); notices.acquired(kind);
    assert.equal(notices.text, `${name}を取得！`);
    assert.equal(ITEM_TYPES[kind].type, "score");
    assert.equal("effect" in ITEM_TYPES[kind], false);
    assert.equal("durationSeconds" in ITEM_TYPES[kind], false);
    assert.equal("glow" in ITEM_TYPES[kind], false);
  }
});

test("simultaneous notices stay readable and disappear after the configured interval", () => {
  const notices = new ItemNoticeState(); notices.acquired("tea"); notices.acquired("shrimp");
  assert.equal(notices.text, "お茶を取得！\nえびを取得！");
  notices.advance(ITEM_FEEDBACK.noticeSeconds / 2);
  assert.ok(notices.text.includes("お茶") && notices.text.includes("えび"));
  notices.advance(ITEM_FEEDBACK.noticeSeconds / 2); assert.equal(notices.text, "");
});

test("reacquisition refreshes the notice without accumulating old messages, and notices expire separately", () => {
  const notices = new ItemNoticeState(); notices.acquired("tea");
  notices.advance(ITEM_FEEDBACK.noticeSeconds / 2); notices.acquired("tea"); notices.acquired("shrimp");
  assert.equal(notices.text, "お茶を取得！\nえびを取得！");
  notices.advance(ITEM_FEEDBACK.noticeSeconds / 2); notices.expired("tea");
  assert.equal(notices.text, "お茶の効果が終了しました\nえびを取得！");
  notices.advance(ITEM_FEEDBACK.noticeSeconds / 2); assert.equal(notices.text, "お茶の効果が終了しました");
  notices.advance(ITEM_FEEDBACK.noticeSeconds / 2); assert.equal(notices.text, "");
});

test("pause and reset leave no delayed acquisition or ending notices", () => {
  const notices = new ItemNoticeState(); notices.expired("shrimp"); notices.advance(0);
  assert.equal(notices.text, "えびの効果が終了しました");
  notices.reset(); notices.advance(ITEM_FEEDBACK.noticeSeconds * 2); assert.equal(notices.text, "");
});

test("the pulse clearly speeds up as the warning starts and gradually shortens toward expiry", () => {
  assert.equal(pulsePeriod(ITEM_FEEDBACK.warningSeconds * 2), ITEM_FEEDBACK.normalPulseSeconds);
  assert.equal(pulsePeriod(ITEM_FEEDBACK.warningSeconds + 0.01), ITEM_FEEDBACK.normalPulseSeconds);
  assert.ok(pulsePeriod(ITEM_FEEDBACK.warningSeconds) < ITEM_FEEDBACK.normalPulseSeconds / 2);
  const periods = [1, 0.75, 0.5, 0.25, 0].map(fraction => pulsePeriod(ITEM_FEEDBACK.warningSeconds * fraction));
  assert.ok(periods.every((period, index) => !index || period < periods[index - 1]));
  assert.equal(periods.at(-1), ITEM_FEEDBACK.urgentPulseSeconds);
});

test("expiry reports the item once, while reset and refresh cannot leave stale expiry events", () => {
  const powers = new PowerUpState(); powers.acquire("tea"); powers.acquire("shrimp");
  assert.deepEqual(powers.activeItems(), ["tea", "shrimp"]);
  const interval = Math.min(ITEM_TYPES.tea.durationSeconds, ITEM_TYPES.shrimp.durationSeconds) / 2;
  assert.deepEqual(powers.advance(interval), []);
  powers.acquire("tea");
  assert.deepEqual(powers.advance(ITEM_TYPES.shrimp.durationSeconds - interval), ["shrimp"]);
  assert.deepEqual(powers.advance(0), []);
  powers.reset(); assert.deepEqual(powers.activeItems(), []); assert.deepEqual(powers.advance(100), []);
});
