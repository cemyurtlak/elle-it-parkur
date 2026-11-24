# Devam Notları

## Çalışma kuralları
- Her değişiklikten sonra GELISTIRME_GUNLUGU.md dosyasına yeni aşama eklenir (en yeni en üstte). Gerekirse README.md ve bu dosya güncellenir.
- Önceki kayıtlar silinmez, aşama numarası kaldığı yerden devam eder.
- Kod ve arayüz metinleri Türkçe. Değişken ve fonksiyon adları Türkçe (ASCII).
- Derleme adımı yok. Saf ES modülleri, kütüphaneler CDN'den sabit sürümle yüklenir (three@0.160.0, @mediapipe/tasks-vision@0.10.14).
- Sayfa https veya localhost üzerinden açılmalı (kamera izni ve modül yükleme için).

## Teknik kararlar ve nedenleri
- **Unity yerine web:** Telefon ve bilgisayarda aynı link ile kurulumsuz çalışması isteniyor. Unity'de Android APK, iOS (Mac ve ücretli Apple geliştirici hesabı gerekir) ve PC için ayrı derleme gerekirdi. Unity WebGL telefonda ağır, MediaPipe Unity Plugin de WebGL'i iyi desteklemiyor.
- **Zemin algılama yok, sanal parkur var:** Bilgisayar kamerası zemini göremez. Tarayıcıda zemin algılama (WebXR) sadece Android Chrome'da var ve aynı anda MediaPipe ile kamera görüntüsü paylaşımı güvenilir değil. Kamera görüntüsü sadece arka plan olarak kullanılıyor.
- **Robot tek eksende (X) ilerliyor:** Tek kamerayla derinlik ölçülemediği için itme 2D ekran düzleminde yapılıyor. Robot parkurdan düşmüyor. Parmak, z=0 düzlemine ışın atılarak sahne koordinatına çevriliyor.
- **İtme = "parmak arkadan sırta girdi" kuralı:** Önceki karede parmak sırtın gerisindeyse ve bu karede geçtiyse robot `parmak.x + yarıGenişlik` konumuna taşınır. Tek karede 0.9 birimden fazla sıçrama varsa parmak robotun içinden geçmiş sayılır ve itme olmaz.
- **Fizik motoru yok (şimdilik):** Düşme ve kalkma animasyonla taklit ediliyor. Yerçekimi, zıplama, iniş ve engel çarpışmaları `main.js` içinde elle yazılmış basit tek eksenli fizikle yapılıyor (Aşama 2). Gerçek aktif ragdoll için ileride cannon-es veya Rapier eklenebilir.
- **Hareket algılama kuralları (Aşama 2):** Her parmak için önceki ve şimdiki kare karşılaştırılır.
  - **Eğilme:** Önceki karede parmak başın üstündeyse (tepe - 0.04) ve şimdi altındaysa bastırma başlar. Parmak ±0.45 yatay aralıkta kaldıkça sürer. Eğilme oranı `(y + BOY - parmakY) / 0.4`. Bastıran parmak itme kuralına girmez (`basanId`).
  - **Zıplama:** Önceki karede parmak ayak hizasının (y + 0.1) altında, şimdi üstündeyse, yatayda ±0.35 içindeyse ve dikey hızı 2 birim/sn üstündeyse zıplama olur. vy = 4.6 + parmakHızı × 0.12 (en fazla 6.8). vx en az 2.4 ileri.
  - **İtme:** Parmak gövde yüksekliğinde (y + 0.12 ile tepe + 0.05 arası) olmalı. Böylece alttan zıplatma ile karışmaz.
- **Engeller veriyle tanımlı:** `DUVARLAR` (üstüne basılabilir, `zemin(x)` içinde), `CUBUKLAR` (altından eğilerek geçilir), boşluklar `BOLUMLER` arasındaki aralıklar. `zemin(x)` boşlukta -Infinity döner.
- **Logo dosya olarak yükleniyor:** `logo.png` bulunamazsa logo plakaları boş kalır ama oyun çalışır.
- **Skorlar localStorage'da (Aşama 3):** GitHub Pages statik bir site, sunucu yok. Bu yüzden skorlar cihaz başına tutuluyor (anahtar `elleItParkur.skorlar`, son ad `elleItParkur.sonAd`, en fazla 100 kayıt). Sıralama: süre ↑, sonra düşme ↑, sonra tarih. Ortak liste için Firebase/Supabase gibi bir servis gerekir.
- **Skor = süre:** Kullanıcı "ne kadar sürede bitirdi" istedi. Düşme sayısı puana eklenmiyor, sadece eşitlikte ve bilgi olarak kullanılıyor.
- **Yerel başlatma .bat + sunucu.py (Aşama 4):** Düz `python -m http.server` Windows kayıt defterine göre .js'yi text/plain gönderebiliyor ve ES modülleri yüklenmiyor. Bu yüzden türleri sabitleyen küçük bir sunucu yazıldı. localStorage (skorlar) origin'e, yani porta bağlı.
- **Boş port seçimi (Aşama 5):** Port 8000 artık sabit değil. Sıra: `son_port.txt` → 8000 → 8049. Windows'ta Python'un varsayılan `SO_REUSEADDR`'ı dolu porta bağlanmaya izin verdiği için başka oyun açılıyordu; `allow_reuse_address=False` + `SO_EXCLUSIVEADDRUSE` ile engellendi. Ayrıca 127.0.0.1 ve ::1'de dinleyen var mı diye bağlantı denemesi yapılıyor. Kendi sunucumuzu tanımak için `/__kimlik` ("ElleItParkur|<klasör yolu>") kullanılıyor. Adres hâlâ `localhost` (eski skorlar localhost:8000 origin'inde).
- **Port yoklama tek turda (Aşama 6):** Windows'ta boş yerel porta bağlanma ~2 sn askıda kalıyor. Bu yüzden `/__kimlik` sorusu yalnızca dinleyen portlara soruluyor; ilk boş portta sunucu hemen açılıyor. Önceki sürüm 50 portu 0,7 sn'lik beklemeyle yokladığı için Windows'ta ~35 sn boş pencere kalıyordu.
- **Yayın = GitHub Pages:** depo `cemyurtlak/elle-it-parkur`, adres https://cemyurtlak.github.io/elle-it-parkur/ . Değişiklikten sonra depoya yükleme elle yapılıyor (Chrome'da GitHub "Upload files", klasör yolu URL'de: `/upload/main/js` gibi). `son_port.txt` depoya konmaz.
- **Kamera robotu takip ediyor:** Parkur 30 birim uzunluğunda. Telefonda hepsi bir ekrana sığınca robot çok küçük kalıyordu.

## Kod haritası
- `js/main.js`
  - Ayarlar (`VARSAYILAN`, localStorage anahtarı `elleItParkur.ayar`)
  - Sahne, ışık, zemin (`masa` kamerasız modda görünür, `golgeZemin` kamerada gölge verir)
  - `kameraAc`, `kamerayla`: getUserMedia, aynalama, el modeli yükleme
  - `ekrandanSahneye`, `videodanEkrana`: koordinat dönüşümleri (video object-fit: cover)
  - `dongu`: giriş toplama → itme → çekiç çarpması → bitiş → animasyon → kamera → arayüz
- `js/main.js` (Aşama 2 ekleri): `destek(x)`, `engelVar(nx, sgn)`, `hareketEt(dx)` (engelde durur), `cubukAltinda(x)`, `bosluktanDon()`, `ipucuSec()`, döngüde: hareket algılama → eğilme/zıplama/itme → dikey fizik → kontrol noktası → çekiç → bitiş
- `js/parkur.js`: `BOLUMLER`, `DUVARLAR`, `CUBUKLAR`, `KONTROL` tabloları, `yukseklik(x)` (boşlukta null), `zemin(x)`, `Cekic` sınıfı (`carpma(rx, ry)`: zıplayan robot çekicin üstünden geçebilir), `parkurOlustur`
- `js/robot.js`: `Robot` sınıfı. Durumlar: ayakta, dusuyor, yerde, kalkiyor, kutlama. Ayrıca `havada`, `egilme`/`egilmeHedef`, `etkinBoy`. Metotlar: `zipla(vy, vx)`, `indi(hiz)`, `dus(yon)`, `carpti()`, `kutla()`, `guncelle(dt)`. Sabitler `BOY`, `EGILME_KISALMA`
- `js/skor.js`: `skorlariOku()`, `skorEkle(ad, sure, dusme)` → `{liste, kayit, sira}`, `skorlariTemizle()`, `sonAdOku/sonAdYaz`, `tabloCiz(tbody, liste, vurguId, kendiSira)`
- `js/main.js` (Aşama 3 ekleri): `adAl()`, `baslat(kamerali)`, `girisEkraninaDon()`, `girisTablosu()`, bitişte `skorEkle` + `tabloCiz`
- `sunucu.py`: `Isleyici` (tür tablosu `TURLER`, no-store önbellek, `/__kimlik`), `Sunucu` (port paylaşımı kapalı), `bizim_sunucu_mu(port)`, `biri_dinliyor_mu(port)`, `son_port_oku/yaz`, `aday_portlar()`, `main()`. `OYUNU_BASLAT.bat` → `py -3` / `python` ile bunu çalıştırır
- `js/el_takip.js`: `ElTakip.yukle()`, `tespit(video)`. Model önce `modeller/hand_landmarker.task`, yoksa Google sunucusu
- Hata ayıklama: konsolda `window.oyun` (robot, cekic, kamera, ayar)

## Bilinen sorunlar / dikkat
- Gerçek kamerayla el takibi henüz cihazda denenmedi.
- Arka kamerada el ekranın altından girer. İtme yönü soldan sağa olduğu için sağ elle daha rahat. Sol elliler için yön çevirme seçeneği yok.
- El her zaman robotun arkasında çiziliyor (gerçek örtme yok). Sadece el iskeleti üstte çiziliyor.
- Çekiç her zaman robotu geri savuruyor. Zorluk ayarı yok.
- Eğilerek yürürken tek parmak hem bastırıp hem kaydırıyor. İki elle (biri başta, biri sırtta) kullanım da çalışmalı ama denenmedi.
- Boş port seçimi ve Aşama 6'daki hızlı açılış Windows'ta henüz denenmedi.
- Port değişirse skor listesi o adreste boş başlar (localStorage porta bağlı).
- OYUNU_BASLAT.bat Windows'ta henüz denenmedi. Çok eski Windows'ta (chcp 65001 desteği zayıf) Türkçe karakterler bozuk görünebilir, işlevi etkilemez.
- Skorlar cihaza özel. Tarayıcı verisi silinirse veya gizli sekmede oynanırsa liste kaybolur.
- Aynı ad birden fazla kez listeye girebilir (her bitiriş ayrı kayıt).
- Zıplama eşiği (2 birim/sn) kamera ile hızlı veya yavaş gelebilir. Kamera 30 kare/sn verirken oyun 60 kare/sn döndüğü için ölçülen hız dalgalı.

## Sonraki adımlar (fikirler)
1. Gerçek cihazda dene, itme/zıplama/eğilme hassasiyetini ayarla (HW, 0.06 tolerans, 0.9 sıçrama sınırı, zıplama eşiği 2.0, vy formülü).
1b. Ayarlar paneline "Zorluk" (çekiç hızı, boşluk genişliği) eklenebilir.
1c. Hareketli platform veya yükselen/alçalan çubuk gibi yeni engeller (hareketler artık zıplama ve eğilmeyi destekliyor).
1d. Ortak skor tablosu (Firebase/Supabase) — farklı cihazlardan oynayanlar tek listede.
1e. Sınıf/şube alanı, kişi başına sadece en iyi skoru gösterme seçeneği.
2. Yön çevirme (sağdan sola parkur) ve sol el desteği.
3. Daha fazla engel: hareketli platform, rampa üstünde yuvarlanan top, kontrol noktası (düşünce geri dönülen yer).
4. Fizik motoru (Rapier/cannon-es) ile gerçek ragdoll düşme.
5. MediaPipe Image Segmenter ile el maskesi: el robotun önündeyken robotu gerçekten örtsün.
6. Mixamo / glTF karakter modeli ile daha gerçekçi robot.
7. İleride Android'de WebXR AR: parkuru gerçek masaya yerleştirme (ayrı mod olarak).
