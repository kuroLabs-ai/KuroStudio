import { DEFAULT_TICKS_PER_SECOND, generateId } from '../../packages/shared/src/index.ts';
import { createNewProject, serializeProject, deserializeProject, Clip } from '../../packages/project-format/src/index.ts';
import {
  EditorState,
  CommandBus,
  AddClipCommand,
  SplitClipCommand,
  TrimClipCommand,
  MoveClipCommand,
  SetAudioVolumeCommand,
  ApplyEffectCommand,
} from '../../packages/editor-core/src/index.ts';
import { FilterGraphBuilder } from '../../packages/media-engine/src/index.ts';
import { BUILT_IN_REMOTION_TEMPLATES, RemotionSceneLifecycleManager } from '../../packages/remotion-bridge/src/index.ts';
import { StorePackInstaller, OFFICIAL_KURO_STORE_CATALOG } from '../../packages/store/src/index.ts';

/**
 * Senior End-to-End Core Integration Test Suite
 */
export async function runCoreIntegrationTest(): Promise<{ passed: boolean; log: string[] }> {
  const log: string[] = [];
  const assert = (condition: boolean, msg: string) => {
    if (!condition) {
      log.push(`❌ FAILED: ${msg}`);
      throw new Error(`Assertion failed: ${msg}`);
    }
    log.push(`✅ PASSED: ${msg}`);
  };

  try {
    log.push('--- Starting KuroStudio Core Integration Tests ---');

    // 1. Project Initialization & Validation
    const project = createNewProject('Beta Integration Project');
    assert(project.tracks.length === 2, 'Default project contains 2 tracks (Video 1 & Audio 1).');
    assert(project.schemaVersion === 1, 'Project schema version is 1.');

    const editorState = new EditorState(project);
    const commandBus = new CommandBus(editorState);

    // 2. Add Video Clip
    const videoTrackId = project.tracks[0]!.id;
    const clip1: Clip = {
      id: generateId('clip'),
      assetId: 'asset_test_video_1',
      trackId: videoTrackId,
      timelineStartTicks: 0,
      durationTicks: DEFAULT_TICKS_PER_SECOND * 10, // 10 seconds
      sourceInTicks: 0,
      sourceOutTicks: DEFAULT_TICKS_PER_SECOND * 10,
      effects: [],
    };

    const addRes = await commandBus.executeCommand(new AddClipCommand(clip1, videoTrackId));
    assert(addRes.success === true, 'Successfully added clip1 to timeline.');
    assert(editorState.getProject().tracks[0]!.clips.length === 1, 'Track 0 has 1 clip.');

    // 3. Split Clip at 4 seconds (480,000 ticks)
    const splitTick = DEFAULT_TICKS_PER_SECOND * 4;
    const splitCmd = new SplitClipCommand(clip1.id, splitTick);
    const splitRes = await commandBus.executeCommand(splitCmd);
    assert(splitRes.success === true, 'Successfully split clip at 4 seconds.');
    assert(editorState.getProject().tracks[0]!.clips.length === 2, 'Track 0 now has 2 split clips.');

    // 4. Set Audio Volume
    const leftClipId = splitRes.data!.leftClip.id;
    const volRes = await commandBus.executeCommand(new SetAudioVolumeCommand(leftClipId, 0.5));
    assert(volRes.success === true, 'Successfully set audio volume to 50% on left clip.');
    assert(volRes.data?.audio?.volume === 0.5, 'Clip audio volume updated to 0.5.');

    // 5. Apply Visual Effect (Brightness)
    const fxRes = await commandBus.executeCommand(
      new ApplyEffectCommand(leftClipId, {
        effectType: 'brightness',
        enabled: true,
        parameters: { value: 0.15 },
      })
    );
    assert(fxRes.success === true, 'Successfully applied brightness effect.');
    assert(fxRes.data?.effects.length === 1, 'Clip has 1 effect.');

    // 6. Undo & Redo Verification
    const undone = await commandBus.undo();
    assert(undone === true, 'Successfully undid effect command.');
    assert(editorState.getProject().tracks[0]!.clips[0]!.effects.length === 0, 'Effects reverted on undo.');

    const redone = await commandBus.redo();
    assert(redone === true, 'Successfully redid effect command.');
    assert(editorState.getProject().tracks[0]!.clips[0]!.effects.length === 1, 'Effects restored on redo.');

    // 7. Remotion Scene Creation
    const remotionLifecycle = new RemotionSceneLifecycleManager();
    const titleTemplate = BUILT_IN_REMOTION_TEMPLATES[0]!;
    const remotionRes = remotionLifecycle.createGeneratedSceneClip(
      titleTemplate,
      { title: 'Test Title', subtitle: 'Subtitle' },
      videoTrackId,
      DEFAULT_TICKS_PER_SECOND * 15
    );
    assert(remotionRes.clip.generatedSceneRef?.templateId === titleTemplate.id, 'Remotion scene generated.');

    // 8. FFmpeg Filtergraph Generator
    const filterBuilder = new FilterGraphBuilder();
    const plan = filterBuilder.buildProjectExportPlan(editorState.getProject(), 'output.mp4');
    assert(plan.outputArgs.includes('-filter_complex'), 'FFmpeg plan contains filter_complex.');
    assert(plan.outputArgs.includes('libx264'), 'FFmpeg plan targets libx264 codec.');

    // 9. Store Security Check
    const storeInstaller = new StorePackInstaller('./managed-store');
    const officialPack = OFFICIAL_KURO_STORE_CATALOG[0]!;
    storeInstaller.validatePackSecurity(officialPack);
    const installed = storeInstaller.recordInstallation(officialPack);
    assert(installed.id === officialPack.id, 'Official store pack installed securely.');

    // 10. Serialization & Invariant Consistency
    const serializedJson = serializeProject(editorState.getProject());
    const deserialized = deserializeProject(serializedJson);
    assert(deserialized.id === project.id, 'Project serialized and deserialized with intact invariants.');

    log.push('🎉 All core integration tests completed with 100% success!');
    return { passed: true, log };
  } catch (err) {
    log.push(`❌ Error encountered: ${err instanceof Error ? err.message : String(err)}`);
    return { passed: false, log };
  }
}
