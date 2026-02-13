<template>
  <div class="page-container">
    <!-- 页头 -->
    <a-page-header title="测试报告" subtitle="查看所有测试报告" @back="$router.back()">
      <template #extra>
        <a-button type="primary" @click="showGenerateModal = true">
          <template #icon><icon-plus /></template>
          生成报告
        </a-button>
      </template>
    </a-page-header>

    <!-- 报告列表 -->
    <a-table
      :data="reports"
      :loading="loading"
      :pagination="reportPagination"
      class="reports-table"
      @page-change="loadReports"
    >
      <template #columns>
        <a-table-column title="报告ID" data-index="id" :width="100" />
        <a-table-column title="项目" data-index="project_name" :width="150" />
        <a-table-column title="统计信息" :width="400">
          <template #cell="{ record }">
            <a-space>
              <a-tag color="blue">总计: {{ record.summary.total }}</a-tag>
              <a-tag color="green">通过: {{ record.summary.passed }}</a-tag>
              <a-tag color="red">失败: {{ record.summary.failed }}</a-tag>
              <a-tag color="purple">通过率: {{ record.summary.passRate }}</a-tag>
            </a-space>
          </template>
        </a-table-column>
        <a-table-column title="生成时间" data-index="created_at" :width="180">
          <template #cell="{ record }">
            {{ formatDate(record.created_at) }}
          </template>
        </a-table-column>
        <a-table-column title="操作" :width="200">
          <template #cell="{ record }">
            <a-space>
              <a-button size="small" @click="viewReport(record.id)">
                <template #icon><icon-eye /></template>
                查看
              </a-button>
              <a-button size="small" @click="downloadReport(record.id)">
                <template #icon><icon-download /></template>
                下载
              </a-button>
              <a-popconfirm content="确定要删除该报告吗？" @ok="deleteReport(record.id)">
                <a-button size="small" status="danger">
                  <template #icon><icon-delete /></template>
                  删除
                </a-button>
              </a-popconfirm>
            </a-space>
          </template>
        </a-table-column>
      </template>
    </a-table>

    <!-- 生成报告弹窗 -->
    <a-modal
      v-model:visible="showGenerateModal"
      title="生成测试报告"
      @ok="handleGenerate"
      @cancel="showGenerateModal = false"
      :mask-closable="false"
      width="850px"
    >
      <a-form :model="generateForm" layout="vertical">
        <a-form-item label="1. 选择项目" required>
          <a-select 
            v-model="generateForm.projectId" 
            placeholder="请先选择所属项目"
            @change="loadExecutions(1)"
          >
            <a-option v-for="project in projects" :key="project.id" :value="project.id">
              {{ project.name }}
            </a-option>
          </a-select>
        </a-form-item>
        <a-form-item label="2. 选择执行记录" required>
          <a-table
            :data="executions"
            :pagination="executionPagination"
            row-key="id"
            :row-selection="{ type: 'checkbox', showCheckedAll: true }"
            v-model:selected-keys="generateForm.executionIds"
            size="medium"
            bordered
            style="width: 100%"
            @page-change="loadExecutions"
          >
            <template #columns>
              <a-table-column title="ID" data-index="id" :width="70" />
              <a-table-column title="用例名称" data-index="test_case_name" />
              <a-table-column title="状态" :width="100">
                <template #cell="{ record }">
                  <a-tag :color="record.status === 'passed' ? 'green' : 'red'">
                    {{ record.status === 'passed' ? '通过' : '失败' }}
                  </a-tag>
                </template>
              </a-table-column>
              <a-table-column title="时间" :width="180">
                <template #cell="{ record }">
                  {{ formatDate(record.executed_at) }}
                </template>
              </a-table-column>
            </template>
          </a-table>
          <template #extra v-if="generateForm.projectId && executions.length === 0">
            <span style="color: var(--color-text-3)">该项目暂无执行记录</span>
          </template>
        </a-form-item>
      </a-form>
    </a-modal>

    <!-- 报告查看弹窗 -->
    <a-modal
      v-model:visible="showReportDetail"
      title="报告详情"
      :footer="false"
      width="900px"
    >
      <div v-if="currentReport" class="report-detail">
        <a-descriptions :column="2" bordered>
          <a-descriptions-item label="报告ID">
            {{ currentReport.id }}
          </a-descriptions-item>
          <a-descriptions-item label="项目名称">
            {{ currentReport.project_name || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="总用例数">
            <a-tag color="blue">{{ currentReport.summary.total }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="通过数">
            <a-tag color="green">{{ currentReport.summary.passed }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="失败数">
            <a-tag color="red">{{ currentReport.summary.failed }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="通过率">
            <a-tag color="purple">{{ currentReport.summary.passRate }}</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="生成时间" :span="2">
            {{ formatDate(currentReport.created_at) }}
          </a-descriptions-item>
        </a-descriptions>

        <a-divider />

        <div class="report-preview">
          <h4>执行记录</h4>
          <a-tag
            v-for="id in currentReport.execution_ids"
            :key="id"
            color="blue"
            style="margin: 4px"
          >
            执行 #{{ id }}
          </a-tag>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue';
import { Message } from '@arco-design/web-vue';
import { request } from '@/utils/request';
import { useUserStore } from '@/stores/user';
import {
  IconPlus,
  IconEye,
  IconDownload,
  IconDelete
} from '@arco-design/web-vue/es/icon';

const userStore = useUserStore();

interface Report {
  id: number;
  project_id: number | null;
  project_name?: string;
  execution_ids: number[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    passRate: string;
  };
  file_path: string;
  created_at: string;
}

interface Project {
  id: number;
  name: string;
}

interface Execution {
  id: number;
  test_case_id: number;
  test_case_name?: string;
  status: string;
  executed_at: string;
}

const reports = ref<Report[]>([]);
const projects = ref<Project[]>([]);
const executions = ref<Execution[]>([]);
const loading = ref(false);
const showGenerateModal = ref(false);
const showReportDetail = ref(false);
const currentReport = ref<Report | null>(null);

const reportPagination = ref({
  current: 1,
  pageSize: 10,
  total: 0,
  showTotal: true
});

const executionPagination = ref({
  current: 1,
  pageSize: 10,
  total: 0,
  showTotal: true,
  simple: true
});

const generateForm = ref({
  projectId: null as number | null,
  executionIds: [] as number[],
});

// 加载报告列表
async function loadReports(page = 1) {
  loading.value = true;
  try {
    reportPagination.value.current = page;
    const res = await request<{ code: string; data: Report[]; total: number }>('/api/reports?page=' + page + '&pageSize=' + reportPagination.value.pageSize);
    if (res.code === 'OK') {
      reports.value = res.data;
      reportPagination.value.total = res.total || res.data.length;
    }
  } catch (error: any) {
    Message.error('加载报告失败: ' + error.message);
  } finally {
    loading.value = false;
  }
}

// 加载项目列表
async function loadProjects() {
  try {
    const res = await request<{ data: Project[] }>('/api/test/projects');
    projects.value = res.data;
  } catch (error: any) {
    Message.error('加载项目失败: ' + error.message);
  }
}

// 加载执行记录
async function loadExecutions(page = 1) {
  if (!generateForm.value.projectId) return;
  executionPagination.value.current = page;
  try {
    const params = new URLSearchParams();
    params.append('projectId', String(generateForm.value.projectId));
    params.append('page', String(page));
    params.append('pageSize', String(executionPagination.value.pageSize));
    
    const res = await request<{ code: string; data: Execution[]; total: number }>(`/api/test/executions?${params.toString()}`);
    // 后端返回的是 { data, total, page, pageSize }
    executions.value = res.data || [];
    executionPagination.value.total = res.total || 0;
  } catch (error: any) {
    // 忽略错误
  }
}

// 监听项目选择变化，重新加载执行记录
watch(() => generateForm.value.projectId, () => {
  generateForm.value.executionIds = [];
  loadExecutions();
});

// 生成报告
async function handleGenerate() {
  if (generateForm.value.executionIds.length === 0) {
    Message.warning('请选择至少一条执行记录');
    return;
  }

  try {
    const payload = {
      projectId: generateForm.value.projectId,
      executionIds: generateForm.value.executionIds,
    };

    await request('/api/reports', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    Message.success('报告生成成功');
    showGenerateModal.value = false;
    await loadReports();
  } catch (error: any) {
    Message.error('生成报告失败: ' + error.message);
  }
}

// 查看报告
async function viewReport(id: number) {
  try {
    const res = await request<{ data: Report }>(`/api/reports/${id}`);
    currentReport.value = res.data;
    showReportDetail.value = true;
  } catch (error: any) {
    Message.error('加载报告详情失败: ' + error.message);
  }
}

// 下载报告
async function downloadReport(id: number) {
  try {
    // 使用带鉴权的 request 获取文件流
    const res = await fetch(`http://localhost:3000/api/reports/${id}/download`, {
      headers: {
        'Authorization': `Bearer ${userStore.token}`
      }
    });

    if (!res.ok) throw new Error('下载失败');

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${id}.html`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  } catch (error: any) {
    Message.error('下载报告失败: ' + error.message);
  }
}

// 删除报告
async function deleteReport(id: number) {
  try {
    await request(`/api/reports/${id}`, { method: 'DELETE' });
    Message.success('报告删除成功');
    loadReports(reportPagination.value.current);
  } catch (error: any) {
    Message.error('删除报告失败: ' + error.message);
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('zh-CN');
}

onMounted(() => {
  loadReports();
  loadProjects();
  loadExecutions();
});
</script>

<style scoped>
.page-container {
  padding: 24px;
}

.reports-table {
  margin-top: 24px;
  
}

.report-detail {
  margin-top: 16px;
}

.report-preview {
  margin-top: 16px;
}

.report-preview h4 {
  margin-bottom: 12px;
}
</style>
