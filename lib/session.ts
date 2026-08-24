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
import { formatDuration } from "./format";
import { Realtime, type Connection, type Gender, type PartnerInfo, type Preference } from "./realtime";

export { formatDuration };

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
  /** The day shitmatesToday counts, so it resets at midnight. */
  shitmatesDay: string;
  lifetimeShitmates: number;
};

function today(): string {
  // The user's own local date — streaks in UTC are unfair to half the planet.
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}

const DEFAULTS: Persisted = {
  gender: null,
  preference: "anyone",
  shitmatesToday: 0,
  shitmatesDay: "",
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
  /** Proof we met this person, redeemable to add them as a friend. */
  friendToken: string | null;
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
  /** Records the whole shit and starts a fresh one. */
  endShit: () => Promise<void>;
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
  const [friendToken, setFriendToken] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [theyAreTyping, setTheyAreTyping] = useState(false);
  const [partnerLeft, setPartnerLeft] = useState<"leave" | "disconnect" | null>(null);
  const [lastSummary, setLastSummary] = useState<Summary | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const rt = useRef<Realtime | null>(null);
  // Tallies for the shit currently in progress, sent when it ends.
  const thisShit = useRef({ shitmates: 0, messages: 0, countries: new Set<string>() });
  const persistedRef = useRef<Persisted>(DEFAULTS);
  persistedRef.current = persisted;
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
            setFriendToken(message.friendToken ?? null);
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
            if (message.code === "banned") {
              window.location.href = "/banned";
              return;
            }
            if (message.code === "unauthenticated") {
              // Session expired mid-session; the flow is gated, so send them back.
              window.location.href = "/signin";
              return;
            }
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
    rt.current?.identify(persisted.gender, persisted.preference);
  }, [connection, persisted.gender, persisted.preference, ready]);

  useEffect(() => {
    if (!notice) return;
    const id = setTimeout(() => setNotice(null), 4000);
    return () => clearTimeout(id);
  }, [notice]);

  const startShit = useCallback(() => {
    setShitStartedAt(Date.now());
    // Tell the server, so friends can see you are in there.
    void fetch("/api/shit/start", { method: "POST" }).catch(() => {});
  }, []);

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
      thisShit.current.shitmates += 1;
      thisShit.current.messages += messages.length;
      if (match?.country && match.country !== "??") thisShit.current.countries.add(match.country);

      // Roll the daily count over at midnight rather than accumulating forever.
      const day = today();
      const carried = persistedRef.current.shitmatesDay === day ? counters.current.shitmatesToday : 0;
      const shitmatesToday = carried + 1;
      const summary: Summary = {
        toiletMs: shitStartedAt ? now - shitStartedAt : 0,
        chatMs: chatStartedAt ? now - chatStartedAt : 0,
        messages: messages.length,
        country: match?.country ?? "??",
        matchNum: match?.num ?? 0,
        shitmatesToday,
      };
      persist({ shitmatesToday, shitmatesDay: day, lifetimeShitmates: counters.current.lifetimeShitmates + 1 });
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

  const endShit = useCallback(async () => {
    const startedAt = shitStartedAt;
    setShitStartedAt(null);
    if (!startedAt) return;

    const tally = thisShit.current;
    thisShit.current = { shitmates: 0, messages: 0, countries: new Set<string>() };

    try {
      await fetch("/api/shit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          startedAt,
          shitmates: tally.shitmates,
          messages: tally.messages,
          countries: [...tally.countries],
          day: today(),
        }),
      });
    } catch {
      // The shit still happened; losing the record is not worth blocking on.
    }
  }, [shitStartedAt]);

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
      friendToken,
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
      endShit,
      reset,
    }),
    [
      beginChat, cancelQueue, chatStartedAt, connection, endChat, endShit, friendToken, lastSummary, match,
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
