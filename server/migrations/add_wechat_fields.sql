-- 微信登录相关字段迁移
-- 执行此脚本为 users 表添加微信登录所需字段

ALTER TABLE users 
ADD COLUMN wechat_openid VARCHAR(128) NULL UNIQUE COMMENT '微信 OpenID',
ADD COLUMN wechat_unionid VARCHAR(128) NULL COMMENT '微信 UnionID',
ADD COLUMN wechat_avatar VARCHAR(512) NULL COMMENT '微信头像URL';

-- 创建索引加速查询
CREATE INDEX idx_users_wechat_openid ON users(wechat_openid);

-- 查看表结构
DESCRIBE users;
