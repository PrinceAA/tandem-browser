# Tandem Browser — TODO & Roadmap

> Twee trappen, één fiets. 🚲

---

## Phase 1: Core ✅ DONE
> Fundament staat. Browser werkt, API draait, stealth is actief.

- [x] Electron browser met Chromium webview
- [x] HTTP API op localhost:8765
- [x] 13 endpoints: navigate, click, type, screenshot, page-content, page-html, execute-js, cookies, scroll, wait, links, forms, copilot-alert, status
- [x] Anti-detect stealth layer (UA, headers, navigator patches)
- [x] Persistent sessions (`persist:tandem` — cookies overleven restart)
- [x] Copilot alert systeem (macOS notification + in-browser overlay)
- [x] URL bar met smart input (zoeken of navigeren)
- [x] Donker thema UI

---

## Phase 2: Tandem Experience 🔄 ACTIEF
> Dit is wat Tandem Tandem maakt. Zonder dit is het gewoon weer een browser.

### 2.1 Tabs & Tab Groups
- [ ] Meerdere tabs openen/sluiten/wisselen
- [ ] Tab bar met favicon + titel
- [ ] Tab groups met kleuren (bijv. 🔵 Werk, 🟢 Research)
- [ ] API: `POST /tabs/open`, `POST /tabs/close`, `GET /tabs/list`
- [ ] API: `POST /tabs/group` — tabs groeperen
- [ ] Keyboard shortcuts: Cmd+T (nieuw), Cmd+W (sluit), Cmd+1-9 (wissel)

### 2.2 Split Window + Kees Paneel
- [ ] Rechter paneel: Kees control panel (resizable)
- [ ] Activity log — real-time feed van Robin's acties (navigatie, clicks, scrolls)
- [ ] Chat interface — Robin typt/praat, Kees antwoordt
- [ ] Screenshot preview — laatste snapshots met annotaties
- [ ] Toggle: Cmd+K paneel open/dicht
- [ ] API: `GET /activity-log` — stream van user events
- [ ] API: `POST /panel/toggle`, `POST /panel/resize`

### 2.3 Draw/Annotatie Tool 🖍️
- [ ] Transparante canvas overlay bovenop webview
- [ ] Tools: pijlen, cirkels, rechthoeken, vrije lijn, tekst labels
- [ ] Kleuren: rood (default), geel, groen, blauw
- [ ] Toggle: Cmd+D draw mode aan/uit
- [ ] "📸 Snap voor Kees" knop — screenshot MET annotaties
- [ ] Annotaties verdwijnen na snap (of handmatig wissen)
- [ ] API: `GET /screenshot/annotated` — laatste geannoteerde screenshot
- [ ] Opslag: `~/.tandem/screenshots/` met timestamp

### 2.4 Voice Input 🎙️
- [ ] Web Speech API integratie (nl-BE)
- [ ] Hotkey: Cmd+M → start/stop luisteren
- [ ] Live transcriptie in Kees paneel
- [ ] Auto-send na stilte (of handmatig met Enter)
- [ ] Visuele indicator: 🔴 pulserende dot wanneer actief
- [ ] Combi: voice + annotated screenshot = één bericht naar Kees
- [ ] API: `POST /voice/message` — ontvang voice transcriptie
- [ ] Later: Whisper lokaal als offline fallback

### 2.5 Live Co-Pilot Feed 👁️
- [ ] Event tracking: elke navigatie, click, scroll, form input → log
- [ ] DOM change detection — meld wat er veranderd is
- [ ] Auto-snapshot bij belangrijke events (navigatie, form submit)
- [ ] API: `GET /watch` — polling endpoint voor Kees
- [ ] API: `WS /watch/live` — WebSocket stream (later)

### 2.6 Behavioral Learning 🧬
- [ ] Observation layer: track mouse, clicks, scroll, keypress via Electron events
- [ ] Raw data opslag: `~/.tandem/behavior/raw/`
- [ ] Profiel compiler: statistische analyse na ~1 week data
- [ ] Typing bigram timing model (per toets-paar interval)
- [ ] Mouse path Bézier curve templates
- [ ] Scroll pattern model (snelheid + pauze distributie)
- [ ] Click hesitatie model (hover → click delay)
- [ ] Dagritme variatie (correlatie tijd ↔ snelheid)
- [ ] Per-site gedragsclusters
- [ ] Replay engine: sample uit profiel bij automated acties
- [ ] Profiel: `~/.tandem/behavior/robin-profile.json`
- [ ] Fallback: gaussian defaults als profiel nog leeg

---

## Phase 3: Echte Browser Features 📦
> Van "tool" naar "dagelijkse browser".

### 3.1 Data Import
- [ ] Chrome bookmarks import (JSON parse van `~/Library/Application Support/Google/Chrome/Default/Bookmarks`)
- [ ] Chrome cookies import
- [ ] Chrome geschiedenis import
- [ ] Firefox import (optioneel)

### 3.2 Wachtwoorden & Autofill
- [ ] Lokale password database (SQLite + AES-256-GCM)
- [ ] Master password bij eerste keer
- [ ] Autofill login formulieren
- [ ] Password generator
- [ ] API: `GET /passwords/suggest` — credentials voor huidige site
- [ ] Nooit cloud sync — alles lokaal

### 3.3 Browser Basics
- [ ] Download manager
- [ ] Geschiedenis met zoekfunctie
- [ ] Bookmarks bar + manager
- [ ] Find in page (Cmd+F)
- [ ] Zoom in/out (Cmd+/-)
- [ ] Print / PDF export

---

## Phase 4: Advanced Stealth 🔒
> Onzichtbaar voor elke detectie.

- [ ] Canvas fingerprint randomisatie
- [ ] WebGL renderer/vendor spoofing
- [ ] Font enumeration masking
- [ ] AudioContext fingerprint spoofing
- [ ] Proxy support (SOCKS5/HTTP, per-tab of globaal)
- [ ] Request interception (headers wijzigen/blokkeren)
- [ ] TLS/JA3 fingerprint matching
- [ ] Timing humanisatie (random delays 50-200ms bij automated actions)
- [ ] Screen resolution spoofing
- [ ] Battery API masking
- [ ] Geolocation spoofing (optioneel)

---

## Phase 5: OpenClaw Integratie 🤖
> Tandem als native tool voor Kees.

- [ ] OpenClaw Skill package (`tandem-browser` skill)
- [ ] Smart content extraction (artikel, profiel, product → structured JSON)
- [ ] Turndown integration (HTML → clean markdown)
- [ ] Multi-step workflow engine (keten van acties)
- [ ] Login state manager (per-site sessies)
- [ ] Session recording & replay
- [ ] Scheduled browsing (cron: check elke ochtend of X veranderd is)

---

## Phase 6: Polish & Distribution 🚀
> Van project naar product.

- [ ] Multi-profile support (gescheiden browse contexten)
- [ ] Keyboard shortcuts overzicht (Cmd+?)
- [ ] Themes (donker/licht/custom)
- [ ] Auto-updater (electron-updater)
- [ ] DMG build (macOS)
- [ ] AppImage build (Linux)
- [ ] Documentatie site
- [ ] Onboarding flow (eerste keer openen)

---

## Architectuur Notities

```
~/Documents/dev/tandem-browser/
├── src/
│   ├── main.ts              # Electron main process
│   ├── preload.ts            # Context bridge
│   ├── api/server.ts         # Express API (localhost:8765)
│   └── stealth/manager.ts    # Anti-detect patches
├── shell/
│   └── index.html            # Browser UI
├── PROJECT.md                # Visie & architectuur
├── TODO.md                   # ← dit bestand
├── README.md                 # Quick start & API docs
└── package.json
```

**GitHub:** `hydro13/tandem-browser` (privé)
**Stack:** Electron + TypeScript + Express
**Filosofie:** Robin = ogen & handen, Kees = brein & motor

---

*Laatst bijgewerkt: 11 februari 2026*
