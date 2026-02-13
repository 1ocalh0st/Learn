<template>
  <div class="home-container" ref="containerRef">
    <!-- Hero Section: 现在是充满活力的全屏沉浸式设计 -->
    <div class="hero-section" :style="{ transform: `translateY(${scrollY * 0.4}px)` }">
      <div class="hero-content" :style="{ transform: `translateY(${-scrollY * 0.15}px)`, opacity: 1 - scrollY / 600 }">
        <div class="hero-tag reveal-item">New Version 1.2.0</div>
        <h1 class="hero-title">
          <span class="gradient-text">自动化测试平台</span>
        </h1>
        <p class="hero-subtitle">Engineering Excellence in Testing</p>
        <p class="hero-desc">
          为现代软件开发流程定制的全方位质量保障解决方案。
          <br>覆盖 API、UI、性能及环境监控，赋能团队实现极致交付。
        </p>
        <div class="hero-actions">
          <a-button type="primary" size="large" class="hero-btn primary-btn" @click="navigateTo('/test/projects')">
            <template #icon><icon-apps /></template>
            进入控制台
          </a-button>
          <a-button size="large" class="hero-btn secondary-btn" @click="scrollToDashboard">
            数据概览
          </a-button>
        </div>
      </div>
      
      <!-- 装饰元素 -->
      <div class="scroll-indicator" @click="scrollToDashboard" :style="{ opacity: 1 - scrollY / 200 }">
        <div class="mouse">
          <div class="wheel"></div>
        </div>
        <div class="arrows">
          <span></span><span></span><span></span>
        </div>
      </div>

      <div class="hero-bg-shape shape-1"></div>
      <div class="hero-bg-shape shape-2"></div>
      <div class="hero-grid"></div>
    </div>

    <!-- Dashboard Content: 现在以更高程度的重叠和更精致的布局呈现 -->
    <div class="dashboard-content" id="dashboard-start">
      
      <!-- 运行概览 Section -->
      <div class="section-container reveal-item">
        <div class="section-header">
          <div class="section-title-wrapper">
            <span class="section-accent"></span>
            <h2>运行概览</h2>
          </div>
          <p>实时监控系统状态，掌握每一秒的测试动态</p>
        </div>

        <a-row :gutter="24" class="stats-row">
          <a-col :span="6">
            <div class="stat-card glass-card no-pointer">
              <div class="stat-icon-wrapper blue">
                <icon-clock-circle />
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ formatDuration(onlineSeconds) }}</div>
                <div class="stat-label">本次在线时长</div>
                <a-progress :percent="Math.min((onlineSeconds / 28800), 1)" :show-text="false" size="mini" color="#165dff" />
              </div>
            </div>
          </a-col>
          <a-col :span="6">
            <div class="stat-card glass-card" @click="navigateTo('/test/projects')">
              <div class="stat-icon-wrapper purple">
                <icon-layers />
              </div>
              <div class="stat-info">
                <div class="stat-value">测试项目</div>
                <div class="stat-label">Project Management</div>
                <div class="stat-desc">{{ dashboardStats.projectCount }} 个活跃项目</div>
              </div>
            </div>
          </a-col>
          <a-col :span="6">
            <div class="stat-card glass-card" @click="navigateTo('/test/reports')">
              <div class="stat-icon-wrapper cyan">
                <icon-file />
              </div>
              <div class="stat-info">
                <div class="stat-value">测试报告</div>
                <div class="stat-label">Report Analysis</div>
                <div class="stat-desc">累计生成 {{ dashboardStats.reportCount }} 份</div>
              </div>
            </div>
          </a-col>
          <a-col :span="6">
            <div class="stat-card glass-card" @click="navigateTo('/monitor')">
              <div class="stat-icon-wrapper red">
                <icon-dashboard />
              </div>
              <div class="stat-info">
                <div class="stat-value">生产监控</div>
                <div class="stat-label">Real-time Alert</div>
                <div class="stat-desc">系统运行状态：良好</div>
              </div>
            </div>
          </a-col>
        </a-row>
      </div>

      <!-- 核心功能 Section -->
      <div class="section-container reveal-item delay-200">
        <div class="section-header">
          <div class="section-title-wrapper">
            <span class="section-accent"></span>
            <h2>核心功能</h2>
          </div>
          <p>集成化的自动化测试工具链，助力敏捷开发</p>
        </div>

        <div class="feature-grid">
          <div class="feature-card" @click="navigateTo('/test/projects')">
            <div class="card-bg"></div>
            <div class="card-content">
              <div class="card-icon"><icon-bug /></div>
              <h3>测试管理</h3>
              <p>端到端的测试生命周期管理，支持版本追踪与用例复用。</p>
              <div class="card-arrow"><icon-arrow-right /></div>
            </div>
          </div>
          <div class="feature-card" @click="navigateTo('/test/reports')">
            <div class="card-bg"></div>
            <div class="card-content">
              <div class="card-icon"><icon-thunderbolt /></div>
              <h3>自动化执行</h3>
              <p>分布式执行引擎，支持 Jenkins/GitLab CI 集成。</p>
              <div class="card-arrow"><icon-arrow-right /></div>
            </div>
          </div>
          <div class="feature-card" @click="navigateTo('/files')">
            <div class="card-bg"></div>
            <div class="card-content">
              <div class="card-icon"><icon-folder /></div>
              <h3>资源管理</h3>
              <p>管理测试套件所需的 DataDrive、模拟配置及多媒体资源。</p>
              <div class="card-arrow"><icon-arrow-right /></div>
            </div>
          </div>
          <div class="feature-card ai-card">
            <div class="card-bg"></div>
            <div class="card-content">
              <div class="card-icon"><icon-robot /></div>
              <h3>AI 智能体</h3>
              <p>AI 驱动的断言建议与自动化回放修复 (Preview)</p>
              <div class="card-tag">COMING SOON</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useUserStore } from "@/stores/user";
import {
  IconClockCircle,
  IconApps,
  IconFile,
  IconDashboard,
  IconFolder,
  IconThunderbolt,
  IconBug,
  IconRobot,
  IconLayers,
  IconArrowRight,
} from "@arco-design/web-vue/es/icon";
import { request } from "@/utils/request";

const router = useRouter();
const user = useUserStore();
const scrollY = ref(0);
let scrollContainer: HTMLElement | null = null;

const dashboardStats = ref({
  projectCount: 0,
  reportCount: 0
});

async function fetchDashboardStats() {
  try {
    const [projectsRes, reportsRes] = await Promise.all([
      request<{ data: any[] }>("/api/test/projects"),
      request<{ total: number }>("/api/reports?pageSize=1")
    ]);
    dashboardStats.value.projectCount = projectsRes.data?.length || 0;
    dashboardStats.value.reportCount = reportsRes.total || 0;
  } catch (e) {
    console.error("Failed to fetch dashboard stats", e);
  }
}

// Optimization: RAF throttle for scroll
let ticking = false;

const handleScroll = (e: Event) => {
  if (!ticking) {
    window.requestAnimationFrame(() => {
      const target = e.target as HTMLElement;
      scrollY.value = target.scrollTop;
      ticking = false;
    });
    ticking = true;
  }
};

const scrollToDashboard = () => {
  const el = document.getElementById('dashboard-start');
  if (el && scrollContainer) {
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
};

// Optimization: Use IntersectionObserver instead of scroll listener for reveals
let observer: IntersectionObserver | null = null;

const setupObserver = () => {
  const options = {
    root: scrollContainer,
    rootMargin: '0px',
    threshold: 0.1
  };

  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('active');
        observer?.unobserve(entry.target);
      }
    });
  }, options);

  document.querySelectorAll('.reveal-item').forEach(el => observer?.observe(el));
};

// 在线时长逻辑 (同之前)
const onlineSeconds = ref(0);
const loginTimestamp = ref(Date.now());
let timer: ReturnType<typeof setInterval> | null = null;

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  if (hours > 0) return `${hours}时 ${mins}分`;
  if (mins > 0) return `${mins}分 ${secs}秒`;
  return `${secs}秒`;
}

function startOnlineTimer() {
  const savedLoginTime = sessionStorage.getItem('loginTimestamp');
  if (savedLoginTime) {
    let ts = parseInt(savedLoginTime);
    if (Date.now() - ts > 86400000) ts = Date.now();
    loginTimestamp.value = ts;
    onlineSeconds.value = Math.floor((Date.now() - loginTimestamp.value) / 1000);
  } else {
    loginTimestamp.value = Date.now();
    sessionStorage.setItem('loginTimestamp', String(loginTimestamp.value));
  }
  timer = setInterval(() => {
    onlineSeconds.value = Math.floor((Date.now() - loginTimestamp.value) / 1000);
  }, 1000);
}

function navigateTo(path: string) {
  router.push(path);
}

onMounted(() => {
  setTimeout(() => {
    scrollContainer = document.querySelector('.app-content');
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', handleScroll);
      scrollY.value = scrollContainer.scrollTop;
      setupObserver();
    }
  }, 100);
  
  if (user.token) {
    startOnlineTimer();
    fetchDashboardStats();
  }
});

onUnmounted(() => {
  if (scrollContainer) scrollContainer.removeEventListener('scroll', handleScroll);
  if (timer) clearInterval(timer);
  if (observer) observer.disconnect();
});
</script>

<style scoped>
.home-container {
  min-height: 180vh;
  font-family: var(--font-sans);
  margin: -24px;
  width: calc(100% + 48px);
  overflow-x: hidden;
  position: relative;
}

/* Hero Section: 升级为沉浸式全屏 */
.hero-section {
  position: relative;
  height: calc(100vh - 64px); /* 撑满首屏 */
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  background: var(--color-bg-1);
  overflow: hidden;
}

.hero-content {
  position: relative;
  z-index: 10;
  max-width: 900px;
  padding: 0 40px;
}

.hero-tag {
  display: inline-block;
  padding: 6px 16px;
  background: rgba(var(--primary-6), 0.1);
  color: #165dff;
  border-radius: 20px;
  font-family: var(--font-mono);
  font-weight: 600;
  margin-bottom: 24px;
  border: 1px solid rgba(22, 93, 255, 0.2);
}

.hero-title {
  font-family: var(--font-heading);
  font-size: 5rem; /* 更大的字号，占据视觉中心 */
  font-weight: 800;
  line-height: 1.1;
  margin-bottom: 16px;
  letter-spacing: -2px;
}

.gradient-text {
  background: linear-gradient(135deg, #165dff 0%, #722ed1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.hero-subtitle {
  font-family: var(--font-heading);
  font-size: 1.75rem;
  color: var(--color-text-2);
  margin-bottom: 24px;
  font-weight: 300;
  letter-spacing: 2px;
  text-transform: uppercase;
  opacity: 0.8;
}

.hero-desc {
  font-size: 1.15rem;
  color: var(--color-text-3);
  margin-bottom: 40px;
  line-height: 1.8;
  max-width: 600px;
  margin-left: auto;
  margin-right: auto;
}

.hero-actions {
  display: flex;
  gap: 24px;
  justify-content: center;
}

.hero-btn {
  height: 56px;
  padding: 0 48px;
  border-radius: 28px;
  font-size: 18px;
  font-weight: 600;
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
}

.primary-btn {
  background: linear-gradient(90deg, #165dff 0%, #722ed1 100%);
  border: none;
  box-shadow: 0 10px 25px rgba(22, 93, 255, 0.3);
}

.primary-btn:hover {
  transform: translateY(-5px) scale(1.05);
  box-shadow: 0 15px 35px rgba(22, 93, 255, 0.4);
}

/* 滚动指示器 */
.scroll-indicator {
  position: absolute;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  z-index: 10;
  transition: opacity 0.3s;
}

.mouse {
  width: 26px;
  height: 42px;
  border: 2px solid var(--color-text-4);
  border-radius: 15px;
  position: relative;
}

.wheel {
  width: 4px;
  height: 8px;
  background: #165dff;
  border-radius: 2px;
  position: absolute;
  top: 8px;
  left: 50%;
  transform: translateX(-50%);
  animation: scroll-wheel 2s infinite;
}

.arrows span {
  display: block;
  width: 10px;
  height: 10px;
  border-bottom: 2px solid var(--color-text-4);
  border-right: 2px solid var(--color-text-4);
  transform: rotate(45deg);
  margin: -5px;
  animation: scroll-arrow 2s infinite;
}

@keyframes scroll-wheel {
  0% { opacity: 1; transform: translateX(-50%) translateY(0); }
  100% { opacity: 0; transform: translateX(-50%) translateY(15px); }
}

@keyframes scroll-arrow {
  0% { opacity: 0; transform: rotate(45deg) translate(-10px, -10px); }
  50% { opacity: 1; }
  100% { opacity: 0; transform: rotate(45deg) translate(10px, 10px); }
}

/* Background Decorations (同前 but more refined) */
.hero-bg-shape { position: absolute; border-radius: 50%; filter: blur(100px); z-index: 0; opacity: 0.3; }
.shape-1 { width: 600px; height: 600px; background: #165dff; top: -150px; left: -150px; animation: float 15s infinite ease-in-out; }
.shape-2 { width: 500px; height: 500px; background: #722ed1; bottom: 50px; right: -100px; animation: float 18s infinite ease-in-out reverse; }
.hero-grid { position: absolute; inset: 0; background-image: radial-gradient(#165dff15 1px, transparent 1px); background-size: 40px 40px; opacity: 0.5; z-index: 0; mask-image: radial-gradient(circle at center, black 0%, transparent 80%); }

/* Dashboard Content: 玻璃拟态融合层 */
.dashboard-content {
  position: relative;
  z-index: 20;
  background: rgba(var(--color-bg-2-rgb), 0.8);
  backdrop-filter: blur(20px);
  padding: 100px 60px;
  border-top-left-radius: 60px;
  border-top-right-radius: 60px;
  margin-top: -120px; /* 大幅度重叠实现融合 */
  box-shadow: 0 -30px 60px rgba(0, 0, 0, 0.1);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.section-container {
  max-width: 1400px;
  margin: 0 auto 80px;
}

.section-header {
  margin-bottom: 48px;
  text-align: left;
}

.section-title-wrapper {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.section-accent {
  width: 4px;
  height: 24px;
  background: linear-gradient(to bottom, #165dff, #722ed1);
  border-radius: 2px;
}

.section-header h2 { font-size: 2.25rem; font-weight: 700; color: var(--color-text-1); margin: 0; }
.section-header p { font-size: 1.1rem; color: var(--color-text-3); }

/* Stats & Features (同前 fine-tuned) */
.stat-card {
  background: var(--color-bg-1);
  border-radius: 24px;
  padding: 32px;
  display: flex;
  align-items: center;
  gap: 24px;
  border: 1px solid var(--color-border-1);
  transition: all 0.3s ease;
  height: 100%;
  cursor: pointer;
}

.stat-card.no-pointer {
  cursor: default !important;
}

.stat-card:not(.no-pointer):hover {
  transform: translateY(-8px);
  border-color: #165dff66;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.05);
}

.stat-value { font-family: var(--font-heading); font-size: 24px; font-weight: 700; }

.feature-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: 32px;
}

.feature-card {
  background: var(--color-bg-1);
  border-radius: 24px;
  padding: 40px;
  border: 1px solid var(--color-border-1);
  transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1);
  position: relative;
  overflow: hidden;
  height: 280px;
  cursor: pointer;
}

.feature-card:hover { transform: translateY(-12px); border-color: #165dff88; }

.card-icon {
  width: 64px;
  height: 64px;
  background: var(--color-fill-2);
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  color: #165dff;
  margin-bottom: 24px;
  transition: all 0.3s;
}

.feature-card:hover .card-icon { background: #165dff; color: white; }

.feature-card h3 { font-size: 1.5rem; margin-bottom: 12px; }
.feature-card p { color: var(--color-text-3); font-size: 1rem; line-height: 1.6; }

.ai-card {
  background: linear-gradient(135deg, rgba(22, 93, 255, 0.05) 0%, rgba(114, 46, 209, 0.05) 100%);
  border: 2px dashed rgba(22, 93, 255, 0.3);
}

/* Animations */
.reveal-item { opacity: 0; transform: translateY(40px); transition: all 1s cubic-bezier(0.2, 1, 0.3, 1); }
.reveal-item.active { opacity: 1; transform: translateY(0); }

@keyframes float {
  0%, 100% { transform: translate(0, 0); }
  50% { transform: translate(20px, -30px); }
}

@media (max-width: 768px) {
  .hero-title { font-size: 3rem; }
  .dashboard-content { padding: 60px 24px; }
}
</style>