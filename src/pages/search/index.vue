<template>
  <view class="page">
    <view class="city-bar">
      <view class="city-grid">
        <view
          v-for="c in cities"
          :key="c"
          :class="['city-chip', selectedCity === c ? 'city-chip-active' : '']"
          @click="selectCity(c)"
        >
          <text>{{ c }}</text>
        </view>
      </view>
    </view>

    <view class="search-bar">
      <view class="search-input-wrap">
        <input
          class="search-input"
          v-model="keyword"
          :placeholder="selectedCity === '全国' ? '输入酒店名称' : `在${selectedCity}搜索酒店`"
          confirm-type="search"
          @confirm="doSearch"
          @focus="onFocus"
          @blur="onBlur"
        />
      </view>
      <text class="search-btn" @click="doSearch">搜索</text>
    </view>

    <view v-if="showSuggestions" class="suggestions-panel">
      <view v-if="hotWords.length && !keyword" class="suggest-section">
        <text class="suggest-label">热门搜索</text>
        <view class="hot-tags">
          <text v-for="w in hotWords" :key="w" class="hot-tag" @click="quickSearch(w)">{{ w }}</text>
        </view>
      </view>
      <view v-if="suggestions.length" class="suggest-section">
        <view
          v-for="s in suggestions"
          :key="s.name"
          class="suggest-item"
          @click="quickSearch(s.name)"
        >
          <text class="suggest-name">{{ s.name }}</text>
          <text class="suggest-city">{{ s.city }}</text>
        </view>
      </view>
    </view>

    <view v-if="loading">
      <skeleton-card :count="4" itemHeight="140rpx" titleWidth="55%" bodyWidth="80%" />
    </view>

    <view v-else-if="results.length > 0" class="result-list">
      <view
        v-for="hotel in results"
        :key="hotel._id"
        class="result-item"
        @click="goDetail(hotel._id)"
      >
        <view class="compare-check" @click.stop="toggleCompare(hotel)">
          <view :class="['check-circle', isSelected(hotel._id) ? 'checked' : '']">
            <text v-if="isSelected(hotel._id)">✓</text>
          </view>
        </view>
        <view class="hotel-name">{{ hotel.name }}</view>
        <view class="hotel-address">{{ hotel.address }}</view>
        <view class="hotel-stats">
          <text v-if="hotel.hasCase" class="stat case-stat">
            <text class="stat-dot case-dot"></text>
            {{ hotel.caseCount }}条案件记录
          </text>
          <text v-if="hotel.reviewCount > 0" class="stat review-stat">
            {{ hotel.reviewCount }}条反馈
          </text>
          <text v-if="!hotel.hasCase && hotel.reviewCount === 0" class="stat no-stat">
            暂无记录
          </text>
        </view>
        <text class="arrow">›</text>
      </view>
    </view>

    <view v-else-if="searched && !loading" class="empty-result">
      <text class="empty-text">未找到相关酒店</text>
      <text class="empty-hint">请尝试其他关键词或切换城市</text>
    </view>

    <view v-if="selectedForCompare.length >= 2" class="compare-bar">
      <text class="compare-count">已选 {{ selectedForCompare.length }} 家</text>
      <view class="compare-btn" @click="startCompare">开始对比</view>
    </view>
  </view>
</template>

<script setup>
import { ref, watch, onMounted } from 'vue'

const cities = ref(['全国'])

async function loadCities() {
  try {
    const res = await wx.cloud.callFunction({ name: 'get-stats' })
    if (res.result?.code === 0 && res.result.data?.cities?.length) {
      cities.value = ['全国', ...res.result.data.cities]
      return
    }
  } catch (err) {
    console.error('loadCities via cloud function failed:', err)
  }

  // 云函数失败，客户端分页拉取城市（单次最多100条，分多页合并）
  try {
    const db = wx.cloud.database()
    const citySet = new Set()
    for (let i = 0; i < 6; i++) {
      const res = await db.collection('hotels').field({ city: true }).skip(i * 100).limit(100).get()
      const data = res.data || []
      data.forEach(h => { if (h.city && h.city.trim()) citySet.add(h.city.trim()) })
      if (data.length < 100) break
    }
    const dbCities = Array.from(citySet).sort()
    if (dbCities.length > 0) {
      cities.value = ['全国', ...dbCities]
      return
    }
  } catch (e) {
    console.error('loadCities direct query failed:', e)
  }

  // 兜底：预置主要城市列表（数据库无数据时使用）
  cities.value = ['全国', '北京', '上海', '广州', '深圳', '杭州', '成都', '重庆', '武汉', '西安', '南京', '长沙', '郑州', '天津', '苏州', '厦门', '青岛', '大连', '昆明', '三亚', '丽江', '大理', '东莞', '佛山', '合肥', '福州', '贵阳', '兰州', '南宁', '宁波', '沈阳', '石家庄', '太原', '无锡', '温州', '珠海', '中山', '惠州', '常州', '嘉兴', '绍兴', '金华', '台州', '泉州', '海口', '哈尔滨', '长春', '济南', '南昌', '拉萨', '乌鲁木齐', '呼和浩特', '银川', '西宁', '桂林', '北海', '烟台', '威海', '洛阳', '宜昌', '襄阳', '九江', '赣州', '遵义', '秦皇岛']
}

const selectedCity = ref('全国')
const keyword = ref('')
const results = ref([])
const loading = ref(false)
const searched = ref(false)

const showSuggestions = ref(false)
const suggestions = ref([])
const hotWords = ref([])
let debounceTimer = null

const selectedForCompare = ref([])

function isSelected(id) {
  return selectedForCompare.value.some(h => h._id === id)
}

function toggleCompare(hotel) {
  const idx = selectedForCompare.value.findIndex(h => h._id === hotel._id)
  if (idx >= 0) {
    selectedForCompare.value.splice(idx, 1)
  } else if (selectedForCompare.value.length < 4) {
    selectedForCompare.value.push(hotel)
  } else {
    uni.showToast({ title: '最多对比4家酒店', icon: 'none' })
  }
}

function startCompare() {
  const ids = selectedForCompare.value.map(h => h._id).join(',')
  uni.navigateTo({ url: `/pages/compare/index?ids=${ids}` })
}

function selectCity(city) {
  selectedCity.value = city
  if (keyword.value.trim()) {
    doSearch()
  }
}

async function doSearch() {
  const kw = keyword.value.trim()
  if (!kw) return

  loading.value = true
  searched.value = true
  results.value = []
  showSuggestions.value = false
  selectedForCompare.value = []

  try {
    const data = { keyword: kw }
    if (selectedCity.value !== '全国') {
      data.city = selectedCity.value
    }
    const res = await wx.cloud.callFunction({
      name: 'search-hotels',
      data
    })

    if (res.result && res.result.code === 0) {
      results.value = res.result.data
    }
  } catch (err) {
    console.error('搜索失败:', err)
    uni.showToast({ title: '搜索失败，请重试', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function goDetail(hotelId) {
  uni.navigateTo({ url: `/pages/hotel-detail/index?id=${hotelId}` })
}

// Search suggestions
function onFocus() {
  if (hotWords.value.length || !keyword.value) {
    showSuggestions.value = true
  }
}

function onBlur() {
  setTimeout(() => { showSuggestions.value = false }, 200)
}

watch(keyword, (val) => {
  clearTimeout(debounceTimer)
  if (!val || !val.trim()) {
    showSuggestions.value = !!hotWords.value.length
    suggestions.value = []
    return
  }
  debounceTimer = setTimeout(async () => {
    try {
      const data = { keyword: val.trim() }
      if (selectedCity.value !== '全国') data.city = selectedCity.value
      const res = await wx.cloud.callFunction({
        name: 'search-suggest',
        data
      })
      if (res.result?.code === 0) {
        suggestions.value = res.result.data.suggestions || []
        hotWords.value = res.result.data.hotWords || []
        showSuggestions.value = !!(suggestions.value.length || hotWords.value.length)
      }
    } catch { /* silent */ }
  }, 300)
})

function quickSearch(name) {
  keyword.value = name
  showSuggestions.value = false
  selectedForCompare.value = []
  doSearch()
}

onMounted(async () => {
  loadCities()
  try {
    const res = await wx.cloud.callFunction({ name: 'search-suggest', data: { keyword: '' } })
    if (res.result?.code === 0) hotWords.value = res.result.data.hotWords || []
  } catch {}
})
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: var(--bg-color);
  padding-bottom: 120rpx;
}

.city-bar {
  background: var(--bg-white);
  padding: $spacing-sm $spacing-md;
  box-shadow: var(--shadow-sm);
}

.city-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.city-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 56rpx;
  width: calc((100% - 60rpx) / 6);
  padding: 0 8rpx;
  border-radius: $radius-sm;
  background: var(--bg-color);
  font-size: $font-xs;
  color: var(--text-secondary);
  box-sizing: border-box;
  transition: all var(--transition);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  &:active { transform: scale(0.95); }
}

.city-chip-active {
  background: var(--primary-color);
  color: #fff;
  font-weight: 500;
}

.search-bar {
  display: flex;
  align-items: center;
  padding: $spacing-sm $spacing-md;
  background: var(--bg-white);
}

.search-input-wrap {
  flex: 1;
  height: 72rpx;
  background: var(--bg-color);
  border-radius: $radius-round;
  padding: 0 $spacing-md;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  font-size: $font-md;
}

.search-btn {
  margin-left: $spacing-md;
  font-size: $font-md;
  color: var(--primary-color);
  font-weight: 500;
}

.suggestions-panel {
  margin: 0 $spacing-md;
  background: var(--bg-white);
  border-radius: $radius;
  box-shadow: $shadow-md;
  padding: $spacing-sm 0;
  max-height: 500rpx;
  overflow-y: auto;
}

.suggest-section {
  padding: $spacing-xs $spacing-md;
}

.suggest-label {
  font-size: $font-xs;
  color: var(--text-muted);
  margin-bottom: $spacing-xs;
  display: block;
}

.hot-tags {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-sm;
}

.hot-tag {
  font-size: $font-sm;
  color: var(--text-secondary);
  background: var(--bg-color);
  padding: 6rpx 20rpx;
  border-radius: $radius-round;

  &:active { background: var(--primary-light); color: var(--primary-color); }
}

.suggest-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: $spacing-sm 0;
  border-bottom: 1rpx solid var(--border-color);

  &:last-child { border-bottom: none; }

  &:active { background: var(--bg-color); }
}

.suggest-name {
  font-size: $font-md;
  color: var(--text-color);
}

.suggest-city {
  font-size: $font-xs;
  color: var(--text-muted);
}

.loading-state {
  text-align: center;
  padding: 120rpx 0;
  font-size: $font-md;
  color: var(--text-muted);
}

.result-item {
  display: flex;
  flex-direction: column;
  background: var(--bg-white);
  padding: $spacing-md;
  padding-left: 80rpx;
  margin: $spacing-sm $spacing-md;
  border-radius: $radius;
  box-shadow: var(--shadow-sm);
  position: relative;
  transition: transform var(--transition);

  &:active { transform: scale(0.98); }
}

.compare-check {
  position: absolute;
  left: $spacing-md;
  top: 50%;
  transform: translateY(-50%);
  z-index: 1;
}

.check-circle {
  width: 40rpx;
  height: 40rpx;
  border-radius: 50%;
  border: 2rpx solid var(--text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
  color: transparent;
  transition: all var(--transition);

  &.checked {
    background: var(--primary-color);
    border-color: var(--primary-color);
    color: #fff;
  }
}

.hotel-name {
  font-size: $font-lg;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: $spacing-xs;
}

.hotel-address {
  font-size: $font-sm;
  color: var(--text-muted);
  margin-bottom: $spacing-sm;
}

.hotel-stats {
  display: flex;
  gap: $spacing-md;
}

.stat {
  font-size: $font-sm;
  display: flex;
  align-items: center;
}

.case-stat {
  color: var(--danger-color);
}

.stat-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  margin-right: 8rpx;
}

.case-dot {
  background: var(--danger-color);
}

.review-stat {
  color: var(--primary-color);
}

.no-stat {
  color: var(--safe-color);
}

.arrow {
  position: absolute;
  right: $spacing-md;
  top: 50%;
  transform: translateY(-50%);
  font-size: 40rpx;
  color: var(--text-muted);
}

.compare-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--bg-white);
  padding: $spacing-sm $spacing-md;
  padding-bottom: calc($spacing-sm + env(safe-area-inset-bottom));
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 -2rpx 12rpx rgba(0,0,0,0.06);
  z-index: 100;
}

.compare-count {
  font-size: $font-md;
  font-weight: 500;
  color: var(--text-color);
}

.compare-btn {
  background: var(--primary-color);
  color: #fff;
  font-size: $font-md;
  font-weight: 500;
  padding: 12rpx 40rpx;
  border-radius: $radius-round;
}

.empty-result {
  text-align: center;
  padding: 120rpx 0;

  .empty-text {
    font-size: $font-lg;
    color: var(--text-secondary);
    display: block;
  }

  .empty-hint {
    font-size: $font-sm;
    color: var(--text-muted);
    display: block;
    margin-top: $spacing-sm;
  }
}
</style>
