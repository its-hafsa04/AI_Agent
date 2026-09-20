import { useEffect, useRef } from 'react';
import type { ChatMessage } from '../lib/api';
import { MessageBubble } from './MessageBubble';

export function MessageList({ messages, isLoading }: { messages: ChatMessage[]; isLoading: boolean }) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [messages, isLoading]);

  return (
    <div className="chat-scroll flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-4 py-5 sm:px-7">
      {messages.length === 0 && !isLoading && (
        <div className="m-auto max-w-sm text-center">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Start a conversation</p>
          <p className="mt-3 text-sm leading-6 text-stone-500">Tell me who you would like to meet, when, and what the appointment is for.</p>
        </div>
      )}
      {messages.map((message, index) => <MessageBubble key={`${message.role}-${index}`} message={message} />)}
      {isLoading && (
        <div className="flex items-center gap-2 self-start rounded-2xl rounded-bl-md border border-stone-200 bg-white px-4 py-3 text-sm text-stone-500 shadow-sm" role="status" aria-label="Concierge is thinking">
          <span className="chat-dot" />
          <span className="chat-dot chat-dot-delay-1" />
          <span className="chat-dot chat-dot-delay-2" />
        </div>
      )}
      <div ref={endRef} />
    </div>
  );
}
