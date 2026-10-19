import { TimelineTicks } from '@kuro/shared';

export interface RemotionTemplatePropSchema {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'color';
  description: string;
  defaultValue: unknown;
  required?: boolean;
}

export interface RemotionTemplateDefinition {
  id: string;
  name: string;
  category: 'title' | 'lower-third' | 'intro' | 'outro' | 'callout';
  description: string;
  propSchema: RemotionTemplatePropSchema[];
  defaultDurationTicks: TimelineTicks;
  width: number;
  height: number;
  fps: number;
  entryComponentPath: string;
}

export interface GeneratedSceneInstance {
  templateId: string;
  props: Record<string, unknown>;
  durationTicks: TimelineTicks;
  sourceCodePath: string;
  renderedVideoPath?: string;
}
