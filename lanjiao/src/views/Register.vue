<template>
  <div class="register-page">
    <div class="register-container">
      <!-- 左侧装饰区域 -->
      <div class="register-banner">
        <div class="banner-content">
          <div class="banner-logo">
            <icon-apps :size="48" />
          </div>
          <a-typography-title :heading="2" class="banner-title">
            加入我们
          </a-typography-title>
          <a-typography-paragraph class="banner-desc">
            创建您的专属账户，开启智慧学习新篇章。
          </a-typography-paragraph>
          
          <div class="stats-container">
            <div class="stat-item">
              <div class="stat-value">10K+</div>
              <div class="stat-label">活跃用户</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">500+</div>
              <div class="stat-label">学习资源</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">99%</div>
              <div class="stat-label">好评率</div>
            </div>
          </div>
        </div>
        <div class="banner-decoration">
          <div class="deco-wave"></div>
        </div>
      </div>

      <!-- 右侧注册表单 -->
      <div class="register-form-wrapper">
        <div class="auth-card">
          <div class="card-header">
            <a-typography-title :heading="3" class="title">
              创建账号 🚀
            </a-typography-title>
            <a-typography-paragraph type="secondary" class="subtitle">
              填写以下信息完成注册
            </a-typography-paragraph>
          </div>

          <!-- 快速注册方式 -->
          <div class="quick-register">
            <div class="quick-register-grid">
              <a-button 
                size="large" 
                class="social-register-btn wechat-btn"
                @click="showWechatLogin"
              >
                <template #icon><icon-wechat /></template>
                微信注册
              </a-button>
              <a-button 
                size="large" 
                class="social-register-btn qq-btn"
                @click="showQQLogin"
              >
                <template #icon><icon-qq /></template>
                QQ 注册
              </a-button>
              <a-button 
                size="large" 
                class="social-register-btn github-btn"
                @click="showGithubLogin"
              >
                <template #icon><icon-github /></template>
                GitHub
              </a-button>
            </div>
          </div>

          <a-divider orientation="center">
            <a-typography-text type="secondary" style="font-size: 12px;">
              或使用账号注册
            </a-typography-text>
          </a-divider>

          <a-form
            :model="form"
            layout="vertical"
            @submit="handleSubmit"
            class="register-form"
          >
            <a-form-item 
              field="username" 
              label="用户名" 
              :rules="[
                { required: true, message: '请输入用户名' },
                { match: /^[\u4e00-\u9fa5a-zA-Z0-9_]+$/, message: '只能包含中文、字母、数字和下划线' }
              ]"
            >
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

            <a-form-item 
              field="password" 
              label="密码"
              :rules="[
                { required: true, message: '请输入密码' },
                { minLength: 6, message: '密码至少 6 位' }
              ]"
            >
              <a-input-password
                v-model="form.password"
                placeholder="请输入密码（至少6位）"
                size="large"
                allow-clear
              >
                <template #prefix>
                  <icon-lock />
                </template>
              </a-input-password>
            </a-form-item>

            <a-form-item field="name" label="昵称（可选）">
              <a-input
                v-model="form.name"
                placeholder="例如: 张三"
                size="large"
                allow-clear
              >
                <template #prefix>
                  <icon-edit />
                </template>
              </a-input>
            </a-form-item>

            <a-form-item>
              <a-checkbox v-model="agreeTerms">
                我已阅读并同意
                <a-link>《服务条款》</a-link>
                和
                <a-link>《隐私政策》</a-link>
              </a-checkbox>
            </a-form-item>

            <a-form-item>
              <a-button
                type="primary"
                html-type="submit"
                size="large"
                long
                :loading="loading"
                :disabled="!agreeTerms"
                class="submit-btn"
              >
                <template #icon v-if="!loading">
                  <icon-user-add />
                </template>
                立即注册
              </a-button>
            </a-form-item>
          </a-form>

          <div class="footer">
            <a-typography-text type="secondary">已有账号？</a-typography-text>
            <router-link to="/login">
              <a-link>返回登录</a-link>
            </router-link>
          </div>
        </div>
      </div>
    </div>

    <!-- 微信登录弹窗 -->
    <WechatLoginModal 
      v-model="wechatModalVisible" 
      redirect-to="/"
      @success="onWechatSuccess"
    />

    <!-- QQ 登录弹窗 -->
    <QQLoginModal 
      v-model="qqModalVisible" 
      redirect-to="/"
      @success="onQQSuccess"
    />

    <!-- GitHub 登录弹窗 -->
    <GithubLoginModal 
      v-model="githubModalVisible" 
      redirect-to="/"
      @success="onGithubSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import { useRouter } from "vue-router";
import { request, ApiError } from "@/utils/request";
import { Message } from "@arco-design/web-vue";
import WechatLoginModal from "@/components/WechatLoginModal.vue";
import QQLoginModal from "@/components/QQLoginModal.vue";
import GithubLoginModal from "@/components/GithubLoginModal.vue";
import {
  IconApps,
  IconUser,
  IconLock,
  IconEdit,
  IconUserAdd,
  IconWechat,
  IconQq,
  IconGithub,
} from "@arco-design/web-vue/es/icon";

const router = useRouter();

const form = reactive({
  username: "",
  password: "",
  name: "",
});

const loading = ref(false);
const agreeTerms = ref(false);
const wechatModalVisible = ref(false);
const qqModalVisible = ref(false);
const githubModalVisible = ref(false);

async function handleSubmit() {
  if (!form.username) {
    Message.warning("请输入用户名");
    return;
  }
  if (!/^[\u4e00-\u9fa5a-zA-Z0-9_]+$/.test(form.username)) {
    Message.warning("用户名只能包含中文、字母、数字和下划线");
    return;
  }
  if (form.password.length < 6) {
    Message.warning("密码至少 6 位");
    return;
  }
  if (!agreeTerms.value) {
    Message.warning("请同意服务条款和隐私政策");
    return;
  }

  loading.value = true;
  try {
    await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify(form),
    });
    Message.success("注册成功，正在跳转登录...");
    setTimeout(() => router.replace({ 
      path: "/login", 
      query: { 
        username: form.username,
        password: form.password 
      } 
    }), 1500);
  } catch (e: any) {
    if (e instanceof ApiError) {
      if (e.code === "USERNAME_EXISTS") {
        Message.error("用户名已存在");
      } else {
        Message.error(e.message || "注册失败");
      }
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

function showQQLogin() {
  qqModalVisible.value = true;
}

function showGithubLogin() {
  githubModalVisible.value = true;
}

function onWechatSuccess(userInfo: any) {
  console.log("WeChat register success:", userInfo);
}

function onQQSuccess(userInfo: any) {
  console.log("QQ register success:", userInfo);
}

function onGithubSuccess(userInfo: any) {
  console.log("GitHub register success:", userInfo);
}
</script>

<style scoped>
.register-page {
  min-height: 100vh;
  display: flex;
  align-items: stretch;
  background: #f7f8fa;
}

.register-container {
  display: flex;
  width: 100%;
  min-height: 100vh;
}

/* 左侧装饰区域 */
.register-banner {
  flex: 1;
  background: linear-gradient(135deg, #00b96b 0%, #165dff 100%);
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
  margin-bottom: 48px !important;
}

.stats-container {
  display: flex;
  gap: 32px;
  justify-content: center;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 32px;
  font-weight: 700;
  color: white;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.7);
}

/* 装饰波浪 */
.banner-decoration {
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow: hidden;
}

.deco-wave {
  position: absolute;
  bottom: -50%;
  left: -10%;
  width: 120%;
  height: 100%;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 50% 50% 0 0;
}

/* 右侧表单区域 */
.register-form-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  background: white;
  overflow-y: auto;
}

.auth-card {
  width: 100%;
  max-width: 420px;
}

.card-header {
  text-align: center;
  margin-bottom: 24px;
}

.title {
  margin-bottom: 8px !important;
  color: #1d2129 !important;
}

.subtitle {
  margin: 0 !important;
}

.quick-register {
  margin-bottom: 16px;
}

.quick-register-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.social-register-btn {
  height: 44px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.social-register-btn.wechat-btn {
  background: #07c160;
  color: white;
  border: none;
}

.social-register-btn.wechat-btn:hover {
  background: #06ad56;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(7, 193, 96, 0.35);
}

.social-register-btn.qq-btn {
  background: #12b7f5;
  color: white;
  border: none;
}

.social-register-btn.qq-btn:hover {
  background: #0ea5e0;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(18, 183, 245, 0.35);
}

.social-register-btn.github-btn {
  background: #24292e;
  color: white;
  border: none;
}

.social-register-btn.github-btn:hover {
  background: #3a4046;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(36, 41, 46, 0.35);
}

.register-form :deep(.arco-form-item-label-col) {
  margin-bottom: 4px;
}

.register-form :deep(.arco-input-wrapper) {
  border-radius: 8px;
}

.submit-btn {
  height: 44px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 8px;
  background: linear-gradient(135deg, #00b96b 0%, #165dff 100%);
  border: none;
  transition: all 0.3s ease;
}

.submit-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #34c98f 0%, #4080ff 100%);
  transform: translateY(-1px);
  box-shadow: 0 4px 16px rgba(0, 185, 107, 0.35);
}

.footer {
  text-align: center;
  margin-top: 24px;
}

/* 响应式设计 */
@media (max-width: 900px) {
  .register-banner {
    display: none;
  }
  
  .register-form-wrapper {
    padding: 24px;
  }
}
</style>