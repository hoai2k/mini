// Every prototype page and the Micro Zoom game start here, then run their own
// main module. Micro Zoom is public, so there is no invite door any more; the
// start still runs on a later microtask, as it did after the door, so a page
// sees the same order of events.
export function boot(start) {
  void Promise.resolve().then(start);
}
