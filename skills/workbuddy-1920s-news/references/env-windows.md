# Windows 环境与数据导出

`<工作区>` 表示你自己的目录。**全部用绝对路径**，这套脚本依赖 cwd 的地方比想象中多。

---

## 一、环境

### 1. 四个软件

| 软件 | 要求 | 实测 |
|---|---|---|
| Node.js | 18+ | 22.22.2 |
| Python | 3.11+ | 3.13.12 |
| ffmpeg | 在 PATH 里 | 6.x |
| Git for Windows | 任意 | 2.4x |

```sh
node -v; python --version; ffmpeg -version | head -1; git --version
```

`where python` 确认不是 Microsoft Store 的占位程序。指向占位程序的话，建虚拟环境会报奇怪的错。

### 2. 拉两个仓库

```sh
mkdir -p <工作区> && cd <工作区>
git clone --depth 1 https://github.com/kinghuangze-web/chat-newsreel-1920s-public.git newsreel
git clone --depth 1 https://github.com/lemomo-ai/lemo-opuscar.git lemo
```

`newsreel` 是工作流与模板，`lemo` 是渲染引擎，两者分开。`gh` 报 401 忽略，那是 `gh` 没登录，`git clone` 照常可用。

### 3. Node 依赖

```sh
cd <工作区>/lemo && npm install
```

装 `playwright-core` 和 `three`，几十兆。

### 4. Python 虚拟环境

不要用系统 Python 装。`numba`、`kokoro-onnx` 对版本敏感，装到全局会跟别的项目打架。

```sh
cd <工作区>/lemo
python -m venv .venv
.venv/Scripts/python.exe -m pip install --upgrade pip
.venv/Scripts/python.exe -m pip install -r requirements.txt -r requirements-voice.txt -r requirements-music.txt
.venv/Scripts/python.exe -c "import edge_tts, numpy, soundfile, soxr, scipy, PIL; print('ok')"
```

三个文件分别是渲染、配音、配乐。打出 `ok` 才算过。只装第一个的话 `soundfile` 会缺，配乐脚本一跑就 `ModuleNotFoundError`。

### 5. POSIX 垫片（必做）

`build.sh` 里写死了 `PY="$LIB/.venv/bin/python"`，找不到就退回 `python3`，而 Windows 上通常没有 `python3`，整条链路断在第一步。

```sh
cd <工作区>/lemo
mkdir -p .venv/bin
cat > .venv/bin/python <<'EOF'
#!/bin/sh
exec "D:/work/lemo/.venv/Scripts/python.exe" "$@"
EOF
chmod +x .venv/bin/python
.venv/bin/python -c "import sys; print(sys.executable)"
```

末行应打出 `D:\work\lemo\.venv\Scripts\python.exe`。

垫片里写**正斜杠绝对路径**。Git Bash 会把字面反斜杠规范化掉，写 `D:\work\...` 反而出错。

### 6. Chromium

```sh
npx playwright install chromium
```

已存在 `C:\Users\<用户名>\AppData\Local\ms-playwright\chromium_headless_shell-*` 就跳过。

### 7. 字体

四个，共 43 MB。`build.sh` 首次运行会调 `tools/fetch_fonts.sh` 自动下。

自动下载失败时（`curl: (35) schannel: failed to receive handshake`）：

1. 打开 `tools/fetch_fonts.sh` 看每个字体的源地址
2. `curl -LO <地址>` 逐条手动下
3. 按脚本里的目标文件名重命名

**直连 `raw.githubusercontent.com`。** `github.com` 网页端在受限网络里通常不通，两者看起来一样，走的链路不同。jsdelivr 也不可靠（403）。

### 8. 建本期工程

```sh
cd <工作区>/newsreel && cp -r templates/project ep01
```

`ep01` 是期号。`build.sh` 里 `NAME=$(basename "$P")`，输出文件名自动跟着目录名走，别处不用改。

### 9. 验证

```sh
cd <工作区>/newsreel/ep01
LIB=<工作区>/lemo sh build.sh page && ls index.html
LIB=<工作区>/lemo sh build.sh stills && ls stills/_sheet.jpg
```

出了 `index.html` 和联系表，环境就算齐了。

> `build.sh` 内部已经用 `cygpath -w` 转过路径，Windows 上可以直接跑 `stills`。只有你自己手调 `node core/render/still.mjs` 时才需要手动转，因为 node 是原生程序，读不了 `/d/work/x` 这种 MSYS 路径。

### 环境报错对照

| 报错 | 原因 | 处理 |
|---|---|---|
| `set LIB to your lemo-opuscar clone` | `LIB` 没设或指错 | 第 2、9 步 |
| `ModuleNotFoundError: soundfile` | 只装了 `requirements.txt` | 第 4 步 |
| `python3: command not found` | 垫片没建 | 第 5 步 |
| `Failed to launch chromium` | 浏览器没下 | 第 6 步 |
| `curl: (35) schannel` | GitHub 走不通 | 第 7 步 |
| `FileNotFoundError: .../timeline.json` | MSYS 路径传给 Windows Python | `cygpath -w` |
| 渲染卡在 0% | 内存不够，worker 太多 | 降到 `--workers 2` |

---

## 二、数据导出

根目录 `chat-export.md` 推荐 `wechat-cli`，macOS 上够用。Windows 上会断三次，全在「选库」环节，跟命令语法无关。

### 1. 先试标准路径

```sh
npm install -g @canghe_ai/wechat-cli
wechat-cli init
wechat-cli history "<群名>" --start-time "YYYY-MM-DD 00:00" --end-time "YYYY-MM-DD 23:59" > chat.json
```

报 `sqlite3.DatabaseError: file is not a database` 就往下走。这个报错跟群名、权限、微信版本都无关，是它挑错了库。

### 2. 断点一：挑中废弃账号

微信数据目录下有多个账号目录，`auto_detect_db_dir()` 挑的不一定是在用的那个。废弃目录里的 `contact.db` 是几百字节的空壳。

按大小挑，取最大的：

```sh
ls -l "<微信数据根>/xwechat_files"/*/db_storage/contact.db
```

实测量级：正确库 20 MB 上下，废弃库不到 200 KB。差两个数量级。

另一个线索：`~/.wechat-cli/config.json` 里通常记着上次初始化用的库路径。**有这个文件就优先信它，别信自动检测。**

### 3. 断点二：解密结果被复用成旧数据

解密工具有「目标文件比源文件新就跳过」的优化，按 mtime 判断。不同账号的库 mtime 可能刚好满足跳过条件，于是读到上一个账号的数据。

每次解密前先删目标文件，强制全量重解：

```sh
rm -f "<输出目录>/contact.db" "<输出目录>/message_*.db" "<输出目录>/session.db"
```

成功标志：文件头是 `SQLite format 3`，`PRAGMA page_size` 返回 4096。

### 4. 断点三：WAL 不能回放

今天的消息导不出来，但库里明明有。想回放 WAL 补上，回放后 `PRAGMA quick_check` 报 `invalid rootpage` 或 `2nd reference to page`。

原因是 WAL 是环形缓冲，同一文件里压着十几个 salt 代次，新帧在头部、旧帧在尾部。正放倒放都会把不同代次混在一起，页号对不上就写坏库。

**不要尝试回放。** 今天刚发的消息很可能还在微信进程内存里，没落盘。等微信自己 checkpoint，或者让用户重启微信。

确认拿不到，就改用前一天的全天记录。这是产品决策，不是技术妥协。

### 5. 兜底：自己解密

`wechat_cli.core.crypto` 里有现成函数：

```python
from wechat_cli.core.crypto import full_decrypt
full_decrypt(src_db_path, dst_db_path, key_hex)
```

| 项 | 值 |
|---|---|
| 加密方式 | SQLCipher 4 |
| 页大小 | 4096 |
| 每页尾部保留 | 80 字节（IV 16 + HMAC 64） |
| 页内算法 | AES-256-CBC |
| 头部 | 解密后前 16 字节 `SQLite format 3\0` |

密钥从 `wechat-cli init` 生成的配置里取。没有配置就先跑一次 `init`。

### 6. 定位群

群 id 形如 `<数字>@chatroom`。在 `contact.db` 里模糊查：

```sql
SELECT username, nick_name FROM contact WHERE nick_name LIKE '%<关键词>%';
```

同名群可能不止一个，取成员数最多或消息量最大的。确认 id 后再进 `message_*.db`。

### 7. 精确解析

三个必须做的处理，缺一个导出的记录就会错：

- **发言人映射**——`message_*.db` 存的是 `wxid_*` 或内部 id，真实昵称在 `Name2Id` 表里。不映射只能看到一堆 id。
- **引用解析**——引用消息正文里嵌着 `<refermsg>` XML，要拆出来单独处理，否则原文会混进一大段标签。
- **类型归一**——图片、视频、语音、链接、文件都是 XML 或二进制，统一压成 `[图片]` `[视频]` `[链接]` `[文件]`，跟 `clean_chat.py` 的预期一致。

系统消息的发送者可能是内部 id（形如 `id17`），不是真实成员。这类消息不进统计、不上屏。

### 8. 输出格式

必须和根目录 `chat-export.md` 一致，下游脚本才能直接用：

```json
{"chat": "<群名>", "messages": ["[YYYY-MM-DD HH:MM] 昵称: 内容", "..."]}
```

时间 `YYYY-MM-DD HH:MM`，方括号包裹，昵称后冒号加空格。差一个字符，`clean_chat.py` 的解析就全错。

### 9. 隐私

导出结果是隐私数据。只在本地处理，不进仓库，不贴进 issue，不写进任何要提交的文件。`.gitignore` 已经把 `work/`、`tools_local/` 排除，不要为了「方便」加回来。
