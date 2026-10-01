import "./ui/styles/index.css";
import { App } from "./ui/app";
import { trackViewport } from "./ui/viewport";
import { Capacitor } from '@capacitor/core';
import { trackNativeFrame } from './ui/nativeFrame';
import { initializeStorage, flushStorage, onStorageSaveFailure } from './ui/storage';
import { StorageNotice } from './ui/storageNotice';

trackViewport();
trackNativeFrame(Capacitor.getPlatform() === 'android');
const storageNotice = new StorageNotice();
onStorageSaveFailure(failed => {
  if (failed) storageNotice.show(false, flushStorage);
  else storageNotice.hide();
});

async function start(): Promise<void> {
  try { await initializeStorage(); }
  catch {
    storageNotice.show(true, start);
    return;
  }
  storageNotice.hide();
  new App();
  // Saves are queued at each change, not just on exit. Retry pending bridge
  // writes on lifecycle changes as well; never depend on an unload callback.
  const flush = () => { void flushStorage().catch(() => {}); };
  document.addEventListener('visibilitychange', flush);
  window.addEventListener('pagehide', flush);
  window.addEventListener('focus', flush);
}
void start();
