# Geliştirme Günlüğü

En yeni aşama en üstte.

---

## Aşama 6 · Bilgisayarda açılmama sorunu + GitHub Pages yayını
**Tarih:** 2026-11-24

**İstek:** Proje bilgisayarda çalışmamış gibi; kontrol edilsin. GitHub'a da yüklensin.

**Sorunun büyük olası nedeni (sunucu.py):**
- Açılışta "bu oyun zaten açık mı?" diye önce **50 portun hepsine** (8000–8049) tek tek soruluyordu, her biri 0,7 sn bekleme sınırıyla.
- Windows'ta boş (dinlenmeyen) bir yerel porta bağlanma denemesi hemen reddedilmez, yaklaşık 2 sn askıda kalır. Bu yüzden her deneme 0,7 sn'nin tamamını bekliyordu: **~35 sn boyunca siyah pencerede hiçbir şey yazmıyor, tarayıcı açılmıyordu.** Oyun "çalışmıyor" gibi görünüyordu. (Linux'ta bağlantı anında reddedildiği için önceki testlerde fark edilmedi.)

**Yapılanlar:**
- `sunucu.py`: portlara tek turda bakılıyor (önce `son_port.txt`). Dinleyen yoksa sunucu hemen orada açılıyor; dinleyen varsa ancak o zaman "bu oyun mu?" (`/__kimlik`) soruluyor. Tipik açılış artık 1 sn'nin altında.
- Açılışta hemen "Elle İt Parkur başlatılıyor..." yazıyor (pencere boş kalmıyor).
- Port yoklama beklemesi 0,3 → 0,25 sn.
- **GitHub:** `cemyurtlak/elle-it-parkur` deposu açıldı, dosyalar yüklendi, GitHub Pages açıldı: https://cemyurtlak.github.io/elle-it-parkur/ (https olduğu için telefonda ve bilgisayarda kamera çalışır, kurulum gerekmez). `son_port.txt` depoya konmadı (her bilgisayarda kendisi oluşur).

**Değişen dosyalar:** sunucu.py, README.md, GELISTIRME_GUNLUGU.md, DEVAM_NOTLARI.md

**Test durumu:**
- Linux'ta: 8000 başka sunucudayken oyun 8001'de açıldı; ikinci çalıştırma "zaten açık" deyip yeni sunucu açmadı; .js doğru türle (text/javascript) gönderildi.
- Oyun kodu Chromium'da (kütüphaneler yerelden verilerek) kamerasız modda açıldı: konsol hatası yok, fareyle itilen robot yürüdü (x 1,4 → 5,4), süre işledi.
- Windows'ta yeni sunucu henüz denenmedi. Gerçek kamera ve el takibi bu ortamda denenemedi (CDN ve kamera erişimi yok).

---

## Aşama 5 · Port doluysa boş adres açma
**Tarih:** 2026-10-17

**İstek:** Oyun açılınca başka bir oyunun localhost adresine bağlanıp o oyunu açıyordu. Port doluysa yeni bir adres açsın.

**Sorunun nedeni:**
- Python'un `ThreadingHTTPServer`'ı varsayılan olarak `allow_reuse_address = True` kullanıyor. Windows'ta bu, başka programın dinlediği 8000 portuna da "başarıyla" bağlanmaya izin veriyor. Sunucu açılmış görünüyor ama tarayıcı `localhost:8000`'e gidince diğer oyun cevap veriyor.
- Ayrıca `localhost` bazen IPv6'ya (::1) gidiyor. Diğer sunucu orada dinliyorsa yine o açılıyor.
- "Zaten açık mı" kontrolü sayfa başlığına bakıyordu. Aynı başlığı kullanan başka bir kopya/oyun da "bizim" sanılabiliyordu.

**Yapılanlar (sunucu.py):**
- `allow_reuse_address = False` ve Windows'ta `SO_EXCLUSIVEADDRUSE`: dolu porta bağlanılamaz.
- Port açmadan önce 127.0.0.1 ve ::1 üzerinde o portta dinleyen var mı diye bakılıyor.
- Dolu ise sıradaki port deneniyor (8000 → 8049). Atlanan portlar ekrana yazılıyor.
- Seçilen port `son_port.txt` dosyasına yazılıyor, bir dahaki açılışta önce o deneniyor (skor listesi adrese bağlı olduğu için).
- Yeni `/__kimlik` adresi: proje klasörünün yolunu döndürüyor. "Zaten açık" kontrolü artık bununla yapılıyor, başka oyun yanlışlıkla "bizim" sayılmıyor.
- Port bir önceki açılıştan farklıysa skor listesinin o adreste ayrı olacağı uyarısı yazılıyor.

**Değişen dosyalar:** sunucu.py, README.md, GELISTIRME_GUNLUGU.md, DEVAM_NOTLARI.md (son_port.txt çalışınca otomatik oluşur)

**Test durumu:**
- Linux'ta 8000'de başka bir sunucu açıkken çalıştırıldı: 8000 atlandı, oyun 8001'de açıldı, `son_port.txt` = 8001.
- İkinci çalıştırma "zaten açık" deyip 8001'i tarayıcıda açtı, yeni sunucu başlatmadı.
- **Windows'ta henüz denenmedi** (SO_EXCLUSIVEADDRUSE kısmı sadece Windows'ta çalışır).

---

## Aşama 4 · Çift tıkla başlatma (OYUNU_BASLAT.bat)
**Tarih:** 2026-10-12

**İstek:** Terminalde komut yazmak yerine, çift tıklayınca sunucuyu açıp oyunu tarayıcıda başlatan bir .bat dosyası.

**Yapılanlar:**
- `OYUNU_BASLAT.bat`: proje klasörüne geçer, Python'u bulur (önce `py`, yoksa `python`) ve `sunucu.py`'yi çalıştırır. Python yoksa kurulum adımlarını yazar. Hata olursa pencere açık kalır.
- `sunucu.py` (yeni), düz `python -m http.server` yerine kullanılıyor:
  - Dosya türlerini sabitler. Windows'ta .js dosyalarının yanlış türle gönderilip oyunun boş açılması sorununu önler.
  - Her zaman **8000** portunu kullanır, çünkü skor listesi adrese bağlı.
  - Sunucu zaten açıksa ikincisini başlatmaz, sadece tarayıcıyı açar.
  - 8000 başka bir programdaysa açıklayıcı hata verir.
  - Sadece 127.0.0.1'e bağlanır, güvenlik duvarı uyarısı çıkmaz.
  - Önbelleği kapatır, dosya güncellenince tarayıcı eski sürümü göstermez.
  - Tarayıcıyı otomatik açar.

**Değişen dosyalar:** OYUNU_BASLAT.bat (yeni), sunucu.py (yeni), README.md, GELISTIRME_GUNLUGU.md, DEVAM_NOTLARI.md

**Test durumu:**
- `sunucu.py` Linux'ta denendi:
  - index.html, .js, .css ve .png doğru türlerle 200 döndü.
  - İkinci çalıştırma "zaten açık" deyip yeni sunucu açmadı.
- .bat dosyası UTF-8 ve CRLF satır sonlarıyla yazıldı. **Windows'ta henüz çalıştırılmadı**, ilk deneme kullanıcıda.

---

## Aşama 3 · Oyuncu adı ve skor tablosu (en iyi 10)
**Tarih:** 2026-10-12

**İstek:** Başlangıçta isim sorsun, kişinin ne kadar sürede bitirdiğini skor olarak hesaplasın. Kişinin skoru ve en iyi 10 skor ekranda yazsın.

**Yapılanlar:**
- Giriş ekranına **Adın** alanı eklendi (en fazla 20 karakter). Ad yazılmadan oyun başlamıyor, uyarı çıkıyor. Enter ile de başlanabiliyor. Son yazılan ad hatırlanıyor, kutuya tıklayınca seçili geliyor.
- **Skor = HOME'a ulaşma süresi** (saniye, 0.1 hassasiyet). Süre robota ilk dokunuşta başlar. Eşit sürede az düşen öne geçer.
- Giriş ekranında sağda (telefonda altta) **En iyi 10** tablosu: sıra, ad, süre, düşme sayısı.
- Bitiş ekranında: "Ad, süren X saniye", sıralamadaki yeri (birinciyse "Yeni rekor!"), düşme bilgisi ve En iyi 10 tablosu. Oyuncunun satırı sarıyla vurgulanıyor. İlk 10'da değilse tablonun altında kendi satırı gösteriliyor.
- **Oyuncu değiştir** butonu giriş ekranına döner, ad kutusunu boşaltır. **Tekrar oyna** aynı adla yeniden başlatır.
- Üst barda oyuncunun adı görünüyor.
- **Listeyi temizle** butonu: yanlışlıkla silinmesin diye iki kez basmak gerekiyor.
- Skorlar cihazın tarayıcısında (localStorage) saklanıyor, en fazla 100 kayıt.

**Değişen dosyalar:** index.html, css/stil.css, js/main.js, js/skor.js (yeni), README.md, GELISTIRME_GUNLUGU.md, DEVAM_NOTLARI.md

**Test durumu:**
- Headless Chromium'da kamerasız modda denendi:
  - Ad boşken başlama engellendi ve uyarı göründü.
  - "Ayşe 9B" bitirdi (2.0 sn) ve 1. oldu.
  - "Oyuncu değiştir" ile "Mehmet" bitirdi (1.7 sn), "Yeni rekor!" mesajı çıktı, tabloda 1. sıraya geçti ve vurgulandı.
  - Sayfa yenilenince liste ve son ad korundu.
  - 900×620 ve 390×844 ekranlarda düzen kontrol edildi.
- Test sırasında çıkan "ikinci oyuncu bitiremedi" sorunu oyundan değil, testin kamera kaymasını beklememesinden kaynaklanıyordu.

---

## Aşama 2 · Zıplama, eğilme, yeni parkur ve okul logosu
**Tarih:** 2026-10-12

**İstek:** Alttan itince robot zıplasın, başına üstten bastırınca eğilsin. Parkur yeni hareketlere göre geliştirilsin. Klasöre konan logo.png uygun yerlere eklensin.

**Yapılanlar:**
- **Zıplama:** Parmak robotun ayaklarının altından yukarı doğru hızlı (2 birim/sn üstü) geçerse robot zıplar. Zıplama yüksekliği parmak hızına bağlıdır, robot hep biraz ileri doğru zıplar. Havada kollar yukarı, dizler kırık; inişte çömelerek yaylanır ve yatay hızı kesilir.
- **Eğilme:** Parmak başın üstünden aşağı bastırırsa robot çömelir. Ne kadar bastırılırsa o kadar eğilir (boy en fazla 0.4 kısalır). Bastırırken parmak yana kaydırılırsa robot çömelmiş halde yürür. Bırakınca kalkar, ama çubuğun altındaysa kalkamaz.
- **Fizik:** Yerçekimi, kenardan düşme, duvara takılma (yerde basamak toleransı 0.16), havada duvara değince hızın korunması, zıplarken çubuğa kafa çarpma.
- **Yeni parkur:** START → rampa → **1 · ZIPLA** (alçak duvar + 1 birimlik boşluk) → köprü → **2 · EĞİL** (alçak çubuk) → **3 · ÇEKİÇ** → HOME (bitiş x=28).
- **Kontrol noktaları:** Boşluğa düşen robot son geçilen bayraktan yeniden başlar, uyarı mesajı çıkar, düşme sayısı artar. Çekicin üstünden zıplamak da mümkün.
- **İpuçları:** Bölüme göre ekranın altında hareket ipucu gösteriliyor. Giriş ekranında üç hareket (İt / Zıplat / Eğilt) anlatılıyor.
- **Logo:** Tarayıcı sekmesi simgesi, üst barda küçük logo, giriş ve bitiş kartlarında başlığın yanında, HOME kemerinin tepesinde ve START platformunun ön yüzünde.
- Bölüm listesi artık `KONTROL` tablosundan otomatik oluşuyor.
- Alçak ekranlarda giriş kartı kaydırılabilir yapıldı.

**Değişen dosyalar:** index.html, css/stil.css, js/main.js, js/parkur.js, js/robot.js, logo.png (projeye dahil edildi), README.md, GELISTIRME_GUNLUGU.md, DEVAM_NOTLARI.md

**Test durumu:**
- Headless Chromium'da kamerasız modda (fare ile) adım adım denendi:
  1. Duvara itilen robot duvarın önünde durdu (x=8.46).
  2. Alttan yukarı sürükleme robotu zıplattı, duvarı aştı.
  3. Boşluğun kenarından zıplama boşluğu geçti (x=11.75'e indi).
  4. Çubuğa itilen robot çubukta durdu (x=16.55).
  5. Başa bastırma robotu çömeltti (eğilme 0.82), kaydırınca çubuğun altından geçti (x=18.15).
  6. Bırakınca robot kalktı.
  7. Boşluğa bırakılan robot son bayraktan yeniden başladı ve uyarı göründü.
  8. HOME'da bitiş ekranı ve logo göründü.
- Bulunan ve düzeltilen hatalar:
  - Havada duvara değen robotun hızı sıfırlanıyordu, bu yüzden duvarın üstüne çıkamıyordu.
  - İnişte kayan robot boşluğa düşüyordu, inişte hız kesildi.
- **Test edilmedi:** Gerçek kamera ve el takibiyle zıplama ve eğilme hissi. Eşik değerlerinin cihazda ayarlanması gerekebilir.

---

## Aşama 1 · İlk oynanabilir sürüm (web)
**Tarih:** 2026-10-12

**İstek:** Karma gerçeklik videosundaki gibi parkur üstünde duran bir karakter olsun, kişi eliyle karakteri arkasından ittiğinde karakter yürüsün. Quest olmadan, hem telefondan hem bilgisayardan açılıp kullanılabilsin. İleride GitHub'a yüklenip linkle paylaşılacak.

**Yapılanlar:**
- Platform kararı: Unity yerine web (Three.js + MediaPipe JS). Tek link her cihazda açılır, GitHub Pages ile yayınlanabilir.
- Zemin algılama yerine sanal parkur yapıldı. Kamera görüntüsü arka planda, parkur ve robot üstünde. Kamera robotu takip eder, görünüm ayarlanabilir.
- Parkur: START (mavi) → rampa → kum torbalı düzlük → 1·KÖPRÜ (ince tahta) → 2·ÇEKİÇ (pembe, dönen çizgili çekiç) → HOME (yeşil, kemer).
- Basit şekillerden robot: prosedürel yürüme, çekiç çarpınca düşme, yerde bekleme, kalkma ve HOME'da kutlama.
- İtme mantığı: parmak ucu, ekrandan robotun yürüdüğü düzleme (z=0) ışın atılarak sahneye çevrilir. Parmak robotun sırtına arkadan girerse robot parmağın önüne itilir, hız parmağın hızından gelir. Önden itince geri gider. Bırakınca biraz kayıp durur.
- El takibi: MediaPipe HandLandmarker (2 el, önce GPU, olmazsa CPU), parmak ucu yumuşatma, el iskeleti çizimi, temasta titreşim ve halka efekti.
- Kamerasız mod: fare veya dokunmayla itme.
- Arayüz: süre, bölüm göstergesi, el durumu, Görünüm paneli (localStorage'da saklanır), kamera çevirme, baştan başlama, bitiş ekranı (süre ve düşme sayısı).

**Değişen dosyalar:** index.html, css/stil.css, js/main.js, js/parkur.js, js/robot.js, js/el_takip.js, README.md, GELISTIRME_GUNLUGU.md, DEVAM_NOTLARI.md

**Test durumu:**
- Headless Chromium'da (kamerasız mod) 1000×600 ve 390×844 ekranlarda denendi. Fareyle itme robotu START'tan çekiç bölümüne kadar götürdü. Çekiç robotu düşürdü, robot kalktı. HOME'da kutlama yapıldı ve bitiş ekranı açıldı. Sayfa hatası yok.
- Bulunan ve düzeltilen hata: gizli bitiş paneli (`display:grid` yüzünden `hidden` çalışmıyordu) tıklamaları engelliyordu.
- **Test edilmedi:** gerçek kamera ve MediaPipe el takibi. Test ortamı CDN'lere ve kameraya erişemiyor. İlk gerçek cihaz denemesi kullanıcıda.
