import { useState, useRef, useCallback } from 'react';
import { AI_API } from '../services/api';
import type { StructuredReport, EvidenceSummary } from '../types';

// ─── Types ───────────────────────────────────────────────

export type AiAnalysisPhase = 'idle' | 'progress' | 'letter' | 'report' | 'error';

export interface AiAnalysisState {
  phase: AiAnalysisPhase;
  result: string | null;
  report: StructuredReport | null;
  evidence: EvidenceSummary | null;
  stats: { scheduleCount: number; diaryCount: number; dateRange: string } | null;
  loading: boolean;
  errorMsg: string;
  settling: boolean;
  /** Timestamp when analysis was started (Date.now()) — used by StagedProgress to resume */
  startedAt: number | null;
}

interface PendingReport {
  report: StructuredReport;
  evidence: EvidenceSummary;
}

interface UseAiAnalysisDeps {
  apiFetch: (url: string, init?: RequestInit) => Promise<unknown>;
  addToast: (message: string, type?: 'success' | 'error') => void;
}

interface UseAiAnalysisReturn {
  state: AiAnalysisState;
  analyze: (range: { startDate: string; endDate: string }) => Promise<void>;
  abort: () => void;
  /** Transition from letter phase to report phase (user dismissed the envelope) */
  openReport: () => void;
}

// ─── Initial State ───────────────────────────────────────

const INITIAL_STATE: AiAnalysisState = {
  phase: 'idle',
  result: null,
  report: null,
  evidence: null,
  stats: null,
  loading: false,
  errorMsg: '',
  settling: false,
  startedAt: null,
};

// ─── Hook ────────────────────────────────────────────────

export function useAiAnalysis({ apiFetch, addToast }: UseAiAnalysisDeps): UseAiAnalysisReturn {
  const [state, setState] = useState<AiAnalysisState>(INITIAL_STATE);

  const requestTokenRef = useRef(0);
  const abortRef = useRef<AbortController | null>(null);
  const pendingReportRef = useRef<PendingReport | null>(null);
  const settleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const abort = useCallback(() => {
    // Invalidate all in-flight work
    requestTokenRef.current += 1;

    if (settleTimerRef.current) {
      clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
    pendingReportRef.current = null;

    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
    }

    // Reset transient progress state — the request was cancelled and will never complete
    setState(prev => prev.phase === 'progress' ? { ...INITIAL_STATE } : prev);
  }, []);

  const openReport = useCallback(() => {
    setState(prev => prev.phase === 'letter' ? { ...prev, phase: 'report' } : prev);
  }, []);

  const analyze = useCallback(async (range: { startDate: string; endDate: string }) => {
    abort(); // cancel any previous request
    const currentToken = requestTokenRef.current;

    setState(prev => ({
      ...prev,
      phase: 'progress',
      loading: true,
      result: null,
      report: null,
      evidence: null,
      stats: null,
      errorMsg: '',
      settling: false,
      startedAt: Date.now(),
    }));

    const ctrl = new AbortController();
    abortRef.current = ctrl;

    try {
      const res = await apiFetch(AI_API.analyze, {
        method: 'POST',
        body: JSON.stringify(range),
        signal: ctrl.signal,
      });

      if (currentToken !== requestTokenRef.current) return;

      if (res?.structured === true && res.report) {
        // Structured report: capture data, then settle → letter → report
        const evidence = res.evidenceSummary ?? { schedules: [], diaries: [] };
        const stats = {
          scheduleCount: res.scheduleCount ?? 0,
          diaryCount: res.diaryCount ?? 0,
          dateRange: res.dateRange ?? '',
        };

        setState(prev => ({
          ...prev,
          report: res.report,
          evidence,
          stats,
          settling: true,
        }));

        pendingReportRef.current = { report: res.report, evidence };

        settleTimerRef.current = setTimeout(() => {
          if (currentToken !== requestTokenRef.current) return;
          const pending = pendingReportRef.current;
          if (!pending) return;
          setState(prev => ({
            ...prev,
            report: pending.report,
            evidence: pending.evidence,
            settling: false,
            phase: 'letter',
          }));
          pendingReportRef.current = null;
        }, 1400);
      } else {
        // Simple markdown result
        setState(prev => ({
          ...prev,
          phase: 'idle',
          result: res?.markdown || '分析完成',
          stats: {
            scheduleCount: res?.scheduleCount ?? 0,
            diaryCount: res?.diaryCount ?? 0,
            dateRange: res?.dateRange ?? '',
          },
        }));
      }
    } catch (err) {
      if ((err as DOMException)?.name === 'AbortError') return;
      if (currentToken !== requestTokenRef.current) return;

      const msg = err instanceof Error ? err.message : 'AI 分析失败';
      const displayMsg = msg === 'AI_STRUCTURED_REPORT_INVALID'
        ? '报告格式整理失败，请重试。'
        : msg;
      addToast(displayMsg, 'error');
      setState(prev => ({
        ...prev,
        phase: 'error',
        errorMsg: displayMsg,
        settling: false,
      }));
    } finally {
      if (currentToken === requestTokenRef.current) {
        setState(prev => ({ ...prev, loading: false }));
        abortRef.current = null;
      }
    }
  }, [apiFetch, addToast, abort]);

  return { state, analyze, abort, openReport };
}
