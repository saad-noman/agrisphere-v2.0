<template>
  <div class="card mb-3">
    <div class="card-body">
      <h3 class="h5 mb-3">{{ t('account.changePassword') }}</h3>

      <p v-if="successMessage" class="app-alert app-alert-success">{{ successMessage }}</p>
      <p v-if="generalError" class="app-alert app-alert-danger">{{ generalError }}</p>

      <div class="mb-2">
        <label class="form-label" for="cp-current">{{ t('account.currentPassword') }}</label>
        <input id="cp-current" v-model="currentPassword" type="password" class="form-control" autocomplete="current-password" />
        <p v-if="fieldErrors.currentPassword" class="error-text small mb-0">{{ fieldErrors.currentPassword }}</p>
      </div>

      <div class="mb-2">
        <label class="form-label" for="cp-new">{{ t('account.newPassword') }}</label>
        <input id="cp-new" v-model="newPassword" type="password" class="form-control" autocomplete="new-password" />
        <p v-if="fieldErrors.newPassword" class="error-text small mb-0">{{ fieldErrors.newPassword }}</p>
      </div>

      <div class="mb-3">
        <label class="form-label" for="cp-confirm">{{ t('account.confirmNewPassword') }}</label>
        <input id="cp-confirm" v-model="confirmPassword" type="password" class="form-control" autocomplete="new-password" />
        <p v-if="fieldErrors.confirmPassword" class="error-text small mb-0">{{ fieldErrors.confirmPassword }}</p>
      </div>

      <button type="button" class="btn-pill" :disabled="saving" @click="submit">
        {{ saving ? t('account.saving') : t('account.updatePassword') }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { t } from '../i18n';
import { changePassword } from '../services/profileService';

const currentPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const saving = ref(false);
const successMessage = ref('');
const generalError = ref('');
const fieldErrors = ref({});

function reset() {
  successMessage.value = '';
  generalError.value = '';
  fieldErrors.value = {};
}

async function submit() {
  reset();

  // Catch the obvious mismatch before asking the server
  if (newPassword.value !== confirmPassword.value) {
    fieldErrors.value = { confirmPassword: t('account.passwordsDoNotMatch') };
    return;
  }

  saving.value = true;

  try {
    const { data } = await changePassword({
      currentPassword: currentPassword.value,
      newPassword: newPassword.value,
      confirmPassword: confirmPassword.value,
    });

    successMessage.value = data.message || t('account.passwordUpdated');
    currentPassword.value = '';
    newPassword.value = '';
    confirmPassword.value = '';
  } catch (err) {
    const body = err.response?.data;

    // The API names the offending field so the error lands on that input
    if (body && body.field) {
      fieldErrors.value = { [body.field]: body.message };
    } else {
      generalError.value = body?.message || t('account.passwordUpdateFailed');
    }
  } finally {
    saving.value = false;
  }
}
</script>
