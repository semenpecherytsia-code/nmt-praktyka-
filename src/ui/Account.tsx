import { LogIn, LogOut, Shield } from 'lucide-react';
import { cloudEnabled, signIn, signOut, useAuth } from '../cloud/cloud';

/** Праворуч у шапці: вхід через Google, ім’я учня, посилання «Адмін» для адміністратора. */
export function Account({ compact = false }: { compact?: boolean }) {
  const auth = useAuth();
  if (!cloudEnabled || !auth.ready) return null;
  if (!auth.user) {
    return (
      <div className="account">
        <button type="button" className="btn btn--ghost btn--sm" onClick={() => void signIn()}>
          <LogIn size={16} aria-hidden /> Увійти
        </button>
      </div>
    );
  }
  return (
    <div className="account">
      {auth.isAdmin && <a className="btn btn--ghost btn--sm" href="#/admin"><Shield size={16} aria-hidden /> Адмін</a>}
      {!compact && (
        <span className="account__user" title={auth.user.email}>
          {auth.user.avatar ? <img src={auth.user.avatar} alt="" className="account__avatar" referrerPolicy="no-referrer" /> : null}
          <span className="account__name">{auth.user.name}</span>
        </span>
      )}
      <button type="button" className="btn btn--ghost btn--sm btn--icon" onClick={() => void signOut()} aria-label="Вийти" title="Вийти">
        <LogOut size={16} aria-hidden />
      </button>
    </div>
  );
}
