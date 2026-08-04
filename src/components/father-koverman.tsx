"use client";

import { useChat } from "@ai-sdk/react";
import {
  BookOpen,
  History,
  LoaderCircle,
  MessageCircle,
  Plus,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  FatherContextLocator,
  FatherThread,
  FatherThreadSummary,
} from "@/lib/ai/contracts";

const noticeStorageKey = "sanctum-council:father-koverman-notice:v1";

type FatherKovermanContextValue = {
  openFather: (locator: FatherContextLocator) => void;
};

const FatherKovermanContext = createContext<FatherKovermanContextValue | null>(
  null,
);

export function FatherKovermanProvider({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [view, setView] = useState<"chat" | "history">("chat");
  const [locator, setLocator] = useState<FatherContextLocator>({
    kind: "general",
  });
  const [thread, setThread] = useState<FatherThread | null>(null);
  const [threads, setThreads] = useState<FatherThreadSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [noticeAccepted, setNoticeAccepted] = useState(false);
  const [threadUsesCurrentLocator, setThreadUsesCurrentLocator] = useState(false);
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const requestCounterRef = useRef(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setNoticeAccepted(window.localStorage.getItem(noticeStorageKey) === "1");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const loadContextThread = useCallback(
    async (nextLocator: FatherContextLocator, forceNew = false) => {
      const requestNumber = ++requestCounterRef.current;
      setLoading(true);
      setError(null);
      setView("chat");

      try {
        const response = await fetch("/api/father/threads", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ locator: nextLocator, forceNew }),
        });
        const body: unknown = await response.json();

        if (!response.ok || !isRecord(body) || !isFatherThread(body.thread)) {
          throw new Error(getApiError(body));
        }

        if (requestCounterRef.current === requestNumber) {
          setThread(body.thread);
          setThreadUsesCurrentLocator(true);
        }
      } catch (loadError) {
        if (requestCounterRef.current === requestNumber) {
          setThread(null);
          setThreadUsesCurrentLocator(false);
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Father Koverman could not be opened.",
          );
        }
      } finally {
        if (requestCounterRef.current === requestNumber) {
          setLoading(false);
        }
      }
    },
    [],
  );

  const openFather = useCallback(
    (nextLocator: FatherContextLocator) => {
      restoreFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setLocator(nextLocator);
      setOpen(true);
      void loadContextThread(nextLocator);
    },
    [loadContextThread],
  );

  const closeFather = useCallback(() => {
    setOpen(false);
    window.setTimeout(() => restoreFocusRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const frame = window.requestAnimationFrame(() => closeButtonRef.current?.focus());
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeFather();
        return;
      }

      if (event.key === "Tab" && dialogRef.current) {
        const focusableElements = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
          ),
        );
        const first = focusableElements.at(0);
        const last = focusableElements.at(-1);

        if (!first || !last) {
          event.preventDefault();
          return;
        }

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        } else if (!dialogRef.current.contains(document.activeElement)) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [closeFather, open]);

  async function loadHistory() {
    setView("history");
    setHistoryLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/father/threads", {
        cache: "no-store",
      });
      const body: unknown = await response.json();

      if (!response.ok || !isRecord(body) || !Array.isArray(body.threads)) {
        throw new Error(getApiError(body));
      }

      setThreads(body.threads.filter(isFatherThreadSummary));
    } catch (historyError) {
      setError(
        historyError instanceof Error
          ? historyError.message
          : "Conversation history could not be loaded.",
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  async function openHistoryThread(threadId: string) {
    setHistoryLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/father/threads/${threadId}`, {
        cache: "no-store",
      });
      const body: unknown = await response.json();

        if (!response.ok || !isRecord(body) || !isFatherThread(body.thread)) {
        throw new Error(getApiError(body));
      }

        setThread(body.thread);
        setThreadUsesCurrentLocator(false);
        setView("chat");
    } catch (historyError) {
      setError(
        historyError instanceof Error
          ? historyError.message
          : "That conversation could not be opened.",
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  async function deleteThread(threadId: string) {
    if (!window.confirm("Delete this Father Koverman conversation permanently?")) {
      return;
    }

    const response = await fetch(`/api/father/threads/${threadId}`, {
      method: "DELETE",
    });

    if (response.ok) {
      setThreads((current) => current.filter((item) => item.id !== threadId));
      if (thread?.id === threadId) {
        setThread(null);
      }
    }
  }

  async function deleteAllThreads() {
    if (
      !window.confirm(
        "Delete every saved Father Koverman conversation permanently? This cannot be undone.",
      )
    ) {
      return;
    }

    const response = await fetch("/api/father/threads", { method: "DELETE" });

    if (response.ok) {
      setThreads([]);
      setThread(null);
    }
  }

  function acceptNotice() {
    window.localStorage.setItem(noticeStorageKey, "1");
    setNoticeAccepted(true);
  }

  const contextValue = useMemo(() => ({ openFather }), [openFather]);

  return (
    <FatherKovermanContext.Provider value={contextValue}>
      {children}
      <button
        aria-label="Open Father Koverman, AI Catholic Priest and Scripture Guide"
        className="fixed bottom-20 right-4 z-40 inline-flex min-h-12 items-center gap-2 rounded-full border border-gilt/45 bg-sanctuary-night px-4 text-sm font-bold text-vellum shadow-[var(--shadow-raised)] transition hover:-translate-y-0.5 hover:border-gilt sm:bottom-6 sm:right-6"
        onClick={() => openFather({ kind: "general" })}
        type="button"
      >
        <Sparkles aria-hidden className="size-4 text-[var(--gilt-light)]" />
        <span className="hidden sm:inline">Ask Father Koverman</span>
        <span className="sm:hidden">Ask Father</span>
      </button>

      {open ? (
        <div className="fixed inset-0 z-[80]">
          <button
            aria-label="Close Father Koverman"
            className="absolute inset-0 bg-sanctuary-night/55 backdrop-blur-sm"
            onClick={closeFather}
            type="button"
          />
          <aside
            aria-label="Father Koverman conversation"
            aria-modal="true"
            className="absolute inset-y-0 left-0 flex w-[100dvw] flex-col bg-[var(--background)] shadow-2xl sm:left-auto sm:right-0 sm:w-full sm:max-w-xl sm:border-l sm:border-gilt/30"
            ref={dialogRef}
            role="dialog"
          >
            <header className="border-b border-gilt/25 bg-sanctuary-night px-4 py-4 text-vellum sm:px-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-gilt/35 bg-white/5 text-[var(--gilt-light)]">
                    <BookOpen aria-hidden className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="text-[0.68rem] font-bold uppercase tracking-[0.16em] text-[var(--gilt-light)]">
                      AI Catholic Priest &amp; Scripture Guide
                    </p>
                    <h2 className="mt-1 truncate font-serif text-2xl font-semibold">
                      Father Koverman
                    </h2>
                  </div>
                </div>
                <button
                  aria-label="Close Father Koverman"
                  className="inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-white/15 text-vellum transition hover:bg-white/10"
                  onClick={closeFather}
                  ref={closeButtonRef}
                  type="button"
                >
                  <X aria-hidden className="size-5" />
                </button>
              </div>
              <div className="mt-4 flex gap-2">
                <button
                  aria-pressed={view === "chat"}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 px-3 text-xs font-bold transition hover:bg-white/10 aria-pressed:border-gilt aria-pressed:bg-white/10"
                  onClick={() => setView("chat")}
                  type="button"
                >
                  <MessageCircle aria-hidden className="size-4" />
                  Conversation
                </button>
                <button
                  aria-pressed={view === "history"}
                  className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/15 px-3 text-xs font-bold transition hover:bg-white/10 aria-pressed:border-gilt aria-pressed:bg-white/10"
                  onClick={() => void loadHistory()}
                  type="button"
                >
                  <History aria-hidden className="size-4" />
                  History
                </button>
              </div>
            </header>

            {!noticeAccepted ? (
              <div className="border-b border-gilt/25 bg-gilt/10 p-4 sm:p-5">
                <div className="flex gap-3">
                  <ShieldCheck
                    aria-hidden
                    className="mt-0.5 size-5 shrink-0 text-ecclesial-green"
                  />
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      Before your first conversation
                    </p>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      Father Koverman is AI, not an ordained priest. He cannot
                      absolve sins or replace your priest, confessor, spiritual
                      director, clinician, or emergency services. Conversations
                      are sent to OpenAI and saved to your Sanctum account until
                      you delete them.
                    </p>
                    <button
                      className="mt-3 min-h-10 rounded-full bg-ecclesial-green px-4 text-xs font-bold text-white"
                      onClick={acceptNotice}
                      type="button"
                    >
                      I understand
                    </button>
                  </div>
                </div>
              </div>
            ) : null}

            {error ? (
              <p className="border-b border-oxblood/20 bg-oxblood/5 px-4 py-3 text-sm text-oxblood">
                {error}
              </p>
            ) : null}

            {view === "history" ? (
              <HistoryPanel
                loading={historyLoading}
                onDelete={deleteThread}
                onDeleteAll={deleteAllThreads}
                onOpen={openHistoryThread}
                threads={threads}
              />
            ) : loading ? (
              <div className="flex flex-1 items-center justify-center gap-3 text-sm text-muted">
                <LoaderCircle aria-hidden className="size-5 animate-spin" />
                Preparing this context…
              </div>
            ) : thread ? (
              <>
                <div className="border-b border-hairline bg-[var(--panel-soft)] px-4 py-3 sm:px-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[0.68rem] font-bold uppercase tracking-[0.14em] text-[var(--accent)]">
                        Current context
                      </p>
                      <p className="mt-1 text-sm font-bold text-foreground">
                        {thread.contextTitle}
                      </p>
                    </div>
                    {threadUsesCurrentLocator ? (
                      <button
                        aria-label="Start a new conversation in this context"
                        className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border border-hairline bg-vellum px-3 text-xs font-bold text-foreground transition hover:border-ecclesial-green"
                        onClick={() => void loadContextThread(locator, true)}
                        type="button"
                      >
                        <Plus aria-hidden className="size-3.5" />
                        New
                      </button>
                    ) : null}
                  </div>
                </div>
                <FatherChat
                  key={thread.id}
                  noticeAccepted={noticeAccepted}
                  thread={thread}
                />
              </>
            ) : (
              <div className="flex flex-1 items-center justify-center px-6 text-center text-sm leading-6 text-muted">
                Father Koverman is unavailable until the AI and account database
                are configured.
              </div>
            )}
          </aside>
        </div>
      ) : null}
    </FatherKovermanContext.Provider>
  );
}

export function AskFatherKoverman({
  className = "",
  context,
  label = "Ask Father Koverman",
}: {
  className?: string;
  context: FatherContextLocator;
  label?: string;
}) {
  const value = useContext(FatherKovermanContext);

  if (!value) {
    return null;
  }

  return (
    <button
      className={`inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-gilt/45 bg-sanctuary-night px-4 text-xs font-bold text-vellum shadow-sm transition hover:-translate-y-0.5 hover:border-gilt ${className}`}
      onClick={() => value.openFather(context)}
      type="button"
    >
      <Sparkles aria-hidden className="size-3.5 text-[var(--gilt-light)]" />
      {label}
    </button>
  );
}

function FatherChat({
  noticeAccepted,
  thread,
}: {
  noticeAccepted: boolean;
  thread: FatherThread;
}) {
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement>(null);
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/father/chat",
        prepareSendMessagesRequest({ messages }) {
          return {
            body: {
              threadId: thread.id,
              message: messages.at(-1),
            },
          };
        },
      }),
    [thread.id],
  );
  const { messages, sendMessage, status, error, stop } = useChat({
    id: thread.id,
    messages: thread.messages,
    transport,
    throttle: 40,
  });
  const busy = status === "submitted" || status === "streaming";

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, status]);

  function submitMessage() {
    const text = input.trim();

    if (!text || busy || !noticeAccepted) {
      return;
    }

    void sendMessage({ text });
    setInput("");
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        aria-live="polite"
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-5 sm:px-5"
      >
        {messages.length === 0 ? (
          <div className="rounded-2xl border border-gilt/30 bg-gilt/10 p-4">
            <p className="font-serif text-xl font-semibold text-foreground">
              Where would you like to begin?
            </p>
            <p className="mt-2 text-sm leading-6 text-muted">
              This conversation is grounded in {thread.contextTitle}. No model
              call is made until you send a question.
            </p>
            <div className="mt-4 grid gap-2">
              {thread.contextSnapshot.starterPrompts.map((prompt) => (
                <button
                  className="rounded-xl border border-hairline bg-vellum p-3 text-left text-sm font-semibold leading-5 text-foreground transition hover:border-ecclesial-green"
                  key={prompt}
                  onClick={() => setInput(prompt)}
                  type="button"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((message) => (
          <FatherMessage key={message.id} message={message} />
        ))}

        {status === "submitted" ? (
          <div className="flex items-center gap-2 text-sm text-muted">
            <LoaderCircle aria-hidden className="size-4 animate-spin" />
            Father Koverman is reflecting…
          </div>
        ) : null}

        {error ? (
          <p className="rounded-xl border border-oxblood/20 bg-oxblood/5 p-3 text-sm text-oxblood">
            The response could not be completed. Please try again.
          </p>
        ) : null}
        <div ref={endRef} />
      </div>

      <div className="border-t border-hairline bg-[var(--panel)] p-3 sm:p-4">
        <form
          className="rounded-2xl border border-hairline bg-vellum p-2 focus-within:border-ecclesial-green focus-within:ring-2 focus-within:ring-ecclesial-green/10"
          onSubmit={(event) => {
            event.preventDefault();
            submitMessage();
          }}
        >
          <label className="sr-only" htmlFor={`father-message-${thread.id}`}>
            Message Father Koverman
          </label>
          <textarea
            className="min-h-20 w-full resize-none bg-transparent px-2 py-2 text-sm leading-6 text-foreground outline-none placeholder:text-muted"
            disabled={!noticeAccepted || busy}
            id={`father-message-${thread.id}`}
            maxLength={2_000}
            onChange={(event) => setInput(event.currentTarget.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                submitMessage();
              }
            }}
            placeholder={
              noticeAccepted
                ? "Ask about this prayer, passage, or formation context…"
                : "Acknowledge the AI notice to begin."
            }
            value={input}
          />
          <div className="flex items-center justify-between gap-3 px-1 pb-1">
            <span className="text-[0.68rem] text-muted">
              {input.length}/2000 · saved to your account
            </span>
            {busy ? (
              <button
                className="inline-flex min-h-9 items-center gap-2 rounded-full border border-hairline px-3 text-xs font-bold text-foreground"
                onClick={stop}
                type="button"
              >
                Stop
              </button>
            ) : (
              <button
                aria-label="Send message"
                className="inline-flex size-10 items-center justify-center rounded-full bg-ecclesial-green text-white transition disabled:cursor-not-allowed disabled:opacity-45"
                disabled={!noticeAccepted || !input.trim()}
                type="submit"
              >
                <Send aria-hidden className="size-4" />
              </button>
            )}
          </div>
        </form>
        <p className="mt-2 text-center text-[0.68rem] leading-4 text-muted">
          AI can err. Verify serious spiritual or moral questions with a priest.
        </p>
      </div>
    </div>
  );
}

function FatherMessage({ message }: { message: UIMessage }) {
  const sources = message.parts.filter(
    (part) => part.type === "source-url" && isVaticanUrl(part.url),
  );

  return (
    <article
      className={`max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-6 ${
        message.role === "user"
          ? "ml-auto bg-ecclesial-green text-white"
          : "border border-hairline bg-[var(--panel)] text-foreground"
      }`}
    >
      <p className="mb-1 text-[0.68rem] font-bold uppercase tracking-[0.12em] opacity-70">
        {message.role === "user" ? "You" : "Father Koverman · AI"}
      </p>
      {message.parts.map((part, index) =>
        part.type === "text" ? (
          <p className="whitespace-pre-wrap" key={`${message.id}:text:${index}`}>
            {part.text}
          </p>
        ) : null,
      )}
      {sources.length > 0 ? (
        <div className="mt-3 border-t border-hairline pt-3">
          <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-muted">
            Vatican sources
          </p>
          <ul className="mt-2 space-y-1.5">
            {sources.map((source) =>
              source.type === "source-url" ? (
                <li key={source.sourceId}>
                  <a
                    className="font-semibold text-ecclesial-green underline decoration-gilt underline-offset-2"
                    href={source.url}
                    rel="noreferrer"
                    target="_blank"
                  >
                    {source.title ?? new URL(source.url).hostname}
                  </a>
                </li>
              ) : null,
            )}
          </ul>
        </div>
      ) : null}
    </article>
  );
}

function HistoryPanel({
  loading,
  onDelete,
  onDeleteAll,
  onOpen,
  threads,
}: {
  loading: boolean;
  onDelete: (threadId: string) => Promise<void>;
  onDeleteAll: () => Promise<void>;
  onOpen: (threadId: string) => Promise<void>;
  threads: FatherThreadSummary[];
}) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="font-serif text-2xl font-semibold text-foreground">
            Saved conversations
          </h3>
          <p className="mt-1 text-sm text-muted">Retained until you delete them.</p>
        </div>
        {threads.length > 0 ? (
          <button
            className="inline-flex min-h-9 items-center gap-2 rounded-full border border-oxblood/30 px-3 text-xs font-bold text-oxblood"
            onClick={() => void onDeleteAll()}
            type="button"
          >
            <Trash2 aria-hidden className="size-3.5" />
            Delete all
          </button>
        ) : null}
      </div>

      {loading ? (
        <div className="mt-10 flex items-center justify-center gap-2 text-sm text-muted">
          <LoaderCircle aria-hidden className="size-4 animate-spin" />
          Loading history…
        </div>
      ) : threads.length === 0 ? (
        <p className="mt-10 text-center text-sm leading-6 text-muted">
          No saved conversations yet.
        </p>
      ) : (
        <ul className="mt-5 space-y-3">
          {threads.map((item) => (
            <li
              className="rounded-2xl border border-hairline bg-[var(--panel)] p-4"
              key={item.id}
            >
              <div className="flex items-start justify-between gap-3">
                <button
                  className="min-w-0 flex-1 text-left"
                  onClick={() => void onOpen(item.id)}
                  type="button"
                >
                  <p className="text-[0.68rem] font-bold uppercase tracking-[0.12em] text-[var(--accent)]">
                    {item.contextKind}
                  </p>
                  <p className="mt-1 font-bold text-foreground">
                    {item.contextTitle}
                  </p>
                  <p className="mt-2 line-clamp-2 text-sm leading-5 text-muted">
                    {item.preview}
                  </p>
                  <time
                    className="mt-2 block text-xs text-muted"
                    dateTime={item.updatedAt}
                  >
                    {new Intl.DateTimeFormat("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    }).format(new Date(item.updatedAt))}
                  </time>
                </button>
                <button
                  aria-label={`Delete ${item.contextTitle}`}
                  className="inline-flex size-9 shrink-0 items-center justify-center rounded-full text-muted transition hover:bg-oxblood/5 hover:text-oxblood"
                  onClick={() => void onDelete(item.id)}
                  type="button"
                >
                  <Trash2 aria-hidden className="size-4" />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function isFatherThread(value: unknown): value is FatherThread {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.contextTitle === "string" &&
    isRecord(value.contextSnapshot) &&
    Array.isArray(value.contextSnapshot.starterPrompts) &&
    Array.isArray(value.messages)
  );
}

function isFatherThreadSummary(value: unknown): value is FatherThreadSummary {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.contextKind === "string" &&
    typeof value.contextTitle === "string" &&
    typeof value.preview === "string" &&
    typeof value.updatedAt === "string"
  );
}

function getApiError(value: unknown) {
  return isRecord(value) && typeof value.error === "string"
    ? value.error
    : "Father Koverman could not be reached.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isVaticanUrl(value: string) {
  try {
    const host = new URL(value).hostname.toLowerCase();
    return host === "vatican.va" || host.endsWith(".vatican.va");
  } catch {
    return false;
  }
}
