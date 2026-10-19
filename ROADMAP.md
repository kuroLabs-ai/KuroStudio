# KuroStudio Project Roadmap & Core Task Matrix

Tracking implementation progress against the [KuroStudio PRD](./KuroStudio_PRD.md).

---

## 📌 Phase 0 — Foundation & Architecture Setup
- [x] **Task 0.1:** Git repository initialization, branching strategy (`main`, `develop`, feature branches).
- [x] **Task 0.2:** Monorepo workspace structure setup (`packages/*`, `apps/*`).
- [x] **Task 0.3:** Shared primitives: Time tick mathematics, stable ID generation, error definitions.
- [x] **Task 0.4:** Strict TypeScript configurations and package boundaries.

---

## 📌 Phase 1 — Vertical Slice: Project Manifest & Canonical Command Core
- [x] **Task 1.1:** `project-format`: Types and schemas for `Project`, `Track`, `Clip`, `AssetReference`, `ExportSettings`.
- [x] **Task 1.2:** `project-format`: Atomic serialization, disk save/load, migration framework, and `.assets/` directory layout.
- [x] **Task 1.3:** `editor-core`: Command Bus architecture (`ICommand`, `CommandContext`, `CommandResult`).
- [x] **Task 1.4:** `editor-core`: Core timeline commands (`AddClipCommand`, `SplitClipCommand`, `TrimClipCommand`, `MoveClipCommand`, `DeleteClipCommand`).
- [x] **Task 1.5:** `editor-core`: Transaction manager and Undo/Redo history stack.
- [x] **Task 1.6:** Desktop shell and single-clip import & timeline inspection slice.

---

## 📌 Phase 2 — Multi-Track Timeline & Audio Subsystem
- [x] **Task 2.1:** Multi-track timeline model (Video, Audio, Overlay tracks).
- [x] **Task 2.2:** Timeline state interactions (selection, snapping, playhead scrub, zoom).
- [x] **Task 2.3:** Audio engine primitives (volume, mute, solo, fade in/out curves, panning laws).
- [x] **Task 2.4:** Built-in transitions & visual effects schema (hard cut, fade, cross-dissolve, brightness/contrast/saturation).
- [x] **Task 2.5:** Autosave engine & missing media relinking detector.

---

## 📌 Phase 3 — Media Engine & Authoritative FFmpeg Export
- [x] **Task 3.1:** Background FFprobe metadata schema and probing contracts.
- [x] **Task 3.2:** Waveform generation and thumbnail caching pipeline.
- [x] **Task 3.3:** Proxy media generation for high-resolution sources.
- [x] **Task 3.4:** FFmpeg timeline filter graph builder (multi-track composition, scaling/padding, audio mixing, fades).
- [x] **Task 3.5:** Export manager and render queue state machine with cancellation, verification, and progress reporting.

---

## 📌 Phase 4 — Remotion Bridge
- [x] **Task 4.1:** Remotion scene template definition schema (titles, lower-thirds, outro animations).
- [x] **Task 4.2:** Remotion scene prop validation and security bounds.
- [x] **Task 4.3:** Generated media asset insertion into timeline tracks.
- [x] **Task 4.4:** Scene regeneration and prop editing workflows.

---

## 📌 Phase 5 — Kuro AI Core & Multi-Provider Adapters
- [x] **Task 5.1:** `AIProviderAdapter` interface and secret management contract.
- [x] **Task 5.2:** Cloud provider adapters: OpenAI, Anthropic Claude, Google Gemini, OpenAI-compatible.
- [x] **Task 5.3:** Local model adapter: Ollama integration and connectivity probe.
- [x] **Task 5.4:** Capability registry, task routing, retry backoff, and ordered fallback engine.
- [x] **Task 5.5:** KuroAgent tool registry (inspection tools, timeline editing tools, audio tools, visual effects).
- [x] **Task 5.6:** Agent execution policies: Review Mode (plan & approval) vs. Direct Mode (low/medium risk auto-execute).
- [x] **Task 5.7:** Multi-language prompt support (English & Arabic intent parsing).

---

## 📌 Phase 6 — Official Store & Asset Packs
- [x] **Task 6.1:** Official Store catalog schema and remote manifest definition.
- [x] **Task 6.2:** Asset pack package verification (SHA-256 checksums, path traversal protection, executable rejection).
- [x] **Task 6.3:** Asset installation, update, and removal inside project/application assets.

---

## 📌 Phase 7 — Windows Beta Hardening & Release Packaging
- [x] **Task 7.1:** Electron security hardening (`contextIsolation`, strict CSP, secret management via OS `safeStorage`).
- [x] **Task 7.2:** Diagnostics & privacy-preserving error reporting bundle.
- [x] **Task 7.3:** Windows 10 x64 standalone installer configuration (`electron-builder`).
- [x] **Task 7.4:** Five-tester validation and end-to-end integration test suite.

---

🎯 **Status:** Core architectural implementation complete. Proceeding to **[UI_ROADMAP.md](./UI_ROADMAP.md)** for Electron + React + Vite application interface.
