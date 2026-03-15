import { getChrome } from './browser';

export function hasStorageSync(): boolean {
  return !!getChrome()?.storage?.sync;
}

export function getStorageSync(
  keys: readonly string[],
): Promise<Record<string, unknown>> {
  return new Promise(resolve => {
    if (!hasStorageSync()) {
      resolve({});
      return;
    }

    const chromeApi = getChrome();
    chromeApi?.storage?.sync?.get(keys, items => {
      if (chromeApi.runtime?.lastError) {
        resolve({});
        return;
      }

      resolve(items ?? {});
    });
  });
}

export function setStorageSync(values: Record<string, unknown>): Promise<boolean> {
  return new Promise(resolve => {
    if (!hasStorageSync()) {
      resolve(false);
      return;
    }

    const chromeApi = getChrome();
    chromeApi?.storage?.sync?.set(values, () => {
      resolve(!chromeApi.runtime?.lastError);
    });
  });
}
