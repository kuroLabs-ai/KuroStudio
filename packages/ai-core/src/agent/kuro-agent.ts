import { CommandBus, EditorState } from '@kuro/editor-core';
import { generateId } from '@kuro/shared';
import { ModelRouter } from '../router/model-router';
import { ToolExecutionResult, ToolRegistry } from '../tools/tool-registry';
import { ChatMessage, ToolCall } from '../types/provider.interface';

export type AgentExecutionMode = 'review' | 'direct';

export interface PlannedOperation {
  id: string;
  toolCall: ToolCall;
  riskLevel: 'low' | 'medium' | 'high';
  description: string;
}

export interface AgentPlan {
  id: string;
  userPrompt: string;
  operations: PlannedOperation[];
  summary: string;
  requiresUserApproval: boolean;
}

export interface AgentExecutionResult {
  planId: string;
  success: boolean;
  executedOperations: ToolExecutionResult[];
  error?: string;
  summary: string;
}

export class KuroAgent {
  private router: ModelRouter;
  private toolRegistry: ToolRegistry;
  private commandBus: CommandBus;
  private editorState: EditorState;
  private mode: AgentExecutionMode = 'direct';

  constructor(
    router: ModelRouter,
    toolRegistry: ToolRegistry,
    commandBus: CommandBus,
    editorState: EditorState,
    initialMode: AgentExecutionMode = 'direct'
  ) {
    this.router = router;
    this.toolRegistry = toolRegistry;
    this.commandBus = commandBus;
    this.editorState = editorState;
    this.mode = initialMode;
  }

  public setMode(mode: AgentExecutionMode): void {
    this.mode = mode;
  }

  public getMode(): AgentExecutionMode {
    return this.mode;
  }

  public async planTask(userPrompt: string): Promise<AgentPlan> {
    const summary = this.editorState.getProject();
    const systemPrompt = `You are Kuro, the AI editing assistant inside KuroStudio video editor.
You have tools to inspect and modify the timeline. Always choose explicit, precise tool calls.
Current project: "${summary.name}", ${summary.tracks.length} tracks.
Do not hallucinate tools. Only use tools declared in the schema.`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ];

    const { response } = await this.router.completeTaskWithFallback(
      'tool_calling',
      {
        messages,
        tools: this.toolRegistry.getDefinitions(),
        temperature: 0.1,
      },
      { supportsToolCalling: true }
    );

    const toolCalls = response.message.toolCalls ?? [];
    const operations: PlannedOperation[] = toolCalls.map((tc) => ({
      id: generateId('op'),
      toolCall: tc,
      riskLevel: this.assessRisk(tc),
      description: `Execute ${tc.name} with ${JSON.stringify(tc.arguments)}`,
    }));

    const hasHighRisk = operations.some((o) => o.riskLevel === 'high');
    const requiresApproval = this.mode === 'review' || hasHighRisk;

    return {
      id: generateId('plan'),
      userPrompt,
      operations,
      summary: response.message.content || `Plan with ${operations.length} operation(s).`,
      requiresUserApproval: requiresApproval,
    };
  }

  public async executePlan(plan: AgentPlan): Promise<AgentExecutionResult> {
    const executed: ToolExecutionResult[] = [];

    try {
      const transactionDescription = `Kuro AI: ${plan.userPrompt.slice(0, 50)}`;

      await this.commandBus.executeTransaction(plan.id, transactionDescription, async () => {
        for (const op of plan.operations) {
          const res = await this.toolRegistry.executeTool(op.toolCall);
          executed.push(res);
          if (!res.success) {
            throw new Error(`Operation "${op.toolCall.name}" failed: ${res.error}`);
          }
        }
      });

      return {
        planId: plan.id,
        success: true,
        executedOperations: executed,
        summary: `Successfully executed ${executed.length} operation(s) for: "${plan.userPrompt}".`,
      };
    } catch (err) {
      return {
        planId: plan.id,
        success: false,
        executedOperations: executed,
        error: err instanceof Error ? err.message : String(err),
        summary: `Failed to execute plan: ${err instanceof Error ? err.message : String(err)}`,
      };
    }
  }

  private assessRisk(toolCall: ToolCall): 'low' | 'medium' | 'high' {
    if (toolCall.name.startsWith('get_') || toolCall.name.startsWith('search_')) {
      return 'low';
    }
    if (toolCall.name === 'delete_clip' || toolCall.name === 'export_project') {
      return 'high';
    }
    return 'medium';
  }
}
