# Design: Sidebar Infrastructuur (Fundament)

> **Datum:** 2026-02-28
> **Status:** Ter review door Robin
> **Effort:** Medium (3-5 dagen)
> **Prioriteit:** #0 — dit is het fundament voor alle andere sidebar features

---

## Probleem / Motivatie

Tandem heeft momenteel **geen linker sidebar**. Workspaces, Messengers, Pinboards, Personal News, Bookmarks, History en Downloads zijn afzonderlijk ontworpen zonder gedeeld fundament. Als we ze los bouwen, krijgt elke feature zijn eigen ad-hoc icon strip — dat wordt chaos.

Opera heeft dit goed opgelost: één uniforme sidebar met een plug-in systeem. Alle features registreren zich daarin. Configureerbaar, drag-to-reorder, enable/disable.

---

## Huidige layout van Tandem

```
<body> (flex column)
├── .tab-bar            ← tabs + menu knop
├── .toolbar            ← adresbalk, knoppen
├── .bookmarks-bar      ← bookmarks bar
└── .main-layout        ← flex row
      ├── .browser-content   ← flex:1, webviews
      └── .copilot-panel     ← rechts, AI panel
```

**Doel:** `.sidebar` toevoegen als EERSTE kind van `.main-layout`:

```
└── .main-layout        ← flex row
      ├── .sidebar           ← NIEUW: links, 48px (icon) of 240px (panel open)
      ├── .browser-content   ← flex:1, webviews (ongewijzigd)
      └── .copilot-panel     ← rechts, ongewijzigd
```

---

## Sidebar Layout

```
┌────────────────────────────────────────────────────────────┐
│ .tab-bar                                                   │
│ .toolbar                                                   │
│ .bookmarks-bar                                             │
├──────┬──────────────────────────────────────┬─────────────┤
│      │                                      │             │
│ 48px │      .browser-content (flex:1)       │   Copilot   │
│      │                                      │   Panel     │
│ side │                                      │   (rechts)  │
│ bar  │                                      │             │
│      │                                      │             │
└──────┴──────────────────────────────────────┴─────────────┘
```

Met open sidebar panel (bijv. Bookmarks):

```
├──────┬────────────────┬───────────────────────┬───────────┤
│ 48px │  240px panel   │   .browser-content    │  Copilot  │
│ icons│  (bijv. Books) │   (verkleint mee)     │  Panel    │
└──────┴────────────────┴───────────────────────┴───────────┘
```

---

## Sidebar Items (definitieve lijst, besloten 2026-02-28)

| # | Item | Type | Panel inhoud |
|---|------|------|-------------|
| 1 | Workspaces | Panel | Lijst van workspaces, switch/create/delete |
| 2 | Messengers | Webview | WhatsApp/Telegram/Discord/Slack/Instagram/X (sub-iconen) |
| 3 | Personal News | Panel | RSS/Atom feeds, geconfigureerde bronnen |
| 4 | Pinboards | Panel | Pinboard manager (borden + items) |
| 5 | Bookmarks | Panel | Bookmark tree, quick access |
| 6 | History | Panel | Zoekbare browse history |
| 7 | Downloads | Panel | Download manager lijst |

**Niet in sidebar:** Copilot AI Panel (blijft rechts, eigen toggle knop)

---

## Technische Architectuur

### Item Types

```typescript
type SidebarItemType = 'panel' | 'webview';

interface SidebarItem {
  id: string;           // 'workspaces' | 'messengers' | 'news' | etc.
  label: string;        // "Workspaces"
  icon: string;         // emoji of SVG path
  type: SidebarItemType;
  enabled: boolean;
  order: number;
}

interface SidebarConfig {
  items: SidebarItem[];
  narrowMode: boolean;  // alleen iconen zichtbaar (geen labels)
  activeItemId: string | null; // welk panel staat open
}
```

### Opslag
- Config: `~/.tandem/sidebar-config.json`
- Standaard volgorde: Workspaces → Messengers → Personal News → Pinboards → Bookmarks → History → Downloads

### Nieuwe bestanden

| Bestand | Verantwoordelijkheid |
|---------|---------------------|
| `src/sidebar/manager.ts` | `SidebarManager` — config load/save, item registratie |
| `src/api/routes/sidebar.ts` | REST endpoints voor config + item status |

### Bestaande bestanden aanpassen

| Bestand | Aanpassing | Functie |
|---------|-----------|---------|
| `src/api/server.ts` | `sidebarManager` toevoegen | `TandemAPIOptions`, `class TandemAPI` |
| `src/main.ts` | Manager instantiëren + cleanup | `startAPI()`, `app.on('will-quit')` |
| `shell/index.html` | Sidebar HTML toevoegen | `<!-- Main layout -->` sectie |
| `shell/css/main.css` | Sidebar CSS | `.main-layout` sectie |

---

## API Endpoints

| Methode | Endpoint | Beschrijving |
|---------|---------|--------------|
| GET | `/sidebar/config` | Huidige config (items + volgorde + narrowMode) |
| POST | `/sidebar/config` | Config updaten (volgorde, narrowMode) |
| POST | `/sidebar/items/:id/toggle` | Item enable/disable |
| POST | `/sidebar/items/:id/activate` | Panel openen/sluiten |
| GET | `/sidebar/items` | Lijst alle geregistreerde items |

---

## Shell UI Gedrag

### Icon strip (altijd zichtbaar, 48px breed)

- Verticale lijst van enabled sidebar items als icon knoppen
- Active item: gemarkeerd met accent kleur
- Klikken = toggle panel open/dicht
- Narrow mode: alleen icoon + tooltip on hover
- Onderaan: ⚙️ knop voor sidebar customization (drag-to-reorder, enable/disable)

### Panel container (uitschuifbaar, 240px)

- Verschijnt rechts van icon strip, links van browser content
- Inhoud wordt gerenderd door het actieve item (bijv. Bookmarks)
- Sluit bij klik op hetzelfde icoon of Escape
- Elke fase vult zijn eigen panel in

### Sidebar customization mode (⚙️)

- Items worden sleepbaar (drag-to-reorder)
- Toggle switches voor enable/disable
- Narrow mode toggle
- Opgeslagen via POST `/sidebar/config`

---

## Fase-opdeling

| Fase | Inhoud | Wat Claude Code bouwt |
|------|--------|----------------------|
| **1** | SidebarManager + config API | `src/sidebar/manager.ts` + routes + manager wiring |
| **2** | Shell UI: icon strip + leeg panel container | HTML + CSS + JS voor icon strip, panel toggle, animaties |
| **3** | Eerste echte plugin: Bookmarks | Bookmarks panel als bewijs dat het systeem werkt |

Na Fase 3 is het fundament klaar en bouwen we per feature een panel (Workspaces, Messengers, etc.) als losse Claude Code sessies.

---

## Risico's / Valkuilen

- **Browser content moet verkleinen:** als sidebar panel opengaat, moet `.browser-content` mee krimpen. Dit doet de Electron main process (setBounds op de BrowserView). De shell communiceert via IPC welke breedte de sidebar inneemt.
- **Webview items (Messengers):** hebben eigen persistente partities — dat is Fase Messengers, niet hier.
- **Drag-to-reorder:** HTML5 drag-and-drop is voldoende voor Fase 2; geen library nodig.

---

## Beslissingen genomen

- [x] Sidebar infrastructuur vóór individuele features
- [x] Items: Workspaces, Messengers, Personal News, Pinboards, Bookmarks, History, Downloads
- [x] Personal News: WEL bouwen (Robin's keuze 2026-02-28)
- [x] Rechter copilot panel blijft intact — apart systeem
- [x] Narrow mode (48px icon-only): ja
- [x] Drag-to-reorder in customization mode: ja

## Open vragen voor Robin

- [ ] Sidebar altijd zichtbaar (zelfs als alle panels dicht zijn)? Of verberg de 48px strip ook via toggle?
- [ ] Narrow mode als default, of breed (met labels) als default?
- [ ] Welk icoon voor elk item? (emoji voldoende of SVG gewenst?)
