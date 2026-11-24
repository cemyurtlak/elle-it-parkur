// Skor tablosu: oyuncu adı + bitirme süresi (az olan iyi). Tarayıcının localStorage'ında,
// yani oyunun açıldığı cihazda saklanır. Erişim engellenirse sayfa açıkken bellekte tutulur.
const ANAHTAR = 'elleItParkur.skorlar';
const AD_ANAHTAR = 'elleItParkur.sonAd';
const SAKLA = 100;      // en fazla bu kadar kayıt saklanır
let bellek = [];

export function skorlariOku() {
  try {
    const v = JSON.parse(localStorage.getItem(ANAHTAR) || '[]');
    if (Array.isArray(v)) bellek = v.filter((k) => k && typeof k.ad === 'string' && Number.isFinite(k.sure));
  } catch (_) { /* bellekteki liste kullanılır */ }
  return siralı(bellek);
}

function siralı(liste) {
  return [...liste].sort((a, b) => a.sure - b.sure || a.dusme - b.dusme || a.tarih - b.tarih);
}

function yaz(liste) {
  bellek = liste;
  try { localStorage.setItem(ANAHTAR, JSON.stringify(liste)); } catch (_) {}
}

// Yeni skoru ekler. Dönen: { liste (sıralı), kayit, sira (1'den başlar) }
export function skorEkle(ad, sure, dusme) {
  const kayit = { id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6), ad, sure: Math.round(sure * 10) / 10, dusme, tarih: Date.now() };
  const liste = siralı([...skorlariOku(), kayit]).slice(0, SAKLA);
  yaz(liste);
  const sira = liste.findIndex((k) => k.id === kayit.id) + 1;   // listeye girmediyse 0
  return { liste, kayit, sira };
}

export function skorlariTemizle() { yaz([]); }

export function sonAdOku() {
  try { return localStorage.getItem(AD_ANAHTAR) || ''; } catch (_) { return ''; }
}
export function sonAdYaz(ad) {
  try { localStorage.setItem(AD_ANAHTAR, ad); } catch (_) {}
}

// İlk 10'u tabloya yazar; vurguId satırı işaretlenir. Kişi ilk 10'da değilse altına kendi satırı eklenir.
export function tabloCiz(tbody, liste, vurguId = null, kendiSira = 0) {
  tbody.replaceChildren();
  const ilk10 = liste.slice(0, 10);
  if (!ilk10.length) {
    const tr = document.createElement('tr');
    const td = document.createElement('td');
    td.colSpan = 4; td.className = 'bos';
    td.textContent = 'Henüz skor yok. İlk bitiren sen ol!';
    tr.appendChild(td); tbody.appendChild(tr);
    return;
  }
  const satir = (k, sira) => {
    const tr = document.createElement('tr');
    if (k.id === vurguId) tr.className = 'sen';
    for (const deger of [sira + '.', k.ad, k.sure.toFixed(1) + ' sn', String(k.dusme)]) {
      const td = document.createElement('td');
      td.textContent = deger;
      tr.appendChild(td);
    }
    return tr;
  };
  ilk10.forEach((k, i) => tbody.appendChild(satir(k, i + 1)));
  if (vurguId && kendiSira > 10) {
    const ara = document.createElement('tr');
    ara.className = 'ara';
    const td = document.createElement('td'); td.colSpan = 4; td.textContent = '⋯';
    ara.appendChild(td); tbody.appendChild(ara);
    tbody.appendChild(satir(liste[kendiSira - 1], kendiSira));
  }
}
