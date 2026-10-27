# 踩坑记录

2026-10-27 一次完整制作中实际遇到的 27 个问题。按阶段分组，编号固定，方便别处引用。

每条给四样：现象（含原始报错）、原因、解决、怎么提前避免。没有「提前避免」的，说明这个问题只能撞上再解。

环境准备相关的先看 [setup-windows.md](setup-windows.md)，这里只记「按文档做了还是出错」的那些。

---

## A. 环境与依赖

### 1. `gh repo view` 返回 401

**现象**

```
HTTP 401: Bad credentials (https://api.github.com/graphql)
```

但同一个仓库用浏览器能打开，`git clone` 也正常。

**原因**

`gh` 命令行没登录，或者登录态过期。这跟仓库的访问权限无关，是两个独立的认证体系。

**解决**

不用 `gh`。直接 `git clone --depth 1 <https 地址>`。

需要读 README 的话，用 `curl` 抓 `raw.githubusercontent.com/<owner>/<repo>/main/README.md`。

**提前避免**

拿到仓库地址先试 `git clone`，别先试 `gh`。`gh` 只有在需要操作 issue、PR、release 时才必须。

---

### 2. `ModuleNotFoundError: No module named 'soundfile'`

**现象**

配乐脚本一跑就报这个，但 `pip list` 里明明装了。

**原因**

`pip list` 查的是系统 Python，脚本用的是另一个解释器。这套依赖里有 `numba`、`kokoro-onnx`，装到全局环境容易跟已有包冲突，所以必须用虚拟环境——但环境建好之后，如果某一步用了 `python` 而不是 `.venv/Scripts/python.exe`，就会跑回系统解释器。

**解决**

统一用虚拟环境里的绝对路径：

```sh
.venv/Scripts/python.exe -m pip install -r requirements.txt -r requirements-voice.txt -r requirements-music.txt
.venv/Scripts/python.exe -c "import soundfile; print('ok')"
```

三个 requirements 都要装。只装第一个会缺 `soundfile`、`edge-tts`、`numba`。

**提前避免**

每次跑 Python 都写全路径，不要依赖 PATH 里的 `python`。

---

### 3. `build.sh` 找不到 Python，退回 `python3` 后失败

**现象**

```
./build.sh: python3: command not found
```

或者静默失败，没有任何输出。

**原因**

`build.sh` 里这一行：

```sh
PY="$LIB/.venv/bin/python"; [ -x "$PY" ] || PY=python3
```

`.venv/bin/python` 是 POSIX 布局。Windows 的虚拟环境在 `.venv/Scripts/python.exe`，这个路径不存在，`-x` 判断失败，于是退回 `python3`——而 Windows 上通常没有这个命令名。

**解决**

建垫片转发：

```sh
cd <LIB>
mkdir -p .venv/bin
cat > .venv/bin/python <<'EOF'
#!/bin/sh
exec "D:/work/lemo/.venv/Scripts/python.exe" "$@"
EOF
chmod +x .venv/bin/python
```

**提前避免**

搭环境的最后一步就建这个垫片，别等报错。垫片里的路径必须是正斜杠。

---

### 4. 字体下载 `curl: (35) schannel: failed to receive handshake`

**现象**

```
curl: (35) schannel: failed to receive handshake, SSL/TLS connection failed
```

试过环境代理、试过 jsdelivr（403）、试过几个镜像，全挂。

**原因**

这类受限网络里，`github.com` 和 `raw.githubusercontent.com` 走的是不同链路。前者经常完全不通，后者通常能过。`curl` 的 schannel 后端对某些 TLS 握手也比较挑。

**解决**

直连 `raw.githubusercontent.com`：

```sh
curl -LO https://raw.githubusercontent.com/google/fonts/main/ofl/limelight/Limelight-Regular.ttf
```

按 `tools/fetch_fonts.sh` 里的源地址逐条下，再按目标文件名重命名。

**提前避免**

判断网络能不能用，先测这两个域名：

```sh
for h in https://github.com https://raw.githubusercontent.com; do
  echo -n "$h -> "; curl -sI --max-time 15 "$h" -o /dev/null -w "%{http_code}\n"
done
```

`github.com` 失败而 `raw.*` 成功是常态，不是异常。

---

### 5. `Failed to launch chromium`

**现象**

渲染或静帧第一步就报浏览器启动失败。

**原因**

Playwright 的 Chromium 没下载，或者版本跟 `playwright-core` 对不上。

**解决**

```sh
npx playwright install chromium
```

下完检查 `C:\Users\<用户名>\AppData\Local\ms-playwright` 里有没有 `chromium_headless_shell-<版本>`。

**提前避免**

`npm install` 之后立刻装浏览器，别等到渲染。

---

### 6. 写工作区以外的文件被拦

**现象**

脚本要往 `D:\other\` 或游戏目录写文件，命令返回成功但文件没出现，或者直接被拒绝。

**原因**

沙箱默认只允许在工作区内读写。

**解决**

两种：

- 把数据先复制进工作区，处理完再复制出去。
- 或者显式提权执行（WorkBuddy 里会弹权限确认，用户点允许即可）。

**提前避免**

设计路径时就假设「只有工作区可写」。微信数据库、素材、字体这些外部资源，第一步就复制到工作区的 `_input/` 下，后面全用工作区内的路径。

---

## B. 数据导出

### 7. `sqlite3.DatabaseError: file is not a database`

**现象**

解密后的数据库一打开就报这个。

**原因**

解密脚本自动检测账号目录，挑中了一个废弃账号的旧库（十几万字节）。真正的库有几十兆。文件确实被「解密」了，但解的是一个不是数据库的东西。

一台机器上有多个 `wxid_*` 目录是常态，废弃账号的目录不会自动清理。

**解决**

不要用自动检测。读配置文件：

```sh
cat ~/.wechat-cli/config.json
```

里面的 `db_dir` 才是当前账号。用它指定的路径。

判断标准很简单：`contact.db` 的大小。几 MB 到几十 MB 是正常的，一百多 KB 的一定是废的。

**提前避免**

先 `ls -la` 看一眼各候选目录的库大小，再决定用哪个。

---

### 8. 解密成功，但数据是旧的

**现象**

文件头是 `SQLite format 3`，能打开，但里面没有最新的消息。

**原因**

解密脚本会判断「目标文件存在且 mtime 比源文件新」就跳过。之前用错账号解过一次，留下了一个同名文件，这次就被静默跳过了。

**解决**

强制重解：

```sh
rm -f <目标文件>
```

然后再跑一次解密。或者改脚本，去掉 mtime 判断，加一个 `--force` 参数。

**提前避免**

每次解密前先删目标文件。解密成本不高，省这个判断不值得。

---

### 9. WAL 回放后数据库损坏

**现象**

```
*** in database main ***
Page 12345: invalid rootpage
```

或者：

```
2nd reference to page 678
```

**原因**

微信的 WAL 是环形缓冲。一个 WAL 文件里同时存在十几个不同 salt 代次的帧——新帧在文件头部，旧帧在尾部。按顺序回放会跨越代次边界，页引用全乱。

按 salt 校验的增量解密会报 `patched frames 0`，一帧都打不上。

**解决**

没有可靠的解法。当天的消息如果还在内存缓冲里没落盘，回放 WAL 救不回来。

两条路：

- 等微信自己写盘（通常要重启客户端），然后重新 `full_decrypt`。
- 接受只用已落盘的部分，把时间窗口往前推一天。

**提前避免**

要当天的数据，提前一晚重启微信让缓冲区清空。或者每天固定时间导一次，别等攒到最后。

---

## C. 文案与事实

### 10. 凭记忆写情节，写出了一个不存在的事件

**现象**

文案写「某人给厂商算了一笔账」，旁白也顺着这么写。回头看原始记录，根本没有这回事——真实情节是「在某平台上养一条鱼，接口费每天 20 美元」。两件不相干的事被记忆缝成了一个合理的故事。

**原因**

记忆会自动补全逻辑。写文案时人在「叙事模式」里，会倾向于把零散信息串成因果，串出来的东西读着通顺，但跟事实无关。

**解决**

文案写完之后，逐条 grep 回原始记录：

```sh
grep -n "<关键词>" work/chat.txt
```

引语、时间、情节、数字，一个都不能凭记忆。

**提前避免**

写的时候就边写边查。每写一句涉及事实的话，立刻回到原始记录确认。事后统一核对，容易只核对「看起来可疑的」，而漏掉「读着很顺的」。

---

### 11. 数字是估的

**现象**

屏幕上写「几百条消息」「几十个人」，或者「大概三千瓦」。

**原因**

统计脚本跑完没仔细看，凭印象写了个约数。

**解决**

所有数字从统计结果里取，或者从原始记录里数：

```sh
grep -c "<模式>" work/chat.txt
```

**提前避免**

把统计输出（消息数、人数、时间窗口、每小时分布、发言排行）先落成一份 `stats.md`，写文案时只从这份文件里抄。屏幕上出现的每个数字都要能指回这份文件或某一行原文。

---

## D. 画面

### 12. `build.sh stills` 报找不到 timeline.json

**现象**

```
FileNotFoundError: [Errno 2] No such file or directory: '/d/work/newsreel/ep01/timeline.json'
```

文件明明存在。

**原因**

`build.sh` 里的内联 Python 用的是 `$P/timeline.json`，而 `$P` 在 Git Bash 里是 MSYS 路径 `/d/work/...`。这个字符串传给 Windows 版 Python，它不认识 `/d/` 这个前缀，当成相对路径处理，于是找不到。

**解决**

手动执行这一步，用 `cygpath -w` 转成 Windows 路径：

```sh
cd <项目>
WP=$(cygpath -w "$(pwd)")

T=$(.venv/bin/python -c "
import json; tl=json.load(open(r'$WP\\timeline.json')); ts=set()
for s in tl['secs']: ts |= {round(s['t0']+.4,2), round((s['t0']+s['t1'])/2,2), round(s['t1']-.3,2)}
for k,v in tl['hits'].items():
    if any(w in k for w in ('slam','stamp','ring','slip','tag_')): ts.add(round(v+.5,2))
print(' '.join(str(t) for t in sorted(ts) if t < tl['dur']))")

rm -rf stills && mkdir -p stills
cd <LIB>
node core/render/still.mjs "$WP" $T --out "$WP\\stills" --prefix s_
```

注意 Python 里用 `r'...'` 原始字符串，路径里的反斜杠才不会当转义。

**提前避免**

凡是「Git Bash 里拼路径、Windows 程序去读」的地方，一律先 `cygpath -w`。包括 `--out` 参数、传给 node 的目录参数。

---

### 13. 竖版报纸按高度适配后两边全空，推近又把三栏切掉

**现象**

按高度适配，画面里报纸只占中间 766 px 宽，两侧全黑。改成推近 3.1 倍，左右两栏被片门切掉，引语框被底部字幕带压住。

**原因**

16:9 片门里放竖版纸张，只有两种选择，都有问题：

- 按高度适配：宽度严重不足。
- 按宽度适配：高度溢出，但可以纵向摇移。

推近是把整体放大，不是换适配方式，所以切掉的是内容而不是空白。

**解决**

按宽度适配，纵向摇移：

```js
const sW = (GW + 10) / NP.width;   // 宽度铺满片门
// 摇移终点用反算：让目标元素落在画面某个 y 位置
const atY = (py, Y) => (py - Y + GH / 2 / s) / NP.height;
```

三个停靠点：报头 → 大标题 → 引语框。引语框的落点要抬到字幕带以上。

**提前避免**

竖版素材进横版画面前，先算一遍「按宽适配后的可视高度是多少」，再决定要不要摇移。

---

### 14. 片头英文标题左右被切

**现象**

长标题按固定字号渲染，两端超出片门。

**原因**

字号是按中文标题定的，英文单词宽度差异大，同一字号下宽度可能超出 30%。

**解决**

按可用宽度反算缩放系数：

```js
c.font = `${size}px Limelight`;
const w = c.measureText(big).width;
const k = Math.min(1, (GW - 120) / w);
```

然后 `c.scale(k, k)`。

**提前避免**

任何「用户填内容、字号写死」的地方，都要有按宽度自适应的兜底。

---

### 15. 左上角时间卡压住标题

**现象**

场景标题牌被左上角的地点/时间卡盖住第一个字。

**原因**

时间卡的实际宽度取决于里面那行英文的长度，模板里写的安全区是按短内容估的。

**解决**

把安全区常量改成实测值：

```js
const TAG_ZONE = { x0: 48, y0: 56, x1: 600, y1: 170 };
```

改完所有场景的标题都要重新避让——右上角右对齐、或者下移。

**提前避免**

先把时间卡按最长内容渲染一次，量出右边界，再定安全区。别按平均值估。

---

### 16. 指针穿过表盘上的文字

**现象**

指针式仪表，文字放在圆心附近，指针扫过时把字切成两半。

**原因**

指针是从圆心出发的半径，圆心周围一圈都是它的活动范围。任何放在圆心附近的文字都会被扫到。

**解决**

把文字挪到指针扫不到的空白区。弧形刻度从 `-π*1.24` 到 `π*0.24` 时，下方会留出一个楔形空白，正好放标签。

**提前避免**

画表盘前先画一遍指针的扫掠范围，文字只能放在范围外。

---

### 17. 配电箱的电闸是空黑条

**现象**

四个黑色长条，看不出是开关，也没有「开着/跳了」的区别。

**原因**

只画了槽位和滑块，没画导轨、手柄和刻度。

**解决**

加三样东西：

- 两侧的导轨刻度线和 ON/OFF 小标
- 滑块上的凸起手柄
- 跳闸时的位置差（往下 146 px）和颜色差（亮色 → 暗色）

**提前避免**

画任何机械件之前，先问「不动的时候它长什么样」。只画变化后的状态，观者没有参照。

---

### 18. 投影段落开头有 0.35 秒空画面

**现象**

切进这一段的头几帧什么都没有，然后投影才亮起来。

**原因**

投影锥的起亮时间设在切点之后 0.4 秒。这 0.4 秒里画面是空的。

**解决**

把起亮时间提到切点本身，让「切进来」和「灯亮」同时发生。

**提前避免**

每个段落的第一帧都要在联系表里看一眼。采样点从 `t0 + 0.35` 开始采，容易刚好错过空帧——补一个 `t0 + 0.05`。

---

### 19. 底部被字幕带切掉

**现象**

天气板、蓝图标题栏的下沿被字幕压住。

**原因**

画面元素按整个 1080 高度布局，没扣掉底部字幕带（约 120 px）。

**解决**

整体上移，或者按可用高度（`GH - 字幕带高度`）重新居中。

**提前避免**

布局时先画一个「字幕带禁区」，所有内容都在禁区上方。

---

### 20. 字幕和画面上的引语牌文字完全重复

**现象**

旁白念的是「产品是一整套团队技术和服务体现」，画面引语牌也是这句，同一句话在屏幕上出现两遍。

**原因**

写旁白时直接抄了引语，没考虑画面上已经有这块牌子。

**解决**

改写旁白，让它跟引语形成补充而不是复读。比如引语是原话，旁白就说这句话在解释什么。

**提前避免**

写旁白时对照场景清单，凡是画面上会出现的文字，旁白都不要原样重复。

---

## E. 时间线

### 21. 改了旁白没重跑配音，卡点全错位

**现象**

画面切点和旁白对不上，旁白念到一半就切走了。

**原因**

时间线是按配音实测时长算的。改了 `lines.json` 但没重新生成配音，`dur.json` 还是旧的，时间线自然错。

**解决**

按顺序重跑：

```sh
python voice/make.py
cd <LIB> && .venv/bin/python core/tts/tts_zh.py <项目>/voice/tts_lines.json <项目>/voice/out
cd <项目> && python tools/timeline.py
```

**提前避免**

把「改旁白」和「重跑配音 + 时间线」绑成一个动作。改一个字也要重跑。

---

### 22. 片头标题读字时长不够

**现象**

`readcheck` 报片头不合格。26 个字符的标题按 4.5 字/秒算需要 2.97 秒，实际只给了 2.12 秒。

**原因**

片头段只占两小节（2.4 秒），中间还有 iris 收拢的动画时间。

**解决**

给片头多留一小节。可以改 `b()` 函数，也可以单独调 `SECS` 的起点：

```python
b = lambda bars: round(G0 + (bars + (1 if bars >= 3 else 0)) * BAR, 4)
```

这一行让所有 `bars >= 3` 的时间点整体后移一小节，等于片头变长而后面不变。

**提前避免**

长标题的段落，先按 `字数 / 4.5 + 1.5` 算需要多久，再定段落长度。

---

### 23. 时间线警告没清就渲染

**现象**

`timeline.py` 打印了 OVERLAP / SPILL / LONG，但被忽略了，成片里旁白粘连、念到下一段。

**原因**

警告是打在标准输出的，跟正常报告混在一起，容易被当成日志扫过去。

**解决**

三类警告逐条修：

- `OVERLAP`：相邻台词间隔不足 0.15 秒 → 后一句往后推。
- `SPILL`：台词超出所在段落 → 缩短台词或延长段落。
- `LONG`：单句字幕过长 → 拆句或精简。

改完重跑，直到输出 `OK`。

**提前避免**

把「看到 OK 才能进下一步」写进流程。这一步不通过，后面全是返工。

---

## F. 音视频

### 24. 音色采样库下不来

**现象**

`sh tools/fetch.sh instruments vsco2ce` 卡住或失败。670 MB 的包在 GitHub releases 上，`github.com` 不通，几个镜像（ghproxy、gh-proxy、ghfast）也全挂。

**原因**

release 资源走 `objects.githubusercontent.com`，跟 `raw.githubusercontent.com` 不是一条链路。前者在这类网络里通常不可达。

**解决**

不动编排，只换音源。

配乐脚本的乐谱部分（节奏、和弦、声部、音量闪避、母带）都在 `audio/mix_band.py` 里，跟音色无关。它只依赖一个函数：

```python
sampler.render(events, dur=None, master=True)
# events: [(t, inst, pitch, dur, vel, pan, gain), ...]
```

写一个纯 numpy 的版本替换它，用减法合成做铜管、簧管、钢琴，用噪声包络做打击乐，然后把原谱原样跑一遍：

```python
from core.audio import sampler as S
import synth
S.render = synth.render
runpy.run_path("audio/mix_band.py", run_name="__main__")
```

音色不如真采样厚，但音高、时长、力度、声部关系全对。

**提前避免**

设计配乐时就把「音源」和「编排」分开。编排不依赖具体采样，换音源就不用重写。

---

### 25. 人声被配乐盖住

**现象**

解说几乎听不清，得把音量调大才勉强分辨。

**原因**

配乐整体电平太高。实测人声只比配乐高 1.1 dB，目标应该是 8 到 12 dB。

**解决**

压低配乐。如果用了替代音源，加一个整体衰减系数，扫弦类声部单独再压一次。

验证：

```sh
.venv/bin/python -c "
import soundfile as sf, numpy as np
x,sr=sf.read('out/mix.wav',dtype='float32')
w=int(2*sr)
r=[20*np.log10(np.sqrt((x[i:i+w]**2).mean())+1e-9) for i in range(0,len(x)-w+1,w)]
print(' '.join(f'{v:.0f}' for v in r))"
```

看每 2 秒的 RMS。有人声的段落应该比纯配乐段落高 8 dB 以上。

**提前避免**

混音完先量一次，再合成。合成完再改，等于白跑十几分钟。

---

### 26. 渲染卡在 0%，或者内存吃满

**现象**

`video.mjs` 启动后长时间没进度，或者系统开始换页、卡死。

**原因**

`--workers` 开太多。每个 worker 是一个 Chromium 实例，各占几百 MB。

**解决**

8 GB 内存开 4 个，16 GB 可以开 6 到 8 个。76 秒的片子 4 进程大约 10 分钟。

**提前避免**

按 `内存 GB / 2` 估算 worker 上限，别直接抄别人的数字。

---

## G. 交付

### 27. 交付目录里躺了好几个视频，用户不知道要哪个

**现象**

`out/` 里有：无声画面、混音 wav、全码率母版、压缩版。用户打开文件夹，看不出哪个是成品。

**原因**

流水线的中间产物和最终交付物放在同一层。

**解决**

分层：

```
out/
├── <name>.mp4          # 交付物
├── <name>-full.mp4     # 母版
├── DELIVERY.md         # 说明
├── qc/                 # 抽帧核对图
└── _raw/
    ├── video.mp4       # 无声画面
    └── mix.wav         # 混音
```

**提前避免**

从第一个文件产生时就分好层。等交付时再整理，容易漏。

---

## 附：工具层面的两个小约束

### A. 覆盖已有文件前必须先读

多数 Agent 的写文件工具会拒绝「没读过就覆盖」，报 `File has not been read yet`。覆盖前先用读工具读几行，哪怕只读 3 行。

### B. 长命令放后台

渲染、合成都是十几分钟的量。前台跑会占住会话，而且容易超时。用后台任务，完成时收输出。

---

## 编号索引

| 编号 | 一句话 |
|---|---|
| 1 | `gh` 401 就用 `git clone` |
| 2 | Python 用虚拟环境的绝对路径 |
| 3 | 建 `.venv/bin/python` 垫片 |
| 4 | 字体直连 `raw.githubusercontent.com` |
| 5 | 提前装 Chromium |
| 6 | 假设只有工作区可写 |
| 7 | 微信库按大小挑，别用自动检测 |
| 8 | 解密前先删目标文件 |
| 9 | WAL 环形缓冲回放不可靠 |
| 10 | 情节必须 grep 回原文 |
| 11 | 数字必须能回溯 |
| 12 | 路径用 `cygpath -w` |
| 13 | 竖版素材按宽适配 + 摇移 |
| 14 | 标题按宽度自适应 |
| 15 | 安全区按实测定 |
| 16 | 表盘文字避开指针扫掠区 |
| 17 | 机械件要画静止态 |
| 18 | 段落首帧要检查 |
| 19 | 布局扣掉字幕带 |
| 20 | 旁白不要复读画面文字 |
| 21 | 改旁白就重跑配音和时间线 |
| 22 | 长标题先算读字时长 |
| 23 | 时间线警告清零再渲染 |
| 24 | 音源与编排分离 |
| 25 | 人声高于配乐 8–12 dB |
| 26 | worker 数按内存估 |
| 27 | 交付目录分层 |
