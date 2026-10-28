# Формат навчального вмісту

Вміст повністю відокремлений від інтерфейсу. Умови, ключі, розв’язки й відео лежать у JSON-файлах
`public/content/`, а не в коді компонентів. Формальна JSON-схема — [`content.schema.json`](content.schema.json);
повний робочий приклад — [`public/content/sets/demo-tech/`](../public/content/sets/demo-tech/).

```
public/content/
  catalog.json                 список наборів
  sets/<simulationId>/
    package.json               симуляція, питання, профіль оцінювання, довідник, таблиця переведення
    video-map.json             окрема карта відео: questionId → explanationVideoId → файл/адреса
    assets/                    рисунки (svg, png, webp…)
    reference/                 PDF-довідник
media/                         відео для локальної розробки (не потрапляє в Git і в збірку)
```

## Ланцюжок прив’язки відео

```
simulationId → questionId → explanationVideoId → localPath (розробка) | publicUrl (сайт)
```

Номер позиції — лише підпис. Ключ — `questionId`, тож однаковий номер у різних варіантах не дає однакового відео.

## catalog.json

```json
{
  "schemaVersion": 1,
  "defaultSimulationId": "nmt-23",
  "demoSimulationId": "demo-tech",
  "entries": [
    { "id": "nmt-23", "title": "Симуляція НМТ №23", "package": null, "videoMap": null },
    { "id": "demo-tech", "title": "Демонстраційний набір (технічна перевірка)",
      "package": "sets/demo-tech/package.json", "videoMap": "sets/demo-tech/video-map.json" }
  ]
}
```

`package: null` означає «Набір ще не додано» — сайт так і пише, а у виборі симуляцій такий запис не показується.

## package.json

| Поле | Опис |
|---|---|
| `simulation.id`, `title`, `subject`, `version` | Ідентифікатор, назва, предмет, **версія вмісту** (змінюйте при будь-якій правці умов чи ключів) |
| `simulation.durationSeconds` | Тривалість (5400 = 90 хв) |
| `simulation.orderedQuestionIds` | Порядок питань — саме в ньому вони показуються й оцінюються |
| `simulation.referenceMaterialId` | Довідник або `null` |
| `simulation.scoringProfileId` | Профіль оцінювання (кількість, типи за позиціями, максимум) |
| `simulation.conversionTableId` | Офіційна таблиця 100–200 або `null` |
| `simulation.readiness` | `complete` · `incomplete` · `demo` |
| `simulation.isDemo`, `source` | Демонстраційний набір має `isDemo: true` і назву «Демонстраційний набір…» без номера |
| `questions[]` | Питання (див. нижче) |
| `scoringProfiles[]` | Розкладка позицій, напр. 1–15 single_choice×1, 16–18 matching×3, 19–22 numeric×2 = 32 |
| `referenceMaterials[]` | `{"kind":"pdf","src":"reference/x.pdf","downloadable":true}` або `{"kind":"pages","pages":["…"]}` |
| `conversionTables[]` | `{"id","year","source","maxPrimary":32,"map":{"0":null,…,"32":200}}` — `null` = поріг не подолано |

### Питання

Спільні поля: `id`, `type`, `statement`, `assets[]`, `maxPoints`, `textExplanation`, `explanationVideoId` (необов’язково — основна прив’язка в карті відео).

**single_choice** — `options: [{id, content}]` у вихідному порядку; `answerKey: {"optionId": "…"}`. Букви А–Д беруться з позиції лише для показу; правильність визначає `optionId`.

**matching** — `matchingRows: [{id, content}]` (1–3), `matchingOptions: [{id, content}]` (А–Д),
`allowOptionReuse: true|false` (обов’язково, не вгадується), `answerKey: {"pairs": {"rowId": "optionId"}}`, `maxPoints` = кількість рядків.

**numeric** — `answerKey: {"value": "-2.5"}` (рядком), `numericRule`:
- `{"mode": "exact"}` — точне десяткове порівняння;
- `{"mode": "tolerance", "tolerance": "0.01"}` — явно вказана похибка;
- `"allowFractions": true` — додатково приймати `1/2` (лише якщо це правило завдання).

### Текстовий формат

Рядки `statement`, `content`, `textExplanation`, `caption`, сторінки довідника:

- порожній рядок — новий абзац, перенесення — новий рядок;
- `$…$` — формула в рядку, `$$…$$` — окремим блоком (KaTeX, безпечний режим);
- `**жирний**`, `*курсив*`, `\$` — знак долара.

HTML не виконується й показується як текст. Адреси — лише відносні шляхи в папці набору або `https://`;
`javascript:`, `data:`, `http:`, `//…`, абсолютні шляхи й шляхи комп’ютера (`C:\…`, `~/…`) відхиляються.

## video-map.json

```json
{
  "schemaVersion": 1,
  "simulationId": "nmt-23",
  "bindings": [
    { "questionId": "nmt23-q01", "explanationVideoId": "nmt23-v01", "verifiedBy": "ім’я перевіряльника" }
  ],
  "media": [
    { "id": "nmt23-v01", "kind": "video", "title": "Завдання 1",
      "localPath": "nmt23/q01.mp4", "publicUrl": null,
      "poster": null, "captions": [{ "src": "media/q01.vtt", "srclang": "uk", "label": "Українська" }],
      "mimeType": "video/mp4", "readiness": "needs_review" }
  ]
}
```

- `localPath` — файл у `./media/` (локальний сервер розробки). Це не публічна адреса.
- `publicUrl` — адреса у вибраному сховищі/CDN (`https://…/q01.mp4`) або дозволений вбудований плеєр
  (`kind: "embed"`; хости: youtube-nocookie.com, youtube.com, player.vimeo.com).
- `readiness`: `ready` — перевірено людиною; `needs_review` — показується з позначкою «не перевірено»; `missing` — показується «ще не додано».

Перевірка знаходить пропущені, зайві, дубльовані й невідомі прив’язки. Вона **не може** встановити, що на відео пояснюється саме ця задача — це перевіряє людина (поле `verifiedBy`).

## Перевірка і звіт

```bash
npm run content:validate            # помилки з указанням запису й поля; код 1 при помилках
npm run content:validate -- --verbose
npm run content:report              # готовність вмісту: умови, ключі, розв’язки, відео, довідник, таблиця
```

Перевіряється: унікальність ID, існування всіх посилань, кількість питань, типи за позиціями, ключі відносно варіантів,
кількість рядків відповідностей, сума балів, формули (KaTeX), адреси, файли, довідник, таблиця переведення, карта відео.
Нічого не виправляється автоматично: суперечності між умовою і ключем треба вирішити у вихідних даних.

## Версії

Під час старту спроби в браузері зберігається знімок пакета (`simulationId@version`). Завершена спроба завжди відкривається
з тими умовами й ключами, з якими її пройдено, і не переоцінюється після оновлення вмісту.
