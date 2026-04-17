const fs = require('fs');
const css = `:root {
  --bg: #020503;
  --bg-soft: #050a06;
  --ink: #a3e6b5;
  --muted: #4e8060;
  --accent: #11ff55;
  --glow: rgba(17, 255, 85, 0.4);
  --border-hud: rgba(17, 255, 85, 0.2);
}

.theme-green {
  --bg: #020503;
  --bg-soft: #050a06;
  --ink: #a3e6b5;
  --muted: #4e8060;
  --accent: #11ff55;
  --glow: rgba(17, 255, 85, 0.4);
  --border-hud: rgba(17, 255, 85, 0.2);
}

.theme-amber {
  --bg: #080500;
  --bg-soft: #120a00;
  --ink: #ffd4a3;
  --muted: #b38042;
  --accent: #ffa311;
  --glow: rgba(255, 163, 17, 0.4);
  --border-hud: rgba(255, 163, 17, 0.2);
}

.theme-blue {
  --bg: #000308;
  --bg-soft: #000a14;
  --ink: #a3d9ff;
  --muted: #427eb3;
  --accent: #11a3ff;
  --glow: rgba(17, 163, 255, 0.4);
  --border-hud: rgba(17, 163, 255, 0.2);
}

.theme-white {
  --bg: #050505;
  --bg-soft: #0a0a0a;
  --ink: #e0e0e0;
  --muted: #666666;
  --accent: #ffffff;
  --glow: rgba(255, 255, 255, 0.4);
  --border-hud: rgba(255, 255, 255, 0.2);
}

* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  padding: 0;
  min-height: 100svh;
  font-family: var(--font-fira-code), "IBM Plex Mono", "Consolas", monospace;
  background-color: var(--bg);
  background-image: 
    radial-gradient(ellipse at center, var(--bg-soft) 0%, var(--bg) 100%),
    repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px);
  color: var(--ink);
  overflow-x: hidden;
}

/* CRT Flicker & Glitch */
@keyframes flicker {
  0% { opacity: 0.95; }
  5% { opacity: 0.85; }
  10% { opacity: 0.95; }
  15% { opacity: 1; }
  100% { opacity: 1; }
}

@keyframes glitch {
  0% { transform: translate(0) }
  20% { transform: translate(-2px, 1px) }
  40% { transform: translate(-1px, -1px) }
  60% { transform: translate(2px, 1px) }
  80% { transform: translate(1px, -1px) }
  100% { transform: translate(0) }
}

.terminalApp {
  min-height: 100svh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: clamp(1rem, 4vw, 3rem);
  animation: flicker 4s infinite step-end;
}

.hud-wrapper {
  width: min(1400px, 100%);
  display: grid;
  grid-template-columns: 280px 1fr;
  grid-template-rows: auto 1fr;
  gap: 1.5rem;
  position: relative;
  z-index: 2;
}

@media (max-width: 900px) {
  .hud-wrapper {
    grid-template-columns: 1fr;
  }
}

.hud-header {
  grid-column: 1 / -1;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  border-bottom: 2px solid var(--accent);
  padding-bottom: 0.8rem;
  box-shadow: 0 4px 15px -4px var(--border-hud);
}

.brand {
  margin: 0;
  letter-spacing: 0.3em;
  color: var(--accent);
  font-size: clamp(1.2rem, 2vw, 1.8rem);
  text-transform: uppercase;
  font-weight: 700;
  text-shadow: 0 0 8px var(--glow);
  animation: glitch 10s infinite;
}

.status {
  margin: 0;
  color: var(--ink);
  font-size: 0.9rem;
  text-transform: uppercase;
  padding: 0.2rem 0.8rem;
  background: var(--border-hud);
  border: 1px solid var(--accent);
}

/* Sidebar Dashboard */
.hud-sidebar {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  border: 1px solid var(--border-hud);
  background: rgba(0, 0, 0, 0.4);
  padding: 1.2rem;
  box-shadow: inset 0 0 20px var(--border-hud);
  position: relative;
}

.hud-sidebar::before, .hud-sidebar::after {
  content: '';
  position: absolute;
  width: 10px;
  height: 10px;
  border: 2px solid var(--accent);
}
.hud-sidebar::before { top: -1px; left: -1px; border-right: none; border-bottom: none; }
.hud-sidebar::after { bottom: -1px; right: -1px; border-left: none; border-top: none; }

/* Control Components */
.panel-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.panel-title {
  font-size: 0.7rem;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.2em;
  border-bottom: 1px dashed var(--muted);
  padding-bottom: 0.3rem;
  margin-bottom: 0;
}

.sliderGroup {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.controlLabel {
  display: flex;
  justify-content: space-between;
  color: var(--ink);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.controlLabel span {
  color: var(--accent);
}

/* Sliders */
input[type=range] {
  appearance: none;
  background: transparent;
  width: 100%;
}
input[type=range]::-webkit-slider-runnable-track {
  width: 100%;
  height: 4px;
  cursor: pointer;
  background: var(--border-hud);
  border-radius: 2px;
}
input[type=range]::-webkit-slider-thumb {
  height: 14px;
  width: 8px;
  border-radius: 0;
  background: var(--accent);
  cursor: pointer;
  appearance: none;
  margin-top: -5px;
  box-shadow: 0 0 5px var(--glow);
}

/* Checkboxes */
.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--ink);
  cursor: pointer;
  text-transform: uppercase;
}
.checkbox-label input {
  appearance: none;
  width: 14px;
  height: 14px;
  border: 1px solid var(--accent);
  background: transparent;
  position: relative;
  cursor: pointer;
}
.checkbox-label input:checked::before {
  content: '';
  position: absolute;
  inset: 2px;
  background: var(--accent);
  box-shadow: 0 0 4px var(--glow);
}

/* Inputs & Selects */
.textInput, .themeSelect, .positionSelect {
  background: rgba(0,0,0,0.6);
  border: 1px solid var(--border-hud);
  color: var(--accent);
  padding: 0.6rem;
  font-family: inherit;
  font-size: 0.85rem;
  width: 100%;
  transition: all 0.2s;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}
.textInput:focus, .themeSelect:focus, .positionSelect:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 8px var(--glow);
}
.textInput::placeholder { color: var(--muted); }

/* Buttons */
.actions {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  margin-top: auto;
  padding-top: 1rem;
}

button {
  font-family: inherit;
  padding: 0.8rem;
  border: 1px solid var(--accent);
  background: transparent;
  color: var(--accent);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.15em;
  cursor: pointer;
  transition: all 0.2s ease;
  position: relative;
  overflow: hidden;
}

button::before {
  content: '';
  position: absolute;
  top: 0; left: -100%;
  width: 100%; height: 100%;
  background: linear-gradient(90deg, transparent, var(--glow), transparent);
  transition: 0.4s;
}

button:hover::before {
  left: 100%;
}

button:hover {
  background: var(--accent);
  color: var(--bg);
  box-shadow: 0 0 15px var(--glow);
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

button.primary {
  background: rgba(17, 255, 85, 0.1);
}

button.danger {
  border-color: #ff3333;
  color: #ff3333;
}

/* Viewport Main */
.hud-main {
  position: relative;
  border: 1px solid var(--border-hud);
  background: #000;
  display: grid;
  place-items: center;
  min-height: 60svh;
  box-shadow: 0 0 30px rgba(0,0,0,0.8), inset 0 0 40px var(--border-hud);
}

.asciiViewport {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  display: grid;
  place-items: center;
}

.asciiViewport::after {
  content: "";
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: radial-gradient(circle at center, transparent 40%, rgba(0, 0, 0, 0.6) 100%);
  z-index: 10;
}

.asciiViewport.dimmed .asciiOutputCanvas {
  opacity: 0.2;
  transform: scale(0.995);
}

.asciiOutputCanvas {
  width: 100%;
  height: 100%;
  object-fit: contain;
  filter: contrast(1.1) brightness(1.1);
  transition: opacity 320ms ease, transform 320ms ease;
}

/* Scanning effect */
.scanlineLayer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(to bottom, transparent, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.2));
  background-size: 100% 4px;
  z-index: 20;
}

/* Target Reticle */
.reticle {
  position: absolute;
  width: 60%;
  height: 60%;
  border: 1px solid var(--border-hud);
  pointer-events: none;
  z-index: 5;
  opacity: 0.6;
}
.reticle::before, .reticle::after {
  content: '';
  position: absolute;
  width: 20px; height: 20px;
}
.reticle::before { top: -1px; left: -1px; border-top: 2px solid var(--accent); border-left: 2px solid var(--accent); }
.reticle::after { bottom: -1px; right: -1px; border-bottom: 2px solid var(--accent); border-right: 2px solid var(--accent); }

.errorText {
  color: #ff3333;
  margin: 0;
  padding: 0.5rem;
  border: 1px solid #ff3333;
  background: rgba(255, 51, 51, 0.1);
  text-transform: uppercase;
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  text-align: center;
}

.hiddenVideo, .hiddenCanvas {
  display: none !important;
}
`;
fs.writeFileSync('app/globals.css', css);
