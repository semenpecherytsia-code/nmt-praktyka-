// Звіт про готовність навчального вмісту (окремо від готовності застосунку).
import path from 'node:path';
import { CONTENT_DIR, readCatalog, validateFiles } from './lib';

const catalog = readCatalog();
for (const e of catalog.entries) {
  console.log(`\n=== ${e.title} (${e.id}) ===`);
  if (!e.package) { console.log('Набір ще не додано: умов, ключів, розв’язків і відео немає.'); continue; }
  const r = validateFiles(path.join(CONTENT_DIR, e.package), e.videoMap ? path.join(CONTENT_DIR, e.videoMap) : null);
  const rep = r.report!;
  console.log(`Тип: ${rep.isDemo ? 'демонстраційний набір (не реальна симуляція)' : 'імпортований набір'}; версія ${rep.version}`);
  console.log(`Перевірка: ${r.ok ? 'пройдено' : 'є помилки'}`);
  console.log(`Питань: ${rep.questionCount}${rep.expectedQuestionCount ? ` з ${rep.expectedQuestionCount}` : ''}; ключів: ${rep.keysCount}; максимум балів: ${rep.maxPoints}`);
  console.log(`Текстових розв’язків: ${rep.textExplanations}${rep.missingTextExplanations.length ? ` (немає: ${rep.missingTextExplanations.join(', ')})` : ''}`);
  console.log(`Відео прив’язано: ${rep.videoBindings}; готові: ${rep.videosReady} (публічні адреси: ${rep.videosPublic}, лише локально: ${rep.videosLocalOnly})`);
  if (rep.videosNeedReview.length) console.log(`Потребують перевірки людиною: ${rep.videosNeedReview.join(', ')}`);
  if (rep.missingVideos.length) console.log(`Без відеопояснення: ${rep.missingVideos.join(', ')}`);
  console.log(`Довідник: ${rep.referenceMaterial === 'present' ? 'є' : 'немає'}; таблиця переведення 100–200: ${rep.conversionTable === 'present' ? 'є' : 'немає'}`);
}
