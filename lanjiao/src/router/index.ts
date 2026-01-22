import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component:() => import('../views/LoginView.vue'),
    },
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta:{ requiresAuth: true }
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('../views/UserView.vue'),
      meta:{ requiresAuth: true }
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/ProfileView.vue'),
      meta:{ requiresAuth: true }
    }
  ],
})

import { useUserStore } from "@/stores/user";

router.beforeEach((to) => {
  const user = useUserStore();
  if (to.meta.requiresAuth && !user.token) {
    return { name: "login", query: { redirect: to.fullPath } };
  }
});

export default router
