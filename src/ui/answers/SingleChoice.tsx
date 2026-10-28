import type { SingleChoiceQuestion } from '../../content/types';
import type { AnswerValue } from '../../engine/answers';
import { RichText } from '../RichText';
import { LETTERS } from '../format';

interface Props { q: SingleChoiceQuestion; value: AnswerValue | undefined; onChange: (v: AnswerValue) => void; labelledBy: string; disabled?: boolean }

export function SingleChoice({ q, value, onChange, labelledBy, disabled }: Props) {
  const selected = value?.type === 'single_choice' ? value.optionId : null;
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} aria-disabled={disabled || undefined} className={`choice-list${disabled ? ' is-locked' : ''}`}>
      {q.options.map((o, i) => {
        const id = `${q.id}-${o.id}`;
        const checked = selected === o.id;
        return (
          <label key={o.id} htmlFor={id} className={`choice${checked ? ' is-selected' : ''}`}>
            <input id={id} type="radio" name={`answer-${q.id}`} value={o.id} checked={checked} disabled={disabled}
              onChange={() => onChange({ type: 'single_choice', optionId: o.id })} />
            <span className="choice__letter" aria-hidden>{LETTERS[i]}</span>
            <span className="visually-hidden">Варіант {LETTERS[i]}: </span>
            <RichText text={o.content} className="choice__content" />
          </label>
        );
      })}
    </div>
  );
}
