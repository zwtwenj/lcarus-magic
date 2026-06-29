# Icarus Magic

一键式 AI 短视频生成平台：输入文案，自动完成素材匹配、语音合成、字幕生成、视频合成全流程，输出可发布的竖版短视频。

## 架构总览

Monorepo 结构，包含三个核心服务：

| 目录 | 说明 | 技术栈 | 默认端口 |
| --- | --- | --- | --- |
| `icarus-magic-server` | 主服务，业务 API 与编排调度 | NestJS + TypeORM + MySQL | `3000` |
| `icarus-magic-web` | 前端 SPA | Vue 3 + Vite + Pinia + Element Plus | `5173` |
| `file-server` | 文件下载与视频合成（FFmpeg） | Express | `3001` |

辅助目录：

- `agent/` —— Python 辅助脚本（独立虚拟环境）
- `material/` —— 本地素材存放（sound / subtitles）

前端通过 Vite 代理把 `/api/*` 转发到主服务 `3000`；主服务在视频合成阶段调用 `file-server` 的 `3001`。

## 技术栈

- **后端**：NestJS 11、TypeORM、MySQL、Passport+JWT、Winston 日志
- **前端**：Vue 3、Vue Router、Pinia、Element Plus、Axios
- **外部依赖**：阿里云 OSS（素材/成品存储）、Coze 工作流（素材匹配、FFmpeg 命令生成、文案润色）、CosyVoice（语音合成）
- **视频合成**：FFmpeg（纯 CPU，无需 GPU）

## 视频生成流水线

```
文案 → 素材匹配(Coze) → 语音合成 → 字幕生成(.ass)
                                   ↓
        file-server: 下载素材 + 执行 FFmpeg 命令 → 上传 OSS
                                   ↓
                         成品入库 video 表 → 前端预览
```

1. 主服务调用 Coze「素材匹配」工作流，为每段文案匹配配图
2. 调用 Coze「FFmpeg 命令生成」工作流，产出合成命令（仅生成文本，不执行）
3. 主服务把素材 URL 列表发给 `file-server /download-files` 下载到本地并按尺寸裁剪
4. 主服务把 FFmpeg 命令（Base64）发给 `file-server /run-shell` 本地执行，产物上传 OSS
5. 合成成功后，视频记录写入 `video` 表（含 `project_id`）

## 环境要求

- Node.js ≥ 18（推荐 20+）
- pnpm ≥ 8
- MySQL 8
- FFmpeg（编译需包含 `libx264` 和 `libass`，用于烧录字幕）

## 环境变量配置

### `icarus-magic-server/.env`

```env
MYSQL_ADDRESS=127.0.0.1
MYSQL_PORT=3306
MYSQL_USER=root
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=icarus-magic

JWT_SECRET=your-jwt-secret
JWT_EXPIRES_IN=1d
PORT=3000
NODE_ENV=development

# 阿里云
ali_key=your_ali_key
OSS_ACCESS_KEY_ID=your_oss_key_id
OSS_SECRET=your_oss_secret

# Coze 工作流 Token
COZE_SECRET_TOKEN=
COZE_EVENT_DETAIL_TOKEN=
COZE_MATERIAL_MATCH_TOKEN=
COZE_FFMPEG_TOKEN=
COZE_POLISH_TOKEN=

# 热点数据上游
HOTSPOT_UPSTREAM_URL=http://your-hotspot-upstream:9400
```

### `file-server/.env`

```env
OSS_REGION=oss-cn-hangzhou
OSS_ACCESS_KEY_ID=your_oss_key_id
OSS_ACCESS_KEY_SECRET=your_oss_secret
OSS_BUCKET=your_bucket
```

> ⚠️ `.env` 已在 `.gitignore` 中，切勿提交真实密钥。

## 快速开始

分别在三个目录安装依赖并启动：

```bash
# 1. 主服务
cd icarus-magic-server
pnpm install
pnpm start:dev          # http://localhost:3000

# 2. 前端
cd icarus-magic-web
pnpm install
pnpm dev                # http://localhost:5173

# 3. file-server（视频合成）
cd file-server
pnpm install
pnpm start              # http://localhost:3001
```

三个服务都启动后，浏览器访问 http://localhost:5173 即可。

## 数据库

主服务 `synchronize: false`，新增表/字段需手动执行 DDL。核心表：

- `user` —— 用户
- `project` —— 项目（含文案 `text`、段落 `segments`、`voiceId` 等）
- `task` —— 任务（父子结构，记录请求/结果）
- `material` —— 素材库（image/video/voice）
- `subtitle` / `subtitle_config` —— 字幕
- `video` —— 生成的视频成品，关键字段：

```sql
ALTER TABLE video ADD COLUMN project_id INT NULL AFTER task_id;
```

`video.project_id` 用于按项目查询成品视频（接口 `GET /project/videos?projectId=X`）。

## 主要 API

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | `/project/create` | 创建项目 |
| POST | `/project/list` | 项目列表 |
| GET  | `/project/info?id=` | 项目详情 |
| GET  | `/project/videos?projectId=` | 项目下视频列表 |
| POST | `/project/saveText` | 保存文案 |
| POST | `/project/generate` | 一键成片（异步，返回 taskId） |
| POST | `/task/list` | 任务列表 |
| POST | `/task/status` | 查询任务状态（轮询） |
| POST | `/auth/login` | 登录 |

> 所有响应统一为 `{ code, data, message }`，`code === 100` 代表成功。

## 平台说明

- **FFmpeg 仅用 CPU**：合成命令使用 `libx264` 软编，无硬件加速标志，无需 GPU。
- **Windows 本地开发**：Coze 生成的命令是 Unix 风格（`rm`），Windows 的 cmd.exe 没有 `rm`。可在 `file-server` 目录放置 `rm.bat` 兼容垫片，或将 file-server 部署到 Linux。ffmpeg 二进制放在 `file-server` 目录即可被 cmd 按当前目录优先找到。
- **字幕字体**：烧录字幕依赖 `libass` 与字体。Linux 环境若报字体缺失，安装中文字体（如 `fonts-noto-cjk`）或将 `.ass` 默认字体改为 Linux 已安装字体。

## 目录约定

- 日志：`icarus-magic-server/logs`
- 合成产物：`file-server/<project>_<timestamp>/`（中间产物，最终上传 OSS）
