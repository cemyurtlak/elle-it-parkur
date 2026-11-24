// El takibi: MediaPipe Tasks Vision (HandLandmarker) tarayıcıda, telefonda ve bilgisayarda çalışır.
// Model dosyası önce yerel "modeller/" klasöründe aranır, yoksa Google sunucusundan indirilir.
const SURUM = '0.10.14';
const KUTUPHANE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${SURUM}/vision_bundle.mjs`;
const WASM = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${SURUM}/wasm`;
const MODEL_YEREL = 'modeller/hand_landmarker.task';
const MODEL_UZAK = 'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task';

// MediaPipe el noktaları: 0 bilek, 4 başparmak ucu, 8 işaret parmağı ucu ...
export const BAGLANTILAR = [
  [0, 1], [1, 2], [2, 3], [3, 4],
  [0, 5], [5, 6], [6, 7], [7, 8],
  [5, 9], [9, 10], [10, 11], [11, 12],
  [9, 13], [13, 14], [14, 15], [15, 16],
  [13, 17], [17, 18], [18, 19], [19, 20], [0, 17],
];
export const ISARET_UCU = 8;

async function modelYolu() {
  try {
    const r = await fetch(MODEL_YEREL, { method: 'HEAD' });
    if (r.ok) return MODEL_YEREL;
  } catch (_) { /* yerel dosya yok */ }
  return MODEL_UZAK;
}

export class ElTakip {
  constructor() {
    this.tespitci = null;
    this.sonZaman = -1;
    this.eller = [];
  }

  async yukle() {
    const { FilesetResolver, HandLandmarker } = await import(KUTUPHANE);
    const dosyalar = await FilesetResolver.forVisionTasks(WASM);
    const yol = await modelYolu();
    const secenek = (delegate) => ({
      baseOptions: { modelAssetPath: yol, delegate },
      runningMode: 'VIDEO',
      numHands: 2,
      minHandDetectionConfidence: 0.5,
      minHandPresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
    });
    try {
      this.tespitci = await HandLandmarker.createFromOptions(dosyalar, secenek('GPU'));
    } catch (e) {
      console.warn('GPU açılamadı, CPU kullanılıyor', e);
      this.tespitci = await HandLandmarker.createFromOptions(dosyalar, secenek('CPU'));
    }
  }

  // Her karede çağrılır; video yeni kare verdiyse elleri günceller.
  tespit(video) {
    if (!this.tespitci || video.readyState < 2) return this.eller;
    const t = video.currentTime;
    if (t === this.sonZaman) return this.eller;
    this.sonZaman = t;
    const sonuc = this.tespitci.detectForVideo(video, performance.now());
    this.eller = sonuc.landmarks || [];
    return this.eller;
  }
}
