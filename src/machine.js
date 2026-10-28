// Явна модель станів застосунку.
//
//   Екрани:   prepare ──start/continue──▶ active ──finish──▶ review ──retry──▶ active (нова спроба)
//                 ▲                          │                  │
//                 └──────── home ────────────┴──────────────────┘
//   Оверлеї:  selector (лише на prepare), reference (prepare | active), finishConfirm (лише active)
//
// Екран визначається маршрутом і статусом спроби; переходи оверлеїв — функцією overlayTransition.
const allowed = {
    loading: [],
    not_found: [],
    prepare: ['selector', 'reference'],
    active: ['reference', 'finishConfirm'],
    review: [],
};
export function overlayTransition(screen, current, ev) {
    if (ev.type === 'CLOSE')
        return 'none';
    const next = ev.type === 'OPEN_SELECTOR' ? 'selector' : ev.type === 'OPEN_REFERENCE' ? 'reference' : 'finishConfirm';
    if (current !== 'none' && current !== next)
        return current; // один діалог за раз
    return allowed[screen].includes(next) ? next : current;
}
/**
 * Вирішує, який екран показати. Повертає redirect, якщо маршрут не відповідає стану спроби:
 * розбір незавершеної спроби не відкривається, завершену спробу не можна «пройти» знову.
 */
export function resolveScreen(route, attempt) {
    if (route.name === 'home')
        return { screen: 'prepare' };
    if (attempt === undefined)
        return { screen: 'loading' };
    if (attempt === null || attempt.status === 'abandoned')
        return { screen: 'not_found' };
    if (route.name === 'review') {
        return attempt.status === 'finished' ? { screen: 'review' } : { screen: 'active', redirect: { name: 'attempt', attemptId: attempt.id, position: 1 } };
    }
    return attempt.status === 'finished' ? { screen: 'review', redirect: { name: 'review', attemptId: attempt.id } } : { screen: 'active' };
}
