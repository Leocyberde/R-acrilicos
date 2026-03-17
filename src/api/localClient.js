const API_BASE = '/api';

function getToken() {
  return localStorage.getItem('auth_token');
}

function setToken(token) {
  localStorage.setItem('auth_token', token);
}

function removeToken() {
  localStorage.removeItem('auth_token');
}

async function request(method, path, body, isFormData = false) {
  const token = getToken();
  const headers = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const res = await fetch(`${API_BASE}${path}`, {
    method,
    headers,
    body: isFormData ? body : body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    const error = new Error(err.error || 'Request failed');
    error.status = res.status;
    throw error;
  }

  return res.json();
}

function createEntityClient(entityName) {
  const base = `/entities/${entityName}`;
  return {
    list: (sort, limit) => {
      const params = new URLSearchParams();
      if (sort) params.set('sort', sort);
      if (limit) params.set('limit', limit);
      const qs = params.toString();
      return request('GET', `${base}${qs ? '?' + qs : ''}`);
    },
    filter: (filters, sort, limit) => {
      const params = new URLSearchParams();
      if (sort) params.set('sort', sort);
      if (limit) params.set('limit', limit);
      if (filters) {
        for (const [k, v] of Object.entries(filters)) {
          if (v !== undefined && v !== null) params.set(k, v);
        }
      }
      const qs = params.toString();
      return request('GET', `${base}${qs ? '?' + qs : ''}`);
    },
    get: (id) => request('GET', `${base}/${id}`),
    create: (data) => request('POST', base, data),
    update: (id, data) => request('PUT', `${base}/${id}`, data),
    delete: (id) => request('DELETE', `${base}/${id}`),
    subscribe: () => () => {},
  };
}

const auth = {
  me: () => request('GET', '/auth/me'),

  login: async (email, password) => {
    const result = await request('POST', '/auth/login', { email, password });
    if (result.token) setToken(result.token);
    return result;
  },

  register: async (data) => {
    const result = await request('POST', '/auth/register', data);
    if (result.token) setToken(result.token);
    return result;
  },

  logout: () => {
    removeToken();
    window.location.href = '/select';
  },

  redirectToLogin: () => {
    window.location.href = '/select';
  },

  resetPassword: (userId, newPassword) =>
    request('POST', '/auth/reset-password', { user_id: userId, new_password: newPassword }),
};

const integrations = {
  Core: {
    UploadFile: async ({ file }) => {
      const formData = new FormData();
      formData.append('file', file);
      return request('POST', '/integrations/upload', formData, true);
    },
    ExtractDataFromUploadedFile: async () => {
      return { data: {} };
    },
  },
};

const users = {
  inviteUser: async (email, role) => {
    return request('POST', '/auth/register', {
      email,
      password: Math.random().toString(36).slice(2) + 'Aa1!',
      role
    });
  },
};

export const localClient = {
  entities: {
    Budget: createEntityClient('Budget'),
    BudgetRequest: createEntityClient('BudgetRequest'),
    WorkOrder: createEntityClient('WorkOrder'),
    Receipt: createEntityClient('Receipt'),
    Financial: createEntityClient('Financial'),
    Client: createEntityClient('Client'),
    Settings: createEntityClient('Settings'),
    LayoutSettings: createEntityClient('LayoutSettings'),
    SectionStyles: createEntityClient('SectionStyles'),
    UserPermissions: createEntityClient('UserPermissions'),
    User: createEntityClient('User'),
  },
  auth,
  integrations,
  users,
};
