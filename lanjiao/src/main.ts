import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'
import { useUserStore } from './stores/user'

const app = createApp(App)

const pinia = createPinia();
app.use(pinia);

const user = useUserStore();
user.initFromStorage();

app.use(router)
app.mount('#app')
