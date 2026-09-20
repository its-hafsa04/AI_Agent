export function Loading({ label = 'Loading' }: { label?: string }) {
  return <div className="grid min-h-40 place-items-center text-sm text-stone-500" role="status">{label}...</div>;
}

export function ErrorMessage({ message }: { message: string }) {
  return <p className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800" role="alert">{message}</p>;
}