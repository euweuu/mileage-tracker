import React, { useState, useEffect, useCallback, useRef } from 'react';
import { getUsersList, updateUser, deleteUser, registerUser } from '../services/auth';
import {
  getDriversForSelect,
  getSettings,
  generateTelegramToken,
  getTelegramLinkStatus,
  unlinkTelegram,
} from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';
import Pagination from './Pagination';

const ROLE_LABELS = { admin: 'Адміністратор', dispatcher: 'Диспетчер', driver: 'Водій', manager: 'Менеджер' };
const ROLE_CLASS  = { admin: 'admin', dispatcher: 'dispatcher', driver: 'driver', manager: 'manager' };

// ─── Telegram Link Widget ─────────────────────────────────────────────────────

const TelegramLinkWidget = ({ driverId, botUsername }) => {
  const [status, setStatus] = useState(null); // null | { linked, telegramName, linkedAt }
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(null);
  const [expiresAt, setExpiresAt] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [unlinking, setUnlinking] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const s = await getTelegramLinkStatus(driverId);
      setStatus(s);
      // Clear token if already linked
      if (s?.linked) { setToken(null); setExpiresAt(null); }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [driverId]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh token expiry countdown
  useEffect(() => {
    if (!token) return;
    const interval = setInterval(() => {
      if (expiresAt && new Date() > new Date(expiresAt)) {
        setToken(null);
        setExpiresAt(null);
      }
    }, 30000);
    return () => clearInterval(interval);
  }, [token, expiresAt]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const { token: t, expiresAt: exp } = await generateTelegramToken(driverId);
      setToken(t);
      setExpiresAt(exp);
    } catch (e) {
      alert('Помилка: ' + e.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleUnlink = async () => {
    if (!window.confirm('Відключити Telegram від цього водія?')) return;
    setUnlinking(true);
    try {
      await unlinkTelegram(driverId);
      setStatus(null);
      setToken(null);
    } catch (e) {
      alert('Помилка: ' + e.message);
    } finally {
      setUnlinking(false);
    }
  };

  const handleCopy = () => {
    const link = `https://t.me/${botUsername}?start=${token}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  if (loading) return <span style={{ color: 'var(--tx-4)', fontSize: '0.75rem' }}>…</span>;

  if (status?.linked) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', flexWrap: 'wrap' }}>
        <span
          title={`Підключено: ${status.telegramName || 'ID ' + status.telegramId}\n${new Date(status.linkedAt).toLocaleString('uk-UA')}`}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
            background: 'var(--green-50)', color: 'var(--green-600)',
            border: '1px solid var(--green-100)',
            borderRadius: 'var(--r-full)', padding: '0.15rem 0.5rem',
            fontSize: '0.75rem', fontWeight: 500, cursor: 'default',
          }}
        >
          ✓ {status.telegramName || 'Підключено'}
        </span>
        <button
          onClick={handleUnlink}
          disabled={unlinking}
          title="Відключити Telegram"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--tx-4)', fontSize: '0.75rem', padding: '0.1rem 0.25rem',
            borderRadius: 'var(--r-sm)',
          }}
        >
          ✕
        </button>
      </div>
    );
  }

  if (token) {
    const link = `https://t.me/${botUsername}?start=${token}`;
    const minutesLeft = expiresAt ? Math.max(0, Math.round((new Date(expiresAt) - Date.now()) / 60000)) : 30;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <a
            href={link}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
              background: '#2AABEE', color: '#fff',
              borderRadius: 'var(--r-full)', padding: '0.2rem 0.625rem',
              fontSize: '0.75rem', fontWeight: 600, textDecoration: 'none',
              transition: 'opacity 0.15s',
            }}
            onMouseEnter={e => e.currentTarget.style.opacity = '0.85'}
            onMouseLeave={e => e.currentTarget.style.opacity = '1'}
          >
            ✈ Відкрити в Telegram
          </a>
          <button
            onClick={handleCopy}
            title="Копіювати посилання"
            style={{
              background: 'none', border: '1px solid var(--bd-1)', cursor: 'pointer',
              color: 'var(--tx-3)', fontSize: '0.7rem', padding: '0.2rem 0.4rem',
              borderRadius: 'var(--r-sm)',
            }}
          >
            {copied ? '✓' : '⎘'}
          </button>
        </div>
        <span style={{ fontSize: '0.7rem', color: 'var(--tx-4)' }}>
          Код: <code style={{ letterSpacing: '0.1em', fontWeight: 600 }}>{token}</code>
          {' '}· діє {minutesLeft} хв
        </span>
      </div>
    );
  }

  return (
    <button
      onClick={handleGenerate}
      disabled={generating}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
        background: 'none', border: '1px solid var(--bd-1)',
        borderRadius: 'var(--r-full)', padding: '0.2rem 0.6rem',
        fontSize: '0.75rem', color: 'var(--tx-3)', cursor: 'pointer',
        transition: 'border-color var(--t-base), color var(--t-base)',
      }}
      onMouseEnter={e => { e.currentTarget.style.borderColor = '#2AABEE'; e.currentTarget.style.color = '#2AABEE'; }}
      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--bd-1)'; e.currentTarget.style.color = 'var(--tx-3)'; }}
    >
      {generating ? '…' : '+ Telegram'}
    </button>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [status, setStatus] = useState({ message: '', type: '' });

  // Bot username — read from env (REACT_APP_TELEGRAM_BOT_USERNAME)
  const botUsername = process.env.REACT_APP_TELEGRAM_BOT_USERNAME || 'YourBot';

  // Auto-dismiss success messages after 4 seconds
  useEffect(() => {
    if (status.message && status.type === 'success') {
      const timer = setTimeout(() => setStatus({ message: '', type: '' }), 4000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalUsers, setTotalUsers] = useState(0);

  const { hasPermission, user: currentUser } = useAuth();
  const isSubmittingRef = useRef(false);

  const [newUser, setNewUser] = useState({ email: '', password: '', name: '', role: 'driver', driverId: '' });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getUsersList(currentPage, pageSize);
      if (result.success) {
        setUsers(result.users);
        setTotalUsers(result.total || 0);
      } else {
        setStatus({ message: result.error, type: 'error' });
      }
    } catch (error) {
      setStatus({ message: 'Помилка завантаження', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize]);

  const loadDrivers = useCallback(async () => {
    try {
      const data = await getDriversForSelect();
      setDrivers(data || []);
    } catch (error) {
      console.error('Помилка завантаження водіїв:', error);
    }
  }, []);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await getSettings();
        setPageSize(data.users_page_size || 25);
      } catch (error) {
        console.error('Помилка завантаження налаштувань:', error);
      }
    };
    loadSettings();
  }, []);

  useEffect(() => {
    loadUsers();
    loadDrivers();
  }, [loadUsers, loadDrivers]);

  useEffect(() => { setEditingUser(null); }, [currentPage]);

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (isSubmittingRef.current) return;
    if (!hasPermission('can_manage_users')) { setStatus({ message: 'Недостатньо прав', type: 'error' }); return; }
    if (!newUser.email || !newUser.password || !newUser.name) { setStatus({ message: 'Заповніть всі обов͂язкові поля', type: 'error' }); return; }
    if (newUser.password.length < 6) { setStatus({ message: 'Пароль має містити не менше 6 символів', type: 'error' }); return; }

    isSubmittingRef.current = true;
    try {
      const result = await registerUser(newUser);
      if (result.success) {
        setStatus({ message: 'Користувача додано', type: 'success' });
        setShowAddForm(false);
        setNewUser({ email: '', password: '', name: '', role: 'driver', driverId: '' });
        setCurrentPage(1);
        await loadUsers();
      } else {
        setStatus({ message: result.error, type: 'error' });
      }
    } catch (error) {
      setStatus({ message: 'Помилка: ' + error.message, type: 'error' });
    } finally {
      isSubmittingRef.current = false;
    }
  };

  const handleUpdateUser = async () => {
    if (!hasPermission('can_manage_users')) { setStatus({ message: 'Недостатньо прав', type: 'error' }); return; }
    try {
      const result = await updateUser(editingUser.id, {
        name: editingUser.name,
        role: editingUser.role,
        driverId: editingUser.driverId,
        active: editingUser.active
      });
      if (result.success) {
        setStatus({ message: 'Користувача оновлено', type: 'success' });
        setEditingUser(null);
        await loadUsers();
      } else {
        setStatus({ message: result.error, type: 'error' });
      }
    } catch (error) {
      setStatus({ message: 'Помилка: ' + error.message, type: 'error' });
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!hasPermission('can_manage_users')) { setStatus({ message: 'Недостатньо прав', type: 'error' }); return; }
    if (userId === currentUser?.id) { setStatus({ message: 'Не можна видалити самого себе', type: 'error' }); return; }
    if (!window.confirm('Ви впевнені, що хочете видалити цього користувача?')) return;
    try {
      const result = await deleteUser(userId);
      if (result.success) {
        setStatus({ message: 'Користувача видалено', type: 'success' });
        if (users.length === 1 && currentPage > 1) setCurrentPage(currentPage - 1);
        else await loadUsers();
        setEditingUser(null);
      } else {
        setStatus({ message: result.error, type: 'error' });
      }
    } catch (error) {
      setStatus({ message: 'Помилка: ' + error.message, type: 'error' });
    }
  };

  if (!hasPermission('can_manage_users')) {
    return (
      <div className="container">
        <h2>Доступ заборонено</h2>
        <div className="status warning">У вас немає прав для перегляду цієї сторінки.</div>
      </div>
    );
  }

  if (loading && users.length === 0 && currentPage === 1) {
    return <div className="loading"><div className="loading-spinner" />Завантаження...</div>;
  }

  const totalPages = Math.ceil(totalUsers / pageSize);

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--bd-1)', paddingBottom: '1rem' }}>
        <h2 style={{ margin: 0, border: 'none', padding: 0 }}>Керування користувачами</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-primary btn-sm" onClick={() => setShowAddForm(!showAddForm)}>
            {showAddForm ? '✕ Скасувати' : '+ Додати користувача'}
          </button>
          <button className="btn btn-secondary btn-sm" onClick={loadUsers}>Оновити</button>
        </div>
      </div>

      {status.message && <div className={`status ${status.type}`}>{status.message}</div>}

      {showAddForm && (
        <div className="info-block" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1.25rem' }}>Новий користувач</h3>
          <form onSubmit={handleAddUser}>
            <div className="form-row">
              <div className="form-group">
                <label>Email *</label>
                <input type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} placeholder="user@example.com" required />
              </div>
              <div className="form-group">
                <label>Пароль * (мін. 6 символів)</label>
                <input type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} placeholder="••••••••" minLength="6" required />
              </div>
              <div className="form-group">
                <label>ПІБ *</label>
                <input type="text" value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} placeholder="Іванов Іван Іванович" required />
              </div>
              <div className="form-group">
                <label>Роль</label>
                <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                  <option value="driver">Водій</option>
                  <option value="manager">Менеджер</option>
                  <option value="dispatcher">Диспетчер</option>
                  <option value="admin">Адміністратор</option>
                </select>
              </div>
              {newUser.role === 'driver' && (
                <div className="form-group">
                  <label>Прив'язка до водія</label>
                  <select value={newUser.driverId} onChange={(e) => setNewUser({ ...newUser, driverId: e.target.value })}>
                    <option value="">-- Виберіть водія --</option>
                    {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.875rem' }}>
              <button type="submit" className="btn btn-success">Створити</button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)}>Скасувати</button>
            </div>
          </form>
        </div>
      )}

      {editingUser && (
        <div className="info-block" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1.25rem' }}>Редагування користувача</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Email</label>
              <input type="email" value={editingUser.email} disabled />
            </div>
            <div className="form-group">
              <label>ПІБ</label>
              <input type="text" value={editingUser.name || ''} onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} />
            </div>
            <div className="form-group">
              <label>Роль</label>
              <select value={editingUser.role} onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}>
                <option value="driver">Водій</option>
                <option value="manager">Менеджер</option>
                <option value="dispatcher">Диспетчер</option>
                <option value="admin">Адміністратор</option>
              </select>
            </div>
            {editingUser.role === 'driver' && (
              <div className="form-group">
                <label>Прив'язка до водія</label>
                <select value={editingUser.driverId || ''} onChange={(e) => setEditingUser({ ...editingUser, driverId: e.target.value })}>
                  <option value="">-- Виберіть водія --</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
            )}
            <div className="form-group">
              <label>Статус</label>
              <select value={editingUser.active ? 'true' : 'false'} onChange={(e) => setEditingUser({ ...editingUser, active: e.target.value === 'true' })}>
                <option value="true">Активний</option>
                <option value="false">Неактивний</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.875rem' }}>
            <button className="btn btn-success" onClick={handleUpdateUser}>Зберегти</button>
            <button className="btn btn-secondary" onClick={() => setEditingUser(null)}>Скасувати</button>
            <button className="btn btn-danger" onClick={() => handleDeleteUser(editingUser.id)} disabled={editingUser.id === currentUser?.id}>Видалити</button>
          </div>
        </div>
      )}

      {users.length === 0 ? (
        <div className="no-data">Немає користувачів</div>
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Email</th>
                  <th>ПІБ</th>
                  <th>Роль</th>
                  <th>Водій</th>
                  <th>Telegram</th>
                  <th>Статус</th>
                  <th>Дата</th>
                  <th>Дії</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => {
                  const driver = drivers.find(d => d.id === user.driver_id);
                  return (
                    <tr key={user.id}>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--tx-3)' }}>
                        {user.id.substring(0, 8)}…
                      </td>
                      <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{user.email}</td>
                      <td style={{ fontWeight: 500 }}>{user.name}</td>
                      <td>
                        <span className={`user-role-badge ${ROLE_CLASS[user.role] || ''}`}>
                          {ROLE_LABELS[user.role] || user.role}
                        </span>
                      </td>
                      <td style={{ color: 'var(--tx-2)' }}>{driver?.name || '—'}</td>
                      <td>
                        {driver ? (
                          <TelegramLinkWidget driverId={driver.id} botUsername={botUsername} />
                        ) : (
                          <span style={{ color: 'var(--tx-4)', fontSize: '0.75rem' }}>—</span>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${user.active ? 'badge-green' : 'badge-orange'}`}>
                          {user.active ? 'Активний' : 'Неактивний'}
                        </span>
                      </td>
                      <td style={{ color: 'var(--tx-3)', fontSize: '0.8rem' }}>
                        {new Date(user.created_at).toLocaleDateString('uk-UA')}
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => setEditingUser(user)} disabled={user.id === currentUser?.id}>
                            Ред.
                          </button>
                          {user.id !== currentUser?.id && (
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUser(user.id)}>
                              Вид.
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
            total={totalUsers}
          />
        </>
      )}
    </div>
  );
};

export default UserManagement;
