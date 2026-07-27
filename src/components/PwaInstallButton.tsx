import { Download, Share } from 'lucide-react';
import { usePwaInstall } from '../hooks/usePwaInstall';

type Props = {
  className?: string;
  variant?: 'button' | 'menu' | 'inline';
  onDone?: () => void;
};

/**
 * Install entry — only when native install is ready, or iOS Safari tip.
 * Never shows a button that only opens generic desktop instruction alerts.
 */
export default function PwaInstallButton({ className = '', variant = 'button', onDone }: Props) {
  const { canOfferInstall, canNativeInstall, iosSafari, install, dismiss } = usePwaInstall();

  if (!canOfferInstall) return null;

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
      dismiss();
      onDone?.();
    }
  };

  if (variant === 'menu') {
    return (
      <button type="button" className={className} onClick={() => void handleClick()}>
        {canNativeInstall ? <Download size={16} /> : <Share size={16} />}
        {canNativeInstall ? 'Установить на ПК / телефон' : 'На экран Домой'}
      </button>
    );
  }

  if (variant === 'inline') {
    return (
      <button type="button" className={className} onClick={() => void handleClick()}>
        {canNativeInstall ? <Download size={14} /> : <Share size={14} />}
        <span>{canNativeInstall ? 'Установить на компьютер' : 'На экран Домой'}</span>
      </button>
    );
  }

  return (
    <button type="button" className={className} onClick={() => void handleClick()}>
      {canNativeInstall ? <Download size={15} /> : <Share size={15} />}
      {canNativeInstall ? 'Установить на ПК' : 'На экран Домой'}
    </button>
  );
}
