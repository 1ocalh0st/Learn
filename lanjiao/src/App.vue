<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRoute } from "vue-router";
import DefaultLayout from "./layouts/DefaultLayout.vue";
import { useUserStore } from "./stores/user";
import { useAppStore } from "./stores/app";

const route = useRoute();
const user = useUserStore();
const appStore = useAppStore();

onMounted(() => {
  appStore.applyTheme();
});

const showLayout = computed(() => {
  return Boolean(user.token) && route.meta.requiresAuth === true;
});
</script>

<template>
  <DefaultLayout v-if="showLayout" />
  <RouterView v-else />
</template>
