import { useEffect, useRef, useState } from 'react';
import { io, type Socket } from 'socket.io-client';
import { ChatWindow } from '../components/ChatWindow';
import { Loading } from '../components/Feedback';
import { api, type Appointment, type ChatMessage, type ChatSession } from '../lib/api';
import { AppointmentConfirmation } from '../components/AppointmentConfirmation';

type ServerEvents = {
  'chat:joined': (payload: { sessionId: string }) => void;
  'chat:message': (payload: { sessionId: string; message: ChatMessage; session: ChatSession; appointment: Appointment | null }) => void;
  'chat:error': (payload: { error: string; status: number }) => void;
};
type ClientEvents = { 'chat:join': (payload: { sessionId: string }) => void; 'chat:message': (payload: { sessionId: string; content: string }) => void };

const sessionKey = 'appointment_chat_session';
const apiUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export function ChatPage() {
  const [session, setSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const socketRef = useRef<Socket<ServerEvents, ClientEvents> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState('');
  const [confirmedAppointment, setConfirmedAppointment] = useState<Appointment | null>(null);

  useEffect(() => {
    let cancelled = false;
    const loadSession = async () => {
      try {
        const storedId = localStorage.getItem(sessionKey);
        let result = storedId ? await api.getChatSession(storedId).catch(() => null) : null;
        if (!result) {
          result = await api.createChatSession();
          localStorage.setItem(sessionKey, result.session.id);
        }
        if (!cancelled) { setSession(result.session); setMessages(result.session.history); setError(''); }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Unable to load your conversation.');
      } finally { if (!cancelled) setIsLoading(false); }
    };
    void loadSession();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!session) return;
    const nextSocket: Socket<ServerEvents, ClientEvents> = io(apiUrl, { auth: { token: localStorage.getItem('appointment_token') } });
    nextSocket.on('connect', () => nextSocket.emit('chat:join', { sessionId: session.id }));
    nextSocket.on('chat:joined', () => setIsConnected(true));
    nextSocket.on('chat:message', (payload) => {
      if (payload.sessionId === session.id) {
        setMessages(payload.session.history);
        setConfirmedAppointment(payload.appointment);
        setIsSending(false);
      }
    });
    nextSocket.on('chat:error', (payload) => { setError(payload.error); setIsSending(false); });
    nextSocket.on('connect_error', () => { setError('Unable to connect to the chat service.'); setIsConnected(false); });
    nextSocket.on('disconnect', () => setIsConnected(false));
    socketRef.current = nextSocket;
    return () => { nextSocket.close(); socketRef.current = null; setIsConnected(false); };
  }, [session]);

  const send = (content: string) => {
    if (!socketRef.current || !session) return;
    setError(''); setIsSending(true); socketRef.current.emit('chat:message', { sessionId: session.id, content });
  };

  if (isLoading) return <Loading label="Loading your conversation" />;
  return <div className="mx-auto max-w-4xl space-y-5">
    {confirmedAppointment && <AppointmentConfirmation appointment={confirmedAppointment} />}
    <ChatWindow error={error} isConnected={isConnected} isLoading={isSending} messages={messages} onSend={send} />
  </div>;
}
