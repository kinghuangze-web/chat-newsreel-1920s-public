# 运行、输入和输出契约

Skill目录本身不含私人素材或模型。建议每期在独立项目目录制作，使用环境已有依赖；不要把既有个人路径写进分发包。

## 辅助脚本依赖

| 能力 | 依赖 | 输出与未覆盖 |
|---|---|---|
| 单时钟排程 | Python 3.10+标准库；计划JSON；实际解码WAV，或明确标记的时长JSON | timeline.json和同名SRT；不合成语音、不判断事实含义 |
| 实际MP4技术检查 | Python、PATH中的FFmpeg/FFprobe | hash、完整解码、规格/响度及可选PNG取样；内容/画面/声音仍NOT_CHECKED |
| Canvas保护回归 | Node 20+；调用者提供Lemo根目录及其playwright-core/Chromium | 6项真实画布不变量；不代表一条新闻片通过 |
| 视频渲染 | Lemo-Opuscar的Node/Chromium渲染运行时 | 消费项目index.html及window.render/READY/DUR，生产工程由Codex按事件实现 |
| 旁白、混音 | 选用TTS服务或本地模型、FFmpeg；Lemo混音还需其Python音频依赖 | 真实语音时长和实际混音；在线服务不是离线处理 |

Lemo基准版本为`413a6bd6d78ebd3bdd5abaec9538a26867f890df`（MIT），来源：https://github.com/lemomo-ai/lemo-opuscar 。这表示所用基准，不宣称它是最新版本。

## 输入示例

`assets/episode.example.json`全部为虚构内容。每个事实句有`source_ids`；正式制作时这些ID对应本地完整记录/媒体台账。`stories[].bridge.relation`写上一件与下一件为何相接，`bridge.line_id`对应editorial句；字段存在不证明关系合理，仍需编辑审阅。

将音频解码为PCM WAV，文件名对应旁白ID，例如`voice/out/H0.wav`。脚本按实际采样数测时长：

```powershell
python scripts/schedule.py assets/episode.example.json --voices <voice-directory> --out <project>/timeline.json
```

只验证数据契约时可以用示例时长：

```powershell
python scripts/schedule.py assets/episode.example.json --durations assets/durations.example.json --out <scratch>/timeline.json
```

第二条输出`duration_basis=provided_json_unverified`，不是真实配音验收。路径均为调用者提供的路径占位符，不复制到生产配置。脚本对实际WAV输出`measured_wav`，但采样长度仍不证明它念了正确内容。

时间线默认经典片头4秒，主持与各事件按实际语音加自然间隙排程。`min_seconds`供必要媒体展示使用。末句读完约0.3秒结束。根据本期契约修改这些默认值，媒体、动作拍点与音乐另由项目补入同一时钟；不能把辅助排程当成完整导演程序。

## 制作工程与渲染

项目给Lemo提供`index.html`，加载字体与本地素材后置`window.READY=true`，暴露`window.DUR`和确定性的`window.render(t)`。画面按不同事件实现；`assets/guards.mjs`可以复制到项目，用于最终光圈与文字边界。不把真实项目整体复制进Skill。

```powershell
$env:PLAYWRIGHT_CHROME = '<installed-chrome-executable>'
node <lemo-root>/core/render/video.mjs <project> --workers 3 --fps 24 --out <project>/out/picture.mp4
node scripts/check_guards.mjs <lemo-root> <scratch>/canvas-check
```

FFmpeg混入当前语音/音乐，输出H264 yuv420p、AAC双声道、faststart的实际交付MP4；按本期声音设计选择总响度目标（常用-16至-14 LUFS），峰值<=-1 dBTP。画面渲染、混音合成与最终检查按依赖顺序完成。字体、上游Node依赖和音频依赖依照所用Lemo版本准备；本Skill不会悄悄安装系统程序或新建外部桥接。

## 检查当前文件

```powershell
python scripts/inspect_video.py <delivery.mp4> --timeline <project>/timeline.json --frames <scratch>/frames --out <scratch>/technical.json
# 本期选择-16 LUFS时，显式记录该目标；不改变混音，只改变技术检查目标。
python scripts/inspect_video.py <delivery.mp4> --target-lufs -16 --out <scratch>/technical.json
```

脚本检查MP4视频时长与时间线；取场景边界附近、hits及最后一帧，PNG避免最后帧JPEG编码范围问题。`--allow-silent`仅用于明确的技术测试片，不用于生产通过。全片画面序列、全部重要文字覆盖和实际音轨审听由制作过程另留证据，按acceptance.md报告。

## 有效验证的层次

Skill结构通过、脚本在虚构输入上通过、真实MP4技术检查通过、一次全新授权素材端到端成片通过是不同结果。只报告已执行层级。安装到本机目录后需由客户端重新发现才能出现在其列表；不能仅凭复制文件宣称当前聊天已加载或跨宿主可用。
