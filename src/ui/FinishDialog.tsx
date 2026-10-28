import { useEffect, useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { FinishSummary } from '../engine/attempt';
import { Dialog } from './Dialog';
import { formatClock, plural } from './format';

interface Props {
  open: boolean;
  summary: FinishSummary;
  remaining: number;
  deadlineAt: number;
  onCancel: () => void;
  onConfirm: (applyDrafts: boolean) => void;
}

const ANS: [string, string, string] = ['відповідь', 'відповіді', 'відповідей'];
const TASK: [string, string, string] = ['завдання', 'завдання', 'завдань'];
const DRAFT: [string, string, string] = ['чернетка', 'чернетки', 'чернеток'];

export function FinishDialog({ open, summary: s, deadlineAt, onCancel, onConfirm }: Props) {
  const pending = s.draftOnly + s.savedWithChanges;
  const [apply, setApply] = useState(true);
  const [busy, setBusy] = useState(false);
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!open) return;
    setBusy(false);
    setApply(true);
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [open]);

  return (
    <Dialog open={open} onClose={onCancel} title="Завершити симуляцію?" titleId="finish-title" size="sm"
      footer={
        <>
          <button type="button" className="btn btn--ghost" onClick={onCancel}>Продовжити тест</button>
          <button type="button" className="btn btn--primary" disabled={busy}
            onClick={() => { setBusy(true); onConfirm(pending > 0 && apply); }}>
            Завершити та переглянути результат
          </button>
        </>
      }>
      <dl className="finish-stats">
        <div><dt>Збережено</dt><dd>{s.saved} <span>з {s.total}</span></dd></div>
        <div><dt>Без відповіді</dt><dd>{s.empty}</dd></div>
        <div><dt>Незбережені чернетки</dt><dd>{pending}</dd></div>
        <div><dt>Залишок часу</dt><dd className="tabular">{formatClock(deadlineAt - now)}</dd></div>
      </dl>
      {s.empty > 0 && <p className="hint">{s.empty} {plural(s.empty, TASK)} без відповіді отримають 0 балів.</p>}
      {pending > 0 && (
        <div className="notice notice--warn" role="note">
          <AlertTriangle size={18} aria-hidden />
          <div>
            <p>
              У {pending} {plural(pending, TASK)} є незбережені зміни
              {s.savedWithChanges > 0 && ` (з них ${s.savedWithChanges} — поверх збереженої відповіді)`}.
              {s.invalidDrafts > 0 && ` ${s.invalidDrafts} ${plural(s.invalidDrafts, DRAFT)} ${s.invalidDrafts === 1 ? 'некоректна' : 'некоректні'} і не ${s.invalidDrafts === 1 ? 'буде зарахована' : 'будуть зараховані'}.`}
            </p>
            <fieldset className="radio-stack">
              <legend className="visually-hidden">Що зробити з чернетками</legend>
              <label><input type="radio" name="drafts" checked={apply} onChange={() => setApply(true)} disabled={s.applicableDrafts === 0} />
                Застосувати коректні чернетки ({s.applicableDrafts}) і завершити</label>
              <label><input type="radio" name="drafts" checked={!apply || s.applicableDrafts === 0} onChange={() => setApply(false)} />
                Завершити лише зі збереженими {plural(2, ANS)}</label>
            </fieldset>
          </div>
        </div>
      )}
    </Dialog>
  );
}
