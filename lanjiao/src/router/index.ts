import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: () => import('../views/LoginView.vue'),
    },
    {
      path: '/',
      name: 'home',
      component: HomeView,
      meta: { requiresAuth: true }
    },
    {
      path: '/users',
      name: 'users',
      component: () => import('../views/UserView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: '/profile',
      name: 'profile',
      component: () => import('../views/ProfileView.vue'),
      meta: { requiresAuth: true }
    },
    {
      path: "/register",
      component: () => import("@/views/Register.vue")
    },
    {
      path: '/auth/wechat/callback',
      name: 'wechat-callback',
      component: () => import('@/views/WechatCallbackView.vue'),
    },
    {
      path: '/auth/qq/callback',
      name: 'qq-callback',
      component: () => import('@/views/AuthQQCallback.vue'),
    },
    {
      path: '/auth/github/callback',
      name: 'github-callback',
      component: () => import('@/views/AuthGithubCallback.vue'),
    },
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
