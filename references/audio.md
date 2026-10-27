# 声音手册：配乐、配音、音效、混音

两种配乐模式，二选一（build.sh 里 `MIX=band|record`）：

| | 乐队模式 band（EP.01/02） | 唱片模式 record（EP.03） |
|---|---|---|
| 音乐 | 代码写的原创 Charleston 爵士乐队（core.audio 采样器：小号/弱音小号/长号/大号/班卓/单簧管/定音鼓/军鼓/木鱼/钟琴） | 真实曲目（观众点播），当成 78 转唱片放 |
| 时钟 | BPM 200，G0 = 0 | 实测 BEAT，M0 唱针落下，G0 = M0 + 首强拍偏移 |
| 脚本 | `audio/mix_band.py` | `audio/mix_record.py` |
| 版权 | 无问题 | 不入库；片尾写点播人和来源；不确定版本就问 |

## 1. 乐队模式
结构全部从 timeline.json 推出来：片头号角（beams_on）→ 第一条新闻起乐队进（第一小节轻）→ 8 小节旋律循环（弱音小号 / 开放小号+单簧管交替）→ `stop_card` 急停 + 定音鼓滚奏（字卡期间）→ 乐队回来 → `stop_btn` 最后一记重音，之后**只有钟声** → `end_hit1/end_hit2`「da–DA!」终止和弦（音乐到此结束）→ 片尾卡下一小段单簧管尾声。
地图弧线落点加钟琴，复读纸条每拍一声木鱼。改情绪：BPM（timeline.py）、旋律 MEL、和声 P8。

## 2. 唱片模式（观众点播）
1. **拿到音频**：最好请用户直接发文件。否则：yt-dlp（B 站常 412、YouTube 常要人机验证）→ 失败就用浏览器打开视频页、读 `window.__playinfo__.data.dash.audio` 最高码率地址下载（`tools/fetch_bili_audio.mjs`，从 $LIB 运行）→ `ffmpeg -i x.m4s -ac 2 -ar 48000 audio/bgm_src.wav`。
2. **确认版本**：群友分享的是哪一版（EP.03 示例成员乙分享「中央气象台天气预报」，DemoUser 报出曲名《渔舟唱晚》）。找到的版本不一定是同一个 → 交付时问用户，可替换后重出。
3. **测量**：`$LIB/.venv/bin/python tools/measure_bgm.py audio/bgm_src.wav` → BEAT、首强拍、循环长度、剪接候选。EP.03 实测：128 拍 = 67.42 s（≈114 BPM），首强拍 0.16 s，32 小节一遍、8 小节一句。
4. **剪接**：片长不够/太长时在**小节线**上把两段接起来：同一乐句位置、和声相似（chroma 相似度高）、60 ms 交叉淡化。EP.03：第 1 遍放到第 32 小节（67.58 s）→ 接第 4 遍第 16 小节（236.13 s）一直放到终止和弦（277.34 s）。导出接缝前后 10 秒听一遍。
5. **时间线**：timeline.py 设 `MODE="record"`、BEAT、M0、G0；`splice` hit = M0 + 第一段长度；`music_end` = 终止和弦；片尾卡在 music_end 之后。
6. **78 转处理**（mix_record.py 已实现）：1.3 Hz 偏心抖动（wow）、带通 110–6500 Hz + 900–2600 Hz 喇叭共振、tanh 轻度饱和；噼啪声/嘶声/隆隆声**只在唱针落下期间**；开头唱臂摆过 + 唱针落下，结尾唱针抬起。
7. 可选段落效果：测试卡 PLEASE STAND BY 时音乐变闷（低通 450 Hz）+ 1 kHz 测试音（`standby` 段）。

## 3. 配音
- edge-tts `zh-CN-YunjianNeural`，`rate +22%`、`pitch +6Hz`（快、亮的新闻片腔）。`$LIB/core/tts/tts_zh.py`，需联网；输出 24 kHz wav + dur.json。
- `say` 字段写实际读法；字幕显示 `zh`。
- 播音腔处理 `foley.period_voice()`：260–3700 Hz 喇叭频段 + 1.5–2.3 kHz 存在感峰、碳粒话筒失真、压缩、wow & flutter、小录音棚两次早反射。
- 本地离线备选 Kokoro（tts.py，lang cmn），音色平，且需用 asr_check.py 验证；能联网就用 edge-tts。

## 4. 音效（foley）
按 hit 名字自动配（见 production.md §4 命名约定），特殊的手动加：风声（EP.03「防风」）、倒水（水杯金句）、电报滴答、翻页、快门、铅笔吱声、印章重击、纸张拍落、唱针。放映机底噪（24 fps 抓片爪 + 马达 + 嘶声）全程很轻地垫着。

## 5. 混音与响度
- 人声出现时压低音乐：band ×(1−0.45)，record ×(1−0.5)，包络 180–200 ms。
- 乐队模式整体做时代带宽（95–7500 Hz，削低频）+ tanh。
- 混合：band `mus×1.2 + fx×0.85 + vo×1.05`；record `mus×0.62 + fx×0.85 + vo×1.05`；限幅 0.95。
- 自检：mix 脚本打印「人声 / 人声下的音乐」，人声应高 8–12 dB。
- 最终响度由 `mux.sh` 两遍 loudnorm 做到 −14 LUFS / TP −1.2，并打印实测值；偏离 ±1 LU 会警告。

## 6. 结尾规则
音乐必须在自己的终止和弦上结束（乐队 da–DA! / 唱片原曲结尾），不要淡出；片尾字幕卡在音乐之后，只留放映机声和一点尾声。
