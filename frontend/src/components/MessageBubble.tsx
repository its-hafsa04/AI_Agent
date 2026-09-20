import type { ChatMessage } from '../lib/api';

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm sm:max-w-[72%] ${isUser ? 'rounded-br-md bg-teal-700 text-white' : 'rounded-bl-md border border-stone-200 bg-white text-stone-800'}`}>
        <p className="mb-1 text-[0.65rem] font-bold uppercase tracking-[0.16em] opacity-60">{isUser ? 'You' : 'Concierge'}</p>
        <p className="whitespace-pre-wrap">{message.content}</p>
      </div>
    </div>
  );
}
