"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Send, Bot, User, FileText, Sparkles } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageContext";
import Protected from "@/components/Protected";

interface CvItem {
    id: number;
    original_filename: string;
    analyzed_at: string | null;
}

interface ChatMessage {
    role: "user" | "assistant";
    content: string;
}

export default function ChatPage() {
    const [cvs,          setCvs]          = useState<CvItem[]>([]);
    const [selectedCvId, setSelectedCvId] = useState<number | null>(null);
    const [messages,     setMessages]     = useState<ChatMessage[]>([]);
    const [input,        setInput]        = useState("");
    const [sending,      setSending]      = useState(false);
    const [isTyping,     setIsTyping]     = useState(false);
    const [loading,      setLoading]      = useState(true);
    const { t } = useLanguage();
    const messagesEndRef  = useRef<HTMLDivElement>(null);
    const selectedCvIdRef = useRef<number | null>(null);
    useEffect(() => { selectedCvIdRef.current = selectedCvId; }, [selectedCvId]);

    const fetchCvs = useCallback(async () => {
        setLoading(true);
        try {
            const res = await fetch("/api/v1/cv/mine", { credentials: "include" });
            if (res.status === 401) { setLoading(false); return; }
            if (!res.ok) throw new Error("Unable to load CVs");
            const data = (await res.json()) as CvItem[];
            setCvs(data);
            const currentId  = selectedCvIdRef.current;
            const stillValid = currentId !== null && data.some(c => c.id === currentId);
            if (!stillValid) setSelectedCvId(data.length > 0 ? data[0].id : null);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { void fetchCvs(); }, [fetchCvs]);

    useEffect(() => {
        const handler = () => void fetchCvs();
        window.addEventListener("cv:uploaded", handler);
        window.addEventListener("cv:deleted",  handler);
        return () => {
            window.removeEventListener("cv:uploaded", handler);
            window.removeEventListener("cv:deleted",  handler);
        };
    }, [fetchCvs]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    useEffect(() => {
        if (!selectedCvId) return;
        const stored = localStorage.getItem(`chat_messages_${selectedCvId}`);
        if (stored) {
            try { setMessages(JSON.parse(stored) as ChatMessage[]); }
            catch { setMessages([{ role: "assistant", content: "Hello! I'm your AI career assistant. How can I help you?" }]); }
        } else {
            setMessages([{ role: "assistant", content: "Hello! I'm your AI career assistant powered by Groq. I can help you prepare for interviews, improve your CV, or answer job-related questions. How can I assist you today?" }]);
        }
    }, [selectedCvId]);

    useEffect(() => {
        if (selectedCvId && messages.length > 0)
            localStorage.setItem(`chat_messages_${selectedCvId}`, JSON.stringify(messages));
    }, [messages, selectedCvId]);

    const FREE_LIMIT = 10;
    const userMessageCount = messages.filter(m => m.role === "user").length;
    const limitReached = userMessageCount >= FREE_LIMIT;

    const handleSend = async () => {
        if (!input.trim() || !selectedCvId || sending || limitReached) return;
        const userMessage: ChatMessage = { role: "user", content: input.trim() };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput("");
        setSending(true);
        try {
            const res = await fetch("/api/v1/chat", {
                method: "POST",
                credentials: "include",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ cv_id: selectedCvId, messages: updatedMessages.slice(-10) }),
            });
            if (!res.ok) {
                const errData = await res.json().catch(() => ({})) as { detail?: string };
                throw new Error(errData.detail ?? "Failed to send message");
            }
            const data = (await res.json()) as { reply: string };
            setIsTyping(true);
            await new Promise(r => setTimeout(r, 800));
            const words = data.reply.split(" ");
            let currentText = "";
            setMessages([...updatedMessages, { role: "assistant", content: "" }]);
            for (let i = 0; i < words.length; i++) {
                currentText += (i === 0 ? "" : " ") + words[i];
                setMessages([...updatedMessages, { role: "assistant", content: currentText }]);
                await new Promise(r => setTimeout(r, 30 + Math.random() * 40));
            }
            setIsTyping(false);
        } catch (err: unknown) {
            console.error(err);
            setIsTyping(false);
            const msg = err instanceof Error ? err.message : "Sorry, I encountered an error. Please try again.";
            setMessages([...updatedMessages, { role: "assistant", content: msg }]);
        } finally {
            setSending(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void handleSend(); }
    };

    return (
        <Protected>
            {/* Page heading */}
            <div style={{ marginBottom: 32 }}>
                <div className="page-overline-badge">
                    <span>AI Career Chat</span>
                </div>
                <h1 className="page-h1">{t.chatPage.title}</h1>
            </div>

            {/* Card shell */}
            <div className="page-card-shell">
                <div className="page-card-inner">

                    {loading && (
                        <div className="flex items-center gap-3 p-6">
                            <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{t.ui.loading}</p>
                        </div>
                    )}

                    {!loading && cvs.length === 0 && (
                        <div className="rounded-3xl border-2 border-dashed border-primary/30 bg-primary/5 p-8 sm:p-12 text-center">
                            <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center rounded-3xl bg-muted">
                                <FileText className="h-8 w-8 text-primary" />
                            </div>
                            <p className="font-serif text-2xl text-foreground mb-2">{t.ext.chatNoCv}</p>
                            <p className="text-sm text-muted-foreground max-w-md mx-auto">{t.ext.chatGoToMatch}</p>
                        </div>
                    )}

                    {!loading && cvs.length > 0 && (
                        <div className="space-y-6 sm:space-y-8">
                            <div className="grid gap-4 sm:gap-6 lg:gap-8 lg:grid-cols-[280px_1fr]">

                                {/* CV selector */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="h-2 w-2 rounded-full bg-primary" />
                                        <h2 className="font-serif text-lg sm:text-xl text-foreground">{t.ext.chatSelectCv}</h2>
                                    </div>
                                    <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-x-visible lg:pb-0">
                                        {cvs.map(cv => (
                                            <button
                                                key={cv.id}
                                                onClick={() => setSelectedCvId(cv.id)}
                                                className={`flex-shrink-0 w-[200px] lg:w-full rounded-2xl border p-3 sm:p-4 text-left transition-all ${
                                                    selectedCvId === cv.id
                                                        ? "border-primary bg-primary/5 shadow-sm"
                                                        : "border-border bg-card hover:border-primary/40 hover:bg-muted shadow-sm hover:shadow-md hover:-translate-y-0.5"
                                                }`}
                                            >
                                                <p className="truncate text-sm font-semibold text-foreground">{cv.original_filename}</p>
                                                <p className="text-xs text-muted-foreground mt-0.5">{cv.analyzed_at ? t.ext.chatAnalyzed : t.ext.chatNotAnalyzed}</p>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Chat area */}
                                <div className="flex h-[480px] sm:h-[560px] lg:h-[640px] flex-col rounded-3xl border border-border bg-card shadow-sm overflow-hidden relative">
                                    <div className="border-b border-border bg-muted/50 px-4 sm:px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20">
                                                <Bot className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
                                            </div>
                                            <div>
                                                <h3 className="font-serif text-lg sm:text-xl text-foreground">{t.ext.assistantPowered}</h3>
                                                <p className="text-xs text-muted-foreground mt-0.5">{FREE_LIMIT - userMessageCount} {t.ext.msgsLeft}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6 bg-gradient-to-b from-transparent to-background/20">
                                        {messages.map((msg, idx) => (
                                            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                                <div className="flex max-w-[85%] items-end gap-2">
                                                    {msg.role === "assistant" && (
                                                        <div className="flex h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 mt-1">
                                                            <Bot className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                                                        </div>
                                                    )}
                                                    <div className={`px-4 py-2.5 sm:py-3 shadow-sm ${
                                                        msg.role === "user"
                                                            ? "rounded-2xl rounded-br-sm bg-primary text-primary-foreground"
                                                            : "rounded-2xl rounded-bl-sm border border-border bg-card text-foreground"
                                                    }`}>
                                                        <p className="text-sm sm:text-base leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                                    </div>
                                                    {msg.role === "user" && (
                                                        <div className="flex h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0 items-center justify-center rounded-full bg-muted mt-1">
                                                            <User className="h-3 w-3 sm:h-4 sm:w-4 text-foreground/70" />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        ))}

                                        {sending && !isTyping && (
                                            <div className="flex justify-start">
                                                <div className="flex items-end gap-2">
                                                    <div className="flex h-6 w-6 sm:h-8 sm:w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 mt-1">
                                                        <Bot className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
                                                    </div>
                                                    <div className="rounded-2xl rounded-bl-sm border border-border bg-card px-4 py-3 sm:py-4 shadow-sm">
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60" />
                                                            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:0.2s]" />
                                                            <div className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/60 [animation-delay:0.4s]" />
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {limitReached && (
                                            <div className="flex flex-col items-center gap-2 rounded-2xl border border-[var(--negative)] bg-[var(--negative)]/10 p-6 text-center mt-4">
                                                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-[var(--negative)]/15 text-[var(--negative)] mb-1">
                                                    <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
                                                </div>
                                                <p className="text-sm font-semibold text-[var(--negative)]">{t.ext.freeLimitReached}</p>
                                                <p className="text-xs text-muted-foreground">{t.ext.upgradePro}</p>
                                                <button className="mt-2 rounded-full bg-[var(--negative)] px-5 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-90 hover:-translate-y-0.5 transition-all">
                                                    {t.ext.upgradePro}
                                                </button>
                                            </div>
                                        )}
                                        <div ref={messagesEndRef} />
                                    </div>

                                    <div className="border-t border-border bg-card/50 px-3 sm:px-5 py-3 sm:py-4">
                                        <div className="flex items-center gap-2 sm:gap-3 bg-background rounded-full border border-border pl-2 pr-1.5 py-1.5 focus-within:ring-2 focus-within:ring-primary/40 focus-within:border-primary/40 transition-shadow">
                                            <input
                                                type="text"
                                                value={input}
                                                onChange={e => setInput(e.target.value)}
                                                onKeyPress={handleKeyPress}
                                                placeholder={limitReached ? t.ext.upgradePro + "..." : t.ext.askAnything}
                                                disabled={sending || limitReached}
                                                className="flex-1 bg-transparent px-3 sm:px-4 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none disabled:opacity-50"
                                            />
                                            <button
                                                onClick={handleSend}
                                                disabled={!input.trim() || sending || limitReached}
                                                className="inline-flex h-9 sm:h-10 items-center justify-center gap-2 rounded-full bg-primary px-4 sm:px-6 text-sm font-semibold text-primary-foreground shadow-sm transition-all hover:shadow-md hover:-translate-y-0.5 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                                            >
                                                <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                                                <span className="hidden sm:inline">{t.ext.send}</span>
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </Protected>
    );
}
