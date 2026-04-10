"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

export default function EventCountdown() {
  const [event, setEvent] = useState(null);       // { title, event_date, event_time, event_type }
  const [timeLeft, setTimeLeft] = useState(null); // { days, hours, minutes, seconds }
  const [visible, setVisible] = useState(false);
  const intervalRef = useRef(null);
  const fetchRef = useRef(null);

  function computeTimeLeft(dateStr, timeStr) {
    const now = new Date();
    const target = new Date(dateStr);
    if (timeStr) {
      const [h, m] = timeStr.split(":").map(Number);
      target.setHours(h, m, 0, 0);
    } else {
      target.setHours(0, 0, 0, 0);
    }
    const diff = target - now;
    if (diff <= 0) return null;
    const days    = Math.floor(diff / 86400000);
    const hours   = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return { days, hours, minutes, seconds };
  }

  async function fetchUpcoming() {
    try {
      const res = await fetch("/api/events/upcoming", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.event) {
        setEvent(data.event);
        const tl = computeTimeLeft(data.event.event_date, data.event.event_time);
        if (tl && tl !== null) {
          setTimeLeft(tl);
          setVisible(true);
        } else {
          setVisible(false);
        }
      } else {
        setEvent(null);
        setVisible(false);
      }
    } catch {}
  }

  useEffect(() => {
    fetchUpcoming();
    // Re-fetch every 5 minutes to pick up new events
    fetchRef.current = setInterval(fetchUpcoming, 5 * 60 * 1000);
    return () => clearInterval(fetchRef.current);
  }, []);

  // Tick every second when we have an event
  useEffect(() => {
    if (!event) return;
    intervalRef.current = setInterval(() => {
      const tl = computeTimeLeft(event.event_date, event.event_time);
      if (!tl) {
        setVisible(false);
        setTimeLeft(null);
        clearInterval(intervalRef.current);
      } else {
        setTimeLeft(tl);
      }
    }, 1000);
    return () => clearInterval(intervalRef.current);
  }, [event]);

  if (!visible || !event || !timeLeft) return null;

  const pad = (n) => String(n).padStart(2, "0");
  const isImminentDay = timeLeft.days === 0;

  return (
    <div className={`relative z-50 w-full border-b ${
      isImminentDay
        ? "border-[rgba(212,175,55,0.4)] bg-[rgba(212,175,55,0.1)]"
        : "border-[rgba(212,175,55,0.2)] bg-[rgba(18,18,18,0.96)]"
    }`}>
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        {/* Label */}
        <div className="flex items-center gap-3 min-w-0">
          <span className={`shrink-0 h-2 w-2 rounded-full animate-pulse ${isImminentDay ? "bg-[var(--gold-pure)]" : "bg-[var(--gold-pure)]"}`} />
          <p className={`text-xs font-semibold truncate ${isImminentDay ? "text-[var(--gold-text)]" : "text-white"}`}>
            <span className="font-bold">{event.title}</span>
            {timeLeft.days > 0 && (
              <span className="ml-2 opacity-70">
                — {timeLeft.days} day{timeLeft.days !== 1 ? "s" : ""} to go
              </span>
            )}
            {timeLeft.days === 0 && (
              <span className="ml-2 opacity-70">— happening today</span>
            )}
          </p>
        </div>

        {/* Countdown digits */}
        <div className="flex items-center gap-1 shrink-0">
          {timeLeft.days > 0 && (
            <>
              <TimeUnit value={timeLeft.days} label="d" dark={!isImminentDay} />
              <span className={`text-sm font-bold ${isImminentDay ? "text-[var(--gold-text)]" : "text-white/50"}`}>:</span>
            </>
          )}
          <TimeUnit value={timeLeft.hours} label="h" dark={!isImminentDay} />
          <span className={`text-sm font-bold ${isImminentDay ? "text-[var(--gold-text)]" : "text-white/50"}`}>:</span>
          <TimeUnit value={timeLeft.minutes} label="m" dark={!isImminentDay} />
          <span className={`text-sm font-bold ${isImminentDay ? "text-[var(--gold-text)]" : "text-white/50"}`}>:</span>
          <TimeUnit value={timeLeft.seconds} label="s" dark={!isImminentDay} />

          <Link
            href="/calendar"
            className={`ml-3 rounded-full px-3 py-1 text-[11px] font-semibold transition ${
              isImminentDay
                ? "border border-[rgba(212,175,55,0.35)] text-[var(--gold-text)] hover:bg-[rgba(212,175,55,0.12)]"
                : "border border-white/20 text-white hover:bg-white/10"
            }`}
          >
            View →
          </Link>
        </div>
      </div>
    </div>
  );
}

function TimeUnit({ value, label, dark }) {
  const pad = (n) => String(n).padStart(2, "0");
  return (
    <div className={`flex flex-col items-center rounded-[0.4rem] px-1.5 py-0.5 min-w-[2rem] ${
      dark ? "bg-white/10" : "bg-[rgba(212,175,55,0.12)]"
    }`}>
      <span className={`text-sm font-bold leading-none tabular-nums ${dark ? "text-white" : "text-[var(--gold-text)]"}`}>
        {pad(value)}
      </span>
      <span className={`text-[8px] uppercase tracking-wider ${dark ? "text-white/50" : "text-muted"}`}>
        {label}
      </span>
    </div>
  );
}
