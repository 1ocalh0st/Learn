<template>
  <div class="callback-page">
    <div class="callback-container">
      <!-- 加载中 -->
      <div v-if="status === 'loading'" class="loading-section">
        <a-spin :size="48" />
        <a-typography-title :heading="4" style="margin-top: 24px;">
          正在处理授权...
        </a-typography-title>
        <a-typography-text type="secondary">
          请稍候，正在验证您的 GitHub 账号
        </a-typography-text>
      </div>

      <!-- 成功 -->
      <div v-else-if="status === 'success'" class="success-section">
        <div class="success-icon-wrapper">
          <icon-check-circle-fill class="success-icon" />
        </div>
        <a-typography-title :heading="4" style="margin-top: 24px;">
          {{ isNewUser ? '注册成功！' : '登录成功！' }}
        </a-typography-title>
        <a-typography-text type="secondary">
          正在跳转...
        </a-typography-text>
      </div>

      <!-- 失败 -->
      <div v-else-if="status === 'error'" class="error-section">
        <div class="error-icon-wrapper">
          <icon-close-circle-fill class="error-icon" />
        </div>
        <a-typography-title :heading="4" style="margin-top: 24px;">
          授权失败
        </a-typography-title>
        <a-typography-text type="secondary">
          {{ errorMessage }}
        </a-typography-text>
        <a-button type="primary" style="margin-top: 24px;" @click="goLogin">
          返回登录
        </a-button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { request, ApiError } from "@/utils/request";
import { useUserStore } from "@/stores/user";
import { Message } from "@arco-design/web-vue";
import {
  IconCheckCircleFill,
  IconCloseCircleFill,
} from "@arco-design/web-vue/es/icon";

const router = useRouter();
const route = useRoute();
const user = useUserStore();

const status = ref<"loading" | "success" | "error">("loading");
const errorMessage = ref("");
const isNewUser = ref(false);

onMounted(async () => {
  const code = route.query.code as string;
  const error = route.query.error as string;

  if (error) {
    status.value = "error";
    errorMessage.value = error === "access_denied" 
      ? "您取消了授权" 
      : `授权失败: ${error}`;
    return;
  }

  if (!code) {
    status.value = "error";
    errorMessage.value = "缺少授权码";
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
          githubLogin?: string;
        };
      };
    }>("/api/auth/github/callback", {
      method: "POST",
      body: JSON.stringify({ code }),
    });

    // 保存登录状态
    user.setAuth(res.data.accessToken, res.data.user.name);
    isNewUser.value = res.data.isNewUser;
    status.value = "success";

    // 延迟跳转
    setTimeout(() => {
      Message.success(res.data.isNewUser ? "注册成功，欢迎加入！" : "登录成功！");
      router.replace("/");
    }, 1500);
  } catch (e: any) {
    status.value = "error";
    if (e instanceof ApiError) {
      errorMessage.value = e.message;
    } else {
      errorMessage.value = "网络异常，请稍后重试";
    }
  }
});

function goLogin() {
  router.replace("/login");
}
</script>

<style scoped>
.callback-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #e4e8ed 100%);
}

.callback-container {
  background: white;
  border-radius: 16px;
  padding: 48px 64px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08);
  text-align: center;
  min-width: 360px;
}

.loading-section,
.success-section,
.error-section {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.success-icon-wrapper,
.error-icon-wrapper {
  width: 80px;
  height: 80px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.success-icon-wrapper {
  background: linear-gradient(135deg, #00b42a 0%, #34c98f 100%);
}

.error-icon-wrapper {
  background: linear-gradient(135deg, #f53f3f 0%, #ff7d00 100%);
}

.success-icon,
.error-icon {
  font-size: 48px;
  color: white;
}
</style>
