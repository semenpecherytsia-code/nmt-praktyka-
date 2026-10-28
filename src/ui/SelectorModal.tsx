import { Check } from 'lucide-react';
import type { LoadedSet } from '../content/load';
import { Dialog } from './Dialog';
import { formatMinutes, plural } from './format';

/** Компактний вибір: лише набори, що реально підключені й пройшли перевірку. */
export function SelectorModal({ open, onClose, sets, currentId, onPick }: { open: boolean; onClose: () => void; sets: LoadedSet[]; currentId: string; onPick: (id: string) => void }) {
  const available = sets.filter((s) => s.status === 'available' && s.pkg);
  return (
    <Dialog open={open} onClose={onClose} title="Обрати симуляцію" titleId="selector-title" size="sm">
      {available.length === 0 ? <p className="empty-state">Доступних наборів поки немає.</p> : (
        <ul className="selector">
          {available.map((s) => {
            const sim = s.pkg!.simulation;
            const cur = sim.id === currentId;
            return (
              <li key={sim.id}>
                <button type="button" className={`selector__item${cur ? ' is-current' : ''}`} aria-current={cur ? 'true' : undefined} onClick={() => onPick(sim.id)}>
                  <span className="selector__title">{sim.title}</span>
                  <span className="selector__meta">
                    {sim.orderedQuestionIds.length} {plural(sim.orderedQuestionIds.length, ['завдання', 'завдання', 'завдань'])} · {formatMinutes(sim.durationSeconds)}
                    {sim.isDemo && <span className="badge badge--demo">Демонстраційний</span>}
                  </span>
                  {cur && <Check size={18} aria-label="Обрано" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Dialog>
  );
}
