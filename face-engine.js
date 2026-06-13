/*
 * face-engine.js — Clean Face Recognition v6
 *
 * ONLY uses 3 models that ALWAYS load from CDN:
 *   1. tinyFaceDetector
 *   2. faceLandmark68TinyNet   ← tiny version, always works
 *   3. faceRecognitionNet
 *
 * .withFaceLandmarks(true) = use tiny net  ← THIS IS CRITICAL
 */

const CDN = "https://cdn.jsdelivr.net/npm/@vladmandic/face-api@1.7.13/model";

let _loaded  = false;
let _matcher = null;
let _cache   = [];        // [{rollNumber, name, descriptor, photo}]
let _liveId  = null;
let _busy    = false;

/* ─── LOAD MODELS ─────────────────────────────── */
export async function loadModels(onStep) {
  if (_loaded) return;

  const step = t => { console.log("[FE]", t); if (onStep) onStep(t); };

  step("Loading face detector...");
  await faceapi.nets.tinyFaceDetector.loadFromUri(CDN);

  step("Loading face landmarks...");
  await faceapi.nets.faceLandmark68TinyNet.loadFromUri(CDN);   // ← TINY not full

  step("Loading face recognition...");
  await faceapi.nets.faceRecognitionNet.loadFromUri(CDN);

  _loaded = true;
  step("✅ AI models ready");
}

export const modelsReady = () => _loaded;
export const hasMatcher  = () => _matcher !== null;

/* ─── BUILD MATCHER ───────────────────────────── */
export function buildMatcher(descriptors) {
  _cache = (descriptors || []).filter(d =>
    d && d.descriptor &&
    Array.isArray(d.descriptor) &&
    d.descriptor.length === 128
  );

  if (!_cache.length) {
    _matcher = null;
    console.warn("[FE] No descriptors — matcher not built");
    return;
  }

  const labeled = _cache.map(d =>
    new faceapi.LabeledFaceDescriptors(
      d.rollNumber,
      [new Float32Array(d.descriptor)]
    )
  );

  _matcher = new faceapi.FaceMatcher(labeled, 0.5);
  console.log("[FE] Matcher built:", _cache.length, "students");
  _cache.forEach(d => console.log("  ·", d.rollNumber, d.name));
}

/* ─── DETECTOR OPTIONS ────────────────────────── */
const D = size => new faceapi.TinyFaceDetectorOptions({
  inputSize: size || 416,
  scoreThreshold: 0.4,
});

/* ─── GET ONE FACE WITH DESCRIPTOR ───────────── */
async function getFace(video, size) {
  // withFaceLandmarks(true) = USE TINY NET — this is required!
  return faceapi
    .detectSingleFace(video, D(size))
    .withFaceLandmarks(true)
    .withFaceDescriptor();
}

/* ─── CAPTURE DESCRIPTOR (for registration) ──── */
export async function captureDescriptor(video) {
  if (!_loaded) throw new Error("Models not loaded");

  // Try once at best quality
  const det = await getFace(video, 416);
  if (!det) return null;
  return det.descriptor;
}

/* ─── DETECT & RECOGNISE (for scan page) ─────── */
export async function detectAndRecognise(video) {
  if (!_loaded) throw new Error("Models not loaded");
  if (video.readyState < 2 || video.videoWidth === 0) return { found: false };

  let det = null;
  for (const sz of [416, 320, 512]) {
    try { det = await getFace(video, sz); if (det) break; } catch(e) {}
  }

  if (!det) return { found: false };
  if (!_matcher) return { found: true, isRecognised: false };

  // Find closest match
  let best = Infinity, person = null;
  for (const p of _cache) {
    const d = faceapi.euclideanDistance(det.descriptor, new Float32Array(p.descriptor));
    if (d < best) { best = d; person = p; }
  }

  const ok = best < 0.5;
  console.log("[FE] match:", person?.rollNumber, "dist:", best.toFixed(3), "ok:", ok);

  return {
    found: true,
    isRecognised: ok,
    studentData: ok ? person : null,
    confidence: parseFloat((1 - best).toFixed(3)),
    distance: best,
  };
}

/* ─── LIVE PREVIEW (draws boxes) ─────────────── */
export function startLive(video, canvas, onCount) {
  stopLive();
  _liveId = setInterval(async () => {
    if (_busy || !video.srcObject || video.readyState < 2 || video.videoWidth === 0) return;
    _busy = true;
    try {
      const dets = await faceapi.detectAllFaces(video, D(320));
      const dims = { width: video.videoWidth, height: video.videoHeight };
      faceapi.matchDimensions(canvas, dims);
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      faceapi.resizeResults(dets, dims).forEach(d => {
        const { x, y, width, height } = d.box, s = d.score;
        const c = s > 0.75 ? "#3fb950" : s > 0.5 ? "#58a6ff" : "#e3b341";
        ctx.strokeStyle = c; ctx.lineWidth = 2.5;
        ctx.shadowColor = c; ctx.shadowBlur = 8;
        ctx.strokeRect(x, y, width, height); ctx.shadowBlur = 0;
        const lbl = (s * 100).toFixed(0) + "%";
        const lw  = ctx.measureText(lbl).width + 12;
        ctx.fillStyle = c; ctx.fillRect(x - 1, y - 22, lw, 20);
        ctx.fillStyle = "#000"; ctx.font = "bold 11px monospace";
        ctx.fillText(lbl, x + 5, y - 7);
      });
      if (onCount) onCount(dets.length);
    } catch(e) {}
    _busy = false;
  }, 300);
}

export function stopLive() {
  if (_liveId) { clearInterval(_liveId); _liveId = null; }
  _busy = false;
}

export function snapshot(video) {
  const c = document.createElement("canvas");
  c.width  = video.videoWidth  || 640;
  c.height = video.videoHeight || 480;
  c.getContext("2d").drawImage(video, 0, 0);
  return c.toDataURL("image/jpeg", 0.9);
}