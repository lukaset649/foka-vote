import sharp from 'sharp';

export interface FixtureImageOptions {
  width?: number;
  height?: number;
  format?: 'jpeg' | 'png';
}

export function fixtureImage({
  width = 1200,
  height = 900,
  format = 'jpeg',
}: FixtureImageOptions = {}): Promise<Buffer> {
  return sharp({
    create: { width, height, channels: 3, background: { r: 40, g: 120, b: 200 } },
  })
    .toFormat(format)
    .toBuffer();
}
