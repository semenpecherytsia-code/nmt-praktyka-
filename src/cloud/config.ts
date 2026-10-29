// Хмарні результати (Supabase). Обидва значення публічні: доступ до даних обмежують політики бази (supabase/schema.sql).
// Порожні значення — хмара вимкнена, сайт працює як раніше, лише з локальним сховищем.
export const CLOUD_CONFIG = {
  url: (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? 'https://vgbpdamqorbcmxktvebh.supabase.co',
  anonKey: (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? 'sb_publishable_2L5yjO2NDZOXC-Um3F1Rjw_GYWEcmoi',
};
export const cloudEnabled = !!(CLOUD_CONFIG.url && CLOUD_CONFIG.anonKey);
