import { useState, type FormEvent } from 'react';

export function ChatInput({ disabled, onSend }: { disabled?: boolean; onSend: (content: string) => void }) {
  const [content, setContent] = useState('');

  const submit = (event: FormEvent) => {
    event.preventDefault();
    const value = content.trim();
    if (!value || disabled) return;
    onSend(value);
    setContent('');
  };

  return (
    <form className="border-t border-stone-200 bg-white p-3 sm:p-4" onSubmit={submit}>
      <div className="flex items-end gap-2 rounded-2xl border border-stone-300 bg-stone-50 p-2 transition focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-100">
        <textarea aria-label="Message" className="max-h-32 min-h-11 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-stone-900 outline-none placeholder:text-stone-400" disabled={disabled} maxLength={10000} placeholder="Ask about an appointment..." rows={1} value={content} onChange={(event) => setContent(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} />
        <button aria-label="Send message" className="grid size-11 shrink-0 place-items-center rounded-xl bg-teal-700 text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-50" disabled={disabled || !content.trim()} type="submit"><span aria-hidden="true" className="text-lg">↑</span></button>
      </div>
      <p className="px-2 pt-2 text-[0.68rem] text-stone-400">Press Enter to send. Shift + Enter for a new line.</p>
    </form>
  );
}
