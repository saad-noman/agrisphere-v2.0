import { createApp } from 'vue';
import 'bootstrap/dist/css/bootstrap.min.css';
import './assets/theme.css';
import './stores/theme';
// Importing the i18n module applies the saved language to <html> before the
// first paint, so Bangla typography rules are in place immediately.
import './i18n';
import App from './App.vue';
import router from './router';

const app = createApp(App);

app.use(router);
app.mount('#app');
