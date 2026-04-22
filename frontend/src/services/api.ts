export const API_BASE_URL = '/api';

export const AUTH_API = {
  login: `${API_BASE_URL}/auth/login`,
  register: `${API_BASE_URL}/auth/register`,
  me: `${API_BASE_URL}/auth/me`,
  avatar: `${API_BASE_URL}/auth/avatar`,
};

export const SCHEDULE_API = {
  base: `${API_BASE_URL}/schedules`,
  byDate: (date: string) => `${API_BASE_URL}/schedules/date/${date}`,
};

export const DIARY_API = {
  base: `${API_BASE_URL}/diaries`,
  byDate: (date: string) => `${API_BASE_URL}/diaries/date/${date}`,
};

export const ANALYSIS_API = {
  daily: `${API_BASE_URL}/analysis/daily`,
  weekly: `${API_BASE_URL}/analysis/weekly`,
  monthly: `${API_BASE_URL}/analysis/monthly`,
};

export const SETTINGS_API = {
  base: `${API_BASE_URL}/settings`,
};
