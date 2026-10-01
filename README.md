# CogniAgent v2

Zaawansowany asystent głosowy i tekstowy z hybrydowym lokalnym silnikiem NLU (zoptymalizowanym dla procesora Kirin 980 / silnik regułowy) oraz integracją z modelami w chmurze LLM (OpenRouter / OpenAI).

## Funkcje aplikacji

1. **Czat AI (Czat kognitywny)**:
   - Rozpoznawanie mowy (STT) z neonowym wizualizatorem audio i analizą RMS
   - Ciągły nasłuch słowa kluczowego („Hej Cogni”)
   - Synteza mowy (TTS) w języku polskim z regulacją tempa i tonu
   - Szybkie chipy sugerowanych poleceń i odczyt ekranu
   - Historia wiadomości z etykietami wywołań narzędzi sprzętowych

2. **Kreator Makr i Umiejętności (Rutyny)**:
   - Definiowanie sekwencji akcji (`SPEAK`, `OPEN_APP`, `DELAY`, `CLICK_NODE`, `TOGGLE_HARDWARE`, `SWIPE_SCREEN`, `TAP_COORDINATE`, `SUMMARIZE_SCREEN`, `SET_TIMER`, `SET_ALARM`, `SET_VOLUME`)
   - Powiązywanie wyzwalaczy sprzętowych (np. podłączenie/odłączenie ładowarki)
   - Eksport i import konfiguracji rutyn w formacie JSON

3. **Konfiguracja i Diagnostyka**:
   - Panel telemetrii rdzeni procesora Kirin 980, statystyki czasu inferencji i zaoszczędzonych tokenów
   - Menedżer modeli offline NLU (wagi ONNX) z symulacją pobierania
   - Konfiguracja klucza API i punktu końcowego chmury LLM wraz z testem połączenia
   - Diagnostyka stanu sprzętu: bateria, latarka LED, Bluetooth, usługa dostępności
   - Pływający dymek asystenta (widget Floating Head)

## Uruchomienie

Projekt został przepisany z Androida na React + Vite + Tailwind CSS.

```bash
npm install
npm run dev
```
