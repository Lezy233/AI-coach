# 洛谷提交记录抓取 · 接口契约调研报告

> 调研日期：2026-10-28
> 调研方式：源码级调研（开源爬虫项目、社区维护 API 文档、洛谷前端类型定义）+ **登录态浏览器实测**（通过 Kimi WebBridge 驱动用户本机 Edge，在洛谷已登录页面内执行 fetch 验证）
> 所有标注 `[实测]` 的结论均在 2026-10-28 于真实登录会话中验证通过。

---

## 1. 实验目的

为「MV3 浏览器扩展抓取当前登录用户的洛谷提交记录」确定可落地的数据契约：

1. 当前洛谷前端获取提交记录列表的真实 XHR 接口（URL、方法、请求头、参数、响应结构、分页机制）；
2. `status` 完整取值表；
3. `language` 整数 ID → 语言名称映射表；
4. 访问门槛与风控特征；
5. 从 MV3 content script 直接 fetch 的可行性。

## 2. 信息源与优先级

| 来源 | 内容 | 角色 |
|---|---|---|
| 登录态浏览器实测（本实验） | 接口行为、响应字段、状态/语言过滤、分页、错误形态 | 最高优先级 |
| `GET https://www.luogu.com.cn/_lfe/config`（免登录，实测 200） | `recordStatus`、`codeLanguages` 权威枚举 | 枚举权威源 |
| [luogu-api-docs](https://0f-0b.github.io/luogu-api-docs/)（社区维护） | 接口分类、参数类型（`RecordListParams`、`RecordBase`、`List<T>`）、CSRF 规则 | 结构参考（部分滞后） |
| CWXU-Algo [`luogu.go`](https://github.com/srcenchen/CWXU-Algo)（Go 爬虫，已失效的正则方案） | Record 结构、分页校验逻辑、`status==12=AC` 约定、未登录 302 结论 | 交叉验证 |
| 洛谷官方帮助页 | 对外展示的状态名称集合 | 名称参考 |

## 3. 实验过程

### 3.1 无登录态基线探测（调研者环境）

- `curl` 请求 `record/list?_contentOnly=1`：被网宿 CDN 挑战（`ws-action: cc` 302 + `C3VK` cookie）无限循环拦截，**纯脚本无法通过**，符合预期，转为登录态实测。
- 直连文档站 SSL 失败，改从 luogu-api-docs 的 GitHub 仓库拉取原始 `records.md`、`misc.md`、`luogu-api.d.ts` 成功。
- `GET /_lfe/config` **免登录返回 200**，拿到 `recordStatus` 与 `codeLanguages` 全量枚举。
- `problem/P1000?_contentOnly=1` 免登录返回 JSON：证明 `_contentOnly` 机制在公开页面仍有效（旧 DataResponse 管线）。

### 3.2 登录态实测（用户本机 Edge，Kimi WebBridge 驱动）

操作序列（每一步均在 `https://www.luogu.com.cn` 页面上下文执行）：

1. **打开记录列表页** → 页面正常渲染记录表格，确认处于登录状态（头像、登出入口可见）。页面共 1955 条 / 98 页。
2. **抓包寻找数据 XHR** → 网络面板中 `record/list` 只有文档请求本身，无 JSON XHR；DOM 中无 `_feInjection` 注入；页面通过 `fecdn.luogu.com.cn/columba` 微前端 iframe 内拉取数据。
3. **探测三种数据触发方式**（核心一步，结果推翻文档假设）：

   | 触发方式 | 结果 |
   |---|---|
   | `?_contentOnly=1` | 200 `text/html` 空壳 ❌ |
   | 头 `x-luogu-type: content-only` | 200 `text/html` 空壳 ❌ |
   | 头 **`x-lentille-request: content-only`** | 200 `application/json` ✅ |

4. **契约核心验证**（均带 `x-lentille-request: content-only`）：

   - 第 1 页：信封 + 记录字段逐键采集；`perPage=20`、`count=1955`、20 行；
   - CE 记录采样：`status:2, score:null, time:0, memory:0`；
   - 第 2 页：id 无重叠，分页单调；
   - `status=12` 过滤：800 条，全部 `status==12`；
   - `status=14` 过滤：1109 条，全部 `status==14`；
   - `language=25` 过滤：2 条，全部 `language==25`；
   - 状态扫描 `status=0,1,2,3,4,5,6,7,11,12,14,21`：参数全部被接受（无 4xx），各值计数见 §5.2；
   - 他人记录：`user=1`（公开知名账号）返回 5518 条完整记录；**任意登录态可看别人记录**；
   - 错误形态：不存在的 uid（`user=2` 恰好无此用户）返回 **HTTP 500** + JSON 错误信封，非 404。

5. **登录态下复核 `_contentOnly` 失败**（与无登录态行为一致），确认该方式已彻底失效，与登录态无关。

## 4. 接口契约卡（全部 `[实测]`）

| 项 | 内容 |
|---|---|
| 方法 | `GET` |
| URL 模板 | `https://www.luogu.com.cn/record/list?user={uid}&page={n}` |
| **必需请求头** | `x-lentille-request: content-only`（缺失则返回 HTML 空壳） |
| 其他头 | 无。GET 无需 CSRF、无需 Referer、无需自定义 User-Agent |
| 认证 | 需任意洛谷登录态；登录后可读取**任意 uid** 的记录 |
| 分页 | `page` 从 1 开始；`perPage` 服务端固定 **20**；`totalPages = ceil(count / perPage)`（实测 1955 → 98 页 ✓）；翻页无重叠 |
| 过滤参数 | `status`、`language` 实测严格过滤；`pid`、`contestId`、`orderBy`（语义未验证） |
| 错误形态 | 目标 uid 不存在 → HTTP 500 + `{instance, template:"error", status:500, data:{errorCode,errorType,errorMessage}, user, time}` |

### 4.1 响应 JSON 实测样例（已脱敏）

```json
{
  "instance": "main", "template": "record.list", "status": 200, "locale": "zh-CN",
  "data": { "records": { "perPage": 20, "count": 1955, "result": [ {
      "id": 246000000, "status": 14, "enableO2": true, "score": 70,
      "time": 433, "memory": 8436, "sourceCodeLength": 1796,
      "submitTime": 1762954778, "language": 27,
      "user": { "uid": 0, "name": "{用户名}", "avatar": "...", "color": "Green", "ccfLevel": 0, "xcpcLevel": 6, "verified": true },
      "contest": null,
      "problem": { "pid": "T684526", "type": "T", "name": "{题目标题}", "difficulty": 3, "fullScore": 100, "submitted": true, "accepted": false }
  } ] } },
  "user": { "uid": 0, "name": "{用户名}" }, "time": 1793198775.62
}
```

### 4.2 字段要点（实测确认）

- 信封顶层键：`instance / template / status / locale / data / user / time`（无 `theme` 键）；
- `result` 实测为数组；类型定义提示也可能是对象形式（`{ [index]: T }`），解析时兼容；
- `time` 单位**毫秒**；`memory` 单位 **KB**（与 UI 显示一致）；
- `score`：CE 时为 `null`；部分分 0–100（实测 70/95/20/30/60）；
- CE 记录为 `score:null, time:0, memory:0`（**是 0 不是 null**，与第三方类型标注不同，以实测为准）；
- `problem` 标题键名为 **`name`**（第三方结构体中的 `title` 已过时）；
- `contest` 非空时形如 `{id, startTime, endTime, name}`；
- 记录按提交时间**倒序**（实测 id/时间单调递减）→ 支持以「本地最大 id」做增量终止；
- 页面数据由 `fecdn.luogu.com.cn/columba` 微前端 iframe 内 XHR 拉取，不经 `window._feInjection` 注入。

### 4.3 最小可复现指令（登录态浏览器控制台单行）

```
fetch('/record/list?user={uid}&page=1',{headers:{'x-lentille-request':'content-only'}}).then(r=>r.json()).then(j=>console.log(j.status,j.data.records.count,j.data.records.perPage,j.data.records.result[0]))
```

## 5. 枚举表

### 5.1 language 映射表（0–34）

来源：`/_lfe/config` 的 `codeLanguages`，2026-10-28 免登录实测，与 CWXU 2026-08-08 抓取一致。标 † 为 `disabled:true`（历史记录仍会碰到，映射必须保留）：

| ID | 语言 | | ID | 语言 |
|---|---|---|---|---|
| 0 | Invalid † | | 18 | Visual Basic Mono † |
| 1 | Pascal | | 19 | Haskell |
| 2 | C | | 20 | Kotlin/Native † |
| 3 | C++98 | | 21 | Kotlin/JVM |
| 4 | C++11 | | 22 | Scala |
| 5 | 提交答案 | | 23 | Perl |
| 6 | Python 2 † | | 24 | PyPy 2 † |
| 7 | Python 3 | | 25 | PyPy 3 |
| 8 | Java 8 | | 26 | 文言 † |
| 9 | Node.js LTS | | 27 | C++20 |
| 10 | Shell † | | 28 | C++14 (GCC 9) |
| 11 | C++14 | | 29 | F#.NET † |
| 12 | C++17 | | 30 | OCaml |
| 13 | Ruby | | 31 | Julia |
| 14 | Go | | 32 | Lua |
| 15 | Rust | | 33 | Java 21 |
| 16 | PHP | | 34 | C++23 |
| 17 | C# Mono | | | |

### 5.2 status 取值表

列表层实测出现的值：`0 Waiting`、`1 Judging`（瞬态，查询时计数 0）、`2 CE`、`11 UKE`、`12 AC`、`14 Unaccepted`。**实测证据**：样本账号 1955 条记录的状态被 2/11/12/14 四类完整划分（35+11+800+1109=1955，与总数恰好相等）。

| 值 | 含义 | shortName | 列表层实测 | 过滤参数实测 |
|---|---|---|---|---|
| 0 | 等待评测 | Waiting | 瞬态 | ✔ 有效（计数 0） |
| 1 | 评测中 | Judging | 瞬态 | ✔ 有效（计数 0） |
| 2 | 编译错误 | CE | ✔ | ✔ |
| 3 | 输出超限 | OLE | 未观测* | ✔（计数 0） |
| 4 | 内存超限 | MLE | 未观测* | ✔（计数 0） |
| 5 | 运行超时 | TLE | 未观测* | ✔（计数 0） |
| 6 | 答案错误 | WA | 未观测* | ✔（计数 0） |
| 7 | 运行时错误 | RE | 未观测* | ✔（计数 0） |
| 11 | 未知错误 | UKE | ✔ | ✔ |
| **12** | **通过** | **AC** | ✔ | ✔ |
| 14 | 未通过 | NAC | ✔ | ✔ |
| 21/22/23 | Hack 成功/失败/跳过 | — | 未观测 | ✔（计数 0） |
| -1 | 未显示 | N/A | — | — |

\* 「未观测」仅表示样本账号无此类记录，不能证明列表层不会产生；3–7 更可能保留在**测试点 detail** 层（`GET /record/:id` 的 `detail.judgeResult`）。抓取判定建议：**AC = status 12；CE = 2；其余终态 = 14**（兼容 CWXU「12=AC 其余非 AC」的约定）。

> 注意：2019–2020 年博客/旧爬虫引用的旧枚举（如「3=AC、4=WA」）**已过时**，以本表为准。

## 6. 访问门槛与风控

| 项 | 结论 | 可信度 |
|---|---|---|
| `/_lfe/config` | 免登录可取（枚举权威源，可作运行时刷新） | [实测] |
| `record/list` | 需任意登录态；登录后他人记录同样可见 | [实测] |
| 未登录行为 | 302 → `/auth/login`；无登录态脚本请求被 CDN 挑战拦截 | [第三方源码]+[实测受阻] |
| CDN 反爬 | 网宿 `ws-action: cc` 挑战 + `C3VK` cookie，纯脚本不可过；真实浏览器免疫 | [实测] |
| robots.txt | 旧快照 `Disallow: /record`，官方不欢迎爬该路径 | [第三方说法] |
| 频率限制 | 无公开文档；参考爬虫以 300ms/页持续全量抓取无异常；本实验连续 10+ 请求无限制 | [实测]+[第三方说法] |

## 7. MV3 content script 可行性结论：可行，且是唯一正确路径

1. content script 注入 `www.luogu.com.cn` 页面后，相对路径 fetch 与页面同源，自动携带 Cookie；
2. 自定义头 `x-lentille-request` 属「非简单请求」，会触发 CORS 预检——content script 的请求以页面源发出，同源预检必过；若改从 extension service worker 发送，则需 `host_permissions` 且依赖服务端 CORS 响应头（未验证），**故必须走 content script 方案**；
3. manifest 仅需 `content_scripts.matches: ["https://www.luogu.com.cn/*"]`；
4. 增量抓取友好：倒序 + 本地最大 id 终止；错误处理注意 uid 不存在返回 **500 信封**而非 404；
5. 主要风险：登录态失效需识别（500 / 重定向 / 信封 `user` 为游客）；抓取节奏建议 ≥ 300ms/页。

## 8. 仍开放的小问题（不阻塞开发）

- `orderBy` 参数取值与排序语义（未验证）；
- Waiting/Judging（0/1）记录的确切字段形态——需恰好抓到瞬态记录，`time/memory/score` 预期为 null；
- `record/:id` 的 detail 结构与测试点级状态枚举（本次未展开，列表抓取用不到）；
- 高频阈值未知（触发限流的具体 QPS）。

## 9. 实验数据备忘（脱敏）

- 样本账号提交总数 1955，perPage=20，共 98 页；
- 状态分布：CE 35 / UKE 11 / AC 800 / Unaccepted 1109（合计 1955 ✓）；
- `language=25`（PyPy 3）过滤命中 2 条；
- 跨页验证：page1 与 page2 首条 id 不同且无交集。


## 10. 信封 `user` 字段（登录态判定）

> 补充日期：2026-11-15。

Lentille 信封顶层 `user` 字段类型为「用户对象 ｜ null」：

- **登录**：`user` 为对象，必含正整数 `uid`（及 `name`、`avatar` 等）；
- **游客**：`user` 为 `null`（或键缺失）。

判定建议：`json.user ?? null === null` → 游客；否则校验 `Number.isInteger(u.uid) && u.uid > 0`，不满足按未登录兜底。

两点注意：

1. `record/list` 游客请求拿不到 JSON 信封（返回 HTML 壳，见 §4），故该判定只在成功解析信封后才有意义，属登录态的**第二层**判定；第一层是响应形态（非 JSON 即会话失效）；
2. `template === "error"` 的 500 错误信封（如 uid 不存在）不含有效 `user`，属错误路径，勿与游客混淆。

「游客 ⇒ `user: null`」目前标注 [源码推断]；可在任意免登录 lentille 页面（如 `/problem/list`）用隐身窗口对照验证：

```
fetch('/problem/list',{headers:{'x-lentille-request':'content-only'}}).then(r=>r.json()).then(j=>console.log(j.user))
```
