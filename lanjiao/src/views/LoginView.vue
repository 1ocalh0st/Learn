<template>
  <div class="login-page">
    <div class="login-container">
      <!-- 左侧装饰区域 -->
      <div class="login-banner">
        <div class="banner-content">
          <div class="banner-logo">
            <icon-apps :size="48" />
          </div>
          <a-typography-title :heading="2" class="banner-title">
            Learning Platform
          </a-typography-title>
          <a-typography-paragraph class="banner-desc">
            高效学习，轻松管理。探索无限可能的学习之旅。
          </a-typography-paragraph>
          <div class="banner-features">
            <div class="feature-item">
              <icon-check-circle-fill class="feature-icon" />
              <span>安全可靠的数据保护</span>
            </div>
            <div class="feature-item">
              <icon-check-circle-fill class="feature-icon" />
              <span>简洁直观的操作界面</span>
            </div>
            <div class="feature-item">
              <icon-check-circle-fill class="feature-icon" />
              <span>全天候技术支持服务</span>
            </div>
          </div>
        </div>
        <div class="banner-decoration">
          <div class="deco-circle deco-circle-1"></div>
          <div class="deco-circle deco-circle-2"></div>
          <div class="deco-circle deco-circle-3"></div>
        </div>
      </div>

      <!-- 右侧登录表单 -->
      <div class="login-form-wrapper">
        <div class="auth-card">
          <div class="card-header">
            <a-typography-title :heading="3" class="title">
              欢迎回来 👋
            </a-typography-title>
            <a-typography-paragraph type="secondary" class="subtitle">
              请登录您的账户以继续
            </a-typography-paragraph>
          </div>

          <a-form
            :model="form"
            layout="vertical"
            @submit="handleSubmit"
            class="login-form"
          >
            <a-form-item field="username" label="用户名" :rules="[{ required: true, message: '请输入用户名' }]">
              <a-input
                v-model="form.username"
                placeholder="请输入用户名"
                size="large"
                allow-clear
              >
                <template #prefix>
                  <icon-user />
                </template>
              </a-input>
            </a-form-item>

            <a-form-item field="password" label="密码" :rules="[{ required: true, message: '请输入密码' }]">
              <a-input-password
                v-model="form.password"
                placeholder="请输入密码"
                size="large"
                allow-clear
              >
                <template #prefix>
                  <icon-lock />
                </template>
              </a-input-password>
            </a-form-item>

            <div class="form-options">
              <a-checkbox v-model="rememberMe">记住我</a-checkbox>
              <a-link>忘记密码？</a-link>
            </div>

            <a-form-item>
              <a-button
                type="primary"
                html-type="submit"
                size="large"
                long
                :loading="loading"
                class="submit-btn"
              >
                <template #icon v-if="!loading">
                  <icon-safe />
                </template>
                立即登录
              </a-button>
            </a-form-item>
          </a-form>

          <a-divider orientation="center">
            <a-typography-text type="secondary">快速登录</a-typography-text>
          </a-divider>

          <div class="social-login">
            <a-button 
              size="large" 
              long 
              class="wechat-btn"
              @click="showWechatLogin"
            >
              <template #icon><icon-wechat /></template>
              微信登录
            </a-button>
          </div>

          <div class="social-login-icons">
            <a-tooltip content="QQ 登录">
              <a-button shape="circle" size="large" class="social-btn">
                <icon-qq />
              </a-button>
            </a-tooltip>
            <a-tooltip content="GitHub 登录">
              <a-button shape="circle" size="large" class="social-btn">
                <icon-github />
              </a-button>
            </a-tooltip>
          </div>

          <div class="footer">
            <a-typography-text type="secondary">还没有账号？</a-typography-text>
            <router-link to="/register">
              <a-link>立即注册</a-link>
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- 微信登录弹窗 -->
    <WechatLoginModal 
      v-model="wechatModalVisible" 
      :redirect-to="redirectTo"
      @success="onWechatSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed } from "vue";
import { useRouter, useRoute } from "vue-router";
import { request, ApiError } from "@/utils/request";
import { useUserStore } from "@/stores/user";
import { Message } from "@arco-design/web-vue";
import WechatLoginModal from "@/components/WechatLoginModal.vue";
import {
  IconApps,
  IconCheckCircleFill,
  IconUser,
  IconLock,
  IconSafe,
  IconWechat,
  IconQq,
  IconGithub,
} from "@arco-design/web-vue/es/icon";

const form = reactive({
  username: "",
  password: "",
});
const loading = ref(false);
const rememberMe = ref(true);
const wechatModalVisible = ref(false);

const user = useUserStore();
const router = useRouter();
const route = useRoute();

const redirectTo = computed(() => (route.query.redirect as string) || "/");

async function handleSubmit() {
  if (!form.username || !form.password) {
    Message.warning("请填写用户名和密码");
    return;
  }
  
  loading.value = true;
  try {
    const res = await request<{
      code: string;
      message: string;
      data: { accessToken: string; user: { id: number; username: string; name: string } };
    }>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ username: form.username, password: form.password }),
    });
    user.setAuth(res.data.accessToken, res.data.user.name || res.data.user.username);
    Message.success("登录成功！");
    router.replace(redirectTo.value);
  } catch (e: any) {
    if (e instanceof ApiError) {
      Message.error(e.message || "登录失败");
    } else {
      Message.error("网络异常，请稍后重试");
    }
  } finally {
    loading.value = false;
  }
}

function showWechatLogin() {
  wechatModalVisible.value = true;
}

function onWechatSuccess(userInfo: any) {
  console.log("WeChat login success:", userInfo);
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: stretch;
  background: #f7f8fa;
}

.login-container {
  display: flex;
  width: 100%;
  min-height: 100vh;
}

/* 左侧装饰区域 */
.login-banner {
  flex: 1;
  background: linear-gradient(135deg, #165dff 0%, #722ed1 100%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
  overflow: hidden;
  padding: 60px;
}

.banner-content {
  position: relative;
  z-index: 2;
  text-align: center;
  color: white;
  max-width: 400px;
}

.banner-logo {
  width: 80px;
  height: 80px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 24px;
  backdrop-filter: blur(10px);
}

.banner-title {
  color: white !important;
  margin-bottom: 16px !important;
  font-weight: 700 !important;
}

.banner-desc {
  color: rgba(255, 255, 255, 0.85) !important;
  font-size: 16px !important;
  line-height: 1.6 !important;
  margin-bottom: 40px !important;
}

.banner-features {
  text-align: left;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  color: rgba(255, 255, 255, 0.9);
  font-size: 15px;
}

.feature-icon {
  color: #7be89a;
  font-size: 20px;
}

/* 装饰圆圈 */
.banner-decoration {
  position: absolute;
  inset: 0;
  z-index: 1;
}

.deco-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}

.deco-circle-1 {
  width: 300px;
  height: 300px;
  top: -100px;
  right: -100px;
}

.deco-circle-2 {
  width: 200px;
  height: 200px;
  bottom: 100px;
  left: -50px;
}

.deco-circle-3 {
  width: 150px;
  height: 150px;
  bottom: -50px;
  right: 50px;
}

/* 右侧表单区域 */
.login-form-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: white;
}

.auth-card {
  width: 100%;
  max-width: 400px;
}

.card-header {
  text-align: center;
  margin-bottom: 32px;
}

.title {
  margin-bottom: 8px !important;
  color: #1d2129 !important;
}

.subtitle {
  margin: 0 !important;
}

.login-form :deep(.arco-form-item-label-col) {
  margin-bottom: 4px;
}

.login-form :deep(.arco-input-wrapper) {
  border-radius: 8px;
}

.form-options {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.submit-btn {
  height: 44px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 8px;
  background: linear-gradient(135deg, #165dff 0%, #722ed1 100%);
  border: none;
  transition: all 0.3s ease;
}

.submit-btn:hover {
  background: linear-gradient(135deg, #4080ff 0%, #8e51da 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(22, 93, 255, 0.35);
}

.social-login {
  margin: 16px 0;
}

.wechat-btn {
  height: 44px;
  background: #07c160;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 500;
  transition: all 0.3s ease;
}

.wechat-btn:hover {
  background: #06ad56;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(7, 193, 96, 0.35);
}

.social-login-icons {
  display: flex;
  justify-content: center;
  gap: 16px;
  margin: 16px 0;
}

.social-btn {
  width: 44px;
  height: 44px;
  transition: all 0.3s ease;
}

.social-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.footer {
  text-align: center;
  margin-top: 24px;
}

/* 响应式设计 */
@media (max-width: 900px) {
  .login-banner {
    display: none;
  }
  
  .login-form-wrapper {
    padding: 24px;
  }
}
</style>