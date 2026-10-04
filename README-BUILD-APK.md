# 📱 Kompilacja CogniAgent v2 do pliku APK (GitHub Actions)

Ten przewodnik wyjaśnia krok po kroku, jak skompilować aplikację **CogniAgent v2** do natywnego pliku instalacyjnego Androida (**APK**) bez potrzeby instalowania Android Studio na swoim komputerze, za pomocą darmowej automatyzacji **GitHub Actions**.

---

## 🚀 Krok 1: Wypchnięcie (Push) repozytorium na GitHub

1. Jeśli jeszcze nie masz repozytorium na GitHubie, utwórz nowe (np. `cogniagent-v2`).
2. Połącz lokalne repozytorium z GitHubem i wypchnij kod:
   ```bash
   git add .
   git commit -m "Add GitHub Actions APK build workflow and Capacitor configuration"
   git branch -M main
   git remote add origin https://github.com/TWOJA_NAZWA/cogniagent-v2.git
   git push -u origin main
   ```

---

## ⚙️ Krok 2: Uruchomienie kompilacji APK w GitHub Actions

Workflow uruchamia się **automatycznie** po każdym `git push` na gałąź `main` lub `master`.  
Możesz go również wywołać w dowolnym momencie ręcznie jednym kliknięciem:

1. Otwórz swoje repozytorium na GitHubie w przeglądarce.
2. Kliknij zakładkę **Actions** (Akcje) na górnym pasku.
3. W lewej kolumnie wybierz **„Build Android APK (CogniAgent v2)”**.
4. Po prawej stronie kliknij przycisk **„Run workflow”** ➔ wybierz gałąź `main` ➔ kliknij zielony przycisk **Run workflow**.

Proces kompilacji trwa zazwyczaj od 3 do 5 minut (maszyna wirtualna Ubuntu pobiera SDK Androida, kompiluje Reacta, generuje projekt natywny Capacitor i buduje plik APK przez Gradle).

---

## 📥 Krok 3: Pobranie pliku APK na telefon Huawei P30 Pro

1. Po zakończeniu zadania (zielony ptaszek ✅) kliknij w szczegóły wykonanego zadania w zakładce **Actions**.
2. Zjedź na sam dół strony do sekcji **Artifacts** (Artefakty).
3. Kliknij link **`CogniAgent-v2-debug-apk`** – pobierze się archiwum `.zip` zawierające plik `CogniAgent-v2-debug.apk`.
4. Rozpakuj plik i prześlij go na telefon (np. przez Telegram, Google Drive, Bluetooth lub pobierz bezpośrednio przez przeglądarkę w telefonie z GitHuba).

---

## 📲 Krok 4: Instalacja i pierwsze uruchomienie na Huawei P30 Pro

1. Dotknij pliku `CogniAgent-v2-debug.apk` w menedżerze plików telefonu.
2. Jeśli pojawi się ostrzeżenie o instalacji z nieznanych źródeł, wybierz:
   - **„Zezwalaj z tego źródła”** (Bezpieczne w telefonach Huawei / EMUI).
3. Po zainstalowaniu i uruchomieniu aplikacji zezwól na:
   - 🎙️ **Mikrofon** (do ciągłego nasłuchu mowy i przerywania Barge-In),
   - 📷 **Aparat** (do modułu Gemini Live Vision w czasie rzeczywistym),
   - ⚡ **Rysowanie nad innymi aplikacjami** (`SYSTEM_ALERT_WINDOW`) – dzięki temu pływający dymek z animowaną wstęgą będzie działał nad WhatsAppem i pulpitem telefonu!

---

## 🛠️ Zawartość konfiguracji w repozytorium

- **`.github/workflows/build-apk.yml`**: Skrypt automatyzacji CI/CD w chmurze GitHub.
- **`capacitor.config.json`**: Główna konfiguracja pakera Capacitor (identyfikator `com.cogniagent.app`, nazwa, obsługa https/cleartext).
- Automatyczne wstrzykiwanie uprawnień Androida do pliku `AndroidManifest.xml` (Kamera, Mikrofon, Latarka, Wibracje, Overlay).
