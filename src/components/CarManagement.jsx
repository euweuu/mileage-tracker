import React, { useState, useEffect, useCallback } from 'react';
import {
  getCarsList, addCar, updateCar, deleteCar, updateCarMileage,
  getTrailersList, addTrailer, updateTrailer, deleteTrailer,
  getSettings,
} from '../services/supabase';
import { safeNumber } from '../utils/safeHelpers';
import { useAuth } from '../contexts/AuthContext';
import Pagination from './Pagination';

/* ════════════════════════════════════════════════════════════
   CAR MODAL
════════════════════════════════════════════════════════════ */
const CAR_BLANK = {
  brand: '', model: '', licensePlate: '',
  year: new Date().getFullYear().toString(),
  initialMileage: '', fuelType: 'Бензин', tariff: '',
  active: true,
};

const CarModal = ({ show, onClose, onSubmit, car, loading }) => {
  const [form,   setForm]   = useState(CAR_BLANK);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (show) {
      setErrors({});
      setForm(car ? {
        brand: car.brand || '',
        model: car.model || '',
        licensePlate: car.plate || '',
        year: car.year?.toString() || new Date().getFullYear().toString(),
        initialMileage: car.initial_mileage?.toString() || '',
        fuelType: car.fuel_type || 'Бензин',
        tariff: car.tariff?.toString() || '',
        active: car.active !== undefined ? car.active : true,
      } : CAR_BLANK);
    }
  }, [show, car]);

  const change = (e) => {
    const { id, value } = e.target;
    const numericDecimal = ['tariff', 'initialMileage'];
    const numericInteger = ['year'];
    setForm(prev => ({
      ...prev,
      [id]: numericDecimal.includes(id)
        ? value.replace(/[^\d.,]/g, '').replace(/,/g, '.')
        : numericInteger.includes(id)
          ? value.replace(/[^\d]/g, '')
          : value,
    }));
    if (errors[id]) setErrors(prev => ({ ...prev, [id]: '' }));
  };

  const changePlate = (e) =>
    setForm(prev => ({ ...prev, licensePlate: e.target.value.toUpperCase().replace(/[^А-ЯA-Z0-9]/g, '').slice(0, 8) }));

  const validate = () => {
    const { brand, model, licensePlate, initialMileage, tariff, year } = form;
    const e = {};
    if (!brand.trim())        e.brand         = 'Введіть марку';
    if (!model.trim())        e.model         = 'Введіть модель';
    if (!licensePlate.trim()) e.licensePlate  = 'Введіть номер';
    if (!initialMileage)      e.initialMileage = 'Введіть пробіг';
    if (!tariff)              e.tariff         = 'Введіть тариф';
    const curY = new Date().getFullYear();
    const yNum = parseFloat(year);
    if (isNaN(yNum) || yNum < 1900 || yNum > curY + 1)
      e.year = `Рік від 1900 до ${curY + 1}`;
    if (isNaN(parseFloat(initialMileage)) || parseFloat(initialMileage) < 0)
      e.initialMileage = 'Пробіг — число ≥ 0';
    if (isNaN(parseFloat(tariff)) || parseFloat(tariff) <= 0)
      e.tariff = 'Тариф має бути > 0';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    const ok = await onSubmit({
      ...form,
      initialMileage: parseFloat(form.initialMileage),
      tariff:         parseFloat(form.tariff),
      year:           parseInt(form.year),
      id:             car?.id,
    });
    if (ok) { onClose(); }
  };

  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{car ? 'Редагувати автомобіль' : 'Додати автомобіль'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={submit}>
          <div className="modal-body" style={{ display: 'grid', gap: '0.75rem' }}>
            <div className="form-row">
              <div className="form-group">
                <label>Марка *</label>
                <input id="brand" value={form.brand} onChange={change} placeholder="Toyota" disabled={loading} />
                {errors.brand && <div className="form-error">{errors.brand}</div>}
              </div>
              <div className="form-group">
                <label>Модель *</label>
                <input id="model" value={form.model} onChange={change} placeholder="Camry" disabled={loading} />
                {errors.model && <div className="form-error">{errors.model}</div>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Номер *</label>
                <input
                  id="licensePlate" value={form.licensePlate}
                  onChange={changePlate} placeholder="АА1234ВЕ"
                  disabled={loading}
                  style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}
                />
                {errors.licensePlate && <div className="form-error">{errors.licensePlate}</div>}
              </div>
              <div className="form-group">
                <label>Рік</label>
                <input id="year" value={form.year} onChange={change} placeholder="2024" disabled={loading} />
                {errors.year && <div className="form-error">{errors.year}</div>}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Пробіг (км) *</label>
                <input id="initialMileage" value={form.initialMileage} onChange={change} placeholder="0" disabled={loading} />
                {errors.initialMileage && <div className="form-error">{errors.initialMileage}</div>}
              </div>
              <div className="form-group">
                <label>Тариф (грн/км) *</label>
                <input id="tariff" value={form.tariff} onChange={change} placeholder="12.50" disabled={loading} />
                {errors.tariff && <div className="form-error">{errors.tariff}</div>}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Пальне</label>
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginTop: '0.375rem' }}>
                {['Бензин', 'Дизель', 'Газ', 'Електро'].map(t => (
                  <label key={t} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem', cursor: 'pointer', fontSize: '0.875rem', color: 'var(--tx-2)' }}>
                    <input
                      type="radio" name="fuelType" value={t}
                      checked={form.fuelType === t}
                      onChange={() => setForm(prev => ({ ...prev, fuelType: t }))}
                      disabled={loading}
                    />
                    {t}
                  </label>
                ))}
              </div>
            </div>

            {car && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Статус</label>
                <select
                  value={form.active ? 'true' : 'false'}
                  onChange={e => setForm(prev => ({ ...prev, active: e.target.value === 'true' }))}
                  disabled={loading}
                >
                  <option value="true">Активний</option>
                  <option value="false">Неактивний</option>
                </select>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Скасувати</button>
            <button type="submit"  className="btn btn-success"  disabled={loading}>
              {loading ? 'Збереження…' : 'Зберегти'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   TRAILER MODAL
════════════════════════════════════════════════════════════ */
const TRAILER_TYPES = ['Бортовий','Тентований','Рефрижератор','Цистерна','Самоскид','Платформа','Контейнеровоз','Автовоз','Інше'];

const TRAILER_BLANK = {
  trailerNumber: '', brand: '', model: '',
  year: new Date().getFullYear().toString(),
  trailerType: '', loadCapacity: '', ownWeight: '', tariff: '', notes: '',
  active: true,
};

const TrailerModal = ({ show, onClose, onSubmit, trailer, loading }) => {
  const [form,   setForm]   = useState(TRAILER_BLANK);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (show) {
      setErrors({});
      setForm(trailer ? {
        trailerNumber: trailer.trailer_number || '',
        brand:         trailer.brand          || '',
        model:         trailer.model          || '',
        year:          trailer.year?.toString() || new Date().getFullYear().toString(),
        trailerType:   trailer.trailer_type   || '',
        loadCapacity:  trailer.load_capacity?.toString() || '',
        ownWeight:     trailer.own_weight?.toString()    || '',
        tariff:        trailer.tariff?.toString()        || '',
        notes:         trailer.notes          || '',
        active:        trailer.active !== undefined ? trailer.active : true,
      } : TRAILER_BLANK);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, trailer]);

  const change = (e) => {
    const { name, value } = e.target;
    const numeric = ['year', 'loadCapacity', 'ownWeight', 'tariff'];
    setForm(prev => ({
      ...prev,
      [name]: numeric.includes(name) ? value.replace(/[^\d.,]/g, '').replace(/,/g, '.') : value,
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.trailerNumber?.trim()) e.trailerNumber = 'Введіть номер';
    if (!form.tariff)                e.tariff        = 'Введіть тариф';
    if (form.year) {
      const y = parseFloat(form.year), curY = new Date().getFullYear();
      if (isNaN(y) || y < 1900 || y > curY + 1) e.year = `Рік від 1900 до ${curY + 1}`;
    }
    if (isNaN(parseFloat(form.tariff)) || parseFloat(form.tariff) <= 0)
      e.tariff = 'Тариф має бути > 0';
    setErrors(e);
    return !Object.keys(e).length;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    const ok = await onSubmit({
      ...form,
      year:         form.year         ? parseInt(form.year)                             : null,
      loadCapacity: form.loadCapacity ? parseFloat(form.loadCapacity.replace(',', '.')) : null,
      ownWeight:    form.ownWeight    ? parseFloat(form.ownWeight.replace(',', '.'))    : null,
      tariff:       parseFloat(form.tariff.replace(',', '.')),
      id:           trailer?.id,
    });
    if (ok) { onClose(); }
  };

  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h3>{trailer ? 'Редагувати причіп' : 'Додати причіп'}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={submit}>
          <div className="modal-body" style={{ display: 'grid', gap: '0.75rem' }}>
            <div className="form-row">
              <div className="form-group">
                <label>Номер *</label>
                <input
                  name="trailerNumber" value={form.trailerNumber}
                  onChange={e => setForm(prev => ({ ...prev, trailerNumber: e.target.value.toUpperCase() }))}
                  placeholder="АА1234ВЕ" disabled={loading}
                  style={{ fontFamily: 'var(--font-mono)', letterSpacing: '0.05em' }}
                />
                {errors.trailerNumber && <div className="form-error">{errors.trailerNumber}</div>}
              </div>
              <div className="form-group">
                <label>Тип</label>
                <select name="trailerType" value={form.trailerType} onChange={change} disabled={loading}>
                  <option value="">— Виберіть —</option>
                  {TRAILER_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Марка</label>
                <input name="brand" value={form.brand} onChange={change} placeholder="Schmitz" disabled={loading} />
              </div>
              <div className="form-group">
                <label>Модель</label>
                <input name="model" value={form.model} onChange={change} placeholder="S.KO 24" disabled={loading} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Рік</label>
                <input name="year" value={form.year} onChange={change} placeholder="2024" disabled={loading} />
                {errors.year && <div className="form-error">{errors.year}</div>}
              </div>
              <div className="form-group">
                <label>Вантажопід. (кг)</label>
                <input name="loadCapacity" value={form.loadCapacity} onChange={change} placeholder="20000" disabled={loading} />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Власна вага (кг)</label>
                <input name="ownWeight" value={form.ownWeight} onChange={change} placeholder="5000" disabled={loading} />
              </div>
              <div className="form-group">
                <label>Тариф (грн/км) *</label>
                <input name="tariff" value={form.tariff} onChange={change} placeholder="5.00" disabled={loading} />
                {errors.tariff && <div className="form-error">{errors.tariff}</div>}
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Примітки</label>
              <textarea
                name="notes" rows={2} value={form.notes}
                onChange={change} placeholder="Додаткова інформація"
                disabled={loading}
              />
            </div>

            {trailer && (
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Статус</label>
                <select
                  value={form.active ? 'true' : 'false'}
                  onChange={e => setForm(prev => ({ ...prev, active: e.target.value === 'true' }))}
                  disabled={loading}
                >
                  <option value="true">Активний</option>
                  <option value="false">Неактивний</option>
                </select>
              </div>
            )}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={loading}>Скасувати</button>
            <button type="submit"  className="btn btn-success"  disabled={loading}>
              {loading ? 'Збереження…' : 'Зберегти'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   MILEAGE UPDATE MODAL
════════════════════════════════════════════════════════════ */
const MileageModal = ({ entry, onChange, onSave, onClose }) => {
  if (!entry) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '400px' }}>
        <div className="modal-header">
          <h3>Оновлення пробігу</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div className="form-group">
            <label>Поточний пробіг</label>
            <div style={{
              padding: '0.5rem 0.75rem',
              background: 'var(--surface-sub)',
              border: '1px solid var(--bd-1)',
              borderRadius: 'var(--r-md)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.9rem',
              color: 'var(--tx-2)',
            }}>
              {entry.currentMileage.toLocaleString()} км
            </div>
          </div>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Новий пробіг *</label>
            <input
              type="text" inputMode="numeric"
              value={entry.newMileage}
              onChange={onChange}
              placeholder="Введіть новий пробіг"
              style={{ fontFamily: 'var(--font-mono)' }}
            />
            <div className="form-hint">Має бути ≥ {entry.currentMileage.toLocaleString()} км</div>
          </div>
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Скасувати</button>
          <button className="btn btn-success"   onClick={onSave}>Оновити</button>
        </div>
      </div>
    </div>
  );
};

/* ════════════════════════════════════════════════════════════
   MAIN COMPONENT
════════════════════════════════════════════════════════════ */
const CarManagement = () => {
  const [cars,     setCars]     = useState([]);
  const [trailers, setTrailers] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [activeTab, setActiveTab] = useState('cars');   // 'cars' | 'trailers'

  const [carsPage,     setCarsPage]     = useState(1);
  const [trailersPage, setTrailersPage] = useState(1);
  const [pageSize,     setPageSize]     = useState(25);
  const [totalCars,    setTotalCars]    = useState(0);
  const [totalTrailers,setTotalTrailers]= useState(0);

  const [carModal,     setCarModal]     = useState({ show: false, car: null });
  const [trailerModal, setTrailerModal] = useState({ show: false, trailer: null });
  const [mileageEntry, setMileageEntry] = useState(null);

  const [status, setStatus] = useState({ message: '', type: '' });

  // Auto-dismiss success messages after 4 seconds
  useEffect(() => {
    if (status.message && status.type === 'success') {
      const timer = setTimeout(() => setStatus({ message: '', type: '' }), 4000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const { hasPermission } = useAuth();
  const showTrailers = activeTab === 'trailers';

  /* ── settings ─────────────────────────────────────────── */
  useEffect(() => {
    (async () => {
      try {
        const s = await getSettings();
        setPageSize(s.cars_page_size || 25);
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  /* ── load on tab/page change ──────────────────────────── */
  const loadCars = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getCarsList(carsPage, pageSize);
      setCars(r.data || []);
      setTotalCars(r.total || 0);
    } catch (e) {
      setStatus({ message: 'Помилка завантаження', type: 'error' });
    } finally { setLoading(false); }
  }, [carsPage, pageSize]);

  const loadTrailers = useCallback(async () => {
    setLoading(true);
    try {
      const r = await getTrailersList(trailersPage, pageSize);
      setTrailers(r.data || []);
      setTotalTrailers(r.total || 0);
    } catch (e) {
      setStatus({ message: 'Помилка завантаження', type: 'error' });
    } finally { setLoading(false); }
  }, [trailersPage, pageSize]);

  useEffect(() => {
    if (showTrailers) loadTrailers(); else loadCars();
  }, [showTrailers, loadCars, loadTrailers]);

  /* ── CRUD cars ────────────────────────────────────────── */
  const handleAddCar = async (d) => {
    try {
      const r = await addCar(d);
      if (r.success) { setStatus({ message: r.message, type: 'success' }); setCarsPage(1); await loadCars(); return true; }
    } catch (e) { setStatus({ message: e.message, type: 'error' }); }
    return false;
  };

  const handleUpdateCar = async (d) => {
    try {
      const r = await updateCar(d.id, { brand: d.brand, model: d.model, licensePlate: d.licensePlate, year: d.year, fuelType: d.fuelType, tariff: d.tariff, active: d.active });
      if (r.success) { setStatus({ message: r.message, type: 'success' }); await loadCars(); return true; }
    } catch (e) { setStatus({ message: e.message, type: 'error' }); }
    return false;
  };

  const handleDeleteCar = async (id) => {
    if (!hasPermission('can_delete_cars')) {
      setStatus({ message: 'Недостатньо прав для видалення', type: 'error' });
      return;
    }
    if (!window.confirm('Видалити автомобіль?')) return;
    try {
      const r = await deleteCar(id);
      if (r.success) {
        setStatus({ message: r.message, type: 'success' });
        if (cars.length === 1 && carsPage > 1) setCarsPage(p => p - 1); else await loadCars();
      }
    } catch (e) { setStatus({ message: e.message, type: 'error' }); }
  };

  const handleSaveMileage = async () => {
    const nv = parseInt(mileageEntry.newMileage);
    if (isNaN(nv) || nv < mileageEntry.currentMileage) {
      setStatus({ message: 'Некоректне значення', type: 'error' }); return;
    }
    try {
      const r = await updateCarMileage(mileageEntry.id, nv);
      if (r.success) { setStatus({ message: r.message, type: 'success' }); setMileageEntry(null); await loadCars(); }
    } catch (e) { setStatus({ message: e.message, type: 'error' }); }
  };

  /* ── CRUD trailers ────────────────────────────────────── */
  const handleAddTrailer = async (d) => {
    try {
      const r = await addTrailer(d);
      if (r.success) { setStatus({ message: r.message, type: 'success' }); setTrailersPage(1); await loadTrailers(); return true; }
    } catch (e) { setStatus({ message: e.message, type: 'error' }); }
    return false;
  };

  const handleUpdateTrailer = async (d) => {
    if (!hasPermission('can_edit_trailers')) { setStatus({ message: 'Недостатньо прав', type: 'error' }); return false; }
    try {
      const r = await updateTrailer(d.id, d);
      if (r.success) { setStatus({ message: r.message, type: 'success' }); await loadTrailers(); return true; }
    } catch (e) { setStatus({ message: e.message, type: 'error' }); }
    return false;
  };

  const handleDeleteTrailer = async (id) => {
    if (!hasPermission('can_delete_trailers')) { setStatus({ message: 'Недостатньо прав', type: 'error' }); return; }
    if (!window.confirm('Видалити причіп?')) return;
    try {
      const r = await deleteTrailer(id);
      if (r.success) {
        setStatus({ message: r.message, type: 'success' });
        if (trailers.length === 1 && trailersPage > 1) setTrailersPage(p => p - 1); else await loadTrailers();
      }
    } catch (e) { setStatus({ message: e.message, type: 'error' }); }
  };

  const handlePageSizeChange = (n) => { setPageSize(n); setCarsPage(1); setTrailersPage(1); };

  /* ── loading stub ─────────────────────────────────────── */
  if (loading && !cars.length && !trailers.length) {
    return <div className="loading"><div className="loading-spinner" />Завантаження…</div>;
  }

  const totalCarsPages    = Math.ceil(totalCars    / pageSize);
  const totalTrailerPages = Math.ceil(totalTrailers / pageSize);

  /* ── render ───────────────────────────────────────────── */
  return (
    <div className="container">
      {/* Tabs */}
      <div className="tabs">
        <button className={`tab${!showTrailers ? ' active' : ''}`} onClick={() => setActiveTab('cars')}>
          🚗 Автомобілі
        </button>
        <button className={`tab${showTrailers ? ' active' : ''}`} onClick={() => setActiveTab('trailers')}>
          🚛 Причепи
        </button>
      </div>

      {status.message && (
        <div className={`status ${status.type}`}>{status.message}</div>
      )}

      {/* ── CARS ──────────────────────────────────────────── */}
      {!showTrailers && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h2 style={{ margin: 0, border: 'none', padding: 0 }}>Автомобілі</h2>
            {hasPermission('can_edit_cars') && (
              <button className="btn btn-primary" onClick={() => setCarModal({ show: true, car: null })}>
                + Додати авто
              </button>
            )}
          </div>

          {!cars.length ? (
            <div className="no-data">
              <p>Немає автомобілів</p>
              {hasPermission('can_edit_cars') && (
                <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setCarModal({ show: true, car: null })}>
                  + Додати перший автомобіль
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="table-container">
                <table style={{ minWidth: '960px' }}>
                  <thead>
                    <tr>
                      <th>ID</th><th>Марка</th><th>Модель</th><th>Номер</th>
                      <th>Рік</th><th>Пробіг</th><th>Пальне</th><th>Тариф</th>
                      <th>Статус</th><th>Дії</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cars.map(car => (
                      <tr key={car.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--tx-3)', fontSize: '0.8rem' }}>{car.id}</td>
                        <td style={{ fontWeight: 500 }}>{car.brand || '—'}</td>
                        <td>{car.model || '—'}</td>
                        <td>
                          <span className="badge badge-blue" style={{ fontFamily: 'var(--font-mono)' }}>
                            {car.plate || '—'}
                          </span>
                        </td>
                        <td>{car.year || '—'}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{safeNumber(car.current_mileage).toLocaleString()} км</td>
                        <td>{car.fuel_type || 'Бензин'}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{safeNumber(car.tariff).toFixed(2)} грн/км</td>
                        <td>
                          <span className={`badge ${car.active ? 'badge-green' : 'badge-orange'}`}>
                            {car.active ? 'Активний' : 'Неактивний'}
                          </span>
                        </td>
                        <td>
                          {hasPermission('can_edit_cars') && (
                            <div style={{ display: 'flex', gap: '0.25rem' }}>
                              <button className="btn btn-secondary btn-sm" onClick={() => setCarModal({ show: true, car })}>Ред</button>
                              <button className="btn btn-info      btn-sm" onClick={() => setMileageEntry({ id: car.id, currentMileage: safeNumber(car.current_mileage), newMileage: safeNumber(car.current_mileage).toString() })}>Пробіг</button>
                              <button className="btn btn-danger    btn-sm" onClick={() => handleDeleteCar(car.id)}>Вид</button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={carsPage} totalPages={totalCarsPages}
                onPageChange={setCarsPage}
                pageSize={pageSize} onPageSizeChange={handlePageSizeChange}
                total={totalCars}
              />
            </>
          )}
        </>
      )}

      {/* ── TRAILERS ──────────────────────────────────────── */}
      {showTrailers && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <h2 style={{ margin: 0, border: 'none', padding: 0 }}>Причепи</h2>
            {hasPermission('can_edit_trailers') && (
              <button className="btn btn-primary" onClick={() => setTrailerModal({ show: true, trailer: null })}>
                + Додати причіп
              </button>
            )}
          </div>

          {!trailers.length ? (
            <div className="no-data">
              <p>Немає причепів</p>
              {hasPermission('can_edit_trailers') && (
                <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => setTrailerModal({ show: true, trailer: null })}>
                  + Додати перший причіп
                </button>
              )}
            </div>
          ) : (
            <>
              <div className="table-container">
                <table style={{ minWidth: '1100px' }}>
                  <thead>
                    <tr>
                      <th>ID</th><th>Номер</th><th>Тип</th><th>Марка / Модель</th>
                      <th>Рік</th><th>Вантажопід.</th><th>Вага</th><th>Тариф</th>
                      <th>Статус</th><th>Дії</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trailers.map(tr => (
                      <tr key={tr.id}>
                        <td style={{ fontFamily: 'var(--font-mono)', color: 'var(--tx-3)', fontSize: '0.8rem' }}>{tr.id}</td>
                        <td>
                          <span className="badge badge-purple" style={{ fontFamily: 'var(--font-mono)' }}>
                            {tr.trailer_number}
                          </span>
                        </td>
                        <td>{tr.trailer_type || '—'}</td>
                        <td style={{ fontWeight: 500 }}>
                          {tr.brand && tr.model ? `${tr.brand} ${tr.model}` : tr.brand || tr.model || '—'}
                        </td>
                        <td>{tr.year || '—'}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{tr.load_capacity ? tr.load_capacity.toLocaleString() + ' кг' : '—'}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{tr.own_weight    ? tr.own_weight.toLocaleString()    + ' кг' : '—'}</td>
                        <td style={{ fontFamily: 'var(--font-mono)' }}>{safeNumber(tr.tariff).toFixed(2)} грн/км</td>
                        <td>
                          <span className={`badge ${tr.active ? 'badge-green' : 'badge-orange'}`}>
                            {tr.active ? 'Активний' : 'Неактивний'}
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.25rem' }}>
                            {hasPermission('can_edit_trailers') && (
                              <button className="btn btn-secondary btn-sm" onClick={() => setTrailerModal({ show: true, trailer: tr })}>Ред</button>
                            )}
                            {hasPermission('can_delete_trailers') && (
                              <button className="btn btn-danger    btn-sm" onClick={() => handleDeleteTrailer(tr.id)}>Вид</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                currentPage={trailersPage} totalPages={totalTrailerPages}
                onPageChange={setTrailersPage}
                pageSize={pageSize} onPageSizeChange={handlePageSizeChange}
                total={totalTrailers}
              />
            </>
          )}
        </>
      )}

      {/* ── MODALS ────────────────────────────────────────── */}
      <CarModal
        show={carModal.show}
        onClose={() => setCarModal({ show: false, car: null })}
        onSubmit={carModal.car ? handleUpdateCar : handleAddCar}
        car={carModal.car}
        loading={loading}
      />

      <TrailerModal
        show={trailerModal.show}
        onClose={() => setTrailerModal({ show: false, trailer: null })}
        onSubmit={trailerModal.trailer ? handleUpdateTrailer : handleAddTrailer}
        trailer={trailerModal.trailer}
        loading={loading}
      />

      <MileageModal
        entry={mileageEntry}
        onChange={e => setMileageEntry(prev => ({ ...prev, newMileage: e.target.value.replace(/[^\d]/g, '') }))}
        onSave={handleSaveMileage}
        onClose={() => setMileageEntry(null)}
      />
    </div>
  );
};

export default CarManagement;
