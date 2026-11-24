// Ana oyun döngüsü: sahne, kamera, el/işaretçi girişi, hareketler (it / zıplat / eğilt),
// fizik (yerçekimi, engeller, boşluk), çekiç, kontrol noktaları ve arayüz.
import * as THREE from 'three';
import { parkurOlustur, yukseklik, zemin, BITIS_X, MIN_X, MAX_X, CUBUKLAR, KONTROL } from './parkur.js';
import { Robot, BOY, EGILME_KISALMA } from './robot.js';
import { ElTakip, BAGLANTILAR, ISARET_UCU } from './el_takip.js';
import { skorlariOku, skorEkle, skorlariTemizle, sonAdOku, sonAdYaz, tabloCiz } from './skor.js';

// ---------- DOM ----------
const $ = (id) => document.getElementById(id);
const video = $('video');
const tuval = $('sahne');
const elTuval = $('elKatmani');
const elCtx = elTuval.getContext('2d');
const durumEl = $('durum');
const sureEl = $('sure');
const ipucuEl = $('ipucu');
const bolumListe = $('bolumler');
const bolumLi = KONTROL.map((k) => {
  const li = document.createElement('li');
  li.textContent = k.ad;
  bolumListe.appendChild(li);
  return li;
});

// ---------- Ayarlar (tarayıcıda hatırlanır) ----------
const MOBIL = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) || matchMedia('(pointer: coarse)').matches;
const dikey = () => innerHeight > innerWidth;
const VARSAYILAN = () => ({ yakinlik: dikey() ? 7 : 5.4, aci: 28, kayma: 0.7, yukseklik: 0, iskelet: true, ayna: null });
let ayar = VARSAYILAN();
try { Object.assign(ayar, JSON.parse(localStorage.getItem('elleItParkur.ayar') || '{}')); } catch (_) {}
function ayarKaydet() { try { localStorage.setItem('elleItParkur.ayar', JSON.stringify(ayar)); } catch (_) {} }

// ---------- Three.js sahnesi ----------
const renderer = new THREE.WebGLRenderer({ canvas: tuval, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const sahne = new THREE.Scene();
const kamera = new THREE.PerspectiveCamera(50, 1, 0.1, 200);

sahne.add(new THREE.HemisphereLight(0xffffff, 0x8a7f70, 1.15));
const gunes = new THREE.DirectionalLight(0xffffff, 1.7);
gunes.castShadow = true;
gunes.shadow.mapSize.set(1024, 1024);
Object.assign(gunes.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7, near: 0.5, far: 30 });
sahne.add(gunes, gunes.target);

const masa = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshStandardMaterial({ color: 0xd6cbb9, roughness: 1 }));
masa.rotation.x = -Math.PI / 2; masa.receiveShadow = true;
const golgeZemin = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.ShadowMaterial({ opacity: 0.28 }));
golgeZemin.rotation.x = -Math.PI / 2; golgeZemin.position.y = 0.002; golgeZemin.receiveShadow = true;
sahne.add(masa, golgeZemin);

const { cekic } = parkurOlustur(sahne);
const robot = new Robot();
sahne.add(robot.kok);

const parmakIsaret = new THREE.Mesh(
  new THREE.SphereGeometry(0.07, 16, 12),
  new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthTest: false })
);
parmakIsaret.renderOrder = 10; parmakIsaret.visible = false;
const halka = new THREE.Mesh(
  new THREE.RingGeometry(0.1, 0.16, 32),
  new THREE.MeshBasicMaterial({ color: 0x5ff2b0, transparent: true, opacity: 0, depthTest: false, side: THREE.DoubleSide })
);
halka.renderOrder = 11;
sahne.add(parmakIsaret, halka);
let halkaOmur = 0;

// ---------- Boyut ----------
function boyutla() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false);
  kamera.aspect = w / h; kamera.updateProjectionMatrix();
  elTuval.width = Math.round(w * Math.min(devicePixelRatio, 2));
  elTuval.height = Math.round(h * Math.min(devicePixelRatio, 2));
}
addEventListener('resize', boyutla);
boyutla();

// ---------- Kamera görüntüsü ve el takibi ----------
let akis = null;
let kameraYonu = MOBIL ? 'environment' : 'user';
let otomatikAyna = !MOBIL;
let kameraModu = false;
let yukleniyor = false;
const elTakip = new ElTakip();
let elHazir = false;

function aynaMi() { return ayar.ayna === null ? otomatikAyna : ayar.ayna; }
function aynaUygula() { video.classList.toggle('ayna', aynaMi()); $('ayAyna').checked = aynaMi(); }

async function kameraAc(yon) {
  if (akis) akis.getTracks().forEach((t) => t.stop());
  akis = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: { facingMode: { ideal: yon }, width: { ideal: 1280 }, height: { ideal: 720 } },
  });
  video.srcObject = akis;
  await video.play();
  const gercek = akis.getVideoTracks()[0].getSettings().facingMode;
  otomatikAyna = gercek ? gercek === 'user' : !MOBIL;
  aynaUygula();
  video.classList.add('acik');
  masa.visible = false;
}

let geciciMesajSure = 0;
function durumYaz(metin, tur = 'yok') { durumEl.textContent = metin; durumEl.dataset.tur = tur; }
function geciciMesaj(metin, tur = 'uyari', sure = 1.8) { durumYaz(metin, tur); geciciMesajSure = sure; }

async function kamerayla() {
  yukleniyor = true;
  try { await kameraylaBasla(); } finally { yukleniyor = false; }
}
async function kameraylaBasla() {
  $('giris').hidden = true;
  durumYaz('Kamera açılıyor…');
  try {
    await kameraAc(kameraYonu);
    kameraModu = true;
  } catch (e) {
    console.warn(e);
    durumYaz('Kamera açılamadı, dokunarak oyna');
    return;
  }
  durumYaz('El modeli yükleniyor…');
  try {
    await elTakip.yukle();
    elHazir = true;
    durumYaz('El aranıyor');
  } catch (e) {
    console.warn(e);
    durumYaz('El modeli yüklenemedi, dokunarak oyna');
  }
}

// ---------- Oyuncu adı ve başlatma ----------
let oyuncuAdi = '';
const adInput = $('oyuncuAdi');
adInput.value = sonAdOku();

function adAl() {
  const ad = adInput.value.replace(/\s+/g, ' ').trim().slice(0, 20);
  if (!ad) {
    $('adHata').hidden = false;
    adInput.focus();
    return false;
  }
  $('adHata').hidden = true;
  oyuncuAdi = ad;
  sonAdYaz(ad);
  $('oyuncu').textContent = ad;
  $('oyuncu').hidden = false;
  return true;
}

function baslat(kamerali) {
  if (!adAl()) return;
  sifirla();
  if (kamerali && !kameraModu) return kamerayla();
  $('giris').hidden = true;
  if (!kameraModu) durumYaz('Kamerasız mod');
}

function girisTablosu() { tabloCiz($('girisSkor'), skorlariOku()); }

function girisEkraninaDon() {
  sifirla();
  $('giris').hidden = false;
  adInput.value = '';
  $('btnTemizle').textContent = 'Listeyi temizle';
  girisTablosu();
  adInput.focus();
}

$('btnKameraBasla').onclick = () => baslat(true);
$('btnKamerasiz').onclick = () => baslat(false);
$('adForm').addEventListener('submit', (e) => {
  e.preventDefault();
  baslat(!$('btnKameraBasla').disabled);
});
adInput.addEventListener('input', () => { if (adInput.value.trim()) $('adHata').hidden = true; });
// Kutuya tıklayınca önceki ad seçilir, sıradaki oyuncu doğrudan kendi adını yazar
adInput.addEventListener('focus', () => adInput.select());

// Listeyi temizlemek için iki kez basmak gerekir
let temizleOnay = false;
$('btnTemizle').onclick = () => {
  if (!temizleOnay) {
    temizleOnay = true;
    $('btnTemizle').textContent = 'Emin misin? Silmek için tekrar bas';
    setTimeout(() => { temizleOnay = false; $('btnTemizle').textContent = 'Listeyi temizle'; }, 4000);
    return;
  }
  temizleOnay = false;
  skorlariTemizle();
  $('btnTemizle').textContent = 'Liste temizlendi';
  girisTablosu();
};
girisTablosu();
$('btnKamera').onclick = async () => {
  if (!kameraModu) return kamerayla();
  kameraYonu = kameraYonu === 'user' ? 'environment' : 'user';
  try { await kameraAc(kameraYonu); } catch (e) { console.warn(e); }
};
if (!navigator.mediaDevices?.getUserMedia) {
  $('btnKameraBasla').disabled = true;
  $('girisNot').textContent = 'Bu tarayıcı kameraya izin vermiyor (sayfa https ile açılmalı). Kamerasız deneyebilirsin.';
}

// ---------- Ekran <-> sahne dönüşümü ----------
const isin = new THREE.Raycaster();
const parkurDuzlemi = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
const gecici = new THREE.Vector3();

function ekrandanSahneye(sx, sy) {
  const ndc = new THREE.Vector2((sx / innerWidth) * 2 - 1, -(sy / innerHeight) * 2 + 1);
  isin.setFromCamera(ndc, kamera);
  return isin.ray.intersectPlane(parkurDuzlemi, gecici) ? { x: gecici.x, y: gecici.y } : null;
}

function videodanEkrana(nx, ny) {
  const vw = video.videoWidth || 1280, vh = video.videoHeight || 720;
  const W = innerWidth, H = innerHeight;
  const s = Math.max(W / vw, H / vh);
  const dw = vw * s, dh = vh * s;
  let x = (W - dw) / 2 + nx * dw;
  const y = (H - dh) / 2 + ny * dh;
  if (aynaMi()) x = W - x;
  return { x, y };
}

// ---------- İşaretçi (fare / dokunma) ----------
let isaretci = null;
tuval.addEventListener('pointerdown', (e) => { isaretci = { x: e.clientX, y: e.clientY }; tuval.setPointerCapture(e.pointerId); });
tuval.addEventListener('pointermove', (e) => { if (isaretci) isaretci = { x: e.clientX, y: e.clientY }; });
const birak = () => { isaretci = null; onceki.delete('p'); };
tuval.addEventListener('pointerup', birak);
tuval.addEventListener('pointercancel', birak);

// ---------- Oyun durumu ----------
const HW = robot.yariGenislik;
const YERCEKIMI = 15;
const onceki = new Map();
const yumusakEl = new Map();
let baslangic = null, bitti = false, dusmeSayisi = 0, temasVardi = false;
let sonKontrol = 0;          // geçilen son kontrol noktası (KONTROL dizisinde)
let basanId = null;          // robotun başına bastıran parmak

function sifirla() {
  robot.sifirla(KONTROL[0].dogus, yukseklik(KONTROL[0].dogus));
  baslangic = null; bitti = false; dusmeSayisi = 0; sonKontrol = 0; basanId = null;
  sureEl.textContent = '0.0 sn';
  $('bitis').hidden = true;
  kameraX = null;
}
$('btnYeniden').onclick = sifirla;
$('btnTekrar').onclick = sifirla;
$('btnOyuncu').onclick = () => girisEkraninaDon();

function titret(ms) { try { navigator.vibrate?.(ms); } catch (_) {} }

// ---------- Fizik yardımcıları ----------
// Robotun x'te durduğu yerin altındaki en yüksek yüzey (biraz genişlikli)
function destek(x) { return Math.max(zemin(x - 0.1), zemin(x), zemin(x + 0.1)); }

function cubukAltinda(x) {
  return CUBUKLAR.find((c) => x + HW > c.x0 && x - HW < c.x1) || null;
}

// nx konumuna (sgn yönünde) gidilebilir mi?
function engelVar(nx, sgn) {
  const on = nx + sgn * HW;
  const tolerans = robot.havada ? 0.02 : 0.16;      // yerde küçük basamak / rampa sorun değil
  if (zemin(on) > robot.y + tolerans) return true;
  const c = cubukAltinda(nx);
  if (c && robot.y + robot.etkinBoy > c.alt) return true;
  return false;
}

// Yatay hareket, engelde durur. Engele çarptıysa true döner.
function hareketEt(dx) {
  if (!dx) return false;
  const sgn = Math.sign(dx);
  let kalan = Math.abs(dx);
  while (kalan > 1e-6) {
    const adim = Math.min(0.05, kalan);
    const nx = THREE.MathUtils.clamp(robot.x + sgn * adim, MIN_X, MAX_X);
    if (nx === robot.x) return false;
    if (engelVar(nx, sgn)) {
      // Havadayken hız korunur: duvarın yanından yükselen robot, üstüne çıkınca ileri devam eder
      if (!robot.havada) {
        if (Math.abs(robot.vx) > 1.2) { robot.carpti(); titret(15); }
        robot.vx = 0;
      }
      return true;
    }
    robot.x = nx;
    kalan -= adim;
  }
  return false;
}

function bosluktanDon() {
  dusmeSayisi++;
  const k = KONTROL[sonKontrol];
  robot.sifirla(k.dogus, yukseklik(k.dogus));
  basanId = null;
  kameraX = null;
  titret([60, 40, 60]);
  geciciMesaj(`Boşluğa düştün! ${k.ad} bayrağından devam`);
}

// ---------- Ayar paneli ----------
const kaydiricilar = { ayYakinlik: 'yakinlik', ayAci: 'aci', ayKayma: 'kayma', ayYukseklik: 'yukseklik' };
function paneliDoldur() {
  for (const [id, k] of Object.entries(kaydiricilar)) $(id).value = ayar[k];
  $('ayIskelet').checked = ayar.iskelet;
  aynaUygula();
}
for (const [id, k] of Object.entries(kaydiricilar)) {
  $(id).addEventListener('input', (e) => { ayar[k] = parseFloat(e.target.value); ayarKaydet(); });
}
$('ayIskelet').onchange = (e) => { ayar.iskelet = e.target.checked; ayarKaydet(); };
$('ayAyna').onchange = (e) => { ayar.ayna = e.target.checked; ayarKaydet(); aynaUygula(); };
$('btnAyar').onclick = () => { paneliDoldur(); $('ayarPanel').hidden = !$('ayarPanel').hidden; };
$('btnKapat').onclick = () => { $('ayarPanel').hidden = true; };
$('btnVarsayilan').onclick = () => { ayar = VARSAYILAN(); ayarKaydet(); paneliDoldur(); };
paneliDoldur();

// ---------- Kamera takibi ----------
let kameraX = null, kameraY = null;
function kamerayiGuncelle(dt) {
  const hedefX = robot.x + ayar.kayma;
  const zy = yukseklik(robot.x);
  const hedefY = (zy === null ? Math.max(robot.y, 0.6) : zy) + 0.6 + ayar.yukseklik;
  if (kameraX === null) { kameraX = hedefX; kameraY = hedefY; }
  kameraX += (hedefX - kameraX) * Math.min(1, dt * 3);
  kameraY += (hedefY - kameraY) * Math.min(1, dt * 2);
  const a = THREE.MathUtils.degToRad(ayar.aci);
  const d = ayar.yakinlik;
  kamera.position.set(kameraX, kameraY + d * Math.sin(a), d * Math.cos(a));
  kamera.lookAt(kameraX, kameraY, 0);
  gunes.position.set(kameraX + 3, 9, 5);
  gunes.target.position.set(kameraX, 0, 0);
}

// ---------- El iskeleti çizimi ----------
function iskeletCiz(eller, temasIdler) {
  const k = elTuval.width / innerWidth;
  elCtx.setTransform(k, 0, 0, k, 0, 0);
  elCtx.clearRect(0, 0, innerWidth, innerHeight);
  if (!ayar.iskelet) return;
  eller.forEach((el, i) => {
    const p = el.map((n) => videodanEkrana(n.x, n.y));
    elCtx.lineWidth = 3; elCtx.strokeStyle = 'rgba(255,255,255,0.75)';
    elCtx.beginPath();
    for (const [a, b] of BAGLANTILAR) { elCtx.moveTo(p[a].x, p[a].y); elCtx.lineTo(p[b].x, p[b].y); }
    elCtx.stroke();
    elCtx.fillStyle = 'rgba(47,139,240,0.9)';
    for (const q of p) { elCtx.beginPath(); elCtx.arc(q.x, q.y, 3.5, 0, Math.PI * 2); elCtx.fill(); }
    const uc = yumusakEl.get('h' + i) || p[ISARET_UCU];
    elCtx.fillStyle = temasIdler.has('h' + i) ? '#5ff2b0' : '#ffffff';
    elCtx.strokeStyle = '#1d2233'; elCtx.lineWidth = 2;
    elCtx.beginPath(); elCtx.arc(uc.x, uc.y, 9, 0, Math.PI * 2); elCtx.fill(); elCtx.stroke();
  });
}

// ---------- Bölüme göre ipucu ----------
function ipucuSec() {
  const x = robot.x;
  if (bitti) return '';
  if (x < 4) return 'İt: parmağını robotun sırtına değdir ve ileri doğru it.';
  if (x >= 6.5 && x < 11.4) return 'Zıplat: parmağını robotun ayaklarının altından yukarı doğru hızlıca kaldır.';
  if (x >= 15 && x < 18) return 'Eğilt: başına üstten bastır. Bastırırken parmağını ileri kaydır.';
  if (x >= 19 && x < 25) return 'Çekiç geçince koştur ya da tam zamanında üstünden zıplat.';
  return '';
}

// ---------- Ana döngü ----------
let sonZaman = performance.now();
function dongu(simdi) {
  const dt = Math.min(0.05, (simdi - sonZaman) / 1000);
  sonZaman = simdi;

  // 1) Girişleri topla: her elin işaret parmağı ucu + işaretçi
  const noktalar = [];
  const eller = (kameraModu && elHazir) ? elTakip.tespit(video) : [];
  eller.forEach((el, i) => {
    const ham = videodanEkrana(el[ISARET_UCU].x, el[ISARET_UCU].y);
    const id = 'h' + i;
    const y0 = yumusakEl.get(id);
    const ys = y0 ? { x: y0.x + (ham.x - y0.x) * 0.55, y: y0.y + (ham.y - y0.y) * 0.55 } : ham;
    yumusakEl.set(id, ys);
    const s = ekrandanSahneye(ys.x, ys.y);
    if (s) noktalar.push({ id, ...s });
  });
  for (let i = eller.length; i < 2; i++) { yumusakEl.delete('h' + i); onceki.delete('h' + i); }
  if (isaretci) {
    const s = ekrandanSahneye(isaretci.x, isaretci.y);
    if (s) noktalar.push({ id: 'p', ...s });
  }

  // 2) Hareketler
  const temasIdler = new Set();
  let ileri = -Infinity, geri = Infinity;
  let ziplat = null, bastirma = null;
  let yakinNokta = null;
  const oynanir = robot.ayakta && !bitti;
  const tepe = robot.y + robot.etkinBoy;

  if (basanId && !noktalar.some((n) => n.id === basanId)) basanId = null;

  for (const n of noktalar) {
    const o = onceki.get(n.id);
    const dxR = n.x - robot.x;

    // a) Başına bastırma (eğilme) — başlar ya da sürer
    if (oynanir && !robot.havada && o) {
      const basliyor = !basanId && Math.abs(dxR) < 0.32 && o.y >= tepe - 0.04 && n.y < tepe - 0.02 && n.y > robot.y + 0.3;
      const suruyor = basanId === n.id && Math.abs(dxR) < 0.45 && n.y < robot.y + BOY + 0.08 && n.y > robot.y + 0.25;
      if (basliyor || suruyor) {
        basanId = n.id;
        bastirma = { n, o };
        temasIdler.add(n.id);
        onceki.set(n.id, { x: n.x, y: n.y });
        continue;
      }
      if (basanId === n.id) basanId = null;
    }

    // b) Alttan yukarı itme (zıplama)
    if (oynanir && !robot.havada && o && Math.abs(dxR) < 0.35 && o.y <= robot.y + 0.1 && n.y > robot.y + 0.1) {
      const vyParmak = (n.y - o.y) / Math.max(dt, 1e-3);
      if (vyParmak > 2.0) {
        ziplat = { vyParmak, vxParmak: (n.x - o.x) / Math.max(dt, 1e-3) };
        temasIdler.add(n.id);
      }
    }

    // c) Arkadan / önden itme
    const arka = robot.x - HW, on = robot.x + HW;
    const boyda = n.y > robot.y + 0.12 && n.y < tepe + 0.05;
    if (!robot.havada || robot.ayakta) {
      if (oynanir && boyda && o) {
        if (o.x <= arka + 0.06 && n.x > arka && n.x + HW - robot.x < 0.9) {
          ileri = Math.max(ileri, n.x + HW); temasIdler.add(n.id);
        } else if (o.x >= on - 0.06 && n.x < on && robot.x - (n.x - HW) < 0.9) {
          geri = Math.min(geri, n.x - HW); temasIdler.add(n.id);
        }
      }
    }
    if (boyda && (Math.abs(n.x - arka) < 0.1 || Math.abs(n.x - on) < 0.1)) temasIdler.add(n.id);

    onceki.set(n.id, { x: n.x, y: n.y });
    if (Math.abs(dxR) < 4 && (!yakinNokta || Math.abs(dxR) < Math.abs(yakinNokta.x - robot.x))) yakinNokta = n;
  }
  for (const id of [...onceki.keys()]) if (!noktalar.some((n) => n.id === id)) onceki.delete(id);

  let itildi = false, eylem = '';
  const xOnce = robot.x;

  // Eğilme: parmak ne kadar aşağı bastırırsa o kadar çömelir; bastırırken kaydırmak robotu yürütür
  if (bastirma) {
    const { n, o } = bastirma;
    robot.egilmeHedef = THREE.MathUtils.clamp((robot.y + BOY - n.y) / EGILME_KISALMA, 0, 1);
    hareketEt(n.x - o.x);
    robot.vx = robot.vx * 0.5 + ((robot.x - xOnce) / Math.max(dt, 1e-3)) * 0.5;
    itildi = robot.x !== xOnce;
    eylem = 'Eğiliyor';
  } else {
    // Bırakınca kalkar; çubuğun altındaysa kalkamaz
    const c = cubukAltinda(robot.x);
    robot.egilmeHedef = c && robot.y + BOY > c.alt ? 1 : 0;
  }

  // Zıplama
  if (ziplat && robot.ayakta && !robot.havada) {
    const vy = THREE.MathUtils.clamp(4.6 + ziplat.vyParmak * 0.12, 4.6, 6.8);
    let vx = robot.vx + ziplat.vxParmak * 0.3;
    vx = vx >= -0.5 ? Math.max(vx, 2.4) : Math.max(vx, -3);
    vx = Math.min(vx, 4);
    if (robot.zipla(vy, vx)) { titret(25); halkaOmur = 0.35; eylem = 'Zıpladı!'; }
    if (baslangic === null) baslangic = simdi;
  }

  // İtme
  if (!bastirma && (ileri > -Infinity) !== (geri < Infinity)) {
    const hedef = ileri > -Infinity ? ileri : geri;
    hareketEt(hedef - robot.x);
    const v = (robot.x - xOnce) / Math.max(dt, 1e-3);
    robot.vx = robot.havada ? robot.vx * 0.7 + v * 0.3 : robot.vx * 0.5 + v * 0.5;
    itildi = true; eylem = eylem || 'İtiyorsun!';
    if (baslangic === null) baslangic = simdi;
  } else if (!bastirma) {
    // Serbest hareket: yerde sürtünme, havada hafif hava direnci
    const surtunme = robot.havada ? 0.3 : (robot.ayakta ? 6 : 2.5);
    robot.vx *= Math.exp(-surtunme * dt);
    if (!robot.havada && Math.abs(robot.vx) < 0.02) robot.vx = 0;
    hareketEt(robot.vx * dt);
  }

  // 3) Dikey fizik: yerçekimi, iniş, kenardan düşme, çubuğa kafa çarpma
  if (robot.havada) {
    robot.vy -= YERCEKIMI * dt;
    robot.y += robot.vy * dt;
    const c = cubukAltinda(robot.x);
    if (c && robot.vy > 0 && robot.y + robot.etkinBoy > c.alt && robot.y < c.alt) {
      robot.vy = 0; robot.carpti();
    }
    const d = destek(robot.x);
    if (robot.vy <= 0 && robot.y <= d) {
      const hiz = robot.vy;
      robot.y = d;
      robot.indi(hiz);
      robot.vx *= 0.25;      // iniş: kayıp boşluğa düşmesin
    }
  } else {
    const d = destek(robot.x);
    if (d < robot.y - 0.2) { robot.havada = true; robot.vy = 0; }
    else robot.y = d;
  }
  if (robot.y < 0.15) bosluktanDon();

  // Kontrol noktası
  if (!robot.havada) {
    for (let i = KONTROL.length - 1; i > sonKontrol; i--) {
      if (robot.x >= KONTROL[i].x) { sonKontrol = i; break; }
    }
  }

  const temasVar = temasIdler.size > 0;
  if (temasVar && !temasVardi) { titret(20); halkaOmur = 0.35; }
  temasVardi = temasVar;

  // 4) Çekiç
  cekic.guncelle(dt);
  if (robot.ayakta && !bitti) {
    const yon = cekic.carpma(robot.x, robot.y);
    if (yon) { robot.dus(yon); dusmeSayisi++; titret([40, 30, 60]); }
  }

  // 5) Bitiş
  if (!bitti && robot.ayakta && !robot.havada && robot.x >= BITIS_X) {
    bitti = true;
    robot.kutla();
    const sn = baslangic === null ? 0 : (simdi - baslangic) / 1000;
    const { liste, kayit, sira } = skorEkle(oyuncuAdi || 'İsimsiz', sn, dusmeSayisi);
    $('bitisMetin').textContent = `${kayit.ad}, süren ${kayit.sure.toFixed(1)} saniye.`;
    const dusmeMetni = dusmeSayisi ? ` ${dusmeSayisi} kez düştün.` : ' Hiç düşmedin!';
    $('bitisSira').textContent =
      (sira === 1 && liste.length > 1 ? 'Yeni rekor! Listenin birincisisin.' :
       sira ? `Sıralamada ${sira}. oldun.` : 'Bu süre listeye giremedi.') + dusmeMetni;
    tabloCiz($('bitisSkor'), liste, kayit.id, sira);
    setTimeout(() => { if (bitti) $('bitis').hidden = false; }, 1400);
  }

  robot.guncelle(dt);
  kamerayiGuncelle(dt);

  // 6) Görsel geri bildirim ve arayüz
  if (yakinNokta) {
    parmakIsaret.visible = true;
    parmakIsaret.position.set(yakinNokta.x, yakinNokta.y, 0);
    parmakIsaret.material.color.set(temasIdler.has(yakinNokta.id) ? 0x5ff2b0 : 0xffffff);
    if (halkaOmur > 0) halka.position.copy(parmakIsaret.position);
  } else parmakIsaret.visible = false;
  halkaOmur = Math.max(0, halkaOmur - dt);
  halka.material.opacity = halkaOmur / 0.35;
  halka.scale.setScalar(1 + (0.35 - halkaOmur) * 6);
  halka.quaternion.copy(kamera.quaternion);

  if (!bitti && baslangic !== null) sureEl.textContent = ((simdi - baslangic) / 1000).toFixed(1) + ' sn';
  let aktif = 0;
  KONTROL.forEach((k, i) => { if (robot.x >= k.x) aktif = i; });
  bolumLi.forEach((li, i) => { li.classList.toggle('gecildi', i < aktif); li.classList.toggle('simdi', i === aktif); });

  const ipucu = ipucuSec();
  if (ipucuEl.textContent !== ipucu) ipucuEl.textContent = ipucu;
  ipucuEl.hidden = !ipucu || !$('giris').hidden;

  geciciMesajSure = Math.max(0, geciciMesajSure - dt);
  if (geciciMesajSure <= 0) {
    if (eylem) durumYaz(eylem, 'itiyor');
    else if (kameraModu && elHazir) durumYaz(eller.length === 2 ? 'İki el görüldü' : eller.length ? 'El görüldü' : 'El aranıyor', eller.length ? 'var' : 'yok');
    else if (!kameraModu && !yukleniyor && $("giris").hidden) durumYaz("Kamerasız mod");
  }
  if (kameraModu && elHazir) iskeletCiz(eller, temasIdler);

  renderer.render(sahne, kamera);
  requestAnimationFrame(dongu);
}

sifirla();
requestAnimationFrame(dongu);

// Test ve hata ayıklama için
window.oyun = { robot, cekic, kamera, ayar, sifirla, skorlariOku };
