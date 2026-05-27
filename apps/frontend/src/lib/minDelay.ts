export function minDelay<T>(promise: Promise<T>, ms = 1000): Promise<T> {
  return Promise.all([
    promise,
    new Promise<void>((r) => setTimeout(r, ms)),
  ]).then(([result]) => result);
}
