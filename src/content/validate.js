// Перевірка пакета вмісту та карти відео перед імпортом і під час завантаження.
// Вміст не виправляється автоматично: кожна проблема повертається з указанням запису та поля.
import katex from 'katex';
import { parseRichText, collectMath, RichTextError } from './richtext';
import { checkContentUrl, checkEmbedUrl } from './urls';
import { parseNumeric } from '../engine/numeric';
const ID_RE = /^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/;
const TYPES = ['single_choice', 'matching', 'numeric'];
class Collector {
    issues = [];
    error(record, field, message) { this.issues.push({ level: 'error', record, field, message }); }
    warn(record, field, message) { this.issues.push({ level: 'warning', record, field, message }); }
}
const isObj = (x) => typeof x === 'object' && x !== null && !Array.isArray(x);
function checkRich(c, record, field, value, required = true) {
    if (value === undefined || value === null) {
        if (required)
            c.error(record, field, 'поле обов’язкове');
        return;
    }
    if (typeof value !== 'string')
        return c.error(record, field, 'має бути рядком');
    if (required && !value.trim())
        return c.error(record, field, 'порожній текст');
    let blocks;
    try {
        blocks = parseRichText(value);
    }
    catch (e) {
        return c.error(record, field, e instanceof RichTextError ? e.message : String(e));
    }
    for (const m of collectMath(blocks)) {
        try {
            katex.renderToString(m.tex, { throwOnError: true, displayMode: m.display, trust: false, strict: 'ignore' });
        }
        catch (e) {
            c.error(record, field, `помилка у формулі «${m.tex}»: ${e.message.replace(/^KaTeX parse error: /, '')}`);
        }
    }
}
function checkId(c, record, field, value) {
    if (typeof value !== 'string' || !ID_RE.test(value)) {
        c.error(record, field, `некоректний ідентифікатор ${JSON.stringify(value)} (латиниця, цифри, _ . -)`);
        return false;
    }
    return true;
}
function checkUrlField(c, record, field, value, opts, kind) {
    const err = checkContentUrl(value);
    if (err)
        return c.error(record, field, err);
    const v = value;
    if (!/^https:/i.test(v) && opts.fileExists && !opts.fileExists(v, kind)) {
        c.error(record, field, `файл «${v}» не знайдено`);
    }
}
function uniqueIds(c, record, field, items, seen = new Set()) {
    items.forEach((it, i) => {
        const id = isObj(it) ? it.id : undefined;
        if (!checkId(c, record, `${field}[${i}].id`, id))
            return;
        if (seen.has(id))
            c.error(record, `${field}[${i}].id`, `ідентифікатор «${id}» повторюється`);
        seen.add(id);
    });
    return seen;
}
function validateQuestion(c, q, opts) {
    const rec = `питання «${q.id}»`;
    if (!TYPES.includes(q.type))
        c.error(rec, 'type', `невідомий тип ${JSON.stringify(q.type)}`);
    checkRich(c, rec, 'statement', q.statement);
    if (!Number.isInteger(q.maxPoints) || q.maxPoints <= 0)
        c.error(rec, 'maxPoints', 'має бути додатним цілим числом');
    if (q.assets !== undefined) {
        if (!Array.isArray(q.assets))
            c.error(rec, 'assets', 'має бути масивом');
        else {
            uniqueIds(c, rec, 'assets', q.assets);
            q.assets.forEach((a, i) => {
                if (!isObj(a))
                    return c.error(rec, `assets[${i}]`, 'має бути об’єктом');
                if (a.kind !== 'image')
                    c.error(rec, `assets[${i}].kind`, 'підтримується лише "image"');
                checkUrlField(c, rec, `assets[${i}].src`, a.src, opts, 'set');
                if (typeof a.alt !== 'string' || !a.alt.trim())
                    c.error(rec, `assets[${i}].alt`, 'потрібен текстовий опис рисунка');
                if (a.caption !== undefined)
                    checkRich(c, rec, `assets[${i}].caption`, a.caption);
            });
        }
    }
    if (q.textExplanation !== undefined && q.textExplanation !== null)
        checkRich(c, rec, 'textExplanation', q.textExplanation);
    if (q.explanationVideoId !== undefined && q.explanationVideoId !== null)
        checkId(c, rec, 'explanationVideoId', q.explanationVideoId);
    const key = q.answerKey;
    if (!isObj(key))
        return c.error(rec, 'answerKey', 'ключ відповіді відсутній');
    if (q.type === 'single_choice') {
        if (!Array.isArray(q.options) || q.options.length < 2)
            return c.error(rec, 'options', 'потрібен масив варіантів');
        const ids = uniqueIds(c, rec, 'options', q.options);
        q.options.forEach((o, i) => checkRich(c, rec, `options[${i}].content`, o?.content));
        if (typeof key.optionId !== 'string')
            c.error(rec, 'answerKey.optionId', 'потрібен optionId');
        else if (!ids.has(key.optionId))
            c.error(rec, 'answerKey.optionId', `варіанта «${key.optionId}» немає серед options`);
        for (const k of Object.keys(key))
            if (k !== 'optionId')
                c.error(rec, `answerKey.${k}`, 'зайве поле для single_choice');
        if (q.matchingRows || q.matchingOptions || q.numericRule)
            c.error(rec, 'type', 'поля інших типів у single_choice');
    }
    if (q.type === 'matching') {
        if (!Array.isArray(q.matchingRows) || q.matchingRows.length === 0)
            return c.error(rec, 'matchingRows', 'потрібен масив рядків');
        if (!Array.isArray(q.matchingOptions) || q.matchingOptions.length === 0)
            return c.error(rec, 'matchingOptions', 'потрібен масив варіантів');
        const rows = uniqueIds(c, rec, 'matchingRows', q.matchingRows);
        const options = uniqueIds(c, rec, 'matchingOptions', q.matchingOptions);
        for (const id of rows)
            if (options.has(id))
                c.error(rec, 'matchingOptions', `ідентифікатор «${id}» використано і для рядка, і для варіанта`);
        q.matchingRows.forEach((o, i) => checkRich(c, rec, `matchingRows[${i}].content`, o?.content));
        q.matchingOptions.forEach((o, i) => checkRich(c, rec, `matchingOptions[${i}].content`, o?.content));
        if (typeof q.allowOptionReuse !== 'boolean')
            c.error(rec, 'allowOptionReuse', 'потрібно явно вказати true або false');
        if (!isObj(key.pairs))
            return c.error(rec, 'answerKey.pairs', 'потрібен об’єкт відповідностей');
        for (const r of rows)
            if (!(r in key.pairs))
                c.error(rec, `answerKey.pairs.${r}`, 'для рядка немає правильного варіанта');
        const used = new Map();
        for (const [r, o] of Object.entries(key.pairs)) {
            if (!rows.has(r))
                c.error(rec, `answerKey.pairs.${r}`, `рядка «${r}» немає серед matchingRows`);
            if (typeof o !== 'string' || !options.has(o))
                c.error(rec, `answerKey.pairs.${r}`, `варіанта ${JSON.stringify(o)} немає серед matchingOptions`);
            else if (q.allowOptionReuse === false && used.has(o))
                c.error(rec, `answerKey.pairs.${r}`, `варіант «${o}» повторюється, хоча allowOptionReuse = false (також у рядку «${used.get(o)}»)`);
            if (typeof o === 'string')
                used.set(o, r);
        }
        if (Number.isInteger(q.maxPoints) && q.maxPoints !== q.matchingRows.length)
            c.error(rec, 'maxPoints', `для відповідностей очікується ${q.matchingRows.length} (по 1 за пару)`);
    }
    if (q.type === 'numeric') {
        const rule = q.numericRule;
        if (!isObj(rule))
            c.error(rec, 'numericRule', 'потрібне правило порівняння');
        else {
            if (rule.mode !== 'exact' && rule.mode !== 'tolerance')
                c.error(rec, 'numericRule.mode', 'має бути "exact" або "tolerance"');
            if (rule.mode === 'tolerance') {
                const t = typeof rule.tolerance === 'string' ? parseNumeric(rule.tolerance) : null;
                if (!t || !t.ok || t.value.n <= 0n)
                    c.error(rec, 'numericRule.tolerance', 'має бути додатним десятковим числом у рядку, наприклад "0.01"');
            }
            if (rule.allowFractions !== undefined && typeof rule.allowFractions !== 'boolean')
                c.error(rec, 'numericRule.allowFractions', 'має бути true або false');
        }
        if (typeof key.value !== 'string')
            c.error(rec, 'answerKey.value', 'потрібне значення рядком, наприклад "-2.5"');
        else if (!parseNumeric(key.value, { allowFractions: true }).ok)
            c.error(rec, 'answerKey.value', `значення «${key.value}» не є числом`);
        if (q.options || q.matchingRows)
            c.error(rec, 'type', 'поля інших типів у numeric');
    }
}
function validateProfile(c, p) {
    const rec = `профіль оцінювання «${p.id}»`;
    if (!Array.isArray(p.layout))
        return c.error(rec, 'layout', 'потрібен масив');
    let expected = 1;
    let total = 0;
    for (const [i, l] of p.layout.entries()) {
        if (l.from !== expected || l.to < l.from)
            c.error(rec, `layout[${i}]`, `діапазони мають іти послідовно з ${expected}`);
        if (!TYPES.includes(l.type))
            c.error(rec, `layout[${i}].type`, 'невідомий тип');
        total += (l.to - l.from + 1) * l.maxPoints;
        expected = l.to + 1;
    }
    if (expected - 1 !== p.questionCount)
        c.error(rec, 'layout', `діапазони покривають ${expected - 1} позицій, а questionCount = ${p.questionCount}`);
    if (total !== p.maxTotal)
        c.error(rec, 'maxTotal', `сума за розкладкою ${total}, а maxTotal = ${p.maxTotal}`);
}
export function validatePackage(pkg, videoMap, opts = {}) {
    const c = new Collector();
    if (!isObj(pkg)) {
        c.error('пакет', '(корінь)', 'очікується JSON-об’єкт');
        return { ok: false, issues: c.issues, report: null };
    }
    if (pkg.schemaVersion !== 1)
        c.error('пакет', 'schemaVersion', 'підтримується лише версія 1');
    const sim = pkg.simulation;
    if (!isObj(sim)) {
        c.error('пакет', 'simulation', 'відсутній опис симуляції');
        return { ok: false, issues: c.issues, report: null };
    }
    const srec = `симуляція «${sim.id}»`;
    checkId(c, srec, 'id', sim.id);
    if (typeof sim.title !== 'string' || !sim.title.trim())
        c.error(srec, 'title', 'потрібна назва');
    if (typeof sim.subject !== 'string' || !sim.subject.trim())
        c.error(srec, 'subject', 'потрібен предмет');
    if (typeof sim.version !== 'string' || !sim.version.trim())
        c.error(srec, 'version', 'потрібна версія вмісту');
    if (!Number.isInteger(sim.durationSeconds) || sim.durationSeconds <= 0)
        c.error(srec, 'durationSeconds', 'має бути додатним цілим числом секунд');
    if (!['complete', 'demo', 'incomplete'].includes(sim.readiness))
        c.error(srec, 'readiness', 'має бути complete, demo або incomplete');
    if (typeof sim.isDemo !== 'boolean')
        c.error(srec, 'isDemo', 'потрібно true або false');
    if (!isObj(sim.source) || !['imported', 'demo'].includes(sim.source.kind))
        c.error(srec, 'source.kind', 'має бути imported або demo');
    if (sim.isDemo === true) {
        if (!/Демонстраційний набір/.test(String(sim.title)))
            c.error(srec, 'title', 'демонстраційний набір має називатися «Демонстраційний набір…»');
        if (/№\s*\d+/.test(String(sim.title)))
            c.error(srec, 'title', 'демонстраційний набір не може мати номер реальної симуляції');
        if (sim.readiness !== 'demo')
            c.error(srec, 'readiness', 'для демонстраційного набору readiness = "demo"');
    }
    else if (sim.readiness === 'demo')
        c.error(srec, 'readiness', 'readiness "demo" дозволено лише для isDemo = true');
    const questions = Array.isArray(pkg.questions) ? pkg.questions : [];
    if (!Array.isArray(pkg.questions))
        c.error('пакет', 'questions', 'потрібен масив питань');
    const qIds = new Map();
    questions.forEach((q, i) => {
        if (!isObj(q))
            return c.error('пакет', `questions[${i}]`, 'має бути об’єктом');
        if (!checkId(c, `questions[${i}]`, 'id', q.id))
            return;
        if (qIds.has(q.id))
            return c.error(`questions[${i}]`, 'id', `питання «${q.id}» повторюється`);
        qIds.set(q.id, q);
        validateQuestion(c, q, opts);
    });
    const order = Array.isArray(sim.orderedQuestionIds) ? sim.orderedQuestionIds : [];
    if (!Array.isArray(sim.orderedQuestionIds))
        c.error(srec, 'orderedQuestionIds', 'потрібен масив');
    const seenOrder = new Set();
    order.forEach((id, i) => {
        if (typeof id !== 'string' || !qIds.has(id))
            c.error(srec, `orderedQuestionIds[${i}]`, `невідоме питання ${JSON.stringify(id)}`);
        else if (seenOrder.has(id))
            c.error(srec, `orderedQuestionIds[${i}]`, `питання «${id}» вказано двічі`);
        else
            seenOrder.add(id);
    });
    for (const id of qIds.keys())
        if (!seenOrder.has(id))
            c.error(`питання «${id}»`, 'id', 'питання не входить до orderedQuestionIds');
    // Профіль оцінювання
    const profiles = Array.isArray(pkg.scoringProfiles) ? pkg.scoringProfiles : [];
    uniqueIds(c, 'пакет', 'scoringProfiles', profiles);
    profiles.forEach((p) => isObj(p) && validateProfile(c, p));
    const profile = profiles.find((p) => p?.id === sim.scoringProfileId);
    if (!profile)
        c.error(srec, 'scoringProfileId', `профіль «${sim.scoringProfileId}» не знайдено`);
    let maxPoints = 0;
    order.forEach((id, i) => {
        const q = typeof id === 'string' ? qIds.get(id) : undefined;
        if (!q)
            return;
        if (Number.isInteger(q.maxPoints))
            maxPoints += q.maxPoints;
        const slot = profile?.layout?.find((l) => i + 1 >= l.from && i + 1 <= l.to);
        if (!profile)
            return;
        if (!slot)
            return c.error(`питання «${q.id}»`, 'position', `позиції ${i + 1} немає в профілі «${profile.id}»`);
        if (q.type !== slot.type)
            c.error(`питання «${q.id}»`, 'type', `на позиції ${i + 1} очікується ${slot.type}, отримано ${q.type}`);
        if (q.maxPoints !== slot.maxPoints)
            c.error(`питання «${q.id}»`, 'maxPoints', `на позиції ${i + 1} очікується ${slot.maxPoints}`);
        if (slot.optionCount && q.type === 'single_choice' && q.options?.length !== slot.optionCount)
            c.error(`питання «${q.id}»`, 'options', `очікується ${slot.optionCount} варіантів, отримано ${q.options?.length}`);
        if (q.type === 'matching') {
            if (slot.rowCount && q.matchingRows?.length !== slot.rowCount)
                c.error(`питання «${q.id}»`, 'matchingRows', `очікується ${slot.rowCount} рядки, отримано ${q.matchingRows?.length}`);
            if (slot.optionCount && q.matchingOptions?.length !== slot.optionCount)
                c.error(`питання «${q.id}»`, 'matchingOptions', `очікується ${slot.optionCount} варіантів, отримано ${q.matchingOptions?.length}`);
        }
    });
    if (profile) {
        if (order.length !== profile.questionCount)
            c.error(srec, 'orderedQuestionIds', `кількість питань ${order.length}, а профіль вимагає ${profile.questionCount}`);
        if (maxPoints !== profile.maxTotal)
            c.error(srec, 'maxPoints', `сума максимальних балів ${maxPoints}, а профіль вимагає ${profile.maxTotal}`);
    }
    // Довідкові матеріали
    const refs = Array.isArray(pkg.referenceMaterials) ? pkg.referenceMaterials : [];
    uniqueIds(c, 'пакет', 'referenceMaterials', refs);
    refs.forEach((r) => {
        if (!isObj(r))
            return;
        const rec = `довідник «${r.id}»`;
        if (typeof r.title !== 'string' || !r.title.trim())
            c.error(rec, 'title', 'потрібен заголовок');
        if (r.kind === 'pdf')
            checkUrlField(c, rec, 'src', r.src, opts, 'set');
        else if (r.kind === 'pages') {
            if (!Array.isArray(r.pages) || r.pages.length === 0)
                c.error(rec, 'pages', 'потрібна хоча б одна сторінка');
            else
                r.pages.forEach((p, i) => checkRich(c, rec, `pages[${i}]`, p));
            if (r.downloadSrc)
                checkUrlField(c, rec, 'downloadSrc', r.downloadSrc, opts, 'set');
        }
        else if (r.kind === 'images') {
            if (!Array.isArray(r.pages) || r.pages.length === 0)
                c.error(rec, 'pages', 'потрібна хоча б одна сторінка');
            else
                r.pages.forEach((p, i) => {
                    checkUrlField(c, rec, `pages[${i}].src`, p?.src, opts, 'set');
                    if (typeof p?.alt !== 'string' || !p.alt.trim())
                        c.error(rec, `pages[${i}].alt`, 'потрібен текстовий опис сторінки');
                });
            if (r.downloadSrc)
                checkUrlField(c, rec, 'downloadSrc', r.downloadSrc, opts, 'set');
        }
        else
            c.error(rec, 'kind', 'має бути "pdf", "pages" або "images"');
    });
    if (sim.referenceMaterialId !== null && sim.referenceMaterialId !== undefined && !refs.some((r) => r?.id === sim.referenceMaterialId)) {
        c.error(srec, 'referenceMaterialId', `довідник «${sim.referenceMaterialId}» не знайдено`);
    }
    // Таблиця переведення
    const tables = Array.isArray(pkg.conversionTables) ? pkg.conversionTables : [];
    uniqueIds(c, 'пакет', 'conversionTables', tables);
    tables.forEach((t) => {
        if (!isObj(t))
            return;
        const rec = `таблиця переведення «${t.id}»`;
        if (!Number.isInteger(t.year))
            c.error(rec, 'year', 'потрібен рік');
        if (typeof t.source !== 'string' || !t.source.trim())
            c.error(rec, 'source', 'потрібне джерело таблиці');
        if (profile && t.maxPrimary !== profile.maxTotal)
            c.error(rec, 'maxPrimary', `має дорівнювати ${profile.maxTotal}`);
        if (!isObj(t.map))
            return c.error(rec, 'map', 'потрібен об’єкт');
        let prev = -1;
        for (let s = 0; s <= (t.maxPrimary ?? -1); s++) {
            const v = t.map[String(s)];
            if (v === undefined)
                c.error(rec, `map.${s}`, 'немає значення для цього первинного бала');
            else if (v !== null && (!Number.isInteger(v) || v < 100 || v > 200))
                c.error(rec, `map.${s}`, 'має бути цілим 100–200 або null');
            else if (v !== null) {
                if (v < prev)
                    c.error(rec, `map.${s}`, 'значення не можуть зменшуватися');
                prev = v;
            }
        }
    });
    if (sim.conversionTableId && !tables.some((t) => t?.id === sim.conversionTableId))
        c.error(srec, 'conversionTableId', `таблицю «${sim.conversionTableId}» не знайдено`);
    // Карта відео
    const videoInfo = validateVideoMap(c, videoMap, sim.id, qIds, opts);
    const ordered = order.filter((id) => typeof id === 'string' && qIds.has(id)).map((id) => qIds.get(id));
    const missingText = ordered.filter((q) => !q.textExplanation || !String(q.textExplanation).trim()).map((q) => q.id);
    const report = {
        simulationId: String(sim.id),
        title: String(sim.title),
        version: String(sim.version),
        isDemo: sim.isDemo === true,
        questionCount: ordered.length,
        expectedQuestionCount: profile?.questionCount ?? null,
        keysCount: ordered.filter((q) => isObj(q.answerKey)).length,
        textExplanations: ordered.length - missingText.length,
        missingTextExplanations: missingText,
        ...videoInfo.summary(ordered.map((q) => q.id)),
        referenceMaterial: sim.referenceMaterialId ? 'present' : 'missing',
        conversionTable: sim.conversionTableId ? 'present' : 'missing',
        maxPoints,
    };
    for (const id of missingText)
        c.warn(`питання «${id}»`, 'textExplanation', 'текстового розв’язку немає');
    return { ok: !c.issues.some((i) => i.level === 'error'), issues: c.issues, report };
}
function validateVideoMap(c, vm, simulationId, qIds, opts) {
    const bound = new Map(); // questionId -> media
    const summary = (order) => {
        const ready = order.filter((id) => bound.get(id)?.readiness === 'ready');
        const pub = ready.filter((id) => !!bound.get(id)?.publicUrl);
        return {
            videoBindings: bound.size,
            videosReady: ready.length,
            videosPublic: pub.length,
            videosLocalOnly: ready.length - pub.length,
            videosNeedReview: order.filter((id) => bound.get(id)?.readiness === 'needs_review'),
            missingVideos: order.filter((id) => !bound.has(id) || bound.get(id)?.readiness === 'missing'),
        };
    };
    for (const [id, q] of qIds) {
        if (q.explanationVideoId && !vm)
            c.error(`питання «${id}»`, 'explanationVideoId', 'вказано відео, але карти відео немає');
    }
    if (vm === null || vm === undefined)
        return { summary };
    const rec = 'карта відео';
    if (!isObj(vm)) {
        c.error(rec, '(корінь)', 'очікується JSON-об’єкт');
        return { summary };
    }
    if (vm.schemaVersion !== 1)
        c.error(rec, 'schemaVersion', 'підтримується лише версія 1');
    if (vm.simulationId !== simulationId)
        c.error(rec, 'simulationId', `карта належить «${vm.simulationId}», а не «${simulationId}»`);
    const media = Array.isArray(vm.media) ? vm.media : [];
    const mediaIds = uniqueIds(c, rec, 'media', media);
    const mediaById = new Map(media.filter(isObj).map((m) => [m.id, m]));
    media.forEach((m, i) => {
        if (!isObj(m))
            return;
        const mrec = `відео «${m.id}»`;
        if (m.kind !== 'video' && m.kind !== 'embed')
            c.error(mrec, 'kind', 'має бути "video" або "embed"');
        if (!['ready', 'needs_review', 'missing'].includes(m.readiness))
            c.error(mrec, 'readiness', 'має бути ready, needs_review або missing');
        if (m.localPath)
            checkUrlField(c, mrec, 'localPath', m.localPath, opts, 'media');
        if (m.publicUrl) {
            const err = m.kind === 'embed' ? checkEmbedUrl(m.publicUrl) : checkContentUrl(m.publicUrl);
            if (err)
                c.error(mrec, 'publicUrl', err);
            else if (m.kind === 'video' && !/^https:/i.test(m.publicUrl) && opts.fileExists && !opts.fileExists(m.publicUrl, 'set'))
                c.error(mrec, 'publicUrl', `файл «${m.publicUrl}» не знайдено`);
        }
        if (m.kind === 'embed' && m.localPath)
            c.error(mrec, 'localPath', 'вбудований плеєр не має локального файла');
        if (m.readiness !== 'missing' && !m.localPath && !m.publicUrl)
            c.error(mrec, 'publicUrl', 'немає ні localPath, ні publicUrl');
        if (m.poster)
            checkUrlField(c, mrec, 'poster', m.poster, opts, 'set');
        if (m.captions !== undefined) {
            if (!Array.isArray(m.captions))
                c.error(mrec, 'captions', 'має бути масивом');
            else
                m.captions.forEach((cap, j) => {
                    checkUrlField(c, mrec, `captions[${j}].src`, cap?.src, opts, 'set');
                    if (typeof cap?.srclang !== 'string' || typeof cap?.label !== 'string')
                        c.error(mrec, `captions[${j}]`, 'потрібні srclang і label');
                });
        }
        void i;
    });
    const bindings = Array.isArray(vm.bindings) ? vm.bindings : [];
    if (!Array.isArray(vm.bindings))
        c.error(rec, 'bindings', 'потрібен масив прив’язок');
    const usedMedia = new Map();
    bindings.forEach((b, i) => {
        const f = `bindings[${i}]`;
        if (!isObj(b))
            return c.error(rec, f, 'має бути об’єктом');
        if (!qIds.has(b.questionId))
            return c.error(rec, `${f}.questionId`, `невідоме питання ${JSON.stringify(b.questionId)} — зайва прив’язка`);
        if (bound.has(b.questionId))
            return c.error(rec, `${f}.questionId`, `питання «${b.questionId}» прив’язано двічі`);
        if (!mediaIds.has(b.explanationVideoId))
            return c.error(rec, `${f}.explanationVideoId`, `відео «${b.explanationVideoId}» немає в media`);
        if (usedMedia.has(b.explanationVideoId))
            return c.error(rec, `${f}.explanationVideoId`, `відео «${b.explanationVideoId}» уже прив’язане до питання «${usedMedia.get(b.explanationVideoId)}»`);
        const q = qIds.get(b.questionId);
        if (q.explanationVideoId && q.explanationVideoId !== b.explanationVideoId)
            c.error(`питання «${b.questionId}»`, 'explanationVideoId', `у питанні «${q.explanationVideoId}», а в карті відео «${b.explanationVideoId}»`);
        usedMedia.set(b.explanationVideoId, b.questionId);
        bound.set(b.questionId, mediaById.get(b.explanationVideoId));
    });
    for (const id of mediaIds)
        if (!usedMedia.has(id))
            c.warn(`відео «${id}»`, 'id', 'запис не прив’язаний до жодного питання (зайвий)');
    for (const [id, q] of qIds) {
        if (!bound.has(id)) {
            if (q.explanationVideoId)
                c.error(`питання «${id}»`, 'explanationVideoId', 'відео вказано в питанні, але немає в карті відео');
            else
                c.warn(`питання «${id}»`, 'відео', 'відеопояснення не прив’язане');
        }
    }
    return { summary };
}
export function formatIssue(i) {
    return `${i.level === 'error' ? 'ПОМИЛКА' : 'увага'} · ${i.record} · ${i.field}: ${i.message}`;
}
