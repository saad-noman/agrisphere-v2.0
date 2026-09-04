<template>
  <div class="login auth-page">
    <div class="auth-card">
      <h2>{{ t('auth.loginTitle') }}</h2>
      <p class="subtitle">{{ t('auth.loginSubtitle') }}</p>

      <form novalidate @submit.prevent="handleSubmit">
        <div class="mb-3">
          <label class="form-label" for="login-email">{{ t('auth.email') }}</label>
          <input
            id="login-email"
            v-model.trim="email"
            type="email"
            class="form-control"
            autocomplete="email"
            :placeholder="t('auth.emailPlaceholder')"
            :aria-invalid="!!fieldErrors.email"
            :aria-describedby="fieldErrors.email ? 'login-email-err' : undefined"
          />
          <p v-if="fieldErrors.email" id="login-email-err" class="field-error">
            {{ fieldErrors.email }}
          </p>
        </div>

        <div class="mb-3">
          <label class="form-label" for="login-password">{{ t('auth.password') }}</label>
          <input
            id="login-password"
            v-model="password"
            type="password"
            class="form-control"
            autocomplete="current-password"
            :aria-invalid="!!fieldErrors.password"
            :aria-describedby="fieldErrors.password ? 'login-password-err' : undefined"
          />
          <p v-if="fieldErrors.password" id="login-password-err" class="field-error">
            {{ fieldErrors.password }}
          </p>
        </div>

        <button type="submit" class="btn-pill" :disabled="loading">
          {{ loading ? t('auth.loggingIn') : t('auth.loginTitle') }}
        </button>

        <p v-if="error" class="error-text" role="alert">{{ error }}</p>
      </form>

      <p class="auth-switch">
        {{ t('auth.noAccount') }}
        <router-link to="/register">{{ t('nav.register') }}</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { login } from '../stores/auth';
import { t } from '../i18n';

const email = ref('');
const password = ref('');
const error = ref('');
const loading = ref(false);
const router = useRouter();
const route = useRoute();

// Field-level messages sit next to the input they belong to, instead of one
// generic line at the bottom of the form.
const fieldErrors = reactive({ email: '', password: '' });

function validate() {
  fieldErrors.email = !email.value
    ? t('validation.requiredNamed', { field: t('auth.email') })
    : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)
      ? ''
      : t('validation.email');

  fieldErrors.password = password.value
    ? ''
    : t('validation.requiredNamed', { field: t('auth.password') });

  return !fieldErrors.email && !fieldErrors.password;
}

async function handleSubmit() {
  error.value = '';
  if (!validate()) return;

  loading.value = true;
  try {
    await login(email.value, password.value);
    // The route guard stores where the user was heading before being asked to
    // sign in, so send them there rather than always to the home page.
    const redirect = typeof route.query.redirect === 'string' ? route.query.redirect : '/';
    router.push(redirect);
  } catch (err) {
    error.value = err.response?.data?.message || t('auth.loginFailed');
  } finally {
    loading.value = false;
  }
}
</script>
