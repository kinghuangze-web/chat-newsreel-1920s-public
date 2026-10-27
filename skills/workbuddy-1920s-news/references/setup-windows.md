# Windows 环境搭建

从一台干净的 Windows 11 开始，到能跑出第一张静帧为止。

路径统一用 `<工作区>` 表示，示例取 `D:/work`。换成自己的目录即可，但**必须全用绝对路径**——这套脚本依赖 cwd 的地方比想象中多。

## 1. 装四个软件

| 软件 | 版本要求 | 本次实测 |
|---|---|---|
| Node.js | 18+ | 22.22.2 |
| Python | 3.11+ | 3.13.12 |
| ffmpeg | 任意近期版本，须在 PATH | 6.x |
| Git for Windows | 任意 | 2.4x |

验证：

```sh
node -v
python --version
ffmpeg -version | head -1
git --version
```

`python` 这个命令在 Windows 上经常指向 Microsoft Store 的占位程序。用 `where python` 确认它指向真实的安装目录，否则后面建虚拟环境会报奇怪的错。

## 2. 拉两个仓库

```sh
mkdir -p /d/work && cd /d/work

git clone --depth 1 https://github.com/<owner>/chat-newsreel-1920s-public.git newsreel
git clone --depth 1 https://github.com/lemomo-ai/lemo-opuscar.git lemo
```

`newsreel` 是工作流与模板，`lemo` 是渲染引擎。两者分开。

`--depth 1` 只取最新提交。这两个仓库的历史对使用没有影响，能省一半时间。

如果 `gh` 命令报 401，忽略它——那是 `gh` 未登录，跟仓库访问权限无关，`git clone` 照常可用。

## 3. Node 依赖

```sh
cd /d/work/lemo
npm install
```

装 `playwright-core` 和 `three`。几十兆，通常一两分钟。

## 4. Python 虚拟环境

**不要用系统 Python 直接装。** 这套依赖里有 `numba`、`kokoro-onnx` 这类对版本敏感的包，装到全局环境会跟别的项目打架，出问题也很难回滚。

```sh
cd /d/work/lemo
python -m venv .venv
.venv/Scripts/python.exe -m pip install --upgrade pip
.venv/Scripts/python.exe -m pip install -r requirements.txt -r requirements-voice.txt -r requirements-music.txt
```

三个文件分别是渲染、配音、配乐。装完验证：

```sh
.venv/Scripts/python.exe -c "import edge_tts, numpy, soundfile, soxr, scipy, PIL; print('ok')"
```

打出 `ok` 才算过。只装了 `requirements.txt` 的话，`soundfile` 会缺，配乐脚本一跑就 `ModuleNotFoundError`。

## 5. 建 POSIX 垫片（关键）

`build.sh` 里写死了：

```sh
PY="$LIB/.venv/bin/python"; [ -x "$PY" ] || PY=python3
```

Windows 的虚拟环境在 `.venv/Scripts/python.exe`，没有 `.venv/bin/python`。脚本找不到就退回 `python3`，而 Windows 上通常没有这个命令，于是整条链路断在第一步。

建一个垫片转发过去：

```sh
cd /d/work/lemo
mkdir -p .venv/bin
cat > .venv/bin/python <<'EOF'
#!/bin/sh
exec "D:/work/lemo/.venv/Scripts/python.exe" "$@"
EOF
chmod +x .venv/bin/python
```

验证：

```sh
.venv/bin/python -c "import sys; print(sys.executable)"
```

应该打出 `D:\work\lemo\.venv\Scripts\python.exe`。

注意垫片里写的是**正斜杠的绝对路径**。Git Bash 会把字面反斜杠路径规范化掉，写 `D:\work\...` 反而出错。

## 6. Chromium

渲染靠 Playwright 驱动 Chromium 逐帧截图。首次运行会自动下载，也可以提前装：

```sh
npx playwright install chromium
```

下完在 `C:\Users\<用户名>\AppData\Local\ms-playwright` 里能看到 `chromium_headless_shell-<版本>`。

如果这个目录已经存在，跳过即可，不用重下。

## 7. 字体

四个字体，共约 43 MB：

| 字体 | 用途 | 大小 |
|---|---|---|
| Limelight | 报头、大标题、印章 | 132 KB |
| Oswald | 数字、英文小标、尺寸标注 | 172 KB |
| Noto Serif SC | 中文标题、报纸正文 | 25 MB |
| Noto Sans SC | 中文字幕、正文 | 17.7 MB |

`build.sh` 首次运行会调 `tools/fetch_fonts.sh` 自动下。

**这台机器上这一步失败过**，`curl` 报：

```
curl: (35) schannel: failed to receive handshake
```

环境代理连不上，jsdelivr 返回 403。最后**直连 `raw.githubusercontent.com`** 成功。

如果自动下载失败：

1. 打开 `tools/fetch_fonts.sh`，看里面每个字体的源地址。
2. 用 `curl -LO <地址>` 逐条手动下。
3. 按脚本里的目标文件名重命名。

不要试图从 GitHub 网页点「Download」——`github.com` 在这类受限网络里通常不通，只有 `raw.githubusercontent.com` 通。这两件事看起来一样，实际走的是不同链路。

## 8. 建本期工程

```sh
cd /d/work/newsreel
cp -r templates/project ep01
```

`ep01` 是期号。第二期复制成 `ep02`，别处不用改——`build.sh` 里 `NAME=$(basename "$P")`，输出文件名自动跟着目录名走。

## 9. 验证环境

到这里应该能出第一张静帧了：

```sh
cd /d/work/newsreel/ep01
LIB=/d/work/lemo sh build.sh page
ls -la index.html
```

出 `index.html` 就说明拼装链路通了。

接着试静帧。Windows 上 `build.sh stills` 会因为路径风格失败（见 [pitfalls.md](pitfalls.md) 第 15 条），手动跑：

```sh
cd /d/work/newsreel/ep01
WP=$(cygpath -w /d/work/newsreel/ep01)
mkdir -p stills
cd /d/work/lemo
node core/render/still.mjs "$WP" 5.0 12.0 --out "$WP\\stills" --prefix s_
ls /d/work/newsreel/ep01/stills/
```

两张 jpg 出来，环境就算齐了。

## 常见失败对照

| 报错 | 原因 | 去看 |
|---|---|---|
| `set LIB to your lemo-opuscar clone` | `LIB` 没设或指错 | 本节第 2、9 步 |
| `ModuleNotFoundError: soundfile` | 只装了 `requirements.txt` | 第 4 步 |
| `python3: command not found` | 垫片没建 | 第 5 步 |
| `Failed to launch chromium` | 浏览器没下 | 第 6 步 |
| `curl: (35) schannel` | 走不通 GitHub | 第 7 步 |
| `FileNotFoundError: .../timeline.json` | MSYS 路径传给了 Windows Python | [pitfalls.md](pitfalls.md) 第 15 条 |
| 渲染卡在 0% | 内存不够，worker 开太多 | [pitfalls.md](pitfalls.md) 第 29 条 |
