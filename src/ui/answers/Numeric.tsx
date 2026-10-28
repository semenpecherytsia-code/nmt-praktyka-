import { useState } from 'react';
import type { NumericQuestion } from '../../content/types';
import type { AnswerValue } from '../../engine/answers';
import { numericErrorText, parseNumeric } from '../../engine/numeric';

interface Props { q: NumericQuestion; value: AnswerValue | undefined; onChange: (v: AnswerValue) => void; onSubmit: () => void }

export function Numeric({ q, value, onChange, onSubmit }: Props) {
  const raw = value?.type === 'numeric' ? value.raw : '';
  const [touched, setTouched] = useState(false);
  const parsed = parseNumeric(raw, { allowFractions: q.numericRule.allowFractions });
  const error = touched && !parsed.ok && parsed.reason !== 'empty' ? numericErrorText(parsed.reason) : null;
  const inputId = `${q.id}-input`;
  return (
    <div className="numeric">
      <label htmlFor={inputId} className="numeric__label">Ваша відповідь</label>
      <input
        id={inputId}
        className={`numeric__input${error ? ' is-invalid' : ''}`}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="done"
        value={raw}
        maxLength={40}
        aria-invalid={!!error}
        aria-describedby={`${inputId}-hint${error ? ` ${inputId}-err` : ''}`}
        onChange={(e) => onChange({ type: 'numeric', raw: e.target.value })}
        onBlur={() => setTouched(true)}
        onKeyDown={(e) => { if (e.key === 'Enter') { setTouched(true); onSubmit(); } }}
      />
      <p id={`${inputId}-hint`} className="hint">
        Ціле або десяткове число; кома або крапка, мінус дозволено{q.numericRule.allowFractions ? '; у цьому завданні також дріб через «/»' : ''}.
      </p>
      <p id={`${inputId}-err`} className="field-error" aria-live="polite">{error}</p>
    </div>
  );
}
