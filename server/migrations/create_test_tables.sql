-- 创建测试项目表
CREATE TABLE IF NOT EXISTS test_projects (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL COMMENT '项目名称',
  description TEXT COMMENT '项目描述',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='测试项目表';

-- 创建测试用例表
CREATE TABLE IF NOT EXISTS test_cases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT NOT NULL COMMENT '关联项目ID',
  name VARCHAR(255) NOT NULL COMMENT '用例名称',
  type ENUM('api', 'ui', 'load') NOT NULL COMMENT '测试类型',
  config JSON NOT NULL COMMENT '测试配置(JSON格式存储请求参数、断言等)',
  ai_generated TINYINT(1) DEFAULT 0 COMMENT '是否AI生成',
  status ENUM('active', 'archived') DEFAULT 'active' COMMENT '状态',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_project_id (project_id),
  INDEX idx_type (type),
  INDEX idx_status (status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='测试用例表';

-- 创建测试执行记录表
CREATE TABLE IF NOT EXISTS test_executions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  test_case_id INT NOT NULL COMMENT '关联用例ID',
  status ENUM('running', 'passed', 'failed') NOT NULL COMMENT '执行状态',
  result JSON COMMENT '执行结果(JSON格式)',
  duration INT COMMENT '执行时长(毫秒)',
  error_message TEXT COMMENT '错误信息',
  executed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_test_case_id (test_case_id),
  INDEX idx_status (status),
  INDEX idx_executed_at (executed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='测试执行记录表';

-- 创建测试报告表
CREATE TABLE IF NOT EXISTS test_reports (
  id INT AUTO_INCREMENT PRIMARY KEY,
  project_id INT COMMENT '关联项目ID',
  execution_ids JSON NOT NULL COMMENT '关联的执行记录ID数组',
  summary JSON COMMENT '报告摘要(总数、通过数、失败数等)',
  file_path VARCHAR(500) COMMENT '报告文件路径',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_project_id (project_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='测试报告表';

-- 创建生产环境错误表
CREATE TABLE IF NOT EXISTS production_errors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  error_type ENUM('frontend', 'backend') NOT NULL COMMENT '错误类型',
  message TEXT NOT NULL COMMENT '错误信息',
  stack_trace TEXT COMMENT '堆栈跟踪',
  user_agent VARCHAR(500) COMMENT '用户代理',
  url VARCHAR(500) COMMENT '发生错误的URL',
  user_id INT COMMENT '关联用户ID(如果已登录)',
  alerted TINYINT(1) DEFAULT 0 COMMENT '是否已告警',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_error_type (error_type),
  INDEX idx_alerted (alerted),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='生产环境错误表';
