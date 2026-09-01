export const appName = '六级词汇'
export const appDescription = '六级词汇背记工具'

/**
 * 路由名 → 页面标题。
 * NavBar 标题和 document.title 都取这里，是唯一的标题来源。
 */
export const routeTitles: Record<string, string> = {
  Home: '今日',
  Study: '今日学习',
  StudyComplete: '本组完成',
  Progress: '进度',
  Settings: '设置',
  Tokens: '设计 token 验收',
  404: '页面不存在',
}

/**
 * 根级路由：NavBar 不显示返回箭头，TabBar 显示。
 */
export const rootRouteList: readonly string[] = [
  'Home',
  'Progress',
  'Settings',
]
