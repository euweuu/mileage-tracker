import React, { useState, useEffect, useCallback } from 'react';
import { getSettings, updateSettings, getRoles, createRole, updateRole, deleteRole } from '../services/supabase';
import { useAuth } from '../contexts/AuthContext';

// ─── Всі можливі права ───────────────────────────────────────────────────────
const ALL_PERMISSIONS = [
  { key: 'can_view_trips',     group: 'Поїздки',       label: 'Переглядати поїздки' },
  { key: 'can_edit_trips',     group: 'Поїздки',       label: 'Редагувати поїздки' },
  { key: 'can_delete_trips',   group: 'Поїздки',       label: 'Видаляти поїздки' },
  { key: 'can_view_cars',      group: 'Автомобілі',    label: 'Переглядати автомобілі' },
  { key: 'can_edit_cars',      group: 'Автомобілі',    label: 'Редагувати автомобілі' },
  { key: 'can_delete_cars',    group: 'Автомобілі',    label: 'Видаляти автомобілі' },
  { key: 'can_view_drivers',   group: 'Водії',         label: 'Переглядати водіїв' },
  { key: 'can_edit_drivers',   group: 'Водії',         label: 'Редагувати водіїв' },
  { key: 'can_delete_drivers', group: 'Водії',         label: 'Видаляти водіїв' },
  { key: 'can_view_analytics', group: 'Аналітика',     label: 'Переглядати аналітику' },
  { key: 'can_export_data',    group: 'Аналітика',     label: 'Експортувати дані' },
  { key: 'can_manage_users',   group: 'Користувачі',   label: 'Керувати користувачами' },
  { key: 'can_view_delivery',   group: 'Доставки',      label: 'Переглядати дошку доставок' },
  { key: 'can_manage_delivery', group: 'Доставки',      label: 'Створювати та редагувати доставки' },
  { key: 'can_edit_trailers',   group: 'Причепи',       label: 'Редагувати причепи' },
  { key: 'can_delete_trailers', group: 'Причепи',       label: 'Видаляти причепи' },
];

const PERM_GROUPS = [...new Set(ALL_PERMISSIONS.map(p => p.group))];

const BLANK_ROLE = { name: '', description: '', permissions: {} };

// ─── Компонент: одна група прав ──────────────────────────────────────────────
const PermGroup = ({ group, permissions, onChange, disabled }) => {
  const perms = ALL_PERMISSIONS.filter(p => p.group === group);
  const allOn = perms.every(p => permissions[p.key]);

  const toggleAll = () => {
    const next = !allOn;
    const updated = { ...permissions };
    perms.forEach(p => { updated[p.key] = next; });
    onChange(updated);
  };

  return (
    <div style={{
      border: '1px solid var(--bd-1)',
      borderRadius: 'var(--r-lg)',
      overflow: 'hidden',
      marginBottom: '0.625rem',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0.625rem 0.875rem',
        background: 'var(--bg)',
        borderBottom: '1px solid var(--bd-1)',
      }}>
        <span style={{ fontWeight: 600, fontSize: '0.825rem', color: 'var(--tx-2)' }}>{group}</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: '0.775rem', color: 'var(--tx-3)' }}>
          <input type="checkbox" checked={allOn} onChange={toggleAll} disabled={disabled} />
          Всі
        </label>
      </div>
      <div style={{ padding: '0.5rem 0.875rem', display: 'flex', flexDirection: 'column', gap: '0.375rem' }}>
        {perms.map(p => (
          <label key={p.key} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: disabled ? 'not-allowed' : 'pointer', fontSize: '0.875rem', color: 'var(--tx-1)' }}>
            <input
              type="checkbox"
              checked={!!permissions[p.key]}
              disabled={disabled}
              onChange={e => onChange({ ...permissions, [p.key]: e.target.checked })}
            />
            {p.label}
          </label>
        ))}
      </div>
    </div>
  );
};

// ─── Модальне вікно ролі ──────────────────────────────────────────────────────
const RoleModal = ({ role, onSave, onClose, saving }) => {
  const isNew = !role.id;
  const [form, setForm] = useState({
    name: role.name || '',
    description: role.description || '',
    permissions: role.permissions || {},
  });

  const handlePermChange = (updated) => setForm(f => ({ ...f, permissions: updated }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({ ...role, ...form });
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(3px)',
      padding: '1rem',
    }}>
      <div style={{
        background: 'var(--surface)',
        borderRadius: 'var(--r-2xl)',
        boxShadow: 'var(--sh-lg)',
        border: '1px solid var(--bd-1)',
        width: '100%',
        maxWidth: '520px',
        maxHeight: '90dvh',
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--bd-1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ margin: 0, fontSize: '1rem' }}>{isNew ? 'Нова роль' : `Редагувати: ${role.name}`}</h3>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '1.25rem', cursor: 'pointer', color: 'var(--tx-3)', lineHeight: 1 }}>✕</button>
        </div>

        <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
          <div className="form-group">
            <label>Назва ролі *</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="наприклад: менеджер"
              required
              disabled={saving}
            />
          </div>
          <div className="form-group">
            <label>Опис</label>
            <input
              type="text"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Короткий опис ролі"
              disabled={saving}
            />
          </div>

          <div style={{ marginTop: '1rem', marginBottom: '0.625rem' }}>
            <p style={{ margin: '0 0 0.75rem', fontWeight: 600, fontSize: '0.875rem', color: 'var(--tx-1)' }}>Права доступу</p>
            {PERM_GROUPS.map(group => (
              <PermGroup
                key={group}
                group={group}
                permissions={form.permissions}
                onChange={handlePermChange}
                disabled={saving}
              />
            ))}
          </div>
        </form>

        <div style={{ padding: '1rem 1.5rem', borderTop: '1px solid var(--bd-1)', display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>Скасувати</button>
          <button type="submit" className="btn btn-primary" disabled={saving || !form.name.trim()} onClick={handleSubmit}>
            {saving ? 'Збереження...' : isNew ? 'Створити роль' : 'Зберегти зміни'}
          </button>
        </div>
      </div>
    </div>
  );
};

const pageSizeOptions = [5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 250, 300, 400, 500];

// Виносимо за межі Settings щоб уникнути перестворення компонента при кожному рендері
const PageSizeRow = ({ label, description, settingKey, settings, handlePageSizeChange, saving }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
    padding: '0.875rem 1rem', background: 'var(--surface)',
    borderRadius: 'var(--r-lg)', border: '1px solid var(--bd-1)',
    flexWrap: 'wrap', gap: '0.75rem',
  }}>
    <div>
      <div style={{ fontWeight: 500, color: 'var(--tx-1)', marginBottom: '0.2rem', fontSize: '0.9rem' }}>{label}</div>
      <div style={{ fontSize: '0.8rem', color: 'var(--tx-3)' }}>{description}</div>
    </div>
    <select
      value={settings[settingKey]}
      onChange={(e) => handlePageSizeChange(settingKey, e.target.value)}
      disabled={saving}
      style={{
        padding: '0.4rem 0.75rem', border: '1px solid var(--bd-1)',
        borderRadius: 'var(--r-md)', fontSize: '0.875rem',
        fontFamily: 'var(--font-sans)', background: 'var(--surface)',
        color: 'var(--tx-1)', minWidth: '110px', cursor: 'pointer',
      }}
    >
      {pageSizeOptions.map(o => <option key={o} value={o}>{o} записів</option>)}
    </select>
  </div>
);

// ─── Головний компонент Settings ──────────────────────────────────────────────
const Settings = () => {
  const [settings, setSettings] = useState({
    allow_registration: true,
    delivery_board_enabled: true,
    page_size: 25,
    cars_page_size: 25,
    drivers_page_size: 25,
    trips_page_size: 25,
    users_page_size: 25,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState({ message: '', type: '' });
  const [activeTab, setActiveTab] = useState('general');

  const [roles, setRoles] = useState([]);
  const [rolesLoading, setRolesLoading] = useState(false);
  const [modalRole, setModalRole] = useState(null);
  const [modalSaving, setModalSaving] = useState(false);
  const [rolesStatus, setRolesStatus] = useState({ message: '', type: '' });

  const { hasPermission, refreshPermissions, user } = useAuth();

  const loadSettings = async () => {
    setLoading(true);
    try {
      const data = await getSettings();
      setSettings({
        allow_registration: data.allow_registration !== undefined ? data.allow_registration : true,
        delivery_board_enabled: data.delivery_board_enabled !== undefined ? data.delivery_board_enabled : true,
        page_size: data.page_size || 25,
        cars_page_size: data.cars_page_size || data.page_size || 25,
        drivers_page_size: data.drivers_page_size || data.page_size || 25,
        trips_page_size: data.trips_page_size || data.page_size || 25,
        users_page_size: data.users_page_size || data.page_size || 25,
      });
    } catch {
      setStatus({ message: 'Помилка завантаження налаштувань', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const loadRoles = useCallback(async () => {
    setRolesLoading(true);
    try {
      const data = await getRoles();
      setRoles(data || []);
    } catch (err) {
      setRolesStatus({ message: 'Помилка завантаження ролей: ' + err.message, type: 'error' });
    } finally {
      setRolesLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, []);
  useEffect(() => { if (activeTab === 'roles') loadRoles(); }, [activeTab, loadRoles]);

  const handleToggleRegistration = async () => {
    if (!hasPermission('can_manage_users')) { 
      setStatus({ message: 'Недостатньо прав', type: 'error' }); 
      return; 
    }
    setSaving(true);
    try {
      const newValue = !settings.allow_registration;
      const result = await updateSettings({ ...settings, allow_registration: newValue });
      if (result.success) {
        setSettings(result.settings);
        setStatus({ message: newValue ? 'Реєстрацію дозволено' : 'Реєстрацію заборонено', type: 'success' });
      } else {
        setStatus({ message: result.message, type: 'error' });
      }
    } catch (error) {
      setStatus({ message: 'Помилка: ' + error.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleDeliveryBoard = async () => {
    if (!hasPermission('can_manage_users')) {
      setStatus({ message: 'Недостатньо прав', type: 'error' });
      return;
    }
    setSaving(true);
    try {
      const newValue = !settings.delivery_board_enabled;
      const result = await updateSettings({ ...settings, delivery_board_enabled: newValue });
      if (result.success) {
        setSettings(result.settings);
        setStatus({ message: newValue ? 'Дошку доставок увімкнено' : 'Дошку доставок вимкнено', type: 'success' });
      } else {
        setStatus({ message: result.message, type: 'error' });
      }
    } catch (error) {
      setStatus({ message: 'Помилка: ' + error.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handlePageSizeChange = async (key, value) => {
    if (!hasPermission('can_manage_users')) { 
      setStatus({ message: 'Недостатньо прав', type: 'error' }); 
      return; 
    }
    const numValue = parseInt(value);
    if (isNaN(numValue) || numValue < 5 || numValue > 500) { 
      setStatus({ message: 'Значення має бути від 5 до 500', type: 'error' }); 
      return; 
    }
    setSaving(true);
    try {
      const result = await updateSettings({ ...settings, [key]: numValue });
      if (result.success) {
        setSettings(result.settings);
        setStatus({ message: 'Налаштування збережено', type: 'success' });
      } else {
        setStatus({ message: result.message, type: 'error' });
      }
    } catch (error) {
      setStatus({ message: 'Помилка: ' + error.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetToDefault = async () => {
    if (!hasPermission('can_manage_users')) { 
      setStatus({ message: 'Недостатньо прав', type: 'error' }); 
      return; 
    }
    setSaving(true);
    try {
      const defaultSettings = { 
        allow_registration: settings.allow_registration,
        delivery_board_enabled: settings.delivery_board_enabled,
        page_size: 25, 
        cars_page_size: 25, 
        drivers_page_size: 25, 
        trips_page_size: 25, 
        users_page_size: 25 
      };
      const result = await updateSettings(defaultSettings);
      if (result.success) {
        setSettings(result.settings);
        setStatus({ message: 'Налаштування скинуто до стандартних', type: 'success' });
      } else {
        setStatus({ message: result.message, type: 'error' });
      }
    } catch (error) {
      setStatus({ message: 'Помилка: ' + error.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleGlobalPageSizeChange = async (value) => {
    const numValue = parseInt(value);
    if (isNaN(numValue) || numValue < 5 || numValue > 500) { 
      setStatus({ message: 'Значення має бути від 5 до 500', type: 'error' }); 
      return; 
    }
    setSaving(true);
    try {
      const newSettings = { 
        ...settings, 
        page_size: numValue, 
        cars_page_size: numValue, 
        drivers_page_size: numValue, 
        trips_page_size: numValue, 
        users_page_size: numValue 
      };
      const result = await updateSettings(newSettings);
      if (result.success) {
        setSettings(result.settings);
        setStatus({ message: 'Глобальні налаштування збережено', type: 'success' });
      } else {
        setStatus({ message: result.message, type: 'error' });
      }
    } catch (error) {
      setStatus({ message: 'Помилка: ' + error.message, type: 'error' });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveRole = async (roleData) => {
    setModalSaving(true);
    try {
      if (roleData.id) {
        await updateRole(roleData.id, roleData);
        setRolesStatus({ message: `Роль "${roleData.name}" оновлено`, type: 'success' });
      } else {
        await createRole(roleData);
        setRolesStatus({ message: `Роль "${roleData.name}" створено`, type: 'success' });
      }

      // Перевіряємо, чи змінили ми роль поточного користувача
      if (user && user.role === roleData.name) {
        await refreshPermissions();
      } else if (user && roleData.id) {
        const oldRole = roles.find(r => r.id === roleData.id);
        if (oldRole && oldRole.name === user.role) {
          await refreshPermissions();
        }
      }

      setModalRole(null);
      await loadRoles();
    } catch (err) {
      setRolesStatus({ message: 'Помилка: ' + err.message, type: 'error' });
    } finally {
      setModalSaving(false);
    }
  };

  const handleDeleteRole = async (role) => {
    if (user && user.role === role.name) {
      setRolesStatus({ message: 'Неможливо видалити власну роль', type: 'error' });
      return;
    }

    if (!window.confirm(`Видалити роль "${role.name}"? Це може вплинути на користувачів з цією роллю.`)) return;

    try {
      await deleteRole(role.id);
      setRolesStatus({ message: `Роль "${role.name}" видалено`, type: 'success' });
      await loadRoles();
    } catch (err) {
      setRolesStatus({ message: 'Помилка: ' + err.message, type: 'error' });
    }
  };

  const permSummary = (permissions = {}) => {
    const count = Object.values(permissions).filter(Boolean).length;
    const total = ALL_PERMISSIONS.length;
    return `${count} / ${total} прав`;
  };

  if (!hasPermission('can_manage_users')) {
    return (
      <div className="container">
        <h2>Доступ заборонено</h2>
        <div className="status warning">У вас немає прав для перегляду цієї сторінки.</div>
      </div>
    );
  }

  if (loading) return <div className="loading"><div className="loading-spinner" />Завантаження...</div>;

  return (
    <div className="container">
      <h2>Налаштування системи</h2>

      {status.message && <div className={`status ${status.type}`}>{status.message}</div>}
      {rolesStatus.message && <div className={`status ${rolesStatus.type}`}>{rolesStatus.message}</div>}

      <div className="tabs">
        <button className={`tab${activeTab === 'general' ? ' active' : ''}`} onClick={() => setActiveTab('general')}>
          Загальні
        </button>
        <button className={`tab${activeTab === 'pagination' ? ' active' : ''}`} onClick={() => setActiveTab('pagination')}>
          Пагінація
        </button>
        <button className={`tab${activeTab === 'roles' ? ' active' : ''}`} onClick={() => setActiveTab('roles')}>
          Ролі
        </button>
      </div>

      {activeTab === 'general' && (
        <div className="info-block">
          <h3 style={{ marginTop: 0 }}>Реєстрація користувачів</h3>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '1rem', background: 'var(--surface)',
            borderRadius: 'var(--r-lg)', border: '1px solid var(--bd-1)',
            flexWrap: 'wrap', gap: '1rem',
          }}>
            <div>
              <div style={{ fontWeight: 500, color: 'var(--tx-1)', marginBottom: '0.25rem' }}>
                {settings.allow_registration ? 'Реєстрація дозволена' : 'Реєстрація заборонена'}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--tx-3)' }}>
                {settings.allow_registration
                  ? 'Нові користувачі можуть самостійно реєструватися'
                  : 'Тільки адміністратор може додавати користувачів'}
              </div>
            </div>
            <button
              className={`btn ${settings.allow_registration ? 'btn-danger' : 'btn-success'}`}
              onClick={handleToggleRegistration}
              disabled={saving}
            >
              {saving ? 'Збереження...' : settings.allow_registration ? 'Заборонити' : 'Дозволити'}
            </button>
          </div>

          <h3 style={{ marginTop: '1.75rem' }}>Дошка доставок</h3>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '1rem', background: 'var(--surface)',
            borderRadius: 'var(--r-lg)', border: '1px solid var(--bd-1)',
            flexWrap: 'wrap', gap: '1rem',
          }}>
            <div>
              <div style={{ fontWeight: 500, color: 'var(--tx-1)', marginBottom: '0.25rem' }}>
                {settings.delivery_board_enabled ? 'Дошку доставок увімкнено' : 'Дошку доставок вимкнено'}
              </div>
              <div style={{ fontSize: '0.875rem', color: 'var(--tx-3)' }}>
                {settings.delivery_board_enabled
                  ? 'Розділ "Дошка доставок" доступний в меню для відповідних ролей'
                  : 'Розділ "Дошка доставок" прихований для всіх користувачів'}
              </div>
            </div>
            <button
              className={`btn ${settings.delivery_board_enabled ? 'btn-danger' : 'btn-success'}`}
              onClick={handleToggleDeliveryBoard}
              disabled={saving}
            >
              {saving ? 'Збереження...' : settings.delivery_board_enabled ? 'Вимкнути' : 'Увімкнути'}
            </button>
          </div>
        </div>
      )}

      {activeTab === 'pagination' && (
        <div className="info-block">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <h3 style={{ margin: 0 }}>Налаштування пагінації</h3>
            <button className="btn btn-secondary btn-sm" onClick={handleResetToDefault} disabled={saving}>
              ↺ Скинути до стандартних
            </button>
          </div>
          <p style={{ color: 'var(--tx-3)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
            Вкажіть, скільки записів показувати на одній сторінці. Рекомендоване значення: 25–50.
          </p>
          <div style={{ padding: '1rem', background: 'var(--blue-50)', borderRadius: 'var(--r-lg)', border: '1px solid var(--blue-100)', marginBottom: '1.5rem' }}>
            <label style={{ display: 'block', marginBottom: '0.625rem', fontWeight: 500, color: 'var(--blue-600)', fontSize: '0.875rem' }}>
              Глобальний розмір сторінки (для всіх розділів)
            </label>
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={settings.page_size}
                onChange={(e) => handleGlobalPageSizeChange(e.target.value)}
                disabled={saving}
                style={{ padding: '0.4rem 0.75rem', border: '1px solid var(--blue-100)', borderRadius: 'var(--r-md)', fontSize: '0.875rem', fontFamily: 'var(--font-sans)', background: 'var(--surface)', color: 'var(--tx-1)', minWidth: '130px', cursor: 'pointer' }}
              >
                {pageSizeOptions.map(o => <option key={o} value={o}>{o} записів</option>)}
              </select>
              <span style={{ fontSize: '0.8125rem', color: 'var(--tx-3)' }}>
                Застосувати однакове значення для всіх списків
              </span>
            </div>
          </div>
          <div style={{ display: 'grid', gap: '0.75rem' }}>
            <PageSizeRow label="Автомобілі та причепи" description="Кількість записів на сторінці" settingKey="cars_page_size" settings={settings} handlePageSizeChange={handlePageSizeChange} saving={saving} />
            <PageSizeRow label="Водії" description="Кількість водіїв на сторінці" settingKey="drivers_page_size" settings={settings} handlePageSizeChange={handlePageSizeChange} saving={saving} />
            <PageSizeRow label="Поїздки" description="Кількість поїздок на сторінці" settingKey="trips_page_size" settings={settings} handlePageSizeChange={handlePageSizeChange} saving={saving} />
            <PageSizeRow label="Користувачі" description="Кількість користувачів на сторінці" settingKey="users_page_size" settings={settings} handlePageSizeChange={handlePageSizeChange} saving={saving} />
          </div>
          <div className="info-block" style={{ marginTop: '1.25rem', marginBottom: 0 }}>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--tx-3)' }}>
              <strong style={{ color: 'var(--tx-2)' }}>Примітка:</strong> Пагінація з'являється автоматично,
              коли кількість записів перевищує розмір сторінки. Рекомендується 25–50 для оптимальної швидкості.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'roles' && (
        <div className="info-block">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
            <div>
              <h3 style={{ margin: '0 0 0.25rem' }}>Ролі користувачів</h3>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--tx-3)' }}>
                Створюйте ролі та налаштовуйте їх права доступу
              </p>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button className="btn btn-secondary btn-sm" onClick={loadRoles} disabled={rolesLoading}>
                Оновити
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => setModalRole({ ...BLANK_ROLE })}>
                + Нова роль
              </button>
            </div>
          </div>

          {rolesLoading ? (
            <div className="loading" style={{ height: 'auto', padding: '2rem 0' }}>
              <div className="loading-spinner" /> Завантаження ролей...
            </div>
          ) : roles.length === 0 ? (
            <div className="no-data">
              <p>Ролей ще немає</p>
              <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setModalRole({ ...BLANK_ROLE })}>
                + Створити першу роль
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gap: '0.75rem' }}>
              {roles.map(role => {
                const isCurrentUserRole = user && user.role === role.name;
                
                return (
                  <div key={role.id} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '0.875rem 1rem', background: 'var(--surface)',
                    borderRadius: 'var(--r-lg)', border: '1px solid var(--bd-1)',
                    flexWrap: 'wrap', gap: '0.75rem',
                    ...(isCurrentUserRole ? { borderColor: 'var(--blue-300)', background: 'var(--blue-50)' } : {})
                  }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', marginBottom: '0.25rem' }}>
                        <span style={{ fontWeight: 600, fontSize: '0.9rem', color: 'var(--tx-1)' }}>{role.name}</span>
                        <span style={{
                          fontSize: '0.7rem', fontFamily: 'var(--font-mono)',
                          padding: '0.15rem 0.5rem', borderRadius: '999px',
                          background: 'var(--blue-50)', color: 'var(--blue-600)',
                          border: '1px solid var(--blue-100)', whiteSpace: 'nowrap',
                        }}>
                          {permSummary(role.permissions)}
                        </span>
                        {isCurrentUserRole && (
                          <span style={{
                            fontSize: '0.7rem', fontFamily: 'var(--font-mono)',
                            padding: '0.15rem 0.5rem', borderRadius: '999px',
                            background: 'var(--green-50)', color: 'var(--green-600)',
                            border: '1px solid var(--green-100)', whiteSpace: 'nowrap',
                          }}>
                            Ваша роль
                          </span>
                        )}
                      </div>
                      {role.description && (
                        <div style={{ fontSize: '0.8rem', color: 'var(--tx-3)' }}>{role.description}</div>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
                      <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => setModalRole(role)}
                      >
                        Редагувати
                      </button>
                      <button
                        className="btn btn-danger btn-sm"
                        onClick={() => handleDeleteRole(role)}
                        disabled={isCurrentUserRole}
                        title={isCurrentUserRole ? 'Не можна видалити власну роль' : ''}
                      >
                        Видалити
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="info-block" style={{ marginTop: '1.25rem', marginBottom: 0 }}>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--tx-3)' }}>
              <strong style={{ color: 'var(--tx-2)' }}>Примітка:</strong> Після зміни прав вашої ролі, 
              зміни застосуються негайно. Іншим користувачам потрібно перезайти в систему.
            </p>
          </div>
        </div>
      )}

      {modalRole !== null && (
        <RoleModal
          role={modalRole}
          onSave={handleSaveRole}
          onClose={() => setModalRole(null)}
          saving={modalSaving}
        />
      )}
    </div>
  );
};

export default Settings;