# 制作手册：工程、时间线、场景、渲染

## 1. 环境
```sh
git clone https://github.com/lemomo-ai/lemo-opuscar ~/lemo-opuscar     # = $LIB
cd ~/lemo-opuscar && sh plugin/skills/lemo-opuscar/scripts/setup.sh deps        # node 依赖 + .venv（numpy/soundfile/soxr/scipy/edge-tts …）
sh plugin/skills/lemo-opuscar/scripts/setup.sh deps music                      # 乐队模式需要的乐器采样（core/audio）
cp -r <this-repo>/templates/project ~/films/ep04 && cd ~/films/ep04
sh tools/fetch_fonts.sh                                                        # Limelight / Oswald / Noto Sans SC / Noto Serif SC（OFL）
```
需要：Node ≥ 20、Python 3.10+、ffmpeg、Chromium（Playwright 用；Linux 上 `export PLAYWRIGHT_CHROME=$(readlink -f $(command -v chromium))`）、联网（edge-tts 配音、取天气）。
系统软件缺了就告诉用户，不要自己装系统级软件。

## 2. 工程结构（templates/project）
```
parts/0_head.html     画布 1920×1080、字体加载、读 timeline.json / voice/out/dur.json / assets/map.json
parts/a_content.js    CONTENT：屏幕上所有的字（每期改这里）
parts/a_helpers.js    帧/缓动/铅笔圈 pencil()/ring()、地球、射灯、银色字 silverText、decoTitle、桌面背景
parts/b_lib.js        道具库：paperTex、T/para/wrap、lay、slamS/jolt、slipCanvas、stampCanvas/stamp、clockFace、wxIcon、plate、pbox
parts/b_scenes.js     本期场景 + SCN 注册表 + FOOTAGE + TR（转场）+ IRIS
parts/c_compose.js    场景合成 + 转场（wipe / flip / blinds / clock / irisopen / fade）+ 光圈
parts/d_type.js       胶片质感 filmLook、字幕条、双语字幕、地点卡 tagCard、SUBCHECK
parts/e_tail.js       window.render(t) / TEXTS / EV / READY
tools/timeline.py     唯一的时钟：分段、拍点、台词、地点卡 → timeline.json + 检查报告
voice/lines.json      旁白（id / zh / en / 可选 say）；voice/make.py → tts_lines.json
audio/mix_band.py     乐队模式配乐；audio/mix_record.py 唱片模式；audio/foley.py 音效 + 播音腔处理
build.sh              voice | timeline | page | stills | video | mix | mux | small | all
```
index.html 由 parts 按顺序拼接（build.sh page），**不要手改 index.html**。

## 3. 画面分层（来自 styles/newsreel/STYLE.md，固定）
- 1920×1080 黑底，中间 1480×1080 的**片门**（GX=220，圆角 26），画面层在片门里：灰度 + 乳白/暖黑调色 + 暗角 + 划痕/尘点（仅 FOOTAGE 段）+ 闪烁与片门抖动（仅 FOOTAGE 段）。
- 字的层（字幕、地点卡）在胶片效果**之上**，保持锐利，不抖。
- 片头/字卡/片尾不算 FOOTAGE（稳定、不抖）。
- 字体：Limelight（片头、字卡、数字）、Oswald（英文标签）、Noto Serif SC 900（中文标题）、Noto Sans SC（中文正文/字幕）。

## 4. 时间线与拍点（tools/timeline.py）
- `b(bars)` = 小节位置 → 秒。四分之一小节 = 一拍。所有切点、slam、印章、铅笔圈都放在拍上（`b(16.75)`）。
- **乐队模式**：BPM 200（小节 1.2 s），G0 = 0。更燃 220，更温情 160–180。
- **唱片模式**：BEAT = 实测（measure_bgm.py），M0 = 唱针落下的片内时间（EP.03 = 1.0 s），G0 = M0 + 录音里第一个强拍的偏移（0.16 s）。剪接点 `splice` 也写成 hit，并与 mix_record.py 的 SEGMENTS 一致。
- 台词起点：放在段落开始后 0.2–0.4 拍、或道具落定之后；每句间隔 ≥ 0.15 s。
- 地点卡（TAGS）：段首 +0.2–0.4 s 出现，停留 ≥ 3 s，不跨段。
- 报告里的 OVERLAP / SPILLS / too long / tag holds 全部修到 OK 再往下走。
- 时长：1 分钟片 ≈ 50 小节 @200BPM；2 分钟片按唱片长度定。

### Hit 命名约定（audio/foley.py 按名字自动配音效）
`*_slam / slam_*` 重物落下；`stamp*` 盖章；`strip*` `arc_*` 电报滴答；`*ring*` 铅笔圈；`deal0` `rep0` 每拍一张纸条（快门声）；`wipe_* push_* cut_* iris_* clock_wipe` 呼啸；`flip_*` 翻卡；`blinds_*` 百叶窗；`count0/count1` 计数翻页；`stop_card` 乐队急停；`stop_btn` 最后的急停（之后只剩钟声）；`end_hit1/end_hit2` 结尾「da–DA!」；`music_end` 唱片终止和弦；`splice` 唱片剪接点。

## 5. 写场景（parts/b_scenes.js）
契约：`function sceneX(c, t)` 在片门画布 `c`（GW×GH=1480×1080）上画**绝对时间 t** 的画面。
- 时间只来自 `HIT.xxx` / `SEC.id.t0/t1` / `BEAT`，文字只来自 `CONTENT`。不写死秒数。
- 道具画布在加载时建好（顶层 `const X = mk(w,h); { …画… }`），场景里只做变换 + drawImage。
- 动作语汇：`slamS(t, T0)` 从大到小砸下 + `jolt()` 震动；`eo/ei/eio/ss/back` 缓动；`seg(t,a,b)` 归一化；`lay(c, im, x, y, s, rot, alpha)` 放道具带投影；`pencil(c, ring(...), u)` 白色铅笔圈；`pencilDark` 纸上铅笔下划线。
- 画在片门里的字要 `pbox(id, text, x0, y0, x1, y1)` 注册（readcheck 用）。
- 每个新场景：在 `SCN` 注册；该不该抖（FOOTAGE）；转场写进 `TR`（每种转场全片最多一次，其余全是卡拍硬切）；需要光圈收/开写进 `IRIS`。
- 左上角地点卡区域 `TAG_ZONE`（约 x 30–470、y 50–165）是禁区：标题/报头/人脸/关键字不能落进去，推近后的最终构图也要避开。
- 新场景先单独出 3～5 张静帧看构图，再接入全片。

## 6. 转场规则
硬切为主，全部卡拍。特殊转场每种最多一次：wipe（斜擦）、blinds（百叶窗，进字卡）、irisopen（光圈开）、flip（翻卡）、clock（钟表擦除，进最后一条）、fade（片尾卡，过黑）。片头结尾光圈收，结束 ident 光圈开。

## 7. 静帧检查
`sh build.sh stills` → `stills/_sheet.jpg`（每段 3 张 + 每个 slam/stamp/ring/deal 之后 0.45 s）。
单独看某几帧：`cd $LIB && node core/render/still.mjs <project> 12.5 30.2 --out /tmp/x --prefix v2_`（换前缀避免看图缓存）。
联系表：`$LIB/.venv/bin/python $LIB/core/render/sheet.py out.jpg a.jpg b.jpg … --cols 4`。
可读性脚本 `node core/render/readcheck.mjs <project> --step 0.1` 很慢（整片可能 > 5 分钟），时间紧就靠联系表人工查。

## 8. 渲染与交付（实测耗时：CPU 服务器、无 GPU、24 fps）
| 步骤 | 命令 | 耗时（1 分钟片 / 2 分钟片）|
|---|---|---|
| 画面 | `sh build.sh video`（4 workers） | ~4 / ~6 分钟 |
| 混音 | `MIX=band sh build.sh mix` 或 `MIX=record` | ~1 分钟 |
| 合成 | `sh build.sh mux`（两遍 loudnorm −14 LUFS + 胶片颗粒 7） | ~10 / ~15 分钟 |
| 压缩 | `sh build.sh small`（1280 宽 CRF 23 AAC 160k faststart） | ~1 分钟 |
重任务一个一个跑；mux 完成（输出文件出现且日志打印响度）后再压缩。成片 1 分钟 ≈ 8 MB，2 分钟 ≈ 17 MB。

## 9. 修改轮
只改点名的地方 → 只出受影响那一幕的静帧给用户看 → 确认后再出全片。改台词 = 重新配音 + 重跑 timeline.py + 检查后面所有台词有没有被挤动。
