# AI Coach

面向算法竞赛练习者的 AI 教练项目。项目计划把 OJ 提交记录抓取、数据整理和 AI 分析串联起来，帮助用户回顾解题表现、发现薄弱环节并制定后续练习计划。

目前支持从洛谷抓取提交记录并导出 JSON；AI Coach 静态站点和模型分析能力仍在开发中。

## 项目组成

### 浏览器扩展

基于 Manifest V3 的洛谷提交导出工具。content script 在洛谷页面中注入最小操作面板，使用当前登录态请求提交记录，并将结果下载为 JSON。

- 入口：`src/extension/content.ts`
- 清单：`public/manifest.json`
- 构建配置：`vite.config.extension.ts`
- 构建产物：`dist-extension/`

### 抓取与解析管线

抓取层负责登录态请求、分页、增量终止和分页一致性检查；解析层负责校验原始响应，并将其转换为统一的 `Submission` 领域模型。

- `src/luogu/fetch.ts`：分页抓取入口 `fetchSubmissions`
- `src/luogu/parse.ts`：响应校验与解析
- `src/luogu/contract.ts`：洛谷接口契约及状态映射
- `src/toSubmission.ts`：统一提交记录类型
- `docs/luogu-api-research.md`：接口调研与限制说明

### AI Coach 静态站点

基于 React 和 Vite 的 Web 产物，计划承载提交数据展示和 AI 教练交互，并部署到 GitHub Pages。

- HTML 入口：`index.html`
- 应用入口：`src/main.tsx`
- 构建配置：`vite.config.ts`
- 构建产物：`dist/`

## 构建产物

静态站点和浏览器扩展使用独立的 Vite 配置及输出目录，互不影响。

| 产物 | 构建命令 | 配置 | 输出目录 |
| --- | --- | --- | --- |
| AI Coach 静态站点 | `npm run build` | `vite.config.ts` | `dist/` |
| 洛谷浏览器扩展 | `npm run build:extension` | `vite.config.extension.ts` | `dist-extension/` |

## 本地开发

安装依赖：

```bash
npm install
```

常用命令：

```bash
npm run dev              # 启动静态站点开发服务器
npm run build            # 构建静态站点
npm run preview          # 预览静态站点构建产物
npm run build:extension  # 构建 MV3 浏览器扩展
npm run test             # 运行测试
npm run lint             # 运行 ESLint
```

## 使用浏览器扩展

1. 执行 `npm run build:extension`。
2. 打开 Chromium 内核浏览器的扩展管理页，开启“开发者模式”。
3. 选择“加载已解压的扩展程序”，加载 `dist-extension/`。
4. 登录洛谷并打开或刷新 `/record/*` 或 `/user/*` 页面。
5. 在右下角 AI Coach 面板中输入 UID，点击“抓取提交”；抓取时可查看文字进度或点击“中止抓取”。
6. 抓取完成后点击“导出 JSON”。

扩展只注入洛谷记录页和用户页，请求由 content script 在当前页面登录态下发出。当前版本没有 popup、background service worker 或远程数据上传功能。

导出的 JSON 包含来源、UID、导出时间和提交记录：

```json
{
  "source": "luogu",
  "uid": 123456,
  "exportedAt": "2026-11-18T08:00:00.000Z",
  "submissions": [
    {
      "id": 246874350,
      "score": 100,
      "submitTime": "2025-11-12T12:16:19.000Z",
      "contest": null,
      "problem": "T684525",
      "verdict": "AC"
    }
  ]
}
```

## GitHub Pages

静态站点使用相对资源路径（`base: './'`），可部署到用户站点或项目站点子路径。执行 `npm run build` 后，将 `dist/` 发布到 GitHub Pages 即可；可以通过 GitHub Actions 或 Pages 的 branch 发布方式完成部署。

浏览器扩展不属于静态站点产物，不应将 `dist-extension/` 作为 GitHub Pages 网站发布。

## 本地数据与测试样本

完整导出文件可能包含 UID、提交时间和练习记录，默认保存在本地的 `data/exports/`，该目录已被 Git 忽略。

自动化测试应使用 `src/test/fixtures/` 中最小化、脱敏后的样本，不直接依赖完整个人导出文件。

## 当前边界

- 目前仅实现洛谷提交列表抓取，不包含题目详情或源代码抓取。
- AI 模型调用、分析结果展示和 GitHub Pages 部署流程尚未实现。
- 洛谷接口没有稳定的公开 SLA，接口字段或访问策略变化可能需要同步更新解析层。
