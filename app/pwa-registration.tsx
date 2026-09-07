"use client";

import { useCallback, useEffect, useState } from "react";

export const PWA_UPDATE_EVENT = "talleros:pwa-update";
export const PWA_ERROR_EVENT = "talleros:pwa-error";

export type PwaInstallOutcome = "accepted" | "dismissed" | "unavailable";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

export interface PwaInstallState {
  canInstall: boolean;
  isInstalled: boolean;
  needsManualInstall: boolean;
  install: () => Promise<PwaInstallOutcome>;
}

function isStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as NavigatorWithStandalone).standalone)
  );
}

function isIosDevice() {
  return (
    /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  );
}

/** Registers the public service worker. Render once near the app root. */
export function PwaRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) {
      return;
    }

    let disposed = false;
    let registration: ServiceWorkerRegistration | undefined;
    let hadController = Boolean(navigator.serviceWorker.controller);

    const reportRegistrationError = (error: unknown) => {
      window.dispatchEvent(
        new CustomEvent(PWA_ERROR_EVENT, {
          detail:
            error instanceof Error
              ? error.message
              : "No se pudo registrar el modo sin conexión.",
        }),
      );
    };

    const register = async () => {
      try {
        const nextRegistration = await navigator.serviceWorker.register(
          "/sw.js",
          {
            scope: "/",
            updateViaCache: "none",
          },
        );

        if (!disposed) {
          registration = nextRegistration;
          void nextRegistration.update().catch(reportRegistrationError);
        }
      } catch (error) {
        reportRegistrationError(error);
      }
    };

    const handleControllerChange = () => {
      if (hadController) {
        window.dispatchEvent(new Event(PWA_UPDATE_EVENT));
      }
      hadController = true;
    };

    const checkForUpdates = () => {
      if (document.visibilityState === "visible" && registration) {
        void registration.update().catch(reportRegistrationError);
      }
    };

    navigator.serviceWorker.addEventListener(
      "controllerchange",
      handleControllerChange,
    );
    document.addEventListener("visibilitychange", checkForUpdates);

    void register();

    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", checkForUpdates);
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        handleControllerChange,
      );
    };
  }, []);

  return null;
}

/** Reactive browser connectivity state, safe to render during hydration. */
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    const syncStatus = () => setIsOnline(navigator.onLine);

    syncStatus();
    window.addEventListener("online", syncStatus);
    window.addEventListener("offline", syncStatus);

    return () => {
      window.removeEventListener("online", syncStatus);
      window.removeEventListener("offline", syncStatus);
    };
  }, []);

  return isOnline;
}

/** Captures Chromium's install prompt and also detects installed iOS PWAs. */
export function usePwaInstall(): PwaInstallState {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [needsManualInstall, setNeedsManualInstall] = useState(false);

  useEffect(() => {
    const displayMode = window.matchMedia("(display-mode: standalone)");
    const syncInstalledState = () => {
      const installed = isStandaloneMode();
      setIsInstalled(installed);
      setNeedsManualInstall(!installed && isIosDevice());
    };
    const handleInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    };
    const handleInstalled = () => {
      setDeferredPrompt(null);
      setIsInstalled(true);
      setNeedsManualInstall(false);
    };

    syncInstalledState();
    window.addEventListener("beforeinstallprompt", handleInstallPrompt);
    window.addEventListener("appinstalled", handleInstalled);
    displayMode.addEventListener("change", syncInstalledState);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleInstallPrompt);
      window.removeEventListener("appinstalled", handleInstalled);
      displayMode.removeEventListener("change", syncInstalledState);
    };
  }, []);

  const install = useCallback(async (): Promise<PwaInstallOutcome> => {
    if (!deferredPrompt) {
      return "unavailable";
    }

    const currentPrompt = deferredPrompt;

    try {
      await currentPrompt.prompt();
      const { outcome } = await currentPrompt.userChoice;
      return outcome;
    } finally {
      setDeferredPrompt((prompt) =>
        prompt === currentPrompt ? null : prompt,
      );
    }
  }, [deferredPrompt]);

  return {
    canInstall: Boolean(deferredPrompt) && !isInstalled,
    isInstalled,
    needsManualInstall,
    install,
  };
}

/** Lets the UI offer a safe, user-controlled reload after a worker update. */
export function usePwaUpdate() {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const handleUpdate = () => setUpdateAvailable(true);
    window.addEventListener(PWA_UPDATE_EVENT, handleUpdate);
    return () => window.removeEventListener(PWA_UPDATE_EVENT, handleUpdate);
  }, []);

  const applyUpdate = useCallback(() => window.location.reload(), []);

  return { updateAvailable, applyUpdate };
}

export default PwaRegistration;
