const HISTORY_KEY = 'browse_history'
const MAX_HISTORY = 20

export function addToHistory(hotel) {
  if (!hotel || !hotel._id) return
  const list = getHistoryRaw()
  const filtered = list.filter(h => h._id !== hotel._id)
  filtered.unshift({
    _id: hotel._id,
    name: hotel.name,
    address: hotel.address || '',
    city: hotel.city || '',
    viewedAt: Date.now()
  })
  if (filtered.length > MAX_HISTORY) filtered.length = MAX_HISTORY
  uni.setStorageSync(HISTORY_KEY, JSON.stringify(filtered))
}

export function getHistory() {
  return getHistoryRaw()
}

export function clearHistory() {
  uni.removeStorageSync(HISTORY_KEY)
}

function getHistoryRaw() {
  try {
    const raw = uni.getStorageSync(HISTORY_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}
