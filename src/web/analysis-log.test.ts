import { describe, expect, it } from 'vitest'
import type { Problem } from '../domain/problem'
import { FOLLOW_UP_STATUS_LABELS, getProblemUrl, summarizeAnalysisInput } from './analysis-log'

function problem(overrides: Partial<Problem>): Problem {
  return {
    platform: 'Luogu',
    id: 'P1001',
    name: 'A+B Problem',
    difficulty: 1,
    ...overrides,
  }
}

describe('summarizeAnalysisInput', () => {
  it('空提交返回 0 条', () => {
    expect(summarizeAnalysisInput([])).toBe('0 条提交记录')
  })

  it('返回条数与本地日期范围', () => {
    const submissions = [
      { submitTime: new Date(2025, 10, 13, 9, 0) },
      { submitTime: new Date(2022, 9, 29, 8, 0) },
      { submitTime: new Date(2025, 10, 1, 8, 0) },
    ]

    expect(summarizeAnalysisInput(submissions))
      .toBe('3 条提交记录 · 2022-10-29 至 2025-11-13')
  })

  it('单条记录首尾日期相同', () => {
    expect(summarizeAnalysisInput([{ submitTime: new Date(2025, 0, 2, 3, 4) }]))
      .toBe('1 条提交记录 · 2025-01-02 至 2025-01-02')
  })
})

describe('getProblemUrl', () => {
  it('洛谷题目直达题目页', () => {
    expect(getProblemUrl(problem({ id: 'P4779' })))
      .toBe('https://www.luogu.com.cn/problem/P4779')
  })

  it('Codeforces 题号带比赛编号时生成题目页', () => {
    expect(getProblemUrl(problem({ platform: 'Codeforces', id: '1615E' })))
      .toBe('https://codeforces.com/problemset/problem/1615/E')
  })

  it('Codeforces 无法识别题号时退回搜索页', () => {
    expect(getProblemUrl(problem({ platform: 'Codeforces', id: 'custom', name: '某题' })))
      .toBe('https://codeforces.com/problemset?order=BY_SOLVED_DESC&search=custom%20%E6%9F%90%E9%A2%98')
  })

  it('AtCoder 拼出比赛与任务路径', () => {
    expect(getProblemUrl(problem({ platform: 'AtCoder', id: 'abc100_a' })))
      .toBe('https://atcoder.jp/contests/abc100/tasks/abc100_a')
  })

  it('AtCoder 无法识别题号时返回 null', () => {
    expect(getProblemUrl(problem({ platform: 'AtCoder', id: 'abc100a' }))).toBeNull()
  })

  it('LeetCode 与 LeetCodeCN 指向各自站点', () => {
    expect(getProblemUrl(problem({ platform: 'LeetCode', id: 'two-sum' })))
      .toBe('https://leetcode.com/problems/two-sum/')
    expect(getProblemUrl(problem({ platform: 'LeetCodeCN', id: 'two-sum' })))
      .toBe('https://leetcode.cn/problems/two-sum/')
  })

  it('Other 平台返回 null', () => {
    expect(getProblemUrl(problem({ platform: 'Other' }))).toBeNull()
  })
})

describe('FOLLOW_UP_STATUS_LABELS', () => {
  it('覆盖所有状态', () => {
    expect(FOLLOW_UP_STATUS_LABELS).toStrictEqual({
      'not-done': '未开始',
      'in-progress': '进行中',
      done: '已完成',
    })
  })
})
