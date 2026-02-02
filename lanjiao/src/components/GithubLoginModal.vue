<template>
  <a-modal
    v-model:visible="visible"
    :footer="false"
    :width="400"
    :mask-closable="true"
    modal-class="github-login-modal"
    title-align="start"
  >
    <template #title>
      <div class="modal-title">
        <icon-github class="github-icon" />
        <span>GitHub 登录</span>
      </div>
    </template>

    <div class="github-login-content">
      <!-- 步骤一：授权按钮 -->
      <div v-if="step === 'authorize'" class="authorize-section">
        <div class="authorize-tip">
          <a-typography-text type="secondary">
            点击下方按钮跳转至 GitHub 进行授权
          </a-typography-text>
        </div>
        
        <div class="github-logo-container">
          <div class="github-logo">
            <icon-github class="logo-icon" />
          </div>
        </div>

        <div class="authorize-info">
          <div class="info-item">
            <icon-check-circle-fill class="check-icon" />
            <span>获取您的公开资料信息</span>
          </div>
          <div class="info-item">
            <icon-check-circle-fill class="check-icon" />
            <span>获取您的邮箱地址</span>
          </div>
          <div class="info-item">
            <icon-close-circle class="close-icon" />
            <span>不会获取您的私有仓库</span>
          </div>
        </div>

        <a-button 
          type="primary" 
          long 
          size="large"
          @click="startGithubAuth"
          :loading="authLoading"
          class="authorize-btn"
        >
          <template #icon><icon-github /></template>
          使用 GitHub 登录
        </a-button>

        <div class="divider-section">
          <a-divider orientation="center">
            <a-typography-text type="secondary" style="font-size: 12px;">
              开发环境快速登录
            </a-typography-text>
          </a-divider>
          <a-button 
            type="outline" 
            long 
            @click="useMockLogin"
            :loading="mockLoading"
            class="mock-btn"
          >
            <template #icon><icon-thunderbolt /></template>
            模拟 GitHub 登录
          </a-button>
        </div>
      </div>

      <!-- 步骤二：登录中 -->
      <div v-else-if="step === 'loading'" class="loading-section">
        <a-spin :size="48" />
        <a-typography-title :heading="5" style="margin-top: 16px;">
          正在登录...
        </a-typography-title>
        <a-typography-text type="secondary">
          请稍候，正在处理您的登录请求
        </a-typography-text>
      </div>

      <!-- 步骤三：登录成功 -->
      <div v-else-if="step === 'success'" class="success-section">
        <div class="success-avatar">
          <a-avatar :size="72" :image-url="userInfo?.avatar">
            <icon-user v-if="!userInfo?.avatar" />
          </a-avatar>
          <icon-check-circle-fill class="success-check" />
        </div>
        <a-typography-title :heading="5" style="margin-top: 16px;">
          {{ userInfo?.isNewUser ? '注册成功！' : '登录成功！' }}
        </a-typography-title>
        <a-typography-text type="secondary">
          欢迎，{{ userInfo?.name || userInfo?.githubLogin || 'GitHub 用户' }}
        </a-typography-text>
        <a-typography-text v-if="userInfo?.githubLogin" type="secondary" style="font-size: 12px; margin-top: 4px;">
          @{{ userInfo.githubLogin }}
        </a-typography-text>
        <a-typography-text type="secondary" style="font-size: 12px; margin-top: 8px;">
          正在跳转...
        </a-typography-text>
      </div>

      <!-- 步骤四：登录失败 -->
      <div v-else-if="step === 'error'" class="error-section">
        <icon-close-circle-fill class="error-icon" />
        <a-typography-title :heading="5" style="margin-top: 16px;">
          登录失败
        </a-typography-title>
        <a-typography-text type="secondary">
          {{ errorMessage }}
        </a-typography-text>
        <a-button type="primary" style="margin-top: 20px;" @click="retry">
          重试
        </a-button>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { useRouter } from "vue-router";
import { request, ApiError } from "@/utils/request";
import { useUserStore } from "@/stores/user";
import { Message } from "@arco-design/web-vue";
import {
  IconGithub,
  IconCheckCircleFill,
  IconCloseCircle,
  IconThunderbolt,
  IconUser,
  IconCloseCircleFill,
} from "@arco-design/web-vue/es/icon";

interface Props {
  modelValue: boolean;
  redirectTo?: string;
}

interface Emits {
  (e: "update:modelValue", value: boolean): void;
  (e: "success", user: any): void;
}

const props = withDefaults(defineProps<Props>(), {
  redirectTo: "/",
});

const emit = defineEmits<Emits>();

const router = useRouter();
const user = useUserStore();

const visible = ref(props.modelValue);
const step = ref<"authorize" | "loading" | "success" | "error">("authorize");
const authLoading = ref(false);
const mockLoading = ref(false);
const errorMessage = ref("");
const userInfo = ref<{
  id: number;
  username: string;
  name: string;
  avatar?: string;
  githubLogin?: string;
  isNewUser?: boolean;
} | null>(null);

watch(
  () => props.modelValue,
  (val) => {
    visible.value = val;
    if (val) {
      // 打开时重置状态
      step.value = "authorize";
      errorMessage.value = "";
    }
  }
);

watch(visible, (val) => {
  emit("update:modelValue", val);
});

async function startGithubAuth() {
  authLoading.value = true;
  try {
    // 获取 GitHub 授权 URL
    const res = await request<{ code: string; data: { url: string } }>("/api/auth/github/url");
    // 跳转到 GitHub 授权页面
    window.location.href = res.data.url;
  } catch (e: any) {
    if (e instanceof ApiError) {
      Message.error(e.message);
    } else {
      Message.error("获取授权链接失败，请稍后重试");
    }
    authLoading.value = false;
  }
}

async function useMockLogin() {
  mockLoading.value = true;
  step.value = "loading";
  
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
    }>("/api/auth/github/mock", {
      method: "POST",
      body: JSON.stringify({
        username: `dev_${Math.random().toString(36).substring(2, 6)}`,
      }),
    });
    
    // 保存登录状态
    user.setAuth(res.data.accessToken, res.data.user.name);
    
    userInfo.value = {
      ...res.data.user,
      isNewUser: res.data.isNewUser,
    };
    
    step.value = "success";
    emit("success", userInfo.value);
    
    // 延迟跳转
    setTimeout(() => {
      visible.value = false;
      router.replace(props.redirectTo);
      Message.success(res.data.isNewUser ? "注册成功，欢迎加入！" : "登录成功！");
    }, 1500);
  } catch (e: any) {
    step.value = "error";
    if (e instanceof ApiError) {
      errorMessage.value = e.message;
    } else {
      errorMessage.value = "网络异常，请稍后重试";
    }
  } finally {
    mockLoading.value = false;
  }
}

/**
 * 处理 GitHub 授权回调（实际项目中会在回调页面调用）
 */
async function handleGithubCallback(code: string) {
  step.value = "loading";
  
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
    
    user.setAuth(res.data.accessToken, res.data.user.name);
    
    userInfo.value = {
      ...res.data.user,
      isNewUser: res.data.isNewUser,
    };
    
    step.value = "success";
    emit("success", userInfo.value);
    
    setTimeout(() => {
      visible.value = false;
      router.replace(props.redirectTo);
      Message.success(res.data.isNewUser ? "注册成功，欢迎加入！" : "登录成功！");
    }, 1500);
  } catch (e: any) {
    step.value = "error";
    if (e instanceof ApiError) {
      errorMessage.value = e.message;
    } else {
      errorMessage.value = "GitHub 授权失败，请重试";
    }
  }
}

function retry() {
  step.value = "authorize";
  errorMessage.value = "";
}

// 暴露给父组件
defineExpose({
  handleGithubCallback,
});
</script>

<style scoped>
.modal-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.github-icon {
  color: #24292e;
  font-size: 24px;
}

.github-login-content {
  padding: 20px 0;
}

/* 授权区域 */
.authorize-section {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.authorize-tip {
  margin-bottom: 20px;
  text-align: center;
}

.github-logo-container {
  margin-bottom: 24px;
}

.github-logo {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: linear-gradient(135deg, #24292e 0%, #404448 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 24px rgba(36, 41, 46, 0.3);
}

.logo-icon {
  font-size: 56px;
  color: white;
}

.authorize-info {
  width: 100%;
  margin-bottom: 24px;
  padding: 16px;
  background: var(--color-fill-1);
  border-radius: 8px;
}

.info-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  font-size: 13px;
  color: var(--color-text-2);
}

.check-icon {
  color: #00b42a;
  font-size: 16px;
}

.close-icon {
  color: var(--color-text-4);
  font-size: 16px;
}

.authorize-btn {
  height: 44px;
  font-size: 15px;
  font-weight: 600;
  background: linear-gradient(135deg, #24292e 0%, #404448 100%);
  border: none;
}

.authorize-btn:hover {
  background: linear-gradient(135deg, #404448 0%, #5a5e63 100%);
}

.divider-section {
  width: 100%;
  margin-top: 24px;
}

.mock-btn {
  border-color: #24292e;
  color: #24292e;
}

.mock-btn:hover {
  background: rgba(36, 41, 46, 0.1);
}

/* 加载区域 */
.loading-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 0;
}

/* 成功区域 */
.success-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px 0;
}

.success-avatar {
  position: relative;
}

.success-check {
  position: absolute;
  bottom: 0;
  right: 0;
  font-size: 24px;
  color: #00b42a;
  background: white;
  border-radius: 50%;
}

/* 错误区域 */
.error-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 40px 0;
}

.error-icon {
  font-size: 64px;
  color: var(--color-danger-6);
}
</style>

<style>
/* 全局样式，用于模态框 */
.github-login-modal .arco-modal-header {
  border-bottom: 1px solid var(--color-border-2);
}
</style>
