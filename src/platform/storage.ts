/** SPEC §10: asked at every start; once granted, further calls just return true. */
export async function requestPersistentStorage(): Promise<boolean> {
  return (await navigator.storage?.persist?.()) ?? false;
}

export interface StorageInfo {
  usage?: number;
  persisted: boolean;
}

export async function getStorageInfo(): Promise<StorageInfo> {
  const [estimate, persisted] = await Promise.all([
    navigator.storage?.estimate?.(),
    navigator.storage?.persisted?.(),
  ]);
  return { usage: estimate?.usage, persisted: persisted ?? false };
}
