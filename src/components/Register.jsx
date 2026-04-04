import React, { useState, useRef } from 'react';
import { registerUser } from '../services/auth';

// Проста санітизація вхідних даних
const sanitizeInput = (input) => {
  if (typeof input !== 'string') return '';
  // Видаляємо потенційно небезпечні символи, зберігаємо чисту форму
  return input
    .replace(/[<>]/g, '')
    .trim();
};

const Register = ({ onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const isSubmittingRef = useRef(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    const sanitized = name === 'password' || name === 'confirmPassword' ? value : sanitizeInput(value);
    setFormData(prev => ({ ...prev, [name]: sanitized }));
    setError('');
  };

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.name) return 'Заповніть всі поля';
    if (formData.password.length < 6) return 'Пароль має містити не менше 6 символів';
    if (formData.password !== formData.confirmPassword) return 'Паролі не співпадають';
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) return 'Введіть коректний email';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Предотвращаем дублирование submit
    if (isSubmittingRef.current) return;
    
    const validationError = validateForm();
    if (validationError) { setError(validationError); return; }
    
    isSubmittingRef.current = true;
    setLoading(true);
    try {
      const result = await registerUser({ email: formData.email, password: formData.password, name: formData.name });
      if (result.success) {
        setSuccess(true);
        setTimeout(() => onSwitchToLogin(), 3000);
      } else {
        setError(result.error || 'Помилка реєстрації');
      }
    } catch (err) {
      setError(err.message || 'Помилка реєстрації');
    } finally {
      setLoading(false);
      isSubmittingRef.current = false;
    }
  };

  if (success) {
    return (
      <div style={{
        background: 'var(--green-50)',
        border: '1px solid var(--green-100)',
        color: 'var(--green-700)',
        padding: '2.5rem',
        borderRadius: 'var(--r-2xl)',
        textAlign: 'center',
        maxWidth: '400px',
        width: '100%'
      }}>
        <div style={{ fontSize: '2rem', marginBottom: '1rem', color: 'var(--green-600)' }}>✓</div>
        <h3 style={{ margin: '0 0 0.75rem', color: 'var(--green-700)', fontSize: '1.125rem' }}>Реєстрація успішна!</h3>
        <p style={{ margin: '0 0 0.5rem', color: 'var(--green-700)', fontSize: '0.9rem' }}>Ваш обліковий запис створено.</p>
        <p style={{ margin: '0 0 1rem', color: 'var(--green-700)', fontSize: '0.9rem' }}>Тепер ви можете увійти в систему.</p>
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--tx-3)', fontFamily: 'var(--font-mono)' }}>
          Через 3 секунди — перенаправлення на вхід...
        </p>
      </div>
    );
  }

  return (
    <div style={{
      background: 'var(--surface)',
      padding: '2.5rem',
      borderRadius: 'var(--r-2xl)',
      boxShadow: 'var(--sh-lg)',
      width: '100%',
      maxWidth: '400px',
      border: '1px solid var(--bd-1)',
      transition: 'background-color var(--t-slow), border-color var(--t-slow)'
    }}>
      <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h2 style={{ margin: '0 0 0.375rem', fontSize: '1.25rem', border: 'none', padding: 0, letterSpacing: '-0.02em' }}>
          Реєстрація
        </h2>
        <p style={{ color: 'var(--tx-3)', fontSize: '0.8125rem', margin: 0 }}>
          Створіть новий обліковий запис
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>ПІБ *</label>
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Іванов Іван Іванович"
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <label>Email *</label>
          <input
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="your@email.com"
            disabled={loading}
            autoComplete="email"
          />
        </div>

        <div className="form-group">
          <label>Пароль * (мін. 6 символів)</label>
          <input
            type="password"
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="••••••••"
            disabled={loading}
            minLength="6"
            autoComplete="new-password"
          />
        </div>

        <div className="form-group">
          <label>Підтвердіть пароль *</label>
          <input
            type="password"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleChange}
            placeholder="••••••••"
            disabled={loading}
            autoComplete="new-password"
          />
        </div>

        {error && (
          <div className="status error">{error}</div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginTop: '1.25rem' }}>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: '100%' }}
          >
            {loading ? 'Реєстрація...' : 'Зареєструватися'}
          </button>

          <button
            type="button"
            onClick={onSwitchToLogin}
            disabled={loading}
            className="btn btn-secondary"
            style={{ width: '100%' }}
          >
            ← Назад до входу
          </button>
        </div>
      </form>
    </div>
  );
};

export default Register;
