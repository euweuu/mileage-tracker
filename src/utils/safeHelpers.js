export const safeDivide = (a, b, defaultValue = 0) => {
  if (b === 0 || b === null || b === undefined) return defaultValue;
  const numA = Number(a);
  const numB = Number(b);
  if (isNaN(numA) || isNaN(numB)) return defaultValue;
  return numA / numB;
};

export const safeNumber = (value, defaultValue = 0) => {
  if (value === null || value === undefined) return defaultValue;
  if (typeof value === 'string' && value.trim() === '') return defaultValue;
  const num = Number(value);
  return isNaN(num) ? defaultValue : num;
};

export const safePositiveNumber = (value, defaultValue = 0) => {
  const num = safeNumber(value);
  return num < 0 ? defaultValue : num;
};

export const safeMultiply = (a, b, defaultValue = 0) => {
  const numA = safeNumber(a);
  const numB = safeNumber(b);
  const result = numA * numB;
  return isNaN(result) ? defaultValue : result;
};

export const safePercentage = (part, total, decimals = 1) => {
  const numPart = safeNumber(part);
  const numTotal = safeNumber(total);
  if (numTotal === 0) return '0';
  const percentage = (numPart / numTotal) * 100;
  return percentage.toFixed(decimals);
};

export const safeDate = (dateStr, defaultValue = null) => {
  if (!dateStr) return defaultValue;
  const date = new Date(dateStr);
  return isNaN(date.getTime()) ? defaultValue : date;
};

export const safeDateStr = (dateStr, defaultValue = '') => {
  const date = safeDate(dateStr);
  return date ? date.toISOString().split('T')[0] : defaultValue;
};

export const formatDateSafe = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return dateStr;
  return `${day}.${month}.${year}`;
};

export const getDayOfWeekSafe = (dateStr) => {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-');
  if (!year || !month || !day) return '';
  const date = new Date(Date.UTC(year, month - 1, day));
  const days = ['Нд', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
  return days[date.getUTCDay()];
};

export const isOnline = () => {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
};

export const matchesDateFilter = (dateStr, filterStr) => {
  if (!filterStr) return true;
  if (!dateStr) return false;

  const filter = filterStr.toLowerCase().trim();
  if (filter === '') return true;

  if (dateStr.toLowerCase().includes(filter)) return true;

  try {
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return false;

    const ukrFormat = `${day}.${month}.${year}`;
    if (ukrFormat.toLowerCase().includes(filter)) return true;

    if (filter === year) return true;
    if (filter === month) return true;
    if (filter === day) return true;
    if (filter === `${day}.${month}`) return true;
    if (filter === `${month}.${year}`) return true;
    if (filter === `${day}.${month}.${year}`) return true;

    const dayNoZero = String(Number(day));
    const monthNoZero = String(Number(month));
    if (filter === dayNoZero) return true;
    if (filter === monthNoZero) return true;
    if (filter === `${dayNoZero}.${monthNoZero}`) return true;
    if (filter === `${dayNoZero}.${monthNoZero}.${year}`) return true;

  } catch (e) {
    // Игнорируем ошибки парсинга
  }

  return false;
};

export const getMonthStart = (date = new Date()) => {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), 1);
};

export const getMonthEnd = (date = new Date()) => {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth() + 1, 0);
};

export const formatDateForInput = (date) => {
  const d = safeDate(date);
  if (!d) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const isSameDay = (date1, date2) => {
  if (!date1 || !date2) return false;

  let d1 = safeDate(date1);
  let d2 = safeDate(date2);

  if (!d1 && typeof date1 === 'string') {
    if (date1.includes('.')) {
      const [day, month, year] = date1.split('.');
      d1 = new Date(`${year}-${month}-${day}`);
    }
  }

  if (!d2 && typeof date2 === 'string') {
    if (date2.includes('.')) {
      const [day, month, year] = date2.split('.');
      d2 = new Date(`${year}-${month}-${day}`);
    }
  }

  if (!d1 || !d2) return false;

  return d1.toDateString() === d2.toDateString();
};

export const isValidDate = (dateStr) => {
  if (!dateStr) return false;
  const date = new Date(dateStr);
  return !isNaN(date.getTime());
};

export const safeRound = (value, decimals = 0) => {
  const num = safeNumber(value);
  const factor = Math.pow(10, decimals);
  return Math.round(num * factor) / factor;
};

export const formatNumber = (value, decimals = 0) => {
  const num = safeNumber(value);
  return num.toLocaleString('uk-UA', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
};

export const formatCurrency = (value, currency = 'грн') => {
  const num = safeNumber(value);
  return `${num.toLocaleString('uk-UA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })} ${currency}`;
};

export const formatDistance = (value) => {
  const num = safeNumber(value);
  return `${num.toLocaleString('uk-UA')} км`;
};

export const formatPhone = (value) => {
  if (!value) return '';
  const numbers = value.replace(/\D/g, '');
  if (numbers.length === 0) return '';

  if (numbers.length <= 3) {
    return `+${numbers}`;
  } else if (numbers.length <= 5) {
    return `+${numbers.slice(0, 3)} (${numbers.slice(3)}`;
  } else if (numbers.length <= 8) {
    return `+${numbers.slice(0, 3)} (${numbers.slice(3, 5)}) ${numbers.slice(5)}`;
  } else if (numbers.length <= 10) {
    return `+${numbers.slice(0, 3)} (${numbers.slice(3, 5)}) ${numbers.slice(5, 8)}-${numbers.slice(8)}`;
  } else {
    return `+${numbers.slice(0, 3)} (${numbers.slice(3, 5)}) ${numbers.slice(5, 8)}-${numbers.slice(8, 10)}-${numbers.slice(10, 12)}`;
  }
};

/**
 * Повертає зрозуміле повідомлення про помилку мережі
 * @param {Error} e
 * @returns {string}
 */
export const netError = (e) => {
  if (e.message?.includes('Failed to fetch') || !navigator.onLine) {
    return 'Помилка мережі. Перевірте з\'єднання.';
  }
  return e.message || 'Невідома помилка';
};

export const safeHelpers = {
  safeDivide,
  safeNumber,
  safePositiveNumber,
  safeMultiply,
  safePercentage,
  safeDate,
  safeDateStr,
  formatDateSafe,
  getDayOfWeekSafe,
  isOnline,
  matchesDateFilter,
  getMonthStart,
  getMonthEnd,
  formatDateForInput,
  isSameDay,
  isValidDate,
  safeRound,
  formatNumber,
  formatCurrency,
  formatDistance,
  formatPhone,
  netError
};