# Elle İt Parkur

Kamera elini görür, işaret parmağınla ekrandaki robotu sırtından iterek parkurda yürütürsün. Telefonda ve bilgisayarda aynı link ile tarayıcıda çalışır, kurulum gerekmez.

Fikir: Karma gerçeklik gözlüğüyle yapılan "parmakla robotu itme" oyununun gözlüksüz (telefon / bilgisayar kamerası) sürümü. Antalya Yükseliş Koleji projesi.

## Nasıl oynanır
1. Sayfayı aç, **adını yaz**, **Kamerayla başla**'ya bas ve kamera iznini ver.
2. Elini kameraya göster. Ekranda el iskeleti ve parmak ucunda bir daire görünür.
3. Robotu işaret parmağınla yönet:

| Hareket | Nasıl yapılır | Ne olur |
|---|---|---|
| **İt** | Parmağını robotun arkasına (soluna) getir, sağa doğru it | Robot parmağının önünde yürür. Hızlı itersen hızlı yürür, önden itersen geri gider. |
| **Zıplat** | Parmağını robotun ayaklarının altından yukarı doğru hızlıca kaldır | Robot ileri doğru zıplar. Ne kadar hızlı kaldırırsan o kadar yükseğe zıplar. |
| **Eğilt** | Başına üstten bastır | Robot çömelir. Bastırırken parmağını ileri kaydırırsan çömelerek yürür, bırakınca kalkar. |

4. Parkurun bölümleri:
   - **START**, ardından rampa
   - **1 · ZIPLA**: alçak duvarın üstünden zıpla, sonra boşluğu atla
   - Köprü
   - **2 · EĞİL**: alçak çubuğun altından eğilerek geç
   - **3 · ÇEKİÇ**: dönen çekiç robotu düşürür. Çekiç geçtikten sonra koştur ya da üstünden zıplat.
   - **HOME**
5. Boşluğa düşersen son geçtiğin bayraktan devam edersin.

## Skor tablosu
- **Skor, HOME'a ne kadar sürede ulaştığındır.** Süre robota ilk dokunduğunda başlar. Eşit sürede az düşen öne geçer.
- Giriş ekranında ve bitiş ekranında **En iyi 10** tablosu görünür. Bitişte kendi sıran ve satırın vurgulanır.
- **Oyuncu değiştir** sıradaki öğrenciye geçer, **Tekrar oyna** aynı adla yeniden başlatır.
- **Listeyi temizle** (iki kez basılır) tabloyu sıfırlar.
- Skorlar **oyunun açıldığı cihazın tarayıcısında** saklanır. Bilim şenliği gibi tek bilgisayar veya tablette herkes aynı listeyi görür. Farklı telefonlardan oynayanlar ortak bir listede görünmez. Bunun için ileride bir veritabanı (ör. Firebase) eklenmesi gerekir.

**Kamerasız dene:** Aynı hareketleri fareyle sürükleyerek ya da parmağınla ekrana dokunarak yaparsın.

**Görünüm** menüsünde yakınlık, bakış açısı, robotun ekrandaki yeri, parkurun yüksekliği, el iskeleti ve aynalama ayarlanır. Bu ayarlar tarayıcıda hatırlanır.

## Hemen oyna (internetten)
**https://cemyurtlak.github.io/elle-it-parkur/**
Telefonda, tablette ya da bilgisayarda bu bağlantıyı açman yeterli. Kurulum gerekmez, kamera izni istenir.

## Çalıştırma
Kamera tarayıcıda sadece **https** veya **localhost** üzerinde açılır. Dosyaya çift tıklayarak (`file://`) açarsan modüller yüklenmez.

**Bilgisayarda oynamak (en kolay yol):**
`OYUNU_BASLAT.bat` dosyasına çift tıkla. Sunucu açılır ve oyun tarayıcıda `http://localhost:8000` adresinde başlar. 8000 başka bir oyun/program tarafından kullanılıyorsa otomatik olarak sıradaki boş port (8001, 8002, ...) açılır ve pencerede yazar. Oyun açıkken siyah pencereyi kapatma. Bitince pencereyi kapatman yeterli.
- Python kurulu olmalı. Yoksa .bat dosyası ne yapman gerektiğini yazar: python.org'dan kur ve kurulumda "Add python.exe to PATH" kutusunu işaretle.
- Skor listesi adrese (port numarasına) bağlıdır. Son kullanılan port `son_port.txt` dosyasına yazılır ve bir dahaki açılışta önce o denenir. Port değişirse (önceki dolu olduğu için) o adreste ayrı bir liste görünür; eski listeye dönmek için diğer programı kapatıp oyunu tekrar aç.

Elle başlatmak istersen klasörde terminal açıp `python sunucu.py` yazabilirsin.

**Telefonda / her yerde (GitHub Pages):**
Oyun `cemyurtlak/elle-it-parkur` deposunda yayında: https://cemyurtlak.github.io/elle-it-parkur/ . Link https olduğu için telefonda kamera çalışır. Kodda değişiklik yapılınca değişen dosyalar depoya yeniden yüklenmeli (GitHub kendiliğinden güncellenmez).

İnternet gerekir: Three.js ve MediaPipe kütüphaneleri jsDelivr'den, el modeli Google'ın sunucusundan yüklenir. İnternetsiz kullanmak için `hand_landmarker.task` dosyasını `modeller/` klasörüne koyman yeterli. Sayfa önce oraya bakar.

## Dosya yapısı
```
index.html          Sayfa iskeleti, katmanlar ve arayüz
css/stil.css        Arayüz görünümü
js/main.js          Oyun döngüsü: kamera, el/işaretçi girişi, hareketler (it/zıplat/eğilt), fizik, çekiç, kontrol noktaları, arayüz
js/parkur.js        Parkur bölümleri, duvar/çubuk/boşluk, zemin sorguları, kontrol noktaları, dönen çekiç, süsler, logo plakaları
js/robot.js         Robot modeli ve animasyonları (yürüme, çömelme, zıplama/iniş, düşme, kalkma, kutlama)
js/skor.js          Skor tablosu: kaydetme, sıralama, en iyi 10 tablosunu çizme, son ad
OYUNU_BASLAT.bat    Çift tıklayınca sunucuyu açıp oyunu tarayıcıda başlatır (Windows)
sunucu.py           Yerel sunucu: doğru dosya türleri, port doluysa sıradaki boş port, tarayıcıyı açar
son_port.txt        (otomatik) son kullanılan port numarası
logo.png            Okul logosu (sekme simgesi, arayüz, HOME kemeri, START platformu)
js/el_takip.js      MediaPipe HandLandmarker yükleme ve el tespiti
modeller/           (isteğe bağlı) yerel el modeli dosyası
README.md           Bu dosya
GELISTIRME_GUNLUGU.md  Aşama aşama geliştirme kaydı
DEVAM_NOTLARI.md    Kurallar, teknik kararlar, kod haritası, sonraki adımlar
```

## Kullanılan teknolojiler
- **Three.js 0.160.0** ile 3D sahne
- **MediaPipe Tasks Vision 0.10.14** (HandLandmarker) ile elde 21 nokta takibi
- Saf JavaScript (ES modülleri), derleme adımı yok
