const STORAGE_KEY = 'favorite_hotels'
const MAX = 50

export function getFavorites() {
  try { return uni.getStorageSync(STORAGE_KEY) || [] }
  catch { return [] }
}

export function addFavorite(hotel) {
  const list = getFavorites().filter(h => h._id !== hotel._id)
  list.unshift({
    _id: hotel._id,
    name: hotel.name,
    city: hotel.city || '',
    address: hotel.address || '',
    addedAt: Date.now()
  })
  if (list.length > MAX) list.length = MAX
  uni.setStorageSync(STORAGE_KEY, list)
}

export function removeFavorite(hotelId) {
  const list = getFavorites().filter(h => h._id !== hotelId)
  uni.setStorageSync(STORAGE_KEY, list)
}

export function isFavorite(hotelId) {
  return getFavorites().some(h => h._id === hotelId)
}

export function clearFavorites() {
  uni.removeStorageSync(STORAGE_KEY)
}
