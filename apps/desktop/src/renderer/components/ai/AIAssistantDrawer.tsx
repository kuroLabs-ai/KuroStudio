import React, { useEffect, useState } from 'react';
import { aiStore } from '../../stores/useAIStore';
import { editorStore } from '../../stores/useEditorStore';
import { SplitClipCommand, SetAudioVolumeCommand } from '@kuro/editor-core';
import {
  Sparkles,
  Send,
  X,
  Zap,
  ClipboardList,
  CheckCircle2,
  Bot,
  User,
  Circle
} from 'lucide-react';

export const AIAssistantDrawer: React.FC = () => {
  const [, setTick] = useState(0);
  const [inputText, setInputText] = useState('');

  useEffect(() => {
    return aiStore.subscribe(() => setTick((t) => t + 1));
  }, []);

  const isOpen = aiStore.getIsDrawerOpen();
  const mode = aiStore.getMode();
  const messages = aiStore.getMessages();
  const activePlan = aiStore.getActivePlan();
  const isProcessing = aiStore.getIsProcessing();
  const activeModel = aiStore.getActiveModel();

  if (!isOpen) return null;

  const handleSendPrompt = async (promptToSend?: string) => {
    const text = (promptToSend || inputText).trim();
    if (!text) return;

    aiStore.addMessage({ role: 'user', content: text });
    setInputText('');
    aiStore.setIsProcessing(true);

    setTimeout(async () => {
      const lower = text.toLowerCase();
      const project = editorStore.getProject();
      const activeClip = project.tracks[0]?.clips[0];

      if (lower.includes('split') || lower.includes('قص') || lower.includes('اقطع')) {
        if (activeClip) {
          const splitPoint = activeClip.timelineStartTicks + Math.round(activeClip.durationTicks / 2);
          if (mode === 'review') {
            aiStore.setActivePlan({
              id: 'plan_split_demo',
              userPrompt: text,
              summary: `Split clip "${activeClip.id}" at ${(splitPoint / project.timelineTimebase).toFixed(1)}s`,
              requiresUserApproval: true,
              operations: [
                {
                  id: 'op_1',
                  toolCall: { id: 'tc_1', name: 'split_clip', arguments: { clipId: activeClip.id, splitTick: splitPoint } },
                  riskLevel: 'medium',
                  description: `Split clip ${activeClip.id} at tick ${splitPoint}`,
                },
              ],
            });
          } else {
            await editorStore.executeCommand(new SplitClipCommand(activeClip.id, splitPoint));
            aiStore.addMessage({
              role: 'assistant',
              content: `Split clip "${activeClip.id}" into two sections. Operation recorded in history.`,
            });
          }
        } else {
          aiStore.addMessage({
            role: 'assistant',
            content: 'No clip found on the timeline to split. Please import and add a clip first.',
          });
        }
      } else if (lower.includes('volume') || lower.includes('صوت')) {
        if (activeClip) {
          await editorStore.executeCommand(new SetAudioVolumeCommand(activeClip.id, 0.4));
          aiStore.addMessage({
            role: 'assistant',
            content: `Adjusted audio volume of clip "${activeClip.id}" to 40%.`,
          });
        }
      } else {
        aiStore.addMessage({
          role: 'assistant',
          content: `Understood instruction: "${text}". Ready to execute or refine your timeline.`,
        });
      }

      aiStore.setIsProcessing(false);
    }, 600);
  };

  const handleApprovePlan = async () => {
    if (!activePlan) return;
    const project = editorStore.getProject();
    const activeClip = project.tracks[0]?.clips[0];
    if (activeClip) {
      const splitPoint = activeClip.timelineStartTicks + Math.round(activeClip.durationTicks / 2);
      await editorStore.executeCommand(new SplitClipCommand(activeClip.id, splitPoint));
      aiStore.addMessage({
        role: 'assistant',
        content: `Executed plan: "${activePlan.summary}". All changes applied transactionally.`,
      });
    }
    aiStore.setActivePlan(null);
  };

  const quickPills = [
    'Split clip here (قص الكليب)',
    'Set volume to 40% (خفض الصوت)',
    'Add motion title',
  ];

  return (
    <aside className="w-80 h-full bg-[var(--kuro-bg-panel)] border-l border-[var(--kuro-border-subtle)] flex flex-col select-none z-40 shrink-0 shadow-lg transition-colors">
      {/* Header */}
      <div className="p-2.5 border-b border-[var(--kuro-border-subtle)] flex items-center justify-between bg-[var(--kuro-bg-base)]">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-sm bg-[var(--kuro-bg-surface)] border border-[var(--kuro-border-subtle)] flex items-center justify-center text-[var(--kuro-text-primary)]">
            <Sparkles className="w-3 h-3" />
          </div>
          <h3 className="font-semibold text-xs text-[var(--kuro-text-primary)] uppercase tracking-wider">Kuro AI</h3>
        </div>

        <div className="flex items-center gap-1">
          {/* Mode Switcher */}
          <button
            onClick={() => aiStore.setMode(mode === 'direct' ? 'review' : 'direct')}
            className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase tracking-wider transition border ${
              mode === 'review'
                ? 'bg-[var(--kuro-text-primary)] text-[var(--kuro-bg-canvas)] border-[var(--kuro-text-primary)]'
                : 'bg-[var(--kuro-bg-surface)] text-[var(--kuro-text-secondary)] border-[var(--kuro-border-subtle)]'
            }`}
            title="Switch execution mode (Direct vs Review)"
          >
            {mode === 'direct' ? 'Direct' : 'Review'}
          </button>

          <button
            onClick={() => aiStore.toggleDrawer()}
            className="text-[var(--kuro-text-muted)] hover:text-[var(--kuro-text-primary)] p-1 rounded transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Active Model Subtitle */}
      <div className="px-3 py-1.5 bg-[var(--kuro-bg-canvas)] border-b border-[var(--kuro-border-subtle)] flex items-center justify-between text-[11px] text-[var(--kuro-text-muted)] font-mono">
        <span>Model:</span>
        <span className="text-[var(--kuro-text-secondary)] text-[10px] bg-[var(--kuro-bg-surface)] px-1.5 py-0.2 rounded border border-[var(--kuro-border-subtle)]">
          {activeModel}
        </span>
      </div>

      {/* Chat Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`p-2.5 rounded text-xs leading-relaxed border ${
              m.role === 'user'
                ? 'bg-[var(--kuro-bg-surface)] border-[var(--kuro-border-strong)] text-[var(--kuro-text-primary)] ml-3'
                : 'bg-[var(--kuro-bg-base)] border-[var(--kuro-border-subtle)] text-[var(--kuro-text-secondary)] mr-2'
            }`}
          >
            <div className="font-semibold text-[9px] uppercase tracking-wider text-[var(--kuro-text-muted)] mb-1 flex items-center gap-1 font-mono">
              {m.role === 'user' ? (
                <>
                  <User className="w-2.5 h-2.5" />
                  <span>You</span>
                </>
              ) : (
                <>
                  <Bot className="w-2.5 h-2.5" />
                  <span>Kuro</span>
                </>
              )}
            </div>
            <p>{m.content}</p>
          </div>
        ))}

        {/* Review Mode Plan Approval Card */}
        {activePlan && (
          <div className="p-3 rounded bg-[var(--kuro-bg-surface)] border border-[var(--kuro-border-strong)] space-y-2 text-xs">
            <div className="flex items-center gap-1.5 text-[var(--kuro-text-primary)] font-semibold text-[11px]">
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Proposed Plan</span>
            </div>
            <p className="text-[var(--kuro-text-secondary)]">{activePlan.summary}</p>

            <div className="space-y-1 bg-[var(--kuro-bg-canvas)] p-2 rounded text-[11px] font-mono">
              {activePlan.operations.map((op) => (
                <div key={op.id} className="flex justify-between items-center text-[var(--kuro-text-muted)]">
                  <span>{op.description}</span>
                  <span className="text-[9px] uppercase px-1 rounded border border-[var(--kuro-border-base)]">
                    {op.riskLevel}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-1.5 pt-1">
              <button
                onClick={handleApprovePlan}
                className="kuro-btn kuro-btn-primary flex-1 py-1 font-semibold text-xs"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Execute</span>
              </button>
              <button
                onClick={() => aiStore.setActivePlan(null)}
                className="kuro-btn kuro-btn-secondary px-3 py-1 text-xs"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="flex items-center gap-2 text-[var(--kuro-text-muted)] text-xs italic bg-[var(--kuro-bg-surface)] p-2 rounded border border-[var(--kuro-border-subtle)] font-mono">
            <Circle className="w-2 h-2 text-[var(--kuro-text-primary)] animate-ping" />
            <span>Analyzing timeline...</span>
          </div>
        )}
      </div>

      {/* Suggested Quick Action Pills */}
      <div className="p-2 border-t border-[var(--kuro-border-subtle)] bg-[var(--kuro-bg-canvas)] flex flex-wrap gap-1">
        {quickPills.map((pill, idx) => (
          <button
            key={idx}
            onClick={() => handleSendPrompt(pill)}
            className="text-[10px] px-2 py-0.5 rounded bg-[var(--kuro-bg-surface)] hover:bg-[var(--kuro-bg-hover)] text-[var(--kuro-text-secondary)] border border-[var(--kuro-border-subtle)] transition"
          >
            {pill}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-2.5 border-t border-[var(--kuro-border-subtle)] bg-[var(--kuro-bg-base)]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendPrompt();
          }}
          className="flex gap-1.5"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Command Kuro in English or Arabic..."
            className="flex-1 bg-[var(--kuro-bg-panel)] border border-[var(--kuro-border-subtle)] rounded px-2.5 py-1.5 text-xs text-[var(--kuro-text-primary)] placeholder-[var(--kuro-text-muted)] focus:outline-none focus:border-[var(--kuro-text-primary)] transition"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="kuro-btn kuro-btn-primary px-3 py-1.5 font-semibold disabled:opacity-30"
          >
            <Send className="w-3 h-3" />
          </button>
        </form>
      </div>
    </aside>
  );
};
