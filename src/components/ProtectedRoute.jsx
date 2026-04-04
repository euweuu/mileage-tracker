import React from 'react';
import { useAuth } from '../contexts/AuthContext';

/**
 * Захищений маршрут — рендерить children тільки якщо користувач має потрібний дозвіл.
 * Якщо дозволу немає — показує повідомлення про відсутність доступу.
 */
const ProtectedRoute = ({ children, requiredPermission }) => {
  const { hasPermission, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return null;
  }

  if (requiredPermission && !hasPermission(requiredPermission)) {
    return (
      <div className="container">
        <h2>Доступ заборонено</h2>
        <div className="status warning">
          У вас немає прав для перегляду цієї сторінки.
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
