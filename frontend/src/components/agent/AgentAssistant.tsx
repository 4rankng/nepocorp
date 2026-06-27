// AgentAssistant — the topbar launcher button + the chat drawer, wired
// together (they share open state, the chat hook, and the directive bridge).
// Shown only for office staff on deployments where the bot is enabled
// (capabilities.botEnabled). The drawer renders user bubbles + assistant
// answers (text or <InsightCard>), a streaming "thinking" indicator, and an
// input that sends each turn with the current route as context.
import { useCallback, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { SendHorizontal } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Drawer } from '../UI';
import { AssetIcon } from '../AssetIcon';
import { useAuth } from '../../hooks/useAuth';
import { useAgentChat } from '../../hooks/useAgentChat';
import { useAgentDirectives } from '../../context/AgentDirectiveContext';
import { Role } from '@tingting/shared';
import { InsightCard } from './InsightCard';
import type { AgentDirective, AgentMessage } from '@tingting/shared';
import './agent.css';

const OFFICE_ROLES: Role[] = [Role.ADMIN, Role.MANAGER, Role.ACCOUNTANT];

export function AgentAssistant() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const threadRef = useRef<HTMLDivElement | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);
  const isPinnedToBottom = useRef(true);
  const location = useLocation();
  const { send: sendDirective } = useAgentDirectives();

  const chat = useAgentChat({ onDirective: sendDirective });

  const handleAction = useCallback(
    (directive: AgentDirective) => {
      sendDirective(directive);
      if (directive.kind === 'navigate' || directive.kind === 'focus') {
        setOpen(false);
      }
    },
    [sendDirective],
  );

  const scrollToLatest = useCallback((behavior: ScrollBehavior = 'auto') => {
    bottomRef.current?.scrollIntoView({ block: 'end', behavior });
  }, []);

  const handleThreadScroll = useCallback(() => {
    const el = threadRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isPinnedToBottom.current = distanceFromBottom < 80;
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    isPinnedToBottom.current = true;
    const frame = requestAnimationFrame(() => scrollToLatest('auto'));
    const timers = [
      window.setTimeout(() => scrollToLatest('auto'), 80),
      window.setTimeout(() => scrollToLatest('auto'), 220),
    ];
    return () => {
      cancelAnimationFrame(frame);
      timers.forEach(window.clearTimeout);
    };
  }, [open, scrollToLatest]);

  useLayoutEffect(() => {
    if (!open || !isPinnedToBottom.current) return;
    requestAnimationFrame(() => scrollToLatest('smooth'));
  }, [open, chat.messages.length, chat.isThinking, scrollToLatest]);

  useLayoutEffect(() => {
    const el = threadRef.current;
    if (!open || !el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(() => {
      if (isPinnedToBottom.current) scrollToLatest('auto');
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [open, scrollToLatest]);

  // Hide entirely unless this is an office-staff user on a bot-enabled deploy.
  if (!user || !OFFICE_ROLES.includes(user.role) || !user.botEnabled) return null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || chat.isThinking) return;
    setInput('');
    void chat.send(text, location.pathname);
  };

  return (
    <>
      <button
        type="button"
        className="topbar__icon-btn agent-launcher"
        title="Trợ lý TingTing"
        aria-label="Mở trợ lý"
        onClick={() => setOpen(true)}
      >
        <AssetIcon name="assistant" size={24} className="agent-launcher__icon" />
      </button>

      <Drawer
        isOpen={open}
        onClose={() => setOpen(false)}
        title="Trợ lý TingTing"
        subtitle="Hỏi dữ liệu, phân tích, hoặc điều hướng"
        className="agent-drawer"
        headerGraphic={
          <span className="agent-header-icon" aria-hidden="true">
            <AssetIcon name="assistant" size={52} />
            <span className="agent-header-icon__status" />
          </span>
        }
      >
        <div className="agent-thread" ref={threadRef} onScroll={handleThreadScroll}>
          {chat.messages.length === 0 && (
            <div className="agent-empty">
              <AssetIcon name="assistant" size={96} className="agent-empty__icon" />
              <p>Hỏi tôi về chuyến, công nợ, lợi nhuận, chi phí…</p>
              <p className="agent-empty__hint">VD: <em>“Tháng này vì sao lợi nhuận thấp?”</em> hoặc <em>“mở công nợ khách X”</em></p>
            </div>
          )}

          {chat.messages.map((m) => (
            <MessageBubble key={m.id} message={m} onAction={handleAction} />
          ))}

          {chat.isThinking && (
            <div className="agent-thinking">
              <span className="agent-message__avatar" aria-hidden="true">
                <AssetIcon name="assistant" size={24} />
              </span>
              <span className="agent-thinking__dot" />
              {chat.activeTool ? (
                <span className="agent-thinking__tool">{chat.activeTool.label ?? chat.activeTool.name}…</span>
              ) : (
                <span className="agent-thinking__tool">Đang suy nghĩ…</span>
              )}
            </div>
          )}

          {chat.error && <div className="agent-error">{chat.error}</div>}
          <div ref={bottomRef} aria-hidden="true" />
        </div>

        <form className="agent-composer" onSubmit={submit}>
          <input
            className="agent-composer__input"
            placeholder="Hỏi trợ lý…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            autoFocus
          />
          <button type="submit" className="agent-composer__send" disabled={chat.isThinking || !input.trim()}>
            <span>Gửi</span>
            <SendHorizontal size={16} aria-hidden="true" />
          </button>
        </form>
      </Drawer>
    </>
  );
}

function MessageBubble({ message, onAction }: { message: AgentMessage; onAction: (d: AgentDirective) => void }) {
  if (message.role === 'user') {
    return <div className="agent-bubble agent-bubble--user">{message.content}</div>;
  }
  const response = message.response;
  if (response?.type === 'insight_card') {
    return <InsightCard card={response} onAction={onAction} />;
  }
  return (
    <div className="agent-message agent-message--assistant">
      <span className="agent-message__avatar" aria-hidden="true">
        <AssetIcon name="assistant" size={24} />
      </span>
      <div className="agent-bubble agent-bubble--assistant agent-markdown">
        <ReactMarkdown skipHtml>
          {response?.type === 'text' ? response.content : message.content}
        </ReactMarkdown>
      </div>
    </div>
  );
}
