import { AgentExecutionMode, AgentPlan, ChatMessage } from '@kuro/ai-core';

type Listener = () => void;

class AIStore {
  private isDrawerOpen = true;
  private mode: AgentExecutionMode = 'direct';
  private messages: ChatMessage[] = [
    {
      role: 'assistant',
      content: 'Hello! I am Kuro, your video editing copilot. Describe what you want to edit or motion graphics you want to generate.',
    },
  ];
  private activePlan: AgentPlan | null = null;
  private isProcessing = false;
  private activeModel = 'Claude 3.5 Sonnet';
  private listeners = new Set<Listener>();

  public getIsDrawerOpen(): boolean {
    return this.isDrawerOpen;
  }

  public toggleDrawer(): void {
    this.isDrawerOpen = !this.isDrawerOpen;
    this.notify();
  }

  public getMode(): AgentExecutionMode {
    return this.mode;
  }

  public setMode(mode: AgentExecutionMode): void {
    this.mode = mode;
    this.notify();
  }

  public getMessages(): ChatMessage[] {
    return [...this.messages];
  }

  public addMessage(message: ChatMessage): void {
    this.messages.push(message);
    this.notify();
  }

  public getActivePlan(): AgentPlan | null {
    return this.activePlan;
  }

  public setActivePlan(plan: AgentPlan | null): void {
    this.activePlan = plan;
    this.notify();
  }

  public getIsProcessing(): boolean {
    return this.isProcessing;
  }

  public setIsProcessing(processing: boolean): void {
    this.isProcessing = processing;
    this.notify();
  }

  public getActiveModel(): string {
    return this.activeModel;
  }

  public setActiveModel(model: string): void {
    this.activeModel = model;
    this.notify();
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    for (const listener of this.listeners) {
      listener();
    }
  }
}

export const aiStore = new AIStore();
