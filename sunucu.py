# Elle İt Parkur - yerel sunucu
# OYUNU_BASLAT.bat tarafından çalıştırılır. Oyunu http://localhost:<port> adresinde açar.
#
# Neden düz "python -m http.server" değil?
#  - Windows'ta .js dosyaları bazen yanlış türde (text/plain) gönderiliyor, oyun boş ekranda kalıyor.
#    Burada dosya türleri sabitlendi.
#  - Port doluysa (ör. başka bir oyun 8000'de açıksa) sıradaki boş portu bulur (8001, 8002, ...).
#    Windows'ta portu paylaşmaya izin verilmez (SO_EXCLUSIVEADDRUSE), böylece yanlışlıkla
#    başka oyunun adresine bağlanılmaz.
#  - Skorlar tarayıcıda adrese (port numarasına) göre saklanır. Bu yüzden en son kullanılan
#    port "son_port.txt" dosyasına yazılır ve bir dahaki açılışta önce o denenir.
#  - Bu oyunun sunucusu zaten açıksa ikincisini başlatmaz, sadece tarayıcıyı açar.
#    Sunucunun gerçekten BU oyun olduğu /__kimlik adresinden kontrol edilir.
#  - Sadece bu bilgisayardan erişilir (127.0.0.1), güvenlik duvarı uyarısı çıkmaz.

import http.server
import os
import socket
import sys
import threading
import urllib.request
import webbrowser

ILK_PORT = 8000
DENENECEK_PORT_SAYISI = 50          # 8000 ... 8049
KLASOR = os.path.dirname(os.path.abspath(__file__))
PORT_DOSYASI = os.path.join(KLASOR, "son_port.txt")
KIMLIK = "ElleItParkur|" + os.path.normcase(KLASOR)

TURLER = {
    ".html": "text/html; charset=utf-8",
    ".js": "text/javascript; charset=utf-8",
    ".mjs": "text/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".wasm": "application/wasm",
    ".task": "application/octet-stream",
    ".md": "text/plain; charset=utf-8",
    ".txt": "text/plain; charset=utf-8",
}


def adres(port):
    return f"http://localhost:{port}/"


class Isleyici(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=KLASOR, **kwargs)

    def do_GET(self):
        if self.path == "/__kimlik":
            veri = KIMLIK.encode("utf-8")
            self.send_response(200)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.send_header("Content-Length", str(len(veri)))
            self.end_headers()
            self.wfile.write(veri)
            return
        super().do_GET()

    def guess_type(self, path):
        uzanti = os.path.splitext(path)[1].lower()
        return TURLER.get(uzanti) or super().guess_type(path)

    def end_headers(self):
        # Dosyalar güncellenince tarayıcı eski sürümü göstermesin
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, *args):
        pass  # her istek için ekrana yazmasın


class Sunucu(http.server.ThreadingHTTPServer):
    # Python varsayılanı True. Windows'ta bu, başka programın kullandığı porta
    # "başarıyla" bağlanmaya izin veriyor ve tarayıcı diğer oyunu açıyordu.
    allow_reuse_address = False
    daemon_threads = True

    def server_bind(self):
        if hasattr(socket, "SO_EXCLUSIVEADDRUSE"):  # sadece Windows
            self.socket.setsockopt(socket.SOL_SOCKET, socket.SO_EXCLUSIVEADDRUSE, 1)
        super().server_bind()


def bizim_sunucu_mu(port):
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{port}/__kimlik", timeout=0.7) as yanit:
            return yanit.read().decode("utf-8", "ignore") == KIMLIK
    except Exception:
        return False


def biri_dinliyor_mu(port):
    """127.0.0.1 veya ::1 üzerinde bu portta bir program var mı?
    (localhost bazen IPv6'ya gider, iki tarafa da bakılır.)"""
    for aile, host in ((socket.AF_INET, "127.0.0.1"), (socket.AF_INET6, "::1")):
        try:
            with socket.socket(aile, socket.SOCK_STREAM) as s:
                s.settimeout(0.25)
                if s.connect_ex((host, port)) == 0:
                    return True
        except OSError:
            pass
    return False


def son_port_oku():
    try:
        with open(PORT_DOSYASI, encoding="utf-8") as f:
            return int(f.read().strip())
    except Exception:
        return None


def son_port_yaz(port):
    try:
        with open(PORT_DOSYASI, "w", encoding="utf-8") as f:
            f.write(str(port))
    except OSError:
        pass


def aday_portlar():
    liste = []
    son = son_port_oku()
    if son and 1024 <= son <= 65535:
        liste.append(son)
    for p in range(ILK_PORT, ILK_PORT + DENENECEK_PORT_SAYISI):
        if p not in liste:
            liste.append(p)
    return liste


def main():
    print("  Elle İt Parkur başlatılıyor...")
    adaylar = aday_portlar()

    # Portlara sırayla bakılır (önce son kullanılan):
    #  - Dinleyen varsa ve bu oyunsa: yeni sunucu açma, sadece tarayıcıyı aç.
    #  - Dinleyen başka bir programsa: atla.
    #  - Boşsa: sunucuyu burada aç.
    # Aşama 6: Eskiden önce 50 portun hepsine "bu oyun mu?" diye soruluyordu. Windows'ta
    # boş porta bağlanma denemesi ~2 sn askıda kaldığı için bu 35 sn'ye kadar sürüyor,
    # pencere boş kalıyor ve oyun "çalışmıyor" gibi görünüyordu.
    sunucu = None
    dolu = []
    for p in adaylar:
        if biri_dinliyor_mu(p):
            if bizim_sunucu_mu(p):
                print("  Oyun sunucusu zaten açık. Tarayıcı açılıyor:", adres(p))
                webbrowser.open(adres(p))
                return 0
            dolu.append(p)
            continue
        try:
            sunucu = Sunucu(("127.0.0.1", p), Isleyici)
            port = p
            break
        except OSError:
            dolu.append(p)

    if sunucu is None:
        print()
        print("HATA: Boş port bulunamadı. Diğer oyun/sunucu pencerelerini kapatıp tekrar dene.")
        return 1

    onceki = son_port_oku()
    son_port_yaz(port)
    url = adres(port)

    print("=" * 56)
    print("  Elle İt Parkur çalışıyor:", url)
    if dolu:
        print("  (Dolu olduğu için atlanan port: " + ", ".join(map(str, dolu)) + ")")
    if onceki and onceki != port:
        print(f"  Not: Bu sefer {onceki} yerine {port} kullanıldı. Skor listesi")
        print("  adrese bağlı olduğu için bu adreste ayrı liste görünür.")
    print("  Oyun tarayıcıda açılıyor...")
    print()
    print("  Oyun açıkken BU PENCEREYİ KAPATMA.")
    print("  Bitince pencereyi kapat (veya Ctrl+C).")
    print("=" * 56)

    threading.Timer(0.8, webbrowser.open, [url]).start()
    try:
        sunucu.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        sunucu.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
