import { compositeOnWhiteAndWatermark } from "../src/lib/image";
import sharp from "sharp";
import fs from "fs";

async function main() {
  const cutout = await sharp({
    create: {
      width: 420,
      height: 520,
      channels: 4,
      background: { r: 50, g: 140, b: 200, alpha: 255 },
    },
  })
    .png()
    .toBuffer();
  const dataUrl = "data:image/png;base64," + cutout.toString("base64");

  const withWm = await compositeOnWhiteAndWatermark(dataUrl, {
    watermark: true,
    brand: "SnapShelf",
    size: 1000,
    shadow: true,
  });
  const noWm = await compositeOnWhiteAndWatermark(dataUrl, {
    watermark: false,
    brand: "SnapShelf",
    size: 1000,
    shadow: true,
  });

  fs.writeFileSync("public/test-with-wm.png", withWm);
  fs.writeFileSync("public/test-no-wm.png", noWm);

  async function avgLuma(buf: Buffer) {
    const { data, info } = await sharp(buf)
      .raw()
      .toBuffer({ resolveWithObject: true });
    let sum = 0;
    const n = info.width * info.height;
    for (let i = 0; i < data.length; i += info.channels) sum += data[i];
    return sum / n;
  }

  const a = await avgLuma(withWm);
  const b = await avgLuma(noWm);
  console.log(
    JSON.stringify(
      {
        withWmBytes: withWm.length,
        noWmBytes: noWm.length,
        avgWith: Number(a.toFixed(2)),
        avgNo: Number(b.toFixed(2)),
        watermarkMakesDarker: a < b - 0.5,
      },
      null,
      2
    )
  );
  if (!(a < b - 0.5)) {
    process.exitCode = 1;
    console.error("FAIL: watermark not detectable in output");
  } else {
    console.log("PASS: watermark detectable");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
