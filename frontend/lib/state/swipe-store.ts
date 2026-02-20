import { create } from "zustand";
import { persist } from "zustand/middleware";

export type SwipeDecision = "save" | "skip";

export interface SwipeRecord {
  readonly jobId: string;
  readonly decision: SwipeDecision;
  readonly timestamp: number;
}

interface SwipeState {
  readonly history: SwipeRecord[];
  readonly savedJobs: string[];
  readonly skippedJobs: string[];
  readonly markDecision: (jobId: string, decision: SwipeDecision) => void;
  readonly undoDecision: (jobId: string) => void;
  readonly clearAll: () => void;
  readonly hasDecided: (jobId: string) => boolean;
  readonly getDecision: (jobId: string) => SwipeDecision | null;
}

export const useSwipeStore = create<SwipeState>()(
  persist(
    (set, get) => ({
      history: [],
      savedJobs: [],
      skippedJobs: [],

      markDecision: (jobId: string, decision: SwipeDecision) => {
        if (get().hasDecided(jobId)) {
          return;
        }

        const record: SwipeRecord = {
          jobId,
          decision,
          timestamp: Date.now(),
        };

        set((state) => {
          const nextHistory = [...state.history, record];
          if (decision === "save") {
            return {
              history: nextHistory,
              savedJobs: [...state.savedJobs, jobId],
              skippedJobs: state.skippedJobs,
            };
          }

          return {
            history: nextHistory,
            savedJobs: state.savedJobs,
            skippedJobs: [...state.skippedJobs, jobId],
          };
        });
      },

      undoDecision: (jobId: string) => {
        set((state) => ({
          history: state.history.filter((entry) => entry.jobId !== jobId),
          savedJobs: state.savedJobs.filter((id) => id !== jobId),
          skippedJobs: state.skippedJobs.filter((id) => id !== jobId),
        }));
      },

      clearAll: () => {
        set({ history: [], savedJobs: [], skippedJobs: [] });
      },

      hasDecided: (jobId: string) => {
        return get().history.some((entry) => entry.jobId === jobId);
      },

      getDecision: (jobId: string) => {
        const entry = get().history.find((item) => item.jobId === jobId);
        return entry ? entry.decision : null;
      },
    }),
    {
      name: "autojobflow-swipes",
    },
  ),
);
