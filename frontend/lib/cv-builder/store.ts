"use client";

import { create } from "zustand";
import { subscribeWithSelector } from "zustand/middleware";
import type {
  CvDraft,
  CvDraftData,
  DesignSettings,
  SectionKey,
  SectionMeta,
} from "./types";
import {
  DEFAULT_DESIGN,
  DEFAULT_SECTION_ORDER,
  EMPTY_DRAFT_DATA,
} from "./types";

// ─── Panel layout ─────────────────────────────────────────────────────────────
export interface PanelLayout {
  leftOpen: boolean;
  rightOpen: boolean;
}

// ─── Right sidebar tabs ───────────────────────────────────────────────────────
export type RightTab =
  | "design"
  | "typography"
  | "page"
  | "template"
  | "export"
  | "share"
  | "ats";

// ─── Left sidebar tabs ───────────────────────────────────────────────────────
export type LeftTab = "content" | "ai";

// ─── Store interface ─────────────────────────────────────────────────────────
interface CvBuilderState {
  // Draft
  draft: CvDraft | null;
  isDirty: boolean;
  isSaving: boolean;
  lastSaved: Date | null;

  // UI
  activeSection: SectionKey;
  leftTab: LeftTab;
  rightTab: RightTab;
  panelLayout: PanelLayout;
  zoom: number;

  // Actions — draft lifecycle
  initialize: (draft: CvDraft | null) => void;

  // Actions — content
  updateData: <K extends keyof CvDraftData>(key: K, value: CvDraftData[K]) => void;

  // Actions — design
  updateDesign: (patch: Partial<DesignSettings>) => void;

  // Actions — section order / visibility
  setSectionOrder: (order: SectionMeta[]) => void;
  toggleSectionVisibility: (key: SectionKey) => void;
  moveSectionUp: (key: SectionKey) => void;
  moveSectionDown: (key: SectionKey) => void;

  // Actions — UI
  setActiveSection: (key: SectionKey) => void;
  setLeftTab: (tab: LeftTab) => void;
  setRightTab: (tab: RightTab) => void;
  toggleLeft: () => void;
  toggleRight: () => void;
  setZoom: (zoom: number) => void;
  setTitle: (title: string) => void;

  // Internal
  markSaved: () => void;
  markDirty: () => void;
  setIsSaving: (v: boolean) => void;
}

// ─── Default draft factory ────────────────────────────────────────────────────
function defaultDraft(): CvDraft {
  return {
    id: "",
    userId: "",
    title: "My Resume",
    data: EMPTY_DRAFT_DATA,
    design: DEFAULT_DESIGN,
    sectionOrder: DEFAULT_SECTION_ORDER,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// ─── Store ────────────────────────────────────────────────────────────────────
export const useCvBuilderStore = create<CvBuilderState>()(
  subscribeWithSelector((set, get) => ({
    draft: null,
    isDirty: false,
    isSaving: false,
    lastSaved: null,
    activeSection: "basics",
    leftTab: "content",
    rightTab: "design",
    panelLayout: { leftOpen: true, rightOpen: true },
    zoom: 80,

    initialize: (draft) =>
      set({
        draft: draft ?? defaultDraft(),
        isDirty: false,
        lastSaved: null,
        activeSection: "basics",
      }),

    updateData: (key, value) =>
      set((state) => {
        if (!state.draft) return {};
        return {
          draft: {
            ...state.draft,
            data: { ...state.draft.data, [key]: value },
          },
          isDirty: true,
        };
      }),

    updateDesign: (patch) =>
      set((state) => {
        if (!state.draft) return {};
        return {
          draft: {
            ...state.draft,
            design: { ...state.draft.design, ...patch },
          },
          isDirty: true,
        };
      }),

    setSectionOrder: (order) =>
      set((state) => {
        if (!state.draft) return {};
        return { draft: { ...state.draft, sectionOrder: order }, isDirty: true };
      }),

    toggleSectionVisibility: (key) =>
      set((state) => {
        if (!state.draft) return {};
        const order = state.draft.sectionOrder.map((s) =>
          s.key === key ? { ...s, visible: !s.visible } : s
        );
        return { draft: { ...state.draft, sectionOrder: order }, isDirty: true };
      }),

    moveSectionUp: (key) =>
      set((state) => {
        if (!state.draft) return {};
        const order = [...state.draft.sectionOrder].sort((a, b) => a.order - b.order);
        const idx = order.findIndex((s) => s.key === key);
        if (idx <= 0) return {};
        [order[idx - 1], order[idx]] = [order[idx], order[idx - 1]];
        const reindexed = order.map((s, i) => ({ ...s, order: i }));
        return { draft: { ...state.draft, sectionOrder: reindexed }, isDirty: true };
      }),

    moveSectionDown: (key) =>
      set((state) => {
        if (!state.draft) return {};
        const order = [...state.draft.sectionOrder].sort((a, b) => a.order - b.order);
        const idx = order.findIndex((s) => s.key === key);
        if (idx === -1 || idx >= order.length - 1) return {};
        [order[idx], order[idx + 1]] = [order[idx + 1], order[idx]];
        const reindexed = order.map((s, i) => ({ ...s, order: i }));
        return { draft: { ...state.draft, sectionOrder: reindexed }, isDirty: true };
      }),

    setActiveSection: (key) => set({ activeSection: key }),
    setLeftTab: (tab) => set({ leftTab: tab }),
    setRightTab: (tab) => set({ rightTab: tab }),
    toggleLeft: () =>
      set((s) => ({
        panelLayout: { ...s.panelLayout, leftOpen: !s.panelLayout.leftOpen },
      })),
    toggleRight: () =>
      set((s) => ({
        panelLayout: { ...s.panelLayout, rightOpen: !s.panelLayout.rightOpen },
      })),
    setZoom: (zoom) => set({ zoom: Math.min(150, Math.max(40, zoom)) }),
    setTitle: (title) =>
      set((state) => {
        if (!state.draft) return {};
        return { draft: { ...state.draft, title }, isDirty: true };
      }),

    markSaved: () => set({ isDirty: false, isSaving: false, lastSaved: new Date() }),
    markDirty: () => set({ isDirty: true }),
    setIsSaving: (v) => set({ isSaving: v }),
  }))
);
