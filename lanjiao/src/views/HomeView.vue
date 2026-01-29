<template>
  <div class="page-container">
    <!-- 欢迎卡片 -->
    <a-card class="welcome-card" :bordered="false">
      <div class="welcome-content">
        <div class="welcome-text">
          <a-typography-title :heading="3" class="welcome-title">
            欢迎回来，{{ user.name || '用户' }} 👋
          </a-typography-title>
          <a-typography-paragraph type="secondary">
            今天也是充满活力的一天，快来探索更多功能吧！
          </a-typography-paragraph>
        </div>
        <img 
          src="https://customers.ai/wp-content/uploads/2020/12/welcome-greeting-message.png" 
          alt="welcome" 
          class="welcome-image"
        />
      </div>
    </a-card>

    <!-- 统计卡片 -->
    <a-row :gutter="20" class="stat-row">
      <a-col :span="8">
        <a-card class="stat-card stat-card-primary" :bordered="false">
          <a-statistic title="在线时长" :value="2.5" :precision="1">
            <template #suffix>小时</template>
            <template #prefix>
              <icon-clock-circle class="stat-icon" />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card class="stat-card stat-card-success" :bordered="false">
          <a-statistic title="完成任务" :value="12">
            <template #suffix>个</template>
            <template #prefix>
              <icon-check-circle class="stat-icon" />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card class="stat-card stat-card-warning" :bordered="false">
          <a-statistic title="积分余额" :value="1680">
            <template #prefix>
              <icon-fire class="stat-icon" />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
    </a-row>

    <!-- 主面板 -->
    <a-card class="main-panel" :bordered="false">
      <template #title>
        <div class="panel-header">
          <span>控制台首页</span>
          <a-tag :color="user.token ? 'green' : 'gray'" class="status-tag">
            <template #icon>
              <span class="status-dot" :class="{ online: user.token }"></span>
            </template>
            {{ user.name ? `已登录: ${user.name}` : '未登录' }}
          </a-tag>
        </div>
      </template>

      <div class="panel-body" v-if="user.token">
        <a-space size="medium" wrap>
          <a-button type="primary" @click="hello">
            <template #icon><icon-send /></template>
            测试接口 (Hello)
          </a-button>
          <a-button type="outline" status="success" @click="me">
            <template #icon><icon-user /></template>
            获取用户信息 (Me)
          </a-button>
          <a-popconfirm
            content="确定要退出登录吗？"
            @ok="handleLogout"
            type="warning"
          >
            <a-button type="outline" status="danger">
              <template #icon><icon-export /></template>
              退出登录
            </a-button>
          </a-popconfirm>
        </a-space>

        <transition name="fade">
          <div class="log-section" v-if="log">
            <a-alert type="info" :show-icon="false" class="log-alert">
              <template #title>调试日志</template>
              <pre class="log-content">{{ log }}</pre>
            </a-alert>
          </div>
        </transition>
      </div>

      <div class="panel-body center" v-else>
        <a-empty description="请先登录以访问系统功能">
          <template #image>
            <icon-lock style="font-size: 64px; color: var(--color-text-4);" />
          </template>
          <router-link to="/login">
            <a-button type="primary" size="large">
              <template #icon><icon-right /></template>
              前往登录
            </a-button>
          </router-link>
        </a-empty>
      </div>
    </a-card>

    <!-- 快捷操作卡片 -->
    <a-row :gutter="20" class="quick-actions">
      <a-col :span="6">
        <a-card class="action-card" hoverable :bordered="false" @click="navigateTo('/users')">
          <div class="action-content">
            <div class="action-icon action-icon-blue">
              <icon-user-group />
            </div>
            <span class="action-title">用户管理</span>
            <span class="action-desc">查看和管理用户</span>
          </div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card class="action-card" hoverable :bordered="false">
          <div class="action-content">
            <div class="action-icon action-icon-green">
              <icon-file />
            </div>
            <span class="action-title">文件管理</span>
            <span class="action-desc">上传和下载文件</span>
          </div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card class="action-card" hoverable :bordered="false">
          <div class="action-content">
            <div class="action-icon action-icon-orange">
              <icon-settings />
            </div>
            <span class="action-title">系统设置</span>
            <span class="action-desc">配置系统参数</span>
          </div>
        </a-card>
      </a-col>
      <a-col :span="6">
        <a-card class="action-card" hoverable :bordered="false">
          <div class="action-content">
            <div class="action-icon action-icon-purple">
              <icon-bar-chart />
            </div>
            <span class="action-title">数据分析</span>
            <span class="action-desc">查看统计报表</span>
          </div>
        </a-card>
      </a-col>
    </a-row>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { request } from "@/utils/request";
import { useUserStore } from "@/stores/user";
import { Message } from "@arco-design/web-vue";
import {
  IconClockCircle,
  IconCheckCircle,
  IconFire,
  IconSend,
  IconUser,
  IconExport,
  IconLock,
  IconRight,
  IconUserGroup,
  IconFile,
  IconSettings,
  IconBarChart,
} from "@arco-design/web-vue/es/icon";

const router = useRouter();
const user = useUserStore();
const log = ref("");

async function hello() {
  try {
    const data = await request<{ msg: string; time: number }>("/api/hello");
    log.value = JSON.stringify(data, null, 2);
    Message.success("接口调用成功！");
  } catch (e: any) {
    Message.error(e.message);
  }
}

async function me() {
  try {
    const data = await request<{ name: string; role: string }>("/api/me");
    log.value = JSON.stringify(data, null, 2);
    Message.success("获取用户信息成功！");
  } catch (e: any) {
    log.value = e.message;
    Message.error(e.message);
  }
}

function handleLogout() {
  user.logout();
  Message.success("已成功退出登录");
}

function navigateTo(path: string) {
  router.push(path);
}
</script>

<style scoped>
.page-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 欢迎卡片 */
.welcome-card {
  background: linear-gradient(135deg, #165dff 0%, #722ed1 100%);
  border-radius: 16px;
  overflow: hidden;
}

.welcome-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.welcome-text {
  flex: 1;
}

.welcome-title {
  color: white !important;
  margin-bottom: 8px !important;
}

.welcome-text :deep(.arco-typography) {
  color: rgba(255, 255, 255, 0.85) !important;
}

.welcome-image {
  width: 200px;
  height: auto;
}

/* 统计卡片 */
.stat-row {
  margin-top: 0;
}

.stat-card {
  border-radius: 12px;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.stat-card-primary {
  background: linear-gradient(135deg, rgba(22, 93, 255, 0.08) 0%, rgba(114, 46, 209, 0.08) 100%);
}

.stat-card-primary .stat-icon {
  color: #165dff;
}

.stat-card-success {
  background: linear-gradient(135deg, rgba(0, 180, 42, 0.08) 0%, rgba(34, 199, 94, 0.08) 100%);
}

.stat-card-success .stat-icon {
  color: #00b42a;
}

.stat-card-warning {
  background: linear-gradient(135deg, rgba(255, 125, 0, 0.08) 0%, rgba(255, 169, 0, 0.08) 100%);
}

.stat-card-warning .stat-icon {
  color: #ff7d00;
}

.stat-icon {
  font-size: 24px;
  margin-right: 8px;
}

/* 主面板 */
.main-panel {
  border-radius: 16px;
}

.panel-header {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-tag {
  display: flex;
  align-items: center;
  gap: 6px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: currentColor;
  display: inline-block;
}

.status-dot.online {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.panel-body {
  padding: 20px 0;
}

.panel-body.center {
  display: flex;
  justify-content: center;
  padding: 60px 0;
}

.log-section {
  margin-top: 24px;
}

.log-alert {
  border-radius: 12px;
}

.log-content {
  margin: 12px 0 0;
  padding: 16px;
  background: #1e1e1e;
  color: #d4d4d4;
  border-radius: 8px;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
  overflow-x: auto;
}

/* 快捷操作 */
.quick-actions {
  margin-top: 0;
}

.action-card {
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.action-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.08);
}

.action-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 20px 0;
}

.action-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin-bottom: 12px;
}

.action-icon-blue {
  background: rgba(22, 93, 255, 0.1);
  color: #165dff;
}

.action-icon-green {
  background: rgba(0, 180, 42, 0.1);
  color: #00b42a;
}

.action-icon-orange {
  background: rgba(255, 125, 0, 0.1);
  color: #ff7d00;
}

.action-icon-purple {
  background: rgba(114, 46, 209, 0.1);
  color: #722ed1;
}

.action-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--color-text-1);
  margin-bottom: 4px;
}

.action-desc {
  font-size: 12px;
  color: var(--color-text-3);
}

/* 过渡动画 */
.fade-enter-active,
.fade-leave-active {
  transition: all 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}
</style>