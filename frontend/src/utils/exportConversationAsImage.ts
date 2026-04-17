import { Platform } from 'react-native';

export async function exportConversationAsImage(element: HTMLElement, fileName: string): Promise<void> {
  if (Platform.OS !== 'web') {
    throw new Error('Conversation image export is only available on web');
  }

  const html2canvas = (await import('html2canvas')).default;
  const canvas = await html2canvas(element, {
    backgroundColor: '#ffffff',
    scale: Math.min(2, window.devicePixelRatio || 1),
    useCORS: true,
    scrollY: -window.scrollY,
  });

  const link = document.createElement('a');
  link.href = canvas.toDataURL('image/png');
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
