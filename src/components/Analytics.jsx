import React, { useState, useEffect, useRef, useCallback } from 'react';
import { getDriversForSelect, getAnalyticsData } from '../services/supabase';
import { safeNumber } from '../utils/safeHelpers';
import Chart from 'chart.js/auto';

/* ─── helpers ─────────────────────────────────────────────── */
const fmt = (n) => safeNumber(n).toLocaleString('uk-UA');
const fmtChange = (c) => {
  const v = safeNumber(c);
  if (!v) return null;
  return (v > 0 ? '+' : '') + v.toFixed(1) + '%';
};

/* ─── component ───────────────────────────────────────────── */
const Analytics = () => {
  const [drivers, setDrivers]   = useState([]);
  const [data,    setData]      = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error,   setError]     = useState('');
  const [filters, setFilters]   = useState({ startDate: '', endDate: '', driverId: 'all' });

  const mileageRef  = useRef(null);
  const tripsRef    = useRef(null);
  const driversRef  = useRef(null);
  const carsRef     = useRef(null);
  const chartsRef   = useRef({});
  const abortRef    = useRef(null);

  /* ── chart helpers ─────────────────────────────────────── */
  const destroyCharts = useCallback(() => {
    Object.values(chartsRef.current).forEach(c => {
      if (c && typeof c.destroy === 'function') {
        c.destroy();
      }
    });
    chartsRef.current = {};
  }, []);

  /* ── init helpers ──────────────────────────────────────── */
  const setCurrentMonth = useCallback(() => {
    const now  = new Date();
    const y    = now.getFullYear();
    const m    = String(now.getMonth() + 1).padStart(2, '0');
    const last = String(new Date(y, now.getMonth() + 1, 0).getDate()).padStart(2, '0');
    setFilters({ startDate: `${y}-${m}-01`, endDate: `${y}-${m}-${last}`, driverId: 'all' });
  }, []);

  const loadDrivers = useCallback(async () => {
    try { setDrivers((await getDriversForSelect()) || []); }
    catch (e) { console.error(e); }
  }, []);

  /* ── lifecycle ─────────────────────────────────────────── */
  useEffect(() => {
    const initAnalytics = async () => {
      setCurrentMonth();
      await loadDrivers();
    };
    
    initAnalytics();
    return () => {
      destroyCharts();
      abortRef.current?.abort();
    };
  }, [setCurrentMonth, loadDrivers, destroyCharts]);

  const createCharts = useCallback((d) => {
    destroyCharts();
    const nc = {};

    /* Mileage line */
    if (mileageRef.current && d.timeline) {
      nc.mileage = new Chart(mileageRef.current, {
        type: 'line',
        data: {
          labels: d.timeline.labels || [],
          datasets: [{
            label: 'Пробіг (км)',
            data: d.timeline.mileage || [],
            borderColor:     'rgba(59,130,246,1)',
            backgroundColor: 'rgba(59,130,246,0.1)',
            tension: 0.4,
            fill: true,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: { callbacks: { label: ctx => `${safeNumber(ctx.raw).toLocaleString()} км` } },
          },
        },
      });
    }

    /* Trips bar */
    if (tripsRef.current && d.timeline) {
      nc.trips = new Chart(tripsRef.current, {
        type: 'bar',
        data: {
          labels: d.timeline.labels || [],
          datasets: [{
            label: 'Кількість поїздок',
            data: d.timeline.trips || [],
            backgroundColor: 'rgba(34,197,94,0.7)',
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { display: false } },
        },
      });
    }

    /* Drivers bar */
    if (driversRef.current && d.drivers?.length) {
      const sorted = [...d.drivers].sort((a, b) => safeNumber(b.totalMileage) - safeNumber(a.totalMileage));
      const maxM   = Math.max(...sorted.map(dr => safeNumber(dr.totalMileage)), 1);
      nc.drivers = new Chart(driversRef.current, {
        type: 'bar',
        data: {
          labels: sorted.map(dr => dr.name || 'Невідомо'),
          datasets: [{
            label: 'Пробіг (км)',
            data: sorted.map(dr => safeNumber(dr.totalMileage)),
            backgroundColor: ctx => {
              const ratio = safeNumber(ctx.raw) / maxM;
              return `rgba(59,130,246,${(0.3 + ratio * 0.7).toFixed(2)})`;
            },
            borderColor: 'rgba(59,130,246,1)',
            borderWidth: 1,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => {
                  const v     = safeNumber(ctx.raw);
                  const total = safeNumber(d.summary?.totalMileage);
                  const pct   = total > 0 ? ((v / total) * 100).toFixed(1) : '0';
                  return `${v.toLocaleString()} км (${pct}%)`;
                },
              },
            },
          },
          scales: { y: { beginAtZero: true, ticks: { callback: v => safeNumber(v).toLocaleString() } } },
        },
      });
    }

    /* Cars horizontal bar */
    if (carsRef.current && d.cars?.length) {
      const sorted = [...d.cars].sort((a, b) => safeNumber(b.totalMileage) - safeNumber(a.totalMileage));
      nc.cars = new Chart(carsRef.current, {
        type: 'bar',
        data: {
          labels: sorted.map(c => c.name || 'Невідомо'),
          datasets: [{
            label: 'Пробіг (км)',
            data: sorted.map(c => safeNumber(c.totalMileage)),
            backgroundColor: ctx =>
              sorted[ctx.dataIndex]?.hasTrailer
                ? 'rgba(168,85,247,0.7)'
                : 'rgba(100,116,139,0.55)',
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false, indexAxis: 'y',
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: ctx => {
                  const car = sorted[ctx.dataIndex];
                  const t   = car?.hasTrailer ? ` (з причепом ${car.trailer || ''})` : '';
                  return `${car?.name || ''}${t}: ${safeNumber(ctx.raw).toLocaleString()} км`;
                },
              },
            },
          },
        },
      });
    }

    chartsRef.current = nc;
  }, [destroyCharts]);

  /* ── load analytics ───────────────────────────────────── */
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const loadAnalytics = async () => {
    if (!filters.startDate || !filters.endDate) { setError('Виберіть період'); return; }
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError('');
    try {
      const result = await getAnalyticsData(
        filters.startDate, filters.endDate, filters.driverId, abortRef.current.signal,
      );
      if (abortRef.current.signal.aborted) return;
      setData(result);
      requestAnimationFrame(() => createCharts(result));
    } catch (e) {
      if (e.name === 'AbortError' || e.name === 'CanceledError') return;
      if (abortRef.current?.signal.aborted) return;
      setError(!navigator.onLine ? 'Помилка мережі. Перевірте з\'єднання.' : 'Помилка: ' + e.message);
    } finally {
      if (!abortRef.current?.signal.aborted) setLoading(false);
    }
  };

  /* ── render ───────────────────────────────────────────── */
  return (
    <div className="container">
      <h2>Аналітика та звіти</h2>

      {/* Фільтри */}
      <div className="filters">
        <div className="filter-item">
          <label>Дата з</label>
          <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
        </div>
        <div className="filter-item">
          <label>Дата по</label>
          <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
        </div>
        <div className="filter-item">
          <label>Водій</label>
          <select name="driverId" value={filters.driverId} onChange={handleFilterChange}>
            <option value="all">Всі водії</option>
            {drivers.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', alignItems: 'flex-end' }}>
          <button className="btn btn-primary" onClick={loadAnalytics} disabled={loading}>
            {loading ? 'Завантаження...' : 'Оновити'}
          </button>
        </div>
      </div>

      {error && <div className="status error">{error}</div>}

      {loading ? (
        <div className="loading"><div className="loading-spinner" />Завантаження аналітики…</div>
      ) : data ? (
        <>
          {/* ── Summary cards ─────────────────────────────── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))',
            gap: '0.875rem',
            marginBottom: '1.75rem',
          }}>
            {[
              {
                value: `${fmt(data.summary?.totalMileage)} км`,
                label: 'Загальний пробіг',
                color: 'var(--blue-600)',
                change: data.summary?.mileageChange,
              },
              {
                value: fmt(data.summary?.totalTrips),
                label: 'Кількість поїздок',
                color: 'var(--green-600)',
                change: data.summary?.tripsChange,
              },
              {
                value: `${fmt(data.summary?.avgDistance)} км`,
                label: 'Середня відстань',
                color: 'var(--amber-600)',
                change: data.summary?.avgDistanceChange,
              },
              {
                value: fmt(data.summary?.activeDrivers),
                label: 'Активні водії',
                color: 'var(--purple-600)',
                change: null,
              },
            ].map((card, i) => (
              <div key={i} style={{
                background: 'var(--surface)',
                border: '1px solid var(--bd-1)',
                borderRadius: 'var(--r-xl)',
                padding: '1.25rem',
                textAlign: 'center',
              }}>
                <div style={{
                  fontSize: '1.75rem',
                  fontWeight: 600,
                  letterSpacing: '-0.04em',
                  color: card.color,
                  lineHeight: 1.1,
                }}>
                  {card.value}
                </div>
                <div style={{ fontSize: '0.8rem', color: 'var(--tx-3)', margin: '0.3rem 0' }}>
                  {card.label}
                </div>
                {card.change !== null && fmtChange(card.change) && (
                  <div style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.72rem',
                    color: safeNumber(card.change) > 0 ? 'var(--green-600)' : 'var(--red-600)',
                  }}>
                    {fmtChange(card.change)}
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* ── Timeline charts ────────────────────────────── */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px,1fr))',
            gap: '1.25rem',
            marginBottom: '1.75rem',
          }}>
            {[
              { title: 'Динаміка пробігу', ref: mileageRef },
              { title: 'Кількість поїздок', ref: tripsRef },
            ].map((ch) => (
              <div key={ch.title} style={{
                background: 'var(--surface)',
                border: '1px solid var(--bd-1)',
                borderRadius: 'var(--r-xl)',
                padding: '1.375rem',
              }}>
                <h3 style={{ margin: '0 0 1rem' }}>{ch.title}</h3>
                <div style={{ position: 'relative', height: '280px' }}>
                  <canvas ref={ch.ref} />
                </div>
              </div>
            ))}
          </div>

          {/* ── Drivers chart ──────────────────────────────── */}
          {data.drivers?.length > 0 && (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--bd-1)',
              borderRadius: 'var(--r-xl)',
              padding: '1.375rem',
              marginBottom: '1.75rem',
            }}>
              <h3 style={{ margin: '0 0 1rem' }}>Пробіг по водіях (км)</h3>
              <div style={{ position: 'relative', height: '360px' }}>
                <canvas ref={driversRef} />
              </div>
            </div>
          )}

          {/* ── Cars chart ─────────────────────────────────── */}
          {data.cars?.length > 0 && (
            <div style={{
              background: 'var(--surface)',
              border: '1px solid var(--bd-1)',
              borderRadius: 'var(--r-xl)',
              padding: '1.375rem',
              marginBottom: '1.75rem',
            }}>
              <h3 style={{ margin: '0 0 1rem' }}>
                Пробіг по автомобілях
                <span style={{
                  marginLeft: '0.75rem',
                  fontSize: '0.75rem',
                  fontWeight: 400,
                  color: 'var(--tx-3)',
                }}>
                  (фіолетові — з причепом)
                </span>
              </h3>
              <div style={{ position: 'relative', height: '360px' }}>
                <canvas ref={carsRef} />
              </div>
            </div>
          )}

          {/* ── Drivers table ──────────────────────────────── */}
          {data.drivers?.length > 0 && (
            <div style={{ marginBottom: '1.75rem' }}>
              <h3>Детальна статистика по водіях</h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Водій</th>
                      <th>Поїздок</th>
                      <th>Загальний пробіг</th>
                      <th>Середній пробіг</th>
                      <th>Макс. пробіг</th>
                      <th>Відсоток</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.drivers.map((driver, i) => {
                      const totalM = safeNumber(data.summary?.totalMileage);
                      const pct    = totalM > 0
                        ? ((safeNumber(driver.totalMileage) / totalM) * 100).toFixed(1)
                        : '0';
                      return (
                        <tr key={i}>
                          <td style={{ fontWeight: 500 }}>{driver.name || 'Невідомо'}</td>
                          <td>{fmt(driver.totalTrips)}</td>
                          <td>{fmt(driver.totalMileage)} км</td>
                          <td>{fmt(driver.avgMileage)} км</td>
                          <td>{fmt(driver.maxMileage)} км</td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.78rem',
                                color: 'var(--tx-2)',
                                minWidth: '3ch',
                              }}>
                                {pct}%
                              </span>
                              <div style={{
                                flex: 1,
                                maxWidth: '60px',
                                height: '5px',
                                background: 'var(--surface-sel)',
                                borderRadius: 'var(--r-full)',
                                overflow: 'hidden',
                              }}>
                                <div style={{
                                  width: `${pct}%`,
                                  height: '100%',
                                  background: 'var(--blue-600)',
                                  borderRadius: 'var(--r-full)',
                                }} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: 'var(--surface-sub)', fontWeight: 600 }}>
                      <td>ВСЬОГО</td>
                      <td>{fmt(data.summary?.totalTrips)}</td>
                      <td>{fmt(data.summary?.totalMileage)} км</td>
                      <td>{fmt(data.summary?.avgDistance)} км</td>
                      <td></td>
                      <td style={{ fontFamily: 'var(--font-mono)' }}>100%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          )}

          {/* ── Cars table ─────────────────────────────────── */}
          {data.cars?.length > 0 && (
            <div style={{ marginBottom: '1.75rem' }}>
              <h3>Статистика по автомобілях</h3>
              <div className="table-container">
                <table>
                  <thead>
                    <tr>
                      <th>Автомобіль</th>
                      <th>Номер</th>
                      <th>Причіп</th>
                      <th>Поїздки</th>
                      <th>Пробіг</th>
                      <th>Середній</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.cars.map((car, i) => (
                      <tr key={i}>
                        <td style={{ fontWeight: 500 }}>{car.name || 'Невідомо'}</td>
                        <td>
                          <span className="badge badge-blue" style={{ fontFamily: 'var(--font-mono)' }}>
                            {car.plate || '—'}
                          </span>
                        </td>
                        <td>
                          {car.hasTrailer && car.trailer
                            ? <span className="badge badge-purple">{car.trailer}</span>
                            : <span style={{ color: 'var(--tx-4)' }}>—</span>}
                        </td>
                        <td>{fmt(car.totalTrips)}</td>
                        <td>{fmt(car.totalMileage)} км</td>
                        <td>{fmt(car.avgMileage)} км</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="no-data">
          Виберіть період і натисніть «Оновити»
        </div>
      )}
    </div>
  );
};

export default Analytics;
