export function notificationTitle(title: string | null, link: string | null) {
  if (title !== 'New PAMM item') {
    return title || 'New notification'
  }

  if (link === '/mt5' || link?.startsWith('/mt5/')) {
    return 'New MT5 item'
  }

  if (link === '/fund' || link?.startsWith('/fund/')) {
    return 'New Fund item'
  }

  return title
}

