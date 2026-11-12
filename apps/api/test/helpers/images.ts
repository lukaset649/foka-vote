import sharp from 'sharp';

export function fixtureJpeg(width = 64, height = 48): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 40, g: 120, b: 200 } },
  })
    .jpeg()
    .toBuffer();
}
