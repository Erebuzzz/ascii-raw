"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { renderAsciiToCanvas, getRasterSize } from "@/lib/ascii";
import { CustomTextOverlay, TextPosition } from "@/components/CustomTextOverlay";
import { toPng } from "html-to-image";
import { Logo } from "@/components/Logo";
import Link from 'next/link';

const TARGET_FPS = 15;

type RunPhase = "idle" | "scanning" | "done" | "capturing" | "recording";

export function AsciiCamera() {
  const [phase, setPhase] = useState<RunPhase>("idle");
  const [density, setDensity] = useState(58);
  const [realism, setRealism] = useState(50);
  const [error, setError] = useState<string | null>(null);

  // Custom Text State
  const [overlayText, setOverlayText] = useState("");
  const [textPos, setTextPos] = useState<TextPosition>("center");
  const [textSize, setTextSize] = useState(16);

  // New Quality & Vibe State
  const [customCharset, setCustomCharset] = useState("");
  const [theme, setTheme] = useState("green");
  const [isMirrored, setIsMirrored] = useState(true);
  const [colorMode, setColorMode] = useState<"monochrome" | "rgb-snapped" | "cmyk-snapped" | "true-rgb">("monochrome");

  const [brightness, setBrightness] = useState(100);
  const [contrast, setContrast] = useState(0);
  const [dithering, setDithering] = useState(false);
  const [letterSpacing, setLetterSpacing] = useState(1.0);
  const [lineHeight, setLineHeight] = useState(1.0);
  const [aberration, setAberration] = useState(0);
  const [fps, setFps] = useState(0);
  const [motion, setMotion] = useState(0);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hideCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const displayCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  const loopRef = useRef<number | null>(null);
  const lastFrameRef = useRef<number>(0);
  const streamRef = useRef<MediaStream | null>(null);

  const lastImageDataRef = useRef<ImageData | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const rawAsciiRef = useRef<string>("");

  const rasterSize = useMemo(() => getRasterSize(density), [density]);

  const stopLoop = useCallback(() => {
    if (loopRef.current !== null) {
      cancelAnimationFrame(loopRef.current);
      loopRef.current = null;
    }
  }, []);

  const stopStream = useCallback(() => {
    if (!streamRef.current) return;
    streamRef.current.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const reset = useCallback(() => {
    stopLoop();
    stopStream();
    setPhase("idle");
    setError(null);
  }, [stopLoop, stopStream]);

  const tickRef = useRef<((timestamp: number) => void) | null>(null);

  const tick = useCallback(
    function frameTick(timestamp: number) {
      const video = videoRef.current;
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
      const hContext = hCanvas.getContext("2d", { willReadFrequently: true });
      const dContext = dCanvas.getContext("2d");
      
      if (!hContext || !dContext) {
        setError("Canvas context unavailable.");
        reset();
        return;
      }

      const CELL_SIZE = 10;
      hCanvas.width = width;
      hCanvas.height = height;
      dCanvas.width = width * CELL_SIZE;
      dCanvas.height = height * CELL_SIZE;

      hContext.save();
      // Apply Mirror Effect naturally to the drawn pixels so the ASCII generator just works!
      if (isMirrored) {
        hContext.translate(width, 0);
        hContext.scale(-1, 1);
      }
      hContext.drawImage(video, 0, 0, width, height);
      hContext.restore();

      const image = hContext.getImageData(0, 0, width, height);

      // Frame differencing for Motion Intensity calculation
      if (lastImageDataRef.current && lastImageDataRef.current.width === width) {
        let diffSum = 0;
        const currData = image.data;
        const prevData = lastImageDataRef.current.data;
        const len = currData.length;
        for (let i = 1; i < len; i += 16) {
          diffSum += Math.abs(currData[i] - prevData[i]);
        }
        const maxPossible = (len / 16) * 255;
        const intensity = Math.min(100, (diffSum / maxPossible) * 300);
        setMotion(intensity);
      }
      lastImageDataRef.current = image;
      
      const computedStyle = getComputedStyle(document.documentElement);
      const themeColor = computedStyle.getPropertyValue('--ink').trim() || "#FFFFFF";

      const rawText = renderAsciiToCanvas(image.data, { 
        width, 
        height, 
        density, 
        realism, 
        customCharset,
        colorMode,
        bgContext: dContext, 
        fgContext: dContext,
        cellSize: CELL_SIZE,
        themeColor,
        brightness,
        contrast,
        dithering,
        letterSpacing,
        lineHeight
      });

      rawAsciiRef.current = rawText;

      loopRef.current = requestAnimationFrame((t) => tickRef.current?.(t));
    },
    [density, realism, customCharset, rasterSize, colorMode, isMirrored, brightness, contrast, dithering, letterSpacing, lineHeight, reset]
  );

  useEffect(() => {
    tickRef.current = tick;
  }, [tick]);

  const handleCapture = useCallback(async () => {
    setPhase("capturing"); // Transitions text to GOOD GIRL
    stopLoop();
    
    // Wait for the Good Girl CSS staggered animation + slight heartbeat glow (1200ms total)
    setTimeout(async () => {
      const node = viewportRef.current;
      if (!node) return;

      try {
        const dataUrl = await toPng(node, {
          cacheBust: true,
          pixelRatio: 4, // Insanely sharp 4K printing
          backgroundColor: "var(--bg)", 
          style: { transform: "none" }
        });

        // Trigger automatic 
        const link = document.createElement("a");
        link.download = `ascii-profile-${Date.now()}.png`;
        link.href = dataUrl;
        link.click();

        setPhase("done"); // Fully finished status
      } catch (err) {
        console.error("Capture error:", err);
        setError("Failed to download snapshot.");
        setPhase("idle");
      }
    }, 1200);
  }, [stopLoop]);

  const startScan = useCallback(async () => {
    try {
      stopLoop();
      stopStream();
      setError(null);
      setPhase("scanning");

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user"
        },
        audio: false
      });
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
      const recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      chunksRef.current = [];
      recorder.ondataavailable = e => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `ascii-record-${Date.now()}.webm`;
        a.click();
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

  const stopRecording = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setPhase("scanning");
  }, []);

  const copyToClipboard = useCallback(async () => {
    if (!rawAsciiRef.current) return;
    try {
      await navigator.clipboard.writeText(rawAsciiRef.current);
      setOverlayText("ASCII COPIED TO CLIPBOARD");
      setTextPos("bottom-center");
      setTextSize(14);
      setTimeout(() => setOverlayText(""), 2000);
    } catch {
      setError("Clipboard write failed.");
    }
  }, []);

  const exportTxt = useCallback(() => {
    if (!rawAsciiRef.current) return;
    const blob = new Blob([rawAsciiRef.current], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `sys-ascii-${Date.now()}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "INPUT" || document.activeElement?.tagName === "SELECT") return;

      const key = e.key.toLowerCase();
      if (e.code === 'Space') {
        if (phase === 'idle' || phase === 'done') startScan();
      }
      if (key === 'c' && phase === 'scanning') copyToClipboard();
      if (key === 't' && phase === 'scanning') exportTxt();
      if (key === 's' && (phase === 'scanning' || phase === 'recording')) handleCapture();
      if (key === 'd') setDithering(prev => !prev);
      if (key === 'r' && phase === 'scanning') startRecording();
      if (key === 'q' && phase === 'recording') stopRecording();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [phase, startScan, reset, handleCapture, startRecording, stopRecording, setDithering, copyToClipboard, exportTxt]);

  useEffect(() => {
    return () => {
      stopLoop();
      stopStream();
    };
  }, [stopLoop, stopStream]);

    return (
    <main className={`terminalApp theme-raw`}>
      <div className="hud-wrapper">
        <header className="hud-header">
          <div className="brand">
            <Logo width={28} height={28} />
            <h1>ASCII.RAW // CAM_01</h1>
          </div>
          <div className="status" style={{ color: phase === "recording" ? 'var(--rec-red)' : fps < 10 ? 'var(--rec-red)' : 'inherit' }}>
            <Link href="/docs" style={{ color: 'inherit', textDecoration: 'none', borderRight: '1px dotted var(--border-dot)', paddingRight: '0.6rem', marginRight: '0.6rem' }}>[ DOCS ]</Link>
            FPS: {phase === "scanning" || phase === "recording" ? fps : 0} | 
            MOT: {motion.toFixed(1)}% | 
            STA: {phase === "idle" && "STANDBY"}
            {phase === "scanning" && "ACTIVE"}
            {phase === "recording" && "REC●"}
            {phase === "capturing" && "EXECUTING..."}
            {phase === "done" && "COMPLETE"}
          </div>
        </header>

        <aside className="hud-sidebar controls">
          <div className="panel-section">
            <h2 className="panel-title">Visual Params</h2>
            <div className="sliderGroup">
              <div className="controlLabel">Density <span>{density}</span></div>
              <input id="density" type="range" min={10} max={100} value={density}
                onChange={(e) => setDensity(Number(e.target.value))} disabled={phase === "capturing"} />
            </div>
            <div className="sliderGroup">
              <div className="controlLabel">Texture <span>{realism}</span></div>
              <input id="realism" type="range" min={10} max={100} value={realism}
                onChange={(e) => setRealism(Number(e.target.value))} disabled={phase === "capturing"} />
            </div>
            <div className="sliderGroup">
              <div className="controlLabel">Brightness <span>{brightness}%</span></div>
              <input type="range" min={0} max={200} value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))} disabled={phase === "capturing"} />
            </div>
            <div className="sliderGroup">
              <div className="controlLabel">Contrast <span>{contrast}</span></div>
              <input type="range" min={-100} max={100} value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))} disabled={phase === "capturing"} />
            </div>
            <label className="checkbox-label">
              <input type="checkbox" checked={dithering} onChange={(e) => setDithering(e.target.checked)} disabled={phase === "capturing"} />
              Bayer Dithering
            </label>
          </div>

          <div className="panel-section">
            <h2 className="panel-title">Typography & Spacing</h2>
            <div className="sliderGroup">
              <div className="controlLabel">Kerning <span>{letterSpacing.toFixed(2)}x</span></div>
              <input type="range" min={0.5} max={2.0} step={0.1} value={letterSpacing}
                onChange={(e) => setLetterSpacing(Number(e.target.value))} disabled={phase === "capturing"} />
            </div>
            <div className="sliderGroup">
              <div className="controlLabel">Leading <span>{lineHeight.toFixed(2)}x</span></div>
              <input type="range" min={0.5} max={2.0} step={0.1} value={lineHeight}
                onChange={(e) => setLineHeight(Number(e.target.value))} disabled={phase === "capturing"} />
            </div>
          </div>

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
            <select value={colorMode} onChange={(e) => setColorMode(e.target.value as "monochrome" | "rgb-snapped" | "cmyk-snapped" | "true-rgb")} className="themeSelect" disabled={phase === "capturing"}>
              <option value="monochrome">Monochrome</option>
              <option value="rgb-snapped">RGB Snapped</option>
              <option value="cmyk-snapped">CMYK Snapped</option>
              <option value="true-rgb">True RGB</option>
            </select>
          </div>

          <div className="panel-section">
            <h2 className="panel-title">Overlay Data</h2>
            <input 
              type="text" 
              placeholder="Inject Text Data..." 
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
              <div className="sliderGroup">
                <div className="controlLabel">Size <span>{textSize}</span></div>
                <input id="fontSize" type="range" min={12} max={72} value={textSize}
                  onChange={(e) => setTextSize(Number(e.target.value))} disabled={phase === "capturing"} />
              </div>
            </div>
          </div>

          <div className="actions">
            {(phase === "scanning" || phase === "recording") ? (
              <>
                <button type="button" onClick={handleCapture} className="primary" disabled={phase === "recording"}>
                  [S] Snapshot 4K
                </button>
                {phase === "scanning" ? (
                  <button type="button" onClick={startRecording} className="danger">
                    [R] Record Feed
                  </button>
                ) : (
                  <button type="button" onClick={stopRecording} className="danger active-record">
                    [Q] Stop Recording
                  </button>
                )}
                <div className="export-btns">
                  <button type="button" onClick={copyToClipboard} className="utility-btn">
                    [C] Copy
                  </button>
                  <button type="button" onClick={exportTxt} className="utility-btn">
                    [T] Export TXT
                  </button>
                </div>
              </>
            ) : (
              <button type="button" onClick={startScan}>
                [Space] Init Sensors
              </button>
            )}
            <button type="button" onClick={reset} className="danger utility-btn" disabled={phase === "capturing" || phase === "recording"}>
              Abort / Reset
            </button>
          </div>

          {error && <div className="errorText">ERR: {error}</div>}
        </aside>

        <section className={`hud-main asciiViewport ${phase === "capturing" || phase === "done" ? "dimmed" : ""}`}>
          <div ref={viewportRef} className="asciiViewport" style={{ width: '100%', height: '100%', position: 'relative' }}>
            <canvas ref={displayCanvasRef} className="asciiOutputCanvas" />
            <CustomTextOverlay
              isVisible={phase === "capturing" || phase === "done"}
              text={overlayText}
              position={textPos}
              fontSize={textSize}
            />
            
            {/* Motion Intensity Meter */}
            <div className="motion-meter" style={{
              position: 'absolute', bottom: '20px', left: '20px',
              width: '12px', height: '120px', border: '1px solid var(--accent)',
              backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 20,
              display: (phase === "scanning" || phase === "recording") ? 'flex' : 'none',
              flexDirection: 'column', justifyContent: 'flex-end',
              pointerEvents: 'none'
            }}>
              <div style={{
                width: '100%',
                height: `${Math.min(100, Math.max(0, motion))}%`,
                backgroundColor: motion > 80 ? 'red' : motion > 50 ? 'orange' : 'var(--accent)',
                transition: 'height 0.1s linear, background-color 0.2s'
              }} />
              <span style={{ position: 'absolute', top: '-18px', left: 0, fontSize: '10px', color: 'var(--accent)' }}>MOT</span>
            </div>

            {/* Crosshair Overlay */}
            <div className="crosshair-wrapper" style={{
              position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
              pointerEvents: 'none', zIndex: 15, display: (phase === "scanning" || phase === "recording") ? 'block' : 'none'
            }}>
              <div style={{ position: 'absolute', top: '-20px', left: '-1px', width: '2px', height: '10px', backgroundColor: 'var(--accent)', opacity: 0.5 }} />
              <div style={{ position: 'absolute', bottom: '-20px', left: '-1px', width: '2px', height: '10px', backgroundColor: 'var(--accent)', opacity: 0.5 }} />
              <div style={{ position: 'absolute', left: '-20px', top: '-1px', width: '10px', height: '2px', backgroundColor: 'var(--accent)', opacity: 0.5 }} />
              <div style={{ position: 'absolute', right: '-20px', top: '-1px', width: '10px', height: '2px', backgroundColor: 'var(--accent)', opacity: 0.5 }} />
              <div style={{ position: 'absolute', top: '-2px', left: '-2px', width: '4px', height: '4px', backgroundColor: 'var(--accent)', opacity: 0.8 }} />
            </div>
            
          </div>
        </section>
      </div>

      <video ref={videoRef} className="hiddenVideo" muted playsInline />
      <canvas ref={hideCanvasRef} className="hiddenCanvas" />
    </main>
  );
}
