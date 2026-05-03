const BASE_CHARSET = " .,:;irsXA253hMHGS#9B&@";

const EDGE_CHARS: Record<string, string> = {
  horizontal: "-",
  vertical: "|",
  diag_fw: "/",
  diag_bw: "\\",
};

export type AsciiOptions = {
  width: number;
  height: number;
  density: number;
  realism?: number;
  customCharset?: string;
  colorMode?: "monochrome" | "rgb-snapped" | "cmyk-snapped" | "true-rgb";
  brightness?: number;
  contrast?: number;
  dithering?: boolean;
  edgeDetection?: boolean;
  edgeStrength?: number;
};

export type RenderOptions = AsciiOptions & {
  bgContext: CanvasRenderingContext2D;
  fgContext: CanvasRenderingContext2D;
  cellSize?: number;
  themeColor?: string;
  letterSpacing?: number;
  lineHeight?: number;
};

function getCharset(density: number, customCharset?: string): string {
  if (customCharset && customCharset.trim().length > 0) {
    return customCharset;
  }
  const normalized = Math.max(10, Math.min(100, density)) / 100;
  const size = Math.max(8, Math.floor(BASE_CHARSET.length * normalized));
  return BASE_CHARSET.slice(0, size);
}

function computeSobelGray(
  pixels: Uint8ClampedArray,
  colorLUT: Uint8Array,
  width: number,
  height: number
): Float32Array {
  const gray = new Float32Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const pi = i * 4;
    const r = colorLUT[pixels[pi]];
    const g = colorLUT[pixels[pi + 1]];
    const b = colorLUT[pixels[pi + 2]];
    gray[i] = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  return gray;
}

function sobelAt(
  gray: Float32Array,
  x: number,
  y: number,
  width: number,
  height: number
): { mag: number; angle: number } {
  const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
  const g = (dx: number, dy: number) =>
    gray[clamp(y + dy, 0, height - 1) * width + clamp(x + dx, 0, width - 1)];

  const gx =
    -g(-1, -1) + g(1, -1) +
    -2 * g(-1, 0) + 2 * g(1, 0) +
    -g(-1, 1) + g(1, 1);

  const gy =
    -g(-1, -1) - 2 * g(0, -1) - g(1, -1) +
    g(-1, 1) + 2 * g(0, 1) + g(1, 1);

  const mag = Math.sqrt(gx * gx + gy * gy);
  const angle = Math.atan2(gy, gx);
  return { mag, angle };
}

function getEdgeChar(angle: number): string {
  const deg = ((angle * 180) / Math.PI + 180) % 180;
  if (deg < 22.5 || deg >= 157.5) return EDGE_CHARS.horizontal;
  if (deg >= 22.5 && deg < 67.5) return EDGE_CHARS.diag_fw;
  if (deg >= 67.5 && deg < 112.5) return EDGE_CHARS.vertical;
  return EDGE_CHARS.diag_bw;
}

export function renderAsciiToCanvas(
  data: Uint8ClampedArray,
  options: RenderOptions
): string {
  const {
    width, height, density, realism = 50,
    customCharset, colorMode = "monochrome",
    fgContext, bgContext, cellSize = 10, themeColor = "#2cff85",
    brightness = 100, contrast = 100, dithering = false,
    letterSpacing = 1, lineHeight = 1,
    edgeDetection = false, edgeStrength = 50,
  } = options;

  const charset = getCharset(density, customCharset);
  const lastIndex = charset.length - 1;
  const gamma = Math.max(0.1, realism / 50);

  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  const brightnessOffset = (brightness - 100) * 2.55;

  const canvasW = width * cellSize * letterSpacing * 2;
  const canvasH = height * cellSize * lineHeight * 2;
  fgContext.clearRect(0, 0, canvasW, canvasH);
  bgContext.clearRect(0, 0, canvasW, canvasH);

  fgContext.font = `${cellSize}px "Fira Code", monospace`;
  fgContext.textBaseline = "top";

  if (colorMode === "monochrome") {
    fgContext.fillStyle = themeColor;
  }

  const pixels = new Uint8ClampedArray(data);

  const bayer = dithering ? [
    [ 0/16,  8/16,  2/16, 10/16 ],
    [12/16,  4/16, 14/16,  6/16 ],
    [ 3/16, 11/16,  1/16,  9/16 ],
    [15/16,  7/16, 13/16,  5/16 ]
  ] : null;

  const lumaLUT = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    lumaLUT[i] = Math.pow(i / 255, gamma);
  }

  const colorLUT = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    let c = contrastFactor * (i - 128) + 128 + brightnessOffset;
    colorLUT[i] = Math.max(0, Math.min(255, c));
  }

  const edgeThreshold = (edgeStrength / 100) * 200 + 20;
  let grayMap: Float32Array | null = null;
  if (edgeDetection) {
    grayMap = computeSobelGray(pixels, colorLUT, width, height);
  }

  const textRows: string[] = [];

  for (let y = 0; y < height; y += 1) {
    let currentRow = "";

    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;

      const r = colorLUT[pixels[i]];
      const g = colorLUT[pixels[i + 1]];
      const b = colorLUT[pixels[i + 2]];

      const rawLuma = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
      const luma = lumaLUT[rawLuma];

      let char: string;
      let isEdge = false;

      if (edgeDetection && grayMap) {
        const { mag, angle } = sobelAt(grayMap, x, y, width, height);
        if (mag > edgeThreshold) {
          char = getEdgeChar(angle);
          isEdge = true;
        } else {
          let finalLuma = luma;
          if (bayer) {
            const threshold = bayer[y % 4][x % 4];
            finalLuma = luma < threshold ? 0 : 1;
          }
          const idx = Math.max(0, Math.min(lastIndex, Math.round(finalLuma * lastIndex)));
          char = charset[lastIndex - idx];
        }
      } else {
        let finalLuma = luma;
        if (bayer) {
          const threshold = bayer[y % 4][x % 4];
          finalLuma = luma < threshold ? 0 : 1;
        }
        const idx = Math.max(0, Math.min(lastIndex, Math.round(finalLuma * lastIndex)));
        char = charset[lastIndex - idx];
      }

      currentRow += char;

      if (char !== " ") {
        if (edgeDetection && isEdge) {
          fgContext.fillStyle = themeColor;
        } else if (colorMode === "true-rgb") {
          fgContext.fillStyle = `rgb(${r}, ${g}, ${b})`;
        } else if (colorMode === "rgb-snapped") {
          const snapR = r > 127 ? 255 : 0;
          const snapG = g > 127 ? 255 : 0;
          const snapB = b > 127 ? 255 : 0;
          fgContext.fillStyle = `rgb(${snapR || 20}, ${snapG || 20}, ${snapB || 20})`;
        } else if (colorMode === "cmyk-snapped") {
          let snapR = 0, snapG = 0, snapB = 0;
          if (r > g && r > b) {
            if (g > b) { snapR = 255; snapG = 255; snapB = 0; }
            else { snapR = 255; snapG = 0; snapB = 255; }
          } else if (g > r && g > b) {
            if (r > b) { snapR = 255; snapG = 255; snapB = 0; }
            else { snapR = 0; snapG = 255; snapB = 255; }
          } else if (b > r && b > g) {
            if (g > r) { snapR = 0; snapG = 255; snapB = 255; }
            else { snapR = 255; snapG = 0; snapB = 255; }
          } else {
            snapR = 255; snapG = 255; snapB = 255;
          }
          fgContext.fillStyle = `rgb(${snapR}, ${snapG}, ${snapB})`;
        }
        fgContext.fillText(char, x * cellSize * letterSpacing, y * cellSize * lineHeight);
      }
    }
    textRows.push(currentRow);
  }

  return textRows.join("\n");
}

export function frameToAscii(
  data: Uint8ClampedArray,
  options: AsciiOptions
): string {
  const { width, height, density, realism = 50, customCharset } = options;
  const charset = getCharset(density, customCharset);
  const rows: string[] = [];
  const lastIndex = charset.length - 1;
  const gamma = Math.max(0.1, realism / 50);

  for (let y = 0; y < height; y += 1) {
    let row = "";
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      let luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      luma = Math.pow(luma, gamma);
      const idx = Math.max(0, Math.min(lastIndex, Math.round(luma * lastIndex)));
      row += charset[lastIndex - idx];
    }
    rows.push(row);
  }

  return rows.join("\n");
}

export function getRasterSize(density: number) {
  const clamped = Math.max(10, Math.min(100, density));
  const width = Math.round(56 + clamped * 0.9);
  const height = Math.round(width * 0.6);
  return { width, height };
}
