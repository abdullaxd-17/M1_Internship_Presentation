# LoRa-Based Telemetry System — Internship Defense Presentation
### Solar-Powered EPS & THC Board · CSUG / Université Grenoble Alpes
**Author:** Abdullah Basit · **Supervisors:** Frédéric Martin, Lian-Corelli Apostol · 24 slides · ~21 min

Two deliverables: an **animated HTML presentation** (this folder) and a matching **PowerPoint** (`LoRa_Telemetry_Defense.pptx`, delivered separately — note: the .pptx still uses the *previous* slide order; ask me to regenerate it to match this new structure).

---

## 0. Latest revision (this version)
- **NEW — Slide 10 · "EPS — board realization".** The EPS now has its own PCB-photo + interactive-3D
  slide, built identically to the Solar and THC board slides (`eps_board.png` left, rotatable
  `PT-PWR-EPS-002_v1.glb` right). It sits right after the power-system slide, completing the EPS
  (Layer 2) arc. This closes the symmetry gap noted in earlier versions.
- **NEW — Slide 14 · "System integration — the assembled stack".** Placed after the THC board, it
  shows **EPS + THC mating into one PC-104 stack**: a left-to-right "EPS + THC → mated stack" strip,
  then a **single real 3D model of the two boards stacked** (EPS on the bottom, THC on top, joined by
  the PC-104 header). The 3D is **composed at runtime from the two real board models already in the
  deck** — so it adds *zero* file size and rotates like the others.
- ⚠️ **About `Assembly1.glb`:** the assembly file you uploaded is **empty** — it contains 2108
  placeholder nodes but **no geometry** (0 meshes, 0-byte binary chunk; a faulty export that saved
  the scene tree but none of the board bodies). It would have rendered a blank viewer, so it is **not**
  used. The assembly slide instead composes your two *valid* board models. If you later re-export a
  proper merged assembly `.glb` (non-empty), it can be dropped straight into the `viewerAsm` slot.
- Slide numbering re-flowed to **24 slides** (22 numbered + title + conclusion); the live **Overview**
  grid (key `O`) remains authoritative.

### Previous revision
- **Real institutional logos** in the top corners — **UGA on the left**, **CSUG on the right** — each set in a soft white rounded "chip" so the dark navy/blue marks stay crisp and legible against the deck's dark background.
- **Larger title-slide 3D Earth** (camera pulled in, stage enlarged) so the globe reads as the hero of the title without crowding the satellite orbit.
- **Title text refit** — the subtitle line ("for a Solar-Powered EPS & THC Board") is now sized and wrapped to sit cleanly under the main title at every screen width.
- **New slide #4 — "What makes this approach different"** (added per the speaker-guideline checklist: *single message → problem → solution → **how it's different** → outcome → conclusion*). It uses only material already in the deck (whole-chain integration, four observability checkpoints, one consolidated power path, and an honest note on remaining work). All later slide numbers shifted by one (now **22 slides**; live order is authoritative via the **Overview** grid, key `O`).

---

## 1. How to run
**Just double-click `index.html`.** Everything works offline with no setup — all slides, the
animations, the speaker notes, the live GUI mock-up, **and the rotating 3D board models**
(three.js + the models are bundled inside the folder). Press **F** for fullscreen.

| Key | Action |   | Key | Action |
|-----|--------|---|-----|--------|
| `→` / `Space` | Next | | `N` | Speaker **notes** + timing |
| `←` | Previous | | `T` | Presenter **timer** (dbl-click = reset) |
| `O` | **Overview** grid | | `F` | Fullscreen |

> A server is optional (`python -m http.server 8000`). On a machine with no WebGL, the 3D
> slides fall back to the static board image automatically.

---

## 2. Structure — flowchart → board (PCB + 3D), per subsystem

Each subsystem now follows **design flowchart → physical board (PCB photo + interactive 3D)**:

| # | Slide | Target | Cumulative |
|---|-------|-------:|-----------:|
| 1 | Title | 0:30 | 0:30 |
| 2 | Motivation — why it matters | 1:10 | 1:40 |
| 3 | System overview (full chain) | 1:15 | 2:55 |
| 4 | High-level architecture (2 paths) | 1:15 | 4:10 |
| 5 | **Solar — design flowchart** | 1:00 | 5:10 |
| 6 | **Solar — PCB photo + interactive 3D** | 0:55 | 6:05 |
| 7 | **EPS — design flowchart (BQ25798)** | 1:20 | 7:25 |
| 8 | **Power system — animated full flow** ✦NEW | 1:15 | 8:40 |
| 9 | **THC — design flowchart** | 1:20 | 10:00 |
| 10 | **THC — PCB photo + interactive 3D** | 0:55 | 10:55 |
| 11 | STM32 / firmware | 1:10 | 12:05 |
| 12 | LoRa communication chain | 1:10 | 13:15 |
| 13 | GUI & received data | 1:05 | 14:20 |
| 14 | Hardware integration | 0:55 | 15:15 |
| 15 | Testing & validation (4-point) | 1:10 | 16:25 |
| 16 | Challenges & solutions | 1:05 | 17:30 |
| 17 | Final working flow | 1:00 | 18:30 |
| 18 | Future improvements | 0:45 | 19:15 |
| 19 | Conclusion & Q&A | 0:45 | 20:00 |

Per-slide targets also show live in the notes drawer (`N`). Speaker notes are embedded in
every slide.

**What changed in this revision**
- Solar now leads with its **flowchart** (`solar_flow.png`), consistent with EPS & THC.
- Added a **Solar PCB + 3D** slide and a **THC PCB + 3D** slide (interactive `.glb`).
- Added a new **animated whole-power-system** diagram after EPS (flowing energy, glow dots).
- **Removed** the "Skills developed" slide and the old standalone "3D visualization" slide
  (3D now lives with each board).
- Upgraded the chain animations (travelling glow pulses).

---

## 3. Assets used per slide

| Slide | Visual |
|-------|--------|
| 5 Solar flowchart | `solar_flow.png` (design flow) |
| 6 Solar board | `solar_board.png` (PCB) + **3D** `Solar_Panel.glb` |
| 7 EPS flowchart | `eps_diagram.png` (BQ25798) |
| 8 Power system | native animated SVG diagram |
| **EPS board** (#10) | `eps_board.png` (PCB) + **3D** `PT-PWR-EPS-002_v1.glb` → key `eps` |
| 9 THC flowchart | `thc_diagram.png` (block diagram) |
| 10 THC board | `thc_board.png` (PCB) + **3D** `PCB1.glb` → key `pcb` |
| **Assembly** (#14) | `eps_board.png` + `thc_board.png` thumbs + **composed 3D** (`eps` + `pcb` stacked at runtime — no extra asset) |
| others | native SVG/CSS (chains, GUI mock, etc.) |

3D engine + models are bundled locally: `three.min.js`, `GLTFLoader.js`, `OrbitControls.js`,
and `models.js` (both `.glb` files embedded as base64 so they need no server).

---

## 4. EPS board PCB + 3D — now included
The EPS board now has its full **PCB photo + interactive 3D** slide (#10), so all three boards —
Solar, EPS, THC — follow the same *flowchart → realized board* pattern. The new **assembly slide**
(#14) then shows the EPS and THC mated into one stack.

> The rotating assembly is built by stacking your two real board models at runtime (EPS bottom,
> THC top, 4 mm clearance, centred on the shared 95 × 90 mm PC-104 footprint). If you re-export a
> single merged CAD assembly as a **non-empty** `.glb`, embed it under a new `assembly` key in
> `models.js` and point `#viewerAsm` at it with `data-model-key="assembly"` (remove `data-compose`)
> — everything else stays the same.

## 5. Other assumptions (from your report's wording)
- **GUI (slide 13)** is a *conceptual* dashboard — no GUI screenshot was provided — built to
  match the exact telemetry fields named in the report. Clearly labelled as conceptual.
- **Temperature front-end** shown as **AD7124-4 on the board / MAX31865-style in firmware**,
  with the alignment flagged as remaining work ("to be confirmed").
- **Power numbers** (4.2 V/3 A, 12.6 W) are presented as **design labels to be measured**.

## 6. Why the in-deck animation is hand-built (not Higgsfield)
The flowchart/diagram animations are native **SVG/CSS** because (a) Higgsfield outputs a video
that lives on its servers and can't be bundled into this *offline* file, and (b) an AI-generated
"power-system flowchart" would render wrong/garbled labels — unacceptable for a defense.
Higgsfield is the right tool for a **cinematic, label-free intro/background clip** instead;
ask and I'll generate one for you to download and drop into your title (note: the connector
returned "user not found" when I tried, so its generation account needs to be set up first).

## 7. Editing tips
- **Name / supervisors / dates:** slide 1 title block.
- **Swap in a real GUI screenshot** later: replace the `.gui-mock` block on the GUI slide.
- **Add the EPS board slide:** send the EPS PCB image + `EPS.glb`.


## Video playback note

YouTube Error 153 happens when the embedded YouTube player does not receive a valid referrer/origin from the page. For the most reliable result:

1. Do not open `index.html` directly from the file system.
2. Run the presentation through a local server:
   ```bash
   cd presentation_fixed
   python -m http.server 8000
   ```
   Then open `http://localhost:8000` in Chrome/Edge.
3. For guaranteed offline playback, download/export the demonstration as `demo_video.mp4` and place it in `presentation_fixed/assets/`. The slide will automatically use that local MP4 instead of YouTube.
4. If hosted online, make sure the server sends `Referrer-Policy: strict-origin-when-cross-origin` (not `no-referrer` or `same-origin`).
