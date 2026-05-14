"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Bot, Send } from "lucide-react";

type Role = "user" | "assistant";

interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  imageUrl?: string | null;
  artifactId?: string | null;
  sourceType?: string | null;
  providerUsed?: string | null;
  isCode?: boolean;
}

interface CommandPayload {
  ok?: boolean;
  title?: string;
  summary?: string;
  shortMessage?: string;
  primaryVisual?: string | null;
  artifactId?: string | null;
  primaryArtifactId?: string | null;
  sourceType?: string | null;
  providerUsed?: string | null;
  deliverableType?: string | null;
  error?: string;
}

function uid(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

function textFromPayload(payload: CommandPayload) {
  if (payload.primaryVisual?.startsWith("data:image/")) return payload.shortMessage || "Voici votre visuel final.";
  return payload.summary || payload.shortMessage || payload.error || payload.title || "Résultat prêt.";
}

function resultFromPayload(payload: CommandPayload): ChatMessage {
  const isCode = payload.deliverableType === "code" || payload.sourceType === "codex_code";
  return {
    id: uid("assistant"),
    role: "assistant",
    content: textFromPayload(payload),
    imageUrl: payload.primaryVisual?.startsWith("data:image/") ? payload.primaryVisual : null,
    artifactId: payload.primaryArtifactId || payload.artifactId || null,
    sourceType: payload.sourceType,
    providerUsed: payload.providerUsed,
    isCode,
  };
}

export default function HomePage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId] = useState(() => uid("home"));
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const target = scrollRef.current;
    if (!target) return;
    if (typeof target.scrollTo === "function") {
      target.scrollTo({ top: target.scrollHeight, behavior: "smooth" });
      return;
    }
    target.scrollTop = target.scrollHeight;
  }, [messages, loading]);

  const canSend = useMemo(() => input.trim().length > 0 && !loading, [input, loading]);

  const submit = async () => {
    const prompt = input.trim();
    if (!prompt || loading) return;

    const userMessage: ChatMessage = { id: uid("user"), role: "user", content: prompt };
    setMessages((items) => [...items, userMessage]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ceo/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, conversationId }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || payload.ok === false) {
        setMessages((items) => [...items, {
          id: uid("assistant"),
          role: "assistant",
          content: payload.error || payload.summary || "Impossible de produire un résultat pour le moment.",
        }]);
        return;
      }
      setMessages((items) => [...items, resultFromPayload(payload)]);
    } catch (error) {
      setMessages((items) => [...items, {
        id: uid("assistant"),
        role: "assistant",
        content: error instanceof Error ? error.message : "Erreur réseau.",
      }]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    void submit();
  };

  const onKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submit();
    }
  };

  return (
    <main className="home-ai-workspace embedded">
      <section className="home-ai-main" aria-label="Workspace AI">
        <div ref={scrollRef} className="home-ai-conversation" aria-live="polite">
          {messages.length === 0 && (
            <section className="home-ai-empty">
              <div className="home-ai-empty-icon"><Bot size={24} /></div>
              <h1>Que voulez-vous créer aujourd’hui?</h1>
              <p>Demandez un logo, un site, une image ou un contenu. Le workspace affiche le rendu final et l’équipe qui a contribué.</p>
            </section>
          )}

          {messages.map((message) => (
            <article key={message.id} className={`home-ai-message ${message.role}`}>
              <div className="home-ai-bubble">
                {message.imageUrl ? (
                  <>
                    <img src={message.imageUrl} alt="Résultat généré" />
                    <p>{message.content}</p>
                  </>
                ) : message.isCode ? (
                  <pre><code>{message.content}</code></pre>
                ) : (
                  <p>{message.content}</p>
                )}
              </div>
            </article>
          ))}

          {loading && (
            <article className="home-ai-message assistant">
              <div className="home-ai-bubble loading">
                <span />
                <span />
                <span />
              </div>
            </article>
          )}
        </div>

        <form className="home-ai-composer" onSubmit={onSubmit}>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Tapez votre demande ici..."
            rows={1}
            disabled={loading}
          />
          <button type="submit" disabled={!canSend} aria-label="Envoyer">
            <Send size={19} />
          </button>
        </form>
      </section>
    </main>
  );
}
