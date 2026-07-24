/**
 * Maps API / network errors to short Russian messages for regular users.
 */

const EXACT: Record<string, string> = {
  // Auth / register
  'All fields required and terms must be accepted':
    'Заполните все поля и примите условия использования',
  'Invalid email address': 'Проверьте email — похоже, он написан неправильно',
  'Password must be 8–128 characters': 'Пароль должен быть от 8 до 128 символов',
  'Email already exists': 'Этот email уже зарегистрирован. Войдите или восстановите доступ',
  'Username already exists': 'Это имя пользователя уже занято. Придумайте другое',
  'Registration failed': 'Не удалось зарегистрироваться. Попробуйте позже',
  'Email service is temporarily unavailable':
    'Почта временно недоступна. Попробуйте чуть позже',
  'Email and code required': 'Введите email и код из письма',
  'User not found': 'Пользователь не найден',
  'Invalid verification code': 'Неверный код. Проверьте письмо и попробуйте снова',
  'Verification code expired': 'Срок кода истёк. Запросите новый код',
  'Verification failed': 'Не удалось подтвердить email. Попробуйте снова',
  'Email required': 'Укажите email',
  'Email already verified': 'Email уже подтверждён — можно войти',
  'Failed to resend code': 'Не удалось отправить код. Попробуйте позже',
  'Email and password required': 'Введите email и пароль',
  'Invalid credentials': 'Неверный email или пароль',
  'Email not verified': 'Сначала подтвердите email — мы отправили код на почту',
  'Login failed': 'Не удалось войти. Попробуйте позже',
  'Invalid token': 'Сессия истекла — войдите снова',
  Unauthorized: 'Войдите в аккаунт, чтобы продолжить',

  // SoundTok / uploads
  'Video must not exceed 15 MB': 'Видео слишком большое — максимум 15 МБ',
  'Video file required': 'Выберите видеофайл для загрузки',
  'Invalid video': 'Этот файл нельзя загрузить. Нужно видео (MP4, WebM или похожий формат)',
  'Invalid file type': 'Неподходящий тип файла. Загрузите видео',
  'Sound not found': 'Звук не найден. Выберите другой или снимите без него',
  'Too many uploads. Try again later.':
    'Слишком много загрузок подряд. Подождите немного и попробуйте снова',
  'Sample must not exceed 6 MB': 'Аудиофайл слишком большой — максимум 6 МБ',
  'Only audio files are allowed': 'Можно загружать только аудиофайлы',
  'Invalid sample': 'Не удалось принять этот аудиофайл',

  // Generic
  'Network Error': 'Нет связи с сервером. Проверьте интернет',
  'Internal server error': 'Что-то пошло не так на сервере. Попробуйте позже',
};

const PATTERNS: Array<{ re: RegExp; message: string }> = [
  { re: /email already exists/i, message: EXACT['Email already exists'] },
  { re: /username already exists/i, message: EXACT['Username already exists'] },
  { re: /invalid credentials/i, message: EXACT['Invalid credentials'] },
  { re: /invalid email/i, message: EXACT['Invalid email address'] },
  { re: /password must/i, message: EXACT['Password must be 8–128 characters'] },
  { re: /not exceed 15\s*mb/i, message: EXACT['Video must not exceed 15 MB'] },
  { re: /invalid file type/i, message: EXACT['Invalid file type'] },
  { re: /invalid video/i, message: EXACT['Invalid video'] },
  { re: /video file required/i, message: EXACT['Video file required'] },
  { re: /too many uploads/i, message: EXACT['Too many uploads. Try again later.'] },
  { re: /email not verified/i, message: EXACT['Email not verified'] },
  { re: /verification code expired/i, message: EXACT['Verification code expired'] },
  { re: /invalid verification code/i, message: EXACT['Invalid verification code'] },
  { re: /network error/i, message: EXACT['Network Error'] },
  { re: /timeout/i, message: 'Сервер долго не отвечает. Попробуйте ещё раз' },
  { re: /ECONNABORTED/i, message: 'Сервер долго не отвечает. Попробуйте ещё раз' },
];

function extractRawError(error: unknown): { status?: number; message: string } {
  if (!error || typeof error !== 'object') {
    return { message: '' };
  }

  const err = error as {
    message?: string;
    code?: string;
    response?: { status?: number; data?: { error?: string; message?: string } };
  };

  const fromBody = err.response?.data?.error || err.response?.data?.message || '';
  const fromAxios = err.message || '';
  const message = String(fromBody || fromAxios || '').trim();
  return { status: err.response?.status, message };
}

function looksEnglish(text: string): boolean {
  if (!text) return false;
  // Cyrillic present → already Russian enough
  if (/[а-яёА-ЯЁ]/.test(text)) return false;
  return /[A-Za-z]/.test(text);
}

export function getApiErrorMessage(
  error: unknown,
  fallback = 'Что-то пошло не так. Попробуйте ещё раз',
): string {
  const { status, message } = extractRawError(error);

  if (status === 413) {
    return message && !looksEnglish(message)
      ? message
      : 'Файл слишком большой. Уменьшите размер и попробуйте снова';
  }
  if (status === 401) {
    return EXACT.Unauthorized;
  }
  if (status === 429) {
    return message && !looksEnglish(message)
      ? message
      : 'Слишком много попыток. Подождите немного и попробуйте снова';
  }
  if (status === 503) {
    return message && !looksEnglish(message)
      ? message
      : 'Сервис временно недоступен. Попробуйте позже';
  }

  if (message) {
    if (EXACT[message]) return EXACT[message];
    for (const { re, message: mapped } of PATTERNS) {
      if (re.test(message)) return mapped;
    }
    if (!looksEnglish(message)) return message;
  }

  if (status && status >= 500) {
    return 'На сервере временный сбой. Попробуйте чуть позже';
  }

  return fallback;
}

export default getApiErrorMessage;
