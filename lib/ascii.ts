const BASE_CHARSET = " .,:;irsXA253hMHGS#9B&@";

export type AsciiOptions = {
  width: number;
  height: number;
  density: number;
  realism?: number;
  customCharset?: string;
  colorMode?: "monochrome" | "rgb-snapped" | "cmyk-snapped" | "true-rgb";
  brightness?: number; // 0 to 200
  contrast?: number; // -100 to 100
  dithering?: boolean;
};

export type RenderOptions = AsciiOptions & {
  bgContext: CanvasRenderingContext2D;
  fgContext: CanvasRenderingContext2D;
  // A standard block cell size to draw high-res canvas text 
  cellSize?: number;
  themeColor?: string;
  letterSpacing?: number; // 0.1 to 2.0 (default 1.0)
  lineHeight?: number; // 0.1 to 2.0 (default 1.0)
};

// ... keep getCharset unmodified

function getCharset(density: number, customCharset?: string): string {
  if (customCharset && customCharset.trim().length > 0) {
    return customCharset;
  }
  const normalized = Math.max(10, Math.min(100, density)) / 100;
  const size = Math.max(8, Math.floor(BASE_CHARSET.length * normalized));
  return BASE_CHARSET.slice(0, size);
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
    letterSpacing = 1, lineHeight = 1
  } = options;
  
  const charset = getCharset(density, customCharset);
  const lastIndex = charset.length - 1;
  const gamma = Math.max(0.1, realism / 50);

  // Contrast math [-100, 100] to a factor [0, ...]
  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  const brightnessOffset = (brightness - 100) * 2.55;

  // Clear previous frame
  fgContext.clearRect(0, 0, width * cellSize * letterSpacing * 2, height * cellSize * lineHeight * 2);
  bgContext.clearRect(0, 0, width * cellSize * letterSpacing * 2, height * cellSize * lineHeight * 2);

  fgContext.font = `${cellSize}px "Fira Code", monospace`;
  fgContext.textBaseline = "top";
  
  if (colorMode === "monochrome") {
    fgContext.fillStyle = themeColor;
  }

  // Clone data for dithering to mutate without affecting original video frame
  const pixels = new Uint8ClampedArray(data);

  const bayer = dithering ? [
    [ 0/16,  8/16,  2/16, 10/16 ],
    [12/16,  4/16, 14/16,  6/16 ],
    [ 3/16, 11/16,  1/16,  9/16 ],
    [15/16,  7/16, 13/16,  5/16 ]
  ] : null;

  // Pre-compute 256-level Lookup Tables for Gamma & Luminance to avoid huge Math.pow calls inside the loop
  const lumaLUT = new Float32Array(256);
  for (let i = 0; i < 256; i++) {
    lumaLUT[i] = Math.pow(i / 255, gamma);
  }

  // Pre-compute contrast mapping array [0..255] -> clamped [0..255]
  const colorLUT = new Uint8Array(256);
  for (let i = 0; i < 256; i++) {
    let c = contrastFactor * (i - 128) + 128 + brightnessOffset;
    colorLUT[i] = Math.max(0, Math.min(255, c));
  }

  const textRows: string[] = [];

  for (let y = 0; y < height; y += 1) {
    let currentRow = "";

    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      
      // Apply Brightness & Contrast via LUT (zero CPU overhead)
      const r = colorLUT[pixels[i]];
      const g = colorLUT[pixels[i + 1]];
      const b = colorLUT[pixels[i + 2]];

      // Raw Luminance (0 to 255)
      const rawLuma = Math.round(0.2126 * r + 0.7152 * g + 0.0722 * b);
      
      // Gamma-corrected Luminance (0.0 to 1.0) via LUT
      const luma = lumaLUT[rawLuma];

      // Bayer Dithering Matrix (4x4)
      let finalLuma = luma;
      if (bayer) {
        const threshold = bayer[y % 4][x % 4];
        finalLuma = luma < threshold ? 0 : 1;
      }
      
      const idx = Math.max(0, Math.min(lastIndex, Math.round(finalLuma * lastIndex)));
      const char = charset[lastIndex - idx];
      currentRow += char;

      if (char !== " ") {
        if (colorMode === "true-rgb") {
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

  // Realism acts as a gamma/contrast curve. Map 10-100 to 0.5 - 2.5
  const gamma = Math.max(0.1, realism / 50);

  for (let y = 0; y < height; y += 1) {
    let row = "";
    for (let x = 0; x < width; x += 1) {
      const i = (y * width + x) * 4;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      let luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
      
      // Apply realism (gamma correction)
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
