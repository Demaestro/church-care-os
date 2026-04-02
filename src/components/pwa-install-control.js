'use client';

import { useEffect, useMemo, useState } from "react";

function isStandaloneDisplay() {
  if (typeof window === "undefined") {
    return false;
  }

  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.navigator.standalone === true
  );
}

function isIosDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }

  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

function canRegisterServiceWorker() {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return false;
  }

  return (
    "serviceWorker" in navigator &&
    (window.isSecureContext || window.location.hostname === "localhost")
  );
}

export function PwaInstallControl({ copy = {} }) {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [isStandalone, setIsStandalone] = useState(() => isStandaloneDisplay());
  const [isIos] = useState(() => isIosDevice());
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    if (canRegisterServiceWorker()) {
      navigator.serviceWorker.register("/sw.js", {
        scope: "/",
        updateViaCache: "none",
      }).catch(() => {});
    }

    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setDeferredPrompt(event);
    }

    function handleAppInstalled() {
      setDeferredPrompt(null);
      setShowHelp(false);
      setIsStandalone(true);
    }

    function handleDisplayChange() {
      setIsStandalone(isStandaloneDisplay());
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    const mediaQuery = window.matchMedia("(display-mode: standalone)");
    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleDisplayChange);
    } else if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(handleDisplayChange);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);

      if (typeof mediaQuery.removeEventListener === "function") {
        mediaQuery.removeEventListener("change", handleDisplayChange);
      } else if (typeof mediaQuery.removeListener === "function") {
        mediaQuery.removeListener(handleDisplayChange);
      }
    };
  }, []);

  const labels = useMemo(
    () => ({
      button: copy.installApp || "Install app",
      title: copy.installTitle || "Install Church Care OS",
      body:
        copy.installBody ||
        "Save Church Care OS to your phone home screen for faster access and an app-like experience.",
      iosSteps:
        copy.installIosSteps ||
        "On iPhone or iPad, open the Share menu in Safari and choose Add to Home Screen.",
      browserSteps:
        copy.installBrowserSteps ||
        "If your browser does not show an install prompt, open the browser menu and choose Install app or Add to Home Screen.",
      secureNote:
        copy.installSecureNote ||
        "Phone installation works from the live HTTPS version of the app, not from desktop localhost.",
      close: copy.installClose || "Close",
    }),
    [copy]
  );

  const canInstallDirectly = Boolean(deferredPrompt);
  const shouldShowButton = !isStandalone && (canInstallDirectly || isIos);

  if (!shouldShowButton) {
    return null;
  }

  async function handleInstallClick() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice.catch(() => null);

      if (choice?.outcome === "accepted") {
        setDeferredPrompt(null);
        setShowHelp(false);
        return;
      }
    }

    setShowHelp((current) => !current);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleInstallClick}
        className="inline-flex min-h-11 items-center justify-center rounded-full border border-[var(--soft-accent-border)] bg-[var(--soft-fill)] px-4 py-2 text-sm font-semibold text-moss transition hover:bg-[var(--soft-fill-strong)]"
      >
        {labels.button}
      </button>

      {showHelp ? (
        <div className="absolute right-0 top-full z-50 mt-2 w-[18rem] rounded-[1.25rem] border border-line bg-paper p-4 shadow-[var(--menu-shadow)]">
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-muted">
            {labels.title}
          </p>
          <p className="mt-3 text-sm leading-7 text-foreground">{labels.body}</p>
          <p className="mt-3 text-sm leading-7 text-muted">
            {isIos ? labels.iosSteps : labels.browserSteps}
          </p>
          <p className="mt-3 text-xs leading-6 text-muted">{labels.secureNote}</p>
          <button
            type="button"
            onClick={() => setShowHelp(false)}
            className="mt-4 inline-flex min-h-11 items-center justify-center rounded-full border border-line px-4 py-2 text-sm font-medium text-foreground transition hover:bg-canvas"
          >
            {labels.close}
          </button>
        </div>
      ) : null}
    </div>
  );
}
