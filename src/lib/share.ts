import { isNativeApp } from './alerts';

/**
 * Comparte o guarda un archivo de texto.
 * - APK: lo escribe en la caché de la app y abre el menú “Compartir” de Android
 *   (WhatsApp, Drive, Archivos…). El WebView no permite descargas directas.
 * - Navegador móvil: menú de compartir del sistema si lo admite; si no, descarga.
 */
export async function shareFile(filename: string, text: string, mime = 'application/json', title?: string): Promise<void> {
  if (isNativeApp) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    const { uri } = await Filesystem.writeFile({ path: filename, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
    try {
      await Share.share({ title, files: [uri] });
    } catch {
      /* el usuario cerró el menú */
    }
    return;
  }
  const file = new File([text], filename, { type: mime });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return;
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return;
    }
  }
  const url = URL.createObjectURL(file);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Comparte texto como mensaje (WhatsApp, notas…). Sin menú de compartir: lo copia al portapapeles. */
export async function shareText(text: string, title?: string): Promise<'shared' | 'copied' | 'cancelled'> {
  if (isNativeApp) {
    const { Share } = await import('@capacitor/share');
    try {
      await Share.share({ title, text });
      return 'shared';
    } catch {
      return 'cancelled';
    }
  }
  if (navigator.share) {
    try {
      await navigator.share({ text, title });
      return 'shared';
    } catch (e) {
      if ((e as DOMException).name === 'AbortError') return 'cancelled';
    }
  }
  await navigator.clipboard.writeText(text);
  return 'copied';
}

/** “Halterofilia · 4 días” → “halterofilia-4-dias” */
export function slug(s: string): string {
  return (
    s
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) || 'rutina'
  );
}
