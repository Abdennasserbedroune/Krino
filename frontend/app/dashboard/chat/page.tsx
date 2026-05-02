"use client";

import Protected from "@/components/Protected";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import dynamic from "next/dynamic";

const ChatPageInner = dynamic(() => import("../../../components/chat/ChatPageInner"), { ssr: false });

const CARD_SHADOW =
  "0 0 0 1px rgba(0,0,0,0.06), 0 1px 1px -0.5px rgba(0,0,0,0.06), 0 3px 3px -1.5px rgba(0,0,0,0.06), 0 6px 6px -3px rgba(0,0,0,0.06), 0 12px 12px -6px rgba(0,0,0,0.06), 0 24px 24px -12px rgba(0,0,0,0.06)";

export default function ChatRoutePage() {
  const { t } = useLanguage();
  return (
    <Protected>
      <div style={{ marginBottom: 32 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "4px 14px 4px 8px",
            borderRadius: 9999,
            background: "rgba(255,255,255,0.82)",
            backdropFilter: "blur(8px)",
            WebkitBackdropFilter: "blur(8px)",
            border: "1px solid rgba(17,24,39,0.09)",
            boxShadow: "0 1px 4px rgba(17,24,39,0.06)",
            marginBottom: 16,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#3b82f6", display: "inline-block", flexShrink: 0 }} />
          <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.12em", textTransform: "uppercase", color: "#6B7280" }}>
            Job Seeker · AI Career Chat
          </span>
        </div>
        <h1 style={{ margin: 0, fontSize: "clamp(28px, 4vw, 48px)", fontWeight: 500, lineHeight: 1.1, letterSpacing: "-0.025em", color: "#111827" }}>
          {t.chatPage.title}
        </h1>
      </div>
      <div style={{ padding: 1, borderRadius: 32, background: "linear-gradient(135deg, rgba(255,255,255,0.92) 0%, rgba(17,24,39,0.07) 100%)" }}>
        <div style={{ borderRadius: 31, background: "#FFFFFF", boxShadow: CARD_SHADOW, padding: "32px", minHeight: 480 }}>
          <ChatPageInner />
        </div>
      </div>
    </Protected>
  );
}
