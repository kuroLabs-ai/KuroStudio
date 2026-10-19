# KuroStudio — Product Requirements Document (PRD)

**Document status:** Implementation-ready product specification for the first Windows closed beta  
**Product name:** KuroStudio (working name; branding can change without affecting architecture)  
**Product type:** Desktop video editor with an integrated multi-provider AI agent  
**Initial platform:** Windows 10 x64  
**Beta cohort:** 5 invited users  
**Document audience:** Product owner, Antigravity/AI coding agents, frontend/backend engineers, QA, and release owner

---

## 1. Executive Summary

KuroStudio is a desktop video-editing application that combines manual editing with an AI agent capable of performing real operations inside the editor. It is intended to cover the core workflows that users expect from modern editors such as CapCut, Premiere Pro, and DaVinci Resolve, while differentiating itself through a model-agnostic AI layer and programmatically generated scenes using Remotion.

The AI agent, provisionally branded **Kuro** in the user interface and **KuroAgent** in internal module names, is **not only a Remotion code generator**. It must be able to inspect the current project and execute editor actions such as splitting, trimming, moving, deleting, and arranging clips; applying effects and transitions; adjusting audio; managing assets; generating Remotion scenes; previewing work; and initiating exports. All modifications must go through the same editor command system used by the UI so that validation, undo/redo, rollback, and project consistency work regardless of whether an action was initiated manually or by AI.

Users bring their own AI API keys and select the providers/models they have access to. Initial integrations are OpenAI, Google Gemini, Anthropic Claude, Ollama for local models, and a configurable OpenAI-compatible endpoint. KuroStudio provides provider adapters, capability-aware routing, ordered fallback, retries, health tracking, and task validation. It must not depend on a single AI company.

The first release is a **closed Windows beta for five users**, not a full feature-for-feature replacement for every professional editor. The beta must prove a stable, useful end-to-end workflow: import footage, edit a timeline manually, preview it, apply basic audio/effects, generate a Remotion scene, ask the AI agent to make real timeline changes, and export a video.

## 2. Product Vision

Make KuroStudio an extensible creative workstation where users can work manually or describe the result they want in natural language, and the application can safely turn that intent into inspectable, reversible editing operations.

### 2.1 Product principles

1. **Manual and AI workflows are equally important.** Every essential edit must remain possible through the UI; the AI is an additional way to control the same editor.
2. **The AI operates the editor, not just the chat.** A successful tool call must cause a real, observable project change.
3. **One canonical project state.** UI actions and AI actions use the same domain commands and validation.
4. **Provider independence.** AI functionality must not require a specific cloud vendor.
5. **Local-first project data.** Media and project files remain on the user's device unless the user deliberately chooses otherwise.
6. **Reversible changes.** Editing commands support undo/redo; multi-step AI edits are staged and applied transactionally where possible.
7. **Preview is not export.** The preview path is optimized for responsiveness; final rendering is a separate background pipeline.
8. **Safe extensibility.** Store assets and generated code are untrusted inputs until validated; plugins must not receive unrestricted desktop privileges.
9. **Ship a coherent beta, not a fake demo.** Every advertised feature in the beta must be implemented, validated, or clearly labeled as unavailable.

## 3. Target Users and Use Cases

### 3.1 Target users

- Creators who want a desktop editor with familiar timeline-based editing.
- Users who want to speed up repetitive editing by describing operations in natural language.
- Developers/designers who want to generate motion graphics and titles using Remotion.
- Users who want to use their own AI provider credentials and choose or change models.

### 3.2 Primary use cases

- Import videos, images, and audio files into a project.
- Arrange, split, trim, move, and delete clips across tracks.
- Adjust visual properties and apply basic effects/transitions.
- Mix audio tracks and adjust volume/fades.
- Ask the AI to make edits such as “split this clip at 10 seconds, remove the first section, and add a dissolve”.
- Ask the AI to generate a title sequence or motion graphic using Remotion and add it to the timeline.
- Review AI-generated editing plans before applying them, or enable direct execution for trusted/simple operations.
- Switch AI models after a provider error without losing project state.
- Export a finished video to a standard video format.
- Install official KuroStudio content packs from the in-app Store.

## 4. Goals and Non-Goals

### 4.1 Goals for the first beta

- Deliver a stable Windows desktop shell with secure Electron configuration.
- Support projects, asset import, timeline editing, preview, and export.
- Implement a functional AI agent that uses editor tools to modify actual project state.
- Support multiple cloud providers plus Ollama local models through a common provider interface.
- Provide configurable primary models, ordered fallback chains, and optional automatic routing.
- Integrate Remotion for AI-generated/programmatic scenes as timeline clips.
- Provide basic audio controls, a small set of effects/transitions, crash/error reporting, and beta feedback capture.
- Package a clean installer that works on a tester's machine without requiring Node.js or Python.

### 4.2 Non-goals for the first beta

- Full feature parity with Premiere Pro, DaVinci Resolve, or CapCut.
- A professional DAW replacement.
- Collaborative cloud editing or a cloud-hosted media project backend.
- Public third-party plugin publishing.
- Arbitrary third-party JavaScript plugin execution with desktop privileges.
- Guaranteed real-time playback of any codec/resolution/effect combination.
- Distributed cloud rendering.
- Automatic uploading of source footage to AI providers.
- macOS or Linux support in the first beta.

## 5. Confirmed Product Decisions

These are explicit requirements from the product owner and must be preserved:

- **Target hardware:** Medium and powerful PCs.
- **Editing approach:** Manual editing and AI editing have equal importance.
- **AI:** Both cloud and local models.
- **AI providers:** Users add their own API keys; examples include GPT/OpenAI, Gemini/Google, and Claude/Anthropic. KuroStudio must support model/provider switching and fallback on errors.
- **Agent scope and naming:** The agent can control the editor itself, not just generate Remotion scenes. Use **Kuro** as the concise user-facing name and **KuroAgent** for internal packages/services unless the product owner later chooses one name consistently.
- **Timeline approach:** Use suitable existing libraries where useful, with custom development for KuroStudio-specific timeline behavior.
- **Agent permissions:** Provide both direct-execution and review-before-apply modes.
- **Local runtime:** Ollama is the first supported local runtime.
- **Audio scope:** Start with essential editing features and expand in phases.
- **Store publishing:** Official KuroLabs/KuroStudio content only for the beta.
- **Beta:** Windows 10 x64 only, with five invited testers.

## 6. Resolved Defaults for Previously Unspecified Decisions

To make implementation actionable, this PRD selects the following defaults. These are implementation defaults, not claims that the product owner previously chose them. They can be revised deliberately later.

1. **Project format:** A versioned `project.kuro` JSON manifest plus a sibling asset directory `<ProjectName>.assets/`. Source footage can either remain in place (linked) or be copied into project-managed media. Generated scenes, thumbnails, proxies, and autosaves live in the asset directory. Missing media must be relinkable.
2. **Model routing:** Default to a user-configurable ordered preference/fallback list per task. Also provide an optional Auto mode. Auto mode can rank eligible models by capability, configured preference, health, latency, and user-defined cost priorities. Never bypass privacy choices.
3. **UI language:** English UI for the first beta, with internationalization structure in place. The AI must accept and respond to both English and Arabic prompts, including Egyptian Arabic where reasonably possible. Arabic UI and full RTL layout can follow after core beta validation.
4. **Preview:** Use an in-app preview compositor built from browser media primitives and canvas/WebGL where appropriate. Use proxies or reduced preview quality when necessary. Do not depend on FFmpeg alone for responsive interactive preview.
5. **Rendering:** Use FFmpeg for standard timeline composition/export and Remotion Renderer for Remotion-native scenes. Remotion scenes are rendered to media and inserted as generated clips in beta; live code-editable scenes on the timeline are a future enhancement.
6. **Project operations:** Every edit is represented as a typed command. Multi-command AI edits are validated and staged before application; apply as a transaction when supported. If an operation fails partway, revert all already-applied reversible commands in the same transaction.
7. **Store:** The beta Store distributes official asset packs (templates, titles, transitions, effects, LUTs, and other approved assets). It does not run arbitrary external plugin code. A versioned plugin SDK/runtime is a later phase.
8. **Beta OS support:** Windows 10 x64 is the only supported operating-system target for the initial beta. Do not advertise support for other Windows versions until they are separately evaluated and tested.
9. **First beta edit target:** Reliable 1080p editing/export is the primary acceptance target. 4K media may be imported and edited using proxies, but unrestricted real-time 4K playback is not a beta guarantee.
10. **Initial beta delivery:** A Windows x64 installer and a portable development build for internal QA. Public code signing and broad auto-update rollout can be completed before wider release.

### 6.1 Windows 10 platform requirement

- Build and validate the initial beta for Windows 10 x64.
- Use a maintained Electron release compatible with the supported Windows 10 environment; do not pin an obsolete runtime merely to support an unrequested legacy operating system.
- Verify installer behavior, media import, timeline editing, preview, export, AI provider requests, and crash recovery on clean Windows 10 test machines.
- Keep the editor domain/core reasonably independent from Electron-specific APIs to preserve future portability, without making other operating systems a beta requirement.

## 7. Product Scope and Main Screens

### 7.1 Main application areas

1. **Welcome / Project Hub**
   - Create a project, open an existing project, open recent projects, recover autosaves.
   - Show missing-media and recovery warnings.
2. **Editor Workspace**
   - Top bar: project name, save status, undo/redo, workspace controls, export.
   - Media Bin: imported footage, audio, images, generated scenes, and folders.
   - Preview Monitor: play/pause, frame stepping, timeline playhead, preview resolution, safe area/overlay toggles.
   - Timeline: video, audio, and overlay/graphics tracks; clip operations; zoom, scroll, snapping, playhead.
   - Inspector: selected clip properties, transforms, audio, effect parameters, speed, and source metadata where supported.
   - AI Assistant panel: prompt input, plan/execution timeline, model/provider status, approvals, undo, and result summary.
3. **AI Settings**
   - Provider setup, API keys, model list, model capability details, routing preferences, fallback, privacy, usage history, local Ollama connection.
4. **Export Dialog / Render Queue**
   - Resolution, FPS, quality/bitrate preset, audio options, output path, progress, cancellation, error detail, reveal output.
5. **Store**
   - Official content catalog, filters, details, compatibility, license/attribution metadata, install/update/remove.
6. **Settings / Diagnostics**
   - Performance, proxy/cache limits, autosave, privacy, logs, feedback and diagnostic bundle controls.

### 7.2 Layout behavior

- Core editor panels must be resizable and hideable.
- Keep the preview, timeline, and inspector discoverable; do not bury basic editing operations in menus.
- AI panel can be collapsed but remains one click away.
- Persist panel layout and last-open workspace.
- The UI must clearly distinguish a selected clip from the source file in the Media Bin.
- Long-running work must show progress and must not freeze the primary UI.

## 8. Core Functional Requirements

Priority definitions: **P0** = required to enter beta; **P1** = desirable for the beta if stable; **P2** = later enhancement.

### 8.1 Application foundation

- **FR-001 (P0):** Launch as a Windows desktop application without requiring Node.js or Python on the tester's computer.
- **FR-002 (P0):** Provide safe Open, Save, Save As, New Project, and Recent Projects flows.
- **FR-003 (P0):** Warn before destructive operations when unsaved changes exist.
- **FR-004 (P0):** Support autosave and recovery from a prior autosave after an unexpected close.
- **FR-005 (P0):** Keep file processing, AI calls, thumbnail generation, and rendering out of blocking UI work.
- **FR-006 (P0):** Display meaningful errors with a safe detail view and a copyable diagnostic code.

### 8.2 Asset import and management

- **FR-010 (P0):** Import common video, audio, and image files using the operating system file picker and drag-and-drop.
- **FR-011 (P0):** Probe media metadata (duration, resolution, frame rate, audio streams, codec where available) through FFprobe.
- **FR-012 (P0):** Generate thumbnails and audio waveforms asynchronously and cache them.
- **FR-013 (P0):** Allow users to choose between linking original files in place and copying assets into the project-managed media folder.
- **FR-014 (P0):** Detect missing files on project open and provide a relink workflow.
- **FR-015 (P1):** Organize Media Bin assets into folders/collections, search by filename, and mark favorites.
- **FR-016 (P1):** Generate proxy media for large files and allow switching between proxy/original for playback and export.
- **FR-017 (P0):** Never overwrite original imported media during edits or proxy generation.

### 8.3 Project model and persistence

- **FR-020 (P0):** Store project settings, assets, tracks, clips, effects, transitions, keyframes, Remotion scene references, and export defaults in a versioned `project.kuro` manifest.
- **FR-021 (P0):** Store generated scenes, thumbnails, waveform caches, proxy media, and autosaves under the associated assets directory.
- **FR-022 (P0):** Use stable unique IDs for every asset, track, clip, effect instance, transition, and AI operation.
- **FR-023 (P0):** Include a `schemaVersion` and a project migration strategy. Never silently corrupt or downgrade newer project files.
- **FR-024 (P0):** Save atomically using temporary files and replacement, and preserve a recoverable previous version.
- **FR-025 (P0):** Represent positions/durations as integer timeline ticks, not floating-point seconds. Derive display seconds and frames using the project timebase/FPS.
- **FR-026 (P0):** Provide project duplication/backup guidance, and document that a portable backup includes both the `.kuro` manifest and the asset folder.

### 8.4 Timeline editor

- **FR-030 (P0):** Support video, audio, and visual-overlay/graphics tracks.
- **FR-031 (P0):** Add clips to the timeline from the Media Bin by drag-and-drop.
- **FR-032 (P0):** Select one or multiple clips; move clips; trim clip start/end; split at the playhead; delete clips; duplicate clips.
- **FR-033 (P0):** Support timeline zoom, horizontal scrolling, playhead movement, snapping, and track mute/lock controls where applicable.
- **FR-034 (P0):** Implement undo/redo for all primary edits.
- **FR-035 (P0):** Support clip-level volume, opacity, position, scale, and basic rotation controls where technically feasible in the preview/export pipeline.
- **FR-036 (P1):** Support keyframes for selected transform/audio properties.
- **FR-037 (P1):** Support ripple delete and gap closing after acceptance tests verify that linked clips remain synchronized.
- **FR-038 (P0):** Preserve source in/out points separately from timeline position and duration.
- **FR-039 (P0):** Use a custom KuroStudio timeline data model and interaction layer while using maintained libraries for drag/drop, virtualized lists, state, and supporting UI as appropriate. Do not adopt a library that prevents required timeline semantics.
- **FR-040 (P0):** Ensure user-interface edits and AI-generated edits share the same commands, invariants, history, and validation path.

### 8.5 Preview and playback

- **FR-050 (P0):** Play, pause, seek, step frame-by-frame, and update the timeline playhead.
- **FR-051 (P0):** Preview the active timeline composition with basic multi-track video/graphics/audio behavior.
- **FR-052 (P0):** Provide proxy/low-resolution preview options and an automatic performance mode where preview quality can be reduced without changing export quality.
- **FR-053 (P0):** Keep playback state, timeline state, and clip boundaries synchronized to the best supported accuracy.
- **FR-054 (P0):** If preview playback cannot keep up, show dropped-frame/performance feedback or reduce preview quality instead of silently changing project timing.
- **FR-055 (P1):** Add loop playback for a selected range and safe-area guides.
- **FR-056 (P0):** Document that the preview may approximate some effects, while the final export is authoritative. Preview/export parity must be tested for every built-in effect.

### 8.6 Effects and transitions

- **FR-060 (P0):** Provide a minimal set of reliable built-in transitions: hard cut, fade to/from black, and cross-dissolve.
- **FR-061 (P0):** Provide basic visual adjustments such as brightness, contrast, saturation, and opacity, with adjustable values.
- **FR-062 (P1):** Add a small set of additional effects after the core render pipeline is stable (e.g. blur, crop, vignette, basic LUT support).
- **FR-063 (P0):** Effects and transitions use typed, versioned descriptors; effect settings must be serializable in the project format.
- **FR-064 (P0):** An effect not supported by preview or export must be disabled or clearly marked unsupported; never pretend it rendered.
- **FR-065 (P1):** Offer a preset system for saving/reusing effect settings.

### 8.7 Audio editing

- **FR-070 (P0):** Support audio tracks, mute, solo, volume, clip fades, and a basic visual waveform.
- **FR-071 (P0):** Keep audio synchronized with video throughout seek, preview, and export.
- **FR-072 (P1):** Add keyframe automation for volume and pan.
- **FR-073 (P1):** Add simple audio processing such as gain, fade, and optional basic EQ/compression after testing latency and export parity.
- **FR-074 (P2):** Advanced DAW-like routing, buses, automation lanes, mastering, and extensive plugin effects are future features, not beta promises.

### 8.8 Export and render queue

- **FR-080 (P0):** Export timeline projects to MP4 using a documented, legally reviewed FFmpeg build/configuration.
- **FR-081 (P0):** Provide 720p and 1080p presets, output FPS choices appropriate to the project (e.g. 24/25/30/60 when supported), quality/bitrate selection, audio enablement, and output path.
- **FR-082 (P1):** Add 4K export after performance and memory testing. 4K source import can be supported earlier.
- **FR-083 (P0):** Render in a background worker/process and expose progress, estimated status, cancellation, and errors.
- **FR-084 (P0):** Never freeze the editor while exporting.
- **FR-085 (P0):** Keep render jobs cancellable where the underlying process supports it, and clean up temporary artifacts safely after cancellation.
- **FR-086 (P0):** Do not overwrite an existing export without explicit confirmation or a non-conflicting automatic filename.
- **FR-087 (P0):** Verify output existence, readable metadata, duration, and a successful process exit before reporting export success.
- **FR-088 (P0):** Use FFmpeg filter graphs for supported timeline composition and render Remotion scenes to intermediate media before combining them into the final output.

### 8.9 Remotion integration

- **FR-090 (P0):** Treat Remotion as one tool/engine available to the agent, not as the agent's whole capability.
- **FR-091 (P0):** Allow generating title cards, lower thirds, animated text, intros/outros, and custom motion-graphics scenes using Remotion.
- **FR-092 (P0):** Validate generated scene props and composition metadata (dimensions, FPS, duration, assets) before rendering.
- **FR-093 (P0):** Store generated scene source and props in the project assets directory so the scene can be regenerated.
- **FR-094 (P0):** In beta, render a Remotion scene to a generated media clip and place that clip on the timeline. Preserve its source reference and a “Re-generate scene” action.
- **FR-095 (P0):** Run scene generation/renders outside the privileged UI renderer, with timeouts, file access restrictions, and validated asset paths.
- **FR-096 (P0):** Do not allow generated scene code to access arbitrary user files, secrets, shells, or unrestricted network resources.
- **FR-097 (P0):** Do not install arbitrary npm packages at AI request time in beta. Use an allowlisted set of packages/components and approved asset sources.
- **FR-098 (P0):** Add a release gate to verify Remotion license eligibility, automation/render terms, telemetry implications, and redistribution conditions for the actual legal/product setup before distributing the beta beyond permitted use.

### 8.10 AI provider and model settings

- **FR-100 (P0):** Provide separate connection entries for OpenAI, Google Gemini, Anthropic Claude, Ollama, and a custom OpenAI-compatible endpoint.
- **FR-101 (P0):** Let users add, edit, test, disable, and remove provider credentials.
- **FR-102 (P0):** Store API secrets through Electron `safeStorage` backed by the operating system's secure storage, or a stronger Windows Credential Manager integration if chosen after compatibility review. Never store raw keys in project files, logs, renderer state, or plain-text settings.
- **FR-103 (P0):** Fetch available model IDs where provider APIs support model listing; also allow manually specifying a model ID when listing is unavailable or incomplete.
- **FR-104 (P0):** Maintain a capability registry per model, including tool calling, structured output, streaming, image input, context limits where known, and local/cloud classification. Unknown capabilities must be treated conservatively.
- **FR-105 (P0):** Implement a provider-independent `AIProviderAdapter` interface. Do not let UI or editor-core code depend directly on a vendor SDK.
- **FR-106 (P0):** Keep provider-specific differences inside adapters, including tool-call schemas, response parsing, usage reporting, timeout handling, and error normalization.
- **FR-107 (P0):** Implement a connection-test flow and clear error states for invalid keys, model-not-found errors, network failure, quota/rate limit, unsupported capabilities, and local runtime unavailable.
- **FR-108 (P0):** Support streaming AI responses when supported, while keeping tool execution controlled by the application.
- **FR-109 (P0):** Support Arabic and English prompts; language choice must not be hard-coded to one provider.

### 8.11 AI model routing, fallback, and recovery

- **FR-110 (P0):** Support a user-defined ordered primary/fallback chain for each task category (planning, tool calling, Remotion code generation, text/creative help, vision when supported).
- **FR-111 (P1):** Provide an optional Auto mode that selects among enabled/eligible models by capability, user preference, provider health, latency, and cost preference where data is available.
- **FR-112 (P0):** Automatically retry transient errors with bounded exponential backoff and respect provider `Retry-After` guidance where available.
- **FR-113 (P0):** Classify errors before fallback. Authentication/invalid-key errors should mark the provider as misconfigured and skip it; rate limits should wait/retry and then move to a permitted fallback; network/timeout/temporary server errors can trigger retry/fallback; malformed requests should be corrected or surfaced instead of blindly repeating the same request.
- **FR-114 (P0):** Implement per-provider/model health status and a temporary cooldown/circuit breaker after repeated transient failures.
- **FR-115 (P0):** Only fall back to a model that supports the task's required capabilities (e.g. tool calling for a task requiring tools).
- **FR-116 (P0):** Do not silently cross the user's cloud/local privacy boundary. Cloud-to-local or local-to-cloud fallback is permitted only when the user has enabled it and the task's data policy allows it.
- **FR-117 (P0):** Show the model used, fallback reason, and any retry/fallback event in task details. Do not expose secrets.
- **FR-118 (P0):** Bound retries and fallback attempts; prevent infinite loops and uncontrolled API cost. Provide configurable maximum attempts and timeout.
- **FR-119 (P0):** Avoid re-executing already-applied editor mutations when changing models. Model failover must happen at the AI request/plan stage or resume from an explicit safe checkpoint.
- **FR-120 (P0):** Validate model output and tool arguments against schemas before execution. A valid model response is not automatically a valid editing operation.
- **FR-121 (P0):** If all eligible models fail, preserve project state, show the error, and offer retry/manual selection. Do not report success.

### 8.12 AI agent behavior and editor tools

The agent must have an explicit tool registry with JSON-schema/Zod-validated input and output. It must not receive unrestricted filesystem, shell, or direct database access. It invokes approved application commands only.

#### Project inspection tools

- `get_project_summary`
- `get_timeline_state`
- `get_selected_items`
- `find_clips`
- `get_clip_details`
- `get_media_metadata`
- `get_playhead_position`

#### Timeline tools

- `add_clip_to_timeline`
- `split_clip`
- `trim_clip`
- `move_clip`
- `delete_clip`
- `duplicate_clip`
- `set_clip_position`
- `set_clip_transform`
- `add_transition`
- `remove_transition`
- `set_clip_speed` (only when variable-speed export and preview are supported; otherwise report unavailable)
- `undo_last_operation`

#### Audio tools

- `set_audio_volume`
- `set_audio_fade`
- `mute_track`
- `solo_track`
- `add_audio_keyframe` (P1)

#### Effects and assets tools

- `apply_effect`
- `update_effect_parameters`
- `remove_effect`
- `search_media_assets`
- `import_media` (must use approved file picker or a user-authorized path; never scan the whole device by default)

#### Remotion tools

- `generate_remotion_scene`
- `validate_remotion_scene`
- `render_remotion_scene`
- `insert_generated_scene`
- `regenerate_scene`

#### Preview/export tools

- `render_preview_range`
- `play_preview` / `pause_preview` when exposed as a safe UI command
- `export_project`
- `get_render_job_status`
- `cancel_render_job`

#### Store tools

- `search_official_store`
- `get_store_item_details`
- `install_official_asset_pack`

#### Agent operating rules

- **FR-130 (P0):** Before planning, fetch the minimum relevant project/timeline context. Ask a clarifying question only when a target is genuinely ambiguous and a safe assumption cannot be derived; otherwise state the assumption in the plan.
- **FR-131 (P0):** Use stable clip names/IDs, track IDs, and time positions in plans. If “the selected clip” is unavailable or multiple clips match ambiguously, do not guess destructively.
- **FR-132 (P0):** Produce a structured plan containing intended operations, targets, values, and risk level.
- **FR-133 (P0):** In Review Mode, show the plan and expected affected clips/tracks; the user must approve before the write commands run.
- **FR-134 (P0):** In Direct Mode, execute low/medium-risk commands directly, with progress visibility and a persistent undo path. Destructive bulk changes, overwriting media, deleting assets, or expensive export actions still require confirmation unless the user explicitly changes the policy.
- **FR-135 (P0):** Apply a multi-step edit as one logical operation with grouped undo. If a step fails, roll back applied steps where safe and show what was rolled back.
- **FR-136 (P0):** The agent must use editor tools for edit requests; it must not answer “done” unless the corresponding operation succeeded and the editor state confirms the result.
- **FR-137 (P0):** Do not infer success from a model response alone. Verify results by re-reading project state or job status.
- **FR-138 (P0):** Provide a concise completion summary and identify changed clips/effects, plus an Undo action when applicable.
- **FR-139 (P0):** The agent must not execute arbitrary shell commands, install packages, or access arbitrary paths as part of normal editing.
- **FR-140 (P0):** Tool calls are individually permissioned. Tools that read project metadata are lower risk than destructive edits, external uploads, or exports.

### 8.13 AI execution modes

**Review Mode**

1. Parse the request and inspect the project state.
2. Generate a structured plan.
3. Show the proposed operations, affected targets, assumptions, and any external AI/data movement.
4. User approves, edits the plan, or cancels.
5. Validate again against the latest project state.
6. Apply the edit transaction and verify the resulting state.

**Direct Mode**

1. Parse the request and inspect the project state.
2. Execute allowed low/medium-risk commands with visible progress.
3. Require confirmation for high-impact/destructive/expensive operations according to user preferences.
4. Validate, group the change in history, and expose Undo.
5. Report errors honestly and preserve the project if the operation fails.

Users can switch modes per session. The settings screen may provide a remembered default, but high-risk confirmation rules cannot be bypassed merely by selecting Direct Mode.

### 8.14 Local models using Ollama

- **FR-150 (P0):** Detect whether Ollama is reachable at the configured local endpoint; default to the documented local endpoint but let the user change it.
- **FR-151 (P0):** List available local models when the runtime API supports it and allow choosing a model by exact installed model ID.
- **FR-152 (P0):** Do not automatically download large local models. The user must explicitly initiate a download in a later enhancement or install one through Ollama outside the app.
- **FR-153 (P0):** Show model status, context/capability information when available, and a clear warning when a model lacks reliable tool calling or structured output.
- **FR-154 (P0):** Do not claim that local mode is fully offline unless the specific task and all its assets are handled locally and no network/cloud provider is used.
- **FR-155 (P0):** Provide a clear local-only task option and an explicit setting to allow cloud/local fallback across the privacy boundary. Default: cross-boundary fallback is disabled.

### 8.15 Official Store and asset packs

- **FR-160 (P0):** Provide an official catalog of approved KuroStudio content only during beta.
- **FR-161 (P0):** Catalog entries include stable ID, version, title, description, category, preview media, compatibility range, source URL, checksum, license/attribution, and declared assets.
- **FR-162 (P0):** Verify HTTPS download, checksum, version, and expected file paths before installation.
- **FR-163 (P0):** Install to a managed content directory and provide update/remove operations.
- **FR-164 (P0):** The beta Store may distribute templates, transitions, effect presets, LUTs, titles, and approved Remotion scene templates. Every pack must declare required engine/features and license terms.
- **FR-165 (P0):** Do not execute downloaded arbitrary JavaScript/Node modules as plugins in beta.
- **FR-166 (P1):** Maintain a future extension boundary/SDK design, but do not delay beta to implement third-party plugin sandboxing.

## 9. Technical Architecture

### 9.1 Recommended stack

Use maintained, compatible releases at implementation time; commit the lockfile and avoid unconstrained version drift.

- **Desktop shell:** Electron.
- **Frontend:** React + TypeScript + Vite.
- **Electron build/dev:** `electron-vite` or an equivalent maintained Electron/Vite integration; verify Windows packaging early.
- **Installer:** `electron-builder` for Windows x64 packages.
- **Package manager:** pnpm workspaces for a modular monorepo.
- **UI styling:** Tailwind CSS or CSS modules/design tokens; avoid mixing two competing styling systems without a reason.
- **App state:** Zustand for UI state; canonical project state belongs in editor-core/domain commands, not in arbitrary React components.
- **Schema validation:** Zod for project data, AI tools, provider config, and Store manifests.
- **Drag/drop:** A maintained library such as dnd-kit for UI interactions, supplemented by custom timeline logic.
- **Media processing:** FFmpeg + FFprobe in a managed worker process. Keep binary selection replaceable to allow licensing/build changes.
- **Preview:** HTML media elements plus Canvas/WebGL where appropriate; proxies and preview-quality controls.
- **Thumbnails/waveforms/metadata:** FFmpeg/FFprobe and/or suitable JS media utilities. WaveSurfer.js may be used for waveform display, not as the full audio engine.
- **Generated scenes:** Remotion and the matching renderer/bundler packages, with compatible package versions.
- **AI providers:** Provider-specific official SDK adapters where available (OpenAI, Google, Anthropic) plus Ollama's local API adapter and a custom OpenAI-compatible adapter.
- **Local persistence:** Versioned JSON project manifest, SQLite for searchable asset metadata/indexes where useful, and OS-backed secret storage through Electron `safeStorage` or a reviewed Windows Credential Manager implementation.
- **Testing:** Vitest for unit/integration tests; Playwright or an Electron-capable E2E setup for critical UI flows; dedicated media fixture tests.
- **CI:** GitHub Actions Windows runner for build, tests, and packaged artifact smoke tests.

### 9.2 Architecture layers

1. **Renderer/UI layer** — React screens, timeline visuals, inspector, dialog flows, AI chat/plan views.
2. **Preload bridge** — A small, typed, allowlisted API surface exposed with `contextBridge`.
3. **Electron main/application services** — file dialogs, safe filesystem operations, settings/secrets, process launching, window lifecycle, job supervision.
4. **Domain/editor-core** — project model, command bus, command validation, selection, undo/redo, transactions, operation history.
5. **Timeline/preview** — custom timeline interaction model and preview compositor.
6. **Media engine** — probing, thumbnail/proxy generation, FFmpeg filter graph composition, export job queue.
7. **Audio subsystem** — waveform, volume/fades, sync, audio filters and export behavior.
8. **Kuro AI Core** — intent handling, task planner, tool registry, provider router, adapters, retries/fallback, result validator, approval policy.
9. **Remotion bridge** — constrained scene templates/generation, validation, rendering, generated-clip lifecycle.
10. **Store/content service** — catalog validation, download/install/update, asset metadata and license records.
11. **Persistence layer** — project manifest, assets folder, autosaves, local index and diagnostics.

### 9.3 Suggested monorepo structure

```text
kurostudio/
├─ apps/
│  └─ desktop/
│     ├─ src/main/                 # Electron main process
│     ├─ src/preload/              # Typed secure bridge
│     └─ src/renderer/             # React UI
├─ packages/
│  ├─ shared/                      # Shared types, errors, IDs, utilities
│  ├─ project-format/              # .kuro schema and migrations
│  ├─ editor-core/                 # Commands, transactions, undo/redo
│  ├─ timeline-ui/                 # Timeline UI and interactions
│  ├─ preview-engine/              # Interactive preview compositor
│  ├─ media-engine/                # FFmpeg, FFprobe, proxy and render jobs
│  ├─ audio-engine/                 # Audio editing model and processing
│  ├─ ai-core/                     # Agent, planner, router, tool registry
│  ├─ ai-providers/                # OpenAI, Gemini, Claude, Ollama, compatible API
│  ├─ remotion-bridge/              # Scene templates, validation, rendering
│  ├─ store/                       # Catalog and official content install logic
│  └─ design-system/               # Reusable UI components/tokens
├─ assets/
│  ├─ built-in-effects/
│  └─ built-in-remotion-templates/
├─ tests/
│  ├─ fixtures/media/
│  ├─ unit/
│  ├─ integration/
│  └─ e2e/
├─ docs/
│  ├─ architecture.md
│  ├─ media-pipeline.md
│  ├─ ai-agent-tools.md
│  ├─ security.md
│  └─ licensing.md
├─ package.json
├─ pnpm-workspace.yaml
└─ README.md
```

This structure is a guide, not a demand to create empty packages. Start only with packages needed for the first vertical slice, but keep the boundaries clear.

### 9.4 Process separation

- Renderer process: no direct Node.js access and no unrestricted filesystem access.
- Main process: privileged app services; validate every IPC sender and every payload.
- Media jobs: child process/worker with explicit inputs, progress messages, timeout and cancellation.
- Remotion jobs: separate render process with restricted paths, allowed dependencies, timeouts and controlled environment.
- AI requests: provider calls should run through a dedicated service boundary; keys must never be exposed to renderer components.
- Store downloads: separate download/verification/install flow; never execute a downloaded file just because it is part of an asset pack.

## 10. Canonical Data Model

The implementation must define runtime schemas and TypeScript types for at least the following entities. Field names can vary if the same semantics are preserved.

### 10.1 Project

```ts
type Project = {
  id: string;
  schemaVersion: number;
  name: string;
  createdAt: string;
  updatedAt: string;
  width: number;
  height: number;
  fpsNumerator: number;
  fpsDenominator: number;
  timelineTimebase: number; // ticks per second; integer-based time math
  tracks: Track[];
  assets: AssetReference[];
  exportDefaults: ExportSettings;
  metadata?: Record<string, unknown>;
};
```

### 10.2 Track and clip

```ts
type Track = {
  id: string;
  name: string;
  kind: "video" | "audio" | "overlay";
  order: number;
  muted?: boolean;
  locked?: boolean;
  hidden?: boolean;
  clips: Clip[];
};

type Clip = {
  id: string;
  assetId: string;
  trackId: string;
  timelineStartTicks: number;
  durationTicks: number;
  sourceInTicks: number;
  sourceOutTicks: number;
  speedNumerator?: number;
  speedDenominator?: number;
  transform?: { x: number; y: number; scaleX: number; scaleY: number; rotation: number; opacity: number };
  audio?: { volume: number; muted?: boolean; pan?: number };
  effects: EffectInstance[];
  transitionRefs?: string[];
  generatedSceneRef?: GeneratedSceneRef;
};
```

The exact schema must be validated and migrated. No timeline logic should depend on floating-point seconds as the source of truth.

### 10.3 AI operation history

Each AI operation record should include: operation ID, prompt (subject to privacy settings), selected mode, model/provider ID, task category, proposed plan, approval status, tool calls, validation results, changed entity IDs, timestamps, retry/fallback events, error summaries, and undo/rollback result. Never record API keys or full secret-bearing headers.

## 11. AI Agent Execution Contract

### 11.1 Agent pipeline

1. **Understand:** Parse the user's intent in their language.
2. **Observe:** Fetch only necessary project/selection/timeline state.
3. **Plan:** Produce structured JSON operations with explicit targets and timing.
4. **Validate:** Check IDs, timing bounds, capabilities, effect support, permissions, and current-state conflicts.
5. **Approve or execute:** Based on Review Mode/Direct Mode and risk policy.
6. **Apply:** Execute typed commands via editor-core; group changes under a transaction/history entry.
7. **Verify:** Re-read state or job status to confirm the intended result.
8. **Summarize:** Report what changed and expose Undo/rollback when appropriate.

### 11.2 Failover contract

- Failure to receive a plan may trigger retry/fallback before project mutations begin.
- A provider failure after a valid plan must not restart and reapply mutations. Either continue executing the validated plan locally or resume from a checkpoint that records already completed command IDs.
- A tool execution failure is an application/command error, not automatically a provider error. Do not switch models simply because a file is missing or a timeline invariant failed.
- If a generated plan is invalid, the agent may request one correction attempt from the same/eligible alternative model; if still invalid, stop and explain.
- Any fallback that would send user content to a different cloud provider must be visible in settings/history, and cross-boundary fallback is disabled unless the user enables it.

### 11.3 Risk and approval tiers

- **Low risk:** Inspect project state, find clips, summarize media metadata.
- **Medium risk:** Split/trim/move clips, adjust volume, add basic effects, create a new generated scene. Direct Mode may perform these with grouped undo.
- **High risk:** Delete many clips, overwrite or remove source assets, bulk replace, change project timebase, perform a long/expensive export, upload media/thumbnails/transcripts to an external provider, or install content. Require explicit confirmation by default.

The risk classifier must be deterministic in application code. The model may suggest risk, but cannot downgrade a tool's hard-coded risk level.

## 12. Media Pipeline and Preview/Export Contract

### 12.1 Import pipeline

1. User selects or drops files.
2. Main process validates paths and allowed file operations.
3. FFprobe reads metadata in a background task.
4. Asset metadata is added to the project.
5. Thumbnail and waveform jobs are queued.
6. Proxy generation may be offered/queued for high-resolution/expensive media.
7. UI receives job progress and shows usable assets as soon as possible.

### 12.2 Preview pipeline

- The preview engine reads the canonical timeline model.
- A video element/canvas/WebGL layer renders the current frame/time and supported overlays/transforms.
- Audio preview synchronizes against the same project clock.
- When the preview cannot maintain speed, reduce preview resolution/quality or use proxies.
- Do not mutate the project to accommodate a slow preview.
- Built-in effects must have documented support in preview, export, or both. Acceptance tests compare them.

### 12.3 Export pipeline

1. Validate project and gather asset references.
2. Resolve any missing media or unsupported effects before rendering.
3. Render required Remotion scenes to intermediate files.
4. Build a deterministic render graph from the timeline and supported effects.
5. Launch FFmpeg worker with explicit arguments (never concatenate untrusted input into a shell command).
6. Report progress and allow cancellation.
7. Verify the output file and metadata.
8. Clean temp files according to success/failure policy and preserve useful diagnostics.

### 12.4 Render job states

`queued → preparing → rendering → verifying → succeeded`

Alternative terminal states: `cancelled`, `failed`, or `needs-user-action` (for missing media/unsupported operation). State transitions must be persisted for the session and surfaced in UI.

## 13. Security, Privacy, and Safety Requirements

### 13.1 Electron hardening

- `nodeIntegration: false` in renderer windows.
- `contextIsolation: true`.
- Renderer sandboxing enabled wherever compatible.
- Strict Content Security Policy.
- Narrow `contextBridge` API with one method per capability; never expose raw IPC.
- Validate the sender and schema of every IPC request.
- Restrict navigation and new-window creation; open external links only after URL validation and explicit action.
- Keep local app content separate from remote web content.
- Do not disable `webSecurity` to solve an integration problem.
- Use a secure custom protocol or otherwise follow current Electron recommendations for local assets; do not load arbitrary remote code with Node privileges.

### 13.2 Secret storage

- API keys are secrets. Store them encrypted using OS-backed storage; only the provider service can retrieve them when needed.
- Never include keys in project manifests, crash reports, diagnostics, URLs, AI prompts, or telemetry.
- Mask keys in settings and provide a clear Delete Key control.
- Do not send a user's API key to KuroLabs servers. Provider calls go directly from the user's app to the configured provider unless an explicitly documented architecture change is approved.

### 13.3 Cloud/local privacy

- Project files and source media stay local by default.
- AI requests should include the minimum project context necessary: IDs, timing, properties, and selected metadata rather than entire media files.
- Do not upload source video/audio by default.
- Any feature that sends a frame, thumbnail, transcript, or media content to a cloud vision/audio model must disclose what will be sent and require opt-in for that content flow.
- Make per-task local-only routing available.
- Log provider, model, token/usage data when reported, and fallback reason, but not secret-bearing request bodies. Provide a clear-history action for stored AI chat/operation history.

### 13.4 Untrusted model and Store content

- Treat AI text/code and downloaded Store packs as untrusted inputs.
- Validate tool arguments and manifests against strict schemas.
- Keep generated Remotion code out of the privileged Electron renderer and restrict filesystem/network permissions.
- Never execute arbitrary Store-delivered code in beta.
- Verify Store pack checksums and path traversal protections before installation.

### 13.5 Diagnostics

- Diagnostic bundles are opt-in.
- Preview the diagnostic bundle contents before sending/exporting.
- Redact API keys, tokens, personal paths where possible, and user media content.
- Local logs should rotate and have bounded size.

## 14. Performance and Reliability Targets

These are beta engineering targets, to be validated on the reference PC configuration, not guarantees for every device.

- Basic 1080p/30 editing must remain usable on a medium-range PC with 16 GB RAM; a lower-memory machine may use more proxies and lower preview quality.
- The UI must remain interactive during import, thumbnail generation, AI calls, and export.
- For a cached project containing approximately 100 clips and 20 assets, opening the project should target under 5 seconds on the reference machine, subject to benchmarking and optimization.
- Timeline selection, playhead movement, and common edits should respond without obvious blocking; large clip lists must be virtualized or rendered efficiently.
- Export is a background operation and must never block normal timeline interactions.
- Failure or cancellation of a media/AI job must not corrupt the project file.
- Autosave must avoid data loss beyond the configured autosave interval, except where the OS/process fails before a write can complete.
- All long operations expose progress, failure state, and recovery options.

### 14.1 Beta test hardware profiles

- **Minimum test profile:** 8 GB RAM, modern 4-core CPU, integrated GPU, SSD, Windows 10 x64; basic 1080p editing, proxy-first behavior. The initial compatibility test target is Windows 10 x64.
- **Recommended profile:** 16 GB RAM or more, 6-core CPU or better, SSD, modern integrated/dedicated GPU; normal 1080p workflow.
- **High-end profile:** 32 GB RAM or more and a modern dedicated GPU; used for heavier multilayer/effects stress tests.

Actual min specs should be published only after performance testing.

## 15. Testing and Acceptance Criteria

### 15.1 Core editor acceptance

- A tester can create/open/save a project, import video/audio/images, put assets on tracks, split/trim/move/delete clips, undo/redo changes, save, close, reopen, and recover the same timeline state.
- Missing source media is detected; relink restores access without corrupting clip metadata.
- A project with 100 timeline clips can be opened and used for basic edits on the reference machine without blocking the UI.
- Common supported effects render successfully and look acceptably similar in preview and export.
- Audio remains synchronized through playback, seeking, and export for the test fixture suite.

### 15.2 AI agent acceptance

- Prompt: “Split the selected clip at 10 seconds” results in an actual split at the correct timeline/source location, and the change appears in the timeline.
- Prompt: “Lower the music volume to 20%” updates the intended audio clip/track, not an unrelated clip.
- Prompt: “Move the second clip to follow the first without a gap” resolves IDs deterministically, edits the timeline, and verifies the result.
- Review Mode shows a structured plan and performs no mutation until approval.
- Direct Mode executes supported non-destructive edits and groups them in undo history.
- A failed AI request does not change the project.
- A failed step in a multi-step edit rolls back previously applied reversible changes or clearly reports any non-reversible remainder.
- AI never reports success unless project state/job verification confirms success.
- An unsupported instruction returns a truthful limitation and does not invent a tool.

### 15.3 Provider/fallback acceptance

- OpenAI, Gemini, Anthropic, Ollama, and a configurable OpenAI-compatible endpoint have independent connection tests and adapter tests.
- Invalid keys are clearly identified; the system skips a provider marked invalid instead of retrying indefinitely.
- Transient failure triggers bounded retry and then configured fallback.
- An incapable fallback model is skipped for the current task.
- Cloud/local boundary fallback is blocked unless enabled in settings.
- The UI displays which provider/model answered and why fallback occurred without revealing credentials.
- No duplicate timeline operation occurs when a provider request is retried or the router moves to a fallback.

### 15.4 Media/export acceptance

- Import metadata, thumbnail, and waveform jobs are cancellable or safely bounded.
- Export of a 1080p/30 project produces a playable MP4, has correct expected duration, preserves audio sync, and is reported successful only after verification.
- Export cancellation terminates/cleans up safely without corrupting the project.
- The UI remains usable during export.
- Remotion-generated scenes can be previewed, rendered, inserted, saved, reopened, and regenerated from saved source/props.

### 15.5 Security/release acceptance

- No renderer can invoke arbitrary shell/file operations through the preload bridge.
- API keys do not appear in logs, project files, diagnostic bundles, or renderer developer-facing state.
- Store assets are checksum-verified and cannot write outside the managed install directory.
- Generated Remotion code is executed outside the privileged renderer, with restricted inputs and timeouts.
- Installer works on a clean Windows 10 x64 test machine without Node.js/Python installed. Other Windows versions are outside the initial beta support commitment.
- The release includes third-party notices and a completed licensing review for distributed media binaries and Remotion usage.

## 16. Observability and Beta Feedback

For five invited beta users, use simple and privacy-conscious feedback instead of a heavy analytics platform.

- Include a “Report a problem” action that captures app version, OS version, relevant error code, and selected logs.
- Ask the user to preview the report before saving/sending it.
- Keep app telemetry opt-in; the app must remain usable if the user declines.
- Provide structured feedback categories: crash, performance, editing correctness, AI behavior, model/provider connection, export, Store, and UX.
- Track known issues and prioritize data-loss/corruption, incorrect edits, export failure, secret leakage, and crashes above visual polish.

## 17. Release and Distribution Plan

### Phase 0 — Repository and architecture setup

- Inspect the existing repository before changing files.
- Record the current project state and do not overwrite unrelated work.
- Set up Electron, React, TypeScript, Vite, pnpm workspace, lint/typecheck/test/build commands.
- Confirm Windows packaging and native dependency rebuilds at the start, not at the end.

### Phase 1 — Vertical slice: project + one clip

- Create project, import one video, show metadata and preview.
- Add it to one video track, split/trim, save/reopen, export a simple MP4.
- Establish timeline data model and command/undo architecture.

### Phase 2 — Usable editor core

- Multiple tracks/clips, asset bin, basic preview, audio track, volume/fades, common transitions/effects, autosave, missing media recovery.

### Phase 3 — Stable rendering

- Export queue, background workers, FFmpeg integration, supported filter graph, proxy generation, fixture-based media tests.

### Phase 4 — Remotion

- Constrained Remotion templates, scene validation/rendering, generated clip insertion and regeneration, license gate.

### Phase 5 — Kuro AI Core

- First cloud provider adapter and tools; review/direct mode; then additional cloud adapters, capability registry, fallback, then Ollama/local routing.
- The architecture must support multiple providers from day one, even if integration work lands incrementally.

### Phase 6 — Official Store

- Official catalog and approved downloadable assets, validation, install/update/remove.

### Phase 7 — Five-user closed beta

- Package Windows x64 build, test clean install, verify recovery and diagnostic flow, invite five testers, collect opt-in feedback, fix critical issues, then decide whether to expand the beta.

## 18. Definition of Done

A feature is done only when:

- Its user-facing behavior is implemented and not merely mocked.
- Types/schema validation and error states are implemented.
- The feature uses canonical domain commands where it changes a project.
- At least one unit/integration test covers its core logic.
- Critical flows have E2E or repeatable manual test coverage.
- Long-running operations can report progress and recover from failure.
- Relevant permissions and privacy implications are documented.
- Project state remains valid across save/reopen.
- No API secrets or user media are accidentally logged.
- Documentation and known limitations are updated.

## 19. Instructions for the AI Coding Agent Implementing This PRD

1. **Inspect before editing.** If a repository already exists, read its structure, `package.json`, current implementation, and README before changing anything. Preserve working code and adapt the plan to the repository rather than replacing it wholesale.
2. **Do not attempt to implement the entire editor in one pass.** Work through the phases above and establish a working vertical slice first.
3. **Do not create fake controls.** Every enabled button must work, be explicitly disabled with a reason, or be marked as a planned feature. Do not ship dead UI that appears functional.
4. **Use strict TypeScript.** Avoid broad `any`, unchecked casts, and hidden shared mutable state. Validate untrusted data at runtime with schemas.
5. **Keep boundaries.** Renderer UI must not directly read/write arbitrary files or call AI providers with secrets. Use typed service APIs.
6. **Build the command system early.** UI and AI must share one canonical command/transaction/undo path; do not bolt on a separate AI editing mechanism.
7. **Prefer small, testable modules.** Keep provider-specific code in adapters and media subprocess details in the media engine.
8. **Verify licenses and binary provenance.** Do not bundle FFmpeg builds/codecs or use Remotion automation/rendering without confirming the relevant terms and notices for KuroStudio's actual distribution model.
9. **Test Windows packaging continuously.** A dev-server success is not sufficient; verify packaged builds after major dependency changes.
10. **After each phase, report:** what was implemented, files/modules changed, tests run, known limitations, and the next smallest useful step. Do not claim features work unless tested.
11. **When a technical choice conflicts with this PRD,** explain the tradeoff and propose a narrowly scoped change before silently rewriting a product requirement.
12. **Do not add new product scope** (accounts, cloud sync, subscriptions, social features, third-party plugin marketplace, or telemetry collection) without explicit product-owner approval.

## 20. Licensing and Technical References

These are implementation references, not a substitute for legal advice. Re-check the current terms when preparing a release because licensing and package guidance can change.

- Electron security checklist: https://www.electronjs.org/docs/latest/tutorial/security/
- Electron context isolation: https://www.electronjs.org/docs/latest/tutorial/context-isolation
- Electron Forge/Vite template reference (review current stability notes): https://www.electronforge.io/templates/vite-%2B-typescript
- Remotion license and terms: https://www.remotion.dev/docs/license
- Remotion license/pricing, including automation use: https://www.remotion.dev/docs/license/pricing
- Remotion License FAQ: https://www.remotion.dev/docs/license/faq
- Remotion rendering documentation: https://www.remotion.dev/docs/render
- FFmpeg legal considerations and licensing: https://ffmpeg.org/legal.html
- OpenAI function/tool calling concepts: https://developers.openai.com/api/docs/guides/function-calling
- OpenAI models documentation (for current model capability verification): https://developers.openai.com/api/docs/models
- Anthropic models documentation: https://platform.claude.com/docs/en/models/overview
- Google Gemini platform documentation: https://ai.google.dev/gemini-api/docs
- Ollama documentation: https://docs.ollama.com/

### Mandatory release licensing checklist

- Confirm the exact Remotion license category for the organization and use case. The official FAQ notes that video editors, prompt-to-video tools, products embedding the Player, and products invoking render APIs can fall under Remotion's automation licensing model; eligibility depends on the product owner's situation and current terms.
- Confirm Remotion telemetry and reporting requirements for the selected license, and disclose/implement them according to the applicable terms.
- Select a redistributable FFmpeg binary/build deliberately. FFmpeg licensing depends on build configuration and optional components; include the required license notices/source obligations and review codec/patent questions for target jurisdictions.
- Include third-party license notices for shipped dependencies and content packs.

---

## Final Product Definition

KuroStudio is a Windows-first desktop video editor with a shared manual/AI editing core. Its user-facing AI assistant is provisionally named Kuro (internal module name: KuroAgent); it can inspect the project and perform real editing operations through validated tools, while Remotion acts as a specialized scene-generation/rendering capability. The AI layer supports user-provided keys for multiple cloud providers, a local Ollama runtime, capability-aware selection, fallback, and safe recovery. Projects remain local by default, all edits are reversible where technically possible, Store content is official-only during the five-user beta, and the release is judged by stable end-to-end workflows rather than feature count.
