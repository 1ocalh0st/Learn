<template>
  <h1>用户列表</h1>

  <div style="display:flex; gap:8px; align-items:center;">
    <button @click="load">刷新</button>
    <input v-model="newName" placeholder="new user name" />
    <button @click="add">新增</button>
    <span v-if="loading">loading...</span>
    <span v-if="err" style="color:red">{{ err }}</span>
  </div>

  <table border="1" cellpadding="6" cellspacing="0" style="margin-top:12px;">
    <thead>
      <tr>
        <th>ID</th>
        <th>姓名</th>
        <th>创建时间</th>
        <th>操作</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="u in users" :key="u.id">
        <td>{{ u.id }}</td>
        <td>{{ u.name }}</td>
        <td>{{ formatTime(u.created_at) }}</td>
        <td>
          <button @click="remove(u.id)">删除</button>
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { request } from "@/utils/request";

type User = { id: number; name: string; created_at: string };

const users = ref<User[]>([]);
const newName = ref("");
const loading = ref(false);
const err = ref("");

function formatTime(iso: string) {
  if (!iso) return "";  //空字符串返回空
  const d = new Date(iso); // 字符串转化为JS的Date对象
  if (Number.isNaN(d.getTime())) return iso; // 兜底：解析失败就原样显示

  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ` +
    `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  );
}

async function load() {
  err.value = "";
  loading.value = true;
  try {
    users.value = await request<User[]>("/api/users/list");
  } catch (e: any) {
    err.value = e.message;
  } finally {
    loading.value = false;
  }
}

async function add() {
  const name = newName.value.trim();
  if (!name) return;

  err.value = "";
  try {
    await request<User>("/api/users/add", {
      method: "POST",
      body: JSON.stringify({ name }),
    });
    newName.value = "";
    await load();
  } catch (e: any) {
    err.value = e.message;
  }
}

async function remove(id: number) {
  err.value = "";
  try {
    await request<void>("/api/users/delete", {
      method: "POST",
      body: JSON.stringify({ id }),
    });
    await load();
  } catch (e: any) {
    err.value = e.message;
  }
}

load();
</script>
