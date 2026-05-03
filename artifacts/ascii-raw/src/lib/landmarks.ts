import {
  FaceLandmarker,
  FilesetResolver,
  type FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";

export type NormalizedLandmark = { x: number; y: number; z: number };

export type LandmarkFrame = {
  points: NormalizedLandmark[];
  count: number;
};

let faceLandmarkerInstance: FaceLandmarker | null = null;
let initPromise: Promise<FaceLandmarker> | null = null;

export async function getFaceLandmarker(): Promise<FaceLandmarker> {
  if (faceLandmarkerInstance) return faceLandmarkerInstance;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const vision = await FilesetResolver.forVisionTasks(
      "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.22/wasm"
    );
    faceLandmarkerInstance = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        delegate: "GPU",
      },
      outputFaceBlendshapes: false,
      runningMode: "VIDEO",
      numFaces: 1,
    });
    return faceLandmarkerInstance;
  })();

  return initPromise;
}

export function disposeFaceLandmarker() {
  faceLandmarkerInstance?.close();
  faceLandmarkerInstance = null;
  initPromise = null;
}

let lastVideoTime = -1;

export function detectLandmarks(
  landmarker: FaceLandmarker,
  video: HTMLVideoElement
): LandmarkFrame {
  if (video.readyState < 2) return { points: [], count: 0 };

  const now = performance.now();
  let result: FaceLandmarkerResult;

  if (video.currentTime !== lastVideoTime) {
    result = landmarker.detectForVideo(video, now);
    lastVideoTime = video.currentTime;
  } else {
    return { points: [], count: 0 };
  }

  const pts = result.faceLandmarks?.[0] ?? [];
  return { points: pts as NormalizedLandmark[], count: pts.length };
}

export function buildSaliencyMap(
  landmarks: NormalizedLandmark[],
  width: number,
  height: number,
  radius = 4
): Float32Array {
  const map = new Float32Array(width * height).fill(0);
  for (const pt of landmarks) {
    const cx = Math.round(pt.x * width);
    const cy = Math.round(pt.y * height);
    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const nx = cx + dx;
        const ny = cy + dy;
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const dist = Math.sqrt(dx * dx + dy * dy) / radius;
        const w = Math.max(0, 1 - dist);
        const i = ny * width + nx;
        map[i] = Math.min(1, map[i] + w);
      }
    }
  }
  return map;
}

export function drawLandmarkOverlay(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  canvasW: number,
  canvasH: number,
  color: string
) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.7;

  for (const pt of landmarks) {
    const x = pt.x * canvasW;
    const y = pt.y * canvasH;
    ctx.beginPath();
    ctx.arc(x, y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalAlpha = 1;
  ctx.restore();
}

export const FACE_CONTOUR_INDICES = [
  10, 338, 297, 332, 284, 251, 389, 356, 454, 323, 361, 288,
  397, 365, 379, 378, 400, 377, 152, 148, 176, 149, 150, 136,
  172, 58, 132, 93, 234, 127, 162, 21, 54, 103, 67, 109,
];
