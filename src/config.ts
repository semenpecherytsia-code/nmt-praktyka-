// Єдине місце для назви продукту та базових налаштувань.
export const APP_CONFIG = {
  /** Робоча назва. Змініть тут — вона оновиться в шапці, заголовку вкладки й текстах. */
  appName: 'НМТ Практика',
  /** Папка з каталогом наборів (відносно базового шляху сайту). */
  contentBase: `${import.meta.env.BASE_URL}content/`,
  /** Адреса локального медіасервера для поля localPath (див. README → «Відео»). */
  localMediaBase: import.meta.env.VITE_MEDIA_BASE_URL ?? `${import.meta.env.BASE_URL}media/`,
  /** Попередження таймера (у секундах до кінця) для екранного читача. */
  timerAnnouncements: [30 * 60, 10 * 60, 5 * 60, 60],
} as const;
