# 项目代办清单

## Backlog

- [ ] 添加响应导出字段: `language` `time` `memory` `sourceCodeLength`
- [ ] 多 OJ 平台适配
	- 两种 key 序列化并存：domain 的 tuple submissionKey 和 App 的字符串 submissionUiKey 是同一身份的两份编码——将来 platform 值含 : 之类字符时 UI key 会撞车
- [ ] 接入外部权威源实时更新 llm 底层数据引擎