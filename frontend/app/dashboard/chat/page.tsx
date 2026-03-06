"use client";

import { useEffect, useRef, useState } from "react";
import { Send, Bot, User, FileText, Sparkles } from "lucide-react";

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
    const messagesEndRef  = useRef<HTMLDivElement>(null);
    const selectedCvIdRef = useRef<number | null>(null);
    useEffect(() => { selectedCvIdRef.current = selectedCvId; }, [selectedCvId]);

    async function fetchCvs() {
        setLoading(true);
        try {
            const res = await fetch("/api/v1/cv/mine", { credentials: "include" });
            if (res.status === 401) { setLoading(false); return; }
            if (!res.ok) throw new Error("Unable to load CVs");
            const data = (await res.json()) as CvItem[];
            setCvs(data);
            const currentId   = selectedCvIdRef.current;
            const stillValid  = currentId !== null && data.some(c => c.id === currentId);
            if (!stillValid) setSelectedCvId(data.length > 0 ? data[0].id : null);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => { void fetchCvs(); }, []);

    useEffect(() => {
        const handler = () => void fetchCvs();
        window.addEventListener("cv:deleted", handler);
        return () => window.removeEventListener("cv:deleted", handler);
    }, []);

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

    // Free tier: 10 user messages per CV
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

    if (loading) {
        return (
            <div className="flex items-center gap-3 border-2 border-foreground bg-background p-6">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Loading chat...</p>
            </div>
        );
    }

    if (cvs.length === 0) {
        return (
            <div className="border-2 border-dashed border-foreground bg-background/50 p-8 sm:p-12 text-center">
                <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center border-2 border-foreground bg-secondary">
                    <FileText className="h-8 w-8 text-foreground" />
                </div>
                <p className="font-serif text-xl font-bold uppercase tracking-tight mb-2">No CV uploaded yet</p>
                <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
                    Go to the <span className="font-bold text-foreground">Job Match</span> tab to upload your CV, then come back here.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-6 sm:space-y-8">
            <div className="grid gap-4 sm:gap-6 lg:gap-8 lg:grid-cols-[280px_1fr]">

                {/* ── CV Sidebar ── */}
                <div className="space-y-3">
                    <div className="flex items-center gap-2">
                        <div className="h-1.5 w-6 bg-primary" />
                        <h2 className="font-serif text-lg sm:text-xl font-bold uppercase tracking-tight text-foreground">Select CV</h2>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-x-visible lg:pb-0">
                        {cvs.map(cv => (
                            <button
                                key={cv.id}
                                onClick={() => setSelectedCvId(cv.id)}
                                className={`flex-shrink-0 w-[200px] lg:w-full border-2 border-foreground p-3 sm:p-4 text-left transition-all ${
                                    selectedCvId === cv.id
                                        ? "bg-primary text-primary-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                                        : "bg-background text-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                                }`}
                            >
                                <p className="truncate text-sm font-bold uppercase tracking-tight">{cv.original_filename}</p>
                                <p className="text-xs font-medium uppercase tracking-widest opacity-80 mt-0.5">
                                    {cv.analyzed_at ? "Analyzed" : "Not analyzed"}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* ── Chat Area ── */}
                <div className="flex h-[480px] sm:h-[560px] lg:h-[640px] flex-col border-2 border-foreground bg-card shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] sm:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">

                    {/* Chat header */}
                    <div className="border-b-2 border-foreground bg-secondary px-4 sm:px-5 py-3 sm:py-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center border-2 border-foreground bg-primary">
                                <Bot className="h-4 w-4 sm:h-5 sm:w-5 text-primary-foreground" />
                            </div>
                            <div>
                                <h3 className="font-serif text-lg sm:text-xl font-bold uppercase tracking-tight text-foreground">AI Career Assistant</h3>
                                <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Powered by Groq · AI · {FREE_LIMIT - userMessageCount} messages left</p>
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 space-y-3 sm:space-y-4 overflow-y-auto p-4 sm:p-6">
                        {messages.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
                                <div className="flex max-w-[90%] sm:max-w-[85%] items-start gap-2 sm:gap-3">
                                    {msg.role === "assistant" && (
                                        <div className="flex h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 items-center justify-center border-2 border-foreground bg-secondary">
                                            <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-foreground" />
                                        </div>
                                    )}
                                    <div className={`border-2 border-foreground px-3 sm:px-4 py-2 sm:py-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${
                                        msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-background text-foreground"
                                    }`}>
                                        <p className="text-sm sm:text-base font-medium leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                                    </div>
                                    {msg.role === "user" && (
                                        <div className="flex h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 items-center justify-center border-2 border-foreground bg-accent">
                                            <User className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-accent-foreground" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {sending && !isTyping && (
                            <div className="flex justify-start">
                                <div className="flex items-start gap-2 sm:gap-3">
                                    <div className="flex h-7 w-7 sm:h-8 sm:w-8 flex-shrink-0 items-center justify-center border-2 border-foreground bg-secondary">
                                        <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-foreground" />
                                    </div>
                                    <div className="border-2 border-foreground bg-background px-3 sm:px-4 py-2 sm:py-3 shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
                                        <div className="flex items-center gap-1.5">
                                            <div className="h-2 w-2 animate-bounce rounded-full bg-primary" />
                                            <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:0.2s]" />
                                            <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:0.4s]" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {limitReached && (
                            <div className="flex flex-col items-center gap-3 border-2 border-dashed border-red-400 bg-red-50 p-4 sm:p-6 text-center">
                                <div className="flex h-10 w-10 sm:h-12 sm:w-12 items-center justify-center rounded-full bg-red-500 text-white shadow-lg">
                                    <Sparkles className="h-5 w-5 sm:h-6 sm:w-6" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-sm font-bold text-red-600 uppercase tracking-tight">Free limit reached for this CV</p>
                                    <p className="text-xs font-medium text-red-900/70">Upgrade to PRO for unlimited conversations.</p>
                                </div>
                                <button className="bg-red-500 px-5 py-2 text-xs font-bold uppercase tracking-widest text-white shadow-[3px_3px_0px_0px_rgba(153,27,27,1)] hover:-translate-y-0.5 transition-all">
                                    Upgrade to PRO
                                </button>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input bar */}
                    <div className="border-t-2 border-foreground bg-secondary px-3 sm:px-5 py-3 sm:py-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                            <input
                                type="text"
                                value={input}
                                onChange={e => setInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder={limitReached ? "Upgrade to continue…" : "Ask anything about your CV…"}
                                disabled={sending || limitReached}
                                className="flex-1 border-2 border-foreground bg-background px-3 sm:px-4 py-2.5 sm:py-3 text-sm font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || sending || limitReached}
                                className="inline-flex items-center gap-1.5 sm:gap-2 border-2 border-foreground bg-primary px-4 sm:px-7 py-2.5 sm:py-3 text-sm font-bold uppercase tracking-widest text-primary-foreground shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] sm:shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-1 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Send className="h-4 w-4" />
                                <span className="hidden sm:inline">Send</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
