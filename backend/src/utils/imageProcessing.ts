import sharp from "sharp";

// Preview is a small, blurred, watermarked rendition -- enough to show what
// the media is, useless as a substitute for the paid original.
export async function generatePreview(originalBuffer: Buffer): Promise<Buffer> {
  const base = await sharp(originalBuffer)
    .resize({ width: 480, withoutEnlargement: true })
    .blur(18)
    .toBuffer({ resolveWithObject: true });

  const { width, height } = base.info;
  // Watermark band must never exceed the (possibly small/unenlarged) base
  // image dimensions, or sharp's composite() throws.
  const bandHeight = Math.max(20, Math.min(60, Math.round(height * 0.2)));
  const fontSize = Math.max(10, Math.min(22, Math.round(width / 18)));

  const watermarkSvg = Buffer.from(
    `<svg width="${width}" height="${bandHeight}">
      <rect width="100%" height="100%" fill="rgba(0,0,0,0.35)" />
      <text x="50%" y="50%" font-size="${fontSize}" fill="white" font-family="sans-serif"
            text-anchor="middle" dominant-baseline="middle">PREVIEW - UNLOCK TO VIEW</text>
    </svg>`
  );

  return sharp(base.data)
    .composite([{ input: watermarkSvg, gravity: "center" }])
    .jpeg({ quality: 70 })
    .toBuffer();
}
