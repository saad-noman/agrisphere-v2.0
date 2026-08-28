import { createApp } from 'vue';
import 'bootstrap/dist/css/bootstrap.min.css';
import './assets/theme.css';
import './stores/theme';
import App from './App.vue';
import router from './router';

const app = createApp(App);

app.use(router);
app.mount('#app');
