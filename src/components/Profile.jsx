import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { changePassword } from '../services/auth';
import {
  generateTelegramToken,
  getTelegramLinkStatus,
  unlinkTelegram,
} from '../services/supabase';

/* ─── Constants ─────────────────────────────────────────────────────────── */

const ROLE_LABELS = {
  admin: 'Адміністратор',
  dispatcher: 'Диспетчер',
  driver: 'Водій',
  manager: 'Менеджер',
};

/* ─── Telegram Section ──────────────────────────────────────────────────── */

const TelegramSection = ({ driverId }) => {
  const bot = process.env.REACT_APP_TELEGRAM_BOT_USERNAME || 'trustdriver_bot';
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try { setStatus(await getTelegramLinkStatus(driverId)); } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [driverId]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    if (!token || !expiresAt) return;
    const ms = new Date(expiresAt) - Date.now();
    if (ms <= 0) { setToken(null); return; }
    const id = setTimeout(() => setToken(null), ms);
    return () => clearTimeout(id);
  }, [token, expiresAt]);

  const generate = async () => {
    setBusy(true);
    try {
      const { token: t, expiresAt: exp } = await generateTelegramToken(driverId);
      setToken(t); setExpiresAt(exp);
    } catch (e) { alert(e.message); }
    finally { setBusy(false); }
  };

  const unlink = async () => {
    if (!window.confirm('Відключити Telegram?')) return;
    setBusy(true);
    try { await unlinkTelegram(driverId); await load(); }
    catch (e) { alert(e.message); }
    finally { setBusy(false); }
  };

  const copy = () => {
    navigator.clipboard.writeText(`https://t.me/${bot}?start=${token}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const minutesLeft = expiresAt
    ? Math.max(0, Math.round((new Date(expiresAt) - Date.now()) / 60000))
    : 30;

  if (loading) {
    return <div className="loading" style={{ padding: '1rem 0' }}>Завантаження...</div>;
  }

  if (status?.linked) {
    return (
      <div className="flex items-center justify-between" style={{ padding: '0.5rem 0' }}>
        <div className="flex items-center gap-2">
          <span className="badge badge-green">Підключено</span>
          <span className="text-secondary">{status.telegramName || 'Telegram'}</span>
        </div>
        <button onClick={unlink} disabled={busy} className="btn btn-secondary btn-sm">
          {busy ? '…' : 'Відключити'}
        </button>
      </div>
    );
  }

  if (token) {
    return (
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="badge badge-blue">Тимчасове посилання ({minutesLeft} хв)</span>
          <button onClick={() => setToken(null)} className="btn btn-secondary btn-sm">Скасувати</button>
        </div>
        <code style={{
          display: 'block',
          fontFamily: 'var(--font-mono)',
          fontSize: '0.7rem',
          background: 'var(--surface-sub)',
          padding: '0.5rem',
          borderRadius: 'var(--r-md)',
          marginBottom: '0.5rem',
          wordBreak: 'break-all',
        }}>
          {token}
        </code>
        <div className="flex gap-2">
          <a href={`https://t.me/${bot}?start=${token}`} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">
            Відкрити бот
          </a>
          <button onClick={copy} className="btn btn-secondary btn-sm">
            {copied ? 'Скопійовано' : 'Скопіювати'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between" style={{ padding: '0.5rem 0' }}>
      <span className="text-tertiary">Telegram не підключено</span>
      <button onClick={generate} disabled={busy} className="btn btn-secondary btn-sm">
        {busy ? '…' : 'Підключити'}
      </button>
    </div>
  );
};

/* ─── Profile Component ─────────────────────────────────────────────────── */

const Profile = () => {
  const { user, logout, hasPermission } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [password, setPassword] = useState({ new: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  useEffect(() => {
    if (message.text && message.type === 'success') {
      const timer = setTimeout(() => setMessage({ text: '', type: '' }), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    if (!password.new || !password.confirm) {
      return setMessage({ text: 'Заповніть всі поля', type: 'error' });
    }
    if (password.new !== password.confirm) {
      return setMessage({ text: 'Паролі не співпадають', type: 'error' });
    }
    if (password.new.length < 6) {
      return setMessage({ text: 'Мінімум 6 символів', type: 'error' });
    }
    setSaving(true);
    try {
      const result = await changePassword(password.new);
      if (result.success) {
        setMessage({ text: 'Пароль успішно змінено', type: 'success' });
        setPassword({ new: '', confirm: '' });
      } else {
        setMessage({ text: result.error || 'Помилка', type: 'error' });
      }
    } catch (err) {
      setMessage({ text: err.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  if (!user) return null;

  const hasTelegram = !!user.driver_id;
  const initials = user.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const getAvatarColor = () => {
    switch (user.role) {
      case 'admin': return 'var(--red-500)';
      case 'dispatcher': return 'var(--blue-500)';
      case 'driver': return 'var(--green-500)';
      case 'manager': return 'var(--purple-500)';
      default: return 'var(--n-500)';
    }
  };

  return (
    <div className="container" style={{ maxWidth: 680, margin: '0 auto' }}>

      {/* ========== HERO SECTION ========== */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{
          height: 3,
          width: 48,
          background: getAvatarColor(),
          borderRadius: 'var(--r-full)',
          marginBottom: '1.5rem',
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
          <div style={{
            width: 72, height: 72,
            borderRadius: 'var(--r-xl)',
            background: `${getAvatarColor()}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.75rem', fontWeight: 600,
            color: getAvatarColor(),
          }}>
            {initials}
          </div>

          <div style={{ flex: 1 }}>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--tx-1)' }}>
              {user.name}
            </h1>
            <div style={{ fontSize: '0.875rem', color: 'var(--tx-3)', marginBottom: '0.5rem' }}>
              {user.email}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
              <span className={`user-role-badge ${user.role}`}>
                {ROLE_LABELS[user.role] || user.role}
              </span>
              {user.active !== undefined && (
                <span className={user.active ? 'badge badge-green' : 'badge badge-orange'}>
                  {user.active ? 'Активний' : 'Неактивний'}
                </span>
              )}
            </div>
          </div>

          <button onClick={logout} className="btn btn-danger btn-sm">
            Вийти
          </button>
        </div>
      </div>

      {/* ========== ВКЛАДКИ ========== */}
      <div className="tabs" style={{ marginBottom: '1.5rem' }}>
        <button
          className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Профіль
        </button>
        <button
          className={`tab ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          Безпека
        </button>
        {hasTelegram && (
          <button
            className={`tab ${activeTab === 'telegram' ? 'active' : ''}`}
            onClick={() => setActiveTab('telegram')}
          >
            Telegram
          </button>
        )}
      </div>

      {/* ========== ВКЛАДКА: ПРОФІЛЬ ========== */}
      {activeTab === 'profile' && (
        <div>
          <div style={{ marginBottom: '1.5rem' }}>
            <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--tx-2)' }}>
              Інформація про акаунт
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
                <span style={{ width: 120, fontSize: '0.75rem', color: 'var(--tx-3)' }}>ID користувача</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--tx-2)' }}>{user.id}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
                <span style={{ width: 120, fontSize: '0.75rem', color: 'var(--tx-3)' }}>Дата реєстрації</span>
                <span style={{ fontSize: '0.875rem', color: 'var(--tx-1)' }}>
                  {new Date(user.created_at).toLocaleDateString('uk-UA', {
                    day: 'numeric', month: 'long', year: 'numeric',
                  })}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem' }}>
                <span style={{ width: 120, fontSize: '0.75rem', color: 'var(--tx-3)' }}>Останній вхід</span>
                <span style={{ fontSize: '0.875rem', color: 'var(--tx-1)' }}>
                  {user.last_login ? new Date(user.last_login).toLocaleString('uk-UA') : '—'}
                </span>
              </div>
            </div>
          </div>

          {hasTelegram && (
            <div>
              <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '0.75rem', color: 'var(--tx-2)' }}>
                Telegram
              </h3>
              <TelegramSection driverId={user.driver_id} />
            </div>
          )}
        </div>
      )}

      {/* ========== ВКЛАДКА: БЕЗПЕКА ========== */}
      {activeTab === 'security' && (
        <div>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--tx-2)' }}>
            Зміна пароля
          </h3>
          <form onSubmit={handlePasswordChange}>
            <div className="form-group">
              <label>Новий пароль</label>
              <input
                type="password"
                value={password.new}
                onChange={(e) => setPassword({ ...password, new: e.target.value })}
                placeholder="Мінімум 6 символів"
                disabled={saving}
              />
            </div>
            <div className="form-group">
              <label>Підтвердіть пароль</label>
              <input
                type="password"
                value={password.confirm}
                onChange={(e) => setPassword({ ...password, confirm: e.target.value })}
                placeholder="Повторіть пароль"
                disabled={saving}
              />
            </div>
            {message.text && (
              <div className={`status ${message.type}`} style={{ marginBottom: '1rem' }}>
                {message.text}
              </div>
            )}
            <div className="flex gap-3">
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Збереження...' : 'Змінити пароль'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => { setPassword({ new: '', confirm: '' }); setMessage({ text: '', type: '' }); }}
                disabled={saving}
              >
                Очистити
              </button>
            </div>
          </form>

          {hasPermission('can_manage_users') && (
            <div style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--bd-1)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                  <div style={{ fontWeight: 500, color: 'var(--tx-1)', marginBottom: '0.25rem' }}>
                    Керування користувачами
                  </div>
                  <div style={{ fontSize: '0.75rem', color: 'var(--tx-3)' }}>
                    Додавання, редагування, блокування акаунтів
                  </div>
                </div>
                <button
                  className="btn btn-secondary btn-sm"
                  onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'users' }))}
                >
                  Перейти →
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========== ВКЛАДКА: TELEGRAM ========== */}
      {activeTab === 'telegram' && hasTelegram && (
        <div>
          <h3 style={{ fontSize: '0.875rem', fontWeight: 600, marginBottom: '1rem', color: 'var(--tx-2)' }}>
            Telegram-бот
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <div style={{ padding: '0.75rem', background: 'var(--surface-sub)', borderRadius: 'var(--r-lg)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>🔔</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--tx-1)' }}>Сповіщення</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--tx-3)' }}>Нові поїздки</div>
            </div>
            <div style={{ padding: '0.75rem', background: 'var(--surface-sub)', borderRadius: 'var(--r-lg)', textAlign: 'center' }}>
              <div style={{ fontSize: '1.25rem', marginBottom: '0.25rem' }}>📊</div>
              <div style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--tx-1)' }}>Статистика</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--tx-3)' }}>Доходи та маршрути</div>
            </div>
          </div>
          <TelegramSection driverId={user.driver_id} />
        </div>
      )}
    </div>
  );
};

export default Profile;