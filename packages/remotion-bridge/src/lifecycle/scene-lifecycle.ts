import { generateId, TimelineTicks } from '@kuro/shared';
import { AssetReference, Clip, Project } from '@kuro/project-format';
import { RemotionTemplateDefinition } from '../types/template.interface';
import { assertSceneValid } from '../validator/scene-validator';

export class RemotionSceneLifecycleManager {
  /**
   * Prepares a new Remotion scene asset and timeline clip.
   */
  public createGeneratedSceneClip(
    template: RemotionTemplateDefinition,
    props: Record<string, unknown>,
    targetTrackId: string,
    startTicks: TimelineTicks,
    durationTicks?: TimelineTicks
  ): { asset: AssetReference; clip: Clip } {
    assertSceneValid(template, props);

    const assetId = generateId('asset_remotion');
    const clipId = generateId('clip_remotion');
    const finalDuration = durationTicks ?? template.defaultDurationTicks;
    const now = new Date().toISOString();

    const asset: AssetReference = {
      id: assetId,
      name: `Remotion: ${template.name}`,
      type: 'remotion-scene',
      storageMode: 'managed',
      filePath: `generated/${assetId}.tsx`,
      fileSizeBytes: 0,
      durationTicks: finalDuration,
      width: template.width,
      height: template.height,
      fpsNumerator: template.fps,
      fpsDenominator: 1,
      metadata: {
        templateId: template.id,
        props,
        createdAt: now,
      },
    };

    const clip: Clip = {
      id: clipId,
      assetId: asset.id,
      trackId: targetTrackId,
      timelineStartTicks: startTicks,
      durationTicks: finalDuration,
      sourceInTicks: 0,
      sourceOutTicks: finalDuration,
      effects: [],
      generatedSceneRef: {
        templateId: template.id,
        sourceFilePath: asset.filePath,
        props,
        lastRenderedAt: now,
      },
    };

    return { asset, clip };
  }

  /**
   * Updates an existing generated scene clip with new props, preparing it for re-rendering.
   */
  public updateSceneProps(
    clip: Clip,
    template: RemotionTemplateDefinition,
    newProps: Record<string, unknown>
  ): Clip {
    assertSceneValid(template, newProps);

    return {
      ...clip,
      generatedSceneRef: {
        templateId: template.id,
        sourceFilePath: clip.generatedSceneRef?.sourceFilePath ?? `generated/${clip.assetId}.tsx`,
        props: newProps,
        lastRenderedAt: new Date().toISOString(),
      },
    };
  }
}
