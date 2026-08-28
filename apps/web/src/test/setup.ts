import "@testing-library/jest-dom/vitest";

class IntersectionObserverStub implements IntersectionObserver {
  readonly root = null;
  readonly rootMargin = "0px";
  readonly thresholds = [0];
  disconnect() {}
  observe() {}
  takeRecords() { return []; }
  unobserve() {}
}

Object.defineProperty(window, "IntersectionObserver", {
  configurable: true,
  value: IntersectionObserverStub,
});

Object.defineProperty(window, "scrollTo", {
  configurable: true,
  value: () => undefined,
});
