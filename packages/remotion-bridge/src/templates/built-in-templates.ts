import { DEFAULT_TICKS_PER_SECOND } from '@kuro/shared';
import { RemotionTemplateDefinition } from '../types/template.interface';

export const BUILT_IN_REMOTION_TEMPLATES: RemotionTemplateDefinition[] = [
  {
    id: 'tmpl_minimal_title',
    name: 'Minimal Modern Title',
    category: 'title',
    description: 'A clean, animated typography title card with smooth fade and slide-up motion.',
    defaultDurationTicks: DEFAULT_TICKS_PER_SECOND * 4, // 4 seconds
    width: 1920,
    height: 1080,
    fps: 30,
    entryComponentPath: 'builtin/templates/MinimalTitle.tsx',
    propSchema: [
      { name: 'title', type: 'string', description: 'Main title text', defaultValue: 'KuroStudio' },
      { name: 'subtitle', type: 'string', description: 'Subtitle text', defaultValue: 'Crafted with AI & Precision' },
      { name: 'textColor', type: 'color', description: 'Text hex color', defaultValue: '#FFFFFF' },
      { name: 'accentColor', type: 'color', description: 'Accent accent bar color', defaultValue: '#3B82F6' },
    ],
  },
  {
    id: 'tmpl_lower_third',
    name: 'Broadcaster Lower Third',
    category: 'lower-third',
    description: 'Polished lower-third banner for speaker names, titles, and handles.',
    defaultDurationTicks: DEFAULT_TICKS_PER_SECOND * 5, // 5 seconds
    width: 1920,
    height: 1080,
    fps: 30,
    entryComponentPath: 'builtin/templates/LowerThird.tsx',
    propSchema: [
      { name: 'speakerName', type: 'string', description: 'Primary speaker name', defaultValue: 'Alex Mercer' },
      { name: 'roleOrHandle', type: 'string', description: 'Speaker role or @handle', defaultValue: 'Senior Editor' },
      { name: 'backgroundColor', type: 'color', description: 'Card background color', defaultValue: '#1E293B' },
      { name: 'textColor', type: 'color', description: 'Text color', defaultValue: '#F8FAFC' },
    ],
  },
  {
    id: 'tmpl_kinetic_outro',
    name: 'Kinetic Subscribe Outro',
    category: 'outro',
    description: 'High-energy outro sequence with channel social links and video placeholders.',
    defaultDurationTicks: DEFAULT_TICKS_PER_SECOND * 8, // 8 seconds
    width: 1920,
    height: 1080,
    fps: 30,
    entryComponentPath: 'builtin/templates/KineticOutro.tsx',
    propSchema: [
      { name: 'callToAction', type: 'string', description: 'Main CTA text', defaultValue: 'Thanks for watching!' },
      { name: 'channelHandle', type: 'string', description: 'Social handle', defaultValue: '@KuroLabs' },
    ],
  },
];
