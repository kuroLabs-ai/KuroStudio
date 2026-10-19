import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { fileURLToPath } from 'url';
import { CommandBus, EditorState } from '@kuro/editor-core';
import { KuroAgent, ModelRouter } from '@kuro/ai-core';
import { ToolRegistry } from '@kuro/ai-core';
import { createNewProject, Project } from '@kuro/project-format';
import { FilterGraphBuilder, RenderJob } from '@kuro/media-engine';
import { StorePackInstaller } from '@kuro/store';
import { SecretManager } from './secrets';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

let mainWindow: BrowserWindow | null = null;
const kuroApp = new KuroDesktopApplication();

function createMainWindow(): void {
  mainWindow = new BrowserWindow({
    title: 'KuroStudio',
    width: 1440,
    height: 900,
    minWidth: 1080,
    minHeight: 700,
    backgroundColor: '#090d16',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.resolve(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  // Load the built renderer index.html
  const indexPath = path.resolve(__dirname, '../renderer/index.html');
  mainWindow.loadFile(indexPath).catch((err) => {
    console.error('Failed to load renderer HTML:', err);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// App lifecycle
app.whenReady().then(() => {
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
