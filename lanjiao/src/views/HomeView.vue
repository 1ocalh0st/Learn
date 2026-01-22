<template>
  <h1>首页</h1>

  <p v-if="user.name">当前用户：{{ user.name }}</p>
  <p v-else>未登录</p>

  <button @click="hello">GET /api/hello</button>
  <button @click="login">登录</button>
  <button @click="me">GET /api/me</button>
  <button @click="user.logout()">退出</button>

  <pre style="margin-top:12px;">{{ log }}</pre>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { request } from "@/utils/request";
import { useUserStore } from '@/stores/user'

const user = useUserStore()
const log = ref("");

async function hello() {
  const data = await request<{ msg: string; time: number }>("/api/hello");
  log.value = JSON.stringify(data, null, 2);
}

async function login() {
  const data = await request<{ token: string; name: string }>("/api/login", {
    method: "POST",
    body: JSON.stringify({ username: "admin", password: "123456" }),
  });
  user.setAuth(data.token, data.name);
  log.value = "登录成功";
}

async function me() {
  try {
    const data = await request<{ name: string; role: string }>("/api/me");
    log.value = JSON.stringify(data, null, 2);
  } catch (e: any) {
    log.value = e.message;
  }
}
</script>

