import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  getTripsList, getDriversForSelect, getCarsForSelect,
  getTrailersForSelect, addTrip, updateTrip, deleteTrip,
  bulkDeleteTrips, countTripsByPeriod, getSettings,
} from '../services/supabase';
import { safeNumber, netError } from '../utils/safeHelpers';
import { useAuth } from '../contexts/AuthContext';
import Pagination from './Pagination';

const BLANK_FORM = {
  date: '', driverId: '', carId: '', trailerId: '',
  route: '', startMileage: '', endMileage: '', notes: '', isOvernight: false,
};

/* ─── helpers ──────────────────────────────────────────────── */
const toISO = (ddmmyyyy) => {
  if (!ddmmyyyy) return '';
  if (ddmmyyyy.includes('.')) {
    const [d, m, y] = ddmmyyyy.split('.');
    if (d && m && y) return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return ddmmyyyy;
};

/* ─── PDF export ───────────────────────────────────────────── */
const exportToPDF = (trips, periodLabel, options = {}) => {
  const { hideSums = false } = options;
  const total = trips.reduce((s, t) => s + safeNumber(t.distance), 0);
  const amount = trips.reduce((s, t) => s + safeNumber(t.amount), 0);
  const colCount = hideSums ? 7 : 8;

  const rows = trips.map((t, i) => `
    <tr style="background:${i % 2 === 0 ? '#fff' : '#f8fafc'}">
      <td>${t.id}</td>
      <td>${t.date}</td>
      <td>${t.driver}</td>
      <td>${t.car}</td>
      <td>${t.plate}</td>
      <td>${t.trailer || '—'}</td>
      <td>${t.route || '—'}</td>
      <td>${t.isOvernight && !t.endMileageRaw ? 'очікує повернення' : safeNumber(t.distance).toLocaleString('uk-UA') + ' км'}</td>
      ${hideSums ? '' : `<td>${t.isOvernight && !t.endMileageRaw ? '—' : safeNumber(t.amount).toFixed(2) + ' грн'}</td>`}
    </tr>`).join('');

  const html = `<!DOCTYPE html>
<html lang="uk">
<head>
<meta charset="UTF-8"/>
<title>Звіт по поїздках</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; margin: 20px; }
  h1 { font-size: 16px; margin-bottom: 4px; }
  .sub { color: #64748b; font-size: 11px; margin-bottom: 16px; }
  table { width: 100%; border-collapse: collapse; }
  th { background: #1e40af; color: #fff; padding: 6px 8px; text-align: left; font-size: 10px; white-space: nowrap; }
  td { padding: 5px 8px; border-bottom: 1px solid #e2e8f0; }
  tfoot td { background: #f1f5f9; font-weight: 700; }
  .badge { display: inline-block; padding: 1px 6px; border-radius: 4px; font-size: 10px; background:#dbeafe; color:#1e40af; }
  @media print { @page { margin: 1cm; } }
</style>
</head>
<body>
<h1>Звіт по поїздках — Trust Cargo</h1>
<div class="sub">Період: ${periodLabel} &nbsp;|&nbsp; Згенеровано: ${new Date().toLocaleString('uk-UA')} &nbsp;|&nbsp; Записів: ${trips.length}</div>
<table>
  <thead>
    <tr>
      <th>ID</th><th>Дата</th><th>Водій</th><th>Автомобіль</th>
      <th>Номер</th><th>Причіп</th><th>Маршрут</th><th>Пробіг</th>${hideSums ? '' : '<th>Сума</th>'}
    </tr>
  </thead>
  <tbody>${rows}</tbody>
  <tfoot>
    <tr>
      <td colspan="${colCount - 1}"><strong>ВСЬОГО</strong></td>
      <td><strong>${total.toLocaleString('uk-UA')} км</strong></td>
      ${hideSums ? '' : `<td><strong>${amount.toFixed(2)} грн</strong></td>`}
    </tr>
  </tfoot>
</table>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) { alert('Дозвольте спливаючі вікна для цього сайту'); return; }
  win.document.write(html);
  win.document.close();
  win.onload = () => { win.focus(); win.print(); };
};

/* ─── Excel export (HTML-table based .xls) ─────────────────── */
const exportToExcel = (trips, periodLabel, options = {}) => {
  const { hideSums = false } = options;
  const totalDist = trips.reduce((s, t) => s + safeNumber(t.distance), 0);
  const totalAmt = trips.reduce((s, t) => s + safeNumber(t.amount), 0);
  const colCount = hideSums ? 9 : 10;

  const rows = trips.map((t, i) => {
    const bg = i % 2 === 0 ? '#ffffff' : '#f0f4ff';
    const numCell = 'mso-number-format:\'0\'; text-align:right;';
    const moneyCell = 'mso-number-format:\'0.00\'; text-align:right;';
    const dist = t.isOvernight && !t.endMileageRaw ? '' : safeNumber(t.distance);
    const amt = t.isOvernight && !t.endMileageRaw ? '' : safeNumber(t.amount).toFixed(2);
    return `<tr style="background:${bg}">
      <td style="text-align:center; color:#64748b;">${t.id}</td>
      <td style="text-align:center; white-space:nowrap;">${t.date}</td>
      <td style="font-weight:500;">${t.driver}</td>
      <td>${t.car}</td>
      <td style="text-align:center; font-family:Consolas,monospace; font-size:10px;">${t.plate}</td>
      <td>${t.trailer || '—'}</td>
      <td>${t.route || '—'}</td>
      <td style="${numCell}">${dist}</td>
      ${hideSums ? '' : `<td style="${moneyCell}">${amt}</td>`}
      <td style="color:#64748b; font-size:10px;">${t.notes || ''}</td>
    </tr>`;
  }).join('');

  const html = `
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:x="urn:schemas-microsoft-com:office:excel"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
  <meta charset="UTF-8"/>
  <!--[if gte mso 9]><xml>
    <x:ExcelWorkbook><x:ExcelWorksheets><x:ExcelWorksheet>
      <x:Name>Поїздки</x:Name>
      <x:WorksheetOptions><x:DisplayGridlines/></x:WorksheetOptions>
    </x:ExcelWorksheet></x:ExcelWorksheets></x:ExcelWorkbook>
  </xml><![endif]-->
  <style>
    table { border-collapse: collapse; width: 100%; }
    td, th {
      border: 1px solid #c7d2e0;
      padding: 6px 10px;
      font-family: 'Segoe UI', Arial, sans-serif;
      font-size: 11px;
      vertical-align: middle;
    }
    th {
      background: #1e3a5f;
      color: #ffffff;
      font-weight: 600;
      text-align: center;
      font-size: 11px;
      letter-spacing: 0.3px;
      padding: 8px 10px;
    }
    .title-cell {
      font-size: 16px;
      font-weight: 700;
      color: #1e293b;
      border: none;
      padding: 10px 4px 2px;
    }
    .sub-cell {
      font-size: 11px;
      color: #64748b;
      border: none;
      padding: 2px 4px 10px;
    }
    .spacer { border: none; height: 6px; }
    .total-label {
      text-align: right;
      font-weight: 700;
      font-size: 11px;
      color: #1e293b;
      background: #e2e8f0;
      border-top: 2px solid #94a3b8;
    }
    .total-value {
      font-weight: 700;
      font-size: 12px;
      color: #0f172a;
      background: #e2e8f0;
      text-align: right;
      border-top: 2px solid #94a3b8;
    }
    .total-empty {
      background: #e2e8f0;
      border-top: 2px solid #94a3b8;
    }
  </style>
</head>
<body>
  <table>
    <tr><td class="title-cell" colspan="${colCount}">Звіт по поїздках — Trust Cargo</td></tr>
    <tr><td class="sub-cell" colspan="${colCount}">Період: ${periodLabel}  ·  Згенеровано: ${new Date().toLocaleString('uk-UA')}  ·  Записів: ${trips.length}</td></tr>
    <tr><td class="spacer" colspan="${colCount}"></td></tr>
    <thead>
      <tr>
        <th>ID</th><th>Дата</th><th>Водій</th><th>Автомобіль</th>
        <th>Номер</th><th>Причіп</th><th>Маршрут</th><th>Пробіг (км)</th>${hideSums ? '' : '<th>Сума (грн)</th>'}<th>Примітки</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
    <tfoot>
      <tr>
        <td class="total-label" colspan="7">ВСЬОГО:</td>
        <td class="total-value" style="mso-number-format:'0'">${totalDist.toLocaleString('uk-UA')}</td>
        ${hideSums ? '' : `<td class="total-value" style="mso-number-format:'0.00'">${totalAmt.toFixed(2)}</td>`}
        <td class="total-empty"></td>
      </tr>
    </tfoot>
  </table>
</body>
</html>`;

  const blob = new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `trips_${new Date().toISOString().split('T')[0]}.xls`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/* ─── bulk-fetch all trips for export / bulk-delete ────────── */
const fetchAllTripsForPeriod = async (startDate, endDate, driverFilter, carFilter, driverId) => {
  const PAGE = 500;
  let allData = [];
  let page = 1;

  while (true) {
    const apiFilters = {};
    if (startDate) apiFilters.startDate = startDate;
    if (endDate) apiFilters.endDate = endDate;
    if (driverId) apiFilters.driverId = driverId;
    // text filters applied client-side below

    const r = await getTripsList(page, PAGE, apiFilters);
    allData = allData.concat(r.data || []);
    if (allData.length >= r.total || (r.data || []).length < PAGE) break;
    page++;
  }

  // client-side text filters
  if (driverFilter) {
    const q = driverFilter.toLowerCase();
    allData = allData.filter(t => (t.driver || '').toLowerCase().includes(q));
  }
  if (carFilter) {
    const q = carFilter.toLowerCase();
    allData = allData.filter(t =>
      (t.car || '').toLowerCase().includes(q) || (t.plate || '').toLowerCase().includes(q)
    );
  }

  return allData;
};

/* ─── TripFormModal ────────────────────────────────────────── */
const TripFormModal = ({ show, onClose, onSubmit, trip, drivers, cars, trailers, loading }) => {
  const [form, setForm] = useState(BLANK_FORM);
  const [selectedCar, setSelectedCar] = useState(null);
  const [selectedTrailer, setSelectedTrailer] = useState(null);
  const [distance, setDistance] = useState(0);
  const [carAmount, setCarAmount] = useState(0);
  const [trailerAmount, setTrailerAmount] = useState(0);
  const [totalAmount, setTotalAmount] = useState(0);
  const [errors, setErrors] = useState({});
  const submitting = useRef(false);

  useEffect(() => {
    if (!show) return;
    setErrors({});
    if (trip) {
      setForm({
        date: trip.dateOriginal || '',
        driverId: String(trip.driverId || ''),
        carId: String(trip.carId || ''),
        trailerId: String(trip.trailerInfo?.id || ''),
        route: trip.route || '',
        startMileage: String(trip.startMileage || ''),
        endMileage: trip.isOvernight && !trip.endMileage ? '' : String(trip.endMileage || ''),
        notes: trip.notes || '',
        isOvernight: trip.isOvernight || false,
      });
      setSelectedCar(cars.find(c => c.id === trip.carId) || null);
      setSelectedTrailer(trip.trailerInfo ? trailers.find(t => t.id === trip.trailerInfo.id) || null : null);
    } else {
      const now = new Date();
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
      setForm({ ...BLANK_FORM, date: dateStr });
      setSelectedCar(null);
      setSelectedTrailer(null);
      setDistance(0); setCarAmount(0); setTrailerAmount(0); setTotalAmount(0);
    }
  }, [show, trip, cars, trailers]);

  const recalc = useCallback(() => {
    const start = Number(form.startMileage);
    const end = Number(form.endMileage);
    if (!form.startMileage || !form.endMileage || form.isOvernight || !selectedCar || isNaN(start) || isNaN(end) || end < start) {
      setDistance(0); setCarAmount(0); setTrailerAmount(0); setTotalAmount(0); return;
    }
    const dist = end - start;
    const carSum = dist * safeNumber(selectedCar.tariff);
    const trailSum = selectedTrailer ? dist * safeNumber(selectedTrailer.tariff) : 0;
    setDistance(dist); setCarAmount(carSum); setTrailerAmount(trailSum); setTotalAmount(carSum + trailSum);
  }, [form.startMileage, form.endMileage, form.isOvernight, selectedCar, selectedTrailer]);

  useEffect(() => { recalc(); }, [recalc]);

  const handleChange = (e) => {
    const { id, value, checked } = e.target;
    if (id === 'isOvernight') {
      setForm(prev => ({ ...prev, isOvernight: checked, endMileage: checked ? '' : prev.endMileage }));
      setErrors(prev => ({ ...prev, endMileage: '' }));
      return;
    }
    if (id === 'carId') {
      const car = cars.find(c => c.id === Number(value));
      setSelectedCar(car || null);
      setSelectedTrailer(null);
      setForm(prev => ({
        ...prev, carId: value, trailerId: '',
        startMileage: car && !trip ? String(car.currentMileage) : prev.startMileage,
        endMileage: car && !trip ? '' : prev.endMileage,
      }));
      setErrors({});
      return;
    }
    if (id === 'trailerId') {
      const trl = trailers.find(t => t.id === Number(value));
      setSelectedTrailer(trl || null);
      setForm(prev => ({ ...prev, trailerId: value }));
      return;
    }
    if (id === 'startMileage' || id === 'endMileage') {
      setForm(prev => ({ ...prev, [id]: value.replace(/[^0-9]/g, '') }));
    } else {
      setForm(prev => ({ ...prev, [id]: value }));
    }
    if (errors[id]) setErrors(prev => ({ ...prev, [id]: '' }));
  };

  const validate = () => {
    const e = {};
    if (!form.driverId) e.driverId = 'Виберіть водія';
    if (!form.carId) e.carId = 'Виберіть автомобіль';
    if (!form.date) e.date = 'Виберіть дату';
    if (form.startMileage === '') e.startMileage = 'Введіть початковий пробіг';
    if (!form.isOvernight && form.endMileage === '') e.endMileage = 'Введіть кінцевий пробіг';
    if (!form.isOvernight && form.startMileage !== '' && form.endMileage !== '') {
      const s = Number(form.startMileage), en = Number(form.endMileage);
      if (en < s) e.endMileage = 'Кінцевий пробіг не може бути меншим за початковий';
      if (!trip && selectedCar && s < safeNumber(selectedCar.currentMileage))
        e.startMileage = `Початковий пробіг не може бути < ${safeNumber(selectedCar.currentMileage).toLocaleString()} км`;
    }
    setErrors(e);
    return !Object.keys(e).length;
  };

  const reset = () => {
    setForm(BLANK_FORM);
    setSelectedCar(null); setSelectedTrailer(null);
    setDistance(0); setCarAmount(0); setTrailerAmount(0); setTotalAmount(0);
    setErrors({});
  };

  const handleClose = () => { reset(); onClose(); };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (submitting.current) return;
    if (!validate()) return;
    submitting.current = true;
    const payload = {
      driverId: Number(form.driverId),
      carId: Number(form.carId),
      trailerId: form.trailerId ? Number(form.trailerId) : null,
      date: form.date,
      route: form.route || null,
      startMileage: Number(form.startMileage),
      endMileage: form.isOvernight ? null : Number(form.endMileage),
      isOvernight: form.isOvernight,
      notes: form.notes || null,
    };
    if (trip?.id) payload.id = trip.id;
    const ok = await onSubmit(payload);
    submitting.current = false;
    if (ok) reset();
  };

  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '620px' }}>
        <div className="modal-header">
          <h3>{trip ? 'Редагувати поїздку' : 'Додати поїздку'}</h3>
          <button className="modal-close" onClick={handleClose}>×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'grid', gap: '0.875rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Дата *</label>
              <input type="date" id="date" value={form.date} onChange={handleChange} disabled={loading} />
              {errors.date && <div className="form-error">{errors.date}</div>}
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Водій *</label>
                <select id="driverId" value={form.driverId} onChange={handleChange} disabled={loading}>
                  <option value="">— Виберіть водія —</option>
                  {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
                {errors.driverId && <div className="form-error">{errors.driverId}</div>}
              </div>
              <div className="form-group">
                <label>Автомобіль *</label>
                <select id="carId" value={form.carId} onChange={handleChange} disabled={loading}>
                  <option value="">— Виберіть автомобіль —</option>
                  {cars.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errors.carId && <div className="form-error">{errors.carId}</div>}
              </div>
            </div>
            {selectedCar && !trip && (
              <div className="info-block" style={{ padding: '0.625rem 0.875rem', margin: 0 }}>
                <span style={{ color: 'var(--tx-3)', fontSize: '0.8rem' }}>Поточний пробіг машини: </span>
                <strong style={{ color: 'var(--blue-600)', fontFamily: 'var(--font-mono)' }}>
                  {safeNumber(selectedCar.currentMileage).toLocaleString()} км
                </strong>
              </div>
            )}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Причіп (необов'язково)</label>
              <select id="trailerId" value={form.trailerId} onChange={handleChange} disabled={loading || !selectedCar}>
                <option value="">— Без причепа —</option>
                {trailers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {selectedTrailer && (
                <div className="form-hint" style={{ color: 'var(--purple-600)' }}>
                  Тариф причепа: {safeNumber(selectedTrailer.tariff).toFixed(2)} грн/км
                </div>
              )}
            </div>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Маршрут</label>
              <input type="text" id="route" value={form.route} onChange={handleChange} placeholder="Київ – Львів" disabled={loading} />
            </div>
            {/* Overnight checkbox */}
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: '0.625rem',
                padding: '0.625rem 0.875rem',
                background: form.isOvernight ? 'var(--orange-50, #fff7ed)' : 'var(--surface-sub)',
                border: `1px solid ${form.isOvernight ? 'var(--orange-200, #fed7aa)' : 'var(--bd-1)'}`,
                borderRadius: 'var(--r-lg)', cursor: 'pointer', transition: 'all 0.15s ease',
              }}
              onClick={() => !loading && handleChange({ target: { id: 'isOvernight', type: 'checkbox', checked: !form.isOvernight } })}
            >
              <div style={{
                width: '18px', height: '18px',
                border: `2px solid ${form.isOvernight ? 'var(--orange-500, #f97316)' : 'var(--bd-2)'}`,
                borderRadius: 'var(--r-sm)',
                background: form.isOvernight ? 'var(--orange-500, #f97316)' : 'transparent',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0, transition: 'all 0.15s ease',
              }}>
                {form.isOvernight && <span style={{ color: '#fff', fontSize: '11px', fontWeight: 700 }}>✓</span>}
              </div>
              <div>
                <span style={{ fontWeight: 500, fontSize: '0.875rem', color: form.isOvernight ? 'var(--orange-700, #c2410c)' : 'var(--tx-1)' }}>
                  🌙 Ночівля
                </span>
                <span style={{ fontSize: '0.78rem', color: 'var(--tx-3)', marginLeft: '0.5rem' }}>
                  Кінцевий пробіг буде внесено пізніше
                </span>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Початковий пробіг *</label>
                <input
                  type="text" id="startMileage"
                  value={form.startMileage} onChange={handleChange}
                  placeholder="0" inputMode="numeric"
                  disabled={loading || !selectedCar}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    borderColor: errors.startMileage ? 'var(--red-600)' : undefined,
                    background: !trip && selectedCar ? 'var(--blue-50)' : undefined,
                  }}
                />
                {errors.startMileage
                  ? <div className="form-error">{errors.startMileage}</div>
                  : !trip && selectedCar && <div className="form-hint" style={{ color: 'var(--blue-600)' }}>Встановлено поточний пробіг</div>
                }
              </div>
              <div className="form-group">
                <label style={{ color: form.isOvernight ? 'var(--tx-3)' : undefined }}>
                  Кінцевий пробіг {!form.isOvernight && '*'}
                  {form.isOvernight && <span style={{ fontSize: '0.75rem', fontStyle: 'italic', marginLeft: '0.35rem' }}>(заповнити після повернення)</span>}
                </label>
                <input
                  type="text" id="endMileage"
                  value={form.endMileage} onChange={handleChange}
                  placeholder={form.isOvernight ? '— ще не відомо —' : '0'}
                  inputMode="numeric"
                  disabled={loading || !selectedCar || form.isOvernight}
                  style={{
                    fontFamily: 'var(--font-mono)',
                    borderColor: errors.endMileage ? 'var(--red-600)' : undefined,
                    background: form.isOvernight ? 'var(--surface-sub)' : undefined,
                    color: form.isOvernight ? 'var(--tx-4)' : undefined,
                  }}
                />
                {errors.endMileage && <div className="form-error">{errors.endMileage}</div>}
              </div>
            </div>
            {selectedCar && distance > 0 && (
              <div style={{ background: 'var(--blue-50)', border: '1px solid var(--blue-100)', borderRadius: 'var(--r-lg)', padding: '0.875rem 1rem' }}>
                {[
                  { label: 'Пробіг', value: `${distance.toLocaleString()} км`, color: 'var(--tx-1)' },
                  { label: 'Сума за авто', value: `${carAmount.toFixed(2)} грн`, color: 'var(--blue-600)' },
                  ...(selectedTrailer ? [{ label: 'Сума за причіп', value: `${trailerAmount.toFixed(2)} грн`, color: 'var(--purple-600)' }] : []),
                ].map(row => (
                  <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.3rem', fontSize: '0.875rem' }}>
                    <span style={{ color: 'var(--tx-3)' }}>{row.label}:</span>
                    <span style={{ fontWeight: 500, color: row.color, fontFamily: 'var(--font-mono)' }}>{row.value}</span>
                  </div>
                ))}
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--bd-2)', paddingTop: '0.5rem', marginTop: '0.25rem' }}>
                  <span style={{ fontWeight: 600 }}>ЗАГАЛОМ:</span>
                  <span style={{ fontWeight: 700, color: 'var(--green-700)', fontFamily: 'var(--font-mono)', fontSize: '1rem' }}>
                    {totalAmount.toFixed(2)} грн
                  </span>
                </div>
              </div>
            )}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Примітки</label>
              <textarea id="notes" rows={2} value={form.notes} onChange={handleChange} placeholder="Додаткова інформація" disabled={loading} />
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={handleClose} disabled={loading}>Скасувати</button>
            <button type="submit" className="btn btn-success" disabled={loading || !selectedCar}>
              {loading ? 'Збереження…' : trip ? 'Оновити' : 'Зберегти'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─── DeleteConfirm ────────────────────────────────────────── */
const DeleteConfirm = ({ onConfirm, onCancel }) => (
  <div className="modal-overlay">
    <div className="modal-content" style={{ maxWidth: '380px' }}>
      <div className="modal-header">
        <h3>Підтвердження</h3>
        <button className="modal-close" onClick={onCancel}>×</button>
      </div>
      <div className="modal-body" style={{ textAlign: 'center' }}>
        <p style={{ color: 'var(--tx-2)', marginBottom: '1.25rem' }}>
          Ви впевнені, що хочете видалити цю поїздку?
        </p>
      </div>
      <div className="modal-footer">
        <button className="btn btn-secondary" onClick={onCancel}>Скасувати</button>
        <button className="btn btn-danger" onClick={onConfirm}>Видалити</button>
      </div>
    </div>
  </div>
);

/* ─── BulkDeleteModal ──────────────────────────────────────── */
const BulkDeleteModal = ({ show, onClose, onConfirm, loading }) => {
  const today = new Date();
  const firstDay = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const lastDayStr = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDayStr);
  const [count, setCount] = useState(null);
  const [checking, setChecking] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  // reset on open
  useEffect(() => {
    if (show) { setCount(null); setConfirmed(false); }
  }, [show]);

  const checkCount = async () => {
    if (!startDate || !endDate) return;
    setChecking(true);
    try {
      const c = await countTripsByPeriod(startDate, endDate);
      setCount(c);
    } catch (e) {
      alert('Помилка перевірки: ' + e.message);
    } finally { setChecking(false); }
  };

  if (!show) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '480px' }}>
        <div className="modal-header">
          <h3>Масове видалення поїздок</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <div style={{
            background: 'var(--red-50, #fef2f2)',
            border: '1px solid var(--red-200, #fecaca)',
            borderRadius: 'var(--r-lg)',
            padding: '0.75rem 1rem',
            marginBottom: '1.25rem',
            fontSize: '0.875rem',
            color: 'var(--red-700, #b91c1c)',
          }}>
            ⚠️ Ця операція незворотна! Всі поїздки за вибраний період будуть видалені назавжди.
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Дата з *</label>
              <input
                type="date" value={startDate}
                onChange={e => { setStartDate(e.target.value); setCount(null); setConfirmed(false); }}
                disabled={loading}
              />
            </div>
            <div className="form-group">
              <label>Дата по *</label>
              <input
                type="date" value={endDate}
                onChange={e => { setEndDate(e.target.value); setCount(null); setConfirmed(false); }}
                disabled={loading}
              />
            </div>
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={checkCount}
            disabled={checking || !startDate || !endDate}
            style={{ marginBottom: '1rem' }}
          >
            {checking ? 'Перевірка…' : '🔍 Перевірити кількість'}
          </button>

          {count !== null && (
            <div style={{
              padding: '0.75rem 1rem',
              background: count === 0 ? 'var(--surface-sub)' : 'var(--orange-50, #fff7ed)',
              border: `1px solid ${count === 0 ? 'var(--bd-1)' : 'var(--orange-200, #fed7aa)'}`,
              borderRadius: 'var(--r-lg)',
              marginBottom: '1rem',
              fontSize: '0.875rem',
              color: count === 0 ? 'var(--tx-3)' : 'var(--orange-800, #9a3412)',
              fontWeight: 500,
            }}>
              {count === 0
                ? 'Поїздок за цей період не знайдено'
                : `Знайдено ${count} поїздок — вони будуть видалені!`}
            </div>
          )}

          {count !== null && count > 0 && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', cursor: 'pointer', fontSize: '0.875rem' }}>
              <input
                type="checkbox"
                checked={confirmed}
                onChange={e => setConfirmed(e.target.checked)}
                disabled={loading}
              />
              Я розумію, що видаляю {count} поїздок безповоротно
            </label>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Скасувати</button>
          <button
            className="btn btn-danger"
            onClick={() => onConfirm(startDate, endDate)}
            disabled={loading || !confirmed || count === 0 || count === null}
          >
            {loading ? 'Видалення…' : `Видалити ${count || ''} поїздок`}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── ExportModal ──────────────────────────────────────────── */
const ExportModal = ({ show, onClose, filters, user, drivers = [] }) => {
  const today = new Date();
  const firstDay = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
  const lastDayStr = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDayStr);
  const [format, setFormat] = useState('pdf');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');
  const [hideSums, setHideSums] = useState(false);
  const [exportDriverId, setExportDriverId] = useState('');

  useEffect(() => {
    if (show) { setProgress(''); }
  }, [show]);

  const handleExport = async () => {
    if (!startDate || !endDate) { alert('Виберіть період'); return; }
    setLoading(true);
    setProgress('Завантаження даних…');
    try {
      const driverId = user?.role === 'driver' && user?.driver_id
        ? user.driver_id
        : (exportDriverId || null);
      const trips = await fetchAllTripsForPeriod(
        startDate, endDate,
        filters.driver || '',
        filters.car || '',
        driverId,
      );

      setProgress(`Отримано ${trips.length} записів, генерація…`);

      const label = `${new Date(startDate).toLocaleDateString('uk-UA')} — ${new Date(endDate).toLocaleDateString('uk-UA')}`;

      if (trips.length === 0) {
        alert('За вибраний період поїздок не знайдено');
        return;
      }

      // Sort alphabetically by driver last name (first word of the driver string)
      const sorted = [...trips].sort((a, b) => {
        const nameA = (a.driver || '').trim().toLowerCase();
        const nameB = (b.driver || '').trim().toLowerCase();
        return nameA.localeCompare(nameB, 'uk');
      });

      const exportOpts = { hideSums };

      if (format === 'pdf') {
        exportToPDF(sorted, label, exportOpts);
      } else {
        exportToExcel(sorted, label, exportOpts);
      }
      onClose();
    } catch (e) {
      alert('Помилка експорту: ' + e.message);
    } finally {
      setLoading(false);
      setProgress('');
    }
  };

  if (!show) return null;

  const isDriverRole = user?.role === 'driver';

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '440px' }}>
        <div className="modal-header">
          <h3>Експорт поїздок</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body" style={{ display: 'grid', gap: '1rem' }}>
          <div className="form-row">
            <div className="form-group">
              <label>Дата з *</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} disabled={loading} />
            </div>
            <div className="form-group">
              <label>Дата по *</label>
              <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} disabled={loading} />
            </div>
          </div>

          {/* Driver filter */}
          {!isDriverRole && drivers.length > 0 && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label>Водій</label>
              <select
                value={exportDriverId}
                onChange={e => setExportDriverId(e.target.value)}
                disabled={loading}
              >
                <option value="">— Всі водії —</option>
                {[...drivers].sort((a, b) => (a.name || '').localeCompare(b.name || '', 'uk')).map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="form-group">
            <label>Формат</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
              {[
                { v: 'pdf', label: 'PDF', desc: 'Для друку та перегляду' },
                { v: 'excel', label: 'Excel', desc: 'Таблиця з даними (.xls)' },
              ].map(opt => (
                <div
                  key={opt.v}
                  onClick={() => !loading && setFormat(opt.v)}
                  style={{
                    padding: '0.75rem 1rem',
                    borderRadius: 'var(--r-lg)',
                    border: `2px solid ${format === opt.v ? 'var(--blue-500, #3b82f6)' : 'var(--bd-1)'}`,
                    background: format === opt.v ? 'var(--blue-50, #eff6ff)' : 'var(--surface)',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    transition: 'all 0.15s ease',
                    textAlign: 'center',
                  }}
                >
                  <div style={{
                    fontWeight: 600,
                    fontSize: '0.9rem',
                    color: format === opt.v ? 'var(--blue-700, #1d4ed8)' : 'var(--tx-1)',
                    marginBottom: '0.2rem',
                  }}>
                    {opt.label}
                  </div>
                  <div style={{
                    fontSize: '0.75rem',
                    color: format === opt.v ? 'var(--blue-500, #3b82f6)' : 'var(--tx-3)',
                  }}>
                    {opt.desc}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hide sums toggle */}
          <div
            style={{
              display: 'flex', alignItems: 'center', gap: '0.625rem',
              padding: '0.625rem 0.875rem',
              background: hideSums ? 'var(--orange-50, #fff7ed)' : 'var(--surface-sub)',
              border: `1px solid ${hideSums ? 'var(--orange-200, #fed7aa)' : 'var(--bd-1)'}`,
              borderRadius: 'var(--r-lg)', cursor: 'pointer', transition: 'all 0.15s ease',
            }}
            onClick={() => !loading && setHideSums(prev => !prev)}
          >
            <div style={{
              width: '18px', height: '18px',
              border: `2px solid ${hideSums ? 'var(--orange-500, #f97316)' : 'var(--bd-2)'}`,
              borderRadius: 'var(--r-sm)',
              background: hideSums ? 'var(--orange-500, #f97316)' : 'transparent',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0, transition: 'all 0.15s ease',
            }}>
              {hideSums && <span style={{ color: '#fff', fontSize: '11px', fontWeight: 700 }}>✓</span>}
            </div>
            <span style={{ fontWeight: 500, fontSize: '0.875rem', color: hideSums ? 'var(--orange-700, #c2410c)' : 'var(--tx-1)' }}>
              Не показувати суми
            </span>
          </div>

          {(filters.driver || filters.car) && (
            <div className="info-block" style={{ padding: '0.625rem 0.875rem', margin: 0, fontSize: '0.8125rem' }}>
              <strong>Активні фільтри будуть застосовані:</strong>
              {filters.driver && <div>Водій: «{filters.driver}»</div>}
              {filters.car && <div>Авто: «{filters.car}»</div>}
            </div>
          )}

          {progress && (
            <div style={{ fontSize: '0.8125rem', color: 'var(--tx-3)', fontStyle: 'italic' }}>{progress}</div>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose} disabled={loading}>Скасувати</button>
          <button className="btn btn-primary" onClick={handleExport} disabled={loading}>
            {loading ? 'Генерація…' : `Експортувати ${format === 'pdf' ? 'PDF' : 'Excel'}`}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─── TripActions ──────────────────────────────────────────── */
const TripActions = ({ trip, onEdit, onDelete, hasPermission }) => {
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <div style={{ display: 'flex', gap: '0.25rem' }}>
        {hasPermission('can_edit_trips') && (
          <button className="btn btn-secondary btn-sm" onClick={() => onEdit(trip)}>Ред</button>
        )}
        {hasPermission('can_delete_trips') && (
          <button className="btn btn-danger btn-sm" onClick={() => setConfirm(true)}>Вид</button>
        )}
      </div>
      {confirm && (
        <DeleteConfirm
          onConfirm={() => { onDelete(trip.id); setConfirm(false); }}
          onCancel={() => setConfirm(false)}
        />
      )}
    </>
  );
};

/* ─── TripManagement ───────────────────────────────────────── */
const TripManagement = () => {
  const [trips, setTrips] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [cars, setCars] = useState([]);
  const [trailers, setTrailers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showForm, setShowForm] = useState(false);
  const [editingTrip, setEditingTrip] = useState(null);
  const [status, setStatus] = useState({ message: '', type: '' });

  const [showBulkDelete, setShowBulkDelete] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [showExport, setShowExport] = useState(false);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalTrips, setTotalTrips] = useState(0);

  const [filters, setFilters] = useState({ date: '', driver: '', car: '' });

  const { hasPermission, user } = useAuth();

  // Auto-dismiss success messages
  useEffect(() => {
    if (status.message && status.type === 'success') {
      const t = setTimeout(() => setStatus({ message: '', type: '' }), 4000);
      return () => clearTimeout(t);
    }
  }, [status]);

  useEffect(() => {
    (async () => {
      try {
        const s = await getSettings();
        setPageSize(s.trips_page_size || 25);
      } catch (e) { console.error(e); }
    })();
  }, []);

  const loadTrips = useCallback(async () => {
    setLoading(true);
    try {
      if (!navigator.onLine) {
        setStatus({ message: "Немає з'єднання з інтернетом", type: 'error' });
        setTrips([]); return;
      }

      const apiFilters = {};

      // BUG FIX: date filter — convert DD.MM.YYYY → YYYY-MM-DD
      if (filters.date) {
        const iso = toISO(filters.date);
        if (iso) apiFilters.date = iso;
      }

      // BUG FIX: driver role isolation
      if (user?.role === 'driver' && user?.driver_id) {
        apiFilters.driverId = user.driver_id;
      }

      // NOTE: driver/car text filters applied after fetch (client-side)
      // because supabase.js getTripsList doesn't support partial text search on joined tables

      const r = await getTripsList(currentPage, pageSize, apiFilters);
      let data = r.data || [];

      // Client-side text filtering
      if (filters.driver) {
        const q = filters.driver.toLowerCase();
        data = data.filter(t => (t.driver || '').toLowerCase().includes(q));
      }
      if (filters.car) {
        const q = filters.car.toLowerCase();
        data = data.filter(t =>
          (t.car || '').toLowerCase().includes(q) || (t.plate || '').toLowerCase().includes(q)
        );
      }

      setTrips(data);
      // Always use server-side total for correct pagination.
      // Client-side text filters (driver/car) narrow the visible rows but
      // don't change the real total — pagination stays accurate.
      setTotalTrips(r.total || 0);
      setStatus({ message: '', type: '' });
    } catch (e) {
      setStatus({ message: 'Помилка завантаження даних', type: 'error' });
      setTrips([]); setTotalTrips(0);
    } finally { setLoading(false); }
  }, [currentPage, pageSize, filters, user]);

  const loadDrivers = useCallback(async () => { try { setDrivers((await getDriversForSelect()) || []); } catch (e) { console.error(e); } }, []);
  const loadCars = useCallback(async () => { try { setCars((await getCarsForSelect()) || []); } catch (e) { console.error(e); } }, []);
  const loadTrailers = useCallback(async () => { try { setTrailers((await getTrailersForSelect()) || []); } catch (e) { console.error(e); } }, []);

  // Завантажуємо довідники один раз при монтуванні
  useEffect(() => {
    loadDrivers();
    loadCars();
    loadTrailers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Завантажуємо поїздки при зміні сторінки/фільтрів
  useEffect(() => {
    loadTrips();
  }, [loadTrips]);

  const pendingOvernight = useMemo(() => trips.filter(t => t.isOvernight && !t.endMileageRaw), [trips]);
  const totalDistance = useMemo(() => trips.reduce((s, t) => s + safeNumber(t.distance), 0), [trips]);
  const totalAmount = useMemo(() => trips.reduce((s, t) => s + safeNumber(t.amount), 0), [trips]);

  const submitting = useRef(false);

  const handleAddTrip = async (data) => {
    if (submitting.current) return false;
    if (!hasPermission('can_edit_trips')) { setStatus({ message: 'Недостатньо прав', type: 'error' }); return false; }
    if (!navigator.onLine) { setStatus({ message: "Немає з'єднання", type: 'error' }); return false; }
    submitting.current = true;
    setLoading(true);
    try {
      const r = await addTrip(data);
      if (r.success) {
        setStatus({ message: r.message, type: 'success' });
        await loadTrips(); await loadCars();
        setShowForm(false); setEditingTrip(null);
        return true;
      }
      setStatus({ message: r.message, type: 'error' });
    } catch (e) { setStatus({ message: netError(e), type: 'error' }); }
    finally { setLoading(false); submitting.current = false; }
    return false;
  };

  const handleUpdateTrip = async (data) => {
    if (submitting.current) return false;
    if (!hasPermission('can_edit_trips')) { setStatus({ message: 'Недостатньо прав', type: 'error' }); return false; }
    if (!navigator.onLine) { setStatus({ message: "Немає з'єднання", type: 'error' }); return false; }
    submitting.current = true;
    setLoading(true);
    try {
      const r = await updateTrip(data);
      if (r.success) {
        setStatus({ message: r.message, type: 'success' });
        await loadTrips(); await loadCars();
        setShowForm(false); setEditingTrip(null);
        return true;
      }
      setStatus({ message: r.message, type: 'error' });
    } catch (e) { setStatus({ message: netError(e), type: 'error' }); }
    finally { setLoading(false); submitting.current = false; }
    return false;
  };

  const handleDeleteTrip = async (id) => {
    if (!hasPermission('can_delete_trips')) { setStatus({ message: 'Недостатньо прав', type: 'error' }); return; }
    if (!navigator.onLine) { setStatus({ message: "Немає з'єднання", type: 'error' }); return; }
    setLoading(true);
    try {
      const r = await deleteTrip(id);
      if (r.success) {
        setStatus({ message: r.message, type: 'success' });
        if (trips.length === 1 && currentPage > 1) setCurrentPage(p => p - 1);
        else await loadTrips();
      } else { setStatus({ message: r.message, type: 'error' }); }
    } catch (e) { setStatus({ message: netError(e), type: 'error' }); }
    finally { setLoading(false); }
  };

  /* ── Bulk delete ── */
  const handleBulkDelete = async (startDate, endDate) => {
    if (!hasPermission('can_delete_trips')) { setStatus({ message: 'Недостатньо прав', type: 'error' }); return; }
    setBulkDeleting(true);
    try {
      const result = await bulkDeleteTrips(startDate, endDate);
      setShowBulkDelete(false);
      setCurrentPage(1);
      await loadTrips();
      setStatus({ message: result.message, type: 'success' });
    } catch (e) {
      setStatus({ message: 'Помилка видалення: ' + e.message, type: 'error' });
    } finally { setBulkDeleting(false); }
  };

  const handleFilterChange = (e) => {
    const { id, value } = e.target;
    setFilters(prev => ({ ...prev, [id]: value }));
    setCurrentPage(1);
  };
  const clearFilters = () => { setFilters({ date: '', driver: '', car: '' }); setCurrentPage(1); };
  const handlePageSizeChange = (n) => { setPageSize(n); setCurrentPage(1); };

  if (loading && !trips.length && currentPage === 1) {
    return <div className="loading"><div className="loading-spinner" />Завантаження…</div>;
  }

  const totalPages = Math.ceil(totalTrips / pageSize);

  return (
    <div className="container">
      {/* ── Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '0.75rem' }}>
        <h2 style={{ margin: 0, border: 'none', padding: 0 }}>Керування поїздками</h2>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {hasPermission('can_edit_trips') && (
            <button className="btn btn-primary btn-sm" onClick={() => { setEditingTrip(null); setShowForm(true); }}>
              + Додати
            </button>
          )}
          {hasPermission('can_export_data') && (
            <button
              className="btn btn-secondary btn-sm"
              onClick={() => setShowExport(true)}
              title="Експорт в PDF або Excel"
            >
              Експорт
            </button>
          )}
          {hasPermission('can_delete_trips') && (
            <button
              className="btn btn-sm"
              style={{ background: 'var(--red-50, #fef2f2)', color: 'var(--red-600)', border: '1px solid var(--red-200, #fecaca)' }}
              onClick={() => setShowBulkDelete(true)}
              title="Видалити поїздки за період"
            >
              Видалити за період
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={loadTrips}>Оновити</button>
        </div>
      </div>

      {status.message && <div className={`status ${status.type}`}>{status.message}</div>}

      {/* ── Overnight alert ── */}
      {pendingOvernight.length > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap',
          padding: '0.75rem 1rem', marginBottom: '1rem',
          background: 'var(--orange-50, #fff7ed)',
          border: '1px solid var(--orange-200, #fed7aa)',
          borderRadius: 'var(--r-lg)',
          borderLeft: '4px solid var(--orange-500, #f97316)',
        }}>
          <span style={{ fontSize: '1.1rem' }}>🌙</span>
          <span style={{ fontSize: '0.8125rem', color: 'var(--orange-800, #9a3412)', fontWeight: 500 }}>
            <strong>{pendingOvernight.length}</strong>
            {pendingOvernight.length === 1
              ? ' поїздка очікує повернення — не проставлений кінцевий кілометраж'
              : ' поїздок очікують повернення — не проставлений кінцевий кілометраж'}
          </span>
        </div>
      )}

      {/* ── Filters ── */}
      <div className="filters">
        <div className="filter-item">
          <label>Фільтр за датою</label>
          <input id="date" type="text" value={filters.date} onChange={handleFilterChange} placeholder="ДД.ММ.РРРР" />
        </div>
        <div className="filter-item">
          <label>Фільтр за водієм</label>
          {user?.role !== 'driver' && (
            <input id="driver" type="text" value={filters.driver} onChange={handleFilterChange} placeholder="ПІБ водія" />
          )}
        </div>
        <div className="filter-item">
          <label>Фільтр за номером</label>
          <input id="car" type="text" value={filters.car} onChange={handleFilterChange} placeholder="Номер авто" />
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button className="btn btn-secondary btn-sm" onClick={clearFilters}>Очистити</button>
        </div>
      </div>

      {/* ── Table or empty ── */}
      {!trips.length ? (
        <div className="no-data">
          <p>Немає даних про поїздки</p>
          {hasPermission('can_edit_trips') && (
            <button className="btn btn-primary" style={{ marginTop: '1rem' }} onClick={() => { setEditingTrip(null); setShowForm(true); }}>
              + Додати першу поїздку
            </button>
          )}
        </div>
      ) : (
        <>
          {/* Summary bar */}
          <div style={{
            display: 'flex', gap: '1.25rem', flexWrap: 'wrap',
            padding: '0.75rem 1rem', marginBottom: '1rem',
            background: 'var(--surface-sub)', border: '1px solid var(--bd-1)',
            borderRadius: 'var(--r-lg)', fontSize: '0.8125rem', color: 'var(--tx-3)',
          }}>
            <span>Показано: <strong style={{ color: 'var(--tx-1)' }}>{trips.length}</strong> з {totalTrips}</span>
            <span>Пробіг: <strong style={{ color: 'var(--blue-600)', fontFamily: 'var(--font-mono)' }}>{totalDistance.toLocaleString()} км</strong></span>
            <span>Сума: <strong style={{ color: 'var(--green-700)', fontFamily: 'var(--font-mono)' }}>{totalAmount.toFixed(2)} грн</strong></span>
          </div>

          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th><th>Дата</th><th>Водій</th><th>Автомобіль</th>
                  <th>Номер</th><th>Причіп</th><th>Маршрут</th><th>Пробіг</th>
                  <th>Сума</th><th>Дії</th>
                </tr>
              </thead>
              <tbody>
                {trips.map(t => (
                  <tr key={t.id} style={t.isOvernight && !t.endMileage ? { background: 'var(--orange-50, #fff7ed)' } : undefined}>
                    <td style={{ color: 'var(--tx-3)', fontFamily: 'var(--font-mono)', fontSize: '0.78rem' }}>#{t.id}</td>
                    <td>
                      {t.date}
                      {t.isOvernight && <span title="Ночівля" style={{ marginLeft: '0.35rem' }}>🌙</span>}
                    </td>
                    <td style={{ fontWeight: 500 }}>{t.driver}</td>
                    <td>{t.car}</td>
                    <td>
                      <span className="badge badge-blue" style={{ fontFamily: 'var(--font-mono)' }}>{t.plate}</span>
                    </td>
                    <td>
                      {t.trailer
                        ? <span className="badge badge-purple">{t.trailer}</span>
                        : <span style={{ color: 'var(--tx-4)' }}>—</span>}
                    </td>
                    <td style={{ color: 'var(--tx-2)' }}>{t.route || '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)' }}>
                      {t.isOvernight && !t.endMileageRaw
                        ? <span style={{ color: 'var(--orange-600, #ea580c)', fontSize: '0.8rem', fontWeight: 500 }}>очікує повернення</span>
                        : `${safeNumber(t.distance).toLocaleString()} км`}
                    </td>
                    <td style={{ fontWeight: 600, color: t.isOvernight && !t.endMileageRaw ? 'var(--tx-3)' : 'var(--green-700)', fontFamily: 'var(--font-mono)' }}>
                      {t.isOvernight && !t.endMileageRaw ? '—' : `${safeNumber(t.amount).toFixed(2)} грн`}
                    </td>
                    <td>
                      <TripActions
                        trip={t}
                        onEdit={trip => { setEditingTrip(trip); setShowForm(true); }}
                        onDelete={handleDeleteTrip}
                        hasPermission={hasPermission}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage} totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={pageSize} onPageSizeChange={handlePageSizeChange}
            total={totalTrips}
          />
        </>
      )}

      {/* ── Modals ── */}
      <TripFormModal
        show={showForm}
        onClose={() => { setShowForm(false); setEditingTrip(null); }}
        onSubmit={editingTrip ? handleUpdateTrip : handleAddTrip}
        trip={editingTrip}
        drivers={drivers} cars={cars} trailers={trailers}
        loading={loading}
      />

      <BulkDeleteModal
        show={showBulkDelete}
        onClose={() => setShowBulkDelete(false)}
        onConfirm={handleBulkDelete}
        loading={bulkDeleting}
      />

      <ExportModal
        show={showExport}
        onClose={() => setShowExport(false)}
        filters={filters}
        user={user}
        drivers={drivers}
      />
    </div>
  );
};

export default TripManagement;
