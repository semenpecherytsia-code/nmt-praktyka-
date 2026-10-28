import type { MatchingQuestion } from '../../content/types';
import type { AnswerValue } from '../../engine/answers';
import { RichText } from '../RichText';
import { LETTERS } from '../format';
import { Eraser } from 'lucide-react';

interface Props { q: MatchingQuestion; value: AnswerValue | undefined; onChange: (v: AnswerValue) => void; labelledBy: string }

/**
 * Відповідності без перетягування: таблиця «рядок × буква» зі справжніми радіокнопками.
 * Працює мишею, дотиком і клавіатурою (Tab між рядками, стрілки між буквами).
 */
export function Matching({ q, value, onChange }: Props) {
  const pairs: Record<string, string | null> = value?.type === 'matching' ? value.pairs : {};
  const set = (rowId: string, optId: string | null) => {
    const next: Record<string, string | null> = {};
    for (const r of q.matchingRows) next[r.id] = r.id === rowId ? optId : pairs[r.id] ?? null;
    onChange({ type: 'matching', pairs: next });
  };
  const filled = q.matchingRows.filter((r) => pairs[r.id]).length;
  const dupes = new Set<string>();
  if (!q.allowOptionReuse) {
    const seen = new Set<string>();
    for (const r of q.matchingRows) {
      const o = pairs[r.id];
      if (!o) continue;
      if (seen.has(o)) dupes.add(o);
      seen.add(o);
    }
  }
  const letterOf = (optId: string) => LETTERS[q.matchingOptions.findIndex((o) => o.id === optId)];

  return (
    <div className="matching">
      <div className="matching__lists">
        <ol className="matching__col" aria-label="Пункти 1–3">
          {q.matchingRows.map((r, i) => (
            <li key={r.id}><span className="tag tag--num" aria-hidden>{i + 1}</span><RichText text={r.content} /></li>
          ))}
        </ol>
        <ul className="matching__col" aria-label="Варіанти">
          {q.matchingOptions.map((o, i) => (
            <li key={o.id}><span className="tag" aria-hidden>{LETTERS[i]}</span><span className="visually-hidden">{LETTERS[i]}: </span><RichText text={o.content} /></li>
          ))}
        </ul>
      </div>

      <fieldset className="matching__grid" aria-describedby={`${q.id}-match-hint`}>
        <legend id={`${q.id}-grid-label`} className="matching__legend">
          <span>Ваші відповідності</span>
          <span className="matching__count" aria-live="polite">Заповнено {filled} з {q.matchingRows.length}</span>
        </legend>
        <p id={`${q.id}-match-hint`} className="hint">
          Для кожного пункту оберіть букву. {q.allowOptionReuse ? 'Один варіант можна обрати для кількох пунктів.' : 'Кожен варіант можна використати лише один раз.'} Неповну відповідь теж можна зберегти. Щоб очистити пункт, натисніть обрану букву ще раз.
        </p>
        <div className="mgrid" style={{ ['--cols' as string]: q.matchingOptions.length }}>
          {q.matchingRows.map((r, ri) => (
            <div key={r.id} className="mgrid__line" role="radiogroup" aria-label={`Пункт ${ri + 1}`}>
              <span className="mgrid__rowhead" aria-hidden>{ri + 1}</span>
              {q.matchingOptions.map((o, oi) => {
                const id = `${q.id}-${r.id}-${o.id}`;
                const checked = pairs[r.id] === o.id;
                const conflict = checked && dupes.has(o.id);
                return (
                  <label key={o.id} htmlFor={id} className={`mcell${checked ? ' is-selected' : ''}${conflict ? ' is-conflict' : ''}`}>
                    <input id={id} type="radio" name={`m-${q.id}-${r.id}`} checked={checked} onChange={() => set(r.id, o.id)}
                      onClick={() => { if (checked) set(r.id, null); }}
                      aria-label={`Пункт ${ri + 1} — варіант ${LETTERS[oi]}`} />
                    <span aria-hidden>{LETTERS[oi]}</span>
                  </label>
                );
              })}
              <button type="button" className="icon-btn icon-btn--sm mgrid__clear" onClick={() => set(r.id, null)} disabled={!pairs[r.id]}
                aria-label={`Очистити пункт ${ri + 1}`} title="Очистити">
                <Eraser size={18} aria-hidden />
              </button>
            </div>
          ))}
        </div>
        {dupes.size > 0 && (
          <p className="field-error" role="alert">
            Варіант {[...dupes].map(letterOf).join(', ')} обрано для кількох пунктів. У цьому завданні кожен варіант використовується один раз.
          </p>
        )}
      </fieldset>
    </div>
  );
}
