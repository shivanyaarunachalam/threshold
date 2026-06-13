import { create } from 'zustand'
import { toIST } from '../utils/time.js'
import { generateDemoScenario } from '../api/scenario.js'

export const useSessionStore = create((set, get) => ({
  // Navigation
  currentScreen:    'builder',
  completedScreens: [],

  // Screen 1 — Shift context (replaces situation)
  shiftContext: generateDemoScenario(),

  // Screen 2 — Advance plot (intelligence analysis)
  intelligence: null,

  // Screen 3 — Action plan (all issues with AI recommendations)
  actionPlan: null,          // { items: ActionPlanItem[] }
  activeIssue: null,         // the issue currently open in Command Center
  resolvedIssues: [],        // array of { issueId, decision, timestamp }

  // Screen 4 — Recommendation for active issue
  recommendation: null,
  reEvaluation:   null,
  overrideAnalysis: null,

  // Audit log
  auditLog: [],

  // Async state
  loading:      false,
  error:        null,
  retryCount:   0,
  systemStatus: 'ready',

  // ── Navigation ────────────────────────────────────────────

  navigateTo: (screen) => {
    const order = ['builder', 'intelligence', 'simulator', 'command']
    const { completedScreens, currentScreen } = get()
    const targetIdx   = order.indexOf(screen)
    const currentIdx  = order.indexOf(currentScreen)

    // Always allow backward navigation
    if (targetIdx < currentIdx) {
      set({ currentScreen: screen, error: null })
      return { allowed: true }
    }

    // Allow command→simulator and simulator→command freely (issue resolution loop)
    if (
      (currentScreen === 'command'   && screen === 'simulator') ||
      (currentScreen === 'simulator' && screen === 'command')
    ) {
      set({ currentScreen: screen, error: null })
      return { allowed: true }
    }

    // Forward navigation only if all prior screens are completed
    const required    = order.slice(0, targetIdx)
    const allComplete = required.every((s) => completedScreens.includes(s))
    if (allComplete) {
      set({ currentScreen: screen, error: null })
      return { allowed: true }
    }

    return { allowed: false, blockedAt: required.find((s) => !completedScreens.includes(s)) }
  },

  markScreenComplete: (screen) =>
    set((s) => ({
      completedScreens: s.completedScreens.includes(screen)
        ? s.completedScreens
        : [...s.completedScreens, screen],
    })),

  // ── Data setters ──────────────────────────────────────────

  updateShiftContext:  (patch) => set((s) => ({ shiftContext: { ...s.shiftContext, ...patch } })),
  setIntelligence:     (data)  => set({ intelligence: data }),
  setActionPlan:       (data)  => set({ actionPlan: data }),
  setActiveIssue: (issue) => set({ activeIssue: issue, reEvaluation: null, overrideAnalysis: null }),
  setRecommendation:   (data)  => set({ recommendation: data }),
  setReEvaluation:     (data)  => set({ reEvaluation: data }),
  setOverrideAnalysis: (data)  => set({ overrideAnalysis: data }),

  resolveIssue: (issueId, decision) =>
    set((s) => ({
      resolvedIssues: [...s.resolvedIssues, { issueId, decision, timestamp: toIST(new Date()) }],
      activeIssue:    null,
      recommendation: null,
      reEvaluation:   null,
      overrideAnalysis: null,
    })),

  // Back-compat alias for old whatIf references
  setWhatIf: (data) => set({ actionPlan: data }),

  // ── Async helpers ─────────────────────────────────────────

  setLoading:      (v)    => set({ loading: v }),
  setError:        (msg)  => set({ error: msg }),
  clearError:      ()     => set({ error: null, retryCount: 0 }),
  incrementRetry:  ()     => set((s) => ({ retryCount: s.retryCount + 1 })),
  resetRetry:      ()     => set({ retryCount: 0 }),
  setSystemStatus: (s)    => set({ systemStatus: s }),

  // ── Audit log ─────────────────────────────────────────────

  appendAuditLog: (entry) =>
    set((s) => ({
      auditLog: [
        ...s.auditLog,
        { ...entry, timestamp: toIST(new Date()) },
      ],
    })),
}))
