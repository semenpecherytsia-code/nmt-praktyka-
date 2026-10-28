import { useState } from 'react';
import { BookOpen, Clock, ListChecks, Play, RotateCcw, Target, Layers, Info, History } from 'lucide-react';
import type { LoadedSet } from '../content/load';
import type { Attempt } from '../engine/attempt';
import { Dialog } from './Dialog';
import { formatClock, formatDateTime, formatMinutes, plural } from './format';

interface Props {
  set: LoadedSet;
  active: Attempt | null;
  finished: Attempt[];
  availableCount: number;
  demoId: string | null;
  now: number;
  onStart: () => void;
  onContinue: () => void;
  onRestart: () => void;
  onOpenSelector: () => void;
  onOpenReference: () => void;
  onOpenDemo: () => void;
  onOpenReview: (id: string) => void;
}

const TYPE_TEXT = {
  single_choice: 'один правильний варіант із п’яти',
  matching: 'встановлення відповідності (три пари)',
  numeric: 'коротка числова відповідь',
} as const;

export function StartScreen(p: Props) {
  const [confirmRestart, setConfirmRestart] = useState(false);
  const { set } = p;

  if (set.status !== 'available' || !set.pkg) {
    return (
      <main className="start" id="main">
        <section className="card start-card" aria-labelledby="start-title">
          <p className="eyebrow">Математика</p>
          <h1 id="start-title" className="start-card__title">{set.entry.title}</h1>
          <div className="notice notice--info">
            <Info size={18} aria-hidden />
            <div>
              <p><strong>{set.status === 'not_added' ? 'Набір ще не додано.' : set.status === 'invalid' ? 'Набір не пройшов перевірку й тимчасово недоступний.' : 'Не вдалося завантажити набір.'}</strong></p>
              <p>Ця симуляція з’явиться після імпорту точних завдань, ключів і розв’язків. Схожі задачі замість неї не підставляються.</p>
            </div>
          </div>
          <div className="start-card__actions">
            {p.demoId && <button type="button" className="btn btn--primary" onClick={p.onOpenDemo}><Play size={18} aria-hidden /> Відкрити демонстраційний набір</button>}
            {p.availableCount > 0 && <button type="button" className="btn btn--ghost" onClick={p.onOpenSelector}><Layers size={18} aria-hidden /> Обрати симуляцію</button>}
          </div>
        </section>
      </main>
    );
  }

  const sim = set.pkg.simulation;
  const profile = set.pkg.scoringProfiles.find((x) => x.id === sim.scoringProfileId)!;
  const total = sim.orderedQuestionIds.length;
  const left = p.active ? Math.max(0, p.active.deadlineAt - p.now) : 0;

  return (
    <main className="start" id="main">
      <section className="card start-card" aria-labelledby="start-title">
        {sim.isDemo && (
          <div className="demo-banner" role="note">
            <span className="badge badge--demo">Демонстраційний набір</span>
            <span>{sim.source.note}</span>
          </div>
        )}
        <p className="eyebrow">{sim.subject}</p>
        <h1 id="start-title" className="start-card__title">{sim.title}</h1>

        <dl className="start-stats">
          <div><dt><ListChecks size={18} aria-hidden /> Завдань</dt><dd>{total}</dd></div>
          <div><dt><Clock size={18} aria-hidden /> Тривалість</dt><dd>{formatMinutes(sim.durationSeconds)}</dd></div>
          <div><dt><Target size={18} aria-hidden /> Максимум</dt><dd>{profile.maxTotal} {plural(profile.maxTotal, ['бал', 'бали', 'балів'])}</dd></div>
        </dl>

        <div className="start-card__actions">
          {p.active ? (
            <>
              <button type="button" className="btn btn--primary btn--lg" onClick={p.onContinue}>
                <Play size={18} aria-hidden /> Продовжити
              </button>
              <span className="start-card__left">Залишилось <strong className="tabular">{formatClock(left)}</strong></span>
              <button type="button" className="btn btn--ghost" onClick={() => setConfirmRestart(true)}>
                <RotateCcw size={18} aria-hidden /> Почати заново
              </button>
            </>
          ) : (
            <button type="button" className="btn btn--primary btn--lg" onClick={p.onStart}>
              <Play size={18} aria-hidden /> Розпочати симуляцію
            </button>
          )}
          <button type="button" className="btn btn--ghost" onClick={p.onOpenReference}>
            <BookOpen size={18} aria-hidden /> Довідкові матеріали
          </button>
          <button type="button" className="btn btn--ghost" onClick={p.onOpenSelector}><Layers size={18} aria-hidden /> Обрати симуляцію</button>
        </div>

        <h2 className="start-card__h2">Як це працює</h2>
        <ul className="instructions">
          {profile.layout.map((l) => (
            <li key={l.from}>Завдання {l.from}–{l.to}: {TYPE_TEXT[l.type]} — до {l.maxPoints} {plural(l.maxPoints, ['бала', 'балів', 'балів'])} за кожне.</li>
          ))}
          <li>Відповідь зараховується після кнопки <strong>«Зберегти відповідь»</strong>. Введене без збереження залишається чернеткою.</li>
          <li>Таймер стартує після натискання кнопки й не зупиняється: ні в довіднику, ні у фоновій вкладці, ні після закриття сторінки.</li>
          <li>Коли час вийде, симуляція завершиться автоматично: зараховуються збережені відповіді та коректні незбережені чернетки.</li>
          <li>Між завданнями можна переходити в будь-якому порядку й позначати їх для перегляду.</li>
          <li>Прогрес зберігається лише в цьому браузері. Таймер локальний — це тренажер, а не захищений іспит.</li>
        </ul>
      </section>

      {p.finished.length > 0 && (
        <section className="card history" aria-labelledby="history-title">
          <h2 id="history-title"><History size={18} aria-hidden /> Попередні спроби</h2>
          <ul>
            {p.finished.map((a) => (
              <li key={a.id}>
                <button type="button" className="link-btn" onClick={() => p.onOpenReview(a.id)}>
                  {formatDateTime(a.finishedAt!)} — <strong>{String(a.result?.primary ?? 0).replace('.', ',')} з {a.result?.max}</strong>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Dialog open={confirmRestart} onClose={() => setConfirmRestart(false)} title="Почати заново?" titleId="restart-title" size="sm"
        footer={<>
          <button type="button" className="btn btn--ghost" onClick={() => setConfirmRestart(false)}>Скасувати</button>
          <button type="button" className="btn btn--danger" onClick={() => { setConfirmRestart(false); p.onRestart(); }}>Так, почати заново</button>
        </>}>
        <p>Поточну незавершену спробу буде закрито без оцінювання. Її відповіді й чернетки не зарахуються, а новий таймер почнеться з {formatMinutes(sim.durationSeconds)}.</p>
      </Dialog>
    </main>
  );
}
