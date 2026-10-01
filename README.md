# 塔菲PK — 讯飞E听说 自动答题脚本

> 通过 CDP（Chrome DevTools Protocol）注入页面，自动作答 **E听说** 的 **单词PK** 与 **词汇训练** 题目。
> 内置 **人教版高中英语（必修1–3 + 选择性必修1–4，共七册）2569 词** 词库。

⚠️ 仅供个人学习与技术研究使用，请勿用于任何作弊、商业或其他不当用途。使用产生的后果由使用者自行承担。

---

## 特性

- 连接客户端自带的 CEF 调试端口 `127.0.0.1:10086`，无需改客户端文件
- 支持页面：`#/pk`（单词PK：英译中 + 中译英）、`#/homeworkWordQuestion`（词汇训练：英译中）
- 内置 2569 词词库，自动匹配作答
- 左下角悬浮 HUD 显示运行状态
- 守护模式：页面刷新 / 切换作业后自动重新注入
- 快捷键：`F8` 开始/暂停，`F9` 退出并清理

## 文件说明

| 文件 | 作用 |
| --- | --- |
| `ets-pk-auto.js` | 驱动脚本，负责连端口、注入、下发命令 |
| `pk-auto-inject.js` | 注入到页面里执行的答题逻辑 |
| `vocabulary.json` | 词库（人教版高中英语七册 2569 词） |
| `塔菲PK-启动.cmd` | 双击启动（安装注入） |
| `塔菲PK-开始暂停.cmd` | 双击切换 开始/暂停（不依赖窗口焦点） |
| `塔菲PK-守护.cmd` | 守护模式，页面刷新后自动重注入 |
| `塔菲PK-停止.cmd` | 停止并清理 |

## 环境要求

- Windows
- Node.js（建议 18+，需要内置 `WebSocket` 与 `fetch`）
- 已安装并运行的 讯飞E听说 客户端（渲染进程开放调试端口 `10086`）

## 使用方法

**方式一（推荐，双击党）：**

1. 打开 E听说 客户端并登录
2. 双击 `塔菲PK-启动.cmd`，看到"已就绪"
3. 切到客户端，进入作业开始答题
4. `F8` 开始/暂停（**需客户端窗口有焦点**），或双击 `塔菲PK-开始暂停.cmd`
5. 结束双击 `塔菲PK-停止.cmd`

**方式二（命令行）：**

```bash
node ets-pk-auto.js install     # 安装（注入）
node ets-pk-auto.js toggle      # 切换 开始/暂停
node ets-pk-auto.js start       # 开始
node ets-pk-auto.js stop        # 暂停
node ets-pk-auto.js status      # 查看状态
node ets-pk-auto.js learned     # 查看已学/已作答记录
node ets-pk-auto.js watch       # 守护模式
node ets-pk-auto.js dry         # 空跑（不实际作答，验证连接）
node ets-pk-auto.js uninstall   # 卸载（清理注入）
```

自定义端口：设置环境变量 `ETS_CDP_PORT`。

## 原理

E听说 客户端基于 CEF，其渲染进程自带 `--remote-debugging-port=10086`。
本脚本通过该端口读取 `/json/list` 拿到页面目标，建立 WebSocket 后 `Runtime.evaluate` 注入答题逻辑，
再通过按键 / 命令行与之交互。

## 免责声明

本项目仅用于学习 CDP 自动化技术与个人练习辅助，**不保证适用性与正确性**。
请遵守所在平台的服务条款，切勿滥用。
