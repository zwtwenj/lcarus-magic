# Linux（RTX 4090）使用 GPU 渲染 + 硬件编码完整步骤

适用于：Ubuntu 22.04、NVIDIA RTX 4090、Remotion 服务。目标：**Chromium 用 GPU 画帧** + **FFmpeg 用 NVENC 编码**。

---

## 第一步：检查 Linux 环境与显卡

在服务器上执行：

```bash
# 1. 系统与内核
uname -a

# 2. 显卡与驱动（必须正常）
nvidia-smi
```

**要求**：

- `nvidia-smi` 能正常输出，看到 **NVIDIA GeForce RTX 4090** 和驱动版本（如 535.x）。
- 若报错或找不到命令：先安装 NVIDIA 驱动（如 `ubuntu-drivers install` 或从 NVIDIA 官网安装）。

---

## 第二步：检查 / 安装 Vulkan（用于 GPU 渲染）

Chromium 用 Vulkan 做 GPU 渲染时，需要系统有 Vulkan 与驱动支持：

```bash
# 安装 Vulkan 工具（可选，用于检查）
sudo apt update
sudo apt install -y vulkan-tools

# 查看是否识别到 4090
vulkaninfo --summary 2>/dev/null | head -80
```

**要求**：输出里应有 **NVIDIA GeForce RTX 4090**（GPU0 等）。若有大量 `XDG_RUNTIME_DIR`、`DISPLAY` 警告可忽略，只要能看到 NVIDIA 设备即可。

---

## 第三步：检查 / 安装带 NVENC 的 FFmpeg（用于硬件编码）

当前代码会用 **系统 PATH 里的 ffmpeg**（优先 `/usr/bin/ffmpeg`）检测是否支持 NVENC。若支持，会自动启用硬件编码。

```bash
# 检查当前 ffmpeg 是否支持 NVENC
ffmpeg -hide_banner -encoders 2>/dev/null | grep h264_nvenc
```

- **有输出**（如 `V..... h264_nvenc`）→ 跳过本步，直接到第四步。
- **无输出** → 需要换一个带 NVENC 的 FFmpeg（Ubuntu 自带 ffmpeg 通常不带）。

**说明**：本服务在 Linux 上会**优先使用 `/usr/local/bin/ffmpeg`**，再回退到 `/usr/bin/ffmpeg`。把带 NVENC 的 ffmpeg 放到 `/usr/local/bin` 即可被自动使用，无需覆盖系统自带的 `/usr/bin/ffmpeg`。

**安装带 NVENC 的 FFmpeg（二选一）**：

**方式 A：BtbN 预编译（推荐）**

```bash
cd /home/liuruxing/ecs/nvm/server
# 下载最新 linux64 包（以 BtbN 实际 release 名为准，可到 https://github.com/BtbN/FFmpeg-Builds/releases 查看）
wget -q "https://github.com/BtbN/FFmpeg-Builds/releases/download/latest/ffmpeg-master-latest-linux64-lgpl-shared.tar.xz" -O ffmpeg-nvenc.tar.xz
tar -xf ffmpeg-nvenc.tar.xz
# 解压后目录名可能是 ffmpeg-master-latest-linux64-lgpl-shared，先确认是否含 nvenc
./ffmpeg-master-latest-linux64-lgpl-shared/bin/ffmpeg -hide_banner -encoders 2>/dev/null | grep h264_nvenc || true
# 若上面有输出，软链到 /usr/local/bin（服务会优先使用，不覆盖系统 /usr/bin）
sudo ln -sf "$(pwd)/ffmpeg-master-latest-linux64-lgpl-shared/bin/ffmpeg"   /usr/local/bin/ffmpeg
sudo ln -sf "$(pwd)/ffmpeg-master-latest-linux64-lgpl-shared/bin/ffprobe"  /usr/local/bin/ffprobe
# 再次确认（应看到 h264_nvenc）
/usr/local/bin/ffmpeg -hide_banner -encoders 2>/dev/null | grep h264_nvenc
```

若 BtbN 的 lgpl-shared 包不含 nvenc，到 [BtbN/FFmpeg-Builds releases](https://github.com/BtbN/FFmpeg-Builds/releases) 找带 **nvenc** 说明的 linux64 包，解压后同样软链 `ffmpeg` / `ffprobe` 到 `/usr/local/bin`。

**方式 B：自编译 FFmpeg（带 NVENC）**

- 安装 NVIDIA 驱动、CUDA 或 SDK 后，编译 FFmpeg 时加上 `--enable-nvenc`，再将生成的 `ffmpeg`、`ffprobe` 放到 `/usr/local/bin` 或 PATH 前，保证 `ffmpeg -encoders | grep h264_nvenc` 有输出。

---

## 第四步：安装 Remotion/Chromium 依赖（可选，建议装）

避免缺库导致浏览器或编码异常：

```bash
sudo apt update
sudo apt install -y build-essential libvulkan1 libgbm1 libgbm-dev
sudo apt install -y libegl1 libegl1-mesa libgles2-mesa libxkbcommon0
```

---

## 第五步：安装项目依赖并打补丁

在项目目录执行：

```bash
cd /home/liuruxing/ecs/nvm/server
rm -rf node_modules package-lock.json
npm install
```

- 若有 `patches/` 和 `postinstall: patch-package`，会自动打补丁（如 aac 编码器）。
- 安装完成后应能正常 `require('@remotion/renderer')`，无 `MODULE_NOT_FOUND`。

---

## 第六步：使用 GPU 渲染 + 硬件编码启动服务

**推荐**：用 Vulkan 做 GPU 渲染（无头下通常比 angle-egl 稳定）：

```bash
cd /home/liuruxing/ecs/nvm/server
REMOTION_GL=vulkan node index.js
```

- 不要设 `REMOTION_GL=swiftshader`，否则是软件渲染，不用 4090。
- 若 Vulkan 有问题，可再试：`REMOTION_GL=angle-egl node index.js`（需 EGL/Display 正常）。

---

## 第七步：验证 GPU 与硬件编码是否启用

**1. 看日志**

发起一次渲染请求（如 `GET /api/render-video`），在服务日志中确认：

- **GPU 渲染**：无报错且日志中有使用 Vulkan/angle-egl 的说明（或至少无 swiftshader）。
- **硬件编码**：出现 **`检测到 NVIDIA NVENC 编码器`** 和 **`使用硬件编码器: h264_nvenc`**。

若没有「检测到 NVIDIA NVENC」，说明当前 `ffmpeg` 仍不带 NVENC，回到第三步检查 `/usr/local/bin/ffmpeg` 和 `which ffmpeg`。

**2. 看 GPU 占用**

渲染过程中在另一终端执行：

```bash
watch -n 0.5 nvidia-smi
```

- **GPU 渲染**：渲染阶段应有 **GPU-Util** 和 **Memory-Usage** 上升。
- **硬件编码**：编码阶段也可能有短暂占用（NVENC 在 4090 上会占用 GPU）。

**3. 对比 CPU 版（可选）**

- 调用 **`/api/render-video-cpu`** 做同参数渲染，对比总耗时和日志中的编码器（应为 libx264，无 h264_nvenc）。

---

## 常见错误：Chrome 下载超时（Tried to download file ... but the server sent no data for 20 seconds）

若出现：

```text
Error: Tried to download file https://storage.googleapis.com/chrome-for-testing-public/.../chrome-linux64.zip, but the server sent no data for 20 seconds
```

**原因**：Remotion 默认会从 Google CDN 下载 Chrome for Testing，在国内或受限网络下容易超时。

**解决**：使用本机已安装的 Chrome/Chromium，服务会**自动检测**以下路径并优先使用，不再触发下载：

- `/usr/bin/google-chrome`
- `/usr/bin/google-chrome-stable`
- `/usr/bin/chromium`
- `/usr/bin/chromium-browser`

**安装 Chromium（任选其一）**：

```bash
# Ubuntu/Debian
sudo apt update && sudo apt install -y chromium-browser
# 或
sudo apt install -y chromium
```

若浏览器安装在其它路径，可设置环境变量再启动服务：

```bash
export REMOTION_CHROME_PATH=/你的/chrome或chromium路径
REMOTION_GL=angle-egl node index.js
```

启动后日志中应出现 **「使用本地浏览器 /usr/bin/chromium」** 等，即表示未再尝试下载。

**方案二：手动上传 Chrome for Testing（与 Remotion 期望版本一致）**

若希望使用与 Remotion 一致的 Chrome for Testing（当前版本 **144.0.7559.20**），可在一台能访问 Google 的机器上下载 zip，再上传到服务器并解压到 Remotion 的缓存目录，服务启动时会被识别为“已安装”，不再下载。

1. **在能访问 Google 的机器上下载**（或通过其它方式获取）：
   - 地址：`https://storage.googleapis.com/chrome-for-testing-public/144.0.7559.20/linux64/chrome-linux64.zip`
   - 将 `chrome-linux64.zip` 上传到服务器（如 `scp`、内网盘等）。

2. **在服务器项目目录下执行**（把 `chrome-linux64.zip` 放在项目根目录或作为参数传入）：

**方式 A：使用项目自带脚本（推荐）**

```bash
cd /home/liuruxing/ecs/nvm/server
# 若 zip 在项目根目录
chmod +x scripts/install-chrome-for-testing.sh
./scripts/install-chrome-for-testing.sh
# 或指定 zip 路径
./scripts/install-chrome-for-testing.sh /path/to/chrome-linux64.zip
```

**方式 B：手动执行命令**

```bash
# 进入项目目录（例如）
cd /home/liuruxing/ecs/nvm/server

# 缓存目录：node_modules/.remotion/chrome-for-testing/
CACHE="$PWD/node_modules/.remotion/chrome-for-testing"
mkdir -p "$CACHE/linux64"

# 解压 zip（zip 内有一层目录 chrome-linux64，解压后得到 linux64/chrome-linux64/chrome）
unzip -o chrome-linux64.zip -d "$CACHE/linux64"

# Remotion 通过 VERSION 文件判断是否已安装、是否需重下
echo -n "144.0.7559.20" > "$CACHE/VERSION"

# 确保可执行
chmod +x "$CACHE/linux64/chrome-linux64/chrome"
```

（脚本 `scripts/install-chrome-for-testing.sh` 会完成上述步骤，只需把 zip 放到项目根或传入路径即可。）

3. **验证**：再次启动服务并触发渲染，不应再出现 “Downloading Chrome for Testing” 或下载超时。

**目录结构说明**（供核对）：

```text
项目根/node_modules/.remotion/chrome-for-testing/
├── VERSION                    # 内容：144.0.7559.20（无换行）
└── linux64/
    └── chrome-linux64/
        └── chrome             # 可执行文件
```

若 Remotion 升级后更换了 Chrome 版本，需把文档和 `VERSION` 中的版本号改为新版本（见 `node_modules/@remotion/renderer/dist/browser/get-chrome-download-url.js` 中的 `TESTED_VERSION`）。

---

## 常见错误：ENOENT stat '.../remotion'

若出现：

```text
Error: ENOENT: no such file or directory, stat '/path/to/.remotion-system-ffmpeg/remotion'
```

**原因**：`binariesDirectory` 被设成了某个只包含 `ffmpeg`/`ffprobe` 的目录（例如项目下的 `.remotion-system-ffmpeg`），而 Remotion 还需要该目录下有 **compositor 可执行文件 `remotion`**。三者缺一不可。

**正确做法**：

- 本服务**不要**把 `binariesDirectory` 设为仅含 ffmpeg 的目录；当前实现会使用 **`/tmp/remotion-custom-binaries`**，在其中软链 `remotion`（来自 `@remotion/compositor-*`）+ 系统 `ffmpeg`/`ffprobe`。
- 若你在服务器上改过逻辑、把 `binariesDirectory` 设成了 `path.join(process.cwd(), '.remotion-system-ffmpeg')` 且只放了 ffmpeg/ffprobe，请改回使用代码里的 `getCustomBinariesDirWithSystemFfmpeg()` 返回的目录，或在该目录内**同时放入** `remotion`、`ffmpeg`、`ffprobe`（`remotion` 可从 `node_modules/@remotion/compositor-linux-x64-gnu` 或 `compositor-linux-x64-musl` 的 `dir` 中复制）。
- 不要设置环境变量把 Remotion 的 binaries 目录指到仅含 ffmpeg 的路径。

---

## 检查清单（RTX 4090 能否用起来）

| 项目 | 命令或方法 | 通过标准 |
|------|------------|----------|
| 显卡与驱动 | `nvidia-smi` | 能看到 RTX 4090 和驱动版本 |
| Vulkan | `vulkaninfo --summary` | 输出中有 NVIDIA GeForce RTX 4090 |
| FFmpeg NVENC | `ffmpeg -encoders 2>/dev/null \| grep h264_nvenc` | 有一行输出 |
| 服务启动 | `REMOTION_GL=vulkan node index.js` | 无 MODULE_NOT_FOUND、无崩溃 |
| GPU 渲染 | 渲染时 `nvidia-smi` | GPU-Util / 显存明显上升 |
| 硬件编码 | 渲染日志 | 出现「使用硬件编码器: h264_nvenc」 |

若前四项都通过，RTX 4090 即可用于 GPU 渲染；若第三步也通过，则同时启用硬件编码。任一不通过，按对应步骤排查即可。
