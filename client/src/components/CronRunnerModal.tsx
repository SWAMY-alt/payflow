import React, { useState } from 'react';
import { X, Play, Clock, ShieldAlert, RotateCw, CheckCircle2, Terminal } from 'lucide-react';
import { api } from '../lib/api';

interface CronRunnerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobExecuted: () => void;
}

export const CronRunnerModal: React.FC<CronRunnerModalProps> = ({
  isOpen,
  onClose,
  onJobExecuted,
}) => {
  const [isRunning, setIsRunning] = useState(false);
  const [activeTab, setActiveTab] = useState<'all' | 'late-fee' | 'follow-up' | 'recurring'>('all');
  const [logs, setLogs] = useState<string[]>([]);
  const [lastExecuted, setLastExecuted] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRun = async (type: 'all' | 'late-fee' | 'follow-up' | 'recurring') => {
    try {
      setIsRunning(true);
      setActiveTab(type);

      let outputDetails: string[] = [];

      if (type === 'all') {
        const res = await api.jobs.runAll();
        for (const jobRes of res.results) {
          outputDetails.push(`[${jobRes.jobName}] Processed ${jobRes.processedCount} records:`);
          if (jobRes.details.length === 0) {
            outputDetails.push(`  • No records required actions.`);
          } else {
            jobRes.details.forEach((d: string) => outputDetails.push(`  • ${d}`));
          }
        }
      } else if (type === 'late-fee') {
        const res = await api.jobs.runLateFee();
        outputDetails.push(`[${res.result.jobName}] Processed ${res.result.processedCount} records:`);
        if (res.result.details.length === 0) {
          outputDetails.push(`  • No overdue invoices required late fee additions.`);
        } else {
          res.result.details.forEach((d: string) => outputDetails.push(`  • ${d}`));
        }
      } else if (type === 'follow-up') {
        const res = await api.jobs.runFollowUp();
        outputDetails.push(`[${res.result.jobName}] Processed ${res.result.processedCount} records:`);
        if (res.result.details.length === 0) {
          outputDetails.push(`  • No follow-up reminders needed today.`);
        } else {
          res.result.details.forEach((d: string) => outputDetails.push(`  • ${d}`));
        }
      } else if (type === 'recurring') {
        const res = await api.jobs.runRecurring();
        outputDetails.push(`[${res.result.jobName}] Processed ${res.result.processedCount} records:`);
        if (res.result.details.length === 0) {
          outputDetails.push(`  • No recurring templates due for generation.`);
        } else {
          res.result.details.forEach((d: string) => outputDetails.push(`  • ${d}`));
        }
      }

      setLogs(outputDetails);
      setLastExecuted(new Date().toLocaleTimeString());
      onJobExecuted();
    } catch (err: any) {
      setLogs([`ERROR: ${err.message}`]);
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-brand-500/10 border border-brand-500/20 flex items-center justify-center">
              <Play className="w-4 h-4 text-brand-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">Automation Engine (Cron Passes)</h3>
              <p className="text-xs text-slate-400">
                Daily scheduled tasks: Late-fee math, follow-up escalation, & recurring invoices
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Info Box */}
        <div className="p-3 mb-4 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-400">
          In production, these 3 passes run automatically every midnight via <code className="text-brand-400 font-mono">node-cron</code>. Use these controls to trigger and inspect them instantly for verification.
        </div>

        {/* Action Triggers Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
          <button
            type="button"
            disabled={isRunning}
            onClick={() => handleRun('all')}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeTab === 'all'
                ? 'bg-brand-500/20 border-brand-500/40 text-white'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <Play className="w-3.5 h-3.5 text-brand-400" />
              <span className="text-[10px] uppercase font-bold text-brand-400">All 3</span>
            </div>
            <p className="text-xs font-bold">Run All Passes</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Executes 1, 2 & 3</p>
          </button>

          <button
            type="button"
            disabled={isRunning}
            onClick={() => handleRun('late-fee')}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeTab === 'late-fee'
                ? 'bg-rose-500/20 border-rose-500/40 text-white'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-[10px] uppercase font-bold text-rose-400">Pass 1</span>
            </div>
            <p className="text-xs font-bold">Late Fee Pass</p>
            <p className="text-[10px] text-slate-500 mt-0.5">% on remaining</p>
          </button>

          <button
            type="button"
            disabled={isRunning}
            onClick={() => handleRun('follow-up')}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeTab === 'follow-up'
                ? 'bg-amber-500/20 border-amber-500/40 text-white'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-[10px] uppercase font-bold text-amber-400">Pass 2</span>
            </div>
            <p className="text-xs font-bold">Follow-Up Pass</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Due → 3d → 7d+</p>
          </button>

          <button
            type="button"
            disabled={isRunning}
            onClick={() => handleRun('recurring')}
            className={`p-3 rounded-xl border text-left transition-all ${
              activeTab === 'recurring'
                ? 'bg-purple-500/20 border-purple-500/40 text-white'
                : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
            }`}
          >
            <div className="flex items-center justify-between mb-1">
              <RotateCw className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-[10px] uppercase font-bold text-purple-400">Pass 3</span>
            </div>
            <p className="text-xs font-bold">Recurring Pass</p>
            <p className="text-[10px] text-slate-500 mt-0.5">Schedule rebill</p>
          </button>
        </div>

        {/* Live Execution Output Terminal */}
        <div className="rounded-xl bg-slate-950 border border-slate-800 p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Terminal className="w-4 h-4 text-brand-400" />
              <span className="text-xs font-mono font-semibold text-slate-300">
                Execution Log
              </span>
            </div>
            {lastExecuted && (
              <span className="text-[11px] font-mono text-slate-500">
                Last run: {lastExecuted}
              </span>
            )}
          </div>

          <div className="min-h-[140px] max-h-56 overflow-y-auto text-xs font-mono space-y-1 custom-scroll text-slate-300">
            {isRunning ? (
              <div className="py-6 text-center text-brand-400 animate-pulse">
                Running automation pass...
              </div>
            ) : logs.length === 0 ? (
              <div className="py-6 text-center text-slate-600">
                Click any pass button above to run and inspect job execution output.
              </div>
            ) : (
              logs.map((line, idx) => (
                <div
                  key={idx}
                  className={
                    line.startsWith('ERROR')
                      ? 'text-rose-400'
                      : line.includes('Applied')
                      ? 'text-emerald-400'
                      : line.includes('Flagged')
                      ? 'text-amber-400'
                      : line.includes('Generated')
                      ? 'text-purple-400'
                      : 'text-slate-300'
                  }
                >
                  {line}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="flex justify-end pt-4 mt-4 border-t border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
