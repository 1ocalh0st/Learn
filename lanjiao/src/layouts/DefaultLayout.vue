<template>
  <a-layout class="app-layout">
    <a-layout-header class="app-header">
      <div class="header-inner">
        <div class="logo-section">
          <a-typography-title :heading="4" class="logo">
            <icon-apps /> Learning
          </a-typography-title>
        </div>

        <a-menu
          mode="horizontal"
          :selected-keys="[currentRoute]"
          @menu-item-click="handleMenuClick"
          class="nav-menu"
        >
          <a-menu-item key="/">
            <template #icon><icon-home /></template>
            首页
          </a-menu-item>
          <a-menu-item key="/users">
            <template #icon><icon-user-group /></template>
            用户列表
          </a-menu-item>
        </a-menu>

        <div class="header-right">
          <a-dropdown trigger="hover">
            <a-button type="text" class="user-btn">
              <a-avatar :size="28" class="user-avatar">
                <icon-user />
              </a-avatar>
              <span class="user-name">{{ user.name || '用户' }}</span>
              <icon-down />
            </a-button>
            <template #content>
              <a-doption @click="goProfile">
                <template #icon><icon-user /></template>
                个人中心
              </a-doption>
              <a-doption @click="goSettings">
                <template #icon><icon-settings /></template>
                设置
              </a-doption>
              <a-divider :margin="4" />
              <a-doption @click="handleLogout" class="logout-option">
                <template #icon><icon-export /></template>
                退出登录
              </a-doption>
            </template>
          </a-dropdown>
        </div>
      </div>
    </a-layout-header>

    <a-layout-content class="app-main">
      <div class="main-container">
        <RouterView />
      </div>
    </a-layout-content>
  </a-layout>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import {
  IconApps,
  IconHome,
  IconUserGroup,
  IconUser,
  IconDown,
  IconSettings,
  IconExport,
} from "@arco-design/web-vue/es/icon";
import { Message } from "@arco-design/web-vue";

const route = useRoute();
const router = useRouter();
const user = useUserStore();

const currentRoute = computed(() => route.path);

function handleMenuClick(key: string) {
  router.push(key);
}

function goProfile() {
  router.push("/profile");
}

function goSettings() {
  Message.info("设置功能开发中...");
}

function handleLogout() {
  user.logout();
  Message.success("已成功退出登录");
}
</script>

<style scoped>
.app-layout {
  min-height: 100vh;
  background: linear-gradient(135deg, #f7f8fa 0%, #e8edf5 100%);
}

.app-header {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid rgba(229, 230, 235, 0.8);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  position: sticky;
  top: 0;
  z-index: 100;
  padding: 0;
  height: 60px;
}

.header-inner {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 24px;
  height: 100%;
  display: flex;
  align-items: center;
}

.logo-section {
  display: flex;
  align-items: center;
}

.logo {
  margin: 0 !important;
  display: flex;
  align-items: center;
  gap: 8px;
  background: linear-gradient(135deg, #165dff 0%, #722ed1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  font-weight: 700;
  letter-spacing: -0.5px;
}

.nav-menu {
  flex: 1;
  margin-left: 40px;
  background: transparent !important;
  border-bottom: none !important;
}

.nav-menu :deep(.arco-menu-item) {
  padding: 0 16px;
  line-height: 58px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.nav-menu :deep(.arco-menu-item:hover) {
  background: linear-gradient(135deg, rgba(22, 93, 255, 0.08) 0%, rgba(114, 46, 209, 0.08) 100%);
}

.nav-menu :deep(.arco-menu-selected) {
  background: linear-gradient(135deg, rgba(22, 93, 255, 0.1) 0%, rgba(114, 46, 209, 0.1) 100%) !important;
  color: #165dff;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px !important;
  border-radius: 20px;
  transition: all 0.3s ease;
}

.user-btn:hover {
  background: rgba(22, 93, 255, 0.08);
}

.user-avatar {
  background: linear-gradient(135deg, #165dff 0%, #722ed1 100%);
}

.user-name {
  color: #1d2129;
  font-weight: 500;
  max-width: 100px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.logout-option {
  color: #f53f3f !important;
}

.app-main {
  padding: 24px;
}

.main-container {
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}
</style>