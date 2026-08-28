import { useEffect, useRef } from 'react';
import { API_BASE_URL } from '../services/api';
import { getToken } from '../services/tokenStorage';

export type RealtimeEventType =
  | 'appointment.created' | 'appointment.updated' | 'appointment.deleted'
  | 'patient.created' | 'patient.updated'
  | 'finance.created' | 'finance.updated' | 'finance.deleted';

interface RealtimeEvent {
  type: RealtimeEventType | 'connected';
  data?: any;
}

type Listener = (data: any) => void;

// Conexão única compartilhada por toda a aplicação — evita abrir um WebSocket
// por componente/página montada.
let socket: WebSocket | null = null;
let reconnectAttempt = 0;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
const listeners = new Map<string, Set<Listener>>();

function wsBaseUrl(): string {
  return API_BASE_URL.replace(/^http/, 'ws');
}

function notify(type: string, data: any) {
  listeners.get(type)?.forEach(fn => fn(data));
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  const delay = Math.min(30000, 1000 * 2 ** reconnectAttempt);
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    reconnectAttempt += 1;
    connect();
  }, delay);
}

function connect() {
  const token = getToken();
  if (!token) return;
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) return;

  socket = new WebSocket(`${wsBaseUrl()}/ws/sync?token=${encodeURIComponent(token)}`);

  socket.onopen = () => { reconnectAttempt = 0; };

  socket.onmessage = (evt) => {
    try {
      const msg: RealtimeEvent = JSON.parse(evt.data);
      if (msg.type === 'connected') return;
      notify(msg.type, msg.data);
    } catch { /* ignora mensagens malformadas */ }
  };

  socket.onclose = () => {
    socket = null;
    scheduleReconnect();
  };

  socket.onerror = () => {
    socket?.close();
  };
}

/** Fecha a conexão de sincronização (chamar no logout). */
export function disconnectRealtimeSync() {
  if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
  reconnectAttempt = 0;
  socket?.close();
  socket = null;
}

/**
 * Assina um tipo de evento de sincronização em tempo real (ex: 'patient.updated').
 * Abre a conexão WebSocket compartilhada automaticamente se ainda não existir.
 */
export function useRealtimeSync(eventType: RealtimeEventType, onEvent: (data: any) => void) {
  const callbackRef = useRef(onEvent);
  useEffect(() => { callbackRef.current = onEvent; }, [onEvent]);

  useEffect(() => {
    connect();

    const listener: Listener = (data) => callbackRef.current(data);
    if (!listeners.has(eventType)) listeners.set(eventType, new Set());
    listeners.get(eventType)!.add(listener);

    return () => {
      listeners.get(eventType)?.delete(listener);
    };
  }, [eventType]);
}
