export type StorageChangeLike = {
  newValue?: unknown;
  oldValue?: unknown;
};

type StorageAreaLike = {
  get(
    keys: readonly string[],
    callback: (items: Record<string, unknown>) => void,
  ): void;
  set(values: Record<string, unknown>, callback: () => void): void;
};

type ChromeLike = {
  runtime?: {
    lastError?: unknown;
    openOptionsPage?: () => Promise<void>;
  };
  storage?: {
    sync?: StorageAreaLike;
    onChanged?: {
      addListener(
        callback: (
          changes: Record<string, StorageChangeLike>,
          areaName: string,
        ) => void,
      ): void;
    };
  };
};

export function getChrome(): ChromeLike | undefined {
  return (globalThis as typeof globalThis & { chrome?: ChromeLike }).chrome;
}
