<template>
  <div class="page-container">
    <!-- 页头 -->
    <a-page-header :title="`${project?.name || '测试用例'}`" @back="router.push('/test/projects')">
      <template #extra>
        <a-space>
          <a-button @click="$router.push('/test/reports')">
            <template #icon><icon-file /></template>
            查看报告
          </a-button>
          <a-button type="primary" @click="openCreateCase">
            <template #icon><icon-plus /></template>
            新建用例
          </a-button>
        </a-space>
      </template>
    </a-page-header>

    <!-- 筛选栏 -->
    <a-card class="filter-card">
      <a-space>
        <a-select v-model="filterType" placeholder="用例类型" allow-clear style="width: 150px">
          <a-option value="api">API测试</a-option>
          <a-option value="ui">UI测试</a-option>
          <a-option value="load">压力测试</a-option>
        </a-select>
        <a-button @click="loadTestCases">
          <template #icon><icon-refresh /></template>
          刷新
        </a-button>
      </a-space>
    </a-card>

    <!-- 用例列表 -->
    <a-table
      :data="testCases"
      :pagination="false"
      :loading="loading"
      class="cases-table"
    >
      <template #columns>
        <a-table-column title="用例名称" data-index="name" />
        <a-table-column title="类型" data-index="type" :width="120">
          <template #cell="{ record }">
            <a-tag v-if="record.type === 'api'" color="blue">API测试</a-tag>
            <a-tag v-else-if="record.type === 'ui'" color="green">UI测试</a-tag>
            <a-tag v-else-if="record.type === 'load'" color="orange">压力测试</a-tag>
          </template>
        </a-table-column>
        <a-table-column title="AI生成" data-index="ai_generated" :width="100">
          <template #cell="{ record }">
            <a-tag v-if="record.ai_generated" color="purple">AI</a-tag>
            <span v-else>-</span>
          </template>
        </a-table-column>
        <a-table-column title="创建时间" data-index="created_at" :width="180">
          <template #cell="{ record }">
            {{ formatDate(record.created_at) }}
          </template>
        </a-table-column>
        <a-table-column title="操作" :width="250">
          <template #cell="{ record }">
            <a-space>
              <a-button
                type="primary"
                size="small"
                :loading="executingId === record.id"
                @click="executeTest(record.id)"
              >
                <template #icon><icon-play-arrow /></template>
                执行
              </a-button>
              <a-button size="small" @click="editCase(record)">
                <template #icon><icon-edit /></template>
              </a-button>
              <a-button size="small" status="danger" @click="deleteCase(record.id)">
                <template #icon><icon-delete /></template>
              </a-button>
            </a-space>
          </template>
        </a-table-column>
      </template>
    </a-table>

    <!-- ===================== 用例编辑器弹窗 ===================== -->
    <a-modal
      v-model:visible="showCaseEditor"
      :title="editingCase ? '编辑用例' : '新建用例'"
      width="900px"
      @ok="handleSaveCase"
      @cancel="handleCancelEdit"
    >
      <a-form :model="caseForm" layout="vertical">
        <a-form-item label="用例名称" required>
          <a-input v-model="caseForm.name" placeholder="请输入用例名称" />
        </a-form-item>

        <a-form-item label="测试类型" required>
          <a-radio-group v-model="caseForm.type">
            <a-radio value="api">API测试</a-radio>
            <a-radio value="ui">UI测试</a-radio>
            <a-radio value="load">压力测试</a-radio>
          </a-radio-group>
        </a-form-item>

        <!-- ========== API测试配置 ========== -->
        <div v-if="caseForm.type === 'api'" class="config-section">
          <a-divider>请求配置</a-divider>

          <a-row :gutter="16">
            <a-col :span="6">
              <a-form-item label="请求方法">
                <a-select v-model="caseForm.config.method">
                  <a-option value="GET">GET</a-option>
                  <a-option value="POST">POST</a-option>
                  <a-option value="PUT">PUT</a-option>
                  <a-option value="DELETE">DELETE</a-option>
                  <a-option value="PATCH">PATCH</a-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="18">
              <a-form-item label="请求URL" required>
                <a-input v-model="caseForm.config.url" placeholder="https://api.example.com/endpoint" />
              </a-form-item>
            </a-col>
          </a-row>

          <a-form-item label="超时时间(ms)">
            <a-input-number v-model="caseForm.config.timeout" :min="1000" :max="120000" :step="1000" style="width: 200px" />
          </a-form-item>

          <!-- 鉴权配置 -->
          <a-divider>鉴权 (Auth)</a-divider>

          <a-form-item label="鉴权方式">
            <a-select v-model="apiAuthType" placeholder="选择鉴权方式" style="width: 240px">
              <a-option value="none">无鉴权 (None)</a-option>
              <a-option value="bearer">Bearer Token</a-option>
              <a-option value="basic">Basic Auth</a-option>
              <a-option value="apikey">API Key</a-option>
            </a-select>
          </a-form-item>

          <div v-if="apiAuthType === 'bearer'">
            <a-form-item label="Token">
              <a-input v-model="apiAuthConfig.token" placeholder="输入 Bearer Token" allow-clear />
            </a-form-item>
          </div>

          <div v-if="apiAuthType === 'basic'">
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="用户名">
                  <a-input v-model="apiAuthConfig.username" placeholder="用户名" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="密码">
                  <a-input-password v-model="apiAuthConfig.password" placeholder="密码" />
                </a-form-item>
              </a-col>
            </a-row>
          </div>

          <div v-if="apiAuthType === 'apikey'">
            <a-row :gutter="16">
              <a-col :span="6">
                <a-form-item label="添加到">
                  <a-select v-model="apiAuthConfig.apiKeyIn">
                    <a-option value="header">Header</a-option>
                    <a-option value="query">Query Param</a-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="9">
                <a-form-item label="Key 名称">
                  <a-input v-model="apiAuthConfig.apiKeyName" placeholder="如: X-API-Key" />
                </a-form-item>
              </a-col>
              <a-col :span="9">
                <a-form-item label="Key 值">
                  <a-input v-model="apiAuthConfig.apiKeyValue" placeholder="API Key值" />
                </a-form-item>
              </a-col>
            </a-row>
          </div>

          <!-- 自动生成的请求头 -->
          <a-divider>Headers</a-divider>

          <div class="auto-headers-section">
            <div class="auto-headers-label">
              <span class="auto-badge">自动生成</span>
              <a-link @click="showAutoHeaders = !showAutoHeaders" style="font-size: 12px">
                {{ showAutoHeaders ? '隐藏' : '显示' }}自动生成的
              </a-link>
            </div>

            <div v-if="showAutoHeaders" class="auto-headers-list">
              <div v-for="h in computedAutoHeaders" :key="h.key" class="auto-header-row">
                <a-tag color="arcoblue" size="small">自动</a-tag>
                <span class="auto-header-key">{{ h.key }}</span>
                <span class="auto-header-value">{{ h.value }}</span>
              </div>
            </div>
          </div>

          <!-- 自定义请求头 -->
          <div style="margin-top: 12px">
            <div v-for="(header, index) in apiHeaders" :key="index" class="kv-row">
              <a-input v-model="header.key" placeholder="Header Name" class="kv-input" />
              <a-input v-model="header.value" placeholder="Value" class="kv-input" />
              <a-button size="small" status="danger" @click="apiHeaders.splice(index, 1)">
                <template #icon><icon-minus /></template>
              </a-button>
            </div>
            <a-button size="small" type="dashed" long @click="apiHeaders.push({ key: '', value: '' })">
              <template #icon><icon-plus /></template> 添加自定义请求头
            </a-button>
          </div>

          <!-- 查询参数 -->
          <a-divider>查询参数 (Params)</a-divider>
          <div v-for="(param, index) in apiQueryParams" :key="index" class="kv-row">
            <a-input v-model="param.key" placeholder="参数名" class="kv-input" />
            <a-input v-model="param.value" placeholder="参数值" class="kv-input" />
            <a-button size="small" status="danger" @click="apiQueryParams.splice(index, 1)">
              <template #icon><icon-minus /></template>
            </a-button>
          </div>
          <a-button size="small" type="dashed" long @click="apiQueryParams.push({ key: '', value: '' })">
            <template #icon><icon-plus /></template> 添加查询参数
          </a-button>

          <!-- 请求体 -->
          <a-form-item label="请求体 (JSON)" v-if="['POST', 'PUT', 'PATCH'].includes(caseForm.config.method || '')" style="margin-top: 16px">
            <a-textarea v-model="caseForm.config.bodyText" placeholder='{"key": "value"}' :auto-size="{ minRows: 3, maxRows: 8 }" />
          </a-form-item>

          <a-divider>断言配置</a-divider>

          <!-- 断言列表 -->
          <div v-for="(assertion, index) in apiAssertions" :key="index" class="assertion-row">
            <a-row :gutter="8" align="center">
              <a-col :span="5">
                <a-select v-model="assertion.type" placeholder="断言类型">
                  <a-option value="status">状态码</a-option>
                  <a-option value="json">JSON路径</a-option>
                  <a-option value="contains">包含文本</a-option>
                  <a-option value="notContains">不包含文本</a-option>
                  <a-option value="header">响应头</a-option>
                  <a-option value="responseTime">响应时间(ms)</a-option>
                  <a-option value="regex">正则匹配</a-option>
                  <a-option value="notEmpty">非空检查</a-option>
                  <a-option value="type">类型检查</a-option>
                </a-select>
              </a-col>
              <a-col :span="5" v-if="['json', 'notEmpty', 'type', 'greaterThan', 'lessThan', 'length'].includes(assertion.type)">
                <a-input v-model="assertion.path" placeholder="JSON路径 (如: data.name)" />
              </a-col>
              <a-col :span="5" v-if="assertion.type === 'header'">
                <a-input v-model="assertion.header" placeholder="Header名称" />
              </a-col>
              <a-col :span="4" v-if="['json', 'header'].includes(assertion.type)">
                <a-select v-model="assertion.operator" placeholder="操作符">
                  <a-option value="equals">等于</a-option>
                  <a-option value="notEquals">不等于</a-option>
                  <a-option value="contains">包含</a-option>
                  <a-option value="exists">存在</a-option>
                </a-select>
              </a-col>
              <a-col :flex="1" v-if="assertion.type !== 'notEmpty' && !(assertion.operator === 'exists')">
                <a-input v-model="assertion.expected" :placeholder="getAssertionPlaceholder(assertion.type)" />
              </a-col>
              <a-col :span="2">
                <a-button size="small" status="danger" @click="apiAssertions.splice(index, 1)">
                  <template #icon><icon-minus /></template>
                </a-button>
              </a-col>
            </a-row>
          </div>
          <a-button size="small" type="dashed" long @click="addApiAssertion" style="margin-top: 8px">
            <template #icon><icon-plus /></template> 添加断言
          </a-button>
        </div>

        <!-- ========== UI测试配置 ========== -->
        <div v-if="caseForm.type === 'ui'" class="config-section">
          <a-divider>基础配置</a-divider>

          <a-form-item label="测试URL" required>
            <a-input v-model="caseForm.config.url" placeholder="https://example.com" />
          </a-form-item>

          <a-row :gutter="16">
            <a-col :span="8">
              <a-form-item label="测试模式">
                <a-select v-model="caseForm.config.mode">
                  <a-option value="auto">自动 (优先浏览器)</a-option>
                  <a-option value="browser">浏览器模式</a-option>
                  <a-option value="http">HTTP模式 (轻量)</a-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="视窗宽度">
                <a-input-number v-model="caseForm.config.viewportWidth" :min="320" :max="3840" />
              </a-form-item>
            </a-col>
            <a-col :span="8">
              <a-form-item label="视窗高度">
                <a-input-number v-model="caseForm.config.viewportHeight" :min="240" :max="2160" />
              </a-form-item>
            </a-col>
          </a-row>

          <a-divider>测试步骤</a-divider>

          <div v-for="(step, index) in uiSteps" :key="index" class="step-row">
            <div class="step-number">{{ index + 1 }}</div>
            <div class="step-content">
              <a-row :gutter="8" align="center">
                <a-col :span="5">
                  <a-select v-model="step.action" placeholder="操作类型" @change="onStepActionChange(step)">
                    <a-option-group label="交互操作">
                      <a-option value="click">点击元素</a-option>
                      <a-option value="dblclick">双击元素</a-option>
                      <a-option value="fill">输入文本 (fill)</a-option>
                      <a-option value="type">逐字打字 (type)</a-option>
                      <a-option value="select">下拉选择</a-option>
                      <a-option value="check">勾选</a-option>
                      <a-option value="uncheck">取消勾选</a-option>
                      <a-option value="hover">悬停</a-option>
                      <a-option value="focus">聚焦</a-option>
                      <a-option value="keyboard">按键</a-option>
                      <a-option value="scroll">滚动页面</a-option>
                      <a-option value="scrollToElement">滚动到元素</a-option>
                      <a-option value="upload">上传文件</a-option>
                    </a-option-group>
                    <a-option-group label="等待操作">
                      <a-option value="wait">等待(ms)</a-option>
                      <a-option value="waitForSelector">等待元素出现</a-option>
                      <a-option value="waitForNavigation">等待页面跳转</a-option>
                    </a-option-group>
                    <a-option-group label="断言操作">
                      <a-option value="assertText">断言文本</a-option>
                      <a-option value="assertVisible">断言元素可见</a-option>
                      <a-option value="assertNotExists">断言元素不存在</a-option>
                      <a-option value="assertUrl">断言URL</a-option>
                      <a-option value="assertTitle">断言标题</a-option>
                      <a-option value="assertCount">断言元素数量</a-option>
                      <a-option value="assertAttribute">断言属性</a-option>
                    </a-option-group>
                    <a-option-group label="其他">
                      <a-option value="screenshot">截图</a-option>
                      <a-option value="evaluate">执行JS脚本</a-option>
                    </a-option-group>
                  </a-select>
                </a-col>

                <!-- 选择器输入 -->
                <a-col :span="6" v-if="stepNeedsSelector(step.action)">
                  <a-input v-model="step.selector" placeholder="定位器 (如 #btn, text=登录, placeholder=用户名)" />
                </a-col>

                <!-- 值/期望值输入 -->
                <a-col :flex="1" v-if="stepNeedsValue(step.action)">
                  <a-input v-model="step.value" :placeholder="getStepValuePlaceholder(step.action)" />
                </a-col>

                <!-- 期望值输入（断言类） -->
                <a-col :flex="1" v-if="stepNeedsExpected(step.action)">
                  <a-input v-model="step.expected" :placeholder="getStepExpectedPlaceholder(step.action)" />
                </a-col>

                <!-- 等待时长 -->
                <a-col :span="4" v-if="step.action === 'wait'">
                  <a-input-number v-model="step.duration" :min="100" :max="30000" placeholder="毫秒" />
                </a-col>

                <!-- 按键 -->
                <a-col :span="4" v-if="step.action === 'keyboard'">
                  <a-input v-model="step.key" placeholder="按键 (如 Enter)" />
                </a-col>

                <!-- 属性名 -->
                <a-col :span="4" v-if="step.action === 'assertAttribute'">
                  <a-input v-model="step.attribute" placeholder="属性名" />
                </a-col>

                <!-- 描述 -->
                <a-col :span="4">
                  <a-input v-model="step.description" placeholder="步骤描述(可选)" />
                </a-col>

                <a-col :span="2">
                  <a-space>
                    <a-button size="mini" @click="moveStep(index, -1)" :disabled="index === 0">
                      <template #icon><icon-up /></template>
                    </a-button>
                    <a-button size="mini" @click="moveStep(index, 1)" :disabled="index === uiSteps.length - 1">
                      <template #icon><icon-down /></template>
                    </a-button>
                    <a-button size="mini" status="danger" @click="uiSteps.splice(index, 1)">
                      <template #icon><icon-minus /></template>
                    </a-button>
                  </a-space>
                </a-col>
              </a-row>
            </div>
          </div>
          <a-button size="small" type="dashed" long @click="addUiStep" style="margin-top: 8px">
            <template #icon><icon-plus /></template> 添加步骤
          </a-button>
        </div>

        <!-- ========== 压力测试配置 ========== -->
        <div v-if="caseForm.type === 'load'" class="config-section">
          <a-divider>目标配置</a-divider>

          <a-row :gutter="16">
            <a-col :span="6">
              <a-form-item label="请求方法">
                <a-select v-model="caseForm.config.method">
                  <a-option value="GET">GET</a-option>
                  <a-option value="POST">POST</a-option>
                  <a-option value="PUT">PUT</a-option>
                  <a-option value="DELETE">DELETE</a-option>
                </a-select>
              </a-form-item>
            </a-col>
            <a-col :span="18">
              <a-form-item label="目标URL" required>
                <a-input v-model="caseForm.config.target" placeholder="https://api.example.com/endpoint" />
              </a-form-item>
            </a-col>
          </a-row>

          <a-divider>负载配置</a-divider>

          <a-row :gutter="16">
            <a-col :span="6">
              <a-form-item label="持续时间(秒)">
                <a-input-number v-model="caseForm.config.duration" :min="1" :max="300" />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="每秒请求数(RPS)">
                <a-input-number v-model="caseForm.config.arrivalRate" :min="1" :max="200" />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="预热时间(秒)">
                <a-input-number v-model="caseForm.config.rampUpDuration" :min="0" :max="60" />
              </a-form-item>
            </a-col>
            <a-col :span="6">
              <a-form-item label="最大并发数">
                <a-input-number v-model="caseForm.config.maxConcurrent" :min="1" :max="500" />
              </a-form-item>
            </a-col>
          </a-row>

          <a-form-item label="单次请求超时(ms)">
            <a-input-number v-model="caseForm.config.timeout" :min="1000" :max="60000" :step="1000" style="width: 200px" />
          </a-form-item>

          <!-- 鉴权配置 -->
          <a-divider>鉴权 (Auth)</a-divider>
          <a-form-item label="鉴权方式">
            <a-select v-model="apiAuthType" placeholder="选择鉴权方式" style="width: 240px">
              <a-option value="none">无鉴权 (None)</a-option>
              <a-option value="bearer">Bearer Token</a-option>
              <a-option value="basic">Basic Auth</a-option>
              <a-option value="apikey">API Key</a-option>
            </a-select>
          </a-form-item>

          <div v-if="apiAuthType === 'bearer'">
            <a-form-item label="Token">
              <a-textarea v-model="apiAuthConfig.token" placeholder="Bearer Token" :auto-size="{ minRows: 2, maxRows: 6 }" />
            </a-form-item>
          </div>

          <div v-if="apiAuthType === 'basic'">
            <a-row :gutter="16">
              <a-col :span="12">
                <a-form-item label="用户名">
                  <a-input v-model="apiAuthConfig.username" placeholder="用户名" />
                </a-form-item>
              </a-col>
              <a-col :span="12">
                <a-form-item label="密码">
                  <a-input-password v-model="apiAuthConfig.password" placeholder="密码" />
                </a-form-item>
              </a-col>
            </a-row>
          </div>

          <div v-if="apiAuthType === 'apikey'">
            <a-row :gutter="16">
              <a-col :span="6">
                <a-form-item label="添加到">
                  <a-select v-model="apiAuthConfig.apiKeyIn">
                    <a-option value="header">Header</a-option>
                    <a-option value="query">Query Param</a-option>
                  </a-select>
                </a-form-item>
              </a-col>
              <a-col :span="9">
                <a-form-item label="Key 名称">
                  <a-input v-model="apiAuthConfig.apiKeyName" placeholder="如: X-API-Key" />
                </a-form-item>
              </a-col>
              <a-col :span="9">
                <a-form-item label="Key 值">
                  <a-input v-model="apiAuthConfig.apiKeyValue" placeholder="API Key值" />
                </a-form-item>
              </a-col>
            </a-row>
          </div>

          <!-- 自动生成的请求头 -->
          <a-divider>Headers</a-divider>

          <div class="auto-headers-section">
            <div class="auto-headers-label">
              <span class="auto-badge">自动生成</span>
              <a-link @click="showAutoHeaders = !showAutoHeaders" style="font-size: 12px">
                {{ showAutoHeaders ? '隐藏' : '显示' }}自动生成的
              </a-link>
            </div>

            <div v-if="showAutoHeaders" class="auto-headers-list">
              <div v-for="h in computedAutoHeaders" :key="h.key" class="auto-header-row">
                <a-tag color="arcoblue" size="small">自动</a-tag>
                <span class="auto-header-key">{{ h.key }}</span>
                <span class="auto-header-value">{{ h.value }}</span>
              </div>
            </div>
          </div>

          <!-- 自定义请求头 -->
          <div style="margin-top: 12px">
            <div v-for="(header, index) in loadHeaders" :key="index" class="kv-row">
              <a-input v-model="header.key" placeholder="Header Name" class="kv-input" />
              <a-input v-model="header.value" placeholder="Value" class="kv-input" />
              <a-button size="small" status="danger" @click="loadHeaders.splice(index, 1)">
                <template #icon><icon-minus /></template>
              </a-button>
            </div>
            <a-button size="small" type="dashed" long @click="loadHeaders.push({ key: '', value: '' })">
              <template #icon><icon-plus /></template> 添加自定义请求头
            </a-button>
          </div>

          <!-- 请求体 -->
          <a-form-item label="请求体 (JSON)" v-if="['POST', 'PUT', 'PATCH'].includes(caseForm.config.method || '')">
            <a-textarea v-model="caseForm.config.bodyText" placeholder='{"key": "value"}' :auto-size="{ minRows: 3, maxRows: 6 }" />
          </a-form-item>
        </div>
      </a-form>
    </a-modal>

    <!-- ===================== 执行结果弹窗 ===================== -->
    <a-modal
      v-model:visible="showExecutionResult"
      title="测试执行结果"
      :footer="false"
      width="850px"
    >
      <template v-if="executionResult">
        <!-- 顶部状态 -->
        <a-result
          :status="executionResult.status === 'passed' ? 'success' : 'error'"
        >
          <template #title>
             <div style="display: flex; align-items: center; justify-content: center; gap: 8px;">
               <icon-check-circle-fill v-if="executionResult.status === 'passed'" style="color: #00b42a" />
               <icon-close-circle-fill v-else style="color: #f53f3f" />
               {{ executionResult.status === 'passed' ? '测试通过' : '测试失败' }}
             </div>
          </template>
          <template #subtitle>
            执行时间: {{ formatDate(executionResult.executed_at) }}
          </template>
        </a-result>

        <a-divider />

        <!-- 基本信息 -->
        <a-descriptions :column="2" bordered size="small">
          <a-descriptions-item label="状态">
            <a-tag :color="executionResult.status === 'passed' ? 'green' : 'red'">
              {{ executionResult.status }}
            </a-tag>
          </a-descriptions-item>
          <a-descriptions-item label="耗时">
            {{ executionResult.duration || '-' }}ms
          </a-descriptions-item>
          <a-descriptions-item label="错误信息" :span="2" v-if="executionResult.error_message">
            <a-alert type="error" :title="executionResult.error_message" />
          </a-descriptions-item>
        </a-descriptions>

        <!-- 详细结果 -->
        <div v-if="parsedResult" class="result-detail">
          <a-divider>详细结果</a-divider>

          <!-- API测试结果 -->
          <div v-if="parsedResult.response">
            <a-descriptions :column="2" bordered size="small" style="margin-bottom: 16px">
              <a-descriptions-item label="HTTP状态码">
                <a-tag :color="parsedResult.response.status < 400 ? 'green' : 'red'">
                  {{ parsedResult.response.status }} {{ parsedResult.response.statusText || '' }}
                </a-tag>
              </a-descriptions-item>
              <a-descriptions-item label="响应大小" v-if="parsedResult.response.size">
                {{ parsedResult.response.size }} bytes
              </a-descriptions-item>
            </a-descriptions>

            <!-- 断言结果 -->
            <div v-if="parsedResult.assertions && parsedResult.assertions.length > 0" class="assertions-list">
              <h4>断言结果</h4>
              <div v-for="(a, i) in parsedResult.assertions" :key="i"
                   :class="['assertion-result', a.passed ? 'passed' : 'failed']">
                <span class="assertion-icon">
                  <icon-check-circle-fill v-if="a.passed" style="color: #00b42a" />
                  <icon-close-circle-fill v-else style="color: #f53f3f" />
                </span>
                <span class="assertion-type">{{ a.type }}</span>
                <span v-if="a.path" class="assertion-path">{{ a.path }}</span>
                <span class="assertion-msg">{{ (a.message || '').replace(/^\[(PASS|FAIL)\] /, '') }}</span>
              </div>
            </div>
          </div>

          <!-- UI测试结果 -->
          <div v-if="parsedResult.steps && !parsedResult.metrics">
            <div v-if="parsedResult.mode" style="margin-bottom: 12px">
              <a-tag color="blue">{{ parsedResult.mode === 'browser' ? '浏览器模式' : 'HTTP模式' }}</a-tag>
            </div>

            <div v-if="parsedResult.performance" style="margin-bottom: 12px">
              <a-descriptions :column="4" bordered size="small">
                <a-descriptions-item label="DOM就绪">
                  {{ parsedResult.performance.domContentLoaded }}ms
                </a-descriptions-item>
                <a-descriptions-item label="完全加载">
                  {{ parsedResult.performance.fullLoad }}ms
                </a-descriptions-item>
                <a-descriptions-item label="DOM交互">
                  {{ parsedResult.performance.domInteractive }}ms
                </a-descriptions-item>
                <a-descriptions-item label="首次绘制" v-if="parsedResult.performance.firstPaint">
                  {{ Math.round(parsedResult.performance.firstPaint) }}ms
                </a-descriptions-item>
              </a-descriptions>
            </div>

            <h4>步骤执行结果</h4>
            <div v-for="(s, i) in parsedResult.steps" :key="i"
                 :class="['step-result', s.success ? 'passed' : 'failed']">
              <span class="step-result-number">{{ Number(i) + 1 }}</span>
              <span class="step-result-icon">
                <icon-check-circle-fill v-if="s.success" style="color: #00b42a" />
                <icon-close-circle-fill v-else style="color: #f53f3f" />
              </span>
              <span class="step-result-action">{{ s.action }}</span>
              <span v-if="s.duration" class="step-result-duration">{{ s.duration }}ms</span>
              <span class="step-result-msg">{{ (s.message || '').replace(/^\[(PASS|FAIL)\] /, '') }}</span>
              <div v-if="s.detail?.screenshot" style="margin-top: 8px">
                <img :src="'data:image/png;base64,' + s.detail.screenshot" class="screenshot-img" style="max-width: 400px; display: block;" />
              </div>
            </div>

            <!-- 控制台日志 -->
            <div v-if="parsedResult.console && parsedResult.console.length > 0" style="margin-top: 16px">
              <a-collapse>
                <a-collapse-item header="控制台日志" key="console">
                  <div v-for="(log, i) in parsedResult.console" :key="i" class="console-log"
                       :class="log.type === 'error' ? 'error' : ''">
                    [{{ log.type }}] {{ log.text }}
                  </div>
                </a-collapse-item>
              </a-collapse>
            </div>

            <!-- 页面错误 -->
            <div v-if="parsedResult.errors && parsedResult.errors.length > 0" style="margin-top: 12px">
              <a-alert type="error" title="页面JS错误">
                <div v-for="(err, i) in parsedResult.errors" :key="i">{{ err.message }}</div>
              </a-alert>
            </div>

            <!-- 截图 -->
            <div v-if="parsedResult.screenshot" style="margin-top: 16px">
              <h4>页面截图</h4>
              <img :src="'data:image/png;base64,' + parsedResult.screenshot" class="screenshot-img" />
            </div>
          </div>

          <!-- 压力测试结果 -->
          <div v-if="parsedResult.metrics">
            <a-row :gutter="16" style="margin-bottom: 16px">
              <a-col :span="6">
                <a-statistic title="总请求数" :value="parsedResult.metrics.requests?.total || 0" />
              </a-col>
              <a-col :span="6">
                <a-statistic title="成功率" :value="parsedResult.metrics.requests?.successRate || '0%'"
                  :value-style="{ color: parseFloat(parsedResult.metrics.requests?.successRate) > 95 ? '#52c41a' : '#f5222d' }" />
              </a-col>
              <a-col :span="6">
                <a-statistic title="RPS" :value="parsedResult.metrics.throughput?.rps || 0" />
              </a-col>
              <a-col :span="6">
                <a-statistic title="峰值并发" :value="parsedResult.metrics.concurrency?.peak || 0" />
              </a-col>
            </a-row>

            <a-descriptions :column="4" bordered size="small" style="margin-bottom: 16px">
              <a-descriptions-item label="最小延迟">{{ parsedResult.metrics.latency?.min || 0 }}ms</a-descriptions-item>
              <a-descriptions-item label="平均延迟">{{ parsedResult.metrics.latency?.mean || 0 }}ms</a-descriptions-item>
              <a-descriptions-item label="P95">{{ parsedResult.metrics.latency?.p95 || 0 }}ms</a-descriptions-item>
              <a-descriptions-item label="最大延迟">{{ parsedResult.metrics.latency?.max || 0 }}ms</a-descriptions-item>
            </a-descriptions>

            <!-- 状态码分布 -->
            <div v-if="parsedResult.metrics.statusCodes" style="margin-bottom: 16px">
              <h4>状态码分布</h4>
              <a-space>
                <a-tag v-for="(count, code) in parsedResult.metrics.statusCodes" :key="code"
                       :color="String(code).startsWith('2') ? 'green' : String(code).startsWith('4') ? 'orange' : 'red'">
                  {{ code }}: {{ count }}
                </a-tag>
              </a-space>
            </div>

            <!-- 摘要 -->
            <div v-if="parsedResult.summary" class="load-summary">
              <pre>{{ parsedResult.summary }}</pre>
            </div>
          </div>
        </div>
      </template>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { Message, Modal } from '@arco-design/web-vue';
import { request } from '@/utils/request';
import {
  IconPlus,
  IconFile,
  IconRefresh,
  IconPlayArrow,
  IconEdit,
  IconDelete,
  IconMinus,
  IconUp,
  IconDown,
  IconCheckCircleFill,
  IconCloseCircleFill,
  IconClockCircle,
} from '@arco-design/web-vue/es/icon';

interface TestCase {
  id: number;
  project_id: number;
  name: string;
  type: 'api' | 'ui' | 'load';
  config: any;
  ai_generated: number;
  created_at: string;
}

interface Project {
  id: number;
  name: string;
}

interface KVPair {
  key: string;
  value: string;
}

interface Assertion {
  type: string;
  expected: string;
  path: string;
  header: string;
  operator: string;
}

interface UIStep {
  action: string;
  selector: string;
  value: string;
  expected: string;
  duration: number;
  key: string;
  attribute: string;
  description: string;
}

const route = useRoute();
const router = useRouter();
const projectId = Number(route.params.id);

const project = ref<Project | null>(null);
const testCases = ref<TestCase[]>([]);
const filterType = ref<string>('');
const loading = ref(false);
const showCaseEditor = ref(false);
const editingCase = ref<TestCase | null>(null);
const executingId = ref<number | null>(null);
const showExecutionResult = ref(false);
const executionResult = ref<any>(null);

// 表单
const caseForm = ref({
  name: '',
  type: 'api' as 'api' | 'ui' | 'load',
  config: getDefaultConfig('api'),
});

// API测试辅助数据
const apiHeaders = ref<KVPair[]>([]);
const apiQueryParams = ref<KVPair[]>([]);
const apiAssertions = ref<Assertion[]>([]);

// UI测试辅助数据
const uiSteps = ref<UIStep[]>([]);

// 压力测试辅助数据
const loadHeaders = ref<KVPair[]>([]);

// 鉴权配置
const apiAuthType = ref<string>('none');
const apiAuthConfig = ref({
  token: '',
  username: '',
  password: '',
  apiKeyIn: 'header',
  apiKeyName: '',
  apiKeyValue: '',
});
const showAutoHeaders = ref(false);

// 自动生成的请求头（类似Apifox）
const computedAutoHeaders = computed(() => {
  const method = caseForm.value.config.method || 'GET';
  const headers: { key: string; value: string }[] = [];

  // Auth相关
  if (apiAuthType.value === 'bearer' && apiAuthConfig.value.token) {
    headers.push({ key: 'Authorization', value: `Bearer ${apiAuthConfig.value.token.substring(0, 20)}...` });
  } else if (apiAuthType.value === 'basic') {
    headers.push({ key: 'Authorization', value: '<在发送请求时计算>' });
  } else if (apiAuthType.value === 'apikey' && apiAuthConfig.value.apiKeyIn === 'header') {
    headers.push({ key: apiAuthConfig.value.apiKeyName || 'X-API-Key', value: '<在发送请求时计算>' });
  }

  // Content-Type
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    headers.push({ key: 'Content-Type', value: 'application/json' });
  }

  headers.push({ key: 'Accept', value: '*/*' });
  headers.push({ key: 'User-Agent', value: 'TestPlatform/1.0.0' });
  headers.push({ key: 'Accept-Encoding', value: 'gzip, deflate, br' });
  headers.push({ key: 'Connection', value: 'keep-alive' });

  return headers;
});

// 解析执行结果
const parsedResult = computed(() => {
  if (!executionResult.value?.result) return null;
  return typeof executionResult.value.result === 'string'
    ? JSON.parse(executionResult.value.result)
    : executionResult.value.result;
});

function getDefaultConfig(type: string) {
  switch (type) {
    case 'api':
      return {
        url: '',
        method: 'GET',
        bodyText: '',
        timeout: 30000,
      };
    case 'ui':
      return {
        url: '',
        mode: 'auto',
        viewportWidth: 1280,
        viewportHeight: 720,
      };
    case 'load':
      return {
        target: '',
        method: 'GET',
        duration: 10,
        arrivalRate: 5,
        rampUpDuration: 0,
        maxConcurrent: 100,
        timeout: 10000,
        bodyText: '',
      };
    default:
      return {};
  }
}

function openCreateCase() {
  editingCase.value = null;
  caseForm.value = {
    name: '',
    type: 'api',
    config: getDefaultConfig('api'),
  };
  apiHeaders.value = [];
  apiQueryParams.value = [];
  apiAssertions.value = [];
  uiSteps.value = [];
  loadHeaders.value = [];
  apiAuthType.value = 'none';
  apiAuthConfig.value = { token: '', username: '', password: '', apiKeyIn: 'header', apiKeyName: '', apiKeyValue: '' };
  showCaseEditor.value = true;
}

// 加载项目信息
async function loadProject() {
  try {
    const projects = await request<{ data: Project[] }>('/api/test/projects');
    project.value = projects.data.find(p => p.id === projectId) || null;
  } catch (error: any) {
    Message.error('加载项目失败: ' + error.message);
  }
}

// 加载测试用例
async function loadTestCases() {
  loading.value = true;
  try {
    const params = new URLSearchParams({ projectId: String(projectId) });
    if (filterType.value) {
      params.append('type', filterType.value);
    }

    const res = await request<{ code: string; data: TestCase[] }>(
      `/api/test/cases?${params.toString()}`
    );
    if (res.code === 'OK') {
      testCases.value = res.data;
    }
  } catch (error: any) {
    Message.error('加载用例失败: ' + error.message);
  } finally {
    loading.value = false;
  }
}

// 执行测试
async function executeTest(caseId: number) {
  executingId.value = caseId;
  try {
    const res = await request<{ code: string; data: { executionId: number } }>(
      `/api/test/cases/${caseId}/execute`,
      { method: 'POST' }
    );

    Message.success('测试已开始执行');

    // 轮询获取结果
    setTimeout(() => fetchExecutionResult(res.data.executionId), 2000);
  } catch (error: any) {
    Message.error('执行失败: ' + error.message);
    executingId.value = null;
  }
}

// 获取执行结果
async function fetchExecutionResult(executionId: number) {
  try {
    // 先用列表接口轮询状态（轻量，不含截图）
    const res = await request<{ data: any[] }>(
      `/api/test/executions?testCaseId=${executingId.value}`
    );
    const result = res.data.find(e => e.id === executionId);

    if (result && result.status !== 'running') {
      // 执行完成后，获取完整详情（含截图）
      try {
        const detail = await request<{ data: any }>(`/api/test/executions/${executionId}`);
        executionResult.value = detail.data;
      } catch {
        // 降级：如果详情接口失败，用列表数据
        executionResult.value = result;
      }
      showExecutionResult.value = true;
      executingId.value = null;
    } else {
      // 继续轮询
      setTimeout(() => fetchExecutionResult(executionId), 2000);
    }
  } catch (error: any) {
    Message.error('获取结果失败: ' + error.message);
    executingId.value = null;
  }
}

// 编辑用例
function editCase(testCase: TestCase) {
  editingCase.value = testCase;
  const config = { ...testCase.config };

  caseForm.value = {
    name: testCase.name,
    type: testCase.type,
    config: { ...getDefaultConfig(testCase.type), ...config },
  };

  // 恢复辅助数据
  if (testCase.type === 'api' || testCase.type === 'load') {
    // 恢复鉴权配置 (API与压测共享)
    if (config.auth) {
      apiAuthType.value = config.auth.type || 'none';
      apiAuthConfig.value = {
        token: config.auth.token || '',
        username: config.auth.username || '',
        password: config.auth.password || '',
        apiKeyIn: config.auth.apiKeyIn || 'header',
        apiKeyName: config.auth.apiKeyName || '',
        apiKeyValue: config.auth.apiKeyValue || '',
      };
    } else {
      apiAuthType.value = 'none';
      apiAuthConfig.value = { token: '', username: '', password: '', apiKeyIn: 'header', apiKeyName: '', apiKeyValue: '' };
    }
    
    // 恢复自定义请求头（排除自动生成的）
    const autoKeys = ['Authorization', 'Content-Type', 'Accept', 'User-Agent', 'Accept-Encoding', 'Connection'];
    const userHeaders = config.headers
      ? Object.entries(config.headers)
          .filter(([key]) => !autoKeys.includes(key))
          .map(([key, value]) => ({ key, value: value as string }))
      : [];

    if (testCase.type === 'api') {
      apiHeaders.value = userHeaders;
      apiQueryParams.value = config.queryParams
        ? Object.entries(config.queryParams).map(([key, value]) => ({ key, value: value as string }))
        : [];
      apiAssertions.value = config.assertions || [];
    } else {
      // Load Test
      loadHeaders.value = userHeaders;
    }
  }

  if (config.body) {
      caseForm.value.config.bodyText = JSON.stringify(config.body, null, 2);
  }

  if (testCase.type === 'ui') {
    uiSteps.value = config.steps || [];
  }

  showCaseEditor.value = true;
}

// 删除用例
function deleteCase(id: number) {
  Modal.confirm({
    title: '确认删除',
    content: '确定要删除此测试用例吗？',
    onOk: async () => {
      try {
        await request(`/api/test/cases/${id}`, { method: 'DELETE' });
        Message.success('删除成功');
        await loadTestCases();
      } catch (error: any) {
        Message.error('删除失败: ' + error.message);
      }
    },
  });
}

// 保存用例
async function handleSaveCase() {
  if (!caseForm.value.name.trim()) {
    Message.warning('请输入用例名称');
    return;
  }

  // 构建配置
  const config: any = { ...caseForm.value.config };

  if (caseForm.value.type === 'api') {
    // 自动生成请求头
    const headers: Record<string, string> = {};

    // Content-Type
    if (['POST', 'PUT', 'PATCH'].includes(config.method)) {
      headers['Content-Type'] = 'application/json';
    }
    headers['Accept'] = '*/*';
    headers['User-Agent'] = 'TestPlatform/1.0.0';
    headers['Accept-Encoding'] = 'gzip, deflate, br';
    headers['Connection'] = 'keep-alive';

    // 鉴权 → 请求头
    if (apiAuthType.value === 'bearer' && apiAuthConfig.value.token) {
      headers['Authorization'] = `Bearer ${apiAuthConfig.value.token}`;
    } else if (apiAuthType.value === 'basic' && apiAuthConfig.value.username) {
      const encoded = btoa(`${apiAuthConfig.value.username}:${apiAuthConfig.value.password}`);
      headers['Authorization'] = `Basic ${encoded}`;
    } else if (apiAuthType.value === 'apikey' && apiAuthConfig.value.apiKeyIn === 'header' && apiAuthConfig.value.apiKeyName) {
      headers[apiAuthConfig.value.apiKeyName] = apiAuthConfig.value.apiKeyValue;
    }

    // 用户自定义请求头（覆盖自动的）
    apiHeaders.value.forEach(h => {
      if (h.key.trim()) headers[h.key.trim()] = h.value;
    });
    config.headers = headers;

    // 保存鉴权配置（用于回显编辑）
    config.auth = {
      type: apiAuthType.value,
      ...apiAuthConfig.value,
    };

    // 处理查询参数
    const queryParams: Record<string, string> = {};
    apiQueryParams.value.forEach(p => {
      if (p.key.trim()) queryParams[p.key.trim()] = p.value;
    });
    // API Key添加到query
    if (apiAuthType.value === 'apikey' && apiAuthConfig.value.apiKeyIn === 'query' && apiAuthConfig.value.apiKeyName) {
      queryParams[apiAuthConfig.value.apiKeyName] = apiAuthConfig.value.apiKeyValue;
    }
    if (Object.keys(queryParams).length > 0) config.queryParams = queryParams;

    // 处理请求体
    if (config.bodyText && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
      try {
        config.body = JSON.parse(config.bodyText);
      } catch {
        Message.error('API请求体JSON格式错误');
        return;
      }
    }
    delete config.bodyText;

    // 处理断言
    config.assertions = apiAssertions.value.filter(a => a.type);

  } else if (caseForm.value.type === 'ui') {
    config.steps = uiSteps.value.filter(s => s.action);

  } else if (caseForm.value.type === 'load') {
    // 保存鉴权配置
    config.auth = {
      type: apiAuthType.value,
      ...apiAuthConfig.value,
    };

    // 自动生成请求头（与API测试保持一致）
    const headers: Record<string, string> = {};
    
    // Auth Headers
    if (apiAuthType.value === 'bearer' && apiAuthConfig.value.token) {
      headers['Authorization'] = `Bearer ${apiAuthConfig.value.token}`;
    } else if (apiAuthType.value === 'basic' && (apiAuthConfig.value.username || apiAuthConfig.value.password)) {
      const basic = btoa(`${apiAuthConfig.value.username}:${apiAuthConfig.value.password}`);
      headers['Authorization'] = `Basic ${basic}`;
    } else if (apiAuthType.value === 'apikey' && apiAuthConfig.value.apiKeyIn === 'header' && apiAuthConfig.value.apiKeyName) {
      headers[apiAuthConfig.value.apiKeyName] = apiAuthConfig.value.apiKeyValue;
    }

    if (['POST', 'PUT', 'PATCH'].includes(config.method)) {
      headers['Content-Type'] = 'application/json';
    }
    headers['Accept'] = '*/*';
    headers['User-Agent'] = 'TestPlatform/1.0.0';
    headers['Accept-Encoding'] = 'gzip, deflate, br';
    headers['Connection'] = 'keep-alive';

    // 用户自定义请求头（覆盖自动的）
    loadHeaders.value.forEach(h => {
      if (h.key.trim()) headers[h.key.trim()] = h.value;
    });
    if (Object.keys(headers).length > 0) config.headers = headers;

    // 处理请求体
    if (config.bodyText && ['POST', 'PUT', 'PATCH'].includes(config.method)) {
      try {
        config.body = JSON.parse(config.bodyText);
      } catch {
        Message.error('压力测试请求体JSON格式错误');
        return;
      }
    }
    delete config.bodyText;
  }

  try {
    const payload = {
      projectId,
      name: caseForm.value.name,
      type: caseForm.value.type,
      config,
    };

    if (editingCase.value) {
      await request(`/api/test/cases/${editingCase.value.id}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
      });
      Message.success('更新成功');
    } else {
      await request('/api/test/cases', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      Message.success('创建成功');
    }

    showCaseEditor.value = false;
    await loadTestCases();
  } catch (error: any) {
    Message.error('保存失败: ' + error.message);
  }
}

// 取消编辑
function handleCancelEdit() {
  showCaseEditor.value = false;
  editingCase.value = null;
}

// === 辅助函数 ===

function addApiAssertion() {
  apiAssertions.value.push({
    type: 'status',
    expected: '200',
    path: '',
    header: '',
    operator: 'equals',
  });
}

function addUiStep() {
  uiSteps.value.push({
    action: 'waitForSelector',
    selector: '',
    value: '',
    expected: '',
    duration: 1000,
    key: '',
    attribute: '',
    description: '',
  });
}

function moveStep(index: number, direction: number) {
  const newIndex = index + direction;
  if (newIndex < 0 || newIndex >= uiSteps.value.length) return;
  const arr = uiSteps.value;
  const removed = arr.splice(index, 1);
  if (removed[0]) arr.splice(newIndex, 0, removed[0]);
}

function onStepActionChange(step: UIStep) {
  // 重置不相关的字段
  step.selector = '';
  step.value = '';
  step.expected = '';
  step.key = '';
  step.attribute = '';
}

function stepNeedsSelector(action: string): boolean {
  return [
    'click', 'dblclick', 'fill', 'type', 'select', 'hover', 'focus',
    'check', 'uncheck', 'upload', 'scrollToElement',
    'waitForSelector', 'assertText', 'assertVisible', 'assertNotExists',
    'assertCount', 'assertAttribute'
  ].includes(action);
}

function stepNeedsValue(action: string): boolean {
  return ['fill', 'type', 'select', 'upload'].includes(action);
}

function stepNeedsExpected(action: string): boolean {
  return ['assertText', 'assertUrl', 'assertTitle', 'assertCount', 'assertAttribute'].includes(action);
}

function getStepValuePlaceholder(action: string): string {
  switch (action) {
    case 'fill': case 'type': return '输入的文本';
    case 'select': return '选项值';
    case 'upload': return '文件路径 (如 C:/test.pdf)';
    default: return '值';
  }
}

function getStepExpectedPlaceholder(action: string): string {
  switch (action) {
    case 'assertText': return '期望包含的文本';
    case 'assertUrl': return '期望的URL';
    case 'assertTitle': return '期望的标题';
    case 'assertCount': return '期望的数量';
    case 'assertAttribute': return '期望的属性值';
    default: return '期望值';
  }
}

function getAssertionPlaceholder(type: string): string {
  switch (type) {
    case 'status': return '200';
    case 'json': return '期望值';
    case 'contains': return '包含的文本';
    case 'notContains': return '不包含的文本';
    case 'header': return 'Header期望值';
    case 'responseTime': return '最大响应时间(ms)';
    case 'regex': return '正则表达式';
    case 'type': return 'string/number/object/boolean';
    default: return '期望值';
  }
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('zh-CN');
}

onMounted(() => {
  loadProject();
  loadTestCases();
});
</script>

<style scoped>
.page-container {
  padding: 24px;
}

.filter-card {
  margin: 16px 0;
}

.cases-table {
  margin-top: 16px;
}

.config-section {
  margin-top: 8px;
}

/* KV行样式 */
.kv-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
  align-items: center;
}

.kv-input {
  flex: 1;
}

/* 断言行样式 */
.assertion-row {
  margin-bottom: 8px;
  padding: 8px 12px;
  background: var(--color-fill-1);
  border-radius: 6px;
}

/* UI步骤行样式 */
.step-row {
  display: flex;
  gap: 12px;
  margin-bottom: 10px;
  padding: 10px 12px;
  background: var(--color-fill-1);
  border-radius: 8px;
  align-items: flex-start;
}

.step-number {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #165dff, #722ed1);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  flex-shrink: 0;
  margin-top: 4px;
}

.step-content {
  flex: 1;
  min-width: 0;
}

/* 结果展示 */
.result-detail {
  margin-top: 16px;
}

.assertions-list h4,
.result-detail h4 {
  margin-bottom: 12px;
  color: var(--color-text-1);
  font-size: 14px;
}

.assertion-result,
.step-result {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  margin-bottom: 6px;
  border-radius: 6px;
  font-size: 13px;
  flex-wrap: wrap;
}

.assertion-result.passed,
.step-result.passed {
  background: rgba(82, 196, 26, 0.08);
  border-left: 3px solid #52c41a;
}

.assertion-result.failed,
.step-result.failed {
  background: rgba(245, 34, 45, 0.08);
  border-left: 3px solid #f5222d;
}

.assertion-icon,
.step-result-icon {
  font-size: 16px;
}

.assertion-type,
.step-result-action {
  font-weight: 600;
  color: var(--color-text-1);
}

.assertion-path {
  color: #722ed1;
  font-family: 'Courier New', Courier, monospace;
}

.assertion-msg,
.step-result-msg {
  color: var(--color-text-3);
  font-size: 12px;
}

.step-result-number {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--color-fill-3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: bold;
  flex-shrink: 0;
}

.step-result-duration {
  color: var(--color-text-3);
  font-size: 12px;
  background: var(--color-fill-2);
  padding: 1px 6px;
  border-radius: 4px;
}

.console-log {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  padding: 2px 0;
  color: var(--color-text-2);
}

.console-log.error {
  color: #f5222d;
}

.screenshot-img {
  max-width: 100%;
  border: 1px solid var(--color-border-2);
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.load-summary pre {
  background: var(--color-fill-1);
  padding: 16px;
  border-radius: 8px;
  font-family: 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.8;
  white-space: pre-wrap;
}

/* 自动生成请求头样式 */
.auto-headers-section {
  background: var(--color-fill-1);
  border-radius: 8px;
  padding: 12px 16px;
}

.auto-headers-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.auto-badge {
  font-size: 11px;
  color: var(--color-text-3);
  background: var(--color-fill-3);
  padding: 2px 8px;
  border-radius: 4px;
}

.auto-headers-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.auto-header-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 0;
  border-bottom: 1px solid var(--color-border-1);
  font-size: 13px;
}

.auto-header-row:last-child {
  border-bottom: none;
}

.auto-header-key {
  font-weight: 600;
  color: var(--color-text-1);
  min-width: 160px;
}

.auto-header-value {
  color: var(--color-text-3);
  font-family: 'Courier New', monospace;
  font-size: 12px;
}
</style>
