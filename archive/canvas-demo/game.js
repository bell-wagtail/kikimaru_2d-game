"use strict";

(() => {
  const canvas = document.getElementById("stage");
  const ctx = canvas.getContext("2d");
  const status = document.getElementById("state");
  const loading = document.getElementById("loading");
  const rig = window.KIKIMARU_RIG;
  const images = new Map();
  const keys = new Set();
  const pointers = new Map();
  const buttons = [...document.querySelectorAll("[data-direction]")];
  const directions = { ArrowLeft: -1, KeyA: -1, ArrowRight: 1, KeyD: 1 };
  const ground = 550;
  const scale = 0.39;
  const margin = 85;
  const speed = 260; // Logical canvas pixels per second, independent of frame rate.
  const player = { x: canvas.width / 2, facing: 1, phase: 0, moving: false };
  let ready = false;
  let last = null;
  let time = 0;

  function clearInput() {
    keys.clear();
    pointers.clear();
    buttons.forEach(button => button.classList.remove("pressed"));
  }

  window.addEventListener("keydown", event => {
    if (!(event.code in directions) || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target.matches("input, textarea, select, [contenteditable='true']")) return;
    event.preventDefault();
    keys.add(event.code);
  });
  window.addEventListener("keyup", event => keys.delete(event.code));
  window.addEventListener("blur", clearInput);
  document.addEventListener("visibilitychange", () => {
    clearInput();
    last = null;
  });
  canvas.addEventListener("pointerdown", () => canvas.focus({ preventScroll: true }));

  for (const button of buttons) {
    button.addEventListener("pointerdown", event => {
      if (event.button !== 0) return;
      event.preventDefault();
      button.setPointerCapture(event.pointerId);
      pointers.set(event.pointerId, Number(button.dataset.direction));
      button.classList.add("pressed");
    });
    const release = event => {
      pointers.delete(event.pointerId);
      if (![...pointers.values()].includes(Number(button.dataset.direction))) {
        button.classList.remove("pressed");
      }
    };
    button.addEventListener("pointerup", release);
    button.addEventListener("pointercancel", release);
    button.addEventListener("lostpointercapture", release);
    // Keyboard activation of these buttons nudges the character as well.
    button.addEventListener("click", event => {
      if (event.detail !== 0 || !ready) return;
      player.facing = Number(button.dataset.direction);
      player.x = Math.max(margin, Math.min(canvas.width - margin, player.x + player.facing * 30));
    });
  }

  document.getElementById("reset").addEventListener("click", () => {
    clearInput();
    Object.assign(player, { x: canvas.width / 2, facing: 1, phase: 0, moving: false });
    canvas.focus({ preventScroll: true });
  });

  function loadImage(key, path) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => { images.set(key, image); resolve(); };
      image.onerror = () => reject(new Error(path));
      image.src = `../../src/kikimaru-assets/${path}`;
    });
  }

  function tintedApron(image) {
    const layer = document.createElement("canvas");
    layer.width = image.naturalWidth;
    layer.height = image.naturalHeight;
    const brush = layer.getContext("2d");
    brush.drawImage(image, 0, 0);
    brush.globalCompositeOperation = "multiply";
    brush.fillStyle = rig.defaultApronColor;
    brush.fillRect(0, 0, layer.width, layer.height);
    brush.globalCompositeOperation = "destination-in";
    brush.drawImage(image, 0, 0);
    return layer;
  }

  function update(dt) {
    const active = [...keys].map(key => directions[key]).concat([...pointers.values()]);
    const direction = Number(active.includes(1)) - Number(active.includes(-1));
    if (direction) player.facing = direction;
    const before = player.x;
    player.x = Math.max(margin, Math.min(canvas.width - margin, player.x + direction * speed * dt));
    player.moving = Math.abs(player.x - before) > 0.001;
    if (player.moving) player.phase += dt * 12;
    else player.phase = 0;
    const label = player.moving ? (player.facing === 1 ? "右へおさんぽ中" : "左へおさんぽ中") : "ひとやすみ · ← → で移動";
    if (status.textContent !== label) status.textContent = label;
  }

  function drawCharacter() {
    const bob = player.moving ? Math.abs(Math.sin(player.phase)) * 6 : Math.sin(time * 2.5) * 2;
    ctx.fillStyle = "#58456a26";
    ctx.beginPath();
    ctx.ellipse(player.x, ground + 3, 47, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(player.x, ground - bob * scale);
    ctx.scale(scale * player.facing, scale);
    ctx.translate(-200, -rig.canvas.groundY);
    // Preserve the supplied v2 far-arm/body/near-arm/head layering.
    for (const part of rig.views.right) {
      let dx = 0;
      let dy = 0;
      let rotation = 0;
      if (player.moving && part.id.includes("foot")) {
        const side = part.id === "left_foot" ? 1 : -1;
        dx = Math.sin(player.phase) * side * 15;
        dy = -Math.max(0, Math.cos(player.phase) * side) * 10;
        rotation = Math.sin(player.phase) * side * 0.13;
      }
      if (player.moving && part.id.includes("arm")) {
        rotation = Math.sin(player.phase) * (part.x < 200 ? 1 : -1) * 0.35;
      }
      const image = images.get(part.tint ? "apron-colored" : part.part);
      const [px, py] = part.pivot;
      ctx.save();
      ctx.translate(part.x + part.w * px + dx, part.y + part.h * py + dy);
      ctx.rotate(rotation);
      if (part.mirror) ctx.scale(-1, 1);
      ctx.drawImage(image, -part.w * px, -part.h * py, part.w, part.h);
      ctx.restore();
    }
    ctx.restore();
  }

  function draw() {
    const background = images.get("background");
    const cover = Math.max(canvas.width / background.width, canvas.height / background.height);
    ctx.drawImage(background, (canvas.width - background.width * cover) / 2,
      (canvas.height - background.height * cover) / 2, background.width * cover, background.height * cover);
    // This source background is not seamless; keep it fixed instead of repeating it.
    ctx.fillStyle = "#f9f7e719";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#c1cc97";
    ctx.fillRect(0, ground - 3, canvas.width, 10);
    ctx.fillStyle = "#e8d9b8";
    ctx.fillRect(0, ground + 7, canvas.width, canvas.height - ground);
    ctx.fillStyle = "#d5c29e";
    for (let x = 20; x < canvas.width; x += 63) {
      ctx.fillRect(x, ground + 33 + (x % 5) * 8, 9, 2);
    }
    drawCharacter();
  }

  function frame(timestamp) {
    const dt = last === null ? 0 : Math.min((timestamp - last) / 1000, 0.05);
    last = timestamp;
    time += dt;
    update(dt);
    draw();
    requestAnimationFrame(frame);
  }

  const parts = [...new Set(rig.views.right.map(part => part.part))];
  Promise.all([
    ...parts.map(part => loadImage(part, `assets/character/right/${part}.png`)),
    loadImage("background", "assets/backgrounds/tea_river.png")
  ]).then(() => {
    images.set("apron-colored", tintedApron(images.get("apron_tint")));
    ready = true;
    loading.hidden = true;
    requestAnimationFrame(frame);
  }).catch(error => {
    loading.textContent = "画像を読み込めませんでした。リポジトリ内のarchiveとsrcの配置を確認してください。";
    status.textContent = "画像の読み込みエラー";
    console.error("Asset loading failed:", error);
  });
})();
