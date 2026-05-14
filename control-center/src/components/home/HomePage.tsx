"use client";

import Link from "next/link";
import { FormEvent, KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { Bot, Home, Moon, Send, Settings, Sun, Users, FolderKanban } from "lucide-react";

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

const navItems = [
  { href: "/", label: "Accueil", icon: Home },
  { href: "/agents", label: "Agents", icon: Users },
  { href: "/projects", label: "Projets", icon: FolderKanban },
  { href: "/settings", label: "Settings", icon: Settings },
];

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
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId] = useState(() => uid("home"));
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const initial = document.documentElement.dataset.theme === "light" ? "light" : "dark";
    setTheme(initial);
  }, []);

  useEffect(() => {
    const target = scrollRef.current;
    if (!target) return;
    if (typeof target.scrollTo === "function") {
      target.scrollTo({ top: target.scrollHeight, behavior: "smooth" });
      return;
    }
    target.scrollTop = target.scrollHeight;
  }, [messages, loading]);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    localStorage.setItem("ai-company-os-theme", next);
  };

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
    <main className="home-ai-workspace">
      <aside className="home-ai-sidebar" aria-label="Navigation principale">
        <Link className="home-ai-brand" href="/" aria-label="AI Company OS">
          <span>AI</span>
        </Link>
        <nav className="home-ai-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link key={item.href} className="home-ai-nav-item" href={item.href} aria-label={item.label}>
                <Icon size={18} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>

      <section className="home-ai-main" aria-label="Workspace AI">
        <header className="home-ai-topbar">
          <Link className="home-ai-logo" href="/">
            <span>AI Company OS</span>
          </Link>
          <button type="button" className="home-ai-theme-toggle" onClick={toggleTheme} aria-label="Changer le thème">
            {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
            <span>{theme === "dark" ? "Light" : "Dark"}</span>
          </button>
        </header>

        <div ref={scrollRef} className="home-ai-conversation" aria-live="polite">
          {messages.length === 0 && (
            <section className="home-ai-empty">
              <div className="home-ai-empty-icon"><Bot size={24} /></div>
              <h1>Que voulez-vous créer aujourd’hui?</h1>
              <p>Demandez un logo, un site, un module, une image ou un texte. Le workspace affiche seulement le résultat final.</p>
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
