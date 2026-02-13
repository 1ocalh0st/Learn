<template>
  <a-layout class="layout-container">
    <a-layout-sider
      breakpoint="xl"
      collapsible
      :width="240"
      class="app-sider"
      hide-trigger
      v-model:collapsed="collapsed"
    >
      <div class="logo-wrapper">
        <div class="logo-icon">
          <!-- Custom Redrawn Bolt Icon -->
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="filter: drop-shadow(0 0 2px rgba(255,255,255,0.5))">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>
        <transition name="fade">
          <span v-show="!collapsed" class="logo-text">AutoTest Pro</span>
        </transition>
      </div>

      <a-menu
        :selected-keys="[currentPath]"
        :default-open-keys="['test-manage', 'system']"
        :style="{ width: '100%' }"
        @menu-item-click="handleMenuClick"
        class="sider-menu"
      >
        <a-menu-item key="/">
          <template #icon><icon-home /></template>
          工作台
        </a-menu-item>

        <a-sub-menu key="test-manage">
          <template #icon><icon-thunderbolt /></template>
          <template #title>测试中心</template>
          <a-menu-item key="/test/projects">
            <template #icon><icon-layers /></template>
            测试项目
          </a-menu-item>
          <a-menu-item key="/test/reports">
            <template #icon><icon-file /></template>
            测试报告
          </a-menu-item>
        </a-sub-menu>

        <a-menu-item key="/monitor">
          <template #icon><icon-dashboard /></template>
          生产监控
        </a-menu-item>

        <a-menu-item key="/files">
          <template #icon><icon-folder /></template>
          资源管理
        </a-menu-item>

        <a-sub-menu key="system">
          <template #icon><icon-settings /></template>
          <template #title>系统管理</template>
          <a-menu-item key="/users">
            <template #icon><icon-user-group /></template>
            用户列表
          </a-menu-item>
          <a-menu-item key="/settings">
            <template #icon><icon-tool /></template>
            平台设置
          </a-menu-item>
        </a-sub-menu>
      </a-menu>

      <div class="sider-footer" v-if="!collapsed">
        <div class="version-tag">v1.2.0</div>
      </div>
    </a-layout-sider>

    <a-layout class="main-layout">
      <a-layout-header class="app-header">
        <div class="header-left">
          <a-button shape="circle" type="text" @click="toggleCollapse">
            <icon-menu-fold v-if="!collapsed" />
            <icon-menu-unfold v-else />
          </a-button>
          
          <a-breadcrumb class="header-breadcrumb">
            <a-breadcrumb-item>平台</a-breadcrumb-item>
            <a-breadcrumb-item>{{ routeMetaName }}</a-breadcrumb-item>
          </a-breadcrumb>
        </div>

        <div class="header-right">
          <a-input-search 
            v-model="searchKeyword"
            placeholder="搜索项目..." 
            style="width: 240px; margin-right: 16px"
            class="header-search" 
            @search="handleSearch"
            @press-enter="handleSearch"
          />
          
          <a-button shape="circle" type="text" @click="appStore.toggleTheme" class="icon-btn">
            <template #icon>
              <icon-sun-fill v-if="appStore.theme === 'dark'" />
              <icon-moon-fill v-else />
            </template>
          </a-button>

          <a-dropdown trigger="click">
            <div class="user-profile">
              <a-avatar :size="32" class="user-avatar">
                {{ user.name?.[0]?.toUpperCase() || 'U' }}
              </a-avatar>
              <span class="user-name">{{ user.name || '用户' }}</span>
              <icon-down style="font-size: 12px; color: var(--color-text-3)" />
            </div>
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
      </a-layout-header>

      <a-layout-content class="app-content">
        <router-view v-slot="{ Component }">
          <transition name="fade-slide" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </a-layout-content>
    </a-layout>
  </a-layout>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import { useAppStore } from "@/stores/app";
import {
  IconApps,
  IconHome,
  IconUserGroup,
  IconUser,
  IconDown,
  IconSettings,
  IconExport,
  IconSunFill,
  IconMoonFill,
  IconFolder,
  IconLayers,
  IconFile,
  IconDashboard,
  IconThunderbolt,
  IconTool,
  IconMenuFold,
  IconMenuUnfold,
} from "@arco-design/web-vue/es/icon";
import { Message } from "@arco-design/web-vue";

const route = useRoute();
const router = useRouter();
const user = useUserStore();
const appStore = useAppStore();

const collapsed = ref(false);
const searchKeyword = ref("");

const toggleCollapse = () => {
  collapsed.value = !collapsed.value;
};

const currentPath = computed(() => {
  // Simple logic to keep parent menu active for subroutes if strictly needed, 
  // but mostly simple path matching works for the keys defined.
  // We might want to map /test/cases/:id to /test/projects
  if (route.path.startsWith('/test/cases')) return '/test/projects';
  return route.path;
});

const routeMetaName = computed(() => {
  const map: Record<string, string> = {
    '/': '工作台',
    '/test/projects': '项目管理',
    '/test/reports': '测试报告',
    '/monitor': '生产监控',
    '/files': '资源管理',
    '/users': '用户管理',
    '/settings': '平台设置',
    '/profile': '个人中心'
  };
  return map[route.path] || (route.meta.title as string) || '当前页面';
});

function handleMenuClick(key: string) {
  if (key === '/') {
    searchKeyword.value = ''; // Clear search when going home
  }
  router.push(key);
}

function handleSearch() {
  if (searchKeyword.value.trim()) {
    router.push({ path: '/test/projects', query: { q: searchKeyword.value } });
  }
}

function goProfile() {
  router.push("/profile");
}

function goSettings() {
  router.push("/settings");
}

function handleLogout() {
  user.logout();
  Message.success("已成功退出登录");
  router.push("/login");
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
  display: flex;
  background: var(--color-fill-1);
}

/* Sider Styling */
.app-sider {
  background: var(--color-bg-2);
  border-right: 1px solid var(--color-border);
  box-shadow: 2px 0 8px rgba(0, 0, 0, 0.02);
  z-index: 100;
}

.logo-wrapper {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 0 16px;
  border-bottom: 1px solid var(--color-border-1);
  overflow: hidden;
  white-space: nowrap;
}

.logo-icon {
  width: 32px;
  height: 32px;
  background: linear-gradient(135deg, #3c7eff 0%, #722ed1 100%);
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 18px;
  flex-shrink: 0;
  position: relative;
  overflow: hidden;
  box-shadow: 0 4px 10px rgba(22, 93, 255, 0.25), 
              inset 0 2px 4px rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.logo-icon::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 50%;
  background: linear-gradient(to bottom, rgba(255, 255, 255, 0.15), transparent);
  pointer-events: none;
}


.logo-text {
  font-family: var(--font-heading);
  font-size: 18px;
  font-weight: 700;
  letter-spacing: -0.5px;
  background: linear-gradient(135deg, #165dff 0%, #722ed1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.sider-menu {
  margin-top: 10px;
}

.sider-menu :deep(.arco-menu-item) {
  border-radius: 4px;
  margin: 4px 8px;
  width: auto;
}

.sider-menu :deep(.arco-menu-item.arco-menu-selected) {
  background: rgba(22, 93, 255, 0.08); /* #165dff with opacity */
  color: #165dff;
}

.sider-footer {
  position: absolute;
  bottom: 0;
  width: 100%;
  padding: 16px;
  text-align: center;
}

.version-tag {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--color-text-4);
  background: var(--color-fill-2);
  padding: 2px 8px;
  border-radius: 10px;
  display: inline-block;
}

/* Header Styling */
.app-header {
  height: 64px;
  background: var(--color-bg-2);
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.02);
  z-index: 90;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-breadcrumb {
  margin-left: 8px;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.icon-btn {
  color: var(--color-text-2);
  transition: all 0.2s;
}

.icon-btn:hover {
  background: var(--color-fill-3);
  color: var(--color-text-1);
}

.user-profile {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 20px;
  transition: all 0.2s;
}

.user-profile:hover {
  background: var(--color-fill-2);
}

.user-avatar {
  background: #165dff;
}

.user-name {
  font-family: var(--font-heading);
  font-size: 14px;
  font-weight: 600;
  color: var(--color-text-1);
}

/* Content Area */
.app-content {
  padding: 24px;
  overflow-y: auto;
  overflow-x: hidden;
  height: calc(100vh - 64px);
  background: var(--color-fill-1);
}

/* Transitions */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-slide-enter-active,
.fade-slide-leave-active {
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.fade-slide-enter-from {
  opacity: 0;
  transform: translateY(20px);
}

.fade-slide-leave-to {
  opacity: 0;
  transform: translateY(-20px);
}
</style>
