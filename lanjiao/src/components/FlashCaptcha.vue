<template>
  <div class="flash-captcha-container">
    <!-- 输入区域 -->
    <div class="input-wrapper" :class="{ 'is-valid': isValid, 'is-invalid': inputValue.length === 5 && !isValid }">
      <div class="input-glow"></div>
      <input
        v-model="inputValue"
        type="text"
        placeholder="验证码"
        maxlength="5"
        class="captcha-input"
        @input="handleInput"
        @keyup.enter="handleEnter"
      />
      <div class="input-status">
        <transition name="status-fade">
          <icon-check-circle-fill v-if="isValid" class="status-icon valid" />
          <icon-close-circle-fill v-else-if="inputValue.length === 5" class="status-icon invalid" />
        </transition>
      </div>
    </div>

    <!-- 验证码展示区域 -->
    <div class="captcha-display-wrapper" @click="refreshCaptcha" :class="{ refreshing: isRefreshing }">
      <!-- 装饰背景 -->
      <div class="captcha-bg-effects">
        <div class="bg-orb bg-orb-1"></div>
        <div class="bg-orb bg-orb-2"></div>
        <div class="bg-orb bg-orb-3"></div>
      </div>
      
      <!-- 扫描线动画 -->
      <div class="scan-line"></div>
      
      <!-- 数字显示区 -->
      <div class="captcha-display" ref="captchaRef">
        <div 
          v-for="(digit, index) in captchaDigits" 
          :key="index"
          class="digit-wrapper"
          :style="{ '--animation-delay': `${index * 80}ms` }"
        >
          <span 
            class="digit"
            :class="{ hidden: hiddenIndex === index }"
            :style="{ '--digit-color': digitColors[index], '--glow-color': glowColors[index] }"
          >
            {{ hiddenIndex === index ? '✦' : digit }}
          </span>
          <div class="digit-border" :style="{ '--border-color': digitColors[index] }"></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';
import {
  IconCheckCircleFill,
  IconCloseCircleFill,
} from '@arco-design/web-vue/es/icon';

const emit = defineEmits<{
  (e: 'valid', value: boolean): void;
  (e: 'enter'): void;
}>();

// 更丰富的渐变色调色板 - 霓虹色系
const colorPalette = [
  '#00f0ff', // 赛博蓝
  '#ff0055', // 霓虹红
  '#cc00ff', // 电光紫
  '#00ff9f', // 荧光绿
  '#ffd300', // 亮黄
];

// 对应的发光颜色
const glowPalette = [
  'rgba(0, 240, 255, 0.8)',
  'rgba(255, 0, 85, 0.8)',
  'rgba(204, 0, 255, 0.8)',
  'rgba(0, 255, 159, 0.8)',
  'rgba(255, 211, 0, 0.8)',
];

// 验证码相关状态
const captchaDigits = ref<string[]>([]);
const digitColors = ref<string[]>([]);
const glowColors = ref<string[]>([]);
const hiddenIndex = ref<number>(-1);
const inputValue = ref('');
const isRefreshing = ref(false);
let animationTimer: ReturnType<typeof setInterval> | null = null;
let currentFrame = 0;

// 生成随机5位数验证码
function generateCaptcha() {
  // 1. 定义字符池：数字 + 大写字母
  // 为了体验更好，可以去掉容易混淆的字符（如 0/O, 1/I）
  const charPool = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ'; 
  
  const digits: string[] = []; // 虽然叫 digits，但现在存的是字符
  const colors: string[] = [];
  const glows: string[] = [];
  
  for (let i = 0; i < 5; i++) {
    // 2. 从字符池中随机取一个下标
    const randomIndex = Math.floor(Math.random() * charPool.length);
    
    // 3. 取出字符推入数组
    const char = charPool[randomIndex];
    digits.push(char || 'A');

    const colorIndex = i % colorPalette.length;
    // 注意：这里用了 ?? 操作符，确保 undefined 时回退到默认颜色
    colors.push(colorPalette[colorIndex] ?? '#00f0ff');
    glows.push(glowPalette[colorIndex] ?? 'rgba(0, 240, 255, 0.8)');
  }
  
  captchaDigits.value = digits;
  digitColors.value = colors;
  glowColors.value = glows;
  inputValue.value = '';
  currentFrame = 0;
}

// 动画帧更新 - 按顺序隐藏数字
function updateFrame() {
  if (currentFrame < 5) {
    hiddenIndex.value = currentFrame;
  } else {
    hiddenIndex.value = -1;
  }
  
  currentFrame = (currentFrame + 1) % 5;
}

// 开始动画
function startAnimation() {
  if (animationTimer) {
    clearInterval(animationTimer);
  }
  
  animationTimer = setInterval(updateFrame, 100);
}

// 刷新验证码
function refreshCaptcha() {
  isRefreshing.value = true;
  setTimeout(() => {
    generateCaptcha();
    currentFrame = 0;
    isRefreshing.value = false;
  }, 300);
}

// 检查验证码是否正确
const isValid = computed(() => {
  if (inputValue.value.length !== 5) return false;
  return inputValue.value === captchaDigits.value.join('');
});

// 当验证状态变化时发出事件
watch(isValid, (newVal) => {
  emit('valid', newVal);
});

// 处理输入
function handleInput() {
  // 1. 允许输入数字 (0-9) 和 字母 (a-z, A-Z)
  // 2. 将小写字母自动转换为大写，方便后续比对
  inputValue.value = inputValue.value
    .replace(/[^0-9a-zA-Z]/g, '') // 过滤掉特殊字符、空格等
    .toUpperCase()                // 统一转大写
    .slice(0, 5);                 // 确保不超过5位（双重保险）
}

// 处理回车
function handleEnter() {
  emit('enter');
}

// 暴露验证方法给父组件
function validate(): boolean {
  return isValid.value;
}

function getValue(): string {
  return inputValue.value;
}

function getCorrectCode(): string {
  return captchaDigits.value.join('');
}

function clear() {
  inputValue.value = '';
}

defineExpose({
  validate,
  getValue,
  getCorrectCode,
  refresh: refreshCaptcha,
  clear,
});

onMounted(() => {
  generateCaptcha();//生成验证码
  startAnimation();//开始动画
});

onUnmounted(() => {
  if (animationTimer) {
    clearInterval(animationTimer);
    animationTimer = null;
  }
});
</script>

<style scoped>
/* 引入 Audiowide 字体 */
@import url('https://fonts.googleapis.com/css2?family=Audiowide&display=swap');

.flash-captcha-container {
  display: flex;
  flex-direction: row; /* 改为横向排列 */
  gap: 12px;
  width: 100%;
  max-width: 100%; /* 适应父容器 */
  align-items: stretch; /* 高度对齐 */
}

/* 验证码显示区域 */
.captcha-display-wrapper {
  flex: 0 0 160px; /* 固定宽度，右侧显示区 */
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  /* 玻璃拟态背景 - 稍微降低对比度，使其更耐看 */
  background: rgba(15, 23, 42, 0.8);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 8px; /* 统一圆角 8px */
  padding: 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 
    0 4px 12px rgba(0, 0, 0, 0.2),
    inset 0 0 0 1px rgba(255, 255, 255, 0.05);
  overflow: hidden;
  transition: all 0.3s ease;
  cursor: pointer; /* 点击刷新 */
}

.captcha-display-wrapper:hover {
  border-color: rgba(0, 240, 255, 0.3);
  box-shadow: 
    0 4px 16px rgba(0, 240, 255, 0.1),
    inset 0 0 0 1px rgba(255, 255, 255, 0.1);
  transform: translateY(-1px);
}

.captcha-display-wrapper.refreshing {
  animation: wrapperPulse 0.3s ease;
}

@keyframes wrapperPulse {
  0% { transform: scale(1); }
  50% { transform: scale(0.98); opacity: 0.8; }
  100% { transform: scale(1); }
}

/* 背景装饰效果 */
.captcha-bg-effects {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
}

.bg-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(30px);
  opacity: 0.3;
  animation: orbFloat 10s ease-in-out infinite;
  mix-blend-mode: screen;
}

.bg-orb-1 {
  width: 80px;
  height: 80px;
  background: #00f0ff;
  top: -20px;
  left: -20px;
  animation-delay: 0s;
}

.bg-orb-2 {
  width: 60px;
  height: 60px;
  background: #ff0055;
  bottom: -20px;
  right: 10%;
  animation-delay: -3s;
}

.bg-orb-3 {
  width: 40px;
  height: 40px;
  background: #cc00ff;
  top: 40%;
  right: -10px;
  animation-delay: -5s;
}

@keyframes orbFloat {
  0%, 100% {
    transform: translate(0, 0) scale(1);
    opacity: 0.3;
  }
  50% {
    transform: translate(10px, -10px) scale(1.2);
    opacity: 0.5;
  }
}

/* 扫描线效果 */
.scan-line {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 2px;
  background: linear-gradient(90deg, 
    transparent 0%,
    rgba(255, 255, 255, 0.8) 50%,
    transparent 100%
  );
  box-shadow: 0 0 5px rgba(255, 255, 255, 0.5);
  animation: scanMove 3s cubic-bezier(0.4, 0, 0.2, 1) infinite;
  opacity: 0.4;
  z-index: 2;
  pointer-events: none;
}

@keyframes scanMove {
  0% {
    top: -10%;
    opacity: 0;
  }
  10% {
    opacity: 0.6;
  }
  90% {
    opacity: 0.6;
  }
  100% {
    top: 110%;
    opacity: 0;
  }
}

/* 数字显示区域 */
.captcha-display {
  flex: 1;
  display: flex;
  justify-content: center;
  gap: 4px; /* 减小间距 */
  position: relative;
  z-index: 1;
}

.digit-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  position: relative;
  width: 28px; /* 缩小容器宽度 */
  height: 100%; /* 高度适应 */
  justify-content: center;
}

.digit {
  font-family: 'Audiowide', 'Orbitron', sans-serif;
  font-size: 26px; /* 缩小字体适应横向布局 */
  font-weight: 400;
  color: #fff;
  text-shadow: 
    0 0 5px var(--glow-color),
    0 0 10px var(--glow-color);
  transition: all 0.2s ease;
  min-width: 24px;
  text-align: center;
  user-select: none;
  -webkit-user-select: none;
  position: relative;
  z-index: 2;
  letter-spacing: 0;
}

.digit::after {
  content: attr(data-text); /* 故障效果可以用，这里暂时不用 */
}

.digit.hidden {
  opacity: 0.4;
  color: rgba(255, 255, 255, 0.3);
  text-shadow: none;
  transform: scale(0.9);
  filter: blur(2px);
}

/* 数字下方边框装饰 */
.digit-border {
  position: absolute;
  bottom: 6px;
  width: 16px;
  height: 2px;
  background: var(--border-color);
  box-shadow: 0 0 5px var(--border-color);
  opacity: 0.5;
  transition: all 0.3s ease;
}

.digit-wrapper:hover .digit-border {
  width: 100%;
  opacity: 1;
}

.digit-wrapper:hover .digit {
  transform: scale(1.1) translateY(-2px);
}

/* 输入区域 */
.input-wrapper {
  flex: 1; /* 占据剩余空间 */
  position: relative;
  border-radius: 8px; /* 统一圆角 8px */
  overflow: hidden;
  background: #fff;
  box-shadow: none; /* 移除外阴影，更像普通输入框 */
  border: 1px solid var(--color-border-2); /* 使用标准边框颜色，如果没有变量需要适配 */
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  height: 44px; /* 设置统一高度 */
}

/* 适配 Arco Design 的输入框样式模拟 */
:deep(.arco-input-wrapper) {
  border-color: var(--color-border-2);
}

.input-wrapper:hover {
  border-color: rgb(var(--primary-6));
}

.input-glow {
  position: absolute;
  inset: -1px;
  background: linear-gradient(135deg, #00f0ff, #ff0055, #ffd300);
  border-radius: 9px;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 0;
  filter: blur(4px);
}

.input-wrapper:focus-within .input-glow {
  opacity: 0.3;
}

.input-wrapper.is-valid .input-glow {
  background: linear-gradient(135deg, #00ff9f, #00f0ff);
  opacity: 0.5;
}

.input-wrapper.is-invalid .input-glow {
  background: linear-gradient(135deg, #ff0055, #cc00ff);
  opacity: 0.5;
}

@keyframes glowPulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.6; }
}

.captcha-input {
  width: 100%;
  height: 100%;
  padding: 0 36px 0 12px; /* 调整内边距 */
  font-family: 'Audiowide', monospace;
  font-size: 16px; /* 更常规的字号 */
  letter-spacing: 4px; /* 减小字间距 */
  text-indent: 4px;
  text-align: left; /* 改为左对齐，符合一般输入习惯，或者居中也可以，看风格 */
  color: #1f2937;
  background: transparent;
  border: none;
  outline: none;
  transition: all 0.3s ease;
  position: relative;
  z-index: 1;
}

.captcha-input::placeholder {
  color: #86909c; /* Arco placeholder gray */
  letter-spacing: 1px;
  text-indent: 0;
  font-size: 14px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.captcha-input:focus {
  background: transparent;
}

.input-wrapper.is-valid .captcha-input {
  color: #059669;
}

.input-wrapper.is-invalid .captcha-input {
  color: #e11d48;
  animation: inputShake 0.4s ease;
}

@keyframes inputShake {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-4px); }
  40% { transform: translateX(4px); }
  60% { transform: translateX(-2px); }
  80% { transform: translateX(2px); }
}

.input-status {
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  z-index: 2;
  display: flex;
  align-items: center;
}

.status-icon {
  font-size: 20px;
}

.status-icon.valid {
  color: #10b981;
}

.status-icon.invalid {
  color: #f43f5e;
}

/* 状态切换动画 */
.status-fade-enter-active,
.status-fade-leave-active {
  transition: all 0.2s ease;
}

.status-fade-enter-from,
.status-fade-leave-to {
  opacity: 0;
  transform: scale(0.5);
}
</style>
