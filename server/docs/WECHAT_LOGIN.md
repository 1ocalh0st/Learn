# 微信登录配置

## 环境变量配置

在项目根目录的 `.env` 文件中添加以下配置：

```env
# 微信开放平台配置
WECHAT_APP_ID=你的微信AppID
WECHAT_APP_SECRET=你的微信AppSecret
WECHAT_REDIRECT_URI=http://localhost:5173/auth/wechat/callback

# JWT 密钥
JWT_SECRET=your-jwt-secret-key
```

## 数据库迁移

执行以下 SQL 为 users 表添加微信登录字段：

```sql
ALTER TABLE users 
ADD COLUMN wechat_openid VARCHAR(128) NULL UNIQUE COMMENT '微信 OpenID',
ADD COLUMN wechat_unionid VARCHAR(128) NULL COMMENT '微信 UnionID',
ADD COLUMN wechat_avatar VARCHAR(512) NULL COMMENT '微信头像URL';

CREATE INDEX idx_users_wechat_openid ON users(wechat_openid);
```

## 微信开放平台配置

1. 登录 [微信开放平台](https://open.weixin.qq.com/)
2. 创建网站应用并完成审核
3. 获取 AppID 和 AppSecret
4. 配置授权回调域名为你的网站域名

## API 接口说明

### 获取微信授权 URL
- **GET** `/api/auth/wechat/url`
- 返回微信扫码登录的 URL

### 微信登录/注册回调
- **POST** `/api/auth/wechat/callback`
- Body: `{ code: string }`
- 处理微信授权回调，自动登录或注册

### 绑定微信到已有账户
- **POST** `/api/auth/wechat/bind`
- 需要认证
- Body: `{ code: string }`

### 模拟微信登录（开发环境）
- **POST** `/api/auth/wechat/mock`
- Body: `{ nickname?: string }`
- 仅在开发环境可用

## 开发环境测试

由于真实微信登录需要域名和审核，开发环境可以使用模拟登录：

1. 点击"微信登录"按钮
2. 在弹出的对话框中点击"模拟微信登录"
3. 系统会自动创建一个模拟的微信用户并登录

## 注意事项

- 生产环境务必配置真实的微信 AppID 和 AppSecret
- 确保回调地址与微信开放平台配置一致
- JWT_SECRET 应使用强随机字符串
