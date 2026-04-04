import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { loginUser, logoutUser, verifyToken } from '../services/auth';
import { supabase } from '../services/supabase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [loading, setLoading] = useState(true);

  const checkUser = useCallback(async () => {
    try {
      if (!navigator.onLine) {
        console.warn('Немає з\'єднання з інтернетом при перевірці користувача');
        // Try to restore cached session from Supabase storage before giving up
        try {
          const { data: { session } } = await supabase.getSession();
          if (session?.user) {
            // We have a cached session — use it until network is restored
            const result = await verifyToken().catch(() => null);
            if (result?.success) {
              setUser(result.user);
              setPermissions(result.permissions);
            }
          }
        } catch (_) {
          // offline and no cached session — stay as guest
        }
        setLoading(false);
        return;
      }

      const result = await verifyToken();
      
      if (result.success) {
        setUser(result.user);
        setPermissions(result.permissions);
      }
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkUser();
  }, [checkUser]);

  const login = async (email, password) => {
    try {
      const result = await loginUser(email, password);
      
      if (result.success) {
        setUser(result.user);
        setPermissions(result.permissions);
        return { success: true };
      } else {
        return { success: false, error: result.error };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
    setPermissions(null);
  };

  const refreshPermissions = useCallback(async () => {
    if (!user) return false;
    
    try {
      const result = await verifyToken();
      
      if (result.success) {
        setPermissions(result.permissions);
        console.log('Права користувача оновлено:', result.permissions);
        return true;
      }
      return false;
    } catch (error) {
      console.error('Помилка оновлення прав:', error);
      return false;
    }
  }, [user]);

  const hasPermission = useCallback((permission) => {
    if (!permissions) return false;
    return permissions[permission] === true;
  }, [permissions]);

  const hasAnyPermission = useCallback((permissionList) => {
    if (!permissions) return false;
    return permissionList.some(permission => permissions[permission] === true);
  }, [permissions]);

  const value = {
    user,
    permissions,
    loading,
    login,
    logout,
    refreshPermissions,
    hasPermission,
    hasAnyPermission,
    isAuthenticated: !!user
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};