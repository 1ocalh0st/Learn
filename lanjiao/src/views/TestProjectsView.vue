<template>
  <div class="page-container">
    <!-- 页头 -->
    <a-page-header title="测试项目管理" subtitle="管理所有测试项目" @back="$router.push('/')">
      <template #extra>
        <a-button type="primary" @click="showCreateModal = true">
          <template #icon><icon-plus /></template>
          新建项目
        </a-button>
      </template>
    </a-page-header>

    <!-- 项目列表 -->
    <a-row :gutter="20" class="projects-grid">
      <a-col v-for="project in projects" :key="project.id" :span="8">
        <a-card
          class="project-card"
          hoverable
          @click="viewProject(project.id)"
        >
          <div class="project-header">
            <div class="project-icon">
              <icon-apps />
            </div>
            <a-dropdown @select="handleAction($event, project)">
              <a-button type="text" size="small">
                <icon-more />
              </a-button>
              <template #content>
                <a-doption value="edit">
                  <icon-edit /> 编辑
                </a-doption>
                <a-doption value="delete">
                  <icon-delete /> 删除
                </a-doption>
              </template>
            </a-dropdown>
          </div>

          <a-typography-title :heading="5" class="project-name">
            {{ project.name }}
          </a-typography-title>
          <a-typography-paragraph class="project-desc" :ellipsis="{ rows: 2 }">
            {{ project.description || '暂无描述' }}
          </a-typography-paragraph>

          <div class="project-meta">
            <a-space>
              <a-tag color="blue">测试用例</a-tag>
              <span>创建于 {{ formatDate(project.created_at) }}</span>
            </a-space>
          </div>
        </a-card>
      </a-col>

      <!-- 空状态 -->
      <a-col v-if="projects.length === 0" :span="24">
        <a-empty description="暂无项目">
          <a-button type="primary" @click="showCreateModal = true">
            创建第一个项目
          </a-button>
        </a-empty>
      </a-col>
    </a-row>

    <!-- 创建/编辑项目弹窗 -->
    <a-modal
      v-model:visible="showCreateModal"
      :title="editingProject ? '编辑项目' : '新建项目'"
      @ok="handleSubmit"
      @cancel="handleCancel"
    >
      <a-form :model="formData" layout="vertical">
        <a-form-item label="项目名称" required>
          <a-input
            v-model="formData.name"
            placeholder="请输入项目名称"
            :max-length="50"
            show-word-limit
          />
        </a-form-item>
        <a-form-item label="项目描述">
          <a-textarea
            v-model="formData.description"
            placeholder="请输入项目描述"
            :max-length="500"
            show-word-limit
            :auto-size="{ minRows: 3, maxRows: 6 }"
          />
        </a-form-item>
      </a-form>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { Message, Modal } from '@arco-design/web-vue';
import { request } from '@/utils/request';
import {
  IconPlus,
  IconApps,
  IconMore,
  IconEdit,
  IconDelete,
} from '@arco-design/web-vue/es/icon';

interface Project {
  id: number;
  name: string;
  description: string;
  created_at: string;
  updated_at: string;
}

const router = useRouter();
const projects = ref<Project[]>([]);
const showCreateModal = ref(false);
const editingProject = ref<Project | null>(null);
const formData = ref({
  name: '',
  description: '',
});

// 加载项目列表
async function loadProjects() {
  try {
    const res = await request<{ code: string; data: Project[] }>('/api/test/projects');
    if (res.code === 'OK') {
      projects.value = res.data;
    }
  } catch (error: any) {
    Message.error('加载项目失败: ' + error.message);
  }
}

// 查看项目详情
function viewProject(id: number) {
  router.push(`/test/cases/${id}`);
}

// 处理操作
function handleAction(action: string, project: Project) {
  if (action === 'edit') {
    editingProject.value = project;
    formData.value = {
      name: project.name,
      description: project.description,
    };
    showCreateModal.value = true;
  } else if (action === 'delete') {
    Modal.confirm({
      title: '确认删除',
      content: `确定要删除项目"${project.name}"吗？此操作将同时删除该项目下的所有测试用例。`,
      onOk: async () => {
        await deleteProject(project.id);
      },
    });
  }
}

// 删除项目
async function deleteProject(id: number) {
  try {
    await request(`/api/test/projects/${id}`, { method: 'DELETE' });
    Message.success('项目删除成功');
    await loadProjects();
  } catch (error: any) {
    Message.error('删除失败: ' + error.message);
  }
}

// 提交表单
async function handleSubmit() {
  if (!formData.value.name.trim()) {
    Message.warning('请输入项目名称');
    return;
  }

  try {
    if (editingProject.value) {
      // 编辑
      await request(`/api/test/projects/${editingProject.value.id}`, {
        method: 'PUT',
        body: JSON.stringify(formData.value),
      });
      Message.success('项目更新成功');
    } else {
      // 新建
      await request('/api/test/projects', {
        method: 'POST',
        body: JSON.stringify(formData.value),
      });
      Message.success('项目创建成功');
    }

    showCreateModal.value = false;
    await loadProjects();
  } catch (error: any) {
    Message.error('操作失败: ' + error.message);
  }
}

// 取消
function handleCancel() {
  showCreateModal.value = false;
  editingProject.value = null;
  formData.value = { name: '', description: '' };
}

// 格式化日期
function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('zh-CN');
}

onMounted(() => {
  loadProjects();
});
</script>

<style scoped>
.page-container {
  padding: 24px;
}

.projects-grid {
  margin-top: 24px;
}

.project-card {
  margin-bottom: 20px;
  border-radius: 12px;
  transition: all 0.3s ease;
  cursor: pointer;
}

.project-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.1);
}

.project-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.project-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: linear-gradient(135deg, #165dff 0%, #722ed1 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.project-name {
  margin-bottom: 8px !important;
}

.project-desc {
  color: var(--color-text-3);
  min-height: 48px;
}

.project-meta {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid var(--color-border-2);
  font-size: 12px;
  color: var(--color-text-3);
}
</style>
