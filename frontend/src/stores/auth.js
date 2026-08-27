import { reactive } from 'vue';
import api from '../services/api';

const storedUser = localStorage.getItem('user');

export const authState = reactive({
  token: localStorage.getItem('token') || null,
  user: storedUser ? JSON.parse(storedUser) : null,
});

function saveSession(token, user) {
  authState.token = token;
  authState.user = user;
  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(user));
}

export async function register(details) {
  const response = await api.post('/auth/register', details);
  saveSession(response.data.token, response.data.user);
}

export async function login(email, password) {
  const response = await api.post('/auth/login', { email, password });
  saveSession(response.data.token, response.data.user);
}

// Updates the locally stored user after a profile edit (e.g. name changed),
// so the Navbar greeting stays in sync without needing to log in again.
export function setUser(user) {
  authState.user = user;
  localStorage.setItem('user', JSON.stringify(user));
}

export function logout() {
  authState.token = null;
  authState.user = null;
  localStorage.removeItem('token');
  localStorage.removeItem('user');
}
