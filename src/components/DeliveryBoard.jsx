import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import {
  getDeliveryTasks,
  addDeliveryTask,
  updateDeliveryTask,
  deleteDeliveryTask,
  getDriversForSelect,
  getCarsForSelect,
} from '../services/supabase';
import { getAllUsers } from '../services/auth';

const PRIORITIES = {
  urgent: { label: 'Терміново', cls: 'badge-red' },
  high: { label: 'Високий', cls: 'badge-orange' },
  medium: { label: 'Середній', cls: 'badge-blue' },
  low: { label: 'Низький', cls: 'badge-green' },
};

const COLUMNS = [
  { id: 'new', label: 'Нові задачі', accent: 'var(--blue-600)', bg: 'var(--blue-50)', border: 'var(--blue-100)' },
  { id: 'planned', label: 'Заплановано', accent: 'var(--n-500)', bg: 'var(--n-50)', border: 'var(--bd-1)' },
  { id: 'in_transit', label: 'В дорозі', accent: 'var(--green-600)', bg: 'var(--green-50)', border: 'var(--green-100)' },
  { id: 'done', label: 'Доставлено', accent: 'var(--n-300)', bg: 'var(--n-50)', border: 'var(--bd-1)' },
];

const BLANK_TASK = {
  title: '', city: '', weight: '', priority: 'medium', notes: '', delivery_date: '', col: 'new',
};

const fmtDate = (iso) => {
  if (!iso) return '';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return String(iso);
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}`;
  } catch {
    return String(iso);
  }
};

const getInitials = (name) => {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
};

const AVATAR_PALETTE = ['#3B82F6', '#F59E0B', '#10B981', '#8B5CF6', '#EF4444', '#06B6D4', '#EC4899', '#F97316'];

const avatarColor = (str) => {
  if (!str) return '#999';
  let h = 0;
  for (let i = 0; i < str.length; i++) h = str.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_PALETTE[Math.abs(h) % AVATAR_PALETTE.length];
};

const Avatar = ({ name, size = 24 }) => (
  <div
    title={name}
    style={{
      width: size, height: size, borderRadius: '50%', background: avatarColor(name), color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: size * 0.33,
      fontWeight: 700, flexShrink: 0,
    }}
  >
    {getInitials(name)}
  </div>
);

const TaskCard = ({ task, onClick }) => {
  const p = PRIORITIES[task.priority] || PRIORITIES.medium;

  return (
    <div
      onClick={() => onClick(task)}
      style={{
        background: 'var(--surface)', border: '1px solid var(--bd-1)', borderRadius: 'var(--r-xl)',
        padding: '0.875rem 1rem', marginBottom: '0.5rem', cursor: 'pointer',
        transition: 'border-color var(--t-base), box-shadow var(--t-base), transform var(--t-base)',
        position: 'relative', overflow: 'hidden',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.borderColor = 'var(--blue-200)';
        e.currentTarget.style.boxShadow = 'var(--sh-md)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.borderColor = 'var(--bd-1)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, height: 2,
        background: task.priority === 'urgent' ? 'var(--red-500)' :
          task.priority === 'high' ? '#F59E0B' :
            task.priority === 'medium' ? 'var(--blue-500)' : 'var(--green-500)',
      }} />
      <p style={{
        margin: '0.25rem 0 0.5rem', fontSize: '0.875rem', fontWeight: 500,
        color: 'var(--tx-1)', lineHeight: 1.4,
      }}>
        {task.title}
      </p>
      <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
        <span className={`badge ${p.cls}`}>{p.label}</span>
        {task.city && <span className="badge badge-blue">{task.city}</span>}
      </div>
      {task.weight && (
        <div style={{ fontSize: '0.75rem', color: 'var(--tx-3)', marginBottom: '0.5rem' }}>
          Вага: <strong style={{ color: 'var(--tx-2)' }}>{task.weight}</strong>
        </div>
      )}

      {task.notes && (
        <div style={{
          fontSize: '0.75rem', color: 'var(--tx-3)', background: 'var(--surface-sub)',
          borderRadius: 'var(--r-md)', padding: '0.25rem 0.5rem', marginBottom: '0.5rem',
          fontStyle: 'italic',
        }}>
          {task.notes}
        </div>
      )}

      {(task.assigned_driver || task.assigned_car || task.assigned_dispatcher) && (
        <div style={{
          marginBottom: '0.5rem', padding: '0.375rem 0.5rem', background: 'var(--surface-sub)',
          borderRadius: 'var(--r-md)', fontSize: '0.75rem', color: 'var(--tx-2)',
        }}>
          {task.assigned_driver && <div>{task.assigned_driver.name}</div>}
          {task.assigned_car && (
            <div style={{ color: 'var(--tx-3)' }}>
              {task.assigned_car.brand} {task.assigned_car.model} · {task.assigned_car.plate}
            </div>
          )}
          {task.assigned_dispatcher && (
            <div style={{ color: 'var(--tx-3)' }}>Дисп.: {task.assigned_dispatcher.name}</div>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          {task.created_by_user && (
            <>
              <span style={{ fontSize: '0.6875rem', color: 'var(--tx-3)' }}>Мен.</span>
              <Avatar name={task.created_by_user.name} />
            </>
          )}
        </div>
        {(task.planned_date || task.delivery_date) && (
          <span style={{
            fontSize: '0.6875rem', fontFamily: 'var(--font-mono)', color: 'var(--blue-600)',
            fontWeight: 600,
          }}>
            {fmtDate(task.planned_date || task.delivery_date)}
          </span>
        )}
      </div>
    </div>
  );
};

const ManagerModal = ({ task, onSave, onClose, onDelete, isNew }) => {
  const [form, setForm] = useState({
    title: task?.title || '',
    city: task?.city || '',
    weight: task?.weight || '',
    priority: task?.priority || 'medium',
    notes: task?.notes || '',
    delivery_date: (() => {
      if (!task?.delivery_date) return '';
      try {
        const d = new Date(task.delivery_date);
        return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
      } catch { return ''; }
    })(),
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const isReadOnly = !isNew && task?.col !== 'new';

  const handleSave = async () => {
    if (!form.title.trim() || isReadOnly) return;
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Видалити цю задачу?')) return;
    setSaving(true);
    try {
      await onDelete();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '1rem',
    }}>
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--r-2xl)', boxShadow: 'var(--sh-lg)',
        border: '1px solid var(--bd-1)', width: '100%', maxWidth: '460px',
        maxHeight: '90dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        transition: 'background-color var(--t-slow)',
      }}>
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--bd-1)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center'
        }}>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: 'var(--tx-1)' }}>
            {isNew ? '+ Нова задача' : 'Задача'}
          </h3>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx-3)',
            fontSize: '1.125rem', padding: '0.25rem'
          }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
          {isReadOnly && (
            <div className="info-block" style={{ marginBottom: '1rem' }}>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--tx-2)' }}>
                Задача вже у статусі <strong>{COLUMNS.find(c => c.id === task.col)?.label}</strong>
                і передана диспетчеру для планування. Редагування недоступне.
              </p>
            </div>
          )}

          <div className="form-group">
            <label>Назва / опис доставки *</label>
            <textarea
              value={form.title}
              onChange={e => set('title', e.target.value)}
              rows={2}
              placeholder="Вантаж, адреса доставки..."
              style={{ resize: 'none' }}
              disabled={isReadOnly}
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Місто</label>
              <input
                value={form.city}
                onChange={e => set('city', e.target.value)}
                placeholder="Миколаїв"
                disabled={isReadOnly}
              />
            </div>
            <div className="form-group">
              <label>Вага / об'єм</label>
              <input
                value={form.weight}
                onChange={e => set('weight', e.target.value)}
                placeholder="100 кг"
                disabled={isReadOnly}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Пріоритет</label>
              <select
                value={form.priority}
                onChange={e => set('priority', e.target.value)}
                disabled={isReadOnly}
              >
                {Object.entries(PRIORITIES).map(([k, v]) =>
                  <option key={k} value={k}>{v.label}</option>
                )}
              </select>
            </div>
            <div className="form-group">
              <label>Бажана дата доставки</label>
              <input
                type="date"
                value={form.delivery_date}
                onChange={e => set('delivery_date', e.target.value)}
                disabled={isReadOnly}
              />
            </div>
          </div>

          <div className="form-group">
            <label>Примітки</label>
            <input
              value={form.notes}
              onChange={e => set('notes', e.target.value)}
              placeholder="Крихкий вантаж, температурний режим..."
              disabled={isReadOnly}
            />
          </div>
        </div>

        <div style={{
          padding: '1rem 1.5rem', borderTop: '1px solid var(--bd-1)',
          display: 'flex', justifyContent: 'flex-end', gap: '0.5rem'
        }}>
          {!isNew && !isReadOnly && (
            <button
              className="btn btn-danger btn-sm"
              onClick={handleDelete}
              disabled={saving}
            >
              Видалити
            </button>
          )}
          <button
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            disabled={saving}
          >
            {isReadOnly ? 'Закрити' : 'Скасувати'}
          </button>
          {!isReadOnly && (
            <button
              className="btn btn-primary btn-sm"
              disabled={!form.title.trim() || saving}
              onClick={handleSave}
            >
              {saving ? 'Збереження...' : isNew ? 'Створити' : 'Зберегти'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const PlanModal = ({ task, drivers, cars, dispatchers, currentUser, onSave, onClose, onStatusChange }) => {
  const [form, setForm] = useState({
    dispatcher_id: task.dispatcher_id || currentUser?.id || '',
    driver_id: task.driver_id || '',
    car_id: task.car_id || '',
    planned_date: (() => {
      const raw = task.planned_date || task.delivery_date;
      if (!raw) return '';
      try {
        const d = new Date(raw);
        return isNaN(d.getTime()) ? '' : d.toISOString().split('T')[0];
      } catch { return ''; }
    })(),
    col: task.col === 'new' ? 'planned' : task.col,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (newCol) => {
    setSaving(true);
    try {
      await onStatusChange(newCol);
    } finally {
      setSaving(false);
    }
  };

  const NEXT = { new: 'planned', planned: 'in_transit', in_transit: 'done' };
  const NEXT_LABEL = { new: '→ Запланувати', planned: '→ Відправити в дорогу', in_transit: '→ Доставлено' };
  const nextCol = NEXT[task.col];

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.45)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', padding: '1rem',
    }}>
      <div style={{
        background: 'var(--surface)', borderRadius: 'var(--r-2xl)', boxShadow: 'var(--sh-lg)',
        border: '1px solid var(--bd-1)', width: '100%', maxWidth: '520px',
        maxHeight: '90dvh', display: 'flex', flexDirection: 'column', overflow: 'hidden',
        transition: 'background-color var(--t-slow)',
      }}>
        <div style={{
          padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--bd-1)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
        }}>
          <div>
            <h3 style={{ margin: '0 0 0.25rem', fontSize: '1rem', fontWeight: 600, color: 'var(--tx-1)' }}>
              Планування доставки
            </h3>
            <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--tx-3)', maxWidth: '360px' }}>
              {task.title}
            </p>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', cursor: 'pointer', color: 'var(--tx-3)',
            fontSize: '1.125rem', padding: '0.25rem'
          }}>✕</button>
        </div>

        <div style={{
          padding: '0.75rem 1.5rem', background: 'var(--surface-sub)',
          borderBottom: '1px solid var(--bd-1)', display: 'flex', gap: '0.875rem',
          flexWrap: 'wrap', alignItems: 'center'
        }}>
          {task.city && <span style={{ fontSize: '0.8125rem', color: 'var(--tx-2)' }}> {task.city}</span>}
          {task.weight && <span style={{ fontSize: '0.8125rem', color: 'var(--tx-2)' }}> {task.weight}</span>}
          {task.delivery_date && (
            <span style={{ fontSize: '0.8125rem', color: 'var(--tx-2)' }}>
              Бажана: {fmtDate(task.delivery_date)}
            </span>
          )}
          <span className={`badge ${PRIORITIES[task.priority]?.cls || ''}`}>
            {PRIORITIES[task.priority]?.label}
          </span>
          {task.created_by_user && (
            <span style={{
              fontSize: '0.8125rem', color: 'var(--tx-3)', display: 'flex',
              alignItems: 'center', gap: '0.375rem'
            }}>
              <Avatar name={task.created_by_user.name} size={18} />
              {task.created_by_user.name}
            </span>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
          <div className="form-row">
            <div className="form-group">
              <label>Відповідальний диспетчер</label>
              <select value={form.dispatcher_id} onChange={e => set('dispatcher_id', e.target.value)}>
                <option value="">— не обрано</option>
                {dispatchers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Дата доставки</label>
              <input type="date" value={form.planned_date} onChange={e => set('planned_date', e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label>Водій</label>
            <select value={form.driver_id} onChange={e => set('driver_id', e.target.value)}>
              <option value="">— не обрано</option>
              {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Автомобіль</label>
            <select value={form.car_id} onChange={e => set('car_id', e.target.value)}>
              <option value="">— не обрано</option>
              {cars.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label>Статус</label>
            <select value={form.col} onChange={e => set('col', e.target.value)}>
              {COLUMNS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>

          {task.notes && (
            <div className="info-block">
              <p style={{ margin: 0, fontSize: '0.8125rem', color: 'var(--tx-2)', fontStyle: 'italic' }}>
                Примітка менеджера: {task.notes}
              </p>
            </div>
          )}
        </div>

        <div style={{
          padding: '1rem 1.5rem', borderTop: '1px solid var(--bd-1)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          gap: '0.5rem', flexWrap: 'wrap'
        }}>
          {nextCol && (
            <button
              className="btn btn-success btn-sm"
              disabled={saving}
              onClick={() => handleStatus(nextCol)}
            >
              {NEXT_LABEL[task.col]}
            </button>
          )}
          <div style={{ display: 'flex', gap: '0.5rem', marginLeft: 'auto' }}>
            <button className="btn btn-secondary btn-sm" onClick={onClose} disabled={saving}>
              Скасувати
            </button>
            <button className="btn btn-primary btn-sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Збереження...' : 'Зберегти'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DeliveryBoard = () => {
  const { hasPermission, user } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [boardStatus, setBoardStatus] = useState({ message: '', type: '' });
  const [drivers, setDrivers] = useState([]);
  const [cars, setCars] = useState([]);
  const [dispatchers, setDispatchers] = useState([]);
  const [modal, setModal] = useState(null);
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterCol, setFilterCol] = useState('all');
  const [search, setSearch] = useState('');

  const isManager = user?.role === 'manager';
  const isDispatcher = hasPermission('can_manage_delivery') && !isManager;

  const load = useCallback(async () => {
    setLoading(true);
    setBoardStatus({ message: '', type: '' });
    try {
      const [t, d, c] = await Promise.all([
        getDeliveryTasks(),
        getDriversForSelect(),
        getCarsForSelect(),
      ]);
      setTasks(t);
      setDrivers(d);
      setCars(c);

      // Завантаження диспетчерів опціонально (може бути обмежено RLS)
      try {
        const u = await getAllUsers();
        const disps = (u.users || []).filter(usr => ['dispatcher', 'admin'].includes(usr.role));
        setDispatchers(disps);
      } catch {
        // Мовчки ігноруємо — диспетчери не критичні для менеджера
        setDispatchers([]);
      }
    } catch (e) {
      setBoardStatus({ message: e.message || 'Помилка завантаження', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const openCard = (task) => {
    if (isManager) {
      if (task.created_by === user.id || task.col === 'new') {
        setModal({ type: 'manager', task, isNew: false });
      }
    } else if (isDispatcher) {
      setModal({ type: 'plan', task });
    }
  };

  const handleManagerSave = async (formData) => {
    try {
      if (modal.isNew) {
        await addDeliveryTask({ ...formData, created_by: user.id });
      } else {
        await updateDeliveryTask(modal.task.id, formData);
      }
      setModal(null);
      await load();
    } catch (e) {
      setBoardStatus({ message: 'Помилка: ' + e.message, type: 'error' });
    }
  };

  const handleManagerDelete = async () => {
    try {
      await deleteDeliveryTask(modal.task.id);
      setModal(null);
      await load();
    } catch (e) {
      setBoardStatus({ message: 'Помилка: ' + e.message, type: 'error' });
    }
  };

  const handlePlanSave = async (formData) => {
    try {
      await updateDeliveryTask(modal.task.id, {
        dispatcher_id: formData.dispatcher_id || null,
        driver_id: formData.driver_id || null,
        car_id: formData.car_id || null,
        planned_date: formData.planned_date || null,
        col: formData.col,
      });
      setModal(null);
      await load();
    } catch (e) {
      setBoardStatus({ message: 'Помилка: ' + e.message, type: 'error' });
    }
  };

  const handleStatusChange = async (newCol) => {
    try {
      await updateDeliveryTask(modal.task.id, { col: newCol });
      setModal(null);
      await load();
    } catch (e) {
      setBoardStatus({ message: 'Помилка: ' + e.message, type: 'error' });
    }
  };

  const filtered = useMemo(() => tasks.filter(t => {
    if (filterPriority !== 'all' && t.priority !== filterPriority) return false;
    if (filterCol !== 'all' && t.col !== filterCol) return false;
    if (search) {
      const q = search.toLowerCase();
      if (!t.title?.toLowerCase().includes(q) && !(t.city || '').toLowerCase().includes(q)) return false;
    }
    return true;
  }), [tasks, filterPriority, filterCol, search]);

  if (loading) return <div className="loading"><div className="loading-spinner" />Завантаження...</div>;

  return (
    <div className="container">
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
        marginBottom: '1.5rem', borderBottom: '1px solid var(--bd-1)', paddingBottom: '1rem',
        flexWrap: 'wrap', gap: '0.75rem',
      }}>
        <div>
          <h2 style={{ margin: 0, border: 'none', padding: 0 }}>Дошка доставок</h2>
          <p style={{ margin: '0.25rem 0 0', fontSize: '0.8125rem', color: 'var(--tx-3)' }}>
            {isManager
              ? 'Ваша роль — менеджер. Створюйте задачі, диспетчер призначить водія та авто.'
              : 'Клікніть на задачу, щоб запланувати або змінити статус доставки.'}
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Пошук..."
            style={{
              padding: '0.4rem 0.75rem', border: '1px solid var(--bd-1)',
              borderRadius: 'var(--r-md)', fontSize: '0.8125rem',
              background: 'var(--surface)', color: 'var(--tx-1)', width: 150
            }}
          />

          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            style={{
              padding: '0.4rem 0.75rem', border: '1px solid var(--bd-1)',
              borderRadius: 'var(--r-md)', fontSize: '0.8125rem',
              background: 'var(--surface)', color: 'var(--tx-1)', cursor: 'pointer'
            }}
          >
            <option value="all">Всі пріоритети</option>
            {Object.entries(PRIORITIES).map(([k, v]) =>
              <option key={k} value={k}>{v.label}</option>
            )}
          </select>

          <button className="btn btn-secondary btn-sm" onClick={load} title="Оновити">
            ↻
          </button>

          {isManager && (
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setModal({ type: 'manager', task: { ...BLANK_TASK }, isNew: true })}
            >
              + Нова задача
            </button>
          )}
        </div>
      </div>

      {boardStatus.message && (
        <div className={`status ${boardStatus.type}`} style={{ marginBottom: '1rem' }}>
          {boardStatus.message}
        </div>
      )}

      <div style={{
        display: 'flex', gap: '0.625rem', marginBottom: '1.25rem',
        flexWrap: 'wrap', alignItems: 'center'
      }}>
        {COLUMNS.map(col => {
          const count = filtered.filter(t => t.col === col.id).length;
          const isActive = filterCol === col.id;
          return (
            <div
              key={col.id}
              onClick={() => setFilterCol(f => f === col.id ? 'all' : col.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                padding: '0.3rem 0.75rem', borderRadius: 'var(--r-full)',
                background: col.bg, border: `1.5px solid ${isActive ? col.accent : col.border}`,
                fontSize: '0.8rem', cursor: 'pointer', transition: 'border-color var(--t-base)',
              }}
            >
              <span style={{ color: col.accent, fontWeight: 500 }}>{col.label}</span>
              <span style={{
                background: col.accent, color: '#fff', borderRadius: 'var(--r-full)',
                width: 20, height: 20, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 700,
              }}>
                {count}
              </span>
            </div>
          );
        })}

        <span style={{
          marginLeft: 'auto', fontSize: '0.8125rem', color: 'var(--tx-3)',
          display: 'flex', alignItems: 'center'
        }}>
          Всього: <strong style={{ color: 'var(--tx-1)', marginLeft: '0.3rem' }}>{filtered.length}</strong>
        </span>
      </div>

      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem',
        alignItems: 'start'
      }}>
        {COLUMNS.map(col => {
          const colTasks = filtered.filter(t => t.col === col.id);
          return (
            <div key={col.id}>
              <div style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '0.625rem 0.875rem', borderRadius: 'var(--r-lg)',
                background: col.bg, border: `1px solid ${col.border}`, marginBottom: '0.75rem',
              }}>
                <span style={{ fontWeight: 600, fontSize: '0.825rem', color: col.accent }}>
                  {col.label}
                </span>
                <span style={{
                  background: col.accent, color: '#fff', borderRadius: 'var(--r-full)',
                  width: 22, height: 22, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '0.6875rem', fontWeight: 700,
                }}>
                  {colTasks.length}
                </span>
              </div>

              {colTasks.length === 0 ? (
                <div style={{
                  textAlign: 'center', padding: '2rem 1rem', color: 'var(--tx-4)',
                  fontSize: '0.8125rem', border: '1px dashed var(--bd-1)',
                  borderRadius: 'var(--r-xl)', fontStyle: 'italic',
                }}>
                  Немає задач
                </div>
              ) : (
                colTasks.map(task => (
                  <TaskCard key={task.id} task={task} onClick={openCard} />
                ))
              )}

              {isManager && col.id === 'new' && (
                <button
                  onClick={() => setModal({ type: 'manager', task: { ...BLANK_TASK }, isNew: true })}
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', marginTop: '0.5rem', borderStyle: 'dashed' }}
                >
                  + Додати
                </button>
              )}
            </div>
          );
        })}
      </div>

      {modal?.type === 'manager' && (
        <ManagerModal
          task={modal.task}
          isNew={modal.isNew}
          onSave={handleManagerSave}
          onClose={() => setModal(null)}
          onDelete={handleManagerDelete}
        />
      )}

      {modal?.type === 'plan' && (
        <PlanModal
          task={modal.task}
          drivers={drivers}
          cars={cars}
          dispatchers={dispatchers}
          currentUser={user}
          onSave={handlePlanSave}
          onClose={() => setModal(null)}
          onStatusChange={handleStatusChange}
        />
      )}
    </div>
  );
};

export default DeliveryBoard;