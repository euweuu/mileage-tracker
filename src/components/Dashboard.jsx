import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getAllTrips, getDriversList, getAllCars } from '../services/supabase';
import { safeNumber, isSameDay } from '../utils/safeHelpers';

const StatIcon = ({ d, size = 20 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
    {d}
  </svg>
);

const TripsIcon = () => <StatIcon d={<polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />} />;
const DriversIcon = () => <StatIcon d={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>} />;
const CarsIcon = () => <StatIcon d={<><path d="M5 17H3a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2h-2" /><circle cx="7" cy="17" r="2" /><circle cx="17" cy="17" r="2" /><path d="M5 9l2-4h10l2 4" /></>} />;
const MileageIcon = () => <StatIcon d={<><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /><line x1="2" y1="20" x2="22" y2="20" /></>} />;

const Dashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalTrips: 0,
    totalDrivers: 0,
    totalCars: 0,
    totalMileage: 0,
    todayTrips: 0,
    todayMileage: 0,
    activeDrivers: 0,
    activeCars: 0
  });
  const [recentTrips, setRecentTrips] = useState([]);
  const [topDrivers, setTopDrivers] = useState([]);
  const [pendingOvernight, setPendingOvernight] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    setError('');
    setStats({
      totalTrips: 0, totalDrivers: 0, totalCars: 0, totalMileage: 0,
      todayTrips: 0, todayMileage: 0, activeDrivers: 0, activeCars: 0
    });
    setRecentTrips([]);
    setTopDrivers([]);

    try {
      const [tripsData, driversData, carsData] = await Promise.all([
        getAllTrips(),
        getDriversList(1, 1000),
        getAllCars()
      ]);

      const trips = Array.isArray(tripsData) ? tripsData : [];

      let drivers = [];
      if (driversData && typeof driversData === 'object') {
        if (Array.isArray(driversData)) drivers = driversData;
        else if (driversData.data && Array.isArray(driversData.data)) drivers = driversData.data;
      }

      let cars = [];
      if (carsData && typeof carsData === 'object') {
        if (Array.isArray(carsData)) cars = carsData;
        else if (carsData.data && Array.isArray(carsData.data)) cars = carsData.data;
      }

      const today = new Date().toISOString().split('T')[0];

      // Виключаємо ночівлі без кінцевого пробігу з підрахунку
      const completedTrips = trips.filter(trip => !(trip?.isOvernight && trip?.endMileageRaw == null));

      const todayTrips = completedTrips.filter(trip => {
        const tripDate = trip?.dateOriginal || trip?.date;
        if (tripDate && typeof tripDate === 'string') {
          try {
            if (tripDate.includes('.')) {
              const parts = tripDate.split('.');
              if (parts.length === 3 && parts[0] && parts[1] && parts[2]) {
                const [day, month, year] = parts;
                return isSameDay(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`, today);
              }
            } else {
              return isSameDay(tripDate, today);
            }
          } catch (e) {
            console.error('Помилка розбору дати:', tripDate);
          }
        }
        return false;
      });

      const totalMileage = completedTrips.reduce((sum, trip) => sum + safeNumber(trip.distance), 0);
      const todayMileage = todayTrips.reduce((sum, trip) => sum + safeNumber(trip.distance), 0);

      setStats({
        totalTrips: trips.length,
        totalDrivers: drivers.length,
        totalCars: cars.length,
        totalMileage,
        todayTrips: todayTrips.length,
        todayMileage,
        activeDrivers: drivers.filter(d => d.active).length,
        activeCars: cars.filter(c => c.active).length
      });

      setRecentTrips(trips.slice(0, 5));

      // Overnight trips awaiting return (end_mileage not set)
      const pending = trips.filter(trip => trip.isOvernight && trip.endMileageRaw == null);
      setPendingOvernight(pending);

      const driverStats = {};
      completedTrips.forEach(trip => {
        if (!trip.driverId) return;
        if (!driverStats[trip.driverId]) {
          driverStats[trip.driverId] = { id: trip.driverId, name: trip.driver, trips: 0, mileage: 0 };
        }
        driverStats[trip.driverId].trips++;
        driverStats[trip.driverId].mileage += safeNumber(trip.distance);
      });

      setTopDrivers(Object.values(driverStats).sort((a, b) => b.mileage - a.mileage).slice(0, 5));
    } catch (error) {
      console.error('Помилка завантаження даних дашборду:', error);
      if (error.message?.includes('Failed to fetch') || !navigator.onLine) {
        setError('Помилка мережі. Перевірте з\'єднання з інтернетом.');
      } else {
        setError('Помилка завантаження даних. Спробуйте пізніше.');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatNumber = (value) => new Intl.NumberFormat('uk-UA').format(value);

  if (loading) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
        Завантаження даних...
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <h2>Панель керування</h2>
        <div className="status error">{error}</div>
        <button className="btn btn-primary" onClick={loadDashboardData}>
          Спробувати знову
        </button>
      </div>
    );
  }

  const statCards = [
    { icon: <TripsIcon />, value: formatNumber(stats.totalTrips), label: 'Всього поїздок', trend: `+${stats.todayTrips} сьогодні` },
    { icon: <DriversIcon />, value: `${stats.activeDrivers}/${stats.totalDrivers}`, label: 'Активні водії', trend: `${stats.activeDrivers} в роботі` },
    { icon: <CarsIcon />, value: `${stats.activeCars}/${stats.totalCars}`, label: 'Активні авто', trend: `${stats.activeCars} на лінії` },
    { icon: <MileageIcon />, value: `${formatNumber(stats.totalMileage)} км`, label: 'Загальний пробіг', trend: `+${formatNumber(stats.todayMileage)} км сьогодні` }
  ];

  return (
    <div className="container">
      <h2>Панель керування</h2>

      <div style={{ marginBottom: '1.75rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem', flexWrap: 'wrap' }}>
          <span className="badge badge-blue" style={{ fontSize: '0.8125rem', padding: '0.3rem 0.75rem' }}>
            {new Date().toLocaleDateString('uk-UA', { day: 'numeric', month: 'long', year: 'numeric' })}
          </span>
          <span style={{ fontSize: '0.9rem', color: 'var(--tx-2)' }}>
            Ласкаво просимо, <strong style={{ color: 'var(--tx-1)' }}>{user?.name}</strong>!
          </span>
        </div>
        <button className="btn btn-secondary btn-sm" onClick={loadDashboardData} style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          <span>↻</span> Оновити
        </button>
      </div>

      {pendingOvernight.length > 0 && (
        <div
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            gap: '0.75rem', flexWrap: 'wrap',
            padding: '0.875rem 1.125rem', marginBottom: '1.5rem',
            background: 'var(--orange-50, #fff7ed)',
            border: '1px solid var(--orange-200, #fed7aa)',
            borderRadius: 'var(--r-lg)',
            borderLeft: '4px solid var(--orange-500, #f97316)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
            <span style={{ fontSize: '1.25rem' }}>🌙</span>
            <div>
              <div style={{ fontWeight: 600, fontSize: '0.875rem', color: 'var(--orange-800, #9a3412)', marginBottom: '0.15rem' }}>
                Очікує повернення: {pendingOvernight.length}
              </div>
              <div style={{ fontSize: '0.8rem', color: 'var(--orange-700, #c2410c)' }}>
                {pendingOvernight.length === 1
                  ? 'Є 1 поїздка без проставленого кінцевого кілометражу'
                  : `Є ${pendingOvernight.length} поїздок без проставленого кінцевого кілометражу`}
              </div>
            </div>
          </div>
          <button
            className="btn btn-sm"
            style={{
              background: 'var(--orange-500, #f97316)', color: '#fff',
              border: 'none', fontWeight: 600, fontSize: '0.8rem',
            }}
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: 'trips' }))}
          >
            Переглянути
          </button>
        </div>
      )}

      <div className="stats-grid">
        {statCards.map((stat, index) => (
          <div key={index} className="stat-card">
            <div className="stat-icon">{stat.icon}</div>
            <div className="stat-value">{stat.value}</div>
            <div className="stat-label">{stat.label}</div>
            <div className="stat-trend positive">{stat.trend}</div>
          </div>
        ))}
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <h3>Останні поїздки</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Дата</th>
                <th>Водій</th>
                <th>Автомобіль</th>
                <th>Пробіг</th>
              </tr>
            </thead>
            <tbody>
              {recentTrips.length > 0 ? (
                recentTrips.map(trip => (
                  <tr key={trip.id}>
                    <td>{trip.date}</td>
                    <td style={{ fontWeight: 500 }}>{trip.driver}</td>
                    <td>
                      {trip.car}{' '}
                      <span style={{ color: 'var(--tx-3)', fontSize: '0.8rem' }}>({trip.plate})</span>
                    </td>
                    <td>{formatNumber(trip.distance)} км</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" style={{ textAlign: 'center', color: 'var(--tx-3)', padding: '2rem' }}>
                    Немає даних про поїздки
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {topDrivers.length > 0 && (
        <div>
          <h3>Топ водіїв за пробігом</h3>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Водій</th>
                  <th>Поїздки</th>
                  <th>Пробіг</th>
                </tr>
              </thead>
              <tbody>
                {topDrivers.map(driver => (
                  <tr key={driver.id}>
                    <td style={{ fontWeight: 500 }}>{driver.name}</td>
                    <td>{driver.trips}</td>
                    <td>{formatNumber(driver.mileage)} км</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;