"use client";

import { useEffect, useState } from "react";

/**
 * The "people currently shitting" counter. Starts at a fixed number so the
 * server and client agree, then drifts once mounted.
 */
export function LiveCount({ start = 3482 }: { start?: number }) {
  const [count, setCount] = useState(start);

  useEffect(() => {
    const id = setInterval(() => {
      setCount((c) => Math.max(2800, c + Math.round((Math.random() - 0.45) * 9)));
    }, 2600);
    return () => clearInterval(id);
  }, []);

  return <>{count.toLocaleString("en-US")}</>;
}
