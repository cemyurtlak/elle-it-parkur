// Robot: basit şekillerden yapılmış karakter.
// Animasyonlar: yürüme, eğilme (çömelme), zıplama/havada, iniş, düşme, kalkma, kutlama.
// Yapı:  kok (konum, yön)  ->  pivot (devrilme, ayak hizasında)  ->  govde (çömelirken alçalır)
import * as THREE from 'three';

const ANA = new THREE.MeshStandardMaterial({ color: 0xb9ccff, roughness: 0.35, metalness: 0.25 });
const KOYU = new THREE.MeshStandardMaterial({ color: 0x2a3140, roughness: 0.5, metalness: 0.3 });
const VIZOR = new THREE.MeshStandardMaterial({ color: 0x11151f, roughness: 0.15, metalness: 0.6 });

function kapsul(r, boy, mat = ANA) {
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, boy, 6, 12), mat);
  m.castShadow = true;
  return m;
}
function eklem(r) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), KOYU);
  m.castShadow = true;
  return m;
}
const yumusat = (t) => t * t * (3 - 2 * t);
const yaklas = (a, b, k) => a + (b - a) * k;

export const BOY = 1.18;            // ayakta boy
export const EGILME_KISALMA = 0.4;  // tam çömelince boy bu kadar kısalır

export class Robot {
  constructor() {
    this.kok = new THREE.Group();
    this.kok.rotation.y = Math.PI / 2;        // yüzü +X yönüne (parkur boyunca)
    this.pivot = new THREE.Group();
    this.kok.add(this.pivot);
    this.govde = new THREE.Group();
    this.pivot.add(this.govde);

    this.boy = BOY;
    this.yariGenislik = 0.2;

    this.kalca = []; this.diz = [];
    for (const s of [-1, 1]) {
      const kalca = new THREE.Group();
      kalca.position.set(0.1 * s, 0.56, 0);
      const ust = kapsul(0.065, 0.16); ust.position.y = -0.14;
      const dizG = new THREE.Group(); dizG.position.y = -0.28;
      const alt = kapsul(0.055, 0.16); alt.position.y = -0.13;
      const ayak = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.05, 0.2), KOYU);
      ayak.position.set(0, -0.255, 0.04); ayak.castShadow = true;
      dizG.add(eklem(0.06), alt, ayak);
      kalca.add(eklem(0.07), ust, dizG);
      this.govde.add(kalca);
      this.kalca.push(kalca); this.diz.push(dizG);
    }

    const legen = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.1, 0.16), KOYU);
    legen.position.y = 0.6; legen.castShadow = true;
    this.govde.add(legen);

    this.omurga = new THREE.Group();
    this.omurga.position.y = 0.63;
    this.govde.add(this.omurga);
    const gogus = kapsul(0.14, 0.16); gogus.position.y = 0.19; gogus.scale.set(1.15, 1, 0.8);
    const plaka = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.14, 0.04), KOYU);
    plaka.position.set(0, 0.22, 0.11);
    this.omurga.add(gogus, plaka);

    const boyun = eklem(0.05); boyun.position.y = 0.38;
    this.kafa = new THREE.Group(); this.kafa.position.y = 0.46;
    const kafaTop = new THREE.Mesh(new THREE.SphereGeometry(0.11, 18, 14), ANA);
    kafaTop.scale.set(0.95, 1.05, 1); kafaTop.castShadow = true;
    const vizor = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 10, -Math.PI / 2.4, Math.PI / 1.2, Math.PI / 3, Math.PI / 3), VIZOR);
    vizor.position.set(0, 0.0, 0.03);
    this.kafa.add(kafaTop, vizor);
    this.omurga.add(boyun, this.kafa);

    this.omuz = []; this.dirsek = [];
    for (const s of [-1, 1]) {
      const omuz = new THREE.Group();
      omuz.position.set(0.2 * s, 0.31, 0);
      const ust = kapsul(0.045, 0.13); ust.position.y = -0.1;
      const dir = new THREE.Group(); dir.position.y = -0.21;
      const alt = kapsul(0.04, 0.12); alt.position.y = -0.1;
      const el = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), KOYU);
      el.position.y = -0.21;
      dir.add(eklem(0.045), alt, el);
      omuz.add(eklem(0.055), ust, dir);
      this.omurga.add(omuz);
      this.omuz.push(omuz); this.dirsek.push(dir);
    }

    this.sifirla(1.4, 0.4);
  }

  get ayakta() { return this.durum === 'ayakta'; }
  // Şu anki (çömelmeye göre) boy
  get etkinBoy() { return this.boy - EGILME_KISALMA * this.egilme; }

  sifirla(x, y) {
    this.x = x; this.y = y; this.vx = 0; this.vy = 0;
    this.havada = false; this.havaKarisim = 0; this.inis = 0;
    this.egilme = 0; this.egilmeHedef = 0;
    this.faz = 0; this.yurume = 0; this.zaman = 0;
    this.durum = 'ayakta'; this.durumSure = 0; this.dusmeYonu = 1;
    this.sarsinti = 0;
    this.pivot.rotation.set(0, 0, 0); this.pivot.position.set(0, 0, 0);
    this.govde.position.set(0, 0, 0);
  }

  dus(yon) {
    if (this.durum !== 'ayakta') return;
    this.durum = 'dusuyor'; this.durumSure = 0; this.dusmeYonu = yon;
    this.vx = 3.2 * yon; this.egilmeHedef = 0;
  }

  zipla(vy, vx) {
    if (this.havada || !this.ayakta) return false;
    this.havada = true; this.vy = vy; this.vx = vx; this.egilmeHedef = 0;
    return true;
  }

  indi(hiz) {
    this.havada = false; this.vy = 0;
    this.inis = Math.min(1, Math.abs(hiz) / 7);
  }

  carpti() { this.sarsinti = 1; }

  kutla() {
    if (this.durum === 'kutlama') return;
    this.durum = 'kutlama'; this.durumSure = 0; this.vx = 0; this.egilmeHedef = 0;
  }

  guncelle(dt) {
    this.zaman += dt;
    this.durumSure += dt;
    this.kok.position.set(this.x, this.y, 0);

    // Çömelme ve havada karışımları yumuşak değişir
    this.egilme = yaklas(this.egilme, this.egilmeHedef, Math.min(1, dt * 12));
    this.havaKarisim = yaklas(this.havaKarisim, this.havada ? 1 : 0, Math.min(1, dt * 10));
    this.inis = Math.max(0, this.inis - dt * 4);
    this.sarsinti = Math.max(0, this.sarsinti - dt * 3);

    const pv = this.pivot;
    const yon = this.dusmeYonu;
    this.govde.position.y = 0;
    this.kok.rotation.y = Math.PI / 2;

    if (this.durum === 'dusuyor') {
      const t = Math.min(1, this.durumSure / 0.35);
      pv.rotation.x = yon * (Math.PI / 2) * t * t;
      pv.rotation.z = 0.25 * t * yon;
      pv.position.y = 0.1 * t;
      this.kollariAc(t);
      if (t >= 1) { this.durum = 'yerde'; this.durumSure = 0; }
    } else if (this.durum === 'yerde') {
      pv.rotation.x = yon * Math.PI / 2;
      pv.position.y = 0.1;
      this.kollariAc(1);
      if (this.durumSure > 1.1) { this.durum = 'kalkiyor'; this.durumSure = 0; }
    } else if (this.durum === 'kalkiyor') {
      const t = yumusat(Math.min(1, this.durumSure / 0.7));
      pv.rotation.x = yon * (Math.PI / 2) * (1 - t);
      pv.rotation.z = 0.25 * (1 - t) * yon;
      pv.position.y = 0.1 * (1 - t);
      this.kollariAc(1 - t);
      if (t >= 1) { this.durum = 'ayakta'; this.durumSure = 0; pv.rotation.set(0, 0, 0); }
    } else if (this.durum === 'kutlama') {
      pv.rotation.set(0, 0, 0);
      const zip = Math.abs(Math.sin(this.zaman * 7));
      pv.position.y = zip * 0.18;
      for (let i = 0; i < 2; i++) {
        this.omuz[i].rotation.x = -2.8;
        this.omuz[i].rotation.z = (i ? 1 : -1) * (0.3 + 0.2 * Math.sin(this.zaman * 10));
        this.dirsek[i].rotation.x = 0;
        this.kalca[i].rotation.x = -0.2 * zip;
        this.diz[i].rotation.x = 0.4 * zip;
      }
      this.omurga.rotation.set(0, 0, 0); this.kafa.rotation.set(0, 0, 0);
      this.kok.rotation.y = Math.PI / 2 + Math.sin(this.zaman * 3) * 0.6;
    } else {
      this.ayaktaPoz(dt);
    }
  }

  kollariAc(t) {
    for (let i = 0; i < 2; i++) {
      const s = i ? 1 : -1;
      this.omuz[i].rotation.x = -1.4 * t;
      this.omuz[i].rotation.z = (0.12 + 0.9 * t) * s;
      this.dirsek[i].rotation.x = -0.2;
      this.kalca[i].rotation.x = (i ? 0.3 : -0.2) * t;
      this.diz[i].rotation.x = 0.4 * t;
    }
    this.omurga.rotation.set(0, 0, 0); this.kafa.rotation.set(0, 0, 0);
  }

  // Yürüme + çömelme + havada + iniş pozlarının karışımı
  ayaktaPoz(dt) {
    const hiz = Math.abs(this.vx);
    const yerde = 1 - this.havaKarisim;
    this.yurume = yaklas(this.yurume, Math.min(1, hiz / 1.0) * (this.havada ? 0 : 1), Math.min(1, dt * 8));
    const a = this.yurume;
    if (!this.havada) this.faz += Math.sign(this.vx || 1) * Math.min(hiz, 4) * dt * 6.0;
    const s = Math.sin(this.faz);
    const nefes = Math.sin(this.zaman * 2.2) * 0.01;
    const c = Math.min(1, this.egilme + this.inis * 0.6);    // çömelme miktarı
    const h = this.havaKarisim;
    const adim = 1 - c * 0.5;                                // çömelince adımlar kısalır

    for (let i = 0; i < 2; i++) {
      const isaret = i ? 1 : -1;
      const sal = isaret * s * 0.65 * a * adim;
      const dizSal = Math.max(0, Math.sin(this.faz + 1.4 + (i ? Math.PI : 0))) * 1.0 * a;
      this.kalca[i].rotation.x = sal - 1.0 * c - 0.8 * h + (i ? 0.3 : 0) * h;
      this.diz[i].rotation.x = 0.05 + dizSal * adim + 2.0 * c + 1.4 * h;
      this.omuz[i].rotation.x = -sal * 0.85 * yerde - 0.5 * c - 2.5 * h;
      this.omuz[i].rotation.z = isaret * (0.12 + 0.35 * h);
      this.dirsek[i].rotation.x = -0.35 - 0.25 * a - 0.6 * c;
    }

    this.govde.position.y = -0.26 * c;
    this.omurga.rotation.x = 0.4 * c;
    this.omurga.rotation.y = s * 0.12 * a;
    this.kafa.rotation.x = -0.35 * c;
    const egim = (0.12 * a * Math.sign(this.vx || 1)) * yerde;
    this.pivot.rotation.x = egim + Math.sin(this.zaman * 40) * 0.06 * this.sarsinti;
    this.pivot.rotation.z = 0;
    this.pivot.position.y = (Math.abs(Math.cos(this.faz)) * 0.035 * a + nefes) * yerde;
  }
}
