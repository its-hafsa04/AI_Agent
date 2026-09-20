import type { ChatMessage } from '../lib/api';
import { ErrorMessage } from './Feedback';
import { ChatInput } from './ChatInput';
import { MessageList } from './MessageList';

export function ChatWindow({ messages, isLoading, isConnected, error, onSend }: { messages: ChatMessage[]; isLoading: boolean; isConnected: boolean; error: string; onSend: (content: string) => void }) {
  return (
    <section className="flex min-h-[min(70vh,680px)] flex-col overflow-hidden rounded-[1.5rem] border border-stone-200 bg-[#fbfaf7] shadow-[0_20px_60px_-35px_rgba(41,37,36,0.45)]">
      <div className="flex items-center justify-between border-b border-stone-200 bg-white px-5 py-4 sm:px-7">
        <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-teal-700">Concierge</p><h1 className="mt-1 text-lg font-semibold text-stone-950">Appointment assistant</h1></div>
        <div className="flex items-center gap-2 text-xs text-stone-500"><span className={`size-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />{isConnected ? 'Online' : 'Connecting'}</div>
      </div>
      {error && <div className="px-4 pt-4 sm:px-7"><ErrorMessage message={error} /></div>}
      <MessageList messages={messages} isLoading={isLoading} />
      <ChatInput disabled={!isConnected || isLoading} onSend={onSend} />
    </section>
  );
}
