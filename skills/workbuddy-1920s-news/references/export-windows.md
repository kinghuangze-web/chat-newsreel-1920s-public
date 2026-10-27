# 微信导出：Windows 上的实际操作顺序

根目录 `chat-export.md` 推荐 `wechat-cli`，macOS 上够用。Windows 上这条路会断两次，断点都在「选库」环节，跟命令语法无关。这份文件补的是选库和兜底解密。

## 1. 先试标准路径

```sh
npm install -g @canghe_ai/wechat-cli
wechat-cli init
wechat-cli history "<群名>" --start-time "YYYY-MM-DD 00:00" --end-time "YYYY-MM-DD 23:59" > chat.json
```

报 `sqlite3.DatabaseError: file is not a database` 就往下走。这个报错跟群名、权限、微信版本都无关，是它挑错了库。

## 2. 断点一：自动检测挑中废弃账号

**现象**

微信数据目录下有多个账号目录，`auto_detect_db_dir()` 挑中的不一定是当前在用的那个。废弃目录里的 `contact.db` 是个几百字节的空壳，一解密就报「不是数据库」。

**判断方法**

按 `contact.db` 大小挑，取最大的那个：

```sh
ls -l "<微信数据根>/xwechat_files"/*/db_storage/contact.db
```

实测量级：正确库 20 MB 上下，废弃库不到 200 KB。差两个数量级，一眼能看出来。

**另一个线索**

`~/.wechat-cli/config.json` 里通常记着上次初始化时用的库路径。如果这个文件存在，优先信它，不要信自动检测。

## 3. 断点二：解密结果被复用成旧数据

**现象**

第一次解密成功后，改了解密脚本再跑，读到的还是旧内容。或者换了一个账号目录，解出来的仍是上一个账号的数据。

**原因**

解密工具有「目标文件比源文件新就跳过」的优化。它按 mtime 判断，但不同账号的库文件 mtime 可能刚好满足跳过条件。

**解决**

每次解密前先删目标文件，强制全量重解：

```sh
rm -f "<输出目录>/contact.db" "<输出目录>/message_*.db" "<输出目录>/session.db"
```

解密成功的标志：文件头是 `SQLite format 3`，`PRAGMA page_size` 返回 4096。

## 4. 断点三：WAL 增量回放会写坏库

**现象**

今天的消息导不出来，但库里明明有。想通过回放 WAL 补上，回放后 `PRAGMA quick_check` 报 `invalid rootpage` 或 `2nd reference to page`。

**原因**

WAL 是环形缓冲，同一个文件里可能压着十几个 salt 代次，新帧在文件头部、旧帧在尾部。按文件顺序正放或倒放都会把不同代次的帧混在一起，页号对不上就写坏了。

**结论**

不要尝试回放。**今天刚发的消息很可能还在微信进程的内存里，没落盘**。等微信自己 checkpoint，或者让用户重启微信。

这次制作的实际处理：确认当天消息拿不到之后，改成只用前一天的全天记录。这是产品决策，不是技术妥协——片子可以晚一天，数据不能编。

## 5. 兜底：自己解密

`wechat-cli` 的 `wechat_cli.core.crypto` 里有现成函数，可以直接调：

```python
from wechat_cli.core.crypto import full_decrypt
full_decrypt(src_db_path, dst_db_path, key_hex)
```

参数：

| 项 | 值 |
|---|---|
| 加密方式 | SQLCipher 4 |
| 页大小 | 4096 |
| 每页尾部保留 | 80 字节（IV 16 + HMAC 64） |
| 页内算法 | AES-256-CBC |
| 头部 | 解密后前 16 字节是 `SQLite format 3\0` |

密钥从 `wechat-cli init` 时生成的配置里取。没有配置就先跑一次 `init`。

## 6. 定位目标群

群 id 形如 `<数字>@chatroom`。在 `contact.db` 里按群名模糊查：

```sql
SELECT username, nick_name FROM contact WHERE nick_name LIKE '%<关键词>%';
```

同名群可能不止一个，取成员数最多或消息量最大的。确认 id 之后再进 `message_*.db` 找消息。

## 7. 精确解析

三个必须做的处理，缺一个导出的记录就会错：

**发言人映射。** `message_*.db` 里存的是 `wxid_*` 或内部 id，真实昵称在 `Name2Id` 表里。不映射就只能看到一堆 id。

**引用解析。** 引用消息的正文里嵌着 `<refermsg>` XML，需要拆出来单独处理，否则原文里会混进一大段标签。

**类型归一。** 图片、视频、语音、链接、文件都是 XML 或二进制，统一压成 `[图片]` `[视频]` `[链接]` `[文件]`，跟 `clean_chat.py` 的预期一致。

系统消息的发送者可能是一个内部 id（形如 `id17`），不是真实成员。这类消息不进统计。

## 8. 输出格式

必须和根目录 `chat-export.md` 的格式一致，下游脚本才能直接用：

```json
{"chat": "<群名>", "messages": ["[YYYY-MM-DD HH:MM] 昵称: 内容", "..."]}
```

时间用 `YYYY-MM-DD HH:MM`，方括号包裹，昵称后用冒号加空格。日期格式差一个字符，`clean_chat.py` 的解析就会全错。

## 9. 隐私

导出结果是隐私数据。只在本地处理，不进仓库，不贴进 issue，不写进任何要提交的文件。仓库的 `.gitignore` 已经把 `work/`、`tools_local/` 排除在外，不要为了「方便」把它们加回来。
