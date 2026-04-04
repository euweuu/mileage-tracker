import { supabase } from './supabase';

export const loginUser = async (email, password) => {
  try {
    // Не логируем email/password по причинам безопасности
    console.log('Спроба входу почала');

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      console.error('Помилка Auth:', error.message);

      if (error.message.includes('Invalid login credentials')) {
        return {
          success: false,
          error: 'Невірний email або пароль'
        };
      }

      return {
        success: false,
        error: error.message
      };
    }

    if (!data?.user) {
      return {
        success: false,
        error: 'Користувача не знайдено'
      };
    }

    console.log('Вхід успішний');

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', data.user.id)
      .maybeSingle();

    if (userError) {
      console.error('Помилка отримання даних:', userError);
    }

    if (!userData) {
      console.log('Створюємо запис користувача в таблиці users...');

      const role = 'driver';

      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([{
          id: data.user.id,
          email: email,
          name: email.split('@')[0],
          role: role,
          active: true,
          created_at: new Date().toISOString(),
          last_login: new Date().toISOString()
        }])
        .select()
        .single();

      if (createError) {
        console.error('Помилка створення:', createError);
        return {
          success: true,
          user: {
            id: data.user.id,
            email: email,
            name: email.split('@')[0],
            role: role
          },
          permissions: getDefaultPermissions(role)
        };
      }

      const permissions = await getUserPermissions(role);

      return {
        success: true,
        user: newUser,
        permissions
      };
    }

    const permissions = await getUserPermissions(userData.role);

    // Оновлюємо час останнього входу
    try {
      await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', data.user.id);
    } catch (e) {
      console.warn('Не вдалося оновити last_login:', e);
    }

    return {
      success: true,
      user: { ...userData, last_login: new Date().toISOString() },
      permissions
    };

  } catch (error) {
    console.error('Помилка входу:', error);
    return {
      success: false,
      error: 'Помилка сервера'
    };
  }
};

export const logoutUser = async () => {
  try {
    await supabase.auth.signOut();
    return { success: true };
  } catch (error) {
    console.error('Помилка виходу:', error);
    return { success: false, error: error.message };
  }
};

export const verifyToken = async () => {
  try {
    if (!navigator.onLine) {
      throw new Error('Немає з\'єднання з інтернетом');
    }

    // getUser() verifies the token on the server, unlike getSession()
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

    if (authError || !authUser) {
      return { success: false, error: 'Немає активної сесії' };
    }

    // Also get session for compatibility
    const { data: { session } } = await supabase.auth.getSession();

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    if (userError) {
      console.error('Помилка отримання даних користувача:', userError);
    }

    if (!userData) {
      const role = 'driver';
      // BUG FIX: session may be null if token was verified via getUser() but session expired;
      // fall back to authUser which is always present at this point.
      const fallbackUser = session?.user ?? authUser;

      return {
        success: true,
        user: {
          id: fallbackUser.id,
          email: fallbackUser.email,
          name: fallbackUser.email?.split('@')[0] || 'Користувач',
          role: role
        },
        permissions: getDefaultPermissions(role)
      };
    }

    const permissions = await getUserPermissions(userData.role);

    return {
      success: true,
      user: userData,
      permissions
    };
  } catch (error) {
    console.error('Помилка перевірки токена:', error);
    return { success: false, error: error.message };
  }
};

export const changePassword = async (newPassword) => {
  try {
    console.log('Спроба зміни пароля');

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();

    if (sessionError || !session) {
      throw new Error('Сесія не знайдена. Увійдіть знову.');
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    });

    if (error) {
      console.error('Помилка зміни пароля:', error);

      if (error.message.includes('same as the old password')) {
        throw new Error('Новий пароль має відрізнятися від старого');
      }
      if (error.message.includes('6 characters')) {
        throw new Error('Пароль має містити не менше 6 символів');
      }

      throw error;
    }

    console.log('Пароль успішно змінено');

    return {
      success: true,
      message: 'Пароль успішно змінено'
    };

  } catch (error) {
    console.error('Помилка зміни пароля:', error);
    return {
      success: false,
      error: error.message || 'Помилка зміни пароля'
    };
  }
};

export const registerUser = async (userData) => {
  try {
    console.log('Реєстрація нового користувача:', userData.email);

    const { data: settings, error: settingsError } = await supabase
      .from('settings')
      .select('allow_registration')
      .single();

    if (settingsError && settingsError.code !== 'PGRST116') {
      console.error('Помилка перевірки налаштувань:', settingsError);
    }

    if (!settings || !settings.allow_registration) {
      throw new Error('Реєстрація нових користувачів заборонена адміністратором');
    }

    if (!userData.email || !userData.password || !userData.name) {
      throw new Error('Будь ласка, заповніть всі поля');
    }

    if (userData.password.length < 6) {
      throw new Error('Пароль має містити не менше 6 символів');
    }

    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(userData.email)) {
      throw new Error('Введіть коректний email');
    }

    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', userData.email)
      .maybeSingle();

    if (existingUser) {
      throw new Error('Користувач з таким email вже існує');
    }

    const { data, error } = await supabase.auth.signUp({
      email: userData.email,
      password: userData.password,
      options: {
        data: {
          name: userData.name,
          role: 'driver'
        }
      }
    });

    if (error) {
      console.error('Помилка реєстрації в Auth:', error);

      if (error.message.includes('already registered')) {
        throw new Error('Користувач з таким email вже зареєстрований');
      }

      throw new Error(error.message);
    }

    if (!data?.user) {
      throw new Error('Не вдалося створити користувача');
    }

    console.log('Користувача створено в Auth, ID:', data.user.id);

    await new Promise(resolve => setTimeout(resolve, 1000));

    const { error: dbError } = await supabase
      .from('users')
      .insert([{
        id: data.user.id,
        email: userData.email,
        name: userData.name,
        role: userData.role || 'driver',
        driver_id: userData.driverId || null,
        active: true,
        created_at: new Date().toISOString()
      }]);

    if (dbError) {
      console.error('Помилка створення в users:', dbError);
      throw new Error('Помилка створення профілю користувача');
    }

    console.log('Користувача додано в users');

    return {
      success: true,
      user: {
        id: data.user.id,
        email: userData.email,
        name: userData.name,
        role: 'driver'
      },
      message: 'Реєстрація успішна! Тепер ви можете увійти.'
    };

  } catch (error) {
    console.error('Помилка реєстрації:', error);
    return {
      success: false,
      error: error.message || 'Помилка реєстрації'
    };
  }
};

export const updateUser = async (userId, userData) => {
  try {
    console.log('Оновлення користувача:', userId, userData);

    const updateData = {};

    if (userData.name) updateData.name = userData.name;
    if (userData.role) updateData.role = userData.role;
    if (userData.driverId !== undefined) updateData.driver_id = userData.driverId;
    if (userData.active !== undefined) updateData.active = userData.active;

    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Помилка оновлення в users:', error);
      throw error;
    }

    console.log('Користувача оновлено:', data);

    return {
      success: true,
      user: data,
      message: 'Користувача успішно оновлено'
    };

  } catch (error) {
    console.error('Помилка оновлення користувача:', error);
    return {
      success: false,
      error: error.message || 'Помилка оновлення користувача'
    };
  }
};

export const deleteUser = async (userId) => {
  try {
    console.log('Видалення користувача:', userId);

    const { error: dbError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId);

    if (dbError) {
      console.error('Помилка видалення з users:', dbError);
      throw dbError;
    }

    return {
      success: true,
      message: 'Користувача успішно видалено'
    };

  } catch (error) {
    console.error('Помилка видалення користувача:', error);
    return {
      success: false,
      error: error.message || 'Помилка видалення користувача'
    };
  }
};

export const getUsersList = async (page = 1, pageSize = 50) => {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    const { data, error, count } = await supabase
      .from('users')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (error) throw error;

    return {
      success: true,
      users: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    };

  } catch (error) {
    console.error('Помилка отримання користувачів:', error);
    return {
      success: false,
      error: error.message || 'Помилка отримання списку користувачів'
    };
  }
};

export const getAllUsers = async () => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return {
      success: true,
      users: data || []
    };

  } catch (error) {
    console.error('Помилка отримання користувачів:', error);
    return {
      success: false,
      error: error.message || 'Помилка отримання списку користувачів'
    };
  }
};

export const getUserPermissions = async (role) => {
  try {
    if (!role) {
      role = 'driver';
    }

    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('permissions')
      .eq('name', role)
      .maybeSingle();

    if (!roleError && roleData && roleData.permissions) {
      console.log(`Отримано права для ролі "${role}" з таблиці roles:`, roleData.permissions);
      return roleData.permissions;
    }

    return getDefaultPermissions(role);
  } catch (error) {
    console.error('Помилка:', error);
    return getDefaultPermissions(role);
  }
};

export const refreshUserPermissions = async (userId) => {
  try {
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    const permissions = await getUserPermissions(userData.role);

    return {
      success: true,
      permissions
    };
  } catch (error) {
    console.error('Помилка оновлення прав:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

const getDefaultPermissions = (role) => {
  const permissions = {
    admin: {
      can_view_trips: true,
      can_edit_trips: true,
      can_delete_trips: true,
      can_view_cars: true,
      can_edit_cars: true,
      can_delete_cars: true,
      can_view_drivers: true,
      can_edit_drivers: true,
      can_delete_drivers: true,
      can_view_analytics: true,
      can_export_data: true,
      can_manage_users: true,
      can_view_delivery: true,
      can_manage_delivery: true,
      can_edit_trailers: true,
      can_delete_trailers: true
    },
    dispatcher: {
      can_view_trips: true,
      can_edit_trips: true,
      can_delete_trips: false,
      can_view_cars: true,
      can_edit_cars: false,
      can_delete_cars: false,
      can_view_drivers: true,
      can_edit_drivers: false,
      can_delete_drivers: false,
      can_view_analytics: true,
      can_export_data: true,
      can_manage_users: false,
      can_view_delivery: true,
      can_manage_delivery: true,
      can_edit_trailers: true,
      can_delete_trailers: false
    },
    driver: {
      can_view_trips: true,
      can_edit_trips: false,
      can_delete_trips: false,
      can_view_cars: true,
      can_edit_cars: false,
      can_delete_cars: false,
      can_view_drivers: false,
      can_edit_drivers: false,
      can_delete_drivers: false,
      can_view_analytics: false,
      can_export_data: false,
      can_manage_users: false,
      can_view_delivery: false,
      can_manage_delivery: false,
      can_edit_trailers: false,
      can_delete_trailers: false
    },
    manager: {
      can_view_trips: false,
      can_edit_trips: false,
      can_delete_trips: false,
      can_view_cars: false,
      can_edit_cars: false,
      can_delete_cars: false,
      can_view_drivers: false,
      can_edit_drivers: false,
      can_delete_drivers: false,
      can_view_analytics: false,
      can_export_data: false,
      can_manage_users: false,
      can_view_delivery: true,
      can_manage_delivery: true,
      can_edit_trailers: false,
      can_delete_trailers: false
    }
  };

  return permissions[role] || permissions.driver;
};