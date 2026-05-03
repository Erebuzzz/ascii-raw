import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { renderAsciiToCanvas, getRasterSize } from "@/lib/ascii";
import { CustomTextOverlay, TextPosition } from "@/components/CustomTextOverlay";
import { toPng } from "html-to-image";
import { Logo } from "@/components/Logo";
import { Link } from "wouter";

const TARGET_FPS = 15;

type RunPhase = "idle" | "scanning" | "done" | "capturing" | "recording";
type Theme = "terminal" | "cyberpunk" | "minimal" | "inverted";

const THEMES: { id: Theme; label: string }[] = [
  { id: "terminal",  label: "TRM" },
  { id: "cyberpunk", label: "CYB" },
  { id: "minimal",   label: "MIN" },
  { id: "inverted",  label: "INV" },
];

export function AsciiCamera() {
  const [phase, setPhase]         = useState<RunPhase>("idle");
  const [density, setDensity]     = useState(58);
  const [realism, setRealism]     = useState(50);
  const [error, setError]         = useState<string | null>(null);

  const [overlayText, setOverlayText] = useState("");
  const [textPos, setTextPos]     = useState<TextPosition>("center");
  const [textSize, setTextSize]   = useState(16);

  const [customCharset, setCustomCharset] = useState("");
  const [theme, setTheme]         = useState<Theme>("terminal");
  const [isMirrored, setIsMirrored] = useState(true);
  const [colorMode, setColorMode] = useState<"monochrome" | "rgb-snapped" | "cmyk-snapped" | "true-rgb">("monochrome");

  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast]   = useState(0);
  const [dithering, setDithering] = useState(false);
  const [letterSpacing, setLetterSpacing] = useState(1.0);
  const [lineHeight, setLineHeight] = useState(1.0);
  const [fps, setFps]             = useState(0);
  const [motion, setMotion]       = useState(0);

  const [edgeDetection, setEdgeDetection] = useState(false);
  const [edgeStrength, setEdgeStrength]   = useState(50);

  const [zoom, setZoom]           = useState(1.0);
  const [pan, setPan]             = useState({ x: 0, y: 0 });
  const isDragging                = useRef(false);
  const dragStart                 = useRef({ x: 0, y: 0, px: 0, py: 0 });

  const videoRef       = useRef<HTMLVideoElement | null>(null);
  const hideCanvasRef  = useRef<HTMLCanvasElement | null>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef    = useRef<HTMLDivElement | null>(null);
  const loopRef        = useRef<number | null>(null);
  const lastFrameRef   = useRef<number>(0);
  const streamRef      = useRef<MediaStream | null>(null);

  const lastImageDataRef  = useRef<ImageData | null>(null);
  const mediaRecorderRef  = useRef<MediaRecorder | null>(null);
  const chunksRef         = useRef<Blob[]>([]);
  const rawAsciiRef       = useRef<string>("");

  const rasterSize = useMemo(() => getRasterSize(density), [density]);

  const stopLoop = useCallback(() => {
    if (loopRef.current !== null) {
      cancelAnimationFrame(loopRef.current);
      loopRef.current = null;
    }
  }, []);

  const stopStream = useCallback(() => {
    if (!streamRef.current) return;
    streamRef.current.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }, []);

  const reset = useCallback(() => {
    stopLoop();
    stopStream();
    setPhase("idle");
    setError(null);
  }, [stopLoop, stopStream]);

  const tickRef = useRef<((timestamp: number) => void) | null>(null);

  const tick = useCallback(function frameTick(timestamp: number) {
    const video   = videoRef.current;
    const hCanvas = hideCanvasRef.current;
    const dCanvas = displayCanvasRef.current;
    if (!video || !hCanvas || !dCanvas) return;

    const frameInterval = 1000 / TARGET_FPS;
    const delta = timestamp - lastFrameRef.current;
    if (delta < frameInterval) {
      loopRef.current = requestAnimationFrame((t) => tickRef.current?.(t));
      return;
    }
    setFps(Math.round(1000 / delta));
    lastFrameRef.current = timestamp;

    const { width, height } = rasterSize;
    const hCtx = hCanvas.getContext("2d", { willReadFrequently: true });
    const dCtx = dCanvas.getContext("2d");
    if (!hCtx || !dCtx) { setError("Canvas context unavailable."); reset(); return; }

    const CELL_SIZE = 10;
    hCanvas.width  = width;
    hCanvas.height = height;
    dCanvas.width  = width * CELL_SIZE;
    dCanvas.height = height * CELL_SIZE;

    hCtx.save();
    if (isMirrored) { hCtx.translate(width, 0); hCtx.scale(-1, 1); }
    hCtx.drawImage(video, 0, 0, width, height);
    hCtx.restore();

    const image = hCtx.getImageData(0, 0, width, height);

    if (lastImageDataRef.current && lastImageDataRef.current.width === width) {
      let diffSum = 0;
      const curr = image.data, prev = lastImageDataRef.current.data, len = curr.length;
      for (let i = 1; i < len; i += 16) diffSum += Math.abs(curr[i] - prev[i]);
      setMotion(Math.min(100, (diffSum / ((len / 16) * 255)) * 300));
    }
    lastImageDataRef.current = image;

    const themeColor = getComputedStyle(document.documentElement).getPropertyValue('--ink').trim() || "#FFFFFF";

    rawAsciiRef.current = renderAsciiToCanvas(image.data, {
      width, height, density, realism, customCharset, colorMode,
      bgContext: dCtx, fgContext: dCtx, cellSize: CELL_SIZE, themeColor,
      brightness, contrast, dithering, letterSpacing, lineHeight,
      edgeDetection, edgeStrength,
    });

    loopRef.current = requestAnimationFrame((t) => tickRef.current?.(t));
  }, [density, realism, customCharset, rasterSize, colorMode, isMirrored,
      brightness, contrast, dithering, letterSpacing, lineHeight,
      edgeDetection, edgeStrength, reset]);

  useEffect(() => { tickRef.current = tick; }, [tick]);

  const handleCapture = useCallback(async () => {
    setPhase("capturing");
    stopLoop();
    setTimeout(async () => {
      const node = viewportRef.current;
      if (!node) return;
      try {
        const dataUrl = await toPng(node, {
          cacheBust: true, pixelRatio: 4,
          backgroundColor: "var(--bg)", style: { transform: "none" }
        });
        const link = document.createElement("a");
        link.download = `ascii-profile-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();
        setPhase("done");
      } catch (err) {
        console.error("Capture error:", err);
        setError("Failed to download snapshot.");
        setPhase("idle");
      }
    }, 1200);
  }, [stopLoop]);

  const startScan = useCallback(async () => {
    try {
      stopLoop(); stopStream(); setError(null); setPhase("scanning");
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      const video = videoRef.current;
      if (!video) return;
      video.srcObject = stream;
      await video.play();
      lastFrameRef.current = 0;
      loopRef.current = requestAnimationFrame((t) => tickRef.current?.(t));
    } catch {
      setError("Camera permission denied or unavailable.");
      setPhase("idle");
    }
  }, [stopLoop, stopStream, tick]);

  const startRecording = useCallback(() => {
    const canvas = displayCanvasRef.current;
    if (!canvas) return;
    try {
      const stream = (canvas as HTMLCanvasElement & { captureStream: (fps?: number) => MediaStream }).captureStream(TARGET_FPS);
      const recorder = new MediaRecorder(stream, { mimeType: "video/webm" });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "video/webm" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = `ascii-record-${Date.now()}.webm`; a.click();
        URL.revokeObjectURL(url);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setPhase("recording");
    } catch (err) {
      console.error(err);
      setError("Recording format not supported on this browser.");
    }
  }, []);

  const stopRecording = useCallback(() => { mediaRecorderRef.current?.stop(); setPhase("scanning"); }, []);

  const copyToClipboard = useCallback(async () => {
    if (!rawAsciiRef.current) return;
    try {
      await navigator.clipboard.writeText(rawAsciiRef.current);
      setOverlayText("ASCII COPIED TO CLIPBOARD");
      setTextPos("bottom-center"); setTextSize(14);
      setTimeout(() => setOverlayText(""), 2000);
    } catch { setError("Clipboard write failed."); }
  }, []);

  const exportTxt = useCallback(() => {
    if (!rawAsciiRef.current) return;
    const blob = new Blob([rawAsciiRef.current], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url; link.download = `sys-ascii-${Date.now()}.txt`; link.click();
    URL.revokeObjectURL(url);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "SELECT") return;
      const key = e.key.toLowerCase();
      if (e.code === "Space" && (phase === "idle" || phase === "done")) startScan();
      if (key === "c" && phase === "scanning") copyToClipboard();
      if (key === "t" && phase === "scanning") exportTxt();
      if (key === "s" && (phase === "scanning" || phase === "recording")) handleCapture();
      if (key === "d") setDithering((p) => !p);
      if (key === "e") setEdgeDetection((p) => !p);
      if (key === "m") setIsMirrored((p) => !p);
      if (key === "r" && phase === "scanning") startRecording();
      if (key === "q" && phase === "recording") stopRecording();
      if (key === "0") { setZoom(1); setPan({ x: 0, y: 0 }); }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [phase, startScan, reset, handleCapture, startRecording, stopRecording,
      copyToClipboard, exportTxt]);

  useEffect(() => { return () => { stopLoop(); stopStream(); }; }, [stopLoop, stopStream]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom((prev) => {
      const next = prev - e.deltaY * 0.001;
      return Math.max(0.5, Math.min(5, next));
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (zoom <= 1) return;
    isDragging.current = true;
    dragStart.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
  }, [zoom, pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    setPan({
      x: dragStart.current.px + (e.clientX - dragStart.current.x),
      y: dragStart.current.py + (e.clientY - dragStart.current.y),
    });
  }, []);

  const handleMouseUp = useCallback(() => { isDragging.current = false; }, []);

  const active = phase === "scanning" || phase === "recording";

  return (
    <main className={`terminalApp theme-${theme}`}>
      <div className="hud-wrapper">

        {/* ── HEADER ── */}
        <header className="hud-header">
          <div className="brand">
            <Logo width={26} height={26} />
            <h1>ASCII.RAW // CAM_01</h1>
          </div>
          <div className="status" style={{
            color: phase === "recording" ? "var(--rec-red)"
                 : (fps > 0 && fps < 8) ? "var(--rec-red)" : "inherit"
          }}>
            <Link href="/docs" style={{ color: "inherit", textDecoration: "none", borderRight: "1px dotted var(--border-dot)", paddingRight: "0.6rem", marginRight: "0.6rem" }}>[ DOCS ]</Link>
            <a href="https://github.com/Erebuzzz/ascii-raw" target="_blank" rel="noreferrer" style={{ color: "inherit", textDecoration: "none", borderRight: "1px dotted var(--border-dot)", paddingRight: "0.6rem", marginRight: "0.6rem" }}>[ GITHUB ]</a>
            FPS: {active ? fps : 0} | MOT: {motion.toFixed(1)}% | STA:{" "}
            {phase === "idle"      && "STANDBY"}
            {phase === "scanning"  && "ACTIVE"}
            {phase === "recording" && "REC●"}
            {phase === "capturing" && "EXECUTING…"}
            {phase === "done"      && "COMPLETE"}
          </div>
        </header>

        {/* ── SIDEBAR ── */}
        <aside className="hud-sidebar">

          {/* Theme */}
          <div className="panel-section">
            <h2 className="panel-title">Theme</h2>
            <div className="toggle-row">
              {THEMES.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  className={`toggle-chip${theme === t.id ? " active" : ""}`}
                  onClick={() => setTheme(t.id)}
                >
                  {t.label}
                </button>
              ))}
              <button
                type="button"
                className={`toggle-chip${isMirrored ? " active" : ""}`}
                onClick={() => setIsMirrored((p) => !p)}
                title="[M] Toggle mirror"
              >
                [M]
              </button>
            </div>
          </div>

          {/* Visual Params */}
          <div className="panel-section">
            <h2 className="panel-title">Visual Params</h2>
            <Slider label="Density"    value={density}    min={10}  max={100} onChange={setDensity}    disabled={phase === "capturing"} />
            <Slider label="Texture"    value={realism}    min={10}  max={100} onChange={setRealism}    disabled={phase === "capturing"} />
            <Slider label="Brightness" value={brightness} min={0}   max={200} onChange={setBrightness} disabled={phase === "capturing"} unit="%" />
            <Slider label="Contrast"   value={contrast}   min={-100} max={100} onChange={setContrast}  disabled={phase === "capturing"} />
            <Toggle label="Bayer Dithering [D]" checked={dithering} onChange={setDithering} disabled={phase === "capturing"} />
          </div>

          {/* Edge Detection */}
          <div className="panel-section">
            <h2 className="panel-title">Edge Detection [E]</h2>
            <Toggle label="Sobel Edges" checked={edgeDetection} onChange={setEdgeDetection} disabled={phase === "capturing"} />
            {edgeDetection && (
              <Slider label="Edge Strength" value={edgeStrength} min={0} max={100} onChange={setEdgeStrength} disabled={phase === "capturing"} />
            )}
          </div>

          {/* Typography */}
          <div className="panel-section">
            <h2 className="panel-title">Typography</h2>
            <Slider label="Kerning" value={letterSpacing} min={0.5} max={2.0} step={0.1} onChange={setLetterSpacing} disabled={phase === "capturing"} unit="x" decimals={2} />
            <Slider label="Leading" value={lineHeight}    min={0.5} max={2.0} step={0.1} onChange={setLineHeight}    disabled={phase === "capturing"} unit="x" decimals={2} />
          </div>

          {/* Character Config */}
          <div className="panel-section">
            <h2 className="panel-title">Character Config</h2>
            <input
              type="text"
              placeholder="Custom Chars (e.g. 10)"
              value={customCharset}
              onChange={(e) => setCustomCharset(e.target.value)}
              className="textInput"
              disabled={phase === "capturing"}
            />
            <select
              value={colorMode}
              onChange={(e) => setColorMode(e.target.value as typeof colorMode)}
              className="themeSelect"
              disabled={phase === "capturing"}
            >
              <option value="monochrome">Monochrome</option>
              <option value="rgb-snapped">RGB Snapped</option>
              <option value="cmyk-snapped">CMYK Snapped</option>
              <option value="true-rgb">True RGB</option>
            </select>
          </div>

          {/* Overlay Data */}
          <div className="panel-section">
            <h2 className="panel-title">Overlay Data</h2>
            <input
              type="text"
              placeholder="Inject Text Data…"
              value={overlayText}
              onChange={(e) => setOverlayText(e.target.value)}
              className="textInput"
              disabled={phase === "capturing"}
            />
            <div className="textOptions">
              <select
                value={textPos}
                onChange={(e) => setTextPos(e.target.value as TextPosition)}
                className="positionSelect"
                disabled={phase === "capturing"}
              >
                <option value="top-left">Top-L</option>
                <option value="top-center">Top-C</option>
                <option value="top-right">Top-R</option>
                <option value="center">CTR</option>
                <option value="bottom-left">Bot-L</option>
                <option value="bottom-center">Bot-C</option>
                <option value="bottom-right">Bot-R</option>
              </select>
              <Slider label="Size" value={textSize} min={12} max={72} onChange={setTextSize} disabled={phase === "capturing"} />
            </div>
          </div>

          {/* Actions */}
          <div className="actions">
            {active ? (
              <>
                <button type="button" onClick={handleCapture} className="primary" disabled={phase === "recording"}>[S] Snapshot 4K</button>
                {phase === "scanning"
                  ? <button type="button" onClick={startRecording} className="danger">[R] Record Feed</button>
                  : <button type="button" onClick={stopRecording} className="danger active-record">[Q] Stop Recording</button>
                }
                <div className="export-btns">
                  <button type="button" onClick={copyToClipboard}>[C] Copy</button>
                  <button type="button" onClick={exportTxt}>[T] TXT</button>
                </div>
              </>
            ) : (
              <button type="button" onClick={startScan}>[Space] Init Sensors</button>
            )}
            <button type="button" onClick={reset} className="danger" disabled={phase === "capturing" || phase === "recording"}>
              Abort / Reset
            </button>
          </div>

          {error && <div className="errorText" style={{ margin: "0 1rem 0.8rem" }}>{error}</div>}
        </aside>

        {/* ── VIEWPORT ── */}
        <section className={`hud-main${phase === "capturing" || phase === "done" ? " dimmed" : ""}`}>
          <div
            className={`viewport-container${!active ? " is-idle" : ""}`}
            onWheel={handleWheel}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
            <div
              className="viewport-inner"
              style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
            >
              <div ref={viewportRef} style={{ position: "relative", display: "inline-block" }}>
                <canvas ref={displayCanvasRef} className="asciiOutputCanvas" />
                <CustomTextOverlay
                  isVisible={phase === "capturing" || phase === "done"}
                  text={overlayText}
                  position={textPos}
                  fontSize={textSize}
                />
              </div>
            </div>

            {/* Crosshair */}
            {active && (
              <div className="crosshair">
                <span className="ch-top" />
                <span className="ch-bottom" />
                <span className="ch-left" />
                <span className="ch-right" />
                <span className="ch-center" />
              </div>
            )}

            {/* Motion meter */}
            {active && (
              <div className="motion-meter">
                <div
                  className="motion-bar"
                  style={{
                    height: `${Math.min(100, Math.max(0, motion))}%`,
                    backgroundColor: motion > 80 ? "var(--rec-red)" : motion > 50 ? "orange" : "var(--accent)",
                  }}
                />
                <span className="motion-label">MOT</span>
              </div>
            )}

            {/* Zoom HUD */}
            {zoom !== 1 && (
              <div className="zoom-hud">{zoom.toFixed(1)}x  [0] reset</div>
            )}

            {/* Idle splash */}
            {phase === "idle" && (
              <div className="idle-splash">
                <div className="splash-icon">
                  <Logo width={64} height={64} />
                </div>
                <p>Press <strong>[ Space ]</strong> or click Init Sensors to start</p>
                <p className="splash-hint">Scroll to zoom · Drag to pan · [E] edges · [M] mirror · [D] dither</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <video ref={videoRef} className="hiddenVideo" muted playsInline />
      <canvas ref={hideCanvasRef} className="hiddenCanvas" />
    </main>
  );
}

/* ── Small reusable primitives ── */

function Slider({
  label, value, min, max, step = 1, onChange, disabled, unit = "", decimals = 0,
}: {
  label: string; value: number; min: number; max: number; step?: number;
  onChange: (v: number) => void; disabled?: boolean; unit?: string; decimals?: number;
}) {
  return (
    <div className="sliderGroup">
      <div className="controlLabel">
        {label}
        <span>{decimals > 0 ? value.toFixed(decimals) : value}{unit}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={value} disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))}
      />
    </div>
  );
}

function Toggle({
  label, checked, onChange, disabled,
}: {
  label: string; checked: boolean; onChange: (v: boolean) => void; disabled?: boolean;
}) {
  return (
    <label className="checkbox-label">
      <input type="checkbox" checked={checked} disabled={disabled}
        onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}
