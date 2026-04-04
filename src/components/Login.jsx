import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getSettings } from '../services/supabase';
import Register from './Register';
import bgVideo from '../assets/dima_dzhuraev - 7536271056470904072.mp4';

const Login = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [allowRegistration, setAllowRegistration] = useState(true);
  const [keyboardLayout, setKeyboardLayout] = useState('en');
  const [showLayout, setShowLayout] = useState(false);

  const { login } = useAuth();
  const handleInputMethodRef = useRef(null);

  const detectKeyboardLayout = useCallback(() => {
    const activeElement = document.activeElement;
    if (activeElement && (activeElement.type === 'text' || activeElement.type === 'email' || activeElement.type === 'password')) {
      const value = activeElement.value;
      if (value.length > 0) {
        const lastChar = value.slice(-1);
        if (/[а-яА-ЯїЇєЄіІґҐ]/.test(lastChar)) {
          setKeyboardLayout('ua'); setShowLayout(true); return;
        }
        if (/[a-zA-Z]/.test(lastChar)) {
          setKeyboardLayout('en'); setShowLayout(true); return;
        }
      }
    }
  }, []);

  useEffect(() => {
    checkRegistrationAllowed();
    detectKeyboardLayout();
    
    const handleInputMethod = (e) => {
      if (e.target.tagName === 'INPUT' && (e.target.type === 'text' || e.target.type === 'email' || e.target.type === 'password')) {
        setTimeout(() => detectKeyboardLayout(), 50);
      }
    };
    
    handleInputMethodRef.current = handleInputMethod;
    document.addEventListener('input', handleInputMethod);
    
    return () => {
      if (handleInputMethodRef.current) {
        document.removeEventListener('input', handleInputMethodRef.current);
      }
    };
  }, [detectKeyboardLayout]);

  const checkRegistrationAllowed = async () => {
    try {
      const settings = await getSettings();
      setAllowRegistration(settings.allow_registration);
    } catch (error) {
      console.error('Помилка перевірки налаштувань:', error);
    }
  };

  const handleEmailChange = (e) => {
    setEmail(e.target.value);
    detectKeyboardLayout();
    // auto-hide after 3s
    clearTimeout(window._kbHideTimer);
    window._kbHideTimer = setTimeout(() => setShowLayout(false), 3000);
  };

  const handlePasswordChange = (e) => {
    setPassword(e.target.value);
    detectKeyboardLayout();
    clearTimeout(window._kbHideTimer);
    window._kbHideTimer = setTimeout(() => setShowLayout(false), 3000);
  };

  const handleFocus = () => {
    if (keyboardLayout) {
      setShowLayout(true);
      clearTimeout(window._kbHideTimer);
      window._kbHideTimer = setTimeout(() => setShowLayout(false), 3000);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    if (!email || !password) {
      setError('Заповніть всі поля');
      setLoading(false);
      return;
    }
    try {
      const result = await login(email, password);
      if (!result.success) setError(result.error || 'Помилка входу');
    } catch (err) {
      setError(err.message || 'Помилка входу');
    } finally {
      setLoading(false);
    }
  };

  const wrapperStyle = {
    position: 'relative',
    minHeight: '100dvh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '1.25rem',
    overflow: 'hidden',
  };

  const videoStyle = {
    position: 'absolute',
    inset: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    zIndex: 0,
  };

  const overlayStyle = {
    position: 'absolute',
    inset: 0,
    background: 'rgba(0,0,0,0.52)',
    zIndex: 1,
  };

  const cardStyle = {
    position: 'relative',
    zIndex: 2,
    width: '100%',
    maxWidth: '320px',
  };

  const inputWrapperStyle = {
    position: 'relative',
    width: '100%',
  };

  const inputStyle = {
    width: '100%',
    background: 'rgba(255,255,255,0.1)',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: 'var(--r-lg)',
    padding: '0.625rem 2.5rem 0.625rem 0.875rem',
    color: '#fff',
    fontSize: '0.9rem',
    outline: 'none',
    transition: 'border-color 160ms ease',
    fontFamily: 'var(--font-sans)',
    boxSizing: 'border-box',
  };

  const layoutIndicatorStyle = {
    position: 'absolute',
    right: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'rgba(255,255,255,0.15)',
    border: '1px solid rgba(255,255,255,0.3)',
    borderRadius: 'var(--r-sm)',
    padding: '2px 6px',
    fontSize: '0.7rem',
    fontWeight: 600,
    color: '#fff',
    letterSpacing: '0.5px',
    backdropFilter: 'blur(4px)',
    opacity: showLayout ? 1 : 0,
    transition: 'opacity 0.2s ease',
    pointerEvents: 'none',
    zIndex: 3,
  };

  const labelStyle = {
    color: 'rgba(255,255,255,0.7)',
    fontSize: '0.8125rem',
    fontWeight: 500,
    display: 'block',
    marginBottom: '0.375rem',
  };

  if (!isLogin) {
    return (
      <div style={wrapperStyle}>
        <video style={videoStyle} src={bgVideo} autoPlay muted loop playsInline />
        <div style={overlayStyle} />
        <div style={{ position: 'relative', zIndex: 2 }}>
          <Register onSwitchToLogin={() => setIsLogin(true)} />
        </div>
      </div>
    );
  }

  return (
    <div style={wrapperStyle}>
      <video style={videoStyle} src={bgVideo} autoPlay muted loop playsInline />
      <div style={overlayStyle} />

      <div style={cardStyle}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h1 style={{
            fontSize: '1.25rem',
            fontWeight: 600,
            color: '#ffffff',
            margin: '0 0 0.375rem',
            letterSpacing: '-0.02em',
            lineHeight: 1.3,
          }}>
            Вхід в систему
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.875rem', margin: 0 }}>
            Облік пробігів транспорту
          </p>
        </div>

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: '1rem' }}>
            <label style={labelStyle}>Email</label>
            <div style={inputWrapperStyle}>
              <input
                type="email"
                value={email}
                onChange={handleEmailChange}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.5)'; handleFocus(e); }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.2)';
                  setTimeout(() => setShowLayout(false), 500);
                }}
                placeholder="your@email.com"
                disabled={loading}
                autoComplete="email"
                style={inputStyle}
              />
              <div style={layoutIndicatorStyle}>
                {keyboardLayout === 'ua' ? 'УКР' : 'ENG'}
              </div>
            </div>
          </div>

          <div>
            <label style={labelStyle}>Пароль</label>
            <div style={inputWrapperStyle}>
              <input
                type="password"
                value={password}
                onChange={handlePasswordChange}
                onFocus={(e) => { e.target.style.borderColor = 'rgba(255,255,255,0.5)'; handleFocus(e); }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(255,255,255,0.2)';
                  setTimeout(() => setShowLayout(false), 500);
                }}
                placeholder="••••••••"
                disabled={loading}
                autoComplete="current-password"
                style={inputStyle}
              />
              <div style={layoutIndicatorStyle}>
                {keyboardLayout === 'ua' ? 'УКР' : 'ENG'}
              </div>
            </div>
          </div>

          {error && (
            <div style={{
              marginTop: '0.875rem',
              padding: '0.625rem 0.875rem',
              background: 'rgba(244,63,94,0.2)',
              border: '1px solid rgba(244,63,94,0.4)',
              borderRadius: 'var(--r-lg)',
              color: '#fda4af',
              fontSize: '0.875rem',
            }}>
              {error}
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem', marginTop: '1.5rem' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                padding: '0.7rem',
                background: '#ffffff',
                color: '#171717',
                border: 'none',
                borderRadius: 'var(--r-lg)',
                fontFamily: 'var(--font-sans)',
                fontSize: '0.9rem',
                fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1,
                transition: 'opacity 160ms ease',
              }}
              onMouseEnter={e => { if (!loading) e.target.style.opacity = '0.88'; }}
              onMouseLeave={e => { e.target.style.opacity = loading ? '0.7' : '1'; }}
            >
              {loading ? 'Вхід...' : 'Увійти'}
            </button>

            {allowRegistration && (
              <button
                type="button"
                onClick={() => setIsLogin(false)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '0.7rem',
                  background: 'rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.85)',
                  border: '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 'var(--r-lg)',
                  fontFamily: 'var(--font-sans)',
                  fontSize: '0.9rem',
                  fontWeight: 500,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  transition: 'background 160ms ease',
                }}
                onMouseEnter={e => { if (!loading) e.target.style.background = 'rgba(255,255,255,0.18)'; }}
                onMouseLeave={e => { e.target.style.background = 'rgba(255,255,255,0.1)'; }}
              >
                Зареєструватися
              </button>
            )}
          </div>
        </form>

        <p style={{
          textAlign: 'center',
          marginTop: '1.5rem',
          marginBottom: 0,
          fontFamily: 'var(--font-mono)',
          fontSize: '0.6875rem',
          color: 'rgba(255,255,255,0.3)',
        }}>
          Розроблено спеціально для транспортної компанії 
          <span style={{ display: 'block', marginTop: '0.25rem' }}>Trust Cargo</span>
        </p>
      </div>
    </div>
  );
};

export default Login;