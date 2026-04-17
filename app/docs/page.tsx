import Link from "next/link";
import { Logo } from "@/components/Logo";

export default function DocsPage() {
  return (
    <main className="terminalApp theme-raw">
      <div className="hud-wrapper" style={{ display: 'block', maxWidth: '800px', margin: '0 auto', background: 'var(--bg)', padding: '2rem', border: '1px dotted var(--border-dot)' }}>
        
        <header className="hud-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div className="brand" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Logo width={28} height={28} />
            <h1 style={{ margin: 0, letterSpacing: '0.1em', fontSize: '1.5rem', fontWeight: 'normal' }}>RAW ASCII // DOCS</h1>
          </div>
          <div className="status">
            <Link href="/" style={{ color: 'inherit', textDecoration: 'none' }}>[ RETURN TO CAM ]</Link>
          </div>
        </header>

        <article style={{ display: 'flex', flexDirection: 'column', gap: '2rem', fontSize: '0.95rem', lineHeight: '1.6', letterSpacing: '0.02em' }}>
          
          <section>
            <h2 style={{ fontSize: '1.1rem', borderBottom: '1px dotted var(--border-dot)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--accent)' }}>&gt; QUICK START // HOW TO USE</h2>
            <p style={{ marginBottom: '1rem' }}>To launch the application and capture your raw ASCII output:</p>
            <ol style={{ paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li><strong>ALLOW CAMERA:</strong> Click <strong>[ START FEED ]</strong> or press <strong>Space</strong>. Your browser will prompt you for camera access. You must "Allow" to inject video into the Canvas.</li>
              <li><strong>TWEAK IN REAL-TIME:</strong> As the feed runs, adjust the <strong>Hardware Mod</strong> sliders (Density, Brightness, Dithering) on the right panel. The settings apply instantly to the live visual engine.</li>
              <li><strong>CAPTURE MEDIA:</strong> Keep the feed running and press <strong>[S]</strong> to generate a 4K Image Snapshot, or <strong>[R]</strong> to Record a WebM clip.</li>
              <li><strong>CAPTURE RAW TEXT:</strong> Press <strong>[C]</strong> to copy the current raw ASCII frame directly to your clipboard, or <strong>[T]</strong> to download a `.txt` file containing the exact frame.</li>
            </ol>
          </section>

          <section>
            <h2 style={{ fontSize: '1.1rem', borderBottom: '1px dotted var(--border-dot)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--accent)' }}>&gt; COLOR MODES OVERVIEW</h2>
            <p style={{ marginBottom: '1rem' }}>The engine runs a custom HTML5 Canvas color mapping algorithm in real-time. Use the dropdown in the Hardware Mod panel to adjust the render output:</p>
            <ul style={{ paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li><strong>MONOCHROME:</strong> The standard mode. Renders using pure White (or the active theme accent color) calculated via strict grayscale luminance.</li>
              <li><strong>RGB SNAPPED:</strong> Quantizes every pixel forcefully into pure Red (255,0,0), pure Green (0,255,0), or pure Blue (0,0,255). Generates stark neon visuals.</li>
              <li><strong>CMYK SNAPPED:</strong> Quantizes the pixel array map into Cyan, Magenta, Yellow, or pure White. Excellent for dense glitch or bright aesthetics.</li>
              <li><strong>TRUE RGB:</strong> Evaluates the actual true color of beneath the character pixel map and applies it to the font `fillStyle`. Heavy on browser processing due to high context switching.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '1.1rem', borderBottom: '1px dotted var(--border-dot)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--accent)' }}>&gt; VISUAL PARAMETERS</h2>
            <p style={{ marginBottom: '1rem' }}>Tune the ASCII rendering engine mathematically:</p>
            <ul style={{ paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li><strong>Density:</strong> Adjusts the length of the string character array mapped to darkness (e.g. "@%#" vs ".").</li>
              <li><strong>Texture:</strong> Acts as a Gamma algorithm modifier, pushing the mid-tones heavier to dark or light.</li>
              <li><strong>Brightness/Contrast:</strong> Runs through a high-performance 256-level precomputed Lookup Table (LUT) to avoid CPU bottlenecking.</li>
              <li><strong>Bayer Dithering:</strong> Bypasses smooth text gradients and maps luminance to a 4x4 coordinate threshold matrix block. Creates a stippled pixel-art retro vibe.</li>
            </ul>
          </section>

          <section>
            <h2 style={{ fontSize: '1.1rem', borderBottom: '1px dotted var(--border-dot)', paddingBottom: '0.5rem', marginBottom: '1rem', color: 'var(--accent)' }}>&gt; EXPORT ENGINE</h2>
            <p style={{ marginBottom: '1rem' }}>Extracting data off the digital canvas:</p>
            <ul style={{ paddingLeft: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li><strong>[S] Snapshot 4K:</strong> Grabs the actual HTML DOM, scales memory coordinates 400%, and processes a pristine PNG via `html-to-image`.</li>
              <li><strong>[T] Export TXT:</strong> Hooks into the underlying core math and parses the frame directly to a pure multi-line string text file.</li>
              <li><strong>[R] Record Feed:</strong> Pipes the active Canvas stream directly into a native browser `MediaRecorder` compiling 15fps WebM chunks in-memory.</li>
            </ul>
          </section>

          <footer style={{ marginTop: '2rem', padding: '1.5rem', border: '1px dotted var(--border-dot)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ margin: '0 0 0.5rem 0', color: 'var(--accent)' }}><strong>CREATED BY</strong></p>
              <p style={{ margin: 0 }}>X (Twitter): <a href="https://x.com/erebuzzz" target="_blank" rel="noreferrer" style={{ color: 'var(--ink)' }}>x.com/erebuzzz</a></p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{ margin: '0 0 0.5rem 0', color: 'var(--accent)' }}><strong>CONTACT</strong></p>
              <p style={{ margin: 0 }}>Gmail: <a href="mailto:kshitiz23kumar@gmail.com" style={{ color: 'var(--ink)' }}>kshitiz23kumar@gmail.com</a></p>
            </div>
          </footer>

        </article>
      </div>
    </main>
  );
}
