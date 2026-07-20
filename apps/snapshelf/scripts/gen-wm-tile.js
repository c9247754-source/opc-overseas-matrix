const sharp = require("sharp");
const fs = require("fs");

// 5x7 bitmap glyphs — no system fonts, no tofu on Vercel
const GLYPHS = {
  " ": [0, 0, 0, 0, 0, 0, 0],
  A: [0b010, 0b101, 0b101, 0b111, 0b101, 0b101, 0b101],
  D: [0b110, 0b101, 0b101, 0b101, 0b101, 0b101, 0b110],
  E: [0b111, 0b100, 0b100, 0b111, 0b100, 0b100, 0b111],
  F: [0b111, 0b100, 0b100, 0b111, 0b100, 0b100, 0b100],
  H: [0b101, 0b101, 0b101, 0b111, 0b101, 0b101, 0b101],
  I: [0b111, 0b010, 0b010, 0b010, 0b010, 0b010, 0b111],
  L: [0b100, 0b100, 0b100, 0b100, 0b100, 0b100, 0b111],
  M: [0b101, 0b111, 0b111, 0b101, 0b101, 0b101, 0b101],
  N: [0b101, 0b111, 0b111, 0b111, 0b101, 0b101, 0b101],
  O: [0b010, 0b101, 0b101, 0b101, 0b101, 0b101, 0b010],
  P: [0b111, 0b101, 0b101, 0b111, 0b100, 0b100, 0b100],
  S: [0b011, 0b100, 0b100, 0b010, 0b001, 0b001, 0b110],
  T: [0b111, 0b010, 0b010, 0b010, 0b010, 0b010, 0b010],
  W: [0b101, 0b101, 0b101, 0b101, 0b111, 0b111, 0b101],
};

function renderText(text, scale = 4) {
  const chars = text.toUpperCase().split("");
  const gw = 4;
  const width = chars.length * gw * scale;
  const height = 7 * scale;
  const rgba = Buffer.alloc(width * height * 4, 0);

  chars.forEach((ch, i) => {
    const rows = GLYPHS[ch] || GLYPHS[" "];
    for (let y = 0; y < 7; y++) {
      for (let x = 0; x < 3; x++) {
        if ((rows[y] >> (2 - x)) & 1) {
          for (let dy = 0; dy < scale; dy++) {
            for (let dx = 0; dx < scale; dx++) {
              const px = (i * gw + x) * scale + dx;
              const py = y * scale + dy;
              const idx = (py * width + px) * 4;
              rgba[idx] = 20;
              rgba[idx + 1] = 20;
              rgba[idx + 2] = 20;
              rgba[idx + 3] = 120;
            }
          }
        }
      }
    }
  });

  return { width, height, rgba };
}

async function main() {
  const { width, height, rgba } = renderText("MADE WITH SNAPSHELF", 4);
  const label = await sharp(rgba, {
    raw: { width, height, channels: 4 },
  })
    .png()
    .toBuffer();

  const tw = 520;
  const th = 300;
  const left = Math.round((tw - width) / 2);
  const top = Math.round((th - height) / 2);

  const base = await sharp({
    create: {
      width: tw,
      height: th,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: label, left, top }])
    .png()
    .toBuffer();

  const pad = 80;
  const padded = await sharp(base)
    .extend({
      top: pad,
      bottom: pad,
      left: pad,
      right: pad,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  await sharp(padded)
    .rotate(-28, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toFile("public/wm-tile.png");

  console.log("wrote", fs.statSync("public/wm-tile.png").size);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
