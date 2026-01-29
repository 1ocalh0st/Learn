<template>
  <div class="callback-page">
    <div class="callback-card">
      <!-- 加载状态 -->
      <div v-if="status === 'loading'" class="callback-content">
        <a-spin :size="48" />
        <a-typography-title :heading="4" style="margin-top: 24px;">
          正在处理微信授权...
        </a-typography-title>
        <a-typography-text type="secondary">
          请稍候，正在验证您的登录信息
        </a-typography-text>
      </div>

      <!-- 成功状态 -->
      <div v-else-if="status === 'success'" class="callback-content">
        <div class="success-icon-wrapper">
          <icon-check-circle-fill class="success-icon" />
        </div>
        <a-typography-title :heading="4" style="margin-top: 24px;">
          {{ isNewUser ? '注册成功！' : '登录成功！' }}
        </a-typography-title>
        <a-typography-text type="secondary">
          欢迎，{{ userName }}
        </a-typography-text>
        <a-typography-text type="secondary" style="font-size: 12px; margin-top: 12px;">
          正在跳转...
        </a-typography-text>
        <a-progress 
          :percent="redirectProgress" 
          :show-text="false" 
          style="width: 200px; margin-top: 16px;"
        />
      </div>

      <!-- 错误状态 -->
      <div v-else-if="status === 'error'" class="callback-content">
        <div class="error-icon-wrapper">
          <icon-close-circle-fill class="error-icon" />
        </div>
        <a-typography-title :heading="4" style="margin-top: 24px;">
          授权失败
        </a-typography-title>
        <a-typography-text type="secondary">
          {{ errorMessage }}
        </a-typography-text>
        <div class="error-actions">
          <a-button type="primary" @click="retry">
            <template #icon><icon-refresh /></template>
            重试
          </a-button>
          <a-button @click="goLogin">
            返回登录
          </a-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { request, ApiError } from "@/utils/request";
import { useUserStore } from "@/stores/user";
import { Message } from "@arco-design/web-vue";
import {
  IconCheckCircleFill,
  IconCloseCircleFill,
  IconRefresh,
} from "@arco-design/web-vue/es/icon";

const route = useRoute();
const router = useRouter();
const user = useUserStore();

const status = ref<"loading" | "success" | "error">("loading");
const errorMessage = ref("");
const isNewUser = ref(false);
const userName = ref("");
const redirectProgress = ref(0);

async function handleCallback() {
  const code = route.query.code as string;
  const state = route.query.state as string;
  const redirectTo = route.query.redirect as string || "/";
  
  if (!code) {
    status.value = "error";
    errorMessage.value = "缺少授权码，请重新登录";
    return;
  }
  
  try {
    const res = await request<{
      code: string;
      message: string;
      data: {
        accessToken: string;
        isNewUser: boolean;
        user: {
          id: number;
          username: string;
          name: string;
          avatar?: string;
        };
      };
    }>("/api/auth/wechat/callback", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
    
    // 保存登录状态
    user.setAuth(res.data.accessToken, res.data.user.name);
    
    isNewUser.value = res.data.isNewUser;
    userName.value = res.data.user.name || "微信用户";
    status.value = "success";
    
    // 显示进度条动画
    const interval = setInterval(() => {
      redirectProgress.value += 5;
      if (redirectProgress.value >= 100) {
        clearInterval(interval);
        router.replace(redirectTo);
        Message.success(isNewUser.value ? "注册成功，欢迎加入！" : "登录成功！");
      }
    }, 50);
  } catch (e: any) {
    status.value = "error";
    if (e instanceof ApiError) {
      errorMessage.value = e.message;
    } else {
      errorMessage.value = "微信授权失败，请稍后重试";
    }
  }
}

function retry() {
  // 重新发起微信授权
  window.location.href = "/login";
}

function goLogin() {
  router.replace("/login");
}

onMounted(() => {
  handleCallback();
});
</script>

<style scoped>
.callback-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f7f8fa 0%, #e8edf5 100%);
  padding: 20px;
}

.callback-card {
  background: white;
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  padding: 48px;
  min-width: 400px;
  text-align: center;
}

.callback-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.success-icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(0, 180, 42, 0.1) 0%, rgba(34, 199, 94, 0.1) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.success-icon {
  font-size: 48px;
  color: #00b42a;
}

.error-icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  background: linear-gradient(135deg, rgba(245, 63, 63, 0.1) 0%, rgba(255, 77, 79, 0.1) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.error-icon {
  font-size: 48px;
  color: #f53f3f;
}

.error-actions {
  display: flex;
  gap: 12px;
  margin-top: 24px;
}
</style>
