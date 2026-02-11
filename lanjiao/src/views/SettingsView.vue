<template>
  <div class="settings-page">
    <a-page-header
      :show-back="false"
      title="系统设置"
      subtitle="个性化配置您的偏好"
      class="page-header"
    />

    <div class="settings-content">
      <!-- 外观设置 -->
      <a-card class="settings-card" :bordered="false">
        <template #title>
          <div class="card-title">
            <icon-palette class="card-icon" />
            <span>外观设置</span>
          </div>
        </template>

        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">主题模式</div>
            <div class="setting-desc">选择浅色或深色主题</div>
          </div>
          <a-radio-group v-model="settings.theme" type="button" @change="handleThemeChange">
            <a-radio value="light">
              <icon-sun /> 浅色
            </a-radio>
            <a-radio value="dark">
              <icon-moon /> 深色
            </a-radio>
          </a-radio-group>
        </div>

        <a-divider />

        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">主题色</div>
            <div class="setting-desc">选择系统主题颜色</div>
          </div>
          <div class="color-picker">
            <div 
              v-for="color in themeColors" 
              :key="color.value"
              class="color-option"
              :class="{ active: settings.primaryColor === color.value }"
              :style="{ background: color.value }"
              @click="handlePrimaryColorChange(color.value)"
            >
              <icon-check v-if="settings.primaryColor === color.value" />
            </div>
          </div>
        </div>

        <a-divider />

        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">紧凑模式</div>
            <div class="setting-desc">减少页面间距，显示更多内容</div>
          </div>
          <a-switch v-model="settings.compactMode" @change="saveSettings" />
        </div>
      </a-card>

      <!-- 通知设置 -->
      <a-card class="settings-card" :bordered="false">
        <template #title>
          <div class="card-title">
            <icon-notification class="card-icon" />
            <span>通知设置</span>
          </div>
        </template>

        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">消息通知</div>
            <div class="setting-desc">接收系统消息和更新提醒</div>
          </div>
          <a-switch v-model="settings.notifications" @change="saveSettings" />
        </div>

        <a-divider />

        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">声音提醒</div>
            <div class="setting-desc">有新消息时播放提示音</div>
          </div>
          <a-switch v-model="settings.soundEnabled" @change="saveSettings" />
        </div>

        <a-divider />

        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">邮件通知</div>
            <div class="setting-desc">重要事件通过邮件通知</div>
          </div>
          <a-switch v-model="settings.emailNotifications" @change="saveSettings" />
        </div>
      </a-card>

      <!-- 隐私与安全 -->
      <a-card class="settings-card" :bordered="false">
        <template #title>
          <div class="card-title">
            <icon-safe class="card-icon" />
            <span>隐私与安全</span>
          </div>
        </template>

        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">登录保护</div>
            <div class="setting-desc">异地登录时需要验证</div>
          </div>
          <a-switch v-model="settings.loginProtection" @change="saveSettings" />
        </div>

        <a-divider />

        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">活动日志</div>
            <div class="setting-desc">记录账户活动历史</div>
          </div>
          <a-switch v-model="settings.activityLog" @change="saveSettings" />
        </div>

        <a-divider />

        <div class="setting-item clickable" @click="showPasswordModal = true">
          <div class="setting-info">
            <div class="setting-label">修改密码</div>
            <div class="setting-desc">定期更新密码保障账户安全</div>
          </div>
          <icon-right class="arrow-icon" />
        </div>
      </a-card>

      <!-- 数据管理 -->
      <a-card class="settings-card" :bordered="false">
        <template #title>
          <div class="card-title">
            <icon-storage class="card-icon" />
            <span>数据管理</span>
          </div>
        </template>

        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">自动保存</div>
            <div class="setting-desc">自动保存编辑中的内容</div>
          </div>
          <a-switch v-model="settings.autoSave" @change="saveSettings" />
        </div>

        <a-divider />

        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">缓存管理</div>
            <div class="setting-desc">当前缓存大小: {{ cacheSize }}</div>
          </div>
          <a-button type="outline" size="small" @click="clearCache">
            清除缓存
          </a-button>
        </div>

        <a-divider />

        <div class="setting-item">
          <div class="setting-info">
            <div class="setting-label">导出数据</div>
            <div class="setting-desc">导出您的个人数据</div>
          </div>
          <a-button type="outline" size="small" @click="exportData">
            <template #icon><icon-download /></template>
            导出
          </a-button>
        </div>
      </a-card>

      <!-- 关于 -->
      <a-card class="settings-card about-card" :bordered="false">
        <template #title>
          <div class="card-title">
            <icon-info-circle class="card-icon" />
            <span>关于</span>
          </div>
        </template>

        <div class="about-content">
          <div class="about-item">
            <span class="about-label">版本号</span>
            <span class="about-value">v1.0.0</span>
          </div>
          <div class="about-item">
            <span class="about-label">构建日期</span>
            <span class="about-value">2026-02-04</span>
          </div>
          <div class="about-item">
            <span class="about-label">技术栈</span>
            <span class="about-value">Vue 3 + Arco Design + Node.js</span>
          </div>
        </div>
      </a-card>
    </div>

    <!-- 修改密码弹窗 -->
    <a-modal
      v-model:visible="showPasswordModal"
      title="修改密码"
      @ok="handlePasswordChange"
      :ok-loading="passwordLoading"
    >
      <a-form :model="passwordForm" layout="vertical">
        <a-form-item label="当前密码" field="oldPassword">
          <a-input-password v-model="passwordForm.oldPassword" placeholder="请输入当前密码" />
        </a-form-item>
        <a-form-item label="新密码" field="newPassword">
          <a-input-password v-model="passwordForm.newPassword" placeholder="请输入新密码（至少6位）" />
        </a-form-item>
        <a-form-item label="确认新密码" field="confirmPassword">
          <a-input-password v-model="passwordForm.confirmPassword" placeholder="请再次输入新密码" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted } from "vue";
import { useAppStore } from "@/stores/app";
import { Message } from "@arco-design/web-vue";
import {
  IconPalette,
  IconSun,
  IconMoon,
  IconCheck,
  IconNotification,
  IconSafe,
  IconRight,
  IconStorage,
  IconDownload,
  IconInfoCircle,
} from "@arco-design/web-vue/es/icon";

const appStore = useAppStore();

const themeColors = [
  { name: "蓝色", value: "#165dff" },
  { name: "紫色", value: "#722ed1" },
  { name: "绿色", value: "#00b42a" },
  { name: "橙色", value: "#ff7d00" },
  { name: "红色", value: "#f53f3f" },
  { name: "青色", value: "#0fc6c2" },
];

const settings = reactive({
  theme: appStore.theme,
  primaryColor: localStorage.getItem("primaryColor") || "#165dff",
  compactMode: localStorage.getItem("compactMode") === "true",
  notifications: localStorage.getItem("notifications") !== "false",
  soundEnabled: localStorage.getItem("soundEnabled") !== "false",
  emailNotifications: localStorage.getItem("emailNotifications") === "true",
  loginProtection: localStorage.getItem("loginProtection") !== "false",
  activityLog: localStorage.getItem("activityLog") !== "false",
  autoSave: localStorage.getItem("autoSave") !== "false",
});

const showPasswordModal = ref(false);
const passwordLoading = ref(false);
const passwordForm = reactive({
  oldPassword: "",
  newPassword: "",
  confirmPassword: "",
});

const cacheSize = computed(() => {
  // 估算localStorage大小
  let total = 0;
  for (const key in localStorage) {
    if (localStorage.hasOwnProperty(key)) {
      total += localStorage[key].length * 2; // UTF-16编码
    }
  }
  if (total < 1024) return `${total} B`;
  if (total < 1024 * 1024) return `${(total / 1024).toFixed(1)} KB`;
  return `${(total / 1024 / 1024).toFixed(1)} MB`;
});

function handleThemeChange(value: string | number | boolean) {
  appStore.toggleTheme();
  saveSettings();
}

function handlePrimaryColorChange(color: string) {
  settings.primaryColor = color;
  localStorage.setItem("primaryColor", color);
  // 可以在这里应用颜色变化
  Message.success("主题色已更新");
  saveSettings();
}

function saveSettings() {
  localStorage.setItem("compactMode", String(settings.compactMode));
  localStorage.setItem("notifications", String(settings.notifications));
  localStorage.setItem("soundEnabled", String(settings.soundEnabled));
  localStorage.setItem("emailNotifications", String(settings.emailNotifications));
  localStorage.setItem("loginProtection", String(settings.loginProtection));
  localStorage.setItem("activityLog", String(settings.activityLog));
  localStorage.setItem("autoSave", String(settings.autoSave));
}

function clearCache() {
  const keysToKeep = ["token", "userName", "theme", "primaryColor"];
  const keysToRemove: string[] = [];
  
  for (const key in localStorage) {
    if (!keysToKeep.includes(key)) {
      keysToRemove.push(key);
    }
  }
  
  keysToRemove.forEach(key => localStorage.removeItem(key));
  Message.success("缓存已清除");
}

function exportData() {
  const data = {
    settings: { ...settings },
    exportTime: new Date().toISOString(),
  };
  
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `settings-export-${new Date().toISOString().split("T")[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  Message.success("数据已导出");
}

async function handlePasswordChange() {
  if (!passwordForm.oldPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) {
    Message.warning("请填写完整信息");
    return;
  }
  
  if (passwordForm.newPassword.length < 6) {
    Message.warning("新密码至少6位");
    return;
  }
  
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    Message.warning("两次输入的密码不一致");
    return;
  }
  
  passwordLoading.value = true;
  try {
    // 这里可以调用实际的密码修改API
    await new Promise(resolve => setTimeout(resolve, 1000));
    Message.success("密码修改成功");
    showPasswordModal.value = false;
    passwordForm.oldPassword = "";
    passwordForm.newPassword = "";
    passwordForm.confirmPassword = "";
  } catch (e) {
    Message.error("密码修改失败");
  } finally {
    passwordLoading.value = false;
  }
}
</script>

<style scoped>
.settings-page {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-header {
  background: var(--color-bg-2);
  border-radius: 12px;
  padding: 16px 24px;
  margin-bottom: 0;
}

.settings-content {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20px;
}

@media (max-width: 1200px) {
  .settings-content {
    grid-template-columns: 1fr;
  }
}

.settings-card {
  background: var(--color-bg-2);
  border-radius: 12px;
  padding: 10px 20px;
  transition: all 0.3s ease;
}

.settings-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  background: #fcfcfc;
}

.card-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.card-icon {
  font-size: 18px;
  color: var(--color-primary);
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
}

.setting-item.clickable {
  cursor: pointer;
  border-radius: 8px;
  margin: 0 -12px;
  padding: 12px;
  transition: background-color 0.2s;
}

.setting-item.clickable:hover {
  background: var(--color-fill-2);
}

.setting-info {
  flex: 1;
}

.setting-label {
  font-weight: 500;
  color: var(--color-text-1);
  margin-bottom: 2px;
}

.setting-desc {
  font-size: 12px;
  color: var(--color-text-3);
}

.color-picker {
  display: flex;
  gap: 8px;
}

.color-option {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  transition: all 0.2s;
  border: 2px solid transparent;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.active {
  border-color: var(--color-text-1);
  box-shadow: 0 0 0 2px var(--color-bg-2);
}

.arrow-icon {
  color: var(--color-text-3);
}

.about-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.about-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
}

.about-label {
  color: var(--color-text-3);
}

.about-value {
  color: var(--color-text-1);
  font-weight: 500;
}

.about-card {
  grid-column: span 2;
}

@media (max-width: 1200px) {
  .about-card {
    grid-column: span 1;
  }
}
</style>
