import { registerSW } from "virtual:pwa-register";

export function registerServiceWorker() {
  if (!import.meta.env.PROD) return;

  registerSW({
    immediate: true,
    onRegisteredSW(swUrl: string) {
      // Minimal signal for debugging/verification in prod builds.
      // eslint-disable-next-line no-console
      console.info("[PWA] service worker registered", swUrl);
    },
    onRegisterError(error: unknown) {
      // eslint-disable-next-line no-console
      console.warn("[PWA] service worker registration failed", error);
    },
  });
}
