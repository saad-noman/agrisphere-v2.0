<template>
  <div class="register auth-page">
    <div class="auth-card">
      <h2>{{ t('auth.registerTitle') }}</h2>
      <p class="subtitle">{{ t('auth.registerSubtitle') }}</p>

      <form novalidate @submit.prevent="handleSubmit">
        <div class="mb-3">
          <label class="form-label" for="reg-name">{{ t('auth.name') }}</label>
          <input
            id="reg-name"
            v-model.trim="name"
            type="text"
            class="form-control"
            autocomplete="name"
            :placeholder="t('auth.namePlaceholder')"
            :aria-invalid="!!fieldErrors.name"
            :aria-describedby="fieldErrors.name ? 'reg-name-err' : undefined"
          />
          <p v-if="fieldErrors.name" id="reg-name-err" class="field-error">{{ fieldErrors.name }}</p>
        </div>

        <div class="mb-3">
          <label class="form-label" for="reg-email">{{ t('auth.email') }}</label>
          <input
            id="reg-email"
            v-model.trim="email"
            type="email"
            class="form-control"
            autocomplete="email"
            :placeholder="t('auth.emailPlaceholder')"
            :aria-invalid="!!fieldErrors.email"
            :aria-describedby="fieldErrors.email ? 'reg-email-err' : undefined"
          />
          <p v-if="fieldErrors.email" id="reg-email-err" class="field-error">{{ fieldErrors.email }}</p>
        </div>

        <div class="mb-3">
          <label class="form-label" for="reg-password">{{ t('auth.password') }}</label>
          <input
            id="reg-password"
            v-model="password"
            type="password"
            class="form-control"
            autocomplete="new-password"
            :placeholder="t('auth.passwordPlaceholder')"
            :aria-invalid="!!fieldErrors.password"
            :aria-describedby="fieldErrors.password ? 'reg-password-err' : undefined"
          />
          <p v-if="fieldErrors.password" id="reg-password-err" class="field-error">
            {{ fieldErrors.password }}
          </p>
        </div>

        <div class="mb-3">
          <label class="form-label" for="reg-confirm">{{ t('auth.confirmPassword') }}</label>
          <input
            id="reg-confirm"
            v-model="confirmPassword"
            type="password"
            class="form-control"
            autocomplete="new-password"
            :aria-invalid="!!fieldErrors.confirmPassword"
            :aria-describedby="fieldErrors.confirmPassword ? 'reg-confirm-err' : undefined"
          />
          <p v-if="fieldErrors.confirmPassword" id="reg-confirm-err" class="field-error">
            {{ fieldErrors.confirmPassword }}
          </p>
        </div>

        <div class="mb-3">
          <label class="form-label" for="reg-role">{{ t('auth.registeringAs') }}</label>
          <select id="reg-role" v-model="role" class="form-select">
            <option value="farmer">{{ t('roles.farmer') }}</option>
            <option value="expert">{{ t('roles.expert') }}</option>
            <option value="organization_owner">{{ t('roles.organization_owner') }}</option>
          </select>
        </div>

        <div class="mb-3">
          <label class="form-label" for="reg-phone">
            {{ t('auth.phone') }} <span class="field-optional">({{ t('common.optional') }})</span>
          </label>
          <input
            id="reg-phone"
            v-model.trim="phone"
            type="tel"
            class="form-control"
            inputmode="numeric"
            :placeholder="t('auth.phonePlaceholder')"
            :aria-invalid="!!fieldErrors.phone"
            :aria-describedby="fieldErrors.phone ? 'reg-phone-err' : undefined"
          />
          <p v-if="fieldErrors.phone" id="reg-phone-err" class="field-error">{{ fieldErrors.phone }}</p>
        </div>

        <AddressFields id-prefix="reg" :address="address" @update:address="address = $event" />

        <div v-if="role === 'expert'" class="mb-3">
          <label class="form-label" for="reg-spec">{{ t('auth.specialization') }}</label>
          <input
            id="reg-spec"
            v-model.trim="specialization"
            type="text"
            class="form-control"
            :placeholder="t('auth.specializationPlaceholder')"
          />
        </div>

        <button type="submit" class="btn-pill" :disabled="loading">
          {{ loading ? t('auth.registering') : t('auth.registerTitle') }}
        </button>

        <p v-if="error" class="error-text" role="alert">{{ error }}</p>
      </form>

      <p class="auth-switch">
        {{ t('auth.haveAccount') }}
        <router-link to="/login">{{ t('nav.login') }}</router-link>
      </p>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { useRouter } from 'vue-router';
import { register } from '../stores/auth';
import { t } from '../i18n';
import AddressFields from '../components/AddressFields.vue';
import { emptyAddress } from '../utils/address';

const name = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const role = ref('farmer');
const phone = ref('');
const address = ref(emptyAddress());
const specialization = ref('');
const error = ref('');
const loading = ref(false);
const router = useRouter();

const fieldErrors = reactive({
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
});

function validate() {
  fieldErrors.name = name.value
    ? ''
    : t('validation.requiredNamed', { field: t('auth.name') });

  fieldErrors.email = !email.value
    ? t('validation.requiredNamed', { field: t('auth.email') })
    : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)
      ? ''
      : t('validation.email');

  fieldErrors.password = !password.value
    ? t('validation.requiredNamed', { field: t('auth.password') })
    : password.value.length < 6
      ? t('validation.passwordShort')
      : '';

  fieldErrors.confirmPassword =
    confirmPassword.value === password.value ? '' : t('validation.passwordMatch');

  // Bangladeshi mobile numbers: 11 digits starting 01, optionally +88 prefixed.
  fieldErrors.phone =
    !phone.value || /^(?:\+?88)?01[3-9]\d{8}$/.test(phone.value.replace(/[\s-]/g, ''))
      ? ''
      : t('validation.phone');

  return !Object.values(fieldErrors).some(Boolean);
}

async function handleSubmit() {
  error.value = '';
  if (!validate()) return;

  loading.value = true;
  try {
    await register({
      name: name.value,
      email: email.value,
      password: password.value,
      role: role.value,
      phone: phone.value,
      address: address.value,
      specialization: role.value === 'expert' ? specialization.value : undefined,
    });
    router.push('/');
  } catch (err) {
    error.value = err.response?.data?.message || t('auth.registerFailed');
  } finally {
    loading.value = false;
  }
}
</script>
