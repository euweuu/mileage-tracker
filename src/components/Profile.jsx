import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { changePassword } from '../services/auth';
import {
  generateTelegramToken,
  getTelegramLinkStatus,
  unlinkTelegram,
} from '../services/supabase';

const ROLE_LABELS = { admin: 'Адміністратор', dispatcher: 'Диспетчер', driver: 'Водій', manager: 'Менеджер' };
const ROLE_CLASS = { admin: 'admin', dispatcher: 'dispatcher', driver: 'driver', manager: 'manager' };

// ─── Telegram Section ─────────────────────────────────────────────────────────

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
    try { setStatus(await getTelegramLinkStatus(driverId)); }
    catch { /* ignore */ }
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
    setCopied(true); setTimeout(() => setCopied(false), 2000);
  };

  const min = expiresAt ? Math.max(0, Math.round((new Date(expiresAt) - Date.now()) / 60000)) : 30;

  if (loading) return <span style={{ color: 'var(--tx-4)', fontSize: '0.8rem' }}>…</span>;

  // ── Linked ──
  if (status?.linked) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
        background: 'var(--green-50)', color: 'var(--green-600)',
        border: '1px solid var(--green-100)',
        borderRadius: 'var(--r-full)', padding: '0.15rem 0.55rem',
        fontSize: '0.75rem', fontWeight: 500,
      }}>
        ✓&nbsp;{status.telegramName || 'Підключено'}
      </span>
      <a href={`https://t.me/${bot}`} target="_blank" rel="noreferrer"
        style={{ fontSize: '0.8rem', color: '#2AABEE', textDecoration: 'none', fontWeight: 500 }}>
        Відкрити →
      </a>
      <button onClick={unlink} disabled={busy} style={{
        background: 'none', border: 'none', color: 'var(--tx-3)',
        fontSize: '0.78rem', cursor: 'pointer', padding: 0,
        textDecoration: 'underline', textDecorationStyle: 'dashed',
      }}>
        {busy ? '…' : 'відключити'}
      </button>
    </div>
  );

  // ── Token ready ──
  if (token) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <a
          href={`https://t.me/${bot}?start=${token}`}
          target="_blank" rel="noreferrer"
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.3rem',
            background: '#2AABEE', color: '#fff', textDecoration: 'none',
            borderRadius: 'var(--r-md)', padding: '0.3rem 0.75rem',
            fontSize: '0.8rem', fontWeight: 600,
          }}>
          ✈ Відкрити бот
        </a>
        <button onClick={copy} style={{
          background: 'var(--surface-sub)', border: '1px solid var(--bd-1)',
          borderRadius: 'var(--r-sm)', padding: '0.25rem 0.5rem',
          fontSize: '0.72rem', color: 'var(--tx-2)', cursor: 'pointer',
        }}>
          {copied ? '✓ Скопійовано' : '⎘ Посилання'}
        </button>
        <button onClick={() => setToken(null)} style={{
          background: 'none', border: 'none', color: 'var(--tx-3)',
          fontSize: '0.75rem', cursor: 'pointer', padding: '0.25rem',
        }}>✕</button>
      </div>
      <span style={{ fontSize: '0.72rem', color: min <= 5 ? 'var(--red-500)' : 'var(--tx-4)' }}>
        Код: <code style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}>{token}</code>
        &nbsp;· діє {min} хв · натисніть START у боті
      </span>
    </div>
  );

  // ── Not linked ──
  return (
    <button onClick={generate} disabled={busy} className="btn btn-secondary btn-sm"
      style={{ fontSize: '0.8rem' }}>
      {busy ? '…' : '✈ Підключити'}
    </button>
  );
};

// ─── Profile ──────────────────────────────────────────────────────────────────

const Row = ({ label, children }) => (
  <div style={{
    display: 'grid', gridTemplateColumns: '140px 1fr',
    alignItems: 'center', gap: '0.5rem',
    padding: '0.55rem 0', borderBottom: '1px solid var(--bd-1)',
    minHeight: 40,
  }}>
    <span style={{ fontSize: '0.78rem', color: 'var(--tx-3)', fontWeight: 500 }}>{label}</span>
    <span style={{ fontSize: '0.875rem', color: 'var(--tx-1)' }}>{children}</span>
  </div>
);

const Profile = () => {
  const { user, logout, hasPermission } = useAuth();
  const [tab, setTab] = useState('profile');
  const [pwd, setPwd] = useState({ n: '', c: '' });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  useEffect(() => {
    if (msg.text && msg.type === 'success') {
      const t = setTimeout(() => setMsg({ text: '', type: '' }), 3000);
      return () => clearTimeout(t);
    }
  }, [msg]);

  const savePwd = async (e) => {
    e.preventDefault();
    if (!pwd.n || !pwd.c) return setMsg({ text: 'Заповніть всі поля', type: 'error' });
    if (pwd.n !== pwd.c) return setMsg({ text: 'Паролі не співпадають', type: 'error' });
    if (pwd.n.length < 6) return setMsg({ text: 'Мінімум 6 символів', type: 'error' });
    setSaving(true);
    try {
      const r = await changePassword(pwd.n);
      if (r.success) { setMsg({ text: 'Пароль змінено!', type: 'success' }); setPwd({ n: '', c: '' }); }
      else setMsg({ text: r.error || 'Помилка', type: 'error' });
    } catch (e) { setMsg({ text: e.message, type: 'error' }); }
    finally { setSaving(false); }
  };

  if (!user) return null;

  const hasTelegram = !!user.driver_id;

  return (
    <div className="container" style={{ maxWidth: 600 }}>

      {/* ── Avatar card ── */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '1rem',
        paddingBottom: '1.25rem', marginBottom: '1.25rem',
        borderBottom: '1px solid var(--bd-1)',
      }}>
        {/* Avatar */}
        <div style={{
          width: 52, height: 52, borderRadius: 'var(--r-xl)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '1.375rem', fontWeight: 700, flexShrink: 0,
          background: user.role === 'admin' ? 'var(--red-50)'
            : user.role === 'dispatcher' ? 'var(--blue-50)'
              : 'var(--green-50)',
          color: user.role === 'admin' ? 'var(--red-600)'
            : user.role === 'dispatcher' ? 'var(--blue-600)'
              : 'var(--green-600)',
          border: '1px solid var(--bd-1)',
        }}>
          {user.name?.charAt(0).toUpperCase()}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: 600, fontSize: '1rem', color: 'var(--tx-1)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            marginBottom: '0.15rem',
          }}>
            {user.name}
          </div>
          <div style={{
            fontSize: '0.78rem', color: 'var(--tx-3)',
            fontFamily: 'var(--font-mono)',
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            marginBottom: '0.375rem',
          }}>
            {user.email}
          </div>
          <span className={`user-role-badge ${ROLE_CLASS[user.role] || ''}`}>
            {ROLE_LABELS[user.role] || user.role}
          </span>
        </div>

        {/* Logout */}
        <button className="btn btn-danger btn-sm" onClick={logout} style={{ flexShrink: 0 }}>
          Вийти
        </button>
      </div>

      {/* ── Tabs ── */}
      <div className="tabs" style={{ marginBottom: '1.25rem' }}>
        {[
          { id: 'profile', label: 'Профіль' },
          { id: 'security', label: 'Безпека' },
          ...(hasTelegram ? [{ id: 'telegram', label: '✈ Telegram' }] : []),
        ].map(({ id, label }) => (
          <button key={id}
            className={`tab${tab === id ? ' active' : ''}`}
            onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {/* ── Profile tab ── */}
      {tab === 'profile' && (
        <div>
          <Row label="ID">
            <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.72rem', color: 'var(--tx-3)', wordBreak: 'break-all' }}>
              {user.id}
            </code>
          </Row>
          <Row label="Дата реєстрації">
            {new Date(user.created_at).toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}
          </Row>
          <Row label="Статус">
            <span className={`badge ${user.active ? 'badge-green' : 'badge-orange'}`}>
              {user.active ? 'Активний' : 'Неактивний'}
            </span>
          </Row>
          <Row label="Останній вхід">
            <span style={{ fontSize: '0.8rem', color: 'var(--tx-2)' }}>
              {user.last_login ? new Date(user.last_login).toLocaleString('uk-UA') : '—'}
            </span>
          </Row>
          {hasTelegram && (
            <Row label="Telegram">
              <TelegramSection driverId={user.driver_id} />
            </Row>
          )}
        </div>
      )}

      {/* ── Security tab ── */}
      {tab === 'security' && (
        <div>
          <form onSubmit={savePwd} style={{ maxWidth: 340 }}>
            <div className="form-group">
              <label>Новий пароль</label>
              <input type="password" value={pwd.n} minLength={6}
                onChange={e => setPwd({ ...pwd, n: e.target.value })}
                disabled={saving} placeholder="Мінімум 6 символів" />
            </div>
            <div className="form-group">
              <label>Підтвердіть пароль</label>
              <input type="password" value={pwd.c}
                onChange={e => setPwd({ ...pwd, c: e.target.value })}
                disabled={saving} placeholder="Повторіть пароль" />
            </div>
            {msg.text && <div className={`status ${msg.type}`}>{msg.text}</div>}
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Збереження…' : 'Змінити пароль'}
              </button>
              <button type="button" className="btn btn-secondary"
                onClick={() => { setPwd({ n: '', c: '' }); setMsg({ text: '', type: '' }); }}
                disabled={saving}>
                Очистити
              </button>
            </div>
          </form>

          {hasPermission('can_manage_users') && (
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--bd-1)' }}>
              <button className="btn btn-secondary btn-sm"
                onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'users' }))}>
                Керування користувачами →
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Telegram tab ── */}
      {tab === 'telegram' && hasTelegram && (
        <div>
          <p style={{ fontSize: '0.8rem', color: 'var(--tx-3)', margin: '0 0 1rem' }}>
            Підключіть Telegram-бота щоб переглядати поїздки та статистику прямо в месенджері.
          </p>
          <TelegramSection driverId={user.driver_id} />
        </div>
      )}

    </div>
  );
};

export default Profile;
