import { Platform } from 'react-native';

export async function copyTextToClipboard(text: string): Promise<void> {
  if (Platform.OS === 'web') {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return;
    }

    if (typeof document !== 'undefined') {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.setAttribute('readonly', 'true');
      textarea.style.position = 'absolute';
      textarea.style.left = '-9999px';
      document.body.appendChild(textarea);
      textarea.select();
      const copied = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (copied) return;
    }

    throw new Error('Clipboard API is not available in this browser');
  }

  const Clipboard = require('@react-native-clipboard/clipboard').default as {
    setString: (value: string) => void;
  };
  Clipboard.setString(text);
}
