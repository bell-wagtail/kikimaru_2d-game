import Phaser from "phaser";
import { AUDIO_DEFAULTS, AUDIO_TRACKS } from "../src/audioDefinition.ts";
import { STAGES } from "../src/stages.ts";
import { PLAYER, WORLD } from "../src/movement.ts";
import { ITEM_TYPES } from "../src/items.ts";
import { REBASE_DISTANCE } from "../src/scrolling.ts";

export async function verifyAudio({ scene, game, restart, step, pass, assert, near }) {
  const wait = ms => new Promise(resolve => setTimeout(resolve, ms));
  const click = id => document.getElementById(id).click();
  const stage = { id: "audio-test", background: STAGES.teaRiver.background,
    start: { x: 570, y: WORLD.ground - 36, width: 60, height: 36 },
    goal: { x: 1400, y: WORLD.ground - 36, width: 60, height: 36 },
    items: ["tea", "tea", "shrimp", "mandarin", "quiz", "quiz"].map((kind, index) => ({ id: `audio-${index}`, kind,
      x: index < 4 ? 800 : 1100 + (index - 4) * 100, y: WORLD.ground - 36, width: 60, height: 36 })) };
  const place = (x, bottom = WORLD.ground) => { scene.body.reset(x, bottom - PLAYER.height / 2); scene.previousPlayerX = x; scene.update(0, 0); };
  await restart(stage, { autoStart: false }); await wait(30);
  const session = scene.audio.session, bank = scene.audio.bank;
  session.setMuted(false); session.setVolume("bgm", AUDIO_DEFAULTS.bgm); session.setVolume("effects", AUDIO_DEFAULTS.effects);
  if (game.sound instanceof Phaser.Sound.NoAudioSoundManager) {
    assert(!bank.supported && !bank.sounds.size, "音声機能なしでもシーンを開始");
    click("start-walk"); place(830);
    assert(scene.score.value > 0 && scene.powerUps.active("autoDash"), "音声機能なしでも取得と能力が動く");
    place(scene.endpoints.goalFlag.x);
    assert(scene.playResult.current && document.querySelector("#goal-dialog").open, "音声機能なしでもゴールできる");
    pass("音声機能なしでも開始・移動・取得・能力・ゴール結果を継続");
    return;
  }
  assert(session.unlocked && bank.sounds.size === Object.keys(AUDIO_TRACKS).length, "実操作で音声を解放し全WAVをデコード");
  const bgm = bank.sounds.get("walk"), counts = new Map();
  for (const [track, sound] of bank.sounds) sound.on(Phaser.Sound.Events.PLAY, () => counts.set(track, (counts.get(track) ?? 0) + 1));
  const count = track => counts.get(track) ?? 0;
  assert(!bgm.isPlaying && !bank.sounds.get("start").isPlaying, "指定開始の待機中は無音");
  click("start-walk"); await wait(80);
  assert(bgm.isPlaying && bgm.loop && count("walk") === 1 && count("start") === 1, "開始時にBGMと開始音を一度再生");
  click("start-walk"); assert(count("start") === 1, "開始を多重再生しない");
  for (const [track, sound] of bank.sounds) near(sound.duration, AUDIO_TRACKS[track].seconds, `${track}の実デコード長`);
  pass("全WAVの実デコード、開始待機の無音、開始操作の音声解放、開始音とループBGMの一度だけの再生");

  place(830); scene.update(0, 0); scene.processContacts();
  assert(count("item") === 1 && scene.items.items.slice(0, 4).every(item => item.collected), "同時取得は一つの音、再接触は無音");
  scene.update(0, (Math.max(ITEM_TYPES.tea.durationSeconds, ITEM_TYPES.shrimp.durationSeconds) + 1) * 1000);
  assert(count("powerEnd") === 1, "同時能力終了音も一度");
  scene.update(0, 1000); assert(count("powerEnd") === 1, "終了音を繰り返さない");
  click("reset"); assert(!bgm.isPlaying && count("powerEnd") === 1, "リセットでは効果終了音を鳴らさない");
  click("start-walk"); place(830); click("reset");
  assert(count("powerEnd") === 1 && [...bank.sounds.values()].every(sound => !sound.isPlaying), "効果中のリセットでも全音を止める");
  pass("能力付き・能力なし・同種複数の取得音、同時終了音、再接触の多重防止、全リセットの無音停止");

  click("start-walk"); await wait(80); place(1130);
  assert(scene.quiz.current && bgm.isPaused && count("quiz") === 1, "クイズ開始音とBGM一時停止");
  const seek = bgm.seek;
  game.events.emit(Phaser.Core.Events.BLUR); await wait(30); game.events.emit(Phaser.Core.Events.FOCUS); await wait(30);
  assert(bgm.isPaused && bgm.seek === seek && count("quiz") === 1, "クイズ中のフォーカス復帰でBGMや開始音を再生しない");
  scene.answerQuiz(scene.quiz.current.correctIndex); scene.answerQuiz(scene.quiz.current.correctIndex);
  assert(count("correct") === 1 && bank.sounds.get("correct").isPlaying && bgm.isPaused, "正解音を一度、回答後もBGM停止");
  scene.resumeQuiz(); assert(bgm.isPlaying && bgm.seek >= seek && count("start") === 3, "再開はBGMの続き、開始音なし");
  place(1230); scene.answerQuiz((scene.quiz.current.correctIndex + 1) % 4);
  assert(count("incorrect") === 1 && bgm.isPaused, "誤答音と回答中の停止"); scene.resumeQuiz();
  game.events.emit(Phaser.Core.Events.BLUR);
  assert(bgm.isPaused && [...bank.sounds.entries()].filter(([track]) => track !== "walk").every(([, sound]) => !sound.isPlaying), "フォーカス喪失でBGMを一時停止し効果音を破棄");
  game.events.emit(Phaser.Core.Events.FOCUS); assert(bgm.isPlaying, "通常プレイのフォーカス復帰だけでBGMを再開");
  pass("クイズ開始・正解・誤答と二重回答防止、回答後もBGM停止、続きからの再開、フォーカス停止と効果音の残留防止");

  document.querySelector(".audio-panel .audio-mute").click();
  assert(session.preferences.muted && bgm.isPaused, "ミュートは即時停止");
  document.querySelector(".audio-panel .audio-mute").click(); assert(bgm.isPlaying, "ミュート解除は続きから");
  const slider = document.querySelector('[data-audio-volume="bgm"]'); slider.value = "0"; slider.dispatchEvent(new Event("input"));
  assert(bgm.isPaused, "BGM音量ゼロで停止"); slider.value = "42"; slider.dispatchEvent(new Event("input"));
  await wait(20);
  near(bgm.volume, 0.42 * AUDIO_TRACKS.walk.gain, "BGMの音量反映");
  const effects = document.querySelector('[data-audio-volume="effects"]'); effects.value = "23"; effects.dispatchEvent(new Event("input"));
  session.cue("item");
  await wait(20);
  near(bank.sounds.get("item").volume, 0.23 * AUDIO_TRACKS.item.gain, "効果音の音量反映");
  pass("独立した音量スライダーとゼロ音量、即時ミュートと解除、画面内ボタンへの設定反映");

  const analyser = game.sound.context.createAnalyser(); analyser.fftSize = 256;
  bgm.volumeNode.connect(analyser); bgm.seek = bgm.duration - 0.06;
  const samples = new Float32Array(analyser.fftSize), rms = [];
  for (let index = 0; index < 8; index++) {
    await wait(20); game.sound.update(0, 0); analyser.getFloatTimeDomainData(samples);
    rms.push(Math.sqrt(samples.reduce((sum, sample) => sum + sample * sample, 0) / samples.length));
  }
  bgm.volumeNode.disconnect(analyser); analyser.disconnect();
  assert(bgm.isPlaying && bgm.seek < 1 && rms.every(value => value > 0.0002), `実時間のループ境界で出力を維持: ${rms}`);
  pass("実時間のループ境界でWeb Audio出力が途切れず、次のループでもBGM一つを維持");

  const beforeRebase = count("walk"); place(WORLD.width / 2 + REBASE_DISTANCE + 10);
  assert(count("walk") === beforeRebase && bgm.isPlaying, "座標補正でBGMを再開しない");
  place(scene.endpoints.goalFlag.x); assert(scene.playResult.current && !bgm.isPlaying && count("goal") === 1, "ゴールはBGM停止とゴール音");
  scene.finishGoal(); click("close-result"); click("show-result");
  game.events.emit(Phaser.Core.Events.BLUR); game.events.emit(Phaser.Core.Events.FOCUS);
  assert(count("goal") === 1 && !bgm.isPlaying, "ゴール再表示・フォーカス復帰は無音");
  click("retry-walk"); assert([...bank.sounds.values()].every(sound => !sound.isPlaying), "再挑戦でゴール音も消す");
  click("start-walk"); assert(bgm.isPlaying && bgm.seek < 0.1, "再挑戦の開始はBGM先頭から");
  place(600, WORLD.height + PLAYER.height + 10);
  assert(scene.starting && !bgm.isPlaying, "落下ではBGM停止し短い復帰待機"); scene.update(0, 1000);
  assert(bgm.isPlaying && count("powerEnd") === 1, "復帰後に開始音とBGMを再開、効果終了音なし");
  pass("座標補正の無音継続、ゴール音の一度だけの再生、結果再表示の無音、再挑戦と落下復帰の再生");

  const oldAudio = scene.audio;
  await restart(stage, { autoStart: false }); await wait(30);
  assert(oldAudio.destroyed && !oldAudio.bank.sounds.size, "古い音源を全破棄");
  assert(document.querySelectorAll(".audio-panel").length === 1 && document.querySelectorAll(".audio-mute").length === 4, "再起動で操作UIを増やさない");
  assert(game.sound.sounds.filter(sound => !sound.pendingRemove).length === Object.keys(AUDIO_TRACKS).length, "音源の多重登録なし");
  near(scene.audio.session.preferences.bgm, 0.42, "再起動でもBGM音量保持"); near(scene.audio.session.preferences.effects, 0.23, "再起動でも効果音音量保持");
  oldAudio.session.setUnlocked(true); assert(!scene.audio.bank.sounds.get("walk").isPlaying, "古い非同期解放は新シーンを再生しない");
  pass("シーン再起動の音源とイベントとUIの破棄、音量設定保持、音源数の固定、古い解放の無効化");
  click("start-walk");
  const item = scene.audio.bank.sounds.get("item"), originalPlay = item.play;
  item.play = () => { throw new Error("テスト用再生拒否"); };
  place(830); item.play = originalPlay;
  assert(scene.score.value > 0 && !scene.physics.world.isPaused, "再生拒否でもゲームを継続");
  scene.audio.session.setMuted(true);
  pass("効果音の再生例外でも取得・能力・物理を継続");
}
