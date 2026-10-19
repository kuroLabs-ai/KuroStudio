import React, { useEffect, useState } from 'react';
import { aiStore } from '../../stores/useAIStore';
import { editorStore } from '../../stores/useEditorStore';
import { timelineStore } from '../../stores/useTimelineStore';
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
  AlertTriangle
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

    // Simulate intelligent prompt parsing & command planning
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
            // Direct mode
            await editorStore.executeCommand(new SplitClipCommand(activeClip.id, splitPoint));
            aiStore.addMessage({
              role: 'assistant',
              content: `Successfully split clip "${activeClip.id}" into two sections. Operation recorded in history.`,
            });
          }
        } else {
          aiStore.addMessage({
            role: 'assistant',
            content: '⚠️ No clip found on the timeline to split. Please add a clip first.',
          });
        }
      } else if (lower.includes('volume') || lower.includes('صوت')) {
        if (activeClip) {
          await editorStore.executeCommand(new SetAudioVolumeCommand(activeClip.id, 0.4));
          aiStore.addMessage({
            role: 'assistant',
            content: `Lowered audio volume of clip "${activeClip.id}" to 40%.`,
          });
        }
      } else {
        aiStore.addMessage({
          role: 'assistant',
          content: `I understood your instruction: "${text}". Ready to execute or refine your timeline.`,
        });
      }

      aiStore.setIsProcessing(false);
    }, 700);
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
        content: `Approved plan executed: "${activePlan.summary}". All changes applied transactionally.`,
      });
    }
    aiStore.setActivePlan(null);
  };

  const quickPills = [
    'Split clip here (قص الكليب)',
    'Lower volume to 40% (وطي الصوت)',
    'Add motion title intro',
  ];

  return (
    <aside className="w-80 h-full bg-slate-900 border-l border-slate-800 flex flex-col select-none z-40 shrink-0 shadow-2xl">
      {/* Header */}
      <div className="p-3 border-b border-slate-800 flex items-center justify-between bg-slate-950/70">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
            <Sparkles className="w-3.5 h-3.5 text-purple-300 animate-pulse" />
          </div>
          <h3 className="font-bold text-xs text-purple-200">Kuro AI Copilot</h3>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Mode Switcher */}
          <button
            onClick={() => aiStore.setMode(mode === 'direct' ? 'review' : 'direct')}
            className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider transition flex items-center gap-1 ${
              mode === 'review'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            }`}
            title="Switch execution mode (Direct vs Review)"
          >
            {mode === 'direct' ? (
              <>
                <Zap className="w-2.5 h-2.5 text-emerald-300" />
                <span>Direct</span>
              </>
            ) : (
              <>
                <ClipboardList className="w-2.5 h-2.5 text-amber-300" />
                <span>Review</span>
              </>
            )}
          </button>

          <button
            onClick={() => aiStore.toggleDrawer()}
            className="text-slate-400 hover:text-slate-200 p-1 hover:bg-slate-800 rounded transition"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Active Model Pill */}
      <div className="px-3 py-1.5 bg-slate-950/90 border-b border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
        <span>Provider Model:</span>
        <span className="text-purple-300 font-medium font-mono text-[10px] bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-800/40">
          {activeModel}
        </span>
      </div>

      {/* Chat Messages Log */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {messages.map((m, idx) => (
          <div
            key={idx}
            className={`p-2.5 rounded-lg text-xs leading-relaxed shadow-sm ${
              m.role === 'user'
                ? 'bg-sky-950/60 border border-sky-800/40 text-sky-100 ml-4'
                : 'bg-slate-800/60 border border-slate-800 text-slate-200 mr-2'
            }`}
          >
            <div className="font-semibold text-[10px] uppercase tracking-wider text-slate-400 mb-1 flex items-center gap-1">
              {m.role === 'user' ? (
                <>
                  <User className="w-3 h-3 text-sky-400" />
                  <span>You</span>
                </>
              ) : (
                <>
                  <Bot className="w-3 h-3 text-purple-400" />
                  <span className="text-purple-300 font-bold">Kuro AI</span>
                </>
              )}
            </div>
            <p>{m.content}</p>
          </div>
        ))}

        {/* Review Mode Plan Approval Card */}
        {activePlan && (
          <div className="p-3 rounded-lg bg-amber-950/40 border border-amber-600/50 space-y-2 text-xs shadow-lg">
            <div className="flex items-center gap-1.5 text-amber-300 font-semibold">
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Proposed Execution Plan</span>
            </div>
            <p className="text-slate-300">{activePlan.summary}</p>

            <div className="space-y-1 bg-black/40 p-2 rounded text-[11px]">
              {activePlan.operations.map((op) => (
                <div key={op.id} className="flex justify-between items-center text-slate-400">
                  <span>{op.description}</span>
                  <span className="text-[9px] uppercase px-1.5 py-0.5 rounded bg-amber-900/60 text-amber-300 font-bold">
                    {op.riskLevel}
                  </span>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <button
                onClick={handleApprovePlan}
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-1.5 rounded text-xs transition flex items-center justify-center gap-1"
              >
                <CheckCircle2 className="w-3 h-3" />
                <span>Approve & Execute</span>
              </button>
              <button
                onClick={() => aiStore.setActivePlan(null)}
                className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 py-1.5 rounded text-xs transition"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="flex items-center gap-2 text-purple-400 text-xs italic bg-purple-950/20 p-2 rounded border border-purple-800/30">
            <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
            <span>Kuro is inspecting timeline and planning edits...</span>
          </div>
        )}
      </div>

      {/* Suggested Quick Action Pills */}
      <div className="p-2 border-t border-slate-800/80 bg-slate-950/40 flex flex-wrap gap-1">
        {quickPills.map((pill, idx) => (
          <button
            key={idx}
            onClick={() => handleSendPrompt(pill)}
            className="text-[10px] px-2 py-0.5 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60 transition"
          >
            {pill}
          </button>
        ))}
      </div>

      {/* Input Box */}
      <div className="p-2.5 border-t border-slate-800 bg-slate-950">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendPrompt();
          }}
          className="flex gap-2"
        >
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ask Kuro in English or Arabic (اطلب أي أمر)..."
            className="flex-1 bg-slate-900 border border-slate-700/80 rounded-lg px-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-purple-500"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="studio-btn studio-btn-ai text-xs px-3 py-1.5 font-bold disabled:opacity-40 flex items-center gap-1 shadow-sm"
          >
            <Send className="w-3 h-3" />
            <span>Send</span>
          </button>
        </form>
      </div>
    </aside>
  );
};
