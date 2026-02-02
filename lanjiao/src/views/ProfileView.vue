<template>
  <div class="profile-page">
    <div class="profile-header">
      <a-typography-title :heading="2">个人中心</a-typography-title>
      <a-typography-text type="secondary">管理您的账户信息和安全设置</a-typography-text>
    </div>

    <div class="profile-content">
      <a-grid :cols="24" :col-gap="24" :row-gap="24">
        <!-- 基本信息卡片 -->
        <a-grid-item :span="{ xs: 24, sm: 24, md: 8 }">
          <a-card title="基本信息" :bordered="false" class="info-card">
            <div class="user-avatar-section">
              <a-avatar :size="80" class="user-avatar">
                {{ userStore.info?.name?.[0]?.toUpperCase() || 'U' }}
              </a-avatar>
              <div class="user-name-group">
                <a-typography-title :heading="4">{{ userStore.info?.name }}</a-typography-title>
                <a-tag color="blue">普通用户</a-tag>
              </div>
            </div>
            <a-divider />
            <div class="info-list">
              <div class="info-item">
                <span class="label">用户名</span>
                <span class="value">{{ userStore.info?.username }}</span>
              </div>
              <div class="info-item">
                <span class="label">账户 ID</span>
                <span class="value">#{{ userStore.info?.id }}</span>
              </div>
            </div>
          </a-card>
        </a-grid-item>

        <!-- 安全设置卡片 -->
        <a-grid-item :span="{ xs: 24, sm: 24, md: 16 }">
          <a-card title="账户安全" :bordered="false">
            <div class="security-list">
              <div class="security-item">
                <div class="security-info">
                  <div class="security-title">
                    账户密码
                    <a-tag :color="userStore.info?.hasPassword ? 'green' : 'orange'" size="small">
                      {{ userStore.info?.hasPassword ? '已设置' : '未设置' }}
                    </a-tag>
                  </div>
                  <div class="security-desc">
                    {{ userStore.info?.hasPassword ? '用于通过账号密码直接登录，请定期修改以保证安全。' : '当前通过第三方登录注册，建议设置密码以支持账号密码登录。' }}
                  </div>
                </div>
                <div class="security-action">
                  <a-button type="primary" size="small" @click="showPasswordModal = true">
                    {{ userStore.info?.hasPassword ? '修改密码' : '设置密码' }}
                  </a-button>
                </div>
              </div>
              
              <a-divider />

              <div class="security-item">
                <div class="security-info">
                  <div class="security-title">社交账号绑定</div>
                  <div class="security-desc">关联社交账号，登录更方便。</div>
                </div>
                <div class="security-action">
                   <a-space>
                     <icon-wechat :style="{ fontSize: '24px', color: '#07c160' }" />
                     <icon-qq :style="{ fontSize: '24px', color: '#12b7f5' }" />
                     <icon-github :style="{ fontSize: '24px', color: '#24292e' }" />
                   </a-space>
                </div>
              </div>
            </div>
          </a-card>
        </a-grid-item>
      </a-grid>
    </div>

    <!-- 密码设置弹窗 -->
    <a-modal
      v-model:visible="showPasswordModal"
      :title="userStore.info?.hasPassword ? '修改密码' : '设置密码'"
      @before-ok="handlePasswordSubmit"
      @cancel="passwordForm.oldPassword = ''; passwordForm.newPassword = ''; passwordForm.confirmPassword = ''"
      :ok-loading="submitLoading"
    >
      <a-form :model="passwordForm" layout="vertical">
        <a-form-item v-if="userStore.info?.hasPassword" label="旧密码" required>
          <a-input-password v-model="passwordForm.oldPassword" placeholder="请输入当前密码" />
        </a-form-item>
        <a-form-item label="新密码" required :rules="[{ minLength: 6, message: '密码至少6位' }]">
          <a-input-password v-model="passwordForm.newPassword" placeholder="请输入新密码" />
        </a-form-item>
        <a-form-item label="确认新密码" required>
          <a-input-password v-model="passwordForm.confirmPassword" placeholder="请再次输入新密码" />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue';
import { useUserStore } from '@/stores/user';
import { Message } from '@arco-design/web-vue';
import { request } from '@/utils/request';
import { IconWechat, IconQq, IconGithub } from '@arco-design/web-vue/es/icon';

const userStore = useUserStore();
const showPasswordModal = ref(false);
const submitLoading = ref(false);

const passwordForm = reactive({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
});

// 获取最新的用户信息
const fetchUserInfo = async () => {
  try {
    const res = await request<any>('/api/me');
    userStore.setInfo(res);
  } catch (e) {
    console.error('Failed to fetch user info', e);
  }
};

onMounted(() => {
  fetchUserInfo();
});

const handlePasswordSubmit = async () => {
  if (userStore.info?.hasPassword && !passwordForm.oldPassword) {
    Message.warning('请输入旧密码');
    return false;
  }
  if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
    Message.warning('新密码至少需要6位');
    return false;
  }
  if (passwordForm.newPassword !== passwordForm.confirmPassword) {
    Message.warning('两次输入的新密码不一致');
    return false;
  }

  submitLoading.value = true;
  try {
    await request('/api/auth/password', {
      method: 'POST',
      body: JSON.stringify({
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword,
      }),
    });
    Message.success('密码设置成功');
    showPasswordModal.value = false;
    // 重置表单
    passwordForm.oldPassword = '';
    passwordForm.newPassword = '';
    passwordForm.confirmPassword = '';
    // 重新获取用户信息更新状态
    await fetchUserInfo();
    return true;
  } catch (e: any) {
    Message.error(e.message || '密码设置失败');
    return false;
  } finally {
    submitLoading.value = false;
  }
};
</script>

<style scoped>
.profile-page {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.profile-header {
  margin-bottom: 32px;
}

.profile-content {
  margin-top: 24px;
}

.info-card {
  height: 100%;
}

.user-avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px 0;
}

.user-avatar {
  background-color: var(--color-fill-3);
  color: var(--color-text-2);
  font-size: 32px;
  margin-bottom: 16px;
}

.user-name-group {
  text-align: center;
}

.info-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.info-item {
  display: flex;
  justify-content: space-between;
}

.info-item .label {
  color: var(--color-text-3);
}

.security-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 0;
}

.security-title {
  font-weight: 600;
  font-size: 16px;
  margin-bottom: 4px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.security-desc {
  color: var(--color-text-3);
  font-size: 13px;
}
</style>
