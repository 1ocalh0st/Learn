<template>
  <div class="page-container">
    <!-- 页头 -->
    <a-page-header title="生产环境监控" subtitle="实时错误监控和告警" @back="$router.push('/')">
      <template #extra>
        <a-space>
          <a-button @click="loadErrors(1)">
            <template #icon><icon-refresh /></template>
            刷新
          </a-button>
        </a-space>
      </template>
    </a-page-header>

    <!-- 统计卡片 -->
    <a-row :gutter="20" class="stats-row">
      <a-col :span="8">
        <a-card class="stat-card stat-card-blue" :bordered="false">
          <a-statistic
            title="总错误数(24小时)"
            :value="stats.totalErrors"
            :precision="0"
          >
            <template #prefix>
              <icon-exclamation-circle-fill />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card class="stat-card stat-card-red" :bordered="false">
          <a-statistic
            title="前端错误"
            :value="stats.frontendErrors"
            :precision="0"
          >
            <template #prefix>
              <icon-desktop />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
      <a-col :span="8">
        <a-card class="stat-card stat-card-orange" :bordered="false">
          <a-statistic
            title="后端错误"
            :value="stats.backendErrors"
            :precision="0"
          >
            <template #prefix>
              <icon-code-square />
            </template>
          </a-statistic>
        </a-card>
      </a-col>
    </a-row>

    <!-- 筛选栏 -->
    <a-card class="filter-card">
      <a-space>
        <a-select v-model="filterType" placeholder="错误类型" allow-clear style="width: 150px" @change="loadErrors(1)">
          <a-option value="frontend">前端错误</a-option>
          <a-option value="backend">后端错误</a-option>
        </a-select>
        <a-button @click="loadErrors(1)">
          <template #icon><icon-refresh /></template>
          刷新
        </a-button>
      </a-space>
    </a-card>

    <!-- 错误列表 -->
    <a-table
      :data="errors"
      :pagination="monitorPagination"
      :loading="loading"
      class="errors-table"
      @page-change="loadErrors"
    >
      <template #columns>
        <a-table-column title="ID" data-index="id" :width="80" />
        <a-table-column title="类型" data-index="error_type" :width="100">
          <template #cell="{ record }">
            <a-tag v-if="record.error_type === 'frontend'" color="red">前端</a-tag>
            <a-tag v-else color="orange">后端</a-tag>
          </template>
        </a-table-column>
        <a-table-column title="错误信息" data-index="message" />
        <a-table-column title="URL" data-index="url" :width="200">
          <template #cell="{ record }">
            <a-tooltip :content="record.url">
              <span class="url-cell">{{ record.url || '-' }}</span>
            </a-tooltip>
          </template>
        </a-table-column>
        <a-table-column title="已告警" data-index="alerted" :width="80">
          <template #cell="{ record }">
            <a-tag v-if="record.alerted" color="green">是</a-tag>
            <span v-else>-</span>
          </template>
        </a-table-column>
        <a-table-column title="发生时间" data-index="created_at" :width="180">
          <template #cell="{ record }">
            {{ formatDate(record.created_at) }}
          </template>
        </a-table-column>
        <a-table-column title="操作" :width="100">
          <template #cell="{ record }">
            <a-button size="small" @click="viewErrorDetail(record)">
              详情
            </a-button>
          </template>
        </a-table-column>
      </template>
    </a-table>

    <!-- 错误详情弹窗 -->
    <a-modal
      v-model:visible="showErrorDetail"
      title="错误详情"
      :footer="false"
      width="800px"
    >
      <div v-if="currentError" class="error-detail">
        <a-descriptions :column="2" bordered>
          <a-descriptions-item label="错误ID">
            {{ currentError.id }}
          </a-descriptions-item>
          <a-descriptions-item label="类型">
            <a-tag v-if="currentError.error_type === 'frontend'" color="red">前端错误</a-tag>
            <a-tag v-else color="orange">后端错误</a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="错误信息" :span="2">
            {{ currentError.message }}
          </a-descriptions-item>
          <a-descriptions-item label="URL" :span="2">
            {{ currentError.url || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="User Agent" :span="2">
            {{ currentError.user_agent || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="用户ID">
            {{ currentError.user_id || '-' }}
          </a-descriptions-item>
          <a-descriptions-item label="发生时间">
            {{ formatDate(currentError.created_at) }}
          </a-descriptions-item>
        </a-descriptions>

        <div v-if="currentError.stack_trace" class="stack-trace">
          <h4>堆栈跟踪</h4>
          <pre>{{ currentError.stack_trace }}</pre>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { Message } from '@arco-design/web-vue';
import { request } from '@/utils/request';
import {
  IconRefresh,
  IconExclamationCircleFill,
  IconDesktop,
  IconCodeSquare,
} from '@arco-design/web-vue/es/icon';

interface ProductionError {
  id: number;
  error_type: 'frontend' | 'backend';
  message: string;
  stack_trace: string | null;
  user_agent: string | null;
  url: string | null;
  user_id: number | null;
  alerted: number;
  created_at: string;
}

interface ErrorStats {
  error_type: string;
  count: number;
  last_occurrence: string;
}

const errors = ref<ProductionError[]>([]);
const stats = ref({
  totalErrors: 0,
  frontendErrors: 0,
  backendErrors: 0,
});
const loading = ref(false);
const filterType = ref<string>('');
const showErrorDetail = ref(false);
const currentError = ref<ProductionError | null>(null);

const monitorPagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
  showTotal: true
});

// 加载错误列表
async function loadErrors(page = 1) {
  loading.value = true;
  monitorPagination.value.current = page;
  try {
    const params = new URLSearchParams({ 
      page: String(page),
      pageSize: String(monitorPagination.value.pageSize)
    });
    if (filterType.value) {
      params.append('errorType', filterType.value);
    }

    const res = await request<{ code: string; data: ProductionError[]; total: number }>(
      `/api/monitor/errors?${params.toString()}`
    );
    if (res.code === 'OK') {
      errors.value = res.data;
      monitorPagination.value.total = res.total;
    }
  } catch (error: any) {
    Message.error('加载错误列表失败: ' + error.message);
  } finally {
    loading.value = false;
  }
}

// 加载统计数据
async function loadStats() {
  try {
    const res = await request<{ code: string; data: ErrorStats[] }>(
      '/api/monitor/stats?hours=24'
    );
    if (res.code === 'OK') {
      const frontend = res.data.find(s => s.error_type === 'frontend');
      const backend = res.data.find(s => s.error_type === 'backend');

      stats.value = {
        totalErrors: (frontend?.count || 0) + (backend?.count || 0),
        frontendErrors: frontend?.count || 0,
        backendErrors: backend?.count || 0,
      };
    }
  } catch (error: any) {
    Message.error('加载统计数据失败: ' + error.message);
  }
}

// 查看错误详情
function viewErrorDetail(error: ProductionError) {
  currentError.value = error;
  showErrorDetail.value = true;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('zh-CN');
}

onMounted(() => {
  loadErrors();
  loadStats();
});
</script>

<style scoped>
.page-container {
  padding: 24px;
}

.stats-row {
  margin: 24px 0;
}

.stat-card {
  border-radius: 12px;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.08);
}

.stat-card-blue {
  background: linear-gradient(135deg, rgba(22, 93, 255, 0.08) 0%, rgba(114, 46, 209, 0.08) 100%);
}

.stat-card-red {
  background: linear-gradient(135deg, rgba(245, 63, 63, 0.08) 0%, rgba(255, 125, 0, 0.08) 100%);
}

.stat-card-orange {
  background: linear-gradient(135deg, rgba(255, 125, 0, 0.08) 0%, rgba(230, 162, 60, 0.08) 100%);
}

.filter-card {
  margin-bottom: 16px;
}

.errors-table {
  margin-top: 16px;
}

.url-cell {
  display: inline-block;
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.error-detail {
  margin-top: 16px;
}

.stack-trace {
  margin-top: 24px;
}

.stack-trace h4 {
  margin-bottom: 12px;
}

.stack-trace pre {
  padding: 16px;
  background: #1e1e1e;
  color: #d4d4d4;
  border-radius: 8px;
  font-family: 'JetBrains Mono', 'Consolas', monospace;
  font-size: 13px;
  line-height: 1.6;
  overflow-x: auto;
}
</style>
