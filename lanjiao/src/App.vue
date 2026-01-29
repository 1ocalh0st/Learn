<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import DefaultLayout from "./layouts/DefaultLayout.vue";
import { useUserStore } from "./stores/user";

const route = useRoute();
const user = useUserStore();

const showLayout = computed(() => {
  return Boolean(user.token) && route.meta.requiresAuth === true;
});
</script>

<template>
  <DefaultLayout v-if="showLayout" />
  <RouterView v-else />
</template>
