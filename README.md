# KuroStudio

> **Desktop video editor with an integrated multi-provider AI agent (Kuro).**  
> Combines manual timeline editing with programmatic scene generation (Remotion) and an AI copilot operating the editor through a unified command system.

---

## 🌟 Core Pillars

1. **Equal Manual & AI Workflows:** Every essential edit is natively available in the UI; the AI agent drives the same editor command bus.
2. **Canonical Project Architecture:** Driven by a typed `.kuro` JSON manifest and sibling `.assets/` bundle, using integer timeline ticks for precision.
3. **Provider-Agnostic AI (BYOK):** Seamless support for OpenAI, Google Gemini, Anthropic Claude, Ollama (local), and OpenAI-compatible endpoints with capability-aware routing and fallback.
4. **Local-First & Secure:** Media stays on the user's workstation. API keys are safely encrypted using OS-level secure storage (`safeStorage`). Strict Electron security boundaries with zero direct Node access from the UI.
5. **Remotion Integration:** Programmatic motion graphics, lower thirds, and titles rendered cleanly as intermediate clips on the timeline.
6. **Authoritative Export:** Interactive preview utilizes lightweight canvas/WebGL compositing; final exports are composed via background FFmpeg filter graphs.

---

## 🏗️ Architecture Overview

```text
kurostudio/
├── apps/
│   └── desktop/                  # Electron main, preload bridge, and React renderer UI
└── packages/
    ├── shared/                   # Shared types, error definitions, ID generators, time math
    ├── project-format/           # Canonical .kuro schemas (Zod), migrations, atomic persistence
    ├── editor-core/              # Command bus, transaction engine, undo/redo stack
    ├── timeline-ui/              # Multi-track timeline, playhead, scrubbing, interaction logic
    ├── preview-engine/           # In-app canvas/WebGL preview compositor
    ├── media-engine/             # FFmpeg/FFprobe background workers, proxy & waveform caches
    ├── audio-engine/             # Audio tracks, gain/fades, and playback synchronization
    ├── ai-core/                  # Kuro agent, task planner, tool registry, execution policy
    ├── ai-providers/             # Adapters for OpenAI, Gemini, Claude, Ollama, OpenAI-compatible
    ├── remotion-bridge/          # Sandboxed Remotion scene generator and renderer
    ├── store/                    # Official KuroLabs asset packs catalog and installer
    └── design-system/            # UI components and theme tokens
```

---

## 🚀 Development Workflow & Standards

- **Git Branching Strategy:**
  - `main`: Production-ready release branch.
  - `develop`: Ongoing integration branch.
  - `feat/<phase>-<description>`: Feature branches.
  - `fix/<issue>`: Bug fix branches.
- **Commit Conventions:** Conventional commits (`feat:`, `fix:`, `refactor:`, `test:`, `chore:`, `docs:`).
- **Type Safety:** 100% strict TypeScript. No loose `any` types. Schemas enforced with Zod at runtime.
- **Commands & Invariants:** UI and AI must always dispatch through the same domain commands in `editor-core`.

---

## 📋 Implementation Roadmap

See [ROADMAP.md](./ROADMAP.md) for the active task matrix, phased delivery milestones, and acceptance status.
