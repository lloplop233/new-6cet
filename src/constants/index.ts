export const appName = '六级词汇'
export const appDescription = '六级词汇背记工具'

/**
 * 路由名 → 页面标题。
 * NavBar 标题和 document.title 都取这里，是唯一的标题来源。
 */
export const routeTitles: Record<string, string> = {
  Home: '今日',
  Tokens: '设计 token 验收',
}

/**
 * 根级路由：NavBar 不显示返回箭头，TabBar 显示。
 */
export const rootRouteList: readonly string[] = [
  'Home',
  'Tokens',
]
