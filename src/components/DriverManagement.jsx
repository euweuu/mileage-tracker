import React, { useState, useEffect, useCallback } from 'react';
import { getDriversList, addDriver, updateDriver, deleteDriver, getSettings } from '../services/supabase';
import { formatPhone } from '../utils/safeHelpers';
import { useAuth } from '../contexts/AuthContext';
import Pagination from './Pagination';

const DriverManagement = () => {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingDriver, setEditingDriver] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [status, setStatus] = useState({ message: '', type: '' });

  // Auto-dismiss success messages after 4 seconds
  useEffect(() => {
    if (status.message && status.type === 'success') {
      const timer = setTimeout(() => setStatus({ message: '', type: '' }), 4000);
      return () => clearTimeout(timer);
    }
  }, [status]);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalDrivers, setTotalDrivers] = useState(0);

  const [newDriver, setNewDriver] = useState({ fullName: '', licenseNumber: '', phone: '' });

  const { hasPermission } = useAuth();

  const loadSettings = useCallback(async () => {
    try {
      const data = await getSettings();
      setPageSize(data.drivers_page_size || 25);
    } catch (error) {
      console.error('Помилка завантаження налаштувань:', error);
    }
  }, []);

  const loadDrivers = useCallback(async () => {
    setLoading(true);
    setStatus({ message: '', type: '' });
    try {
      const result = await getDriversList(currentPage, pageSize);
      setDrivers(result.data || []);
      setTotalDrivers(result.total || 0);
    } catch (error) {
      console.error('Помилка завантаження водіїв:', error);
      if (error.message?.includes('Failed to fetch') || !navigator.onLine) {
        setStatus({ message: 'Помилка мережі. Перевірте з\'єднання.', type: 'error' });
      } else {
        setStatus({ message: 'Помилка завантаження даних', type: 'error' });
      }
    } finally {
      setLoading(false);
    }
  }, [currentPage, pageSize]);

  useEffect(() => { loadSettings(); }, [loadSettings]);
  useEffect(() => { loadDrivers(); }, [loadDrivers]);
  // Закриваємо форму редагування при зміні сторінки
  useEffect(() => { setEditingDriver(null); }, [currentPage]);

  const handleAddDriver = async (e) => {
    e.preventDefault();
    if (!hasPermission('can_edit_drivers')) {
      setStatus({ message: 'Недостатньо прав для додавання', type: 'error' });
      return;
    }
    if (!newDriver.fullName?.trim()) {
      setStatus({ message: 'Введіть ПІБ водія', type: 'error' });
      return;
    }
    setLoading(true);
    try {
      const result = await addDriver(newDriver);
      if (result.success) {
        setStatus({ message: result.message, type: 'success' });
        setNewDriver({ fullName: '', licenseNumber: '', phone: '' });
        setShowAddForm(false);
        setCurrentPage(1);
        await loadDrivers();
      } else {
        setStatus({ message: result.message, type: 'error' });
      }
    } catch (error) {
      setStatus({ message: 'Помилка: ' + error.message, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (driver) => {
    if (!hasPermission('can_edit_drivers')) {
      setStatus({ message: 'Недостатньо прав для редагування', type: 'error' });
      return;
    }
    setEditingDriver({
      id: driver.id,
      fullName: driver.name || '',
      licenseNumber: driver.license || '',
      phone: driver.phone || '',
      active: driver.active !== undefined ? driver.active : true
    });
  };

  const saveEdit = async () => {
    if (!hasPermission('can_edit_drivers')) {
      setStatus({ message: 'Недостатньо прав для редагування', type: 'error' });
      return;
    }
    if (!editingDriver.fullName?.trim()) {
      setStatus({ message: 'ПІБ не може бути порожнім', type: 'error' });
      return;
    }
    try {
      const result = await updateDriver(editingDriver.id, {
        fullName: editingDriver.fullName,
        licenseNumber: editingDriver.licenseNumber,
        phone: editingDriver.phone,
        active: editingDriver.active
      });
      if (result.success) {
        setStatus({ message: result.message, type: 'success' });
        setEditingDriver(null);
        await loadDrivers();
      } else {
        setStatus({ message: result.message, type: 'error' });
      }
    } catch (error) {
      setStatus({ message: 'Помилка: ' + error.message, type: 'error' });
    }
  };

  const handleDelete = async (id) => {
    if (!hasPermission('can_delete_drivers')) {
      setStatus({ message: 'Недостатньо прав для видалення', type: 'error' });
      return;
    }
    if (!window.confirm('Ви впевнені, що хочете видалити цього водія?')) return;
    try {
      const result = await deleteDriver(id);
      if (result.success) {
        setStatus({ message: result.message, type: 'success' });
        if (drivers.length === 1 && currentPage > 1) setCurrentPage(currentPage - 1);
        else await loadDrivers();
        setEditingDriver(null);
      } else {
        setStatus({ message: result.message, type: 'error' });
      }
    } catch (error) {
      setStatus({ message: 'Помилка: ' + error.message, type: 'error' });
    }
  };

  if (loading && drivers.length === 0 && currentPage === 1) {
    return (
      <div className="loading">
        <div className="loading-spinner" />
        Завантаження...
      </div>
    );
  }

  const totalPages = Math.ceil(totalDrivers / pageSize);

  return (
    <div className="container">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid var(--bd-1)', paddingBottom: '1rem' }}>
        <h2 style={{ margin: 0, border: 'none', padding: 0 }}>Керування водіями</h2>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {hasPermission('can_edit_drivers') && (
            <button className="btn btn-primary btn-sm" onClick={() => setShowAddForm(!showAddForm)}>
              {showAddForm ? '✕ Скасувати' : '+ Додати водія'}
            </button>
          )}
          <button className="btn btn-secondary btn-sm" onClick={loadDrivers}>
            Оновити
          </button>
        </div>
      </div>

      {status.message && (
        <div className={`status ${status.type}`}>{status.message}</div>
      )}

      {/* Add Form */}
      {showAddForm && (
        <div className="info-block" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1.25rem' }}>Додати нового водія</h3>
          <form onSubmit={handleAddDriver}>
            <div className="form-row">
              <div className="form-group">
                <label>ПІБ *</label>
                <input
                  type="text"
                  value={newDriver.fullName}
                  onChange={(e) => setNewDriver({ ...newDriver, fullName: e.target.value })}
                  placeholder="Іванов Іван Іванович"
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label>Номер посвідчення</label>
                <input
                  type="text"
                  value={newDriver.licenseNumber}
                  onChange={(e) => setNewDriver({ ...newDriver, licenseNumber: e.target.value })}
                  placeholder="ААБ 123456"
                  disabled={loading}
                />
              </div>
              <div className="form-group">
                <label>Телефон</label>
                <input
                  type="text"
                  value={newDriver.phone}
                  onChange={(e) => setNewDriver({ ...newDriver, phone: formatPhone(e.target.value) })}
                  placeholder="+380 (12) 345-67-89"
                  disabled={loading}
                />
              </div>
            </div>
            <p className="form-hint">* обов'язкове поле</p>
            <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.875rem' }}>
              <button type="submit" className="btn btn-success" disabled={loading}>
                {loading ? 'Збереження...' : 'Зберегти'}
              </button>
              <button type="button" className="btn btn-secondary" onClick={() => setShowAddForm(false)} disabled={loading}>
                Скасувати
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Form */}
      {editingDriver && (
        <div className="info-block" style={{ marginBottom: '1.5rem' }}>
          <h3 style={{ marginTop: 0, marginBottom: '1.25rem' }}>Редагування водія</h3>
          <div className="form-row">
            <div className="form-group">
              <label>ПІБ *</label>
              <input
                type="text"
                value={editingDriver.fullName || ''}
                onChange={(e) => setEditingDriver(prev => ({ ...prev, fullName: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Номер посвідчення</label>
              <input
                type="text"
                value={editingDriver.licenseNumber || ''}
                onChange={(e) => setEditingDriver(prev => ({ ...prev, licenseNumber: e.target.value }))}
              />
            </div>
            <div className="form-group">
              <label>Телефон</label>
              <input
                type="text"
                value={editingDriver.phone || ''}
                onChange={(e) => setEditingDriver(prev => ({ ...prev, phone: formatPhone(e.target.value) }))}
              />
            </div>
            <div className="form-group">
              <label>Статус</label>
              <select
                value={editingDriver.active ? 'true' : 'false'}
                onChange={(e) => setEditingDriver(prev => ({ ...prev, active: e.target.value === 'true' }))}
              >
                <option value="true">Активний</option>
                <option value="false">Неактивний</option>
              </select>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end', marginTop: '0.875rem' }}>
            <button className="btn btn-success" onClick={saveEdit}>Зберегти</button>
            <button className="btn btn-secondary" onClick={() => setEditingDriver(null)}>Скасувати</button>
            {hasPermission('can_delete_drivers') && (
              <button className="btn btn-danger" onClick={() => handleDelete(editingDriver.id)}>Видалити</button>
            )}
          </div>
        </div>
      )}

      {drivers.length === 0 ? (
        <div className="no-data">
          <p>Немає даних про водіїв</p>
          {hasPermission('can_edit_drivers') && (
            <button className="btn btn-primary" onClick={() => setShowAddForm(true)} style={{ marginTop: '1rem' }}>
              + Додати першого водія
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>ПІБ</th>
                  <th>Посвідчення</th>
                  <th>Телефон</th>
                  <th>Статус</th>
                  <th>Дії</th>
                </tr>
              </thead>
              <tbody>
                {drivers.map(driver => (
                  <tr key={driver.id}>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: 'var(--tx-3)' }}>{driver.id}</td>
                    <td style={{ fontWeight: 500 }}>{driver.name || '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }}>{driver.license || '—'}</td>
                    <td>{driver.phone || '—'}</td>
                    <td>
                      <span className={`badge ${driver.active ? 'badge-green' : 'badge-orange'}`}>
                        {driver.active ? 'Активний' : 'Неактивний'}
                      </span>
                    </td>
                    <td>
                      {hasPermission('can_edit_drivers') && (
                        <button className="btn btn-secondary btn-sm" onClick={() => handleEdit(driver)}>
                          Редагувати
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            pageSize={pageSize}
            onPageSizeChange={(size) => { setPageSize(size); setCurrentPage(1); }}
            total={totalDrivers}
          />
        </>
      )}
    </div>
  );
};

export default DriverManagement;
