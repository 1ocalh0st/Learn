<template>
  <a-modal
    v-model:visible="visible"
    :footer="false"
    :width="400"
    :mask-closable="true"
    modal-class="qq-login-modal"
    title-align="start"
  >
    <template #title>
      <div class="modal-title">
        <icon-qq class="qq-icon" />
        <span>QQ 登录</span>
      </div>
    </template>

    <div class="qq-login-content">
      <!-- 步骤一：展示二维码 -->
      <div v-if="step === 'qrcode'" class="qrcode-section">
        <div class="qrcode-tip">
          <a-typography-text type="secondary">
            请使用 QQ 扫描二维码登录
          </a-typography-text>
        </div>
        
        <div class="qrcode-container" :class="{ loading: qrcodeLoading, expired: qrcodeExpired }">
          <div v-if="qrcodeLoading" class="qrcode-loading">
            <a-spin :size="32" />
            <span>正在加载...</span>
          </div>
          <div v-else-if="qrcodeExpired" class="qrcode-expired">
            <icon-exclamation-circle-fill class="expired-icon" />
            <span>二维码已过期</span>
            <a-button type="primary" size="small" @click="refreshQrcode">
              刷新二维码
            </a-button>
          </div>
          <div v-else class="qrcode-wrapper">
            <!-- 实际项目中这里会嵌入 QQ 扫码 iframe 或显示二维码图片 -->
            <div class="qrcode-placeholder">
              <icon-qrcode class="qrcode-icon" />
              <a-typography-text type="secondary" style="font-size: 12px;">
                QQ 扫码区域
              </a-typography-text>
            </div>
          </div>
        </div>

        <div class="qrcode-footer">
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
            模拟 QQ 登录
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
          欢迎，{{ userInfo?.name || 'QQ 用户' }}
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
  IconQq,
  IconQrcode,
  IconExclamationCircleFill,
  IconThunderbolt,
  IconUser,
  IconCheckCircleFill,
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
const step = ref<"qrcode" | "loading" | "success" | "error">("qrcode");
const qrcodeLoading = ref(false);
const qrcodeExpired = ref(false);
const mockLoading = ref(false);
const errorMessage = ref("");
const userInfo = ref<{
  id: number;
  username: string;
  name: string;
  avatar?: string;
  isNewUser?: boolean;
} | null>(null);

watch(
  () => props.modelValue,
  (val) => {
    visible.value = val;
    if (val) {
      // 打开时重置状态
      step.value = "qrcode";
      qrcodeExpired.value = false;
      errorMessage.value = "";
      loadQrcode();
    }
  }
);

watch(visible, (val) => {
  emit("update:modelValue", val);
});

async function loadQrcode() {
  qrcodeLoading.value = true;
  try {
    // 获取 QQ 授权 URL（实际项目中会用到）
    const res = await request<{ code: string; data: { url: string } }>("/api/auth/qq/url");
    // 这里可以用 url 生成二维码或跳转
    console.log("QQ auth URL:", res.data.url);
  } catch (e: any) {
    // 如果 QQ 未配置，使用模拟模式
    console.log("QQ not configured, using mock mode");
  } finally {
    qrcodeLoading.value = false;
  }
}

function refreshQrcode() {
  qrcodeExpired.value = false;
  loadQrcode();
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
        };
      };
    }>("/api/auth/qq/mock", {
      method: "POST",
      body: JSON.stringify({
        nickname: `QQ用户_${Math.random().toString(36).substring(2, 6)}`,
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
 * 处理 QQ 授权回调（实际项目中会在回调页面调用）
 */
async function handleQQCallback(code: string) {
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
        };
      };
    }>("/api/auth/qq/callback", {
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
      errorMessage.value = "QQ 授权失败，请重试";
    }
  }
}

function retry() {
  step.value = "qrcode";
  errorMessage.value = "";
  loadQrcode();
}

// 暴露给父组件
defineExpose({
  handleQQCallback,
});
</script>

<style scoped>
.modal-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.qq-icon {
  color: #12b7f5;
  font-size: 24px;
}

.qq-login-content {
  padding: 20px 0;
}

/* 二维码区域 */
.qrcode-section {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.qrcode-tip {
  margin-bottom: 20px;
  text-align: center;
}

.qrcode-container {
  width: 220px;
  height: 220px;
  border: 1px solid var(--color-border-2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-fill-1);
  transition: all 0.3s ease;
}

.qrcode-container.loading,
.qrcode-container.expired {
  background: var(--color-fill-2);
}

.qrcode-loading,
.qrcode-expired {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  color: var(--color-text-3);
}

.expired-icon {
  font-size: 48px;
  color: var(--color-warning-6);
}

.qrcode-wrapper {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.qrcode-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.qrcode-icon {
  font-size: 100px;
  color: var(--color-text-4);
}

.qrcode-footer {
  width: 100%;
  margin-top: 24px;
}

.mock-btn {
  border-color: #12b7f5;
  color: #12b7f5;
}

.mock-btn:hover {
  background: rgba(18, 183, 245, 0.1);
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
.qq-login-modal .arco-modal-header {
  border-bottom: 1px solid var(--color-border-2);
}
</style>
