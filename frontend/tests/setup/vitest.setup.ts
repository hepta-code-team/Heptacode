import '@testing-library/jest-dom/vitest';

function createStorageMock(): Storage {
  let store: Record<string, string> = {};

  return {
    get length() {
      return Object.keys(store).length;
    },
    clear: () => {
      store = {};
    },
    getItem: (key: string) => store[key] ?? null,
    key: (index: number) => Object.keys(store)[index] ?? null,
    removeItem: (key: string) => {
      delete store[key];
    },
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
  };
}

Object.defineProperty(window, 'localStorage', {
  configurable: true,
  value: createStorageMock(),
});

Object.defineProperty(window, 'sessionStorage', {
  configurable: true,
  value: createStorageMock(),
});
