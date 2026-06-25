import { Send } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Button } from "./Button";
import { Textarea } from "./Form";

export type WorkflowReply = {
  authorCompanyId?: string | null;
  authorUserId?: string | null;
  createdAt: string;
  id: string;
  message: string;
};

type WorkflowReplyThreadProps = {
  currentCompanyId?: string | null;
  currentUserId?: string | null;
  error?: unknown;
  isLoading?: boolean;
  isSending?: boolean;
  onSend: (message: string) => void;
  replies?: WorkflowReply[];
  title?: string;
};

function formatReplyDate(value: string) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en", {
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    month: "short",
  }).format(date);
}

export function WorkflowReplyThread({
  currentCompanyId,
  currentUserId,
  error,
  isLoading = false,
  isSending = false,
  onSend,
  replies = [],
  title = "Replies",
}: WorkflowReplyThreadProps) {
  const [message, setMessage] = useState("");

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || isSending) return;
    onSend(trimmed);
    setMessage("");
  };

  return (
    <section className="mt-4 rounded-lg border border-border bg-surface-pearl p-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <span className="text-xs font-semibold uppercase text-muted">{replies.length} messages</span>
      </div>
      <div className="mt-3 space-y-3">
        {isLoading ? (
          <p className="text-sm text-muted">Loading replies...</p>
        ) : error ? (
          <p className="text-sm text-danger">Replies could not be loaded.</p>
        ) : replies.length ? (
          replies.map((reply) => {
            const mine = reply.authorUserId === currentUserId || (currentCompanyId && reply.authorCompanyId === currentCompanyId);
            return (
              <article className={`rounded-lg border border-border bg-card p-3 ${mine ? "ml-auto max-w-[92%]" : "mr-auto max-w-[92%]"}`} key={reply.id}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs font-semibold uppercase text-muted">{mine ? "You" : "Counterparty"}</p>
                  <time className="text-xs text-muted" dateTime={reply.createdAt}>{formatReplyDate(reply.createdAt)}</time>
                </div>
                <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-foreground">{reply.message}</p>
              </article>
            );
          })
        ) : (
          <p className="text-sm text-muted">No replies yet.</p>
        )}
      </div>
      <form className="mt-4 grid gap-2" onSubmit={submit}>
        <Textarea
          aria-label={`${title} message`}
          className="min-h-24 resize-none bg-card"
          maxLength={2000}
          onChange={(event) => setMessage(event.target.value)}
          placeholder="Write a reply"
          value={message}
        />
        <div className="flex justify-end">
          <Button className="h-9 min-h-9 px-3" disabled={isSending || !message.trim()} type="submit">
            <Send className="size-4" aria-hidden="true" />
            Send
          </Button>
        </div>
      </form>
    </section>
  );
}
