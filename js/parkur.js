// Parkur: X ekseni boyunca uzanan bölümler, zemin/engel sorguları, dönen çekiç ve süsler.
// Robot sadece X ekseninde (z = 0 çizgisi) ilerler. Boşluğa düşerse son kontrol noktasından başlar.
import * as THREE from 'three';

export const BITIS_X = 28;      // robot bu X'e gelince oyun biter
export const MIN_X = 0.6;
export const MAX_X = 29.4;

// Bölümler: x0..x1 aralığında yükseklik y0'dan y1'e doğrusal değişir. Aradaki boşluklar = çukur.
export const BOLUMLER = [
  { ad: 'START', x0: 0,    x1: 4,    y0: 0.4, y1: 0.4, gen: 2.4, renk: 0x2f8bf0 },
  { ad: 'RAMPA', x0: 4,    x1: 7,    y0: 0.4, y1: 1.0, gen: 2.4, renk: 0xd9cf86 },
  { ad: 'ZIPLA', x0: 7,    x1: 10.4, y0: 1.0, y1: 1.0, gen: 2.4, renk: 0xd9cf86 },
  // 10.4 – 11.4 arası BOŞLUK
  { ad: 'KOPRU', x0: 11.4, x1: 15,   y0: 1.0, y1: 1.0, gen: 0.8, renk: 0x8a5a7a, ince: true },
  { ad: 'EGIL',  x0: 15,   x1: 19,   y0: 1.0, y1: 1.0, gen: 2.4, renk: 0xe58a3a },
  { ad: 'CEKIC', x0: 19,   x1: 25,   y0: 1.0, y1: 1.0, gen: 2.6, renk: 0xc8305e },
  { ad: 'HOME',  x0: 25,   x1: 30,   y0: 1.0, y1: 1.0, gen: 2.6, renk: 0x1f9d6b },
];

// Üstüne çıkılabilen / önünü kesen bloklar (zıplanarak aşılır)
export const DUVARLAR = [
  { x0: 8.7, x1: 9.25, ust: 1.45 },
];
// Altından eğilerek geçilen çubuklar (alt: çubuğun alt yüzünün yüksekliği)
export const CUBUKLAR = [
  { x0: 16.75, x1: 17.25, alt: 1.85 },
];

// Kontrol noktaları: arayüzdeki bölüm adları ve düşünce yeniden başlanan yerler
export const KONTROL = [
  { ad: 'START',    x: 0,  dogus: 1.4 },
  { ad: '1 · ZIPLA', x: 7,  dogus: 7.6 },
  { ad: '2 · EĞİL',  x: 15, dogus: 15.6 },
  { ad: '3 · ÇEKİÇ', x: 19, dogus: 19.6 },
  { ad: 'HOME',     x: 25, dogus: 25.6 },
];

// Platform yüzeyinin yüksekliği; boşlukta veya parkur dışında null
export function yukseklik(x) {
  for (const b of BOLUMLER) {
    if (x >= b.x0 && x <= b.x1) {
      const t = (x - b.x0) / (b.x1 - b.x0);
      return b.y0 + (b.y1 - b.y0) * t;
    }
  }
  return null;
}

// Duvarlar dahil, x noktasında basılabilecek en yüksek yüzey (yoksa -Infinity)
export function zemin(x) {
  let y = yukseklik(x);
  y = y === null ? -Infinity : y;
  for (const d of DUVARLAR) if (x >= d.x0 && x <= d.x1) y = Math.max(y, d.ust);
  return y;
}

function koyu(renk, k = 0.72) {
  return new THREE.Color(renk).multiplyScalar(k);
}

function yaziDokusu(metin, { genislik = 512, yukseklik = 128, renk = '#fff', zemin = null, punto = 84 } = {}) {
  const cv = document.createElement('canvas');
  cv.width = genislik; cv.height = yukseklik;
  const ctx = cv.getContext('2d');
  if (zemin) {
    ctx.fillStyle = zemin;
    ctx.beginPath();
    ctx.roundRect(4, 4, genislik - 8, yukseklik - 8, 24);
    ctx.fill();
  }
  ctx.fillStyle = renk;
  ctx.font = `800 ${punto}px "Baloo 2", "Trebuchet MS", sans-serif`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(metin, genislik / 2, yukseklik / 2 + 6);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

// Okul logosu (logo.png). Dosya yoksa logo parçaları görünmez, oyun çalışmaya devam eder.
let logoDoku = null;
function logo() {
  if (!logoDoku) {
    logoDoku = new THREE.TextureLoader().load('logo.png', undefined, undefined, () => { logoDoku.image = null; });
    logoDoku.colorSpace = THREE.SRGBColorSpace;
    logoDoku.anisotropy = 4;
  }
  return logoDoku;
}
function logoPlakasi(cap) {
  const m = new THREE.Mesh(
    new THREE.CircleGeometry(cap / 2, 48),
    new THREE.MeshBasicMaterial({ map: logo(), transparent: true, side: THREE.DoubleSide })
  );
  return m;
}

function zeminYazisi(metin, x, y) {
  const mat = new THREE.MeshBasicMaterial({ map: yaziDokusu(metin), transparent: true, depthWrite: false });
  const m = new THREE.Mesh(new THREE.PlaneGeometry(2.0, 0.5), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y + 0.006, 0.75);
  return m;
}

function okIsareti(x, y) {
  const s = new THREE.Shape();
  s.moveTo(0.16, 0); s.lineTo(-0.1, 0.11); s.lineTo(-0.1, -0.11); s.closePath();
  const m = new THREE.Mesh(
    new THREE.ShapeGeometry(s),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.85, depthWrite: false })
  );
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y + 0.005, 0);
  return m;
}

function bayrak(x, y, z, etiket, renk) {
  const g = new THREE.Group();
  const direk = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.9, 10), new THREE.MeshStandardMaterial({ color: 0x6f8fd8 }));
  direk.position.y = 0.45; direk.castShadow = true;
  const taban = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.05, 0.16), new THREE.MeshStandardMaterial({ color: renk }));
  taban.position.y = 0.025;
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.lineTo(0.32, -0.09); s.lineTo(0, -0.18); s.closePath();
  const bez = new THREE.Mesh(new THREE.ShapeGeometry(s), new THREE.MeshStandardMaterial({ color: renk, side: THREE.DoubleSide }));
  bez.position.set(0.02, 0.88, 0);
  const tepe = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 8), new THREE.MeshStandardMaterial({ color: 0x6f8fd8 }));
  tepe.position.y = 0.92;
  const lev = new THREE.Sprite(new THREE.SpriteMaterial({
    map: yaziDokusu(etiket, { zemin: 'rgba(29,34,51,0.85)', punto: 64 }), depthTest: false,
  }));
  lev.scale.set(1.0, 0.25, 1); lev.position.y = 1.25;
  g.add(direk, taban, bez, tepe, lev);
  g.position.set(x, y, z);
  return g;
}

function kumTorbasi(x, y, z) {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xe0c98a, roughness: 0.9 });
  for (let i = 0; i < 2; i++) {
    const t = new THREE.Mesh(new THREE.CapsuleGeometry(0.22, 0.25, 6, 14), mat);
    t.rotation.z = Math.PI / 2;
    t.scale.set(1, 1, 0.9);
    t.position.y = 0.2 + i * 0.36;
    t.castShadow = true; t.receiveShadow = true;
    g.add(t);
  }
  const koni = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.3, 14), new THREE.MeshStandardMaterial({ color: 0xd9a86b }));
  koni.position.y = 0.92; koni.castShadow = true;
  g.add(koni);
  g.position.set(x, y, z);
  return g;
}

// Zıplanacak alçak duvar: yumuşak, çizgili blok
function duvarYap(d, zeminY) {
  const g = new THREE.Group();
  const yuk = d.ust - zeminY, en = d.x1 - d.x0;
  const blok = new THREE.Mesh(
    new THREE.BoxGeometry(en, yuk, 2.2),
    new THREE.MeshStandardMaterial({ color: 0x5aa0f0, roughness: 0.6 })
  );
  blok.position.y = yuk / 2; blok.castShadow = true; blok.receiveShadow = true;
  const ust = new THREE.Mesh(new THREE.BoxGeometry(en + 0.04, 0.06, 2.24), new THREE.MeshStandardMaterial({ color: 0xffffff }));
  ust.position.y = yuk;
  g.add(blok, ust);
  g.position.set((d.x0 + d.x1) / 2, zeminY, 0);
  return g;
}

// Eğilerek geçilen çubuk: iki direk + yatay köpük çubuk
function cubukYap(c, zeminY) {
  const g = new THREE.Group();
  const direkMat = new THREE.MeshStandardMaterial({ color: 0x8fa3d6, roughness: 0.6 });
  const boy = c.alt - zeminY + 0.18;
  for (const z of [-1.1, 1.1]) {
    const d = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.09, boy, 14), direkMat);
    d.position.set(0, boy / 2, z); d.castShadow = true;
    g.add(d);
  }
  const n = 8, parca = 2.2 / n;
  for (let i = 0; i < n; i++) {
    const p = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.09, parca, 16),
      new THREE.MeshStandardMaterial({ color: i % 2 ? 0xffffff : 0xe58a3a, roughness: 0.5 })
    );
    p.rotation.x = Math.PI / 2;
    p.position.set(0, c.alt - zeminY + 0.09, -1.1 + parca / 2 + i * parca);
    p.castShadow = true;
    g.add(p);
  }
  g.position.set((c.x0 + c.x1) / 2, zeminY, 0);
  return g;
}

function kemer(x, y) {
  const g = new THREE.Group();
  const yesil = new THREE.MeshStandardMaterial({ color: 0x1f9d6b, roughness: 0.5 });
  const beyaz = new THREE.MeshStandardMaterial({ color: 0xc9d6ff, roughness: 0.6 });
  const yay = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.09, 12, 40, Math.PI), yesil);
  yay.position.y = 0.55;
  yay.rotation.y = Math.PI / 2;
  yay.castShadow = true;
  g.add(yay);
  for (const z of [-1.15, 1.15]) {
    const ayak = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.55, 12), yesil);
    ayak.position.set(0, 0.275, z);
    g.add(ayak);
    for (let i = 0; i < 3; i++) {
      const h = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.07, 10, 20), beyaz);
      h.rotation.x = Math.PI / 2;
      h.position.set(0, 0.08 + i * 0.13, z);
      g.add(h);
    }
  }
  // Kemerin tepesinde okul logosu
  const plaka = logoPlakasi(0.85);
  plaka.position.set(0, 1.95, 0);
  const cerceve = new THREE.Mesh(new THREE.TorusGeometry(0.44, 0.04, 10, 40), yesil);
  cerceve.position.copy(plaka.position);
  g.add(plaka, cerceve);
  g.position.set(x, y, 0);
  return g;
}

// Dönen çekiç: arkada bir direk, yatay kol ve ucunda çizgili silindir.
export class Cekic {
  constructor(x, y, z) {
    this.merkez = new THREE.Vector3(x, y, z);
    this.uzunluk = 2.7;
    this.aci = 0.3;
    this.hiz = -1.35;         // rad/sn (eksi: tambur robotu geriye savurur)
    this.yukseklik = 0.55;

    this.grup = new THREE.Group();
    this.grup.position.copy(this.merkez);
    const kahve = new THREE.MeshStandardMaterial({ color: 0x9c4a4f, roughness: 0.7 });
    const mavi = new THREE.MeshStandardMaterial({ color: 0x8fa3d6, roughness: 0.6 });
    const direk = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, y + this.yukseklik + 0.2, 20), kahve);
    direk.position.y = -(y) / 2 + (this.yukseklik + 0.2) / 2;
    direk.castShadow = true;
    this.grup.add(direk);

    this.kol = new THREE.Group();
    this.kol.position.y = this.yukseklik;
    this.grup.add(this.kol);
    const yaka = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.22, 20), mavi);
    this.kol.add(yaka);
    const cubuk = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.6, 12), mavi);
    cubuk.rotation.z = Math.PI / 2;
    cubuk.position.x = 0.8;
    cubuk.castShadow = true;
    this.kol.add(cubuk);
    const kirmizi = new THREE.MeshStandardMaterial({ color: 0xd2354f, roughness: 0.45 });
    const beyaz = new THREE.MeshStandardMaterial({ color: 0xf2f2f5, roughness: 0.45 });
    const n = 6, parca = 1.1 / n;
    for (let i = 0; i < n; i++) {
      const p = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, parca, 22), i % 2 ? beyaz : kirmizi);
      p.rotation.z = Math.PI / 2;
      p.position.x = 1.6 + parca / 2 + i * parca;
      p.castShadow = true;
      this.kol.add(p);
    }
  }

  guncelle(dt) {
    this.aci += this.hiz * dt;
    // rotation.y pozitifken yerel +X, dünyada (cos, 0, -sin) yönüne bakar
    this.kol.rotation.y = this.aci;
  }

  uc() {
    return new THREE.Vector2(
      this.merkez.x + Math.cos(this.aci) * this.uzunluk,
      this.merkez.z - Math.sin(this.aci) * this.uzunluk
    );
  }

  // Robot (rx, z=0, ayak yüksekliği ry) kola çarpıyor mu? Çarpıyorsa itme yönü (+1/-1), yoksa 0.
  carpma(rx, ry) {
    const kolY = this.merkez.y + this.yukseklik;
    if (ry > kolY + 0.3 || ry + 1.2 < kolY - 0.3) return 0;   // zıplayarak üstünden aşılabilir
    const ax = this.merkez.x, az = this.merkez.z;
    const u = this.uc();
    const dx = u.x - ax, dz = u.y - az;
    const L2 = dx * dx + dz * dz;
    let t = ((rx - ax) * dx + (0 - az) * dz) / L2;
    t = Math.max(0, Math.min(1, t));
    if (t < 0.45) return 0;
    const px = ax + dx * t, pz = az + dz * t;
    if (Math.hypot(rx - px, pz) > 0.42) return 0;
    const vx = -Math.sin(this.aci) * Math.sign(this.hiz);
    return vx >= 0 ? 1 : -1;
  }
}

export function parkurOlustur(sahne) {
  const grup = new THREE.Group();

  for (const b of BOLUMLER) {
    const altY = b.ince ? Math.min(b.y0, b.y1) - 0.12 : 0;
    const s = new THREE.Shape();
    s.moveTo(b.x0, altY); s.lineTo(b.x1, altY); s.lineTo(b.x1, b.y1); s.lineTo(b.x0, b.y0); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: b.gen, bevelEnabled: false });
    geo.translate(0, 0, -b.gen / 2);
    const yanMat = new THREE.MeshStandardMaterial({ color: koyu(b.renk), roughness: 0.8 });
    const ustMat = new THREE.MeshStandardMaterial({ color: b.renk, roughness: 0.75 });
    const m = new THREE.Mesh(geo, [yanMat, ustMat]);
    m.receiveShadow = true; m.castShadow = true;
    grup.add(m);

    if (!b.ince) {
      const serit = new THREE.Mesh(
        new THREE.BoxGeometry(b.x1 - b.x0, 0.1, b.gen + 0.04),
        new THREE.MeshStandardMaterial({ color: 0x9fb4ea, roughness: 0.8 })
      );
      serit.position.set((b.x0 + b.x1) / 2, 0.05, 0);
      grup.add(serit);
    }
    if (b.y0 === b.y1) {
      for (let x = b.x0 + 1.0; x < b.x1 - 0.5; x += 1.6) {
        if (DUVARLAR.some((d) => x > d.x0 - 0.3 && x < d.x1 + 0.3)) continue;
        grup.add(okIsareti(x, b.y0));
      }
    }
  }

  // Boşluğun dibinde uyarı şeridi
  const cukur = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 2.4), new THREE.MeshStandardMaterial({ color: 0x2a3140 }));
  cukur.rotation.x = -Math.PI / 2; cukur.position.set(10.9, 0.01, 0);
  grup.add(cukur);

  grup.add(zeminYazisi('START', 1.6, 0.4));
  grup.add(zeminYazisi('HOME', 28.6, 1.0));

  // START platformunun ön yüzünde logo
  const onLogo = logoPlakasi(0.36);
  onLogo.position.set(2.8, 0.22, 1.205);
  grup.add(onLogo);

  grup.add(bayrak(7.1, 1.0, -1.0, '1 · ZIPLA', 0x5aa0f0));
  grup.add(bayrak(15.1, 1.0, -1.0, '2 · EĞİL', 0xe58a3a));
  grup.add(bayrak(19.1, 1.0, -1.1, '3 · ÇEKİÇ', 0xc8305e));

  for (const d of DUVARLAR) grup.add(duvarYap(d, yukseklik(d.x0)));
  for (const c of CUBUKLAR) grup.add(cubukYap(c, yukseklik(c.x0)));

  grup.add(kumTorbasi(7.9, 1.0, -0.85));
  grup.add(kumTorbasi(16.0, 1.0, 0.85));

  grup.add(kemer(26.6, 1.0));

  const cekic = new Cekic(22, 1.0, -1.75);
  grup.add(cekic.grup);

  sahne.add(grup);
  return { grup, cekic };
}
