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

export type Gender = "man" | "woman" | "nonbinary";
export type Preference = "anyone" | "man" | "woman" | "nonbinary";

export type Match = {
  id: number;
  country: string;
  countryName: string;
  gender: Gender;
  /** When they sat down — always earlier than you, because it always is. */
  startedAt: number;
};

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
  matchId: number;
  shitmatesToday: number;
};

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
  lifetimeShitmates: 47,
};

type SessionValue = Persisted & {
  ready: boolean;
  shitStartedAt: number | null;
  chatStartedAt: number | null;
  match: Match | null;
  messages: Message[];
  theyAreTyping: boolean;
  lastSummary: Summary | null;
  startShit: () => void;
  setIdentity: (gender: Gender, preference: Preference) => void;
  setPreference: (preference: Preference) => void;
  findMatch: (signal: { cancelled: boolean }) => Promise<Match | null>;
  beginChat: () => void;
  sendMessage: (text: string) => void;
  endChat: () => Summary;
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
  const [shitStartedAt, setShitStartedAt] = useState<number | null>(null);
  const [chatStartedAt, setChatStartedAt] = useState<number | null>(null);
  const [match, setMatch] = useState<Match | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [theyAreTyping, setTheyAreTyping] = useState(false);
  const [lastSummary, setLastSummary] = useState<Summary | null>(null);
  const replyTimers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // Hydrate after mount so the server and first client render agree.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setPersisted({ ...DEFAULTS, ...(JSON.parse(raw) as Partial<Persisted>) });
    } catch {
      /* private mode, blocked storage — defaults are fine */
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

  useEffect(
    () => () => {
      replyTimers.current.forEach(clearTimeout);
    },
    [],
  );

  const startShit = useCallback(() => setShitStartedAt(Date.now()), []);

  const setIdentity = useCallback(
    (gender: Gender, preference: Preference) => persist({ gender, preference }),
    [persist],
  );

  const setPreference = useCallback(
    (preference: Preference) => persist({ preference }),
    [persist],
  );

  const findMatch = useCallback(
    async (signal: { cancelled: boolean }) => {
      // Stands in for the matchmaking service. Narrower filters wait longer,
      // which is the honest behaviour and the one the preference screen promises.
      const wait = persisted.preference === "anyone" ? 2400 : 3600;
      await new Promise((resolve) => setTimeout(resolve, wait + Math.random() * 900));
      if (signal.cancelled) return null;
      const found = mockMatch(persisted.preference);
      setMatch(found);
      return found;
    },
    [persisted.preference],
  );

  const beginChat = useCallback(() => {
    setChatStartedAt(Date.now());
    setMessages([]);
    const opener = OPENERS[Math.floor(Math.random() * OPENERS.length)];
    const timer = setTimeout(() => {
      setTheyAreTyping(true);
      const timer2 = setTimeout(() => {
        setTheyAreTyping(false);
        setMessages((prev) => [
          ...prev,
          { id: Date.now(), from: "them", text: opener, at: Date.now() },
        ]);
      }, 1400);
      replyTimers.current.push(timer2);
    }, 1200);
    replyTimers.current.push(timer);
  }, []);

  const sendMessage = useCallback((text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setMessages((prev) => [
      ...prev,
      { id: Date.now(), from: "me", text: trimmed, at: Date.now() },
    ]);

    const typingIn = 600 + Math.random() * 700;
    const t1 = setTimeout(() => {
      setTheyAreTyping(true);
      const t2 = setTimeout(() => {
        setTheyAreTyping(false);
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now(),
            from: "them",
            text: REPLIES[Math.floor(Math.random() * REPLIES.length)],
            at: Date.now(),
          },
        ]);
      }, 900 + Math.random() * 1200);
      replyTimers.current.push(t2);
    }, typingIn);
    replyTimers.current.push(t1);
  }, []);

  const endChat = useCallback((): Summary => {
    replyTimers.current.forEach(clearTimeout);
    replyTimers.current = [];
    setTheyAreTyping(false);
    const now = Date.now();
    const shitmatesToday = persisted.shitmatesToday + 1;
    const summary: Summary = {
      toiletMs: shitStartedAt ? now - shitStartedAt : 0,
      chatMs: chatStartedAt ? now - chatStartedAt : 0,
      messages: messages.length,
      country: match?.country ?? "??",
      matchId: match?.id ?? 0,
      shitmatesToday,
    };
    persist({
      shitmatesToday,
      lifetimeShitmates: persisted.lifetimeShitmates + 1,
    });
    setLastSummary(summary);
    setMatch(null);
    setChatStartedAt(null);
    setMessages([]);
    return summary;
  }, [chatStartedAt, match, messages.length, persist, persisted, shitStartedAt]);

  const reset = useCallback(() => {
    setShitStartedAt(null);
    setChatStartedAt(null);
    setMatch(null);
    setMessages([]);
    setLastSummary(null);
  }, []);

  const value = useMemo<SessionValue>(
    () => ({
      ...persisted,
      ready,
      shitStartedAt,
      chatStartedAt,
      match,
      messages,
      theyAreTyping,
      lastSummary,
      startShit,
      setIdentity,
      setPreference,
      findMatch,
      beginChat,
      sendMessage,
      endChat,
      reset,
    }),
    [
      beginChat, chatStartedAt, endChat, findMatch, lastSummary, match, messages,
      persisted, ready, reset, sendMessage, setIdentity, setPreference,
      shitStartedAt, startShit, theyAreTyping,
    ],
  );

  return createElement(SessionContext.Provider, { value }, children);
}

/* ---------------------------------------------------------------- mock data */

const COUNTRIES: { code: string; name: string }[] = [
  { code: "US", name: "United States" },
  { code: "DE", name: "Germany" },
  { code: "BR", name: "Brazil" },
  { code: "JP", name: "Japan" },
  { code: "PL", name: "Poland" },
  { code: "NG", name: "Nigeria" },
  { code: "IE", name: "Ireland" },
  { code: "KR", name: "South Korea" },
];

const OPENERS = [
  "office or home",
  "hey",
  "how long have you been in here",
  "i should not have had the second coffee",
];

const REPLIES = [
  "respect",
  "i'm at my in-laws",
  "brave",
  "they have a bidet and i don't understand it",
  "it's a test. of nerve",
  "honestly same",
  "my legs have gone",
  "someone just knocked. ignoring it",
  "third floor is the good one",
  "i've been here so long the light went off",
];

export const PROMPTS = [
  "What brings you to the toilet today?",
  "Office shit or home shit?",
  "How bad is it, 1 to 10?",
  "Would you rather your boss walked in, or your partner?",
  "What's the longest you've ever spent on a toilet?",
  "Are you hiding from someone right now?",
];

function mockMatch(preference: Preference): Match {
  const country = COUNTRIES[Math.floor(Math.random() * COUNTRIES.length)];
  const genders: Gender[] = ["man", "woman", "nonbinary"];
  const gender =
    preference === "anyone"
      ? genders[Math.floor(Math.random() * genders.length)]
      : (preference as Gender);
  return {
    id: 10000 + Math.floor(Math.random() * 89999),
    country: country.code,
    countryName: country.name,
    gender,
    // They always have a head start. It is funnier that way.
    startedAt: Date.now() - (3 * 60_000 + Math.random() * 9 * 60_000),
  };
}

export const GENDER_LABEL: Record<Gender, string> = {
  man: "Man",
  woman: "Woman",
  nonbinary: "Non-binary",
};

/* ------------------------------------------------------------------ timing */

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
