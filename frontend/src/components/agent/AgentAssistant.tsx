// AgentAssistant — the topbar launcher button + the chat drawer, wired
// together (they share open state, the chat hook, and the directive bridge).
// Shown only for office staff on deployments where the bot is enabled
// (capabilities.botEnabled). The drawer renders user bubbles + assistant
// answers (text or <InsightCard>), a streaming "thinking" indicator, and an
// input that sends each turn with the current route as context.
import { useState, type FormEvent } from 'react';
import { useLocation } from 'react-router-dom';
import { Drawer } from '../UI';
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
  const location = useLocation();
  const { send: sendDirective } = useAgentDirectives();

  const chat = useAgentChat({ onDirective: sendDirective });

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
        <AgentIcon />
      </button>

      <Drawer isOpen={open} onClose={() => setOpen(false)} title="Trợ lý TingTing" subtitle="Hỏi dữ liệu, phân tích, hoặc điều hướng">
        <div className="agent-thread">
          {chat.messages.length === 0 && (
            <div className="agent-empty">
              <p>Hỏi tôi về chuyến, công nợ, lợi nhuận, chi phí…</p>
              <p className="agent-empty__hint">VD: <em>“Tháng này vì sao lợi nhuận thấp?”</em> hoặc <em>“mở công nợ khách X”</em></p>
            </div>
          )}

          {chat.messages.map((m) => (
            <MessageBubble key={m.id} message={m} onAction={sendDirective} />
          ))}

          {chat.isThinking && (
            <div className="agent-thinking">
              <span className="agent-thinking__dot" />
              {chat.activeTool ? (
                <span className="agent-thinking__tool">{chat.activeTool.label ?? chat.activeTool.name}…</span>
              ) : (
                <span className="agent-thinking__tool">Đang suy nghĩ…</span>
              )}
            </div>
          )}

          {chat.error && <div className="agent-error">{chat.error}</div>}
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
            Gửi
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
  return <div className="agent-bubble agent-bubble--assistant">{response?.type === 'text' ? response.content : message.content}</div>;
}

function AgentIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3a9 9 0 0 0-9 9v4a2 2 0 0 0 2 2h1v-6H5a7 7 0 0 1 14 0h-1v6h1a2 2 0 0 0 2-2v-4a9 9 0 0 0-9-9Z" fill="currentColor" />
      <circle cx="9" cy="13" r="1.4" fill="var(--surface, #fff)" />
      <circle cx="15" cy="13" r="1.4" fill="var(--surface, #fff)" />
    </svg>
  );
}
