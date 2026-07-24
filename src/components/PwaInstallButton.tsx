import { Download, Share } from 'lucide-react';
import { usePwaInstall } from '../hooks/usePwaInstall';

type Props = {
  className?: string;
  variant?: 'button' | 'menu' | 'inline';
  onDone?: () => void;
};

/**
 * Visible entry point so users discover SoundLab can be installed as a PWA.
 */
export default function PwaInstallButton({ className = '', variant = 'button', onDone }: Props) {
  const { standalone, canNativeInstall, iosSafari, install } = usePwaInstall();

  if (standalone) return null;

  const handleClick = async () => {
    if (canNativeInstall) {
      await install();
      onDone?.();
      return;
    }
    if (iosSafari) {
      window.alert(
        'Чтобы установить SoundLab на iPhone:\n\n1. Нажмите «Поделиться» в Safari\n2. Выберите «На экран Домой»\n3. Подтвердите «Добавить»',
      );
      onDone?.();
      return;
    }
    window.alert(
      'SoundLab — это PWA-приложение.\n\nВ Chrome/Edge: меню браузера → «Установить приложение» или «Добавить на главный экран».\n\nНа iPhone: Safari → Поделиться → «На экран Домой».',
    );
    onDone?.();
  };

  if (variant === 'menu') {
    return (
      <button type="button" className={className} onClick={() => void handleClick()}>
        <Download size={16} />
        Установить приложение
      </button>
    );
  }

  if (variant === 'inline') {
    return (
      <button type="button" className={className} onClick={() => void handleClick()}>
        {iosSafari ? <Share size={14} /> : <Download size={14} />}
        <span>Установить как приложение</span>
      </button>
    );
  }

  return (
    <button type="button" className={className} onClick={() => void handleClick()}>
      <Download size={15} />
      Установить приложение
    </button>
  );
}
