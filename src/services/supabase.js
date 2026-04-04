import { createClient } from '@supabase/supabase-js';
import { safeDate, safeDateStr } from '../utils/safeHelpers';

const supabaseUrl = process.env.REACT_APP_SUPABASE_URL;
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY;

// Валидация переменных окружения при загрузке
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Критична помилка: Відсутні змінні оточення REACT_APP_SUPABASE_URL та REACT_APP_SUPABASE_ANON_KEY. Перевірте файл .env');
}

// Singleton — один приватний екземпляр клієнта на весь застосунок
let supabaseInstance = null;

function getSupabaseClient() {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storageKey: 'supabase_auth',
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
      }
    });
  }
  return supabaseInstance;
}

export const supabase = getSupabaseClient();

export const getDriversList = async (page = 1, pageSize = 50) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  if (!navigator.onLine) {
    throw new Error('Немає з\'єднання з інтернетом');
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  try {
    const { data, error, count } = await supabase
      .from('drivers')
      .select('*', { count: 'exact' })
      .order('id')
      .range(from, to);

    if (error) throw error;
    return {
      data: data || [],
      total: count || 0,
      page,
      pageSize,
      totalPages: Math.ceil((count || 0) / pageSize)
    };
  } catch (error) {
    if (error.message?.includes('Failed to fetch')) {
      throw new Error('Помилка мережі. Перевірте з\'єднання.');
    }
    throw error;
  }
};

export const getAllDrivers = async () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .order('id');

  if (error) throw error;
  return data || [];
};

export const getDriversForSelect = async () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  const { data, error } = await supabase
    .from('drivers')
    .select('id, name')
    .eq('active', true)
    .order('name');

  if (error) throw error;
  return data || [];
};

export const addDriver = async (driverData) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  const { data, error } = await supabase
    .from('drivers')
    .insert([{
      name: driverData.fullName,
      license: driverData.licenseNumber || null,
      phone: driverData.phone || null,
      active: true
    }])
    .select();

  if (error) throw error;
  return { success: true, message: 'Водія додано!', data };
};

export const updateDriver = async (id, driverData) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  const { error } = await supabase
    .from('drivers')
    .update({
      name: driverData.fullName,
      license: driverData.licenseNumber || null,
      phone: driverData.phone || null,
      active: driverData.active
    })
    .eq('id', id);

  if (error) throw error;
  return { success: true, message: 'Дані водія оновлено' };
};

export const deleteDriver = async (id) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  const { count, error: checkError } = await supabase
    .from('trips')
    .select('*', { count: 'exact', head: true })
    .eq('driver_id', id);

  if (checkError) throw checkError;

  if (count && count > 0) {
    throw new Error('Неможливо видалити водія, у якого є поїздки. Спочатку видаліть або перенесіть поїздки.');
  }

  const { error } = await supabase
    .from('drivers')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return { success: true, message: 'Водія видалено' };
};

export const getCarsList = async (page = 1, pageSize = 50) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('cars')
    .select('*', { count: 'exact' })
    .order('id')
    .range(from, to);

  if (error) throw error;

  const formattedData = (data || []).map(car => ({
    ...car,
    trailer: car.trailer_number || null,
    hasTrailer: !!car.trailer_number
  }));

  return {
    data: formattedData,
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize)
  };
};

export const getAllCars = async () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  const { data, error } = await supabase
    .from('cars')
    .select('*')
    .order('id');

  if (error) throw error;

  return (data || []).map(car => ({
    ...car,
    trailer: car.trailer_number || null,
    hasTrailer: !!car.trailer_number
  }));
};

export const getCarsForSelect = async () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  const { data, error } = await supabase
    .from('cars')
    .select('id, brand, model, plate, current_mileage, tariff, trailer_number')
    .eq('active', true)
    .order('brand')
    .order('model');

  if (error) throw error;

  return (data || []).map(car => ({
    id: car.id,
    name: `${car.brand} ${car.model} (${car.plate})${car.trailer_number ? ` + причіп ${car.trailer_number}` : ''}`,
    plate: car.plate,
    currentMileage: car.current_mileage,
    tariff: car.tariff,
    trailerNumber: car.trailer_number || null,
    hasTrailer: !!car.trailer_number
  }));
};

export const addCar = async (carData) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  const { data: existingCar, error: checkError } = await supabase
    .from('cars')
    .select('id')
    .eq('plate', carData.licensePlate)
    .maybeSingle();

  if (checkError) throw checkError;

  if (existingCar) {
    throw new Error('Автомобіль з таким номером вже існує');
  }

  const { data, error } = await supabase
    .from('cars')
    .insert([{
      brand: carData.brand,
      model: carData.model,
      plate: carData.licensePlate,
      trailer_number: carData.trailerNumber || null,
      year: carData.year,
      initial_mileage: Number(carData.initialMileage),
      current_mileage: Number(carData.initialMileage),
      fuel_type: carData.fuelType,
      tariff: Number(carData.tariff),
      active: true
    }])
    .select();

  if (error) throw error;
  return { success: true, message: 'Автомобіль додано!', data };
};

export const updateCar = async (id, carData) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  if (carData.licensePlate) {
    const { data: existingCar, error: checkError } = await supabase
      .from('cars')
      .select('id')
      .eq('plate', carData.licensePlate)
      .neq('id', id)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existingCar) {
      throw new Error('Автомобіль з таким номером вже існує');
    }
  }

  const { error } = await supabase
    .from('cars')
    .update({
      brand: carData.brand,
      model: carData.model,
      plate: carData.licensePlate,
      trailer_number: carData.trailerNumber || null,
      year: carData.year,
      fuel_type: carData.fuelType,
      tariff: Number(carData.tariff),
      active: carData.active
    })
    .eq('id', id);

  if (error) throw error;
  return { success: true, message: 'Дані автомобіля оновлено' };
};

export const deleteCar = async (id) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  const { count, error: checkError } = await supabase
    .from('trips')
    .select('*', { count: 'exact', head: true })
    .eq('car_id', id);

  if (checkError) throw checkError;

  if (count && count > 0) {
    throw new Error('Неможливо видалити автомобіль, у якого є поїздки. Спочатку видаліть або перенесіть поїздки.');
  }

  const { error } = await supabase
    .from('cars')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return { success: true, message: 'Автомобіль видалено' };
};

export const updateCarMileage = async (id, newMileage) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  if (!navigator.onLine) {
    throw new Error('Немає з\'єднання з інтернетом');
  }

  if (newMileage < 0) {
    throw new Error('Пробіг не може бути від\'ємним');
  }

  try {
    const { error } = await supabase
      .from('cars')
      .update({ current_mileage: newMileage })
      .eq('id', id);

    if (error) throw error;
    return { success: true, message: 'Пробіг оновлено' };
  } catch (error) {
    if (error.message?.includes('Failed to fetch')) {
      throw new Error('Помилка мережі. Перевірте з\'єднання.');
    }
    throw error;
  }
};

export const getTripsList = async (page = 1, pageSize = 50, filters = {}) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  let query = supabase
    .from('trips')
    .select(`
      id,
      date,
      route,
      start_mileage,
      end_mileage,
      tariff,
      notes,
      is_overnight,
      car_id,
      driver_id,
      driver:drivers(name, id),
      car:cars(brand, model, plate, trailer_number),
      trailer:trailers(trailer_number, brand, model, trailer_type, tariff)
    `, { count: 'exact' });

  if (filters.date) {
    query = query.eq('date', filters.date);
  }
  if (filters.driverId) {
    query = query.eq('driver_id', filters.driverId);
  }
  if (filters.carId) {
    query = query.eq('car_id', filters.carId);
  }
  if (filters.startDate && filters.endDate) {
    query = query.gte('date', filters.startDate).lte('date', filters.endDate);
  }

  const { data, error, count } = await query
    .order('date', { ascending: false })
    .range(from, to);

  if (error) throw error;

  const formattedData = (data || []).map(trip => {
    const isOvernight = trip.is_overnight || false;
    const distance = isOvernight && trip.end_mileage == null ? 0 : (trip.end_mileage || 0) - (trip.start_mileage || 0);
    const amount = distance * (trip.tariff || 0);

    return {
      id: trip.id,
      date: trip.date ? new Date(trip.date).toLocaleDateString('uk-UA') : '—',
      dateOriginal: trip.date,
      driver: trip.driver?.name || '—',
      driverId: trip.driver?.id,
      car: trip.car ? `${trip.car.brand} ${trip.car.model}` : '—',
      carId: trip.car_id,
      plate: trip.car?.plate || '—',
      trailer: trip.trailer?.trailer_number || null,
      trailerInfo: trip.trailer || null,
      route: trip.route || '',
      startMileage: trip.start_mileage || 0,
      endMileage: trip.end_mileage || 0,
      endMileageRaw: trip.end_mileage,  // null means overnight not finished
      distance: distance,
      tariff: trip.tariff || 0,
      amount: amount,
      notes: trip.notes || '',
      isOvernight: isOvernight,
    };
  });

  return {
    data: formattedData,
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize)
  };
};

export const getAllTrips = async () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  const { data, error } = await supabase
    .from('trips')
    .select(`
      id,
      date,
      route,
      start_mileage,
      end_mileage,
      tariff,
      notes,
      is_overnight,
      car_id,
      driver_id,
      driver:drivers(name, id),
      car:cars(brand, model, plate, trailer_number),
      trailer:trailers(trailer_number, brand, model, trailer_type, tariff)
    `)
    .order('date', { ascending: false });

  if (error) throw error;

  return (data || []).map(trip => {
    const isOvernight = trip.is_overnight || false;
    const distance = (isOvernight && trip.end_mileage == null) ? 0 : Math.max(0, (trip.end_mileage || 0) - (trip.start_mileage || 0));
    const amount = distance * (trip.tariff || 0);

    return {
      id: trip.id,
      date: trip.date ? new Date(trip.date).toLocaleDateString('uk-UA') : '—',
      dateOriginal: trip.date,
      driver: trip.driver?.name || '—',
      driverId: trip.driver?.id,
      car: trip.car ? `${trip.car.brand} ${trip.car.model}` : '—',
      carId: trip.car_id,
      plate: trip.car?.plate || '—',
      trailer: trip.trailer?.trailer_number || null,
      trailerInfo: trip.trailer || null,
      route: trip.route || '',
      startMileage: trip.start_mileage || 0,
      endMileage: trip.end_mileage || 0,
      endMileageRaw: trip.end_mileage,
      distance: distance,
      tariff: trip.tariff || 0,
      amount: amount,
      notes: trip.notes || '',
      isOvernight: isOvernight,
    };
  });
};

export const getTripsByPeriod = async (startDate, endDate, driverId = 'all', signal) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  const start = safeDateStr(startDate);
  const end = safeDateStr(endDate);

  if (!start || !end) {
    return [];
  }

  let query = supabase
    .from('trips')
    .select(`
      id,
      date,
      start_mileage,
      end_mileage,
      tariff,
      is_overnight,
      driver:drivers(name, id),
      car:cars(brand, model, plate, trailer_number)
    `)
    .gte('date', start)
    .lte('date', end);

  if (driverId !== 'all') {
    query = query.eq('driver_id', driverId);
  }

  if (signal) {
    query = query.abortSignal(signal);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
};

export const addTrip = async (tripData) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  const { data: car, error: carError } = await supabase
    .from('cars')
    .select('tariff, current_mileage, active')
    .eq('id', tripData.carId)
    .single();

  if (carError) throw new Error('Автомобіль не знайдено');

  if (!car.active) {
    throw new Error('Вибраний автомобіль неактивний');
  }

  const { data: driver, error: driverError } = await supabase
    .from('drivers')
    .select('active')
    .eq('id', tripData.driverId)
    .single();

  if (driverError) throw new Error('Водія не знайдено');

  if (!driver.active) {
    throw new Error('Вибраний водій неактивний');
  }

  const distance = tripData.isOvernight ? 0 : tripData.endMileage - tripData.startMileage;
  if (!tripData.isOvernight && distance < 0) throw new Error('Кінцевий пробіг не може бути меншим за початковий');

  if (tripData.startMileage < car.current_mileage) {
    throw new Error(`Початковий пробіг не може бути меншим за поточний пробіг авто (${car.current_mileage} км)`);
  }

  let trailerTariff = 0;
  if (tripData.trailerId) {
    const { data: trailer, error: trailerError } = await supabase
      .from('trailers')
      .select('tariff')
      .eq('id', tripData.trailerId)
      .single();

    if (!trailerError && trailer) {
      trailerTariff = trailer.tariff || 0;
    }
  }

  const totalTariff = car.tariff + trailerTariff;

  const insertData = {
    date: tripData.date,
    driver_id: tripData.driverId,
    car_id: tripData.carId,
    trailer_id: tripData.trailerId || null,
    route: tripData.route || null,
    start_mileage: tripData.startMileage,
    end_mileage: tripData.isOvernight ? null : tripData.endMileage,
    tariff: totalTariff,
    notes: tripData.notes || null,
    is_overnight: tripData.isOvernight || false,
  };

  const { error: insertError } = await supabase
    .from('trips')
    .insert([insertData]);

  if (insertError) throw insertError;

  // Only update car mileage when end mileage is provided
  if (!tripData.isOvernight) {
    await updateCarMileage(tripData.carId, tripData.endMileage);
  }

  return {
    success: true,
    message: tripData.isOvernight ? 'Поїздку додано! Кінцевий пробіг можна внести пізніше.' : 'Поїздку додано!'
  };
};

export const updateTrip = async (tripData) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  // Читаємо старий end_mileage ДО оновлення, щоб порівняти потім
  const { data: oldTrip } = await supabase
    .from('trips')
    .select('end_mileage')
    .eq('id', tripData.id)
    .single();

  const { data: car, error: carError } = await supabase
    .from('cars')
    .select('tariff, current_mileage, active')
    .eq('id', tripData.carId)
    .single();

  if (carError) throw new Error('Автомобіль не знайдено');

  let trailerTariff = 0;
  if (tripData.trailerId) {
    const { data: trailer, error: trailerError } = await supabase
      .from('trailers')
      .select('tariff')
      .eq('id', tripData.trailerId)
      .single();

    if (!trailerError && trailer) {
      trailerTariff = trailer.tariff || 0;
    }
  }

  const totalTariff = car.tariff + trailerTariff;

  const { error } = await supabase
    .from('trips')
    .update({
      date: tripData.date,
      driver_id: tripData.driverId,
      car_id: tripData.carId,
      trailer_id: tripData.trailerId || null,
      route: tripData.route || null,
      start_mileage: tripData.startMileage,
      end_mileage: tripData.isOvernight ? null : tripData.endMileage,
      tariff: totalTariff,
      notes: tripData.notes || null,
      is_overnight: tripData.isOvernight || false,
      updated_at: new Date().toISOString()
    })
    .eq('id', tripData.id);

  if (error) throw error;

  // Update car mileage only when end mileage is set
  const wasOvernightNowComplete = !tripData.isOvernight && tripData.endMileage != null;
  if (wasOvernightNowComplete && oldTrip && oldTrip.end_mileage !== tripData.endMileage) {
    await updateCarMileage(tripData.carId, tripData.endMileage);
  }

  const wasOvernightBefore = oldTrip?.end_mileage == null;
  return {
    success: true,
    message: wasOvernightBefore && wasOvernightNowComplete
      ? 'Поїздку завершено! Пробіг оновлено.'
      : 'Поїздку оновлено!'
  };
};

export const deleteTrip = async (id) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  const { error } = await supabase
    .from('trips')
    .delete()
    .eq('id', id);

  if (error) throw error;

  return {
    success: true,
    message: 'Поїздку видалено!'
  };
};

export const bulkDeleteTrips = async (startDate, endDate) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  const { error, count } = await supabase
    .from('trips')
    .delete({ count: 'exact' })
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) throw error;

  return {
    success: true,
    message: `Видалено ${count ?? 0} поїздок за вибраний період`,
    count: count ?? 0,
  };
};

export const countTripsByPeriod = async (startDate, endDate) => {
  const { count, error } = await supabase
    .from('trips')
    .select('*', { count: 'exact', head: true })
    .gte('date', startDate)
    .lte('date', endDate);

  if (error) throw error;
  return count || 0;
};

export const getAnalyticsData = async (startDate, endDate, driverId, signal) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  const start = safeDate(startDate);
  const end = safeDate(endDate);

  if (!start || !end) {
    throw new Error('Некоректний формат дати');
  }

  const trips = await getTripsByPeriod(startDate, endDate, driverId, signal);

  // Хелпер для безпечного підрахунку дистанції
  const calcDistance = (t) => {
    if (t.is_overnight && t.end_mileage == null) return 0;
    return Math.max(0, (t.end_mileage || 0) - (t.start_mileage || 0));
  };

  // Тільки завершені поїздки для статистики
  const completedTrips = trips.filter(t => !(t.is_overnight && t.end_mileage == null));

  const totalMileage = completedTrips.reduce((sum, t) => {
    const distance = calcDistance(t);
    return sum + (isNaN(distance) ? 0 : distance);
  }, 0);

  const totalTrips = trips.length;
  const avgDistance = completedTrips.length > 0 ? totalMileage / completedTrips.length : 0;
  const activeDrivers = new Set(trips.map(t => t.driver?.id).filter(Boolean)).size;

  const driversStats = {};
  completedTrips.forEach(trip => {
    if (!trip.driver) return;

    const driverName = trip.driver.name;
    const distance = calcDistance(trip);

    if (!driversStats[driverName]) {
      driversStats[driverName] = {
        name: driverName,
        totalTrips: 0,
        totalMileage: 0,
        distances: []
      };
    }
    driversStats[driverName].totalTrips++;
    driversStats[driverName].totalMileage += distance;
    driversStats[driverName].distances.push(distance);
  });

  const driversArray = Object.values(driversStats).map(d => ({
    name: d.name,
    totalTrips: d.totalTrips,
    totalMileage: Math.round(d.totalMileage),
    avgMileage: d.totalTrips > 0 ? Math.round(d.totalMileage / d.totalTrips) : 0,
    maxMileage: d.distances.length > 0 ? Math.max(...d.distances) : 0
  }));

  const carsStats = {};
  completedTrips.forEach(trip => {
    if (!trip.car) return;

    const carKey = `${trip.car.brand} ${trip.car.model} (${trip.car.plate})`;
    const distance = calcDistance(trip);

    if (!carsStats[carKey]) {
      carsStats[carKey] = {
        name: carKey,
        plate: trip.car.plate,
        trailer: trip.car.trailer_number || null,
        hasTrailer: !!trip.car.trailer_number,
        totalTrips: 0,
        totalMileage: 0
      };
    }
    carsStats[carKey].totalTrips++;
    carsStats[carKey].totalMileage += distance;
  });

  const carsArray = Object.values(carsStats).map(c => ({
    ...c,
    totalMileage: Math.round(c.totalMileage),
    avgMileage: c.totalTrips > 0 ? Math.round(c.totalMileage / c.totalTrips) : 0
  }));

  const timelineMap = {};
  trips.forEach(trip => {
    const date = trip.date;
    const distance = calcDistance(trip);

    if (!timelineMap[date]) {
      timelineMap[date] = { mileage: 0, trips: 0 };
    }
    timelineMap[date].mileage += distance;
    timelineMap[date].trips += 1;
  });

  const sortedDates = Object.keys(timelineMap).sort();

  const timeline = {
    labels: sortedDates.map(date => {
      const d = new Date(date);
      return `${d.getDate()}.${d.getMonth() + 1}`;
    }),
    mileage: sortedDates.map(date => timelineMap[date]?.mileage || 0),
    trips: sortedDates.map(date => timelineMap[date]?.trips || 0)
  };

  const prevStart = new Date(start);
  prevStart.setMonth(prevStart.getMonth() - 1);
  if (prevStart.getDate() !== start.getDate()) {
    prevStart.setDate(0);
  }

  const prevEnd = new Date(end);
  prevEnd.setMonth(prevEnd.getMonth() - 1);
  if (prevEnd.getDate() !== end.getDate()) {
    prevEnd.setDate(0);
  }

  const prevStartStr = safeDateStr(prevStart.toISOString().split('T')[0]);
  const prevEndStr = safeDateStr(prevEnd.toISOString().split('T')[0]);

  let prevTrips = [];
  try {
    prevTrips = await getTripsByPeriod(prevStartStr, prevEndStr, driverId, signal);
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.warn('Не вдалося отримати дані за попередній період:', error);
    }
  }

  const prevMileage = prevTrips.reduce((sum, t) => {
    const distance = (t.end_mileage || 0) - (t.start_mileage || 0);
    return sum + (isNaN(distance) ? 0 : distance);
  }, 0);

  const prevTripsCount = prevTrips.length;
  const prevAvgDistance = prevTripsCount > 0 ? prevMileage / prevTripsCount : 0;

  const calculateChange = (current, previous) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  return {
    summary: {
      totalMileage: Math.round(totalMileage),
      totalTrips: totalTrips,
      avgDistance: Math.round(avgDistance),
      activeDrivers: activeDrivers,
      mileageChange: calculateChange(totalMileage, prevMileage),
      tripsChange: calculateChange(totalTrips, prevTripsCount),
      avgDistanceChange: calculateChange(avgDistance, prevAvgDistance)
    },
    drivers: driversArray.sort((a, b) => b.totalMileage - a.totalMileage),
    cars: carsArray.sort((a, b) => b.totalMileage - a.totalMileage),
    timeline: timeline
  };
};

export const getSettings = async () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  const { data, error } = await supabase
    .from('settings')
    .select('*')
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Помилка отримання налаштувань:', error);
    throw error;
  }

  if (!data) {
    // Спробуємо створити запис з delivery_board_enabled, якщо не вийде — без нього
    const baseInsert = { allow_registration: true, updated_at: new Date().toISOString() };
    const withDelivery = { ...baseInsert, delivery_board_enabled: true };

    let { data: newData, error: insertError } = await supabase
      .from('settings')
      .insert([withDelivery])
      .select()
      .single();

    if (insertError && insertError.message?.includes('delivery_board_enabled')) {
      const retry = await supabase
        .from('settings')
        .insert([baseInsert])
        .select()
        .single();
      if (retry.error) throw retry.error;
      newData = retry.data;
    } else if (insertError) {
      console.error('Помилка створення налаштувань:', insertError);
      throw insertError;
    }

    return { ...newData, delivery_board_enabled: newData.delivery_board_enabled ?? true };
  }

  // Якщо колонки немає в БД — підставляємо true за замовчуванням
  return { ...data, delivery_board_enabled: data.delivery_board_enabled ?? true };
};

export const updateSettings = async (settings) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  const { data: existing } = await supabase
    .from('settings')
    .select('id')
    .maybeSingle();

  // Безпечний payload — виключаємо поля яких може не бути в схемі
  const buildPayload = (src) => {
    const base = {
      allow_registration: src.allow_registration,
      page_size: src.page_size,
      cars_page_size: src.cars_page_size,
      drivers_page_size: src.drivers_page_size,
      trips_page_size: src.trips_page_size,
      users_page_size: src.users_page_size,
      updated_at: new Date().toISOString(),
    };
    // delivery_board_enabled додаємо тільки якщо воно явно передано
    if (src.delivery_board_enabled !== undefined) {
      base.delivery_board_enabled = src.delivery_board_enabled;
    }
    return base;
  };

  let result;

  if (existing) {
    const payload = buildPayload(settings);
    let { data, error } = await supabase
      .from('settings')
      .update(payload)
      .eq('id', existing.id)
      .select()
      .single();

    // Якщо колонки delivery_board_enabled ще немає в БД — повторюємо без неї
    if (error && error.message?.includes('delivery_board_enabled')) {
      const { delivery_board_enabled, ...safePayload } = payload;
      const retry = await supabase
        .from('settings')
        .update(safePayload)
        .eq('id', existing.id)
        .select()
        .single();
      if (retry.error) throw retry.error;
      data = retry.data;
    } else if (error) {
      throw error;
    }
    result = data;
  } else {
    const payload = buildPayload(settings);
    let { data, error } = await supabase
      .from('settings')
      .insert([payload])
      .select()
      .single();

    if (error && error.message?.includes('delivery_board_enabled')) {
      const { delivery_board_enabled, ...safePayload } = payload;
      const retry = await supabase
        .from('settings')
        .insert([safePayload])
        .select()
        .single();
      if (retry.error) throw retry.error;
      data = retry.data;
    } else if (error) {
      throw error;
    }
    result = data;
  }

  return { success: true, message: 'Налаштування збережено', settings: result };
};

export const getTrailersList = async (page = 1, pageSize = 50) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await supabase
    .from('trailers')
    .select('*', { count: 'exact' })
    .order('id')
    .range(from, to);

  if (error) throw error;

  return {
    data: data || [],
    total: count || 0,
    page,
    pageSize,
    totalPages: Math.ceil((count || 0) / pageSize)
  };
};

export const getAllTrailers = async () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  const { data, error } = await supabase
    .from('trailers')
    .select('*')
    .order('id');

  if (error) throw error;
  return data || [];
};

export const getTrailersForSelect = async () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  const { data, error } = await supabase
    .from('trailers')
    .select('id, trailer_number, brand, model, trailer_type, tariff')
    .eq('active', true)
    .order('trailer_number');

  if (error) throw error;

  return (data || []).map(trailer => ({
    id: trailer.id,
    name: `${trailer.trailer_number} ${trailer.brand ? `(${trailer.brand} ${trailer.model || ''})` : ''} - ${trailer.tariff} грн/км`.trim(),
    trailer_number: trailer.trailer_number,
    brand: trailer.brand,
    model: trailer.model,
    type: trailer.trailer_type,
    tariff: trailer.tariff
  }));
};

export const addTrailer = async (trailerData) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  const { data: existingTrailer, error: checkError } = await supabase
    .from('trailers')
    .select('id')
    .eq('trailer_number', trailerData.trailerNumber)
    .maybeSingle();

  if (checkError) throw checkError;

  if (existingTrailer) {
    throw new Error('Причіп з таким номером вже існує');
  }

  const { data, error } = await supabase
    .from('trailers')
    .insert([{
      trailer_number: trailerData.trailerNumber,
      brand: trailerData.brand || null,
      model: trailerData.model || null,
      year: trailerData.year || null,
      trailer_type: trailerData.trailerType || null,
      load_capacity: trailerData.loadCapacity ? Number(trailerData.loadCapacity) : null,
      own_weight: trailerData.ownWeight ? Number(trailerData.ownWeight) : null,
      tariff: Number(trailerData.tariff),
      notes: trailerData.notes || null,
      active: true
    }])
    .select();

  if (error) throw error;
  return { success: true, message: 'Причіп додано!', data };
};

export const updateTrailer = async (id, trailerData) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  if (trailerData.trailerNumber) {
    const { data: existingTrailer, error: checkError } = await supabase
      .from('trailers')
      .select('id')
      .eq('trailer_number', trailerData.trailerNumber)
      .neq('id', id)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existingTrailer) {
      throw new Error('Причіп з таким номером вже існує');
    }
  }

  const { error } = await supabase
    .from('trailers')
    .update({
      trailer_number: trailerData.trailerNumber,
      brand: trailerData.brand || null,
      model: trailerData.model || null,
      year: trailerData.year || null,
      trailer_type: trailerData.trailerType || null,
      load_capacity: trailerData.loadCapacity ? Number(trailerData.loadCapacity) : null,
      own_weight: trailerData.ownWeight ? Number(trailerData.ownWeight) : null,
      tariff: Number(trailerData.tariff),
      notes: trailerData.notes || null,
      active: trailerData.active,
      updated_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) throw error;
  return { success: true, message: 'Дані причепа оновлено' };
};

export const deleteTrailer = async (id) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  const { count, error: checkError } = await supabase
    .from('trips')
    .select('*', { count: 'exact', head: true })
    .eq('trailer_id', id);

  if (checkError) throw checkError;

  if (count && count > 0) {
    throw new Error('Неможливо видалити причіп, який використовується в поїздках. Спочатку видаліть або перенесіть поїздки.');
  }

  const { error } = await supabase
    .from('trailers')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return { success: true, message: 'Причіп видалено' };
};

export const getCarTrailers = async (carId) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  const { data, error } = await supabase
    .from('car_trailers')
    .select(`
      id,
      is_default,
      trailer:trailers(*)
    `)
    .eq('car_id', carId);

  if (error) throw error;

  return (data || []).map(item => ({
    id: item.id,
    is_default: item.is_default,
    ...item.trailer
  }));
};

export const attachTrailerToCar = async (carId, trailerId, isDefault = false) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  if (isDefault) {
    await supabase
      .from('car_trailers')
      .update({ is_default: false })
      .eq('car_id', carId);
  }

  const { data, error } = await supabase
    .from('car_trailers')
    .insert([{
      car_id: carId,
      trailer_id: trailerId,
      is_default: isDefault
    }])
    .select();

  if (error) throw error;
  return { success: true, message: 'Причіп прив\'язано до автомобіля', data };
};

export const detachTrailerFromCar = async (carId, trailerId) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  const { error } = await supabase
    .from('car_trailers')
    .delete()
    .eq('car_id', carId)
    .eq('trailer_id', trailerId);

  if (error) throw error;
  return { success: true, message: 'Причіп відв\'язано від автомобіля' };
};

export const setDefaultTrailer = async (carId, trailerId) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  await supabase
    .from('car_trailers')
    .update({ is_default: false })
    .eq('car_id', carId);

  const { error } = await supabase
    .from('car_trailers')
    .update({ is_default: true })
    .eq('car_id', carId)
    .eq('trailer_id', trailerId);

  if (error) throw error;
  return { success: true, message: 'Причіп за замовчуванням встановлено' };
};

export const getAvailableTrailersForCar = async (carId) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  const { data: attached, error: attachedError } = await supabase
    .from('car_trailers')
    .select('trailer_id')
    .eq('car_id', carId);

  if (attachedError) throw attachedError;

  const attachedIds = attached.map(a => a.trailer_id);

  let query = supabase
    .from('trailers')
    .select('id, trailer_number, brand, model, trailer_type, tariff')
    .eq('active', true);

  if (attachedIds.length > 0) {
    query = query.not('id', 'in', `(${attachedIds.join(',')})`);
  }

  const { data, error } = await query.order('trailer_number');

  if (error) throw error;
  return data || [];
};

export const getRoles = async () => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .order('name');

  if (error) throw error;
  return data || [];
};

export const getRoleById = async (roleId) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  const { data, error } = await supabase
    .from('roles')
    .select('*')
    .eq('id', roleId)
    .single();

  if (error) throw error;
  return data;
};

export const getPermissionsByRoleName = async (roleName) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  const { data, error } = await supabase
    .from('roles')
    .select('permissions')
    .eq('name', roleName)
    .maybeSingle();

  if (error) throw error;
  return data?.permissions || null;
};

export const createRole = async (roleData) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  const { data, error } = await supabase
    .from('roles')
    .insert([{
      name: roleData.name,
      description: roleData.description || null,
      permissions: roleData.permissions || {},
      created_at: new Date().toISOString()
    }])
    .select()
    .single();

  if (error) throw error;
  return { success: true, message: 'Роль створено', role: data };
};

export const updateRole = async (roleId, roleData) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  const updateData = {};
  if (roleData.name) updateData.name = roleData.name;
  if (roleData.description !== undefined) updateData.description = roleData.description;
  if (roleData.permissions) updateData.permissions = roleData.permissions;
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('roles')
    .update(updateData)
    .eq('id', roleId)
    .select()
    .single();

  if (error) throw error;
  return { success: true, message: 'Роль оновлено', role: data };
};

export const deleteRole = async (roleId) => {
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Помилка конфігурації: відсутні змінні оточення');
  }

  // Спочатку отримуємо назву ролі, бо в таблиці users поле role зберігає назву, а не id
  const { data: roleData, error: roleError } = await supabase
    .from('roles')
    .select('name')
    .eq('id', roleId)
    .single();

  if (roleError) throw roleError;

  const { count, error: checkError } = await supabase
    .from('users')
    .select('*', { count: 'exact', head: true })
    .eq('role', roleData.name);

  if (checkError) throw checkError;

  if (count && count > 0) {
    throw new Error('Неможливо видалити роль, яка використовується користувачами');
  }

  const { error } = await supabase
    .from('roles')
    .delete()
    .eq('id', roleId);

  if (error) throw error;
  return { success: true, message: 'Роль видалено' };
};

export default supabase;

export const getDeliveryTasks = async () => {
  const { data, error } = await supabase
    .from('delivery_tasks')
    .select(`
      *,
      created_by_user:users!delivery_tasks_created_by_fkey(id, name),
      assigned_dispatcher:users!delivery_tasks_dispatcher_id_fkey(id, name),
      assigned_driver:drivers!delivery_tasks_driver_id_fkey(id, name),
      assigned_car:cars!delivery_tasks_car_id_fkey(id, brand, model, plate)
    `)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
};

export const addDeliveryTask = async (taskData) => {
  const { data, error } = await supabase
    .from('delivery_tasks')
    .insert([{
      title: taskData.title,
      city: taskData.city || null,
      weight: taskData.weight || null,
      priority: taskData.priority || 'medium',
      notes: taskData.notes || null,
      delivery_date: taskData.delivery_date || null,
      col: 'new',
      created_by: taskData.created_by,
      created_at: new Date().toISOString(),
    }])
    .select()
    .single();
  if (error) throw error;
  return { success: true, data };
};

export const updateDeliveryTask = async (id, taskData) => {
  const updatePayload = { updated_at: new Date().toISOString() };
  const fields = ['title', 'city', 'weight', 'priority', 'notes', 'delivery_date', 'col',
    'dispatcher_id', 'driver_id', 'car_id', 'planned_date'];
  fields.forEach(f => { if (taskData[f] !== undefined) updatePayload[f] = taskData[f]; });

  const { data, error } = await supabase
    .from('delivery_tasks')
    .update(updatePayload)
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return { success: true, data };
};

export const deleteDeliveryTask = async (id) => {
  const { error } = await supabase
    .from('delivery_tasks')
    .delete()
    .eq('id', id);
  if (error) throw error;
  return { success: true };
};

// ════════════════════════════════════════════════════════════════
//  Telegram Bot Integration
// ════════════════════════════════════════════════════════════════

/**
 * Generate a one-time token for linking a driver to Telegram.
 * Returns { token, expiresAt } — token is valid for 30 minutes.
 */
export const generateTelegramToken = async (driverId) => {
  // Generate a random 8-char token
  const token = Math.random().toString(36).substring(2, 6).toUpperCase() +
    Math.random().toString(36).substring(2, 6).toUpperCase();

  const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  // Invalidate any previous unused tokens for this driver
  await supabase
    .from('telegram_link_tokens')
    .update({ used: true })
    .eq('driver_id', driverId)
    .eq('used', false);

  const { error } = await supabase
    .from('telegram_link_tokens')
    .insert([{ token, driver_id: driverId, expires_at: expiresAt }]);

  if (error) throw error;
  return { token, expiresAt };
};

/**
 * Get current Telegram link status for a driver.
 * Returns { linked, telegramName, linkedAt } or null.
 */
export const getTelegramLinkStatus = async (driverId) => {
  const { data, error } = await supabase
    .from('telegram_users')
    .select('telegram_id, telegram_name, linked_at')
    .eq('driver_id', driverId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  return {
    linked: true,
    telegramName: data.telegram_name,
    telegramId: data.telegram_id,
    linkedAt: data.linked_at,
  };
};

/**
 * Unlink Telegram from a driver.
 */
export const unlinkTelegram = async (driverId) => {
  const { error, count } = await supabase
    .from('telegram_users')
    .delete({ count: 'exact' })
    .eq('driver_id', driverId);
  if (error) throw error;
  // count === 0 means no row found — not an error per se, but worth knowing
  return { success: true, deleted: count ?? 0 };
};