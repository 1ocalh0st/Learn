<template>
  <div class="file-page">
    <div class="cosmic-bg"></div>
    
    <!-- 头部区域 -->
    <div class="page-header glass-panel">
      <div class="header-left">
        <h2 class="page-title">
          <span class="title-icon">📂</span> 
          <span class="title-text">我的文件</span>
        </h2>
      </div>
      
      <div class="header-right">
         <a-input-search
          v-model="searchKeyword"
          placeholder="搜索文件..."
          class="search-bar"
          allow-clear
          size="large"
        />
        <div class="action-buttons">
          <a-button type="primary" class="upload-btn" size="large" @click="showUploadModal = true">
            <template #icon><icon-upload /></template>
            上传文件
          </a-button>
          <a-button class="create-btn" size="large" @click="showNewFolderModal = true">
            <template #icon><icon-folder-add /></template>
            新建文件夹
          </a-button>
        </div>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card glass-panel" v-for="(stat, index) in statItems" :key="index">
        <div class="stat-icon-wrapper" :class="stat.class">
          <component :is="stat.icon" />
        </div>
        <div class="stat-info">
          <div class="stat-value">{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
        </div>
      </div>
    </div>

    <!-- 主内容区 -->
    <div class="content-wrapper glass-panel">
      <!-- 导航工具栏 -->
      <div class="toolbar">
        <div class="breadcrumb-container">
           <a-button 
             class="nav-root-btn" 
             type="text" 
             :disabled="!currentFolderId"
             @click="navigateToRoot"
             @dragover.prevent="handleDragOverBreadcrumb($event)"
             @drop="handleDropToBreadcrumb($event, { id: null, name: '根目录' })"
           >
             <icon-home /> 根目录
           </a-button>
           
           <span class="breadcrumb-separator" v-if="breadcrumbs.length > 0">/</span>
           
           <a-breadcrumb class="custom-breadcrumb" v-if="breadcrumbs.length > 0">
             <a-breadcrumb-item 
              v-for="(item, index) in breadcrumbs" 
              :key="item.id || index"
              @click="navigateTo(item.id, index)"
              class="breadcrumb-link"
              @dragover.prevent="handleDragOverBreadcrumb($event)"
              @drop="handleDropToBreadcrumb($event, item)"
            >
              {{ item.name }}
            </a-breadcrumb-item>
           </a-breadcrumb>
        </div>
        
        <div class="view-toggles">
          <a-tooltip content="刷新列表">
            <a-button shape="circle" size="small" class="tool-btn" @click="handleRefresh" :loading="loading">
              <icon-refresh />
            </a-button>
          </a-tooltip>
          <div class="divider-v"></div>
          <a-radio-group type="button" v-model="viewMode" size="small">
            <a-radio value="list"><icon-list /></a-radio>
            <a-radio value="grid"><icon-apps /></a-radio>
          </a-radio-group>
        </div>
      </div>

      <!-- 文件列表/网格 -->
      <div class="file-view-area" v-loading="loading">
        <!-- 列表视图 -->
        <div v-if="viewMode === 'list'" class="list-view-container">
          <a-table 
            :data="filteredItems" 
            :pagination="false" 
            :bordered="{ wrapper: false, cell: false }"
            :hoverable="true"
            row-key="id"
            :scroll="{ y: '100%' }" 
            @row-click="handleItemClick"
          >
            <template #columns>
              <a-table-column title="名称" data-index="name" :sortable="{sortDirections: ['ascend', 'descend']}">
                <template #cell="{ record }">
                  <div class="file-name-cell">
                    <div class="file-icon-sm" :class="getFileIconClass(record)">
                      <component :is="getFileIcon(record)" />
                    </div>
                    <span class="file-name-text">{{ record.name }}</span>
                  </div>
                </template>
              </a-table-column>
              <a-table-column title="大小" :width="120" data-index="file_size" :sortable="{sortDirections: ['ascend', 'descend']}">
                <template #cell="{ record }">
                  <span class="meta-text">{{ record.type === 'folder' ? '-' : formatSize(record.file_size) }}</span>
                </template>
              </a-table-column>
              <a-table-column title="修改时间" :width="200" data-index="created_at" :sortable="{sortDirections: ['ascend', 'descend']}">
                <template #cell="{ record }">
                  <span class="meta-text">{{ formatDate(record.created_at) }}</span>
                </template>
              </a-table-column>
              <a-table-column title="操作" :width="180" align="center">
                <template #cell="{ record }">
                   <div class="action-cell">
                      <a-button type="text" shape="circle" size="small" @click.stop="handleAction('preview', record)" v-if="record.type === 'file'" title="预览">
                        <icon-eye />
                      </a-button>
                      <a-button type="text" shape="circle" size="small" @click.stop="handleAction('download', record)" v-if="record.type === 'file'" title="下载">
                        <icon-download />
                      </a-button>
                      <a-button type="text" shape="circle" size="small" @click.stop="handleAction('rename', record)" title="重命名">
                        <icon-edit />
                      </a-button>
                      <a-popconfirm content="确定要删除吗？" @ok="handleAction('delete', record)">
                        <a-button type="text" shape="circle" size="small" status="danger" @click.stop title="删除">
                          <icon-delete />
                        </a-button>
                      </a-popconfirm>
                   </div>
                </template>
              </a-table-column>
            </template>
            <template #tr="{ record }">
              <tr 
                class="arco-table-tr"
                :class="{ 'is-dragover': dragOverId === record.id && record.type === 'folder' }"
                draggable="true"
                @dragstart="handleDragStart($event, record)"
                @dragover.prevent="handleDragOver($event, record)"
                @dragleave="handleDragLeave($event, record)"
                @drop="handleDrop($event, record)"
              >
                <slot></slot>
              </tr>
            </template>
             <template #empty>
              <div class="empty-state">
                <div class="empty-icon-box">
                  <icon-empty />
                </div>
                <p>文件夹为空</p>
                <a-button type="primary" size="small" @click="showUploadModal = true">上传文件</a-button>
              </div>
            </template>
          </a-table>
        </div>

        <!-- 网格视图 -->
        <div v-else class="grid-view-container">
          <transition-group name="fade-scale" tag="div" class="grid-layout" v-if="filteredItems.length > 0">
            <div 
              v-for="item in filteredItems" 
              :key="item.type + item.id"
              class="grid-card"
              :class="{ 'is-dragover': dragOverId === item.id && item.type === 'folder' }"
              draggable="true"
              @dragstart="handleDragStart($event, item)"
              @dragover.prevent="handleDragOver($event, item)"
              @dragleave="handleDragLeave($event, item)"
              @drop="handleDrop($event, item)"
              @click="handleItemClick(item)"
              @contextmenu.prevent="showContextMenu($event, item)"
            >
              <div class="card-inner">
                <div class="grid-icon-lg" :class="getFileIconClass(item)">
                  <component :is="getFileIcon(item)" />
                </div>
                <div class="grid-text">
                  <div class="grid-title" :title="item.name">{{ item.name }}</div>
                  <div class="grid-subtitle">
                    {{ item.type === 'folder' ? formatDate(item.created_at) : formatSize(item.file_size) }}
                  </div>
                </div>
              </div>
              <div class="card-actions">
                <a-dropdown trigger="click" position="br" @select="handleAction($event, item)">
                  <a-button size="mini" shape="circle" class="more-options-btn" @click.stop>
                    <icon-more />
                  </a-button>
                  <template #content>
                    <a-doption value="preview" v-if="item.type === 'file'"><icon-eye /> 预览</a-doption>
                    <a-doption value="download" v-if="item.type === 'file'"><icon-download /> 下载</a-doption>
                    <a-doption value="rename"><icon-edit /> 重命名</a-doption>
                    <a-doption value="delete" class="danger-item"><icon-delete /> 删除</a-doption>
                  </template>
                </a-dropdown>
              </div>
            </div>
          </transition-group>
           <div v-else class="empty-state grid-empty">
              <div class="empty-icon-box">
                  <icon-empty />
              </div>
              <p>暂无内容</p>
          </div>
        </div>
      </div>
    </div>

    <!-- 上传文件弹窗 -->
    <a-modal
      v-model:visible="showUploadModal"
      title="上传文件"
      width="560px"
      :footer="false"
      class="upload-modal-custom"
    >
      <a-upload
        :action="uploadUrl"
        :headers="uploadHeaders"
        :data="uploadData"
        name="file"
        draggable
        :multiple="true"
        @success="handleUploadSuccess"
        @error="handleUploadError"
        class="cosmic-uploader"
      >
        <template #upload-button>
          <div class="upload-dropzone">
            <div class="upload-icon-circle">
                <icon-upload />
            </div>
            <h3>点击或拖拽文件上传</h3>
            <p>支持多文件上传，单个文件限制 50MB</p>
          </div>
        </template>
      </a-upload>
    </a-modal>

    <!-- 新建文件夹弹窗 -->
    <a-modal
      v-model:visible="showNewFolderModal"
      title="新建文件夹"
      @ok="createFolder"
      :ok-loading="creating"
      width="400px"
    >
      <div class="form-item">
        <label>文件夹名称</label>
        <a-input 
          v-model="newFolderName" 
          placeholder="例如：My Documents" 
          allow-clear
          @keyup.enter="createFolder"
          ref="folderInputRef"
        />
      </div>
    </a-modal>

    <!-- 重命名弹窗 -->
    <a-modal
      v-model:visible="showRenameModal"
      title="重命名"
      @ok="handleRename"
      :ok-loading="renaming"
      width="400px"
    >
      <div class="form-item">
         <label>新名称</label>
         <a-input 
          v-model="renameValue" 
          placeholder="请输入新名称"
          allow-clear
          @keyup.enter="handleRename"
        />
      </div>
    </a-modal>

    <!-- 文件预览弹窗 -->
    <a-modal
      v-model:visible="showPreviewModal"
      :title="previewFile?.name || '文件预览'"
      :footer="false"
      width="90vw"
      :modal-style="{ maxWidth: '1200px' }"
      class="preview-modal"
      :unmount-on-close="true"
      @close="cleanupPreview"
    >
      <div class="preview-container" v-loading="previewLoading">
        <!-- 图片预览 -->
        <div v-if="previewType === 'image'" class="preview-image-wrapper">
          <!-- 上一张按钮 -->
          <a-button 
            v-if="imageFiles.length > 1"
            class="image-nav-btn prev-btn" 
            shape="circle" 
            size="large"
            @click="prevImage"
          >
            <icon-left />
          </a-button>
          
          <!-- 图片容器 -->
          <div class="image-view-container">
            <img 
              :src="previewUrl" 
              :alt="previewFile?.name" 
              class="preview-image" 
              :style="{
                transform: `scale(${imageScale}) rotate(${imageRotation}deg)`,
                transition: 'transform 0.3s ease'
              }"
              @load="previewLoading = false" 
            />
          </div>
          
          <!-- 下一张按钮 -->
          <a-button 
            v-if="imageFiles.length > 1"
            class="image-nav-btn next-btn" 
            shape="circle" 
            size="large"
            @click="nextImage"
          >
            <icon-right />
          </a-button>
          
          <!-- 图片控制工具栏 -->
          <div class="image-controls">
            <div class="controls-group">
              <a-tooltip content="缩小">
                <a-button shape="circle" size="small" @click="zoomOut" :disabled="imageScale <= 0.25">
                  <icon-zoom-out />
                </a-button>
              </a-tooltip>
              <span class="scale-value">{{ Math.round(imageScale * 100) }}%</span>
              <a-tooltip content="放大">
                <a-button shape="circle" size="small" @click="zoomIn" :disabled="imageScale >= 3">
                  <icon-zoom-in />
                </a-button>
              </a-tooltip>
            </div>
            
            <div class="controls-divider"></div>
            
            <div class="controls-group">
              <a-tooltip content="向左旋转">
                <a-button shape="circle" size="small" @click="rotateLeft">
                  <icon-rotate-left />
                </a-button>
              </a-tooltip>
              <a-tooltip content="向右旋转">
                <a-button shape="circle" size="small" @click="rotateRight">
                  <icon-rotate-right />
                </a-button>
              </a-tooltip>
            </div>
            
            <div class="controls-divider"></div>
            
            <a-tooltip content="重置">
              <a-button shape="circle" size="small" @click="resetImageView">
                <icon-original-size />
              </a-button>
            </a-tooltip>
            
            <div class="image-counter" v-if="imageFiles.length > 1">
              {{ currentImageIndex + 1 }} / {{ imageFiles.length }}
            </div>
          </div>
        </div>

        <!-- 视频预览 -->
        <div v-else-if="previewType === 'video'" class="preview-video-wrapper">
          <video 
            :src="previewUrl" 
            controls 
            autoplay 
            class="preview-video"
            @loadeddata="previewLoading = false"
          ></video>
        </div>

        <!-- 音频预览 -->
        <div v-else-if="previewType === 'audio'" class="preview-audio-wrapper">
          <div class="audio-visual">
            <div class="audio-icon-circle">
              <icon-file-audio />
            </div>
            <h3 class="audio-title">{{ previewFile?.name }}</h3>
          </div>
          <audio 
            :src="previewUrl" 
            controls 
            autoplay 
            class="preview-audio"
            @loadeddata="previewLoading = false"
          ></audio>
        </div>

        <!-- PDF预览 -->
        <div v-else-if="previewType === 'pdf'" class="preview-pdf-wrapper">
          <iframe 
            :src="previewUrl" 
            class="preview-pdf" 
            frameborder="0"
            @load="previewLoading = false"
          ></iframe>
        </div>

        <!-- 文本/代码预览 -->
        <div v-else-if="previewType === 'text'" class="preview-text-wrapper">
          <pre class="preview-code"><code>{{ previewTextContent }}</code></pre>
        </div>

        <!-- Word 文档预览 -->
        <div v-else-if="previewType === 'word'" class="preview-word-wrapper">
          <div id="docx-container" class="docx-render-container"></div>
        </div>

        <!-- Excel 表格预览 -->
        <div v-else-if="previewType === 'excel'" class="preview-excel-wrapper">
          <div class="excel-tabs" v-if="previewExcelData.length > 1">
            <a-radio-group type="button" v-model="currentExcelSheet" size="small">
              <a-radio 
                v-for="(sheet, index) in previewExcelData" 
                :key="index" 
                :value="index"
              >
                {{ sheet.sheetName }}
              </a-radio>
            </a-radio-group>
          </div>
          <div class="excel-table-container">
            <table class="excel-table" v-if="previewExcelData[currentExcelSheet]">
              <tbody>
                <tr v-for="(row, rowIndex) in previewExcelData[currentExcelSheet]?.data" :key="rowIndex">
                  <td 
                    v-for="(cell, colIndex) in row" 
                    :key="colIndex"
                    :class="{ 'header-cell': rowIndex === 0 }"
                  >
                    {{ cell ?? '' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- PPT 预览（pptx-preview） -->
        <div v-else-if="previewType === 'ppt'" class="preview-pptx-wrapper">
          <div
            ref="pptxContainerRef"
            class="pptx-viewer"
          ></div>
        </div>

        <!-- 不支持预览 -->
        <div v-else class="preview-unsupported">
          <div class="unsupported-icon">
            <icon-file />
          </div>
          <h3>无法预览此文件类型</h3>
          <p>{{ previewFile?.name }}</p>
          <a-button type="primary" @click="downloadFile(previewFile!)">
            <template #icon><icon-download /></template>
            下载文件
          </a-button>
        </div>
      </div>

      <!-- 预览底部工具栏 -->
      <div class="preview-toolbar" v-if="previewType && previewType !== 'unsupported'">
        <div class="preview-info">
          <span class="info-item">{{ formatSize(previewFile?.file_size) }}</span>
          <span class="info-divider">•</span>
          <span class="info-item">{{ previewFile?.mime_type }}</span>
        </div>
        <a-button type="primary" size="small" @click="downloadFile(previewFile!)">
          <template #icon><icon-download /></template>
          下载
        </a-button>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick } from "vue";
import { request } from "@/utils/request";
import { useUserStore } from "@/stores/user";
import { Message } from "@arco-design/web-vue";
import {
  IconHome, IconList, IconApps, IconUpload, IconFolderAdd, IconRefresh,
  IconFile, IconFolder, IconStorage, IconDownload, IconEdit, IconDelete,
  IconImage, IconFileAudio, IconFileVideo, IconFilePdf, IconCode, IconMore,
  IconEmpty, IconEye, IconZoomIn, IconZoomOut, IconLeft, IconRight, IconRotateLeft, IconRotateRight, IconFullscreen, IconOriginalSize
} from "@arco-design/web-vue/es/icon";
import { renderAsync } from "docx-preview";
import { init as initPptx } from 'pptx-preview'
import * as XLSX from "xlsx";

// --- Types ---
interface FileItem {
  id: number;
  name: string;
  type: 'file' | 'folder';
  file_size?: number;
  mime_type?: string;
  folder_id?: number;
  created_at: string;
}

interface BreadcrumbItem {
  id: number | null;
  name: string;
}

// --- State ---
const user = useUserStore();
const loading = ref(false);
const creating = ref(false);
const renaming = ref(false);
const viewMode = ref<'list' | 'grid'>('grid');
const searchKeyword = ref("");
const currentFolderId = ref<number | null>(null);
const breadcrumbs = ref<BreadcrumbItem[]>([]);

const files = ref<FileItem[]>([]);
const folders = ref<FileItem[]>([]);
const stats = reactive({
  fileCount: 0,
  folderCount: 0,
  totalSize: 0
});

// Modals
const showUploadModal = ref(false);
const showNewFolderModal = ref(false);
const showRenameModal = ref(false);
const showPreviewModal = ref(false);
const newFolderName = ref("");
const renameValue = ref("");
const renameItem = ref<FileItem | null>(null);
const folderInputRef = ref();

// Preview
const previewFile = ref<FileItem | null>(null);
// 普通媒体（图片/音视频/pdf iframe等）统一走 Blob URL（string）
const previewUrl = ref<string>("");
// PPTX Preview (pptx-preview)
const pptxContainerRef = ref<HTMLDivElement | null>(null)
let pptxViewer: any = null
const previewType = ref<'image' | 'video' | 'audio' | 'pdf' | 'text' | 'word' | 'excel' | 'ppt' | 'unsupported' | null>(null);
const previewLoading = ref(false);
const previewTextContent = ref("");

// Image Preview Enhancement
const imageScale = ref(1);
const imageRotation = ref(0);
const currentImageIndex = ref(0);

// Drag and Drop
const draggedItem = ref<FileItem | null>(null);
const dragOverId = ref<number | null>(null);

// Office Preview
const previewExcelData = ref<{ sheetName: string; data: string[][] }[]>([]);
const currentExcelSheet = ref(0);

// --- Computed ---
const uploadUrl = computed(() => "/api/files/upload"); // Use relative path for proxy
const uploadHeaders = computed(() => ({
  Authorization: `Bearer ${user.token}`
}));
const uploadData = computed(() => {
    // Return undefined if null to ensure proper FormData handling if needed, 
    // or pass null strictly. Arco handles objects. 
    return { folderId: currentFolderId.value }; 
});

const filteredItems = computed(() => {
  const allItems = [...folders.value, ...files.value];
  if (!searchKeyword.value) return allItems;
  const keyword = searchKeyword.value.toLowerCase();
  return allItems.filter(item => item.name.toLowerCase().includes(keyword));
});

const statItems = computed(() => [
  { label: '文件总数', value: stats.fileCount, icon: IconFile, class: 'bg-blue' },
  { label: '文件夹', value: stats.folderCount, icon: IconFolder, class: 'bg-orange' },
  { label: '已用空间', value: formatSize(stats.totalSize), icon: IconStorage, class: 'bg-green' },
]);

// 当前目录下的所有图片文件（用于上一张/下一张切换）
const imageFiles = computed(() => {
  return files.value.filter(f => {
    const mime = f.mime_type || '';
    return mime.startsWith('image/');
  });
});

// --- Methods ---

async function loadFiles() {
  loading.value = true;
  try {
    const url = currentFolderId.value 
      ? `/api/files/list?folderId=${currentFolderId.value}`
      : "/api/files/list";
    const res = await request<{ code: string; data: { folders: FileItem[]; files: FileItem[] } }>(url);
    if(res && res.data) {
        folders.value = res.data.folders || [];
        files.value = res.data.files || [];
    }
  } catch (e: any) {
    Message.error(e.message || "加载文件列表失败");
  } finally {
    loading.value = false;
  }
}

async function loadStats() {
  try {
    const res = await request<{ code: string; data: { fileCount: number; folderCount: number; totalSize: number } }>("/api/files/stats");
    if (res && res.data) {
      stats.fileCount = res.data.fileCount;
      stats.folderCount = res.data.folderCount;
      stats.totalSize = res.data.totalSize;
    }
  } catch (e) {
    console.warn("Stats load failed", e);
  }
}

function handleRefresh() {
    loadFiles();
    loadStats();
}

async function createFolder() {
  if (!newFolderName.value.trim()) {
    Message.warning("请输入文件夹名称");
    return;
  }
  
  creating.value = true;
  try {
    await request("/api/files/folder", {
      method: "POST",
      body: JSON.stringify({
        name: newFolderName.value.trim(),
        parentId: currentFolderId.value
      })
    });
    Message.success("文件夹创建成功");
    showNewFolderModal.value = false;
    newFolderName.value = "";
    loadFiles();
    loadStats();
  } catch (e: any) {
    Message.error(e.message || "创建失败");
  } finally {
    creating.value = false;
  }
}

async function handleAction(action: string | number | Record<string,any>, item: FileItem) {
    if(typeof action !== 'string') return;
    
    switch (action) {
        case 'preview':
            openPreview(item);
            break;
        case 'download':
            downloadFile(item);
            break;
        case 'rename':
            renameItem.value = item;
            renameValue.value = item.name;
            showRenameModal.value = true;
            break;
        case 'delete':
            deleteItem(item);
            break;
    }
}

async function deleteItem(item: FileItem) {
  try {
    const url = item.type === 'folder' ? "/api/files/folder/delete" : "/api/files/delete";
    await request(url, {
      method: "POST",
      body: JSON.stringify({ id: item.id })
    });
    Message.success("删除成功");
    loadFiles();
    loadStats();
  } catch (e: any) {
    Message.error(e.message || "删除失败");
  }
}

async function handleRename() {
  if (!renameValue.value.trim() || !renameItem.value) {
    Message.warning("请输入名称");
    return;
  }
  
  renaming.value = true;
  try {
    await request("/api/files/rename", {
      method: "POST",
      body: JSON.stringify({
        id: renameItem.value.id,
        name: renameValue.value.trim(),
        type: renameItem.value.type
      })
    });
    Message.success("重命名成功");
    showRenameModal.value = false;
    loadFiles();
  } catch (e: any) {
    Message.error(e.message || "重命名失败");
  } finally {
    renaming.value = false;
  }
}

function downloadFile(item: FileItem) {
  // Use relative URL for proxy support
  const url = `/api/files/download/${item.id}`;
  
  fetch(url, {
    headers: { Authorization: `Bearer ${user.token}` }
  })
    .then(async res => {
        if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            throw new Error(err.message || "Download failed");
        }
        return res.blob();
    })
    .then(blob => {
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = item.name;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(blobUrl);
      }, 100);
    })
    .catch((e) => Message.error(e.message || "下载文件失败"));
}

function handleItemClick(item: FileItem) {
  if (item.type === 'folder') {
    breadcrumbs.value.push({ id: item.id, name: item.name });
    currentFolderId.value = item.id;
    loadFiles();
  } else {
    openPreview(item);
  }
}

// --- Drag and Drop Handlers ---
function handleDragStart(e: DragEvent, item: FileItem) {
  draggedItem.value = item;
  if (e.dataTransfer) {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', item.id.toString());
  }
}

function handleDragOver(e: DragEvent, item: FileItem) {
  if (!draggedItem.value || draggedItem.value.id === item.id || item.type !== 'folder') {
    return;
  }
  dragOverId.value = item.id;
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move';
  }
}

function handleDragLeave(e: DragEvent, item: FileItem) {
  if (dragOverId.value === item.id) {
    dragOverId.value = null;
  }
}

async function handleDrop(e: DragEvent, targetItem: FileItem) {
  e.preventDefault();
  const sourceItem = draggedItem.value;
  dragOverId.value = null;
  draggedItem.value = null;

  if (!sourceItem || sourceItem.id === targetItem.id || targetItem.type !== 'folder') {
    return;
  }

  try {
    await request("/api/files/move", {
      method: "POST",
      body: JSON.stringify({
        itemId: sourceItem.id,
        itemType: sourceItem.type,
        targetFolderId: targetItem.id
      })
    });
    Message.success(`已将 ${sourceItem.name} 移动到 ${targetItem.name}`);
    loadFiles();
  } catch (e: any) {
    Message.error(e.message || "移动失败");
  }
}

function handleDragOverBreadcrumb(e: DragEvent) {
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = 'move';
  }
}

async function handleDropToBreadcrumb(e: DragEvent, target: { id: number | null, name: string }) {
  e.preventDefault();
  const sourceItem = draggedItem.value;
  dragOverId.value = null;
  draggedItem.value = null;

  if (!sourceItem || sourceItem.id === target.id) {
    return;
  }

  // 如果是在当前目录拖拽到当前目录对应的面包屑，不处理
  if (sourceItem.folder_id === target.id) {
      return;
  }

  try {
    await request("/api/files/move", {
      method: "POST",
      body: JSON.stringify({
        itemId: sourceItem.id,
        itemType: sourceItem.type,
        targetFolderId: target.id
      })
    });
    Message.success(`已将 ${sourceItem.name} 移动到 ${target.name}`);
    loadFiles();
  } catch (e: any) {
    Message.error(e.message || "移动失败");
  }
}

// 文件预览功能
function getPreviewType(item: FileItem): 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'word' | 'excel' | 'ppt' | 'unsupported' {
  const mime = item.mime_type || '';
  const name = item.name.toLowerCase();
  
  // 图片
  if (mime.startsWith('image/')) return 'image';
  
  // 视频
  if (mime.startsWith('video/')) return 'video';
  
  // 音频
  if (mime.startsWith('audio/')) return 'audio';
  
  // PDF
  if (mime === 'application/pdf') return 'pdf';
  
  // Word 文档
  if (name.endsWith('.docx') || 
      mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
    return 'word';
  }
  
  // Excel 表格
  if (name.endsWith('.xlsx') || name.endsWith('.xls') || name.endsWith('.csv') ||
      mime === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      mime === 'application/vnd.ms-excel') {
    return 'excel';
  }
  
  // PowerPoint
  if (name.endsWith('.pptx') || name.endsWith('.ppt') ||
      mime === 'application/vnd.openxmlformats-officedocument.presentationml.presentation' ||
      mime === 'application/vnd.ms-powerpoint') {
    return 'ppt';
  }
  
  // 文本/代码文件
  const textExtensions = ['.txt', '.json', '.js', '.ts', '.jsx', '.tsx', '.css', '.scss', '.less', '.html', '.xml', '.md', '.yaml', '.yml', '.env', '.log', '.ini', '.conf', '.sh', '.bat', '.py', '.java', '.c', '.cpp', '.h', '.vue', '.sql'];
  if (mime.startsWith('text/') || textExtensions.some(ext => name.endsWith(ext))) {
    return 'text';
  }
  
  return 'unsupported';
}

async function openPreview(item: FileItem) {
  cleanupPreview()
  previewFile.value = item;
  previewLoading.value = true;
  previewType.value = getPreviewType(item);
  showPreviewModal.value = true;

  // 打开新预览前，先清理上一份预览资源（避免组件拿到旧 src 先渲染一次）
  if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value);
  }
  previewUrl.value = '';
  previewTextContent.value = '';
  previewExcelData.value = [];
  currentExcelSheet.value = 0;
  
  // 如果是图片，初始化图片索引和状态
  if (previewType.value === 'image') {
    const index = imageFiles.value.findIndex(f => f.id === item.id);
    currentImageIndex.value = index >= 0 ? index : 0;
    imageScale.value = 1;
    imageRotation.value = 0;
  }
  
  const fileUrl = `/api/files/download/${item.id}`;
  
  if (previewType.value === 'text') {
    // 文本文件需要先获取内容
    try {
      const response = await fetch(fileUrl, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      if (!response.ok) throw new Error('Failed to load file');
      previewTextContent.value = await response.text();
    } catch (e: any) {
      Message.error('加载文件内容失败');
      previewTextContent.value = '无法加载文件内容';
    } finally {
      previewLoading.value = false;
    }
  } else if (previewType.value === 'word') {
    // Word 文档预览 (使用 docx-preview 实现分页效果)
    try {
      const response = await fetch(fileUrl, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      if (!response.ok) throw new Error('Failed to load file');
      const arrayBuffer = await response.arrayBuffer();
      
      await nextTick();
      const container = document.getElementById('docx-container');
      if (container) {
        container.innerHTML = '';
        await renderAsync(arrayBuffer, container, undefined, {
          className: "docx-preview-wrap",
          inWrapper: true,
          ignoreWidth: false,
          ignoreHeight: false,
          breakPages: true, // 关键：开启分页显示
          experimental: true,
          useBase64URL: false,
        });
      }
    } catch (e: any) {
      console.error('Docx preview error:', e);
      Message.error('加载 Word 文档失败');
      previewType.value = 'unsupported';
    } finally {
      previewLoading.value = false;
    }
  } else if (previewType.value === 'excel') {
    // Excel 表格预览 (使用 xlsx)
    try {
      const response = await fetch(fileUrl, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      if (!response.ok) throw new Error('Failed to load file');
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      previewExcelData.value = workbook.SheetNames.map(sheetName => {
        const sheet = workbook.Sheets[sheetName]!;
        const data = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1 });
        return { sheetName, data: data as string[][] };
      });
      currentExcelSheet.value = 0;
    } catch (e: any) {
      Message.error('加载 Excel 表格失败');
      previewType.value = 'unsupported';
    } finally {
      previewLoading.value = false;
    }
  } else if (previewType.value === 'ppt') {
    // PPTX 预览 (pptx-preview)
    try {
      const response = await fetch(fileUrl, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      if (!response.ok) throw new Error('Failed to load file');

      const arrayBuffer = await response.arrayBuffer();

      // Arco Modal 有动画/Teleport：仅 nextTick 可能还没真正把内容插入 DOM
      await nextTick();
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });

      if (!pptxContainerRef.value) {
        throw new Error('PPTX container not mounted');
      }

      // 每次预览前清空容器，避免残留
      pptxContainerRef.value.innerHTML = '';

      // cleanupPreview() 会 destroy viewer，所以这里每次都重新 init 最稳
      pptxViewer = initPptx(pptxContainerRef.value, {});

      // 不同版本对入参要求不同：优先 Uint8Array，失败再用 Blob URL 兜底
      const u8 = new Uint8Array(arrayBuffer);

      try {
        if (typeof pptxViewer?.preview === 'function') {
          await pptxViewer.preview(u8);
        } else if (typeof pptxViewer?.render === 'function') {
          await pptxViewer.render(u8);
        } else {
          throw new Error('pptx-preview instance has no preview/render method');
        }
      } catch (innerErr) {
        const blob = new Blob([arrayBuffer], {
          type:
            item.mime_type ||
            'application/vnd.openxmlformats-officedocument.presentationml.presentation'
        });
        const blobUrl = URL.createObjectURL(blob);
        // 复用 previewUrl 统一管理 revoke
        previewUrl.value = blobUrl;

        if (typeof pptxViewer?.preview === 'function') {
          await pptxViewer.preview(blobUrl);
        } else if (typeof pptxViewer?.render === 'function') {
          await pptxViewer.render(blobUrl);
        } else {
          throw innerErr;
        }
      }
    } catch (e: any) {
      console.error('PPTX preview error:', e);
      Message.error('加载 PPT 失败');
      previewType.value = 'unsupported';
    } finally {
      previewLoading.value = false;
    }
  } else if (previewType.value !== 'unsupported') {
    // 其他类型生成带鉴权的URL
    // 使用 fetch + blob URL 以支持鉴权
    try {
      const response = await fetch(fileUrl, {
        headers: { Authorization: `Bearer ${user.token}` }
      });
      if (!response.ok) throw new Error('Failed to load file');
      const blob = await response.blob();
      previewUrl.value = URL.createObjectURL(blob);
    } catch (e: any) {
      Message.error('加载文件失败');
      previewType.value = 'unsupported';
      previewLoading.value = false;
    }
  } else {
    previewLoading.value = false;
  }
}

// 清理预览资源
function cleanupPreview() {
  // 仅对 Blob URL 字符串调用 revokeObjectURL，ArrayBuffer 不需要释放
  if (previewUrl.value && typeof previewUrl.value === 'string' && previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value);
  }
  previewUrl.value = '';
  // 清理 PPTX preview（非常重要）
  if (pptxContainerRef.value) {
    pptxContainerRef.value.innerHTML = ''
  }
  pptxViewer?.destroy?.()
  pptxViewer = null
  previewTextContent.value = '';
  previewExcelData.value = [];
  currentExcelSheet.value = 0;
  previewFile.value = null;
  previewType.value = null;
  // 重置图片预览状态
  imageScale.value = 1;
  imageRotation.value = 0;
}

// 图片预览控制函数
function zoomIn() {
  if (imageScale.value < 3) {
    imageScale.value = Math.min(3, imageScale.value + 0.25);
  }
}

function zoomOut() {
  if (imageScale.value > 0.25) {
    imageScale.value = Math.max(0.25, imageScale.value - 0.25);
  }
}

function resetImageView() {
  imageScale.value = 1;
  imageRotation.value = 0;
}

function rotateLeft() {
  imageRotation.value = (imageRotation.value - 90) % 360;
}

function rotateRight() {
  imageRotation.value = (imageRotation.value + 90) % 360;
}

async function prevImage() {
  if (imageFiles.value.length <= 1) return;
  const prevIndex = currentImageIndex.value > 0 
    ? currentImageIndex.value - 1 
    : imageFiles.value.length - 1;
  await switchToImage(prevIndex);
}

async function nextImage() {
  if (imageFiles.value.length <= 1) return;
  const nextIndex = currentImageIndex.value < imageFiles.value.length - 1 
    ? currentImageIndex.value + 1 
    : 0;
  await switchToImage(nextIndex);
}

async function switchToImage(index: number) {
  const targetFile = imageFiles.value[index];
  if (!targetFile) return;
  
  currentImageIndex.value = index;
  previewFile.value = targetFile;
  previewLoading.value = true;
  imageScale.value = 1;
  imageRotation.value = 0;
  
  // 清理旧的 URL（仅对 Blob URL 字符串）
  if (previewUrl.value && typeof previewUrl.value === 'string' && previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value);
  }
  
  const fileUrl = `/api/files/download/${targetFile.id}`;
  try {
    const response = await fetch(fileUrl, {
      headers: { Authorization: `Bearer ${user.token}` }
    });
    if (!response.ok) throw new Error('Failed to load file');
    const blob = await response.blob();
    previewUrl.value = URL.createObjectURL(blob);
  } catch (e: any) {
    Message.error('加载图片失败');
  }
}

function navigateToRoot() {
  breadcrumbs.value = [];
  currentFolderId.value = null;
  loadFiles();
}

function navigateTo(folderId: number | null, index: number) {
  breadcrumbs.value = breadcrumbs.value.slice(0, index + 1);
  currentFolderId.value = folderId;
  loadFiles();
}

function handleUploadSuccess() {
  Message.success("文件上传成功");
  showUploadModal.value = false;
  loadFiles();
  loadStats();
}

function handleUploadError() {
  Message.error("上传失败，请重试");
}

function showContextMenu(e: MouseEvent, item: FileItem) {
    // Optional: Implement custom context menu if desired, 
    // for now using the dropdown action button is sufficient for mobile/touch friendly.
}

// --- Icons & Formatters ---

function getFileIcon(item: FileItem) {
  if (item.type === 'folder') return IconFolder;
  const mime = item.mime_type || '';
  const name = item.name.toLowerCase();
  
  if (name.endsWith('.ppt') || name.endsWith('.pptx')) return IconFile;
  if (name.endsWith('.doc') || name.endsWith('.docx')) return IconFile;
  if (name.endsWith('.xls') || name.endsWith('.xlsx')) return IconFile;
  if (mime.startsWith('image/')) return IconImage;
  if (mime.startsWith('audio/')) return IconFileAudio;
  if (mime.startsWith('video/')) return IconFileVideo;
  if (mime === 'application/pdf') return IconFilePdf;
  if (mime.includes('zip') || mime.includes('rar') || mime.includes('tar')) return IconFile;
  if (mime.includes('text') || mime.includes('json') || mime.includes('javascript')) return IconCode;
  return IconFile;
}

function getFileIconClass(item: FileItem) {
  if (item.type === 'folder') return 'icon-folder';
  const mime = item.mime_type || '';
  const name = item.name.toLowerCase();
  
  if (name.endsWith('.ppt') || name.endsWith('.pptx')) return 'icon-ppt';
  if (name.endsWith('.doc') || name.endsWith('.docx')) return 'icon-word';
  if (name.endsWith('.xls') || name.endsWith('.xlsx') || name.endsWith('.csv')) return 'icon-excel';
  
  if (mime.startsWith('image/')) return 'icon-image';
  if (mime.startsWith('audio/')) return 'icon-audio';
  if (mime.startsWith('video/')) return 'icon-video';
  if (mime === 'application/pdf') return 'icon-pdf';
  if (mime.includes('zip') || mime.includes('rar')) return 'icon-zip';
  return 'icon-file';
}

function formatSize(bytes?: number): string {
  if (bytes === undefined || bytes === null) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  let i = 0;
  while (bytes >= 1024 && i < units.length - 1) {
    bytes /= 1024;
    i++;
  }
  return `${bytes.toFixed(1)} ${units[i]}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN', {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
  });
}

onMounted(() => {
    loadFiles();
    loadStats();
});
</script>

<style scoped>
  /* Dark Mode Adaptation */
  .file-page {
    /* Default Light Mode Variables */
    --color-bg-glass: rgba(255, 255, 255, 0.85);
    --color-border-glass: rgba(255, 255, 255, 0.6);
    --shadow-lg: 0 10px 40px rgba(0, 0, 0, 0.08);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.05);
    --grid-card-bg: rgba(255,255,255,0.6);
    --grid-card-hover-bg: #fff;
    --upload-dropzone-bg: var(--color-fill-1);
    --upload-dropzone-hover-bg: var(--color-fill-2);
    
    --primary-gradient: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    --transition-smooth: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
    
    height: 100vh;
    display: flex;
    flex-direction: column;
    padding: 24px;
    gap: 24px;
    position: relative;
    overflow: hidden;
    color: var(--color-text-1);
  }

  /* Dark Theme Overrides */
  :root[arco-theme='dark'] .file-page,
  body[arco-theme='dark'] .file-page {
    --color-bg-glass: rgba(23, 23, 26, 0.8);
    --color-border-glass: rgba(255, 255, 255, 0.08);
    --shadow-lg: 0 10px 40px rgba(0, 0, 0, 0.2);
    --shadow-md: 0 4px 12px rgba(0, 0, 0, 0.2);
    --grid-card-bg: rgba(255, 255, 255, 0.05);
    --grid-card-hover-bg: rgba(255, 255, 255, 0.1);
  }

  .cosmic-bg {
    position: fixed;
    top: 0; left: 0; width: 100%; height: 100%;
    z-index: -1;
    background: radial-gradient(circle at 0% 0%, rgba(102, 126, 234, 0.05), transparent 40%),
                radial-gradient(circle at 100% 100%, rgba(118, 75, 162, 0.05), transparent 40%);
  }
  
  :root[arco-theme='dark'] .cosmic-bg,
  body[arco-theme='dark'] .cosmic-bg {
    background: radial-gradient(circle at 0% 0%, rgba(102, 126, 234, 0.15), transparent 40%),
                radial-gradient(circle at 100% 100%, rgba(118, 75, 162, 0.15), transparent 40%);
  }

/* Glass Panel Utility */
.glass-panel {
    background: var(--color-bg-glass);
    backdrop-filter: blur(20px);
    -webkit-backdrop-filter: blur(20px);
    border: 1px solid var(--color-border-glass);
    border-radius: 16px;
    box-shadow: var(--shadow-md);
}

/* Header */
.page-header {
    padding: 20px 32px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
}

.title-text {
    font-size: 24px;
    font-weight: 800;
    background: var(--primary-gradient);
    background-clip: text;
    -webkit-background-clip: text;
    color: transparent;
    margin-left: 12px;
}

.title-icon { font-size: 28px; }

.header-right {
    display: flex;
    align-items: center;
    gap: 16px;
}

.search-bar { width: 280px; }

.action-buttons {
    display: flex;
    gap: 12px;
}

.upload-btn {
    background: var(--primary-gradient);
    border: none;
    box-shadow: 0 4px 12px rgba(118, 75, 162, 0.3);
}

.upload-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgb(236, 23, 201);
}

.create-btn {
    background: linear-gradient(45deg, #fac4f5, #e2a4ffcc);
    border: none;
    box-shadow: 0 4px 12px rgba(118, 75, 162, 0.3);
}

.create-btn:hover {
    transform: translateY(-1px);
    box-shadow: 0 6px 16px rgb(236, 23, 201);
}

/* Stats Row */
.stats-row {
    display: flex;
    gap: 24px;
    flex-shrink: 0;
}

.stat-card {
    flex: 1;
    padding: 20px;
    display: flex;
    align-items: center;
    gap: 20px;
    transition: var(--transition-smooth);
}

.stat-card:hover { transform: translateY(-4px); box-shadow: var(--shadow-lg); }

.stat-icon-wrapper {
    width: 56px; height: 56px; border-radius: 16px;
    display: flex; align-items: center; justify-content: center;
    font-size: 28px; color: white;
    box-shadow: 0 8px 16px rgba(0,0,0,0.1);
}

.bg-blue { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.bg-orange { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
.bg-green { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); }

.stat-value { font-size: 24px; font-weight: 700; color: var(--color-text-1); line-height: 1.2; }
.stat-label { color: var(--color-text-3); font-size: 13px; margin-top: 4px; }

/* Content Wrapper */
.content-wrapper {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden; /* Contains the scrollable area */
}

.toolbar {
    padding: 16px 24px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-bottom: 1px solid rgba(0,0,0,0.06);
    flex-shrink: 0;
}

.breadcrumb-container {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 15px;
}

.nav-root-btn { color: var(--color-text-2); padding: 0 8px; }
.nav-root-btn:hover { color: rgb(var(--primary-6)); background: transparent; }
.breadcrumb-separator { color: var(--color-text-4); margin: 0 4px; }
.custom-breadcrumb .breadcrumb-link { cursor: pointer; color: var(--color-text-2); transition: color 0.2s; }
.custom-breadcrumb .breadcrumb-link:hover { color: rgb(var(--primary-6)); font-weight: 500; }

.view-toggles { display: flex; align-items: center; gap: 12px; }
.divider-v { width: 1px; height: 16px; background: var(--color-border); }

/* File View Area */
.file-view-area {
    flex: 1;
    overflow-y: auto;
    padding: 20px;
    position: relative;
    /* Custom scrollbar */
    scrollbar-width: thin;
}

/* Grid View */
.grid-layout {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
    gap: 20px;
}

.grid-card {
    background: var(--grid-card-bg);
    border-radius: 12px;
    aspect-ratio: 1;
    display: flex;
    flex-direction: column;
    padding: 12px;
    position: relative;
    cursor: pointer;
    transition: var(--transition-smooth);
    border: 1px solid transparent;
}

.grid-card:hover {
    background: var(--grid-card-hover-bg);
    box-shadow: 0 8px 20px rgba(0,0,0,0.06);
    transform: translateY(-4px);
}

.card-inner {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 12px;
}

.grid-icon-lg {
    width: 60px; height: 60px;
    display: flex; align-items: center; justify-content: center;
    font-size: 32px;
    border-radius: 14px;
    transition: transform 0.3s;
}

.grid-card:hover .grid-icon-lg { transform: scale(1.1); }

.grid-text { text-align: center; width: 100%; }
.grid-title { 
    font-size: 14px; font-weight: 500; 
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis; 
    margin-bottom: 4px; 
    color: var(--color-text-1);
}
.grid-subtitle { font-size: 12px; color: var(--color-text-3); }

.card-actions {
    position: absolute; top: 8px; right: 8px;
    opacity: 0; transition: opacity 0.2s;
}
.grid-card:hover .card-actions { opacity: 1; }
.grid-card.is-dragover {
    background: rgba(var(--primary-6), 0.1) !important;
    border: 2px dashed rgb(var(--primary-6)) !important;
    transform: scale(1.05);
}
.more-options-btn { background: var(--color-bg-2); backdrop-filter: blur(4px); }

/* List View */
.arco-table-tr.is-dragover {
    background-color: rgba(var(--primary-6), 0.05) !important;
}
.arco-table-tr.is-dragover td {
    border-top: 1px solid rgb(var(--primary-6));
    border-bottom: 1px solid rgb(var(--primary-6));
}
.file-name-cell { display: flex; align-items: center; gap: 12px; }
.file-icon-sm { 
    width: 36px; height: 36px; border-radius: 8px; 
    display: flex; align-items: center; justify-content: center; 
    font-size: 20px; 
}
.file-name-text { font-weight: 500; font-size: 14px; }
.meta-text { color: var(--color-text-3); font-size: 13px; }

/* Icon Colors */
.icon-folder { background: linear-gradient(135deg, #ffd194 0%, #d4fc79 100%); color: #f39c12; }
.icon-file { background: linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%); color: #fff; }
.icon-image { background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%); color: #fff; }
.icon-video { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #fff; }
.icon-code  { background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); color: #fff; }
.icon-zip { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); color: #fff; }
.icon-word { background: linear-gradient(135deg, #0044ff 0%, #206eff 100%); color: #fff; }
.icon-excel { background: linear-gradient(135deg, #66ff00 0%, #38ef7d 100%); color: #fff; }
.icon-ppt { background: linear-gradient(135deg, #ff512f 0%, #dd2476 100%); color: #fff; }

/* Upload Modal */
.upload-dropzone {
    border: 2px dashed var(--color-border);
    border-radius: 12px;
    padding: 40px;
    text-align: center;
    transition: all 0.3s;
    background: var(--upload-dropzone-bg);
    cursor: pointer;
}
.upload-dropzone:hover {
    border-color: rgb(var(--primary-6));
    background: var(--upload-dropzone-hover-bg);
}
.upload-icon-circle {
    width: 64px; height: 64px; border-radius: 50%;
    background: rgba(var(--primary-6), 0.1);
    color: rgb(var(--primary-6));
    font-size: 32px; display: flex; align-items: center; justify-content: center;
    margin: 0 auto 16px;
}

.empty-state {
    display: flex; flex-direction: column; align-items: center;
    padding: 60px 0; color: var(--color-text-3);
}
.empty-icon-box { font-size: 64px; margin-bottom: 16px; opacity: 0.5; }

/* Form */
.form-item { display: flex; flex-direction: column; gap: 8px; padding-top: 12px; }
.form-item label { font-weight: 500; font-size: 14px; }

/* Animations */
.fade-scale-enter-active, .fade-scale-leave-active { transition: all 0.3s ease; }
.fade-scale-enter-from, .fade-scale-leave-to { opacity: 0; transform: scale(0.95); }
.danger-item { color: rgb(var(--danger-6)); }

/* Preview Modal */
.preview-container {
    min-height: 400px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: var(--color-fill-2);
    border-radius: 12px;
    overflow: hidden;
}

/* 预览弹窗：让内容区有稳定高度，避免 PPTX 容器高度塌陷导致“空白” */
.preview-modal :deep(.arco-modal-body) {
    height: 82vh;
    overflow: hidden;
}
.preview-modal .preview-container {
    height: 100%;
}
.preview-image-wrapper {
    width: 100%;
    height: 100%;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 20px;
    position: relative;
    min-height: 400px;
}

.image-view-container {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    max-height: 65vh;
}

.preview-image {
    max-width: 100%;
    max-height: 65vh;
    object-fit: contain;
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
    cursor: grab;
}

.preview-image:active {
    cursor: grabbing;
}

/* 图片导航按钮 */
.image-nav-btn {
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    z-index: 10;
    background: rgba(0, 0, 0, 0.5) !important;
    border: none !important;
    color: white !important;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    opacity: 0.7;
    transition: all 0.3s;
}

.image-nav-btn:hover {
    opacity: 1;
    background: rgba(0, 0, 0, 0.7) !important;
    transform: translateY(-50%) scale(1.1);
}

.prev-btn {
    left: 20px;
}

.next-btn {
    right: 20px;
}

/* 图片控制工具栏 */
.image-controls {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 16px;
    background: rgba(0, 0, 0, 0.6);
    backdrop-filter: blur(10px);
    border-radius: 24px;
    z-index: 10;
}

.controls-group {
    display: flex;
    align-items: center;
    gap: 8px;
}

.image-controls .arco-btn {
    background: rgba(255, 255, 255, 0.1) !important;
    border: none !important;
    color: white !important;
}

.image-controls .arco-btn:hover:not(:disabled) {
    background: rgba(255, 255, 255, 0.2) !important;
}

.image-controls .arco-btn:disabled {
    opacity: 0.4;
}

.scale-value {
    color: white;
    font-size: 12px;
    min-width: 40px;
    text-align: center;
    font-weight: 500;
}

.controls-divider {
    width: 1px;
    height: 20px;
    background: rgba(255, 255, 255, 0.2);
}

.image-counter {
    color: rgba(255, 255, 255, 0.8);
    font-size: 13px;
    padding-left: 8px;
    border-left: 1px solid rgba(255, 255, 255, 0.2);
    margin-left: 4px;
}

.preview-video-wrapper {
    width: 100%;
    padding: 20px;
}

.preview-video {
    width: 100%;
    max-height: 70vh;
    border-radius: 8px;
    background: #000;
}

.preview-audio-wrapper {
    width: 100%;
    padding: 40px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 24px;
}

.audio-visual {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
}

.audio-icon-circle {
    width: 120px;
    height: 120px;
    border-radius: 50%;
    background: var(--primary-gradient);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 48px;
    color: white;
    box-shadow: 0 12px 32px rgba(102, 126, 234, 0.4);
    animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
    0%, 100% { transform: scale(1); }
    50% { transform: scale(1.05); }
}

.audio-title {
    font-size: 18px;
    font-weight: 600;
    color: var(--color-text-1);
    max-width: 100%;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    text-align: center;
}

.preview-audio {
    width: 100%;
    max-width: 500px;
}

.preview-pdf-wrapper {
    width: 100%;
    height: 70vh;
}

.preview-pdf {
    width: 100%;
    height: 100%;
    border: none;
}

.preview-text-wrapper {
    width: 100%;
    max-height: 70vh;
    overflow: auto;
    padding: 20px;
}

.preview-code {
    margin: 0;
    padding: 20px;
    background: var(--color-bg-1);
    border-radius: 8px;
    font-family: 'Fira Code', 'Cascadia Code', Consolas, monospace;
    font-size: 13px;
    line-height: 1.6;
    color: var(--color-text-1);
    overflow-x: auto;
    white-space: pre-wrap;
    word-wrap: break-word;
}

.preview-unsupported {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    padding: 60px 20px;
    text-align: center;
    gap: 16px;
}

.unsupported-icon {
    width: 80px;
    height: 80px;
    border-radius: 20px;
    background: var(--color-fill-3);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 40px;
    color: var(--color-text-3);
}

.preview-unsupported h3 {
    font-size: 18px;
    color: var(--color-text-1);
    margin: 0;
}

.preview-unsupported p {
    color: var(--color-text-3);
    font-size: 14px;
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}

.preview-toolbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 16px 0 0;
    margin-top: 16px;
    border-top: 1px solid var(--color-border);
}

.preview-info {
    display: flex;
    align-items: center;
    gap: 8px;
    color: var(--color-text-3);
    font-size: 13px;
}

.info-divider {
    opacity: 0.5;
}

/* Word Preview (docx-preview) */
.preview-word-wrapper {
    width: 100%;
    max-height: 75vh;
    overflow-y: auto;
    background: #ffffff; /* 经典的文档预览器底色 */
    padding: 24px;
    display: flex;
    justify-content: center;
}

.docx-render-container {
    width: 100%;
    display: flex;
    flex-direction: column;
    align-items: center;
}

/* 覆盖 docx-preview 的默认样式以符合 A4 分页效果 */
:deep(.docx-preview-wrap) {
    background: #ffffff !important;
    padding: 0 !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
}

:deep(.docx-preview-wrap > section.docx) {
    background: rgb(255, 255, 255) !important; /* 强制纸张为白色 */
    color: #000 !important; /* 强制文字颜色为黑色，防止被暗号模式影响 */
    box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3) !important;
    margin-bottom: 24px !important;
    padding: 1.5cm 2cm !important; /* 标准 Word 页边距 */
    box-sizing: border-box !important;
    border-radius: 2px;
}

/* 针对文档内的表格和元素进行修正 */
:deep(.docx-preview-wrap section.docx *) {
    border-color: #ccc !important;
}

/* 响应式调整 */
@media (max-width: 900px) {
    :deep(.docx-preview-wrap > section.docx) {
        width: 100% !important;
        padding: 1cm !important;
    }
}

/* Excel Preview */
.preview-excel-wrapper {
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px;
}

.excel-tabs {
    flex-shrink: 0;
}

.excel-table-container {
    flex: 1;
    overflow: auto;
    max-height: 60vh;
    background: #fff;
    border-radius: 8px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.excel-table {
    width: max-content;
    min-width: 100%;
    border-collapse: collapse;
    font-size: 13px;
}

.excel-table td {
    border: 1px solid #e5e5e5;
    padding: 8px 12px;
    white-space: nowrap;
    min-width: 80px;
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
}

.excel-table .header-cell {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    font-weight: 600;
    position: sticky;
    top: 0;
    z-index: 1;
}

.excel-table tr:nth-child(even) td:not(.header-cell) {
    background: rgba(0, 0, 0, 0.02);
}

.excel-table tr:hover td:not(.header-cell) {
    background: rgba(102, 126, 234, 0.08);
}

/* PPTX Preview */
.preview-pptx-wrapper {
    width: 100%;
    height: 80vh; /* 增加高度 */
    background: #f0f2f5; /* 调整背景色 */
    /* overflow: hidden;
    display: flex;
    flex-direction: column;
    position: relative; */
}

.pptx-viewer {
    width: 100%;
    height: 100%;
    overflow: auto; /* 允许内部滚动 */
}

.pptx-loading-placeholder {
    width: 100%;
    height: 100%;
}

:deep(.vue-office-pptx-slide) {
    margin-bottom: 20px !important;
    box-shadow: 0 4px 12px rgba(0,0,0,0.1) !important;
}

/* Responsive */
@media (max-width: 768px) {
    .page-header { flex-direction: column; align-items: flex-start; gap: 16px; }
    .header-right { width: 100%; flex-direction: column; align-items: stretch; }
    .search-bar { width: 100%; }
    .stats-row { overflow-x: auto; padding-bottom: 8px; }
    .stat-card { min-width: 200px; }
    
    .preview-container {
        min-height: 300px;
    }
    
    .preview-image, .preview-video {
        max-height: 50vh;
    }
    
    .preview-pdf-wrapper {
        height: 50vh;
    }
    
    .audio-icon-circle {
        width: 80px;
        height: 80px;
        font-size: 32px;
    }
    
    .word-content {
        padding: 20px;
    }
    
    .excel-table-container {
        max-height: 50vh;
    }
    
    .ppt-icon {
        width: 80px;
        height: 80px;
    }
}
</style>
