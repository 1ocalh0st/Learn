<template>
  <h1>登录</h1>

  <div style="display:flex; gap:8px; align-items:center;">
    <input v-model="username" placeholder="username" />
    <input v-model="password" placeholder="password" type="password" />
    <button @click="submit">登录</button>
  </div>

  <p style="color:red;" v-if="err">{{ err }}</p>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { request } from "@/utils/request";
import { useUserStore } from "@/stores/user";

const username = ref("admin");
const password = ref("123456");
const err = ref("");

const user = useUserStore();
const router = useRouter();
const route = useRoute();

async function submit() {
  err.value = "";
  try {
    const data = await request<{ token: string; name: string }>("/api/login", {
      method: "POST",
      body: JSON.stringify({ username: username.value, password: password.value }),
    });
    user.setAuth(data.token, data.name);

    const redirect = (route.query.redirect as string) || "/";
    router.replace(redirect);
  } catch (e: any) {
    err.value = e.message;
  }
}
</script>
