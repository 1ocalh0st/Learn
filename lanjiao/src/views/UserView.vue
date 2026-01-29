<template>
  <div class="user-panel">
    <!-- 页面头部 -->
    <a-page-header
      :show-back="false"
      title="用户管理"
      subtitle="查看和管理系统用户"
      class="page-header"
    >
      <template #extra>
        <a-space>
          <a-input-search
            v-model="searchKeyword"
            placeholder="搜索用户..."
            allow-clear
            style="width: 240px;"
          />
          <a-button type="primary" @click="showAddModal">
            <template #icon><icon-plus /></template>
            添加用户
          </a-button>
          <a-button @click="load" :loading="loading">
            <template #icon><icon-refresh /></template>
            刷新
          </a-button>
        </a-space>
      </template>
    </a-page-header>

    <!-- 数据表格 -->
    <a-card :bordered="false" class="table-card">
      <a-table
        :data="filteredUsers"
        :loading="loading"
        :pagination="pagination"
        :bordered="false"
        row-key="id"
        stripe
        hoverable
      >
        <template #columns>
          <a-table-column title="序号" :width="80">
            <template #cell="{ rowIndex }">
              <a-tag color="arcoblue" size="small">
                {{ (pagination.current - 1) * pagination.pageSize + rowIndex + 1 }}
              </a-tag>
            </template>
          </a-table-column>

          <a-table-column title="用户信息" data-index="username">
            <template #cell="{ record }">
              <div class="user-info">
                <a-avatar :size="36" class="user-avatar">
                  {{ (record.name || record.username || '?').charAt(0).toUpperCase() }}
                </a-avatar>
                <div class="user-detail">
                  <span class="user-name">{{ record.name || record.username }}</span>
                  <span class="user-username">@{{ record.username }}</span>
                </div>
              </div>
            </template>
          </a-table-column>

          <a-table-column title="状态" :width="100">
            <template #cell="{ record }">
              <a-badge 
                :status="record.status === 1 ? 'success' : 'danger'" 
                :text="record.status === 1 ? '正常' : '禁用'" 
              />
            </template>
          </a-table-column>

          <a-table-column title="创建时间" data-index="created_at" :width="180">
            <template #cell="{ record }">
              <div class="time-cell">
                <icon-calendar class="time-icon" />
                {{ formatDate(record.created_at) }}
              </div>
            </template>
          </a-table-column>

          <a-table-column title="操作" :width="200" align="center" fixed="right">
            <template #cell="{ record }">
              <a-space>
                <a-tooltip content="编辑用户">
                  <a-button type="text" size="small" @click="editUser(record)">
                    <template #icon><icon-edit /></template>
                  </a-button>
                </a-tooltip>
                <a-tooltip content="查看详情">
                  <a-button type="text" size="small" @click="viewUser(record)">
                    <template #icon><icon-eye /></template>
                  </a-button>
                </a-tooltip>
                <a-tooltip :content="record.status === 1 ? '禁用用户' : '启用用户'">
                  <a-button 
                    type="text" 
                    size="small" 
                    :status="record.status === 1 ? 'warning' : 'success'"
                    @click="toggleStatus(record)"
                  >
                    <template #icon>
                      <icon-stop v-if="record.status === 1" />
                      <icon-check v-else />
                    </template>
                  </a-button>
                </a-tooltip>
                <a-popconfirm
                  content="确定要删除该用户吗？此操作不可恢复。"
                  type="warning"
                  @ok="remove(record.id)"
                >
                  <a-tooltip content="删除用户">
                    <a-button type="text" size="small" status="danger">
                      <template #icon><icon-delete /></template>
                    </a-button>
                  </a-tooltip>
                </a-popconfirm>
              </a-space>
            </template>
          </a-table-column>
        </template>

        <template #empty>
          <a-empty description="暂无用户数据">
            <a-button type="primary" @click="showAddModal">
              <template #icon><icon-plus /></template>
              添加第一个用户
            </a-button>
          </a-empty>
        </template>
      </a-table>
    </a-card>

    <!-- 用户详情抽屉 -->
    <a-drawer
      v-model:visible="drawerVisible"
      title="用户详情"
      :width="400"
      :footer="false"
    >
      <template v-if="selectedUser">
        <div class="drawer-content">
          <div class="drawer-avatar-section">
            <a-avatar :size="80" class="drawer-avatar">
              {{ (selectedUser.name || selectedUser.username || '?').charAt(0).toUpperCase() }}
            </a-avatar>
            <a-typography-title :heading="5" class="drawer-name">
              {{ selectedUser.name || selectedUser.username }}
            </a-typography-title>
            <a-tag :color="selectedUser.status === 1 ? 'green' : 'red'">
              {{ selectedUser.status === 1 ? '正常状态' : '已禁用' }}
            </a-tag>
          </div>

          <a-descriptions :column="1" bordered class="drawer-descriptions">
            <a-descriptions-item label="用户ID">
              {{ selectedUser.id }}
            </a-descriptions-item>
            <a-descriptions-item label="用户名">
              {{ selectedUser.username }}
            </a-descriptions-item>
            <a-descriptions-item label="昵称">
              {{ selectedUser.name || '-' }}
            </a-descriptions-item>
            <a-descriptions-item label="状态">
              <a-badge 
                :status="selectedUser.status === 1 ? 'success' : 'danger'" 
                :text="selectedUser.status === 1 ? '正常' : '禁用'" 
              />
            </a-descriptions-item>
            <a-descriptions-item label="创建时间">
              {{ selectedUser.created_at }}
            </a-descriptions-item>
            <a-descriptions-item label="更新时间">
              {{ selectedUser.updated_at || '-' }}
            </a-descriptions-item>
          </a-descriptions>
        </div>
      </template>
    </a-drawer>

    <!-- 添加/编辑用户模态框 -->
    <a-modal
      v-model:visible="modalVisible"
      :title="isEdit ? '编辑用户' : '添加用户'"
      :ok-loading="submitting"
      @ok="handleModalOk"
      @cancel="handleModalCancel"
    >
      <a-form :model="formData" layout="vertical" ref="formRef">
        <a-form-item 
          label="用户名" 
          field="username"
          :rules="[{ required: true, message: '请输入用户名' }]"
        >
          <a-input 
            v-model="formData.username" 
            placeholder="请输入用户名"
            :disabled="isEdit"
          >
            <template #prefix><icon-user /></template>
          </a-input>
          <template #extra v-if="isEdit">
            <a-typography-text type="secondary">用户名创建后不可修改</a-typography-text>
          </template>
        </a-form-item>
        
        <a-form-item 
          label="昵称"
          field="name"
        >
          <a-input v-model="formData.name" placeholder="请输入昵称（可选）">
            <template #prefix><icon-idcard /></template>
          </a-input>
        </a-form-item>
        
        <a-form-item 
          label="密码" 
          field="password"
          :rules="isEdit ? [] : [{ required: true, message: '请输入密码' }, { minLength: 6, message: '密码至少6位' }]"
        >
          <a-input-password 
            v-model="formData.password" 
            :placeholder="isEdit ? '留空则不修改密码' : '请输入密码（至少6位）'" 
          >
            <template #prefix><icon-lock /></template>
          </a-input-password>
        </a-form-item>
        
        <a-form-item label="状态" field="status">
          <a-radio-group v-model="formData.status">
            <a-radio :value="1">
              <a-badge status="success" text="正常" />
            </a-radio>
            <a-radio :value="0">
              <a-badge status="danger" text="禁用" />
            </a-radio>
          </a-radio-group>
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { request, ApiError } from "@/utils/request";
import { Message } from "@arco-design/web-vue";
import {
  IconPlus,
  IconRefresh,
  IconCalendar,
  IconEdit,
  IconEye,
  IconDelete,
  IconUser,
  IconIdcard,
  IconLock,
  IconStop,
  IconCheck,
} from "@arco-design/web-vue/es/icon";

type User = { 
  id: number; 
  username: string; 
  name: string; 
  status: number;
  created_at: string;
  updated_at?: string;
};

const users = ref<User[]>([]);
const loading = ref(false);
const searchKeyword = ref("");
const drawerVisible = ref(false);
const modalVisible = ref(false);
const selectedUser = ref<User | null>(null);
const isEdit = ref(false);
const submitting = ref(false);
const formRef = ref();

const formData = reactive({
  id: 0,
  username: "",
  name: "",
  password: "",
  status: 1,
});

const pagination = reactive({
  current: 1,
  pageSize: 10,
  showTotal: true,
  showJumper: true,
  showPageSize: true,
});

const filteredUsers = computed(() => {
  if (!searchKeyword.value) return users.value;
  const keyword = searchKeyword.value.toLowerCase();
  return users.value.filter(
    (u) =>
      u.username?.toLowerCase().includes(keyword) ||
      (u.name && u.name.toLowerCase().includes(keyword))
  );
});

async function load() {
  loading.value = true;
  try {
    users.value = await request<User[]>("/api/users/list");
  } catch (e: any) {
    Message.error(e.message || "加载失败");
  } finally {
    loading.value = false;
  }
}

async function remove(id: number) {
  try {
    await request<void>("/api/users/delete", {
      method: "POST",
      body: JSON.stringify({ id }),
    });
    Message.success("用户已删除");
    await load();
  } catch (e: any) {
    Message.error(e.message || "删除失败");
  }
}

async function toggleStatus(user: User) {
  const newStatus = user.status === 1 ? 0 : 1;
  try {
    await request("/api/users/update", {
      method: "POST",
      body: JSON.stringify({ 
        id: user.id, 
        status: newStatus 
      }),
    });
    Message.success(newStatus === 1 ? "用户已启用" : "用户已禁用");
    await load();
  } catch (e: any) {
    Message.error(e.message || "操作失败");
  }
}

function viewUser(user: User) {
  selectedUser.value = user;
  drawerVisible.value = true;
}

function editUser(user: User) {
  isEdit.value = true;
  formData.id = user.id;
  formData.username = user.username;
  formData.name = user.name || "";
  formData.password = "";
  formData.status = user.status ?? 1;
  modalVisible.value = true;
}

function showAddModal() {
  isEdit.value = false;
  formData.id = 0;
  formData.username = "";
  formData.name = "";
  formData.password = "";
  formData.status = 1;
  modalVisible.value = true;
}

async function handleModalOk() {
  // 表单验证
  if (!formData.username) {
    Message.warning("请输入用户名");
    return;
  }
  if (!isEdit.value && (!formData.password || formData.password.length < 6)) {
    Message.warning("密码至少6位");
    return;
  }

  submitting.value = true;
  try {
    if (isEdit.value) {
      // 编辑用户
      const updateData: any = {
        id: formData.id,
        name: formData.name,
        status: formData.status,
      };
      // 只有填写了密码才更新密码
      if (formData.password) {
        updateData.password = formData.password;
      }
      
      await request("/api/users/update", {
        method: "POST",
        body: JSON.stringify(updateData),
      });
      Message.success("用户已更新");
    } else {
      // 添加用户
      await request("/api/users/add", {
        method: "POST",
        body: JSON.stringify({
          username: formData.username,
          password: formData.password,
          name: formData.name,
          status: formData.status,
        }),
      });
      Message.success("用户已添加");
    }
    modalVisible.value = false;
    await load();
  } catch (e: any) {
    if (e instanceof ApiError) {
      Message.error(e.message);
    } else {
      Message.error("操作失败");
    }
  } finally {
    submitting.value = false;
  }
}

function handleModalCancel() {
  modalVisible.value = false;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "-";
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return dateStr;
  }
}

onMounted(() => {
  load();
});
</script>

<style scoped>
.user-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.page-header {
  background: white;
  border-radius: 12px;
  padding: 16px 24px;
  margin-bottom: 0;
}

.page-header :deep(.arco-page-header-title) {
  font-size: 20px;
  font-weight: 600;
}

.table-card {
  border-radius: 12px;
}

.table-card :deep(.arco-card-body) {
  padding: 0;
}

/* 用户信息单元格 */
.user-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.user-avatar {
  background: linear-gradient(135deg, #165dff 0%, #722ed1 100%);
  color: white;
  font-weight: 600;
}

.user-detail {
  display: flex;
  flex-direction: column;
}

.user-name {
  font-weight: 600;
  color: var(--color-text-1);
}

.user-username {
  font-size: 12px;
  color: var(--color-text-3);
}

/* 时间单元格 */
.time-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--color-text-2);
}

.time-icon {
  color: var(--color-text-3);
}

/* 抽屉样式 */
.drawer-content {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.drawer-avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: linear-gradient(135deg, rgba(22, 93, 255, 0.05) 0%, rgba(114, 46, 209, 0.05) 100%);
  border-radius: 12px;
}

.drawer-avatar {
  background: linear-gradient(135deg, #165dff 0%, #722ed1 100%);
  color: white;
  font-size: 32px;
  font-weight: 600;
  margin-bottom: 12px;
}

.drawer-name {
  margin-bottom: 8px !important;
}

.drawer-descriptions {
  margin-top: 8px;
}
</style>