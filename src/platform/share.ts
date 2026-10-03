/** SPEC §9: the share sheet (save to iCloud Drive) when available, else a download. */
export async function shareOrDownload(file: File): Promise<boolean> {
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return true;
    } catch (error) {
      if ((error as Error).name === 'AbortError') return false; // the user cancelled
      // NotAllowedError: the tap's user activation expired while the backup was built.
      // Fall back to a download.
    }
  }
  const url = URL.createObjectURL(file);
  const link = Object.assign(document.createElement('a'), { href: url, download: file.name });
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}
