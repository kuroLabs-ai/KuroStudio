import { CommandBus, EditorState } from '@kuro/editor-core';
import { KuroAgent, ModelRouter } from '@kuro/ai-core';
import { ToolRegistry } from '@kuro/ai-core';
import { createNewProject, deserializeProject, Project, serializeProject } from '@kuro/project-format';
import { FilterGraphBuilder, RenderJob } from '@kuro/media-engine';
import { OFFICIAL_KURO_STORE_CATALOG, StorePackInstaller } from '@kuro/store';
import { SecretManager } from './secrets';

export class KuroDesktopApplication {
  private editorState: EditorState;
  private commandBus: CommandBus;
  private toolRegistry: ToolRegistry;
  private modelRouter: ModelRouter;
  private kuroAgent: KuroAgent;
  private filterGraphBuilder: FilterGraphBuilder;
  private storeInstaller: StorePackInstaller;
  private secretManager: SecretManager;
  private activeRenderJobs = new Map<string, RenderJob>();

  constructor(initialProject?: Project) {
    const project = initialProject ?? createNewProject('New Kuro Project');
    this.editorState = new EditorState(project);
    this.commandBus = new CommandBus(this.editorState);
    this.toolRegistry = new ToolRegistry(this.editorState, this.commandBus);

    this.modelRouter = new ModelRouter({
      taskChains: {
        planning: ['claude-3-5-sonnet-20241022', 'gpt-4o', 'gemini-1.5-pro'],
        tool_calling: ['gpt-4o', 'claude-3-5-sonnet-20241022', 'gemini-1.5-flash'],
        remotion_code: ['claude-3-5-sonnet-20241022', 'gpt-4o'],
        creative_text: ['gpt-4o-mini', 'gemini-1.5-flash'],
        vision: ['gpt-4o', 'gemini-1.5-pro'],
      },
      allowCrossPrivacyBoundary: false,
      circuitBreakerThreshold: 3,
      circuitBreakerCooldownMs: 60000,
      maxRetriesPerModel: 2,
    });

    this.kuroAgent = new KuroAgent(this.modelRouter, this.toolRegistry, this.commandBus, this.editorState, 'direct');
    this.filterGraphBuilder = new FilterGraphBuilder();
    this.storeInstaller = new StorePackInstaller('./store-assets');
    this.secretManager = new SecretManager();
  }

  public getEditorState(): EditorState {
    return this.editorState;
  }

  public getCommandBus(): CommandBus {
    return this.commandBus;
  }

  public getKuroAgent(): KuroAgent {
    return this.kuroAgent;
  }

  public getStoreInstaller(): StorePackInstaller {
    return this.storeInstaller;
  }

  public getSecretManager(): SecretManager {
    return this.secretManager;
  }

  public getFilterGraphBuilder(): FilterGraphBuilder {
    return this.filterGraphBuilder;
  }

  public startRenderJob(outputPath: string): RenderJob {
    const project = this.editorState.getProject();
    const fps = project.exportDefaults.fpsNumerator / project.exportDefaults.fpsDenominator;
    const totalDurationSeconds = project.tracks.reduce((max, t) => {
      const trackMax = t.clips.reduce(
        (acc, c) => Math.max(acc, (c.timelineStartTicks + c.durationTicks) / project.timelineTimebase),
        0
      );
      return Math.max(max, trackMax);
    }, 0);

    const totalFrames = Math.max(1, Math.round(totalDurationSeconds * fps));
    const job = new RenderJob(project.id, outputPath, project.exportDefaults, totalFrames);
    this.activeRenderJobs.set(job.id, job);
    return job;
  }
}
