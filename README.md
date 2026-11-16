# WXPushEnhanced - 微信消息推送服务 (Cloudflare Workers)

这是一个基于 [Cloudflare Workers](https://workers.cloudflare.com/) 搭建的轻量级消息推送服务，支持微信公众号、企业微信群机器人和第三方 SMTP 邮件。

## ✨ 特性

✅ 完全免费
✅ 每天 10 万次额度，个人用不完
✅ 真正的微信原生弹窗 + 声音提醒
✅ 支持多用户
✅ 跳转稳定
✅ 支持企业微信群机器人 Webhook<br>
✅ 支持 SMTP 邮件<br>
✅ 可无限换皮肤 (使用项目[wxpushSkin](https://github.com/frankiejun/wxpushSkin))

## 🎬 视频教学


我们制作了详细的视频教程，手把手教您如何完成所有部署步骤。如果您偏爱视频指导，请点击下方链接观看：

**注：该视频教程源自本项目的上游项目 [WXPush](https://githu.com/frankiejun/wxpush) 开发，如有和本项目文档存在冲突之处，以本项目文档为准。**

[<img src="https://look.pics.cloudns.ch/img/极简微信消息推送服务-封面.jpg" alt="点击观看视频教程" width="480">](https://youtu.be/sE1Kcol_XRs?si=G-UbUGlMhyysv-US)  

[<img src="https://look.pics.cloudns.ch/img/%E5%A6%82%E4%BD%95%E7%A8%B3%E5%AE%9A%E9%83%A8%E7%BD%B2wxpushskin%E9%A1%B9%E7%9B%AE-%E5%B0%81%E9%9D%A2.jpg" alt="点击观看视频教程" width="480">](https://www.youtube.com/watch?v=Hf5_LOyjLWU)

*点击上方图片或链接，即可跳转到 YouTube 观看视频教程。*


## 🚀 部署指南：通过关联 GitHub 仓库自动部署


1.  **Fork 或克隆项目**
    *   首先，将本项目 Fork 到您自己的 GitHub 账户，或者克隆后推送到您自己的新仓库。

2.  **连接到 GitHub**
    *   登录 Cloudflare 仪表板，进入 **Workers 和 Pages**。
    *   点击 **创建应用程序**，切换到 **Pages** 选项卡，然后点击 **连接到 Git**。

3.  **选择仓库**
    *   选择您刚刚创建的 GitHub 仓库。

4.  **配置构建和部署**
    *   **项目名称**：为您项目指定一个名称。
    *   **生产分支**：选择您希望部署的分支 (通常是 `main` 或 `master`)。
    *   **框架预设**：选择 `None`。
    *   **构建设置**：构建命令: `pnpm run build`， 部署命令 `pnpm exec wrangler deploy`
    *   **根目录**：保持默认的 `/` 即可。

    
5.  **配置环境变量 (重要)**
    *   返回 Worker 的主管理页面，进入 **设置** > **变量**。
    *   在 **环境变量** 部分，点击 **添加变量**，按需配置以下变量：
        *   `API_TOKEN`: 用于接口调用的访问令牌，请设置一个足够复杂的随机字符串。
        *   `WX_APPID`: 微信公众号 AppID (使用 `wechat` 渠道时需要)。
        *   `WX_SECRET`: 微信公众号 AppSecret (使用 `wechat` 渠道时需要)。
        *   `WX_USERID`: 默认接收消息用户的 OpenID，多个用户请用 `|` 分隔 (使用 `wechat` 渠道时需要)。
        *   `WX_TEMPLATE_ID`: 微信模板消息 ID (使用 `wechat` 渠道时需要)。
        *   `WX_BASE_URL`: 点击模板消息后跳转的基础 URL (使用 `wechat` 渠道时需要)。
        *   `WECOM_WEBHOOK_URL`: 企业微信群机器人的 Webhook URL (使用 `wecom` 渠道时需要，请妥善保管)。
        *   `SMTP_URL`: 第三方 SMTPS 连接 URL，格式为 `smtps://用户名:密码@主机名:465`。用户名和密码中的特殊字符须进行 URL 百分号编码。
        *   `SIGN_SECRET`: HMAC签名密钥，用于防止接口滥用，需要设置为一个足够复杂的十六进制字符串。
        *   `SMTP_FROM`: 已获服务商授权的发件人地址。
        *   `SMTP_TO`: 固定收件人地址，多个收件人用 `|` 分隔，最多 50 个。
        *   `DEFAULT_CHANNEL`: 请求未传 `channel` 时采用的默认渠道，只能设置为 `wechat`、`wecom` 或 `smtp`。
        *   `DEBUG`: 可选：调试模式开关，按需启用。传入格式为 `"0"|"1"`。
    *   **注意**：添加变量时，请确保勾选 **加密** 选项，以保护您的凭证安全。


6.  **保存并部署**
    *   点击 **保存并部署**。Cloudflare 会自动从您的仓库拉取代码并完成部署。
    *   此后，每当您向指定的生产分支推送新的代码提交时，Cloudflare 都会自动为您重新部署。

部署成功后，您的服务访问地址会显示在 Worker 或 Pages 的主页面上。

### 消息展示页鉴权

为了防止滥用，`/skin` 页面要求所有展示参数都带有有效的 `sign` 签名。签名由服务端使用独立配置的 `HMAC_KEY` 作为密钥，对标题、内容和日期等被保护字段按 key 字典序组装成 Query String 并计算 HMAC-SHA-256。通过下方 API 发送消息时，服务会自动生成签名并附加到微信跳转链接；不要将 `HMAC_KEY` 暴露给浏览器或手动分享。

## ⚙️ API 使用方法

服务部署成功后，可以通过 `POST` 请求发送消息。

### 请求地址

```
https://<您的Worker地址>/api/send
```

### 请求参数

| 参数名      | 类型   | 是否必填 | 描述                                           |
|-------------|--------|----------|------------------------------------------------|
| `title`     | String | 是       | 消息标题，最大128个字符                                     |
| `content`   | String | 是       | 消息内容，按 Markdown 格式发送,最大4096个字符。                |
| `channel`   | String | 否       | 发送渠道：`wechat`、`wecom` 或 `smtp`；省略时使用 `DEFAULT_CHANNEL`。 |
| `acceptChannelFallback` | Boolean | 否 | 指定的渠道未启用时是否回退到 `DEFAULT_CHANNEL`，默认 `true`。未指定 `channel` 时始终使用默认渠道，此参数不影响该行为。 |

### 请求头

```json
{
  "Authorization": "Bearer your_secret_token",
  "Content-Type": "application/json"
}
```

### 请求体

```json
{
  "title": "服务器通知",
  "content": "**服务已于北京时间 22:00 重启。**",
  "channel": "wecom"
}
```

企业微信渠道会将标题作为 Markdown 一级标题，并与 `content` 一并发送；消息内容连同标题不得超过 4096 个 UTF-8 字节。微信公众号渠道的 AppID、AppSecret、接收用户、模板 ID 和跳转 URL 均从 Worker 环境变量读取。
请求省略 `channel` 时始终尝试使用 `DEFAULT_CHANNEL`，无论 `acceptChannelFallback` 的值为何。显式指定了未启用的渠道时，若 `acceptChannelFallback` 为 `true`（默认值）则尝试回退至默认渠道；设为 `false` 则返回 `HTTP 400`。默认渠道必须是已启用的渠道。
SMTP 渠道通过 `SMTP_URL` 配置 SMTPS 连接，将 `title` 用作邮件主题、`content` 用作纯文本正文，发件人由 `SMTP_FROM` 指定，收件人固定从 `SMTP_TO` 读取，不接受请求指定收件人。请仅发送用户预期收到的事务通知，不得发送垃圾邮件或营销邮件，并遵守[Cloudflare 可接受使用政策](https://www.cloudflare.com/terms/)及服务商的发送政策。

### cURL 示例

```bash
curl -X POST \
  "https://<您的Worker地址>/api/send" \
  -H "Authorization: Bearer your_secret_token" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "来自 cURL 的消息",
    "content": "自动化任务已完成。",
    "channel": "wechat"
  }'
```

企业微信群机器人示例：

```json
{
  "title": "服务器通知",
  "content": "**自动化任务已完成。**",
  "channel": "wecom"
}
```

SMTP 邮件示例：

```json
{
  "title": "服务器通知",
  "content": "服务已于北京时间 22:00 重启。",
  "channel": "smtp"
}
```

配置第三方 SMTP 时，将服务商提供的主机、用户名、密码和隐式 TLS 端口 `465` 合并为 `SMTP_URL`，例如 `smtps://smith%40example.com:Abc12345@smtp.example.com:465`。用户名或密码包含 `@`、`:` 等 URL 特殊字符时须先进行百分号编码。Cloudflare Workers 的[出站 TCP Socket](https://developers.cloudflare.com/workers/runtime-apis/tcp-sockets/) 不允许连接 SMTP `25` 端口；为确保 SMTP 认证始终在加密连接内进行，本渠道仅接受 SMTPS `465`。

### 成功响应

如果消息发送成功，服务会返回 `HTTP 200` 状态码和 JSON。`wechat` 渠道的响应包含成功发送的用户数，`wecom` 渠道的响应确认群机器人已接收消息：

```json
{
  "msg": "Successfully sent messages to 1 user(s)."
}
```

### 失败响应

如果发生错误（如请求格式错误、缺少所选渠道配置或上游接口调用失败等），服务会返回相应的 `HTTP 4xx` 或 `5xx` 状态码和 JSON：

```json
{
  "msg": "Invalid token"
}
```

## 🛡️ 测试账号保活 (可选)

如果您长时间不会通过本服务收到消息（例如低频使用），微信可能因测试账号长期不活跃而将其回收作废。此时可以开启**保活心跳**：Worker 会通过 Cron Trigger 定时运行，每隔指定天数自动给自己发送一条测试消息，以此保持测试账号活跃，同时也能在账号失效时通过日志及时发现。

**适合人群**：长时间不会收到消息的账号。**若经常收到消息，无需设置**，可忽略本节。

**设置方法**：

1. 无需修改代码，`wrangler.toml` 中已内置每日触发的 Cron Trigger
2. 在 Cloudflare Worker 的 **设置** > **变量** 中添加环境变量：
    *   `ALIVE_DAYS`: 保活间隔天数，例如 `30` 表示每 30 天发送一次测试消息，取值须为 1 ~ 3650 的整数。
3. 保存并重新部署即可生效。

**运行方式**：

*   **不设置 `ALIVE_DAYS` 则不会运行保活心跳**，行为与之前完全一致。
*   保活消息会发送给 `WX_USERID` 中配置的所有用户，标题为"保活测试"。
*   若获取 token 或发送失败，只会在 Worker 日志中记录错误（可通过 Cloudflare 控制台的"日志"查看），此时建议扫码重新登录 [测试号后台](https://mp.weixin.qq.com/debug/cgi-bin/sandbox) 确认账号状态。

## 🤝 贡献

欢迎任何形式的贡献！如果您有好的想法或发现了 Bug，请随时提交 Pull Request 或创建 Issue。

### 开发

Web 框架: Hono；

前端技术栈：基于 Hono 的 JSX；

环境配置: node.js + pnpm + vite

本地部署: 
- 安装：run `pnpm i`

- 本地变量配置：参考上文的环境变量配置，将变量配置在 `/.dev.vars` 中。项目提供了一个 `.dev.vars.example` 供参考。

- 生成 Cloudflare 运行时类型标注：`pnpm run cf-typegen` 
  此命令会依据 `wrangler.toml` 与 `.dev.vars` 生成根目录的 `worker-configuration.d.ts`（环境变量绑定 + workerd 运行时全局类型），`pnpm install` 时由 `prepare` 自动执行一次。修改了 `wrangler.toml` 的绑定或 `.dev.vars` 的键名后需要重新生成；在 CI 流程中，使用 `pnpm run cf-typegen:check` 校验它是否已过期。

- 调试： `pnpm dev`

- DEBUG in Vscode:
  `.vscode/launch.json`:
  ```json
    {
      "version": "0.2.0",
      "configurations": [
        {
          "name": "wxpush",
          "type": "node",
          "request": "attach",
          "websocketAddress": "ws://localhost:9229/wxpush",
          "resolveSourceMapLocations": null,
          "attachExistingChildren": false,
          "autoAttachChildProcesses": false,
          "sourceMaps": true
        }
      ],
      "compounds": [
        {
          "name": "Debug Workers",
          "configurations": ["wxpush"],
          "stopAll": true
        }
      ]
    }
  ```
- 编译及预览：运行 `pnpm run preview` 能够通过 wrangler 将本地当前工作区代码编译并上传至 Cloudflare 预览分支。需要配置 `.dev.vars.preview`。

- 该项目拥有代码格式和 lint 规范，并在编译时自动检查。运行 `pnpm run lint` 以进行格式检查。


## 二次开发说明
本项目基于 [WXPush](https://github.com/frankiejun/wxpush) 进行二次开发。由于改动过大，故 Fork 为单独的版本。

## 📜 许可证
本项目包含来自 [WXPush](https://github.com/frankiejun/wxpush)的代码，许可证文本位于 `/LICENSE-FROM-UPSTREAM` 中。

本项目采用 [AGPLv3](https://www.gnu.org/licenses/agpl-3.0.txt) 开源许可证。
