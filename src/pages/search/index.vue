<template>
  <view class="page">
    <view class="city-bar">
      <scroll-view scroll-x class="province-row" :show-scrollbar="false">
        <view
          v-for="p in provinces"
          :key="p"
          :class="['province-chip', selectedProvince === p ? 'province-chip-active' : '']"
          @click="selectProvince(p)"
        >
          <text>{{ p }}</text>
        </view>
      </scroll-view>
      <scroll-view scroll-x class="city-scroll" :show-scrollbar="false" v-if="currentCities.length > 1">
        <view
          v-for="c in currentCities"
          :key="c"
          :class="['city-chip', selectedCity === c ? 'city-chip-active' : '']"
          @click="selectCity(c)"
        >
          <text>{{ c }}</text>
        </view>
      </scroll-view>
    </view>

    <view class="search-bar">
      <view class="search-input-wrap">
        <input
          class="search-input"
          v-model="keyword"
          :placeholder="selectedCity && selectedCity !== '全省' ? `在${selectedCity}搜索酒店` : selectedProvince === '全国' ? '输入酒店名称' : `在${selectedProvince}搜索酒店`"
          confirm-type="search"
          @confirm="doSearch"
        />
      </view>
      <text class="search-btn" @click="doSearch">搜索</text>
    </view>

    <view v-if="!searched" class="hot-section">
      <text class="hot-label">热门搜索：</text>
      <text
        v-for="w in hotWords"
        :key="w"
        class="hot-tag"
        @click="quickSearch(w)"
      >{{ w }}</text>
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
      <view v-if="loadingMore" class="loading-more">加载中...</view>
      <view v-else-if="!hasMore && results.length > 0" class="loading-more">— 已显示全部结果 —</view>
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
import { ref, computed, onMounted } from 'vue'
import { onReachBottom } from '@dcloudio/uni-app'

// 省份 → 城市映射
const PROVINCE_MAP = {
  '全国': [],
  '北京': ['北京'],
  '上海': ['上海'],
  '天津': ['天津'],
  '重庆': ['重庆'],
  '广东': ['广州', '深圳', '东莞', '佛山', '珠海', '中山', '惠州', '汕头', '湛江', '江门', '肇庆', '茂名', '梅州', '清远', '揭阳'],
  '浙江': ['杭州', '宁波', '温州', '嘉兴', '绍兴', '金华', '台州'],
  '江苏': ['南京', '苏州', '无锡', '常州', '南通', '徐州', '盐城', '泰州', '镇江', '淮安', '扬州'],
  '山东': ['济南', '青岛', '烟台', '威海', '临沂', '淄博', '潍坊', '济宁', '泰安'],
  '福建': ['厦门', '福州', '泉州', '漳州', '莆田'],
  '四川': ['成都', '绵阳', '宜宾', '南充', '泸州'],
  '湖北': ['武汉', '襄阳', '宜昌', '荆州', '黄冈'],
  '湖南': ['长沙', '岳阳', '衡阳', '株洲', '常德'],
  '河南': ['郑州', '洛阳', '南阳', '许昌', '周口', '新乡'],
  '河北': ['石家庄', '唐山', '保定', '邯郸', '廊坊', '沧州', '秦皇岛'],
  '陕西': ['西安', '咸阳', '宝鸡', '榆林'],
  '辽宁': ['沈阳', '大连'],
  '吉林': ['长春'],
  '黑龙江': ['哈尔滨'],
  '安徽': ['合肥'],
  '江西': ['南昌', '九江', '赣州', '上饶', '宜春'],
  '贵州': ['贵阳', '遵义', '毕节', '六盘水'],
  '云南': ['昆明', '丽江', '大理', '西双版纳'],
  '广西': ['南宁', '桂林', '柳州', '玉林', '北海'],
  '海南': ['海口', '三亚'],
  '甘肃': ['兰州'],
  '青海': ['西宁'],
  '宁夏': ['银川'],
  '新疆': ['乌鲁木齐'],
  '内蒙古': ['呼和浩特'],
  '西藏': ['拉萨'],
  '山西': ['太原'],
}

// 所有城市汇总
const ALL_CITIES = Object.values(PROVINCE_MAP).flat().filter(Boolean)

const provinces = Object.keys(PROVINCE_MAP)
const selectedProvince = ref('全国')
const selectedCity = ref('')
const currentCities = computed(() => {
  const list = PROVINCE_MAP[selectedProvince.value]
  if (!list || list.length === 0) return ALL_CITIES
  return ['全省', ...list]
})

async function loadCities() {
  // 尝试从 DB 补充未知城市
  try {
    const res = await wx.cloud.callFunction({ name: 'get-stats' })
    if (res.result?.code === 0 && res.result.data?.cities?.length) {
      const dbCities = res.result.data.cities
      // 把 DB 中出现但 PROVINCE_MAP 没有的城市加入"其他"
      const known = new Set(ALL_CITIES.map(c => c.trim()))
      const unknown = dbCities.filter(c => !known.has(c.trim()))
      if (unknown.length > 0) {
        if (!PROVINCE_MAP['其他']) PROVINCE_MAP['其他'] = []
        unknown.forEach(c => {
          const trimmed = c.trim()
          if (!PROVINCE_MAP['其他'].includes(trimmed)) {
            PROVINCE_MAP['其他'].push(trimmed)
          }
        })
        // 更新 provinces 和 ALL_CITIES
        if (!provinces.includes('其他')) provinces.push('其他')
        ALL_CITIES.push(...unknown.map(c => c.trim()))
      }
    }
  } catch (err) {
    console.error('loadCities error:', err)
  }
}

const keyword = ref('')
const results = ref([])
const loading = ref(false)
const searched = ref(false)

const hotWords = ['如家', '汉庭', '全季', '7天', '希尔顿', '万豪', '亚朵', '锦江之星']

const selectedForCompare = ref([])
const skip = ref(0)
const hasMore = ref(false)
const loadingMore = ref(false)

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

function selectProvince(p) {
  selectedProvince.value = p
  selectedCity.value = ''
}

function selectCity(city) {
  if (city === '全省') {
    selectedCity.value = ''
  } else {
    selectedCity.value = city
  }
}

function quickSearch(name) {
  keyword.value = name
  selectedForCompare.value = []
  doSearch()
}

// 构建搜索用的城市参数
function getCityParam() {
  if (selectedCity.value) {
    return { city: selectedCity.value }
  }
  if (selectedProvince.value !== '全国') {
    const list = PROVINCE_MAP[selectedProvince.value]
    if (list && list.length > 0) {
      return { cities: list }
    }
  }
  return {}
}

async function doSearch() {
  try {
    const kw = keyword.value.trim()
    if (!kw) return

    loading.value = true
    searched.value = true
    results.value = []
    selectedForCompare.value = []
    skip.value = 0

    const data = { keyword: kw, skip: 0, ...getCityParam() }
    const res = await wx.cloud.callFunction({
      name: 'search-hotels',
      data
    })

    if (res.result && res.result.code === 0) {
      results.value = res.result.data || []
      hasMore.value = res.result.hasMore || false
    } else {
      uni.showToast({ title: res.result?.msg || '未找到相关酒店', icon: 'none' })
    }
  } catch (err) {
    console.error('搜索失败:', err)
    uni.showToast({ title: '搜索失败，请重试', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function loadMore() {
  if (!hasMore.value || loadingMore.value) return
  loadingMore.value = true

  try {
    const nextSkip = skip.value + 20
    const data = { keyword: keyword.value.trim(), skip: nextSkip, ...getCityParam() }
    const res = await wx.cloud.callFunction({
      name: 'search-hotels',
      data
    })

    if (res.result && res.result.code === 0) {
      results.value.push(...(res.result.data || []))
      hasMore.value = res.result.hasMore || false
      skip.value = nextSkip
    }
  } catch (err) {
    console.error('加载更多失败:', err)
  } finally {
    loadingMore.value = false
  }
}

function goDetail(hotelId) {
  uni.navigateTo({ url: `/pages/hotel-detail/index?id=${hotelId}` })
}

onReachBottom(() => {
  loadMore()
})

onMounted(() => {
  loadCities()
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
  box-shadow: var(--shadow-sm);
}

.province-row {
  white-space: nowrap;
  padding: $spacing-sm $spacing-md;
}

.province-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 48rpx;
  padding: 0 20rpx;
  margin-right: 12rpx;
  border-radius: $radius-round;
  background: var(--bg-color);
  font-size: $font-xs;
  color: var(--text-secondary);
  transition: all var(--transition);

  &:active { transform: scale(0.95); }
}

.province-chip-active {
  background: var(--primary-color);
  color: #fff;
  font-weight: 500;
}

.city-scroll {
  white-space: nowrap;
  padding: 0 $spacing-md $spacing-sm;
}

.city-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 52rpx;
  padding: 0 18rpx;
  margin-right: 10rpx;
  border-radius: $radius-sm;
  background: var(--bg-color);
  font-size: $font-xs;
  color: var(--text-secondary);
  transition: all var(--transition);

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

.hot-section {
  padding: $spacing-md;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: $spacing-sm;
}

.hot-label {
  font-size: $font-sm;
  color: var(--text-muted);
}

.hot-tag {
  font-size: $font-sm;
  color: var(--primary-color);
  background: var(--primary-light);
  padding: 6rpx 24rpx;
  border-radius: $radius-round;
  transition: transform var(--transition);

  &:active { transform: scale(0.95); }
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

.loading-more {
  text-align: center;
  padding: 30rpx 0;
  font-size: $font-sm;
  color: var(--text-muted);
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
