# KuroStudio Project Roadmap & Task Matrix

Tracking implementation progress against the [KuroStudio PRD](./KuroStudio_PRD.md).

---

## 📌 Phase 0 — Foundation & Architecture Setup
- [ ] **Task 0.1:** Git repository initialization, branching strategy (`main`, `develop`, feature branches).
- [ ] **Task 0.2:** Monorepo workspace structure setup (`packages/shared`, `packages/project-format`, `packages/editor-core`, `apps/desktop`).
- [ ] **Task 0.3:** Shared primitives: Time tick mathematics, stable ID generation, error definitions.
- [ ] **Task 0.4:** Strict TypeScript configurations and package boundaries.

---

## 📌 Phase 1 — Vertical Slice: Project Manifest & Canonical Command Core
- [ ] **Task 1.1:** `project-format`: Zod schemas and TypeScript types for `Project`, `Track`, `Clip`, `AssetReference`, `ExportSettings`.
- [ ] **Task 1.2:** `project-format`: Atomic serialization, disk save/load, migration framework, and `.assets/` directory layout.
- [ ] **Task 1.3:** `editor-core`: Command Bus architecture (`ICommand`, `CommandContext`, `CommandResult`).
- [ ] **Task 1.4:** `editor-core`: Core timeline commands (`AddClipCommand`, `SplitClipCommand`, `TrimClipCommand`, `MoveClipCommand`, `DeleteClipCommand`).
- [ ] **Task 1.5:** `editor-core`: Transaction manager and Undo/Redo history stack.
- [ ] **Task 1.6:** Desktop shell and basic single-clip import & timeline inspection slice.

---

## 📌 Phase 2 — Multi-Track Timeline & Audio Subsystem
- [ ] **Task 2.1:** Multi-track timeline model (Video, Audio, Overlay tracks).
- [ ] **Task 2.2:** Timeline UI state interactions (selection, snapping, playhead scrub, zoom).
- [ ] **Task 2.3:** Audio engine primitives (volume, mute, solo, fade in/out curves).
- [ ] **Task 2.4:** Built-in transitions & visual effects schema (hard cut, fade, cross-dissolve, brightness/contrast).
- [ ] **Task 2.5:** Autosave engine & missing media relinking detector.

---

## 📌 Phase 3 — Media Engine & Authoritative FFmpeg Export
- [ ] **Task 3.1:** Background FFprobe worker for media metadata extraction.
- [ ] **Task 3.2:** Waveform generation and thumbnail caching pipeline.
- [ ] **Task 3.3:** Proxy media generation for high-resolution sources.
- [ ] **Task 3.4:** FFmpeg timeline filter graph builder (composition, scaling, audio mix).
- [ ] **Task 3.5:** Export manager and render queue with cancellation, verification, and progress reporting.

---

## 📌 Phase 4 — Remotion Bridge
- [ ] **Task 4.1:** Remotion scene template definition schema (titles, lower-thirds, text animations).
- [ ] **Task 4.2:** Sandboxed Remotion renderer child process with restricted permissions.
- [ ] **Task 4.3:** Generated media asset insertion into timeline tracks.
- [ ] **Task 4.4:** Scene regeneration and prop editing workflows.

---

## 📌 Phase 5 — Kuro AI Core & Multi-Provider Adapters
- [ ] **Task 5.1:** `AIProviderAdapter` interface and secret management via OS `safeStorage`.
- [ ] **Task 5.2:** Cloud provider adapters: OpenAI, Anthropic Claude, Google Gemini, OpenAI-compatible.
- [ ] **Task 5.3:** Local model adapter: Ollama integration and connectivity probe.
- [ ] **Task 5.4:** Capability registry, task routing, retry backoff, and ordered fallback engine.
- [ ] **Task 5.5:** KuroAgent tool registry (inspection tools, timeline editing tools, audio tools).
- [ ] **Task 5.6:** Agent execution policies: Review Mode (plan & approval) vs. Direct Mode (low/medium risk auto-execute).
- [ ] **Task 5.7:** Multi-language prompt support (English & Arabic intent parsing).

---

## 📌 Phase 6 — Official Store & Asset Packs
- [ ] **Task 6.1:** Official Store catalog schema and remote manifest fetching.
- [ ] **Task 6.2:** Asset pack package verification (SHA-256 checksums, path traversal protection).
- [ ] **Task 6.3:** Asset installation, update, and removal inside project/application assets.

---

## 📌 Phase 7 — Windows Beta Hardening & Release Packaging
- [ ] **Task 7.1:** Electron security hardening (`contextIsolation`, strict CSP, protocol handler).
- [ ] **Task 7.2:** Diagnostics & privacy-preserving error reporting bundle.
- [ ] **Task 7.3:** Windows 10 x64 standalone installer (`electron-builder`).
- [ ] **Task 7.4:** Five-tester validation and end-to-end smoke testing.
