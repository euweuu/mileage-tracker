import React, { useState, useCallback, useRef } from 'react';

const Icon = ({ d, size = 16, ...props }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth="1.75" strokeLinecap="round"
    strokeLinejoin="round" {...props}>
    {d}
  </svg>
);
const PlusIcon = () => <Icon d={<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>} />;
const TrashIcon = () => <Icon size={14} d={<><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6" /><path d="M14 11v6" /><path d="M9 6V4h6v2" /></>} />;


const toNum = (v) => {
  const n = parseFloat(String(v).replace(/\s/g, '').replace(',', '.'));
  return isFinite(n) && n > 0 ? n : 0;
};

const fmt = (n, dec = 1) =>
  typeof n === 'number' && isFinite(n)
    ? n.toLocaleString('uk-UA', { minimumFractionDigits: dec, maximumFractionDigits: dec })
    : '0,0';

const COLORS = [
  '#2563eb', '#16a34a', '#7c3aed', '#ea580c', '#0891b2', '#be123c',
];


const RouteCalculator = () => {
  const _idRef = useRef(100);
  const uid = useCallback(() => ++_idRef.current, []);

  const [factKm, setFactKm] = useState('');
  const [bases, setBases] = useState([
    { id: 1, name: 'ПIK ПД', sum: '0' },
    { id: 2, name: 'ПIK ПК', sum: '0' },
  ]);

  const numFactKm = toNum(factKm);

  // Общая сумма всех маршрутов
  const totalSum = bases.reduce((s, b) => s + toNum(b.sum), 0);

  // Расчёт для каждой базы по логике Excel
  const rows = bases.map((b, i) => {
    const sum = toNum(b.sum);
    const share = totalSum > 0 ? (sum / totalSum) * 100 : 0;
    const factKmAdjusted = numFactKm > 0 ? numFactKm : 0;
    const correctedKm = factKmAdjusted - (factKmAdjusted * share / 100);
    const mlLength = factKmAdjusted - correctedKm; // то же самое: factKmAdjusted * share / 100

    return {
      ...b,
      sum,
      share,
      correctedKm,      // E = Факт_км - Факт_км * Доля%
      mlLength,         // F = Факт_км * Доля%
      color: COLORS[i % COLORS.length]
    };
  });

  const setSum = useCallback((id, v) => {
    setBases(p => p.map(b => b.id === id ? { ...b, sum: v } : b));
  }, []);

  const setName = useCallback((id, v) => {
    setBases(p => p.map(b => b.id === id ? { ...b, name: v } : b));
  }, []);

  const remove = useCallback((id) => {
    if (bases.length > 1) setBases(p => p.filter(b => b.id !== id));
  }, [bases.length]);

  const add = () => {
    const letter = String.fromCharCode(1040 + bases.length);
    setBases(p => [...p, { id: uid(), name: `Маршрут ${letter}`, sum: '0' }]);
  };

  const reset = () => {
    setBases([
      { id: 1, name: 'ПIK ПД', sum: '0' },
      { id: 2, name: 'ПIK ПК', sum: '0' },
    ]);
    _idRef.current = 100;
    setFactKm('');
  };

  const th = {
    padding: '0.6rem 0.875rem', textAlign: 'right', fontWeight: 600,
    fontSize: '0.8rem', color: 'var(--tx-3)', borderBottom: '2px solid var(--bd-1)',
    background: 'var(--bg,#f9fafb)', whiteSpace: 'nowrap'
  };
  const thL = { ...th, textAlign: 'left' };
  const td = (extra) => ({
    padding: '0.6rem 0.875rem', textAlign: 'right',
    fontFamily: 'var(--font-mono)', fontSize: '0.875rem',
    borderBottom: '1px solid var(--bd-1)', ...extra
  });
  const tdL = (extra) => ({ ...td(extra), textAlign: 'left' });

  return (
    <div className="container">
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: '1.5rem', borderBottom: '1px solid var(--bd-1)', paddingBottom: '1rem'
      }}>
        <h2 style={{ margin: 0, border: 'none', padding: 0 }}>Калькулятор маршруту</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button className="btn btn-primary btn-sm" onClick={add}
            style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <PlusIcon /> Додати маршрут
          </button>
          <button className="btn btn-secondary btn-sm" onClick={reset}>Скинути</button>
        </div>
      </div>

      <div className="info-block" style={{ marginBottom: '1.5rem' }}>
        <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--tx-2)' }}>
          Вхідні параметри
        </h3>
        <div className="form-row" style={{ marginBottom: '1.25rem' }}>
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label>Факт км (загальний пробіг)</label>
            <input type="text" inputMode="numeric"
              value={factKm}
              onChange={e => setFactKm(e.target.value)}
              placeholder="наприклад: 340"
              style={{ fontWeight: 600, fontSize: '1rem' }}
            />
          </div>
        </div>
      </div>

      {/* Таблица маршрутов (как в Excel) */}
      <div className="table-container">
        <table style={{ borderCollapse: 'collapse', width: '100%' }}>
          <thead>
            <tr>
              <th style={thL}>Маршрут</th>
              <th style={th}>Сума маршруту (грн)</th>
              <th style={th}>Доля в процентах (%)</th>
              <th style={th}>Факт км (заг.)</th>
              <th style={th}>Протяжність МЛ (км)</th>
              <th style={{ ...th, textAlign: 'center', width: '36px' }} />
            </tr>
          </thead>
          <tbody>
            {rows.map(row => (
              <tr key={row.id}>
                <td style={tdL()}>
                  <span style={{
                    display: 'inline-block', width: 8, height: 8,
                    borderRadius: '50%', background: row.color,
                    marginRight: '0.5rem', verticalAlign: 'middle'
                  }} />
                  <input
                    value={row.name}
                    onChange={e => setName(row.id, e.target.value)}
                    style={{
                      border: 'none', background: 'transparent', fontWeight: 600,
                      fontSize: '0.875rem', width: 'auto', minWidth: '80px',
                      padding: 0, margin: 0, fontFamily: 'inherit'
                    }}
                  />
                </td>
                <td style={td({ fontWeight: 700, color: row.sum > 0 ? row.color : 'var(--tx-1)' })}>
                  <input
                    type="text" inputMode="numeric"
                    value={row.sum === 0 ? '' : row.sum}
                    onChange={e => setSum(row.id, e.target.value)}
                    placeholder="0"
                    style={{
                      width: '120px', textAlign: 'right', fontWeight: 'inherit',
                      border: '1px solid var(--bd-1)', borderRadius: '4px',
                      padding: '0.2rem 0.4rem', background: 'var(--surface)'
                    }}
                  />
                </td>
                <td style={td()}>
                  {fmt(row.share, 2)}%
                </td>
                <td style={td()}>
                  {numFactKm > 0 ? fmt(numFactKm) : '—'}
                </td>
                <td style={td({ fontWeight: 700, color: row.mlLength > 0 ? '#2563eb' : 'var(--tx-1)' })}>
                  {fmt(row.mlLength, 2)}
                </td>
                <td style={td({ textAlign: 'center', padding: '0.3rem 0.4rem', borderBottom: '1px solid var(--bd-1)' })}>
                  <button
                    onClick={() => remove(row.id)}
                    disabled={bases.length <= 1}
                    title="Видалити маршрут"
                    style={{
                      background: 'none', border: 'none', cursor: bases.length <= 1 ? 'not-allowed' : 'pointer',
                      color: bases.length <= 1 ? 'var(--tx-4, #cbd5e1)' : 'var(--red-500, #ef4444)',
                      padding: '0.2rem', borderRadius: '4px', display: 'inline-flex',
                      alignItems: 'center', justifyContent: 'center',
                      transition: 'color 0.15s, background 0.15s',
                    }}
                    onMouseEnter={e => { if (bases.length > 1) e.currentTarget.style.background = 'var(--red-50, #fef2f2)'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                  >
                    <TrashIcon />
                  </button>
                </td>
              </tr>
            ))}

            {/* Підсумковий рядок */}
            <tr style={{ background: 'var(--bg,#f9fafb)', fontWeight: 700 }}>
              <td style={tdL({ borderBottom: 'none' })}>
                <strong>Загальна сума</strong>
              </td>
              <td style={td({ borderBottom: 'none', fontSize: '1rem' })}>
                {fmt(totalSum, 2)} грн
              </td>
              <td style={td({ borderBottom: 'none' })}>100%</td>
              <td style={td({ borderBottom: 'none' })}>{numFactKm > 0 ? fmt(numFactKm) : '0'}</td>
              <td style={td({ borderBottom: 'none' })}>
                {fmt(rows.reduce((s, r) => s + r.mlLength, 0), 2)}
              </td>
              <td style={td({ borderBottom: 'none' })} />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RouteCalculator;