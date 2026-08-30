import { appName, routeTitles } from '@/constants'

export default function setPageTitle(name?: string): void {
  const title = name ? routeTitles[name] : ''
  window.document.title = title ? `${title} - ${appName}` : appName
}
