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
  saliencyMap?: Float32Array | null;
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
  if (customCharset && customCharset.trim().length > 0) return customCharset;
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
    gray[i] =
      0.2126 * colorLUT[pixels[pi]] +
      0.7152 * colorLUT[pixels[pi + 1]] +
      0.0722 * colorLUT[pixels[pi + 2]];
  }
  return gray;
}

function sobelAt(
  gray: Float32Array,
  x: number,
  y: number,
  w: number,
  h: number
): { mag: number; angle: number } {
  const c = (dx: number, dy: number) => {
    const nx = Math.max(0, Math.min(w - 1, x + dx));
    const ny = Math.max(0, Math.min(h - 1, y + dy));
    return gray[ny * w + nx];
  };
  const gx =
    -c(-1, -1) + c(1, -1) - 2 * c(-1, 0) + 2 * c(1, 0) - c(-1, 1) + c(1, 1);
  const gy =
    -c(-1, -1) - 2 * c(0, -1) - c(1, -1) + c(-1, 1) + 2 * c(0, 1) + c(1, 1);
  return { mag: Math.sqrt(gx * gx + gy * gy), angle: Math.atan2(gy, gx) };
}

function getEdgeChar(angle: number): string {
  const deg = ((angle * 180) / Math.PI + 180) % 180;
  if (deg < 22.5 || deg >= 157.5) return EDGE_CHARS.horizontal;
  if (deg < 67.5) return EDGE_CHARS.diag_fw;
  if (deg < 112.5) return EDGE_CHARS.vertical;
  return EDGE_CHARS.diag_bw;
}

export function renderAsciiToCanvas(
  data: Uint8ClampedArray,
  options: RenderOptions
): string {
  const {
    width,
    height,
    density,
    realism = 50,
    customCharset,
    colorMode = "monochrome",
    fgContext,
    bgContext,
    cellSize = 10,
    themeColor = "#00ff00",
    brightness = 100,
    contrast = 100,
    dithering = false,
    letterSpacing = 1,
    lineHeight = 1,
    edgeDetection = false,
    edgeStrength = 50,
    saliencyMap = null,
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
  if (colorMode === "monochrome") fgContext.fillStyle = themeColor;

  const pixels = new Uint8ClampedArray(data);

  const bayer = dithering
    ? [
        [0 / 16, 8 / 16, 2 / 16, 10 / 16],
        [12 / 16, 4 / 16, 14 / 16, 6 / 16],
        [3 / 16, 11 / 16, 1 / 16, 9 / 16],
        [15 / 16, 7 / 16, 13 / 16, 5 / 16],
      ]
    : null;

  const lumaLUT = new Float32Array(256);
  for (let i = 0; i < 256; i++) lumaLUT[i] = Math.pow(i / 255, gamma);

  const colorLUT = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    let c = contrastFactor * (i - 128) + 128 + brightnessOffset;
    colorLUT[i] = Math.max(0, Math.min(255, c));
  }

  const edgeThreshold = (edgeStrength / 100) * 200 + 20;
  const grayMap = edgeDetection ? computeSobelGray(pixels, colorLUT, width, height) : null;

  const textRows: string[] = [];

  for (let y = 0; y < height; y++) {
    let row = "";
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;

      const r = colorLUT[pixels[i]];
      const g = colorLUT[pixels[i + 1]];
      const b = colorLUT[pixels[i + 2]];

      const rawLuma = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
      let luma = lumaLUT[rawLuma];

      // ── Saliency-based density modulation ──────────────────────────────────
      // High-saliency cells (face regions) get full detail.
      // Low-saliency cells (background) use a sparse sub-charset.
      let effectiveLastIndex = lastIndex;
      let effectiveCharset = charset;
      if (saliencyMap) {
        const sal = saliencyMap[y * width + x] ?? 0;
        if (sal < 0.15) {
          // deep background — render almost nothing
          effectiveCharset = charset.slice(0, Math.max(2, Math.floor(charset.length * 0.25)));
          effectiveLastIndex = effectiveCharset.length - 1;
          luma = Math.min(luma, 0.3);
        } else if (sal < 0.45) {
          // mid-ground — half detail
          effectiveCharset = charset.slice(0, Math.max(4, Math.floor(charset.length * 0.55)));
          effectiveLastIndex = effectiveCharset.length - 1;
        }
        // sal >= 0.45: full face detail — keep defaults
      }
      // ───────────────────────────────────────────────────────────────────────

      let char: string;
      let isEdge = false;

      if (edgeDetection && grayMap) {
        const { mag, angle } = sobelAt(grayMap, x, y, width, height);
        if (mag > edgeThreshold) {
          char = getEdgeChar(angle);
          isEdge = true;
        } else {
          let fl = luma;
          if (bayer) fl = fl < bayer[y % 4][x % 4] ? 0 : 1;
          const idx = Math.max(0, Math.min(effectiveLastIndex, Math.round(fl * effectiveLastIndex)));
          char = effectiveCharset[effectiveLastIndex - idx];
        }
      } else {
        let fl = luma;
        if (bayer) fl = fl < bayer[y % 4][x % 4] ? 0 : 1;
        const idx = Math.max(0, Math.min(effectiveLastIndex, Math.round(fl * effectiveLastIndex)));
        char = effectiveCharset[effectiveLastIndex - idx];
      }

      row += char;

      if (char !== " ") {
        if (isEdge || colorMode === "monochrome") {
          fgContext.fillStyle = themeColor;
        } else if (colorMode === "true-rgb") {
          fgContext.fillStyle = `rgb(${r},${g},${b})`;
        } else if (colorMode === "rgb-snapped") {
          const sr = r > 127 ? 255 : 0;
          const sg = g > 127 ? 255 : 0;
          const sb = b > 127 ? 255 : 0;
          fgContext.fillStyle = `rgb(${sr || 20},${sg || 20},${sb || 20})`;
        } else if (colorMode === "cmyk-snapped") {
          let sr = 0, sg = 0, sb = 0;
          if (r > g && r > b) { sg = g > b ? 255 : 0; sr = 255; sb = g > b ? 0 : 255; }
          else if (g > r && g > b) { sr = r > b ? 255 : 0; sg = 255; sb = r > b ? 0 : 255; }
          else if (b > r && b > g) { sr = g > r ? 0 : 255; sg = g > r ? 255 : 0; sb = 255; }
          else { sr = sg = sb = 255; }
          fgContext.fillStyle = `rgb(${sr},${sg},${sb})`;
        }
        fgContext.fillText(char, x * cellSize * letterSpacing, y * cellSize * lineHeight);
      }
    }
    textRows.push(row);
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

  for (let y = 0; y < height; y++) {
    let row = "";
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      let luma = Math.pow((0.2126 * r + 0.7152 * g + 0.0722 * b) / 255, gamma);
      row += charset[lastIndex - Math.max(0, Math.min(lastIndex, Math.round(luma * lastIndex)))];
    }
    rows.push(row);
  }
  return rows.join("\n");
}

export function getRasterSize(density: number) {
  const clamped = Math.max(10, Math.min(100, density));
  return { width: Math.round(56 + clamped * 0.9), height: Math.round((56 + clamped * 0.9) * 0.6) };
}
