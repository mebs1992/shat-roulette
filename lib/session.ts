"use client";

import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Realtime, deviceId, type Connection, type Gender, type PartnerInfo, type Preference } from "./realtime";

export type { Gender, Preference };

export type Message = {
  id: number;
  from: "me" | "them";
  text: string;
  at: number;
};

export type Summary = {
  toiletMs: number;
  chatMs: number;
  messages: number;
  country: string;
  matchNum: number;
  shitmatesToday: number;
};

export type EndReason = "leave" | "block" | "report";

const STORAGE_KEY = "shat-roulette/v1";

type Persisted = {
  gender: Gender | null;
  preference: Preference;
  shitmatesToday: number;
  lifetimeShitmates: number;
};

const DEFAULTS: Persisted = {
  gender: null,
  preference: "anyone",
  shitmatesToday: 0,
  lifetimeShitmates: 0,
};

type SessionValue = Persisted & {
  ready: boolean;
  connection: Connection;
  online: number;
  queued: number;
  shitStartedAt: number | null;
  chatStartedAt: number | null;
  match: PartnerInfo | null;
  /** Partner's start time translated onto this device's clock. */
  partnerStartedAt: number | null;
  messages: Message[];
  theyAreTyping: boolean;
  partnerLeft: "leave" | "disconnect" | null;
  /** Transient server complaint, shown by the composer. */
  notice: string | null;
  lastSummary: Summary | null;
  startShit: () => void;
  setIdentity: (gender: Gender, preference: Preference) => void;
  setPreference: (preference: Preference) => void;
  queue: () => void;
  cancelQueue: () => void;
  beginChat: () => void;
  sendMessage: (text: string) => void;
  setTyping: (on: boolean) => void;
  endChat: (reason: EndReason) => Summary;
  reset: () => void;
};

const SessionContext = createContext<SessionValue | null>(null);

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession must be used inside <SessionProvider>");
  return value;
}

export function SessionProvider({ children }: { children: React.ReactNode }) {
  const [persisted, setPersisted] = useState<Persisted>(DEFAULTS);
  const [ready, setReady] = useState(false);
  const [connection, setConnection] = useState<Connection>("connecting");
  const [online, setOnline] = useState(0);
  const [queued, setQueued] = useState(0);
  const [shitStartedAt, setShitStartedAt] = useState<number | null>(null);
  const [chatStartedAt, setChatStartedAt] = useState<number | null>(null);
  const [match, setMatch] = useState<PartnerInfo | null>(null);
  const [partnerStartedAt, setPartnerStartedAt] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [theyAreTyping, setTheyAreTyping] = useState(false);
  const [partnerLeft, setPartnerLeft] = useState<"leave" | "disconnect" | null>(null);
  const [lastSummary, setLastSummary] = useState<Summary | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const rt = useRef<Realtime | null>(null);
  const counters = useRef({ shitmatesToday: 0, lifetimeShitmates: 0 });
  counters.current = {
    shitmatesToday: persisted.shitmatesToday,
    lifetimeShitmates: persisted.lifetimeShitmates,
  };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setPersisted({ ...DEFAULTS, ...(JSON.parse(raw) as Partial<Persisted>) });
    } catch {
      /* blocked storage — defaults are fine */
    }
    setReady(true);
  }, []);

  const persist = useCallback((next: Partial<Persisted>) => {
    setPersisted((prev) => {
      const merged = { ...prev, ...next };
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      } catch {
        /* not worth failing a shit over */
      }
      return merged;
    });
  }, []);

  useEffect(() => {
    const client = new Realtime({
      onConnection: setConnection,
      onMessage: (message) => {
        switch (message.t) {
          case "welcome":
            setOnline(message.online);
            break;
          case "online":
            setOnline(message.count);
            break;
          case "waiting":
            setQueued(message.queued);
            break;
          case "matched": {
            // Translate their server-side start onto this device's clock, so a
            // skewed phone clock cannot invent a two-hour shit.
            const offset = message.serverNow - Date.now();
            setMatch(message.partner);
            setPartnerStartedAt(message.partner.shitStartedAt - offset);
            setMessages([]);
            setPartnerLeft(null);
            setTheyAreTyping(false);
            break;
          }
          case "msg":
            setTheyAreTyping(false);
            setMessages((prev) => [...prev, { id: message.at + prev.length, from: "them", text: message.text, at: message.at }]);
            break;
          case "typing":
            setTheyAreTyping(message.on);
            break;
          case "left":
            setTheyAreTyping(false);
            setPartnerLeft(message.reason);
            break;
          case "error":
            setNotice(
              message.code === "rate_limited"
                ? "Slow down. Even for you that's a lot of typing."
                : message.code === "too_long"
                  ? "That's too long. Nobody is reading that."
                  : null,
            );
            break;
        }
      },
    });
    rt.current = client;
    client.connect();
    return () => {
      client.close();
      rt.current = null;
    };
  }, []);

  // Keep the server's copy of who we are current.
  useEffect(() => {
    if (!ready || !persisted.gender || connection !== "online") return;
    rt.current?.identify(persisted.gender, persisted.preference, shitStartedAt ?? Date.now());
  }, [connection, persisted.gender, persisted.preference, ready, shitStartedAt]);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(id);
  }, [notice]);

  const startShit = useCallback(() => setShitStartedAt(Date.now()), []);

  const setIdentity = useCallback(
    (gender: Gender, preference: Preference) => persist({ gender, preference }),
    [persist],
  );
  const setPreference = useCallback((preference: Preference) => persist({ preference }), [persist]);

  const queue = useCallback(() => {
    setMatch(null);
    setPartnerLeft(null);
    rt.current?.send({ t: "queue" });
  }, []);

  const cancelQueue = useCallback(() => rt.current?.send({ t: "cancel" }), []);

  const beginChat = useCallback(() => setChatStartedAt(Date.now()), []);

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    rt.current?.send({ t: "msg", text: trimmed });
    setMessages((prev) => [...prev, { id: Date.now(), from: "me", text: trimmed, at: Date.now() }]);
  }, []);

  const setTyping = useCallback((on: boolean) => rt.current?.send({ t: "typing", on }), []);

  const endChat = useCallback(
    (reason: EndReason): Summary => {
      rt.current?.send(reason === "leave" ? { t: "leave" } : reason === "block" ? { t: "block" } : { t: "report" });

      const now = Date.now();
      const shitmatesToday = counters.current.shitmatesToday + 1;
      const summary: Summary = {
        toiletMs: shitStartedAt ? now - shitStartedAt : 0,
        chatMs: chatStartedAt ? now - chatStartedAt : 0,
        messages: messages.length,
        country: match?.country ?? "??",
        matchNum: match?.num ?? 0,
        shitmatesToday,
      };
      persist({ shitmatesToday, lifetimeShitmates: counters.current.lifetimeShitmates + 1 });
      setLastSummary(summary);
      setMatch(null);
      setPartnerStartedAt(null);
      setPartnerLeft(null);
      setChatStartedAt(null);
      setMessages([]);
      return summary;
    },
    [chatStartedAt, match, messages.length, persist, shitStartedAt],
  );

  const reset = useCallback(() => {
    setShitStartedAt(null);
    setChatStartedAt(null);
    setMatch(null);
    setPartnerStartedAt(null);
    setMessages([]);
    setLastSummary(null);
    setPartnerLeft(null);
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      ...persisted,
      ready,
      connection,
      online,
      queued,
      shitStartedAt,
      chatStartedAt,
      match,
      partnerStartedAt,
      messages,
      theyAreTyping,
      partnerLeft,
      notice,
      lastSummary,
      startShit,
      setIdentity,
      setPreference,
      queue,
      cancelQueue,
      beginChat,
      sendMessage,
      setTyping,
      endChat,
      reset,
    }),
    [
      beginChat, cancelQueue, chatStartedAt, connection, endChat, lastSummary, match,
      messages, notice, online, partnerLeft, partnerStartedAt, persisted, queue, queued, ready,
      reset, sendMessage, setIdentity, setPreference, setTyping, shitStartedAt, startShit, theyAreTyping,
    ],
  );

  return createElement(SessionContext.Provider, { value }, children);
}

export const PROMPTS = [
  "What brings you to the toilet today?",
  "Office shit or home shit?",
  "How bad is it, 1 to 10?",
  "Would you rather your boss walked in, or your partner?",
  "What's the longest you've ever spent on a toilet?",
  "Are you hiding from someone right now?",
];

export const GENDER_LABEL: Record<Gender, string> = {
  man: "Man",
  woman: "Woman",
  nonbinary: "Non-binary",
};

export { deviceId };

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return hours > 0 ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${pad(minutes)}:${pad(seconds)}`;
}

/** Ticking elapsed time since `from`. Returns "00:00" until mounted. */
export function useElapsed(from: number | null): string {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (from === null) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [from]);

  if (from === null || now === null) return "00:00";
  return formatDuration(now - from);
}
