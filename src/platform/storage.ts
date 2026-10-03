/** SPEC §10: asked at every start; once granted, further calls just return true. */
export async function requestPersistentStorage(): Promise<boolean> {
  return (await navigator.storage?.persist?.()) ?? false;
}
