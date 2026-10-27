# 导出微信群聊天记录

推荐 wechat-cli（本地解密、只读）：
```sh
npm install -g @canghe_ai/wechat-cli      # 或 pip install wechat-cli
sudo wechat-cli init                      # 微信保持登录
wechat-cli history "群名" --start-time "YYYY-MM-DD HH:MM" --end-time "YYYY-MM-DD HH:MM" > chat.json
wechat-cli stats "群名"
wechat-cli search "关键词" --chat "群名"   # 查梗的源头
```
- 要求：macOS ≥ 26.3.1 且微信 Mac 版 ≤ 4.1.8.100（也支持 Windows/Linux）；终端要开「完全磁盘访问」；报 `task_for_pid failed` 按其 README 给微信重签名。需要用户输密码/授权时停下来让用户操作。
- 导出格式：`{"chat": …, "messages": ["[YYYY-MM-DD HH:MM] 昵称: 内容", …]}`；导出者本人显示为 `me`；图片/视频/链接是 XML，`clean_chat.py` 会缩成 `[视频]` `[图片]` `[链接] 标题`。
- 消息少于 300 条时，问用户要不要把窗口拉长。
- 聊天记录是隐私数据：只在本地处理，不提交仓库，不贴进公开 issue。
