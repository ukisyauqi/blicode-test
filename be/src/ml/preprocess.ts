import sharp from "sharp";

const SIZE = 224;
const RESIZE = 256;
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

export class InvalidImageError extends Error {
  constructor(cause?: unknown) {
    super("File bukan gambar yang valid", { cause });
    this.name = "InvalidImageError";
  }
}

// Python round() membulatkan tepat 0,5 ke bilangan genap; Math.round selalu ke atas.
function roundHalfEven(value: number): number {
  const floor = Math.floor(value);
  if (value - floor === 0.5) return floor % 2 === 0 ? floor : floor + 1;
  return Math.round(value);
}

type Coefficients = { start: number; weights: number[] };

// Koefisien bilinear PIL/torchvision: pusat piksel (i + 0,5), support 1 * skala.
function bilinearCoefficients(input: number, output: number): Coefficients[] {
  const scale = input / output;
  const support = Math.max(1, scale);
  return Array.from({ length: output }, (_, index) => {
    const center = (index + 0.5) * scale;
    const start = Math.max(0, Math.floor(center - support + 0.5));
    const end = Math.min(input, Math.floor(center + support + 0.5));
    const weights = Array.from({ length: Math.max(1, end - start) }, (_, i) => {
      const distance = Math.abs((start + i + 0.5 - center) / support);
      return Math.max(0, 1 - distance);
    });
    const total = weights.reduce((sum, weight) => sum + weight, 0) || 1;
    return { start, weights: weights.map((weight) => weight / total) };
  });
}

// sharp/libvips memakai interpolasi berbeda dari PIL; resampler ini menjaga paritas dengan torchvision.
function resizeBilinear(
  source: Buffer,
  width: number,
  height: number,
  targetWidth: number,
  targetHeight: number,
): Buffer {
  const x = bilinearCoefficients(width, targetWidth);
  const y = bilinearCoefficients(height, targetHeight);
  const horizontal = new Float32Array(targetWidth * height * 3);
  for (let row = 0; row < height; row += 1) {
    for (let col = 0; col < targetWidth; col += 1) {
      const { start, weights } = x[col]!;
      for (let c = 0; c < 3; c += 1) {
        let value = 0;
        for (let i = 0; i < weights.length; i += 1) {
          value += (source[(row * width + start + i) * 3 + c] ?? 0) * weights[i]!;
        }
        horizontal[(row * targetWidth + col) * 3 + c] = value;
      }
    }
  }

  const out = Buffer.alloc(targetWidth * targetHeight * 3);
  for (let row = 0; row < targetHeight; row += 1) {
    const { start, weights } = y[row]!;
    for (let col = 0; col < targetWidth; col += 1) {
      for (let c = 0; c < 3; c += 1) {
        let value = 0;
        for (let i = 0; i < weights.length; i += 1) {
          value += horizontal[((start + i) * targetWidth + col) * 3 + c]! * weights[i]!;
        }
        out[(row * targetWidth + col) * 3 + c] = Math.max(0, Math.min(255, Math.round(value)));
      }
    }
  }
  return out;
}

/** EXIF rotate, hapus alpha, resize sisi pendek ke 256, center crop 224, normalisasi ImageNet. */
export async function preprocessImage(input: Buffer): Promise<Float32Array> {
  try {
    return await preprocessValidated(input);
  } catch (error) {
    throw new InvalidImageError(error);
  }
}

async function preprocessValidated(input: Buffer): Promise<Float32Array> {
  const original = await sharp(input)
    .rotate()
    .removeAlpha()
    .toColourspace("srgb")
    .raw()
    .toBuffer({ resolveWithObject: true });
  const { width, height } = original.info;
  if (original.info.channels !== 3) {
    throw new Error(`channel gambar tidak didukung: ${original.info.channels}`);
  }

  // torchvision/PIL memakai floor untuk sisi panjang, bukan pembulatan.
  const [targetWidth, targetHeight] =
    width <= height
      ? [RESIZE, Math.floor((RESIZE * height) / width)]
      : [Math.floor((RESIZE * width) / height), RESIZE];

  const pixels = resizeBilinear(original.data, width, height, targetWidth, targetHeight);
  const left = roundHalfEven((targetWidth - SIZE) / 2);
  const top = roundHalfEven((targetHeight - SIZE) / 2);
  const out = new Float32Array(3 * SIZE * SIZE);
  for (let y = 0; y < SIZE; y += 1) {
    for (let x = 0; x < SIZE; x += 1) {
      const source = ((top + y) * targetWidth + (left + x)) * 3;
      const target = y * SIZE + x;
      for (let c = 0; c < 3; c += 1) {
        const pixel = pixels[source + c] ?? 0;
        out[c * SIZE * SIZE + target] = (pixel / 255 - (MEAN[c] ?? 0)) / (STD[c] ?? 1);
      }
    }
  }
  return out;
}
