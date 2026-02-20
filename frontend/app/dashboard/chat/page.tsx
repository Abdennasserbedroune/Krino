"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/client";
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
    const { accessToken } = useAuth();
    const [cvs, setCvs] = useState<CvItem[]>([]);
    const [selectedCvId, setSelectedCvId] = useState<number | null>(null);
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState("");
    const [sending, setSending] = useState(false);
    const [isTyping, setIsTyping] = useState(false);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const backendBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8001";

    useEffect(() => {
        if (!accessToken) {
            router.push("/auth/sign-in");
            return;
        }
        void fetchCvs();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [accessToken]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Load messages from localStorage when selectedCvId changes
    useEffect(() => {
        if (selectedCvId) {
            const storedMessages = localStorage.getItem(`chat_messages_${selectedCvId}`);
            if (storedMessages) {
                try {
                    const parsed = JSON.parse(storedMessages) as ChatMessage[];
                    setMessages(parsed);
                } catch (error) {
                    console.error("Failed to parse stored messages:", error);
                    // Set default welcome message if parse fails
                    setMessages([
                        {
                            role: "assistant",
                            content: "Hello! I'm your AI career assistant. How can I help you with your CV or job search today?",
                        },
                    ]);
                }
            } else {
                // No stored messages, set default welcome
                setMessages([
                    {
                        role: "assistant",
                        content: "Hello! I'm your AI career assistant powered by Groq. I can help you prepare for interviews, improve your CV, or answer job-related questions. How can I assist you today?",
                    },
                ]);
            }
        }
    }, [selectedCvId]);

    // Save messages to localStorage whenever they change
    useEffect(() => {
        if (selectedCvId && messages.length > 0) {
            localStorage.setItem(`chat_messages_${selectedCvId}`, JSON.stringify(messages));
        }
    }, [messages, selectedCvId]);

    async function fetchCvs() {
        if (!accessToken) return;
        setLoading(true);
        try {
            const res = await fetch(`${backendBaseUrl}/api/v1/cv/mine`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });
            if (!res.ok) {
                throw new Error("Unable to load CVs");
            }
            const data = (await res.json()) as CvItem[];
            setCvs(data);
            if (data.length > 0) {
                setSelectedCvId(data[0].id);
                // Messages will be loaded by useEffect when selectedCvId changes
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    const handleSend = async () => {
        if (!input.trim() || !selectedCvId || !accessToken || sending) return;

        const userMessage: ChatMessage = { role: "user", content: input.trim() };
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setInput("");
        setSending(true);

        try {
            // Send only the last 10 messages to avoid token limits
            const recentMessages = updatedMessages.slice(-10);

            const res = await fetch(`${backendBaseUrl}/api/v1/chat`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    cv_id: selectedCvId,
                    messages: recentMessages,
                }),
            });

            if (!res.ok) {
                throw new Error("Failed to send message");
            }

            const data = (await res.json()) as { reply: string };

            // Start typing animation with a small delay
            setIsTyping(true);
            await new Promise(resolve => setTimeout(resolve, 800)); // Initial thought delay

            const fullReply = data.reply;
            let currentText = "";
            const words = fullReply.split(" ");

            // Add a placeholder assistant message that we will update
            setMessages([...updatedMessages, { role: "assistant", content: "" }]);

            for (let i = 0; i < words.length; i++) {
                currentText += (i === 0 ? "" : " ") + words[i];
                setMessages([...updatedMessages, { role: "assistant", content: currentText }]);
                // Variable speed typing simulation
                const delay = 30 + Math.random() * 40;
                await new Promise(resolve => setTimeout(resolve, delay));
            }

            setIsTyping(false);
        } catch (err) {
            console.error(err);
            setIsTyping(false);
            const errorMessage: ChatMessage = {
                role: "assistant",
                content: "Sorry, I encountered an error. Please try again.",
            };
            setMessages([...updatedMessages, errorMessage]);
        } finally {
            setSending(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            void handleSend();
        }
    };

    if (loading) {
        return (
            <div className="flex items-center gap-3 border-2 border-foreground bg-background p-6">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                    Loading chat...
                </p>
            </div>
        );
    }

    if (cvs.length === 0) {
        return (
            <div className="border-2 border-dashed border-foreground bg-background/50 p-12 text-center">
                <div className="mx-auto mb-4 inline-flex h-16 w-16 items-center justify-center border-2 border-foreground bg-secondary">
                    <FileText className="h-8 w-8 text-foreground" />
                </div>
                <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
                    No CVs available. Upload a CV in the Upload tab to start chatting.
                </p>
            </div>
        );
    }

    return (
        <div className="space-y-8">
            <div className="grid gap-8 lg:grid-cols-[300px_1fr]">
                {/* CV Selection Sidebar - Brutalist */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2">
                        <div className="h-1.5 w-7 bg-primary"></div>
                        <h2 className="font-serif text-xl font-bold uppercase tracking-tight text-foreground">
                            Select CV
                        </h2>
                    </div>
                    <div className="space-y-3">
                        {cvs.map((cv) => (
                            <button
                                key={cv.id}
                                onClick={() => {
                                    setSelectedCvId(cv.id);
                                }}
                                className={`w-full border-2 border-foreground p-4 text-left transition-all ${selectedCvId === cv.id
                                    ? "bg-primary text-primary-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
                                    : "bg-background text-foreground shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-y-0.5 hover:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]"
                                    }`}
                            >
                                <p className="truncate text-base font-bold uppercase tracking-tight">
                                    {cv.original_filename}
                                </p>
                                <p className="text-sm font-medium uppercase tracking-widest opacity-80">
                                    {cv.analyzed_at ? "Analyzed" : "Not analyzed"}
                                </p>
                            </button>
                        ))}
                    </div>
                </div>

                {/* Chat Area - Brutalist */}
                <div className="flex h-[640px] flex-col border-2 border-foreground bg-card shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]">
                    {/* Chat Header */}
                    <div className="border-b-2 border-foreground bg-secondary p-5">
                        <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center border-2 border-foreground bg-primary">
                                <Bot className="h-5 w-5 text-primary-foreground" />
                            </div>
                            <div>
                                <h3 className="font-serif text-xl font-bold uppercase tracking-tight text-foreground">
                                    AI Career Assistant
                                </h3>
                                <p className="text-sm font-medium uppercase tracking-widest text-muted-foreground">
                                    Powered by Groq
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Messages */}
                    <div className="flex-1 space-y-4 overflow-y-auto p-6">
                        {messages.map((msg, idx) => (
                            <div
                                key={idx}
                                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                            >
                                <div className="flex max-w-[85%] items-start gap-3">
                                    {msg.role === "assistant" && (
                                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center border-2 border-foreground bg-secondary">
                                            <Sparkles className="h-4 w-4 text-foreground" />
                                        </div>
                                    )}
                                    <div
                                        className={`border-2 border-foreground px-4 py-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${msg.role === "user"
                                            ? "bg-primary text-primary-foreground"
                                            : "bg-background text-foreground"
                                            }`}
                                    >
                                        <p className="text-lg font-medium leading-relaxed whitespace-pre-wrap">
                                            {msg.content}
                                        </p>
                                    </div>
                                    {msg.role === "user" && (
                                        <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center border-2 border-foreground bg-accent">
                                            <User className="h-4 w-4 text-accent-foreground" />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {sending && !isTyping && (
                            <div className="flex justify-start">
                                <div className="flex items-start gap-3">
                                    <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center border-2 border-foreground bg-secondary">
                                        <Sparkles className="h-4 w-4 text-foreground" />
                                    </div>
                                    <div className="border-2 border-foreground bg-background px-4 py-3 shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
                                        <div className="flex items-center gap-2">
                                            <div className="h-2 w-2 animate-bounce rounded-full bg-primary"></div>
                                            <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:0.2s]"></div>
                                            <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:0.4s]"></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                        {messages.filter(m => m.role === "user").length >= 4 && (
                            <div className="flex flex-col items-center gap-4 border-2 border-dashed border-red-500 bg-red-50 p-6 text-center animate-in fade-in duration-700">
                                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-500 text-white shadow-lg">
                                    <Sparkles className="h-6 w-6" />
                                </div>
                                <div className="space-y-1">
                                    <p className="text-base font-bold text-red-600 uppercase tracking-tight">
                                        Free limit reached for this CV
                                    </p>
                                    <p className="text-sm font-medium text-red-900/70">
                                        Your 4 free messages are finished. Upgrade to PRO for unlimited conversations and deeper AI analysis.
                                    </p>
                                </div>
                                <button className="bg-red-500 px-6 py-2.5 text-sm font-bold uppercase tracking-widest text-white shadow-[4px_4px_0px_0px_rgba(153,27,27,1)] hover:-translate-y-0.5 transition-all active:translate-y-0">
                                    Upgrade to PRO
                                </button>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </div>

                    {/* Input - Brutalist */}
                    <div className="border-t-2 border-foreground bg-secondary p-5">
                        <div className="flex items-center gap-3">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder={messages.filter(m => m.role === "user").length >= 4 ? "Limit reached..." : "Type your message..."}
                                disabled={sending || messages.filter(m => m.role === "user").length >= 4}
                                className="flex-1 border-2 border-foreground bg-background px-4 py-3 text-base font-medium text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary disabled:opacity-50"
                            />
                            <button
                                onClick={handleSend}
                                disabled={!input.trim() || sending || messages.filter(m => m.role === "user").length >= 4}
                                className="inline-flex items-center gap-2 border-2 border-foreground bg-primary px-7 py-3 text-base font-bold uppercase tracking-widest text-primary-foreground shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-transform hover:-translate-y-1 hover:translate-x-1 hover:shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] active:translate-x-0 active:translate-y-0 active:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] disabled:cursor-not-allowed disabled:opacity-50"
                            >
                                <Send className="h-4 w-4" />
                                Send
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
