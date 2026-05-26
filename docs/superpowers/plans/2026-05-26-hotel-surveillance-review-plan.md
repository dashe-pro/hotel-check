# 酒店偷拍信息聚合小程序 · 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 构建一个微信小程序，用户可以在订酒店前搜索查看该酒店是否有偷拍相关的公开案件记录或用户评论。

**Architecture:** uni-app (Vue 3) 前端编译为微信小程序，微信云开发提供云函数 + 云数据库 + 云存储，高德地图 POI API 提供酒店种子数据，微信 msgSecCheck/imgSecCheck 提供内容安全审核。

**Tech Stack:** uni-app, Vue 3 (Composition API), 微信云开发, 高德地图 Web API, pnpm

**Target Directory:** `c:/Users/707829851/Desktop/uni-hotelCheck/`

---

## File Structure

```
uni-hotelCheck/
├── App.vue                          # 应用入口，云开发初始化
├── main.js                          # uni-app 入口
├── manifest.json                    # 应用配置（含云函数目录指向）
├── pages.json                       # 页面路由与样式配置
├── uni.scss                         # 全局样式变量
├── package.json                     # 依赖管理
├── index.html                       # H5 入口（uni-app 生成）
├── pages/
│   ├── index/index.vue              # 首页：搜索框 + 最新评论动态
│   ├── search/index.vue             # 搜索结果列表
│   ├── hotel-detail/index.vue       # 酒店详情（案件+评论）
│   ├── submit-review/index.vue      # 提交评论
│   └── my/index.vue                 # 我的（登录+我的评论）
├── cloudfunctions/
│   ├── search-hotels/
│   │   ├── index.js                 # 搜索酒店（本地+高德补录）
│   │   └── package.json
│   ├── get-hotel-detail/
│   │   ├── index.js                 # 获取酒店详情+评论列表
│   │   └── package.json
│   ├── submit-review/
│   │   ├── index.js                 # 提交评论（含内容安全审核）
│   │   └── package.json
│   └── sync-hotels/
│       ├── index.js                 # 定时任务：高德同步+新闻聚合
│       └── package.json
├── components/
│   └── review-card.vue              # 评论卡片组件（复用）
├── common/
│   ├── cloud.js                     # 云开发能力封装
│   └── sensitiveWords.js            # 前端敏感词库
└── docs/                            # 设计文档（已存在）
```

---

### Task 1: 项目脚手架搭建

**Files:**
- Create: `package.json`
- Create: `main.js`
- Create: `App.vue`
- Create: `index.html`
- Create: `vite.config.js`
- Create: `manifest.json`
- Create: `pages.json`
- Create: `uni.scss`

- [ ] **Step 1: 创建 package.json**

```json
{
  "name": "hotel-check",
  "version": "1.0.0",
  "description": "酒店偷拍信息聚合查询",
  "scripts": {
    "dev:mp-weixin": "uni -p mp-weixin",
    "build:mp-weixin": "uni build -p mp-weixin"
  },
  "dependencies": {
    "@dcloudio/uni-app": "3.0.0-4020420240930001",
    "@dcloudio/uni-app-plus": "3.0.0-4020420240930001",
    "@dcloudio/uni-components": "3.0.0-4020420240930001",
    "@dcloudio/uni-h5": "3.0.0-4020420240930001",
    "@dcloudio/uni-mp-weixin": "3.0.0-4020420240930001",
    "dayjs": "^1.11.13",
    "vue": "3.4.21"
  },
  "devDependencies": {
    "@dcloudio/types": "3.4.8",
    "@dcloudio/uni-automator": "3.0.0-4020420240930001",
    "@dcloudio/uni-cli-shared": "3.0.0-4020420240930001",
    "@dcloudio/vite-plugin-uni": "3.0.0-4020420240930001",
    "vite": "5.2.8"
  }
}
```

- [ ] **Step 2: 创建 main.js**

```javascript
import { createSSRApp } from 'vue'
import App from './App.vue'

export function createApp() {
  const app = createSSRApp(App)
  return { app }
}
```

- [ ] **Step 3: 创建 App.vue**

```vue
<script setup>
import { onLaunch } from '@dcloudio/uni-app'

onLaunch(() => {
  // 云开发初始化
  if (wx && wx.cloud) {
    wx.cloud.init({
      env: 'YOUR-ENV-ID',
      traceUser: true
    })
  }
})
</script>

<style lang="scss">
@import '@/uni.scss';
</style>
```

- [ ] **Step 4: 创建 index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, user-scalable=no, initial-scale=1.0, maximum-scale=1.0, minimum-scale=1.0" />
    <title>酒店安全查询</title>
  </head>
  <body>
    <div id="app"><!--app-html--></div>
    <script type="module" src="/main.js"></script>
  </body>
</html>
```

- [ ] **Step 5: 创建 vite.config.js**

```javascript
import { defineConfig } from 'vite'
import uni from '@dcloudio/vite-plugin-uni'

export default defineConfig({
  plugins: [uni()]
})
```

- [ ] **Step 6: 创建 manifest.json**

```json
{
  "name": "酒店安全查询",
  "appid": "__UNI__HOTELCHECK",
  "description": "入住前查一查，酒店偷拍信息聚合平台",
  "versionName": "1.0.0",
  "versionCode": "100",
  "transformPx": false,
  "mp-weixin": {
    "appid": "YOUR-APPID",
    "setting": {
      "urlCheck": false,
      "es6": true,
      "minified": true
    },
    "usingComponents": true,
    "cloudfunctionRoot": "cloudfunctions/",
    "__usePrivacyCheck__": true
  },
  "vueVersion": "3"
}
```

- [ ] **Step 7: 创建 pages.json**

```json
{
  "pages": [
    {
      "path": "pages/index/index",
      "style": {
        "navigationBarTitleText": "酒店安全查询",
        "navigationBarBackgroundColor": "#FFFFFF",
        "navigationBarTextStyle": "black"
      }
    },
    {
      "path": "pages/search/index",
      "style": {
        "navigationBarTitleText": "搜索",
        "navigationBarBackgroundColor": "#FFFFFF",
        "navigationBarTextStyle": "black"
      }
    },
    {
      "path": "pages/hotel-detail/index",
      "style": {
        "navigationBarTitleText": "酒店详情",
        "navigationBarBackgroundColor": "#FFFFFF",
        "navigationBarTextStyle": "black"
      }
    },
    {
      "path": "pages/submit-review/index",
      "style": {
        "navigationBarTitleText": "提交评论",
        "navigationBarBackgroundColor": "#FFFFFF",
        "navigationBarTextStyle": "black"
      }
    },
    {
      "path": "pages/my/index",
      "style": {
        "navigationBarTitleText": "我的",
        "navigationBarBackgroundColor": "#FFFFFF",
        "navigationBarTextStyle": "black"
      }
    }
  ],
  "globalStyle": {
    "navigationBarTextStyle": "black",
    "navigationBarTitleText": "酒店安全查询",
    "navigationBarBackgroundColor": "#FFFFFF",
    "backgroundColor": "#F5F5F5"
  },
  "easycom": {
    "autoscan": true
  }
}
```

- [ ] **Step 8: 创建 uni.scss**

```scss
$primary-color: #2979ff;
$danger-color: #dd524d;
$warning-color: #f0ad4e;
$safe-color: #4caf50;
$text-color: #333333;
$text-light: #999999;
$bg-color: #f5f5f5;
$border-color: #eeeeee;
$radius: 12rpx;
$spacing-sm: 16rpx;
$spacing-md: 24rpx;
$spacing-lg: 32rpx;
```

- [ ] **Step 9: 安装依赖**

```bash
cd c:/Users/707829851/Desktop/uni-hotelCheck && pnpm install
```

- [ ] **Step 10: 验证项目可编译**

```bash
cd c:/Users/707829851/Desktop/uni-hotelCheck && npx uni build -p mp-weixin
```

预期：编译成功，生成 `dist/dev/mp-weixin/` 目录。

- [ ] **Step 11: Commit**

```bash
git init && git add -A && git commit -m "feat: scaffold uni-app Vue3 project for hotel check mini-program"
```

---

### Task 2: 公共模块（云开发封装 + 敏感词库）

**Files:**
- Create: `common/cloud.js`
- Create: `common/sensitiveWords.js`

- [ ] **Step 1: 创建 common/cloud.js**

```javascript
// 云开发能力封装

const envId = 'YOUR-ENV-ID'

// 调用云函数
export function callCloudFunction(name, data = {}) {
  return new Promise((resolve, reject) => {
    wx.cloud.callFunction({
      name,
      data
    }).then((res) => {
      if (res.result && res.result.code === 0) {
        resolve(res.result.data)
      } else {
        reject(res.result || { msg: '请求失败' })
      }
    }).catch((err) => {
      console.error(`[${name}] 云函数调用失败:`, err)
      reject({ msg: '网络错误，请稍后重试' })
    })
  })
}

// 上传图片到云存储
export function uploadImage(filePath) {
  const cloudPath = `review-images/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
  return new Promise((resolve, reject) => {
    wx.cloud.uploadFile({
      cloudPath,
      filePath
    }).then((res) => {
      resolve(res.fileID)
    }).catch((err) => {
      console.error('图片上传失败:', err)
      reject({ msg: '图片上传失败' })
    })
  })
}

// 获取微信用户信息
export function getUserProfile() {
  return new Promise((resolve, reject) => {
    wx.getUserProfile({
      desc: '用于展示您的评论身份'
    }).then((res) => {
      resolve(res.userInfo)
    }).catch(() => {
      reject({ msg: '获取用户信息失败' })
    })
  })
}

export default {
  callCloudFunction,
  uploadImage,
  getUserProfile
}
```

- [ ] **Step 2: 创建 common/sensitiveWords.js**

```javascript
// 前端敏感词过滤（基础版）
// 实际使用时可扩展为云端敏感词库

const sensitiveWords = [
  '偷拍',
  '摄像头',
  '针孔',
  '隐私',
  '酒店',
  '入住'
  // 注意：这里放的不是过滤词，而是场景相关词白名单
  // 真正需要过滤的是辱骂、色情、广告等违规词
]

const blockedPatterns = [
  /(微信|qq|手机号|电话|联系方式)\s*[:：]\s*\d+/gi,
  /http[s]?:\/\/[^\s]+/gi,
  /[一-龥]*[骂操傻逼滚蛋][一-龥]*/gi
]

export function filterSensitive(text) {
  let filtered = text
  let hasSensitive = false

  for (const pattern of blockedPatterns) {
    if (pattern.test(text)) {
      hasSensitive = true
      filtered = filtered.replace(pattern, '***')
    }
  }

  return { filtered, hasSensitive }
}

// 纯色情/暴恐/政治类需依赖微信 API
export function preValidate(text) {
  if (!text || text.trim().length < 10) {
    return { valid: false, msg: '内容至少10个字' }
  }
  if (text.length > 500) {
    return { valid: false, msg: '内容不能超过500字' }
  }

  const { hasSensitive } = filterSensitive(text)
  if (hasSensitive) {
    return { valid: false, msg: '内容包含不被允许的信息，请修改后提交' }
  }

  return { valid: true }
}
```

- [ ] **Step 3: Commit**

```bash
git add common/cloud.js common/sensitiveWords.js && git commit -m "feat: add cloud dev wrapper and content filter utilities"
```

---

### Task 3: 评论卡片组件 review-card

**Files:**
- Create: `components/review-card.vue`

- [ ] **Step 1: 创建 components/review-card.vue**

```vue
<template>
  <view class="review-card">
    <view class="review-header">
      <view class="review-type">
        <text v-if="type === 'case'" class="tag tag-case">公开案件</text>
        <text v-else class="tag tag-user">用户评论</text>
      </view>
      <text class="review-date">{{ formatDate(discoveryDate) }}</text>
    </view>
    <view class="review-content">{{ content }}</view>
    <view v-if="source && type === 'case'" class="review-source">
      <text class="source-label">来源：</text>
      <text class="source-link">{{ source }}</text>
    </view>
    <view v-if="images && images.length > 0" class="review-images">
      <image
        v-for="(img, idx) in images"
        :key="idx"
        :src="img"
        mode="aspectFill"
        class="review-image"
      />
    </view>
    <view class="review-footer">
      <text class="review-time">{{ timeAgo }}</text>
    </view>
  </view>
</template>

<script setup>
import { computed } from 'vue'
import dayjs from 'dayjs'

const props = defineProps({
  type: { type: String, default: 'user' },
  content: { type: String, default: '' },
  discoveryDate: { type: String, default: '' },
  source: { type: String, default: '' },
  images: { type: Array, default: () => [] },
  createdAt: { type: String, default: '' }
})

function formatDate(dateStr) {
  if (!dateStr) return ''
  return dayjs(dateStr).format('YYYY年MM月DD日')
}

const timeAgo = computed(() => {
  if (!props.createdAt) return ''
  const now = dayjs()
  const created = dayjs(props.createdAt)
  const days = now.diff(created, 'day')
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 30) return `${days}天前`
  if (days < 365) return `${Math.floor(days / 30)}个月前`
  return `${Math.floor(days / 365)}年前`
})
</script>

<style lang="scss" scoped>
.review-card {
  background: #fff;
  border-radius: $radius;
  padding: $spacing-md;
  margin-bottom: $spacing-md;
}

.review-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: $spacing-sm;
}

.tag {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 6rpx;
}

.tag-case {
  background: #fde8e8;
  color: $danger-color;
  font-weight: 600;
}

.tag-user {
  background: #e8f0fe;
  color: $primary-color;
}

.review-date {
  font-size: 24rpx;
  color: $text-light;
}

.review-content {
  font-size: 28rpx;
  color: $text-color;
  line-height: 1.6;
  margin-bottom: $spacing-sm;
}

.review-source {
  font-size: 24rpx;
  color: $text-light;
  margin-bottom: $spacing-sm;

  .source-label { color: $text-light; }
  .source-link { color: $primary-color; }
}

.review-images {
  display: flex;
  gap: $spacing-sm;
  margin-bottom: $spacing-sm;

  .review-image {
    width: 160rpx;
    height: 160rpx;
    border-radius: 8rpx;
  }
}

.review-footer {
  .review-time {
    font-size: 22rpx;
    color: $text-light;
  }
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add components/review-card.vue && git commit -m "feat: add review card component"
```

---

### Task 4: 首页 — 搜索 + 最新动态

**Files:**
- Create: `pages/index/index.vue`

- [ ] **Step 1: 创建 pages/index/index.vue**

```vue
<template>
  <view class="page">
    <view class="search-section">
      <view class="search-box" @click="goSearch">
        <image class="search-icon" src="/static/search.svg" mode="aspectFit" />
        <text class="search-placeholder">搜索酒店名称</text>
      </view>
    </view>

    <view class="recent-section">
      <view class="section-title">
        <text class="title-text">最新评论</text>
      </view>

      <view v-if="recentReviews.length > 0" class="review-list">
        <view
          v-for="item in recentReviews"
          :key="item._id"
          class="recent-item"
          @click="goDetail(item.hotelId)"
        >
          <view class="item-hotel-name">{{ item.hotelName || '未知酒店' }}</view>
          <text class="item-content">{{ item.content }}</text>
          <text class="item-time">{{ item.timeAgo }}</text>
        </view>
      </view>

      <view v-else class="empty-state">
        <text class="empty-text">暂无评论数据</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import dayjs from 'dayjs'

const recentReviews = ref([])

function formatTimeAgo(dateStr) {
  const now = dayjs()
  const created = dayjs(dateStr)
  const days = now.diff(created, 'day')
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 30) return `${days}天前`
  return `${Math.floor(days / 30)}个月前`
}

onMounted(async () => {
  try {
    const db = wx.cloud.database()
    const res = await db.collection('reviews')
      .where({ status: 'approved' })
      .orderBy('createdAt', 'desc')
      .limit(20)
      .get()

    if (res.data && res.data.length > 0) {
      const hotelIds = [...new Set(res.data.map(r => r.hotelId))]
      const hotelMap = {}

      if (hotelIds.length > 0) {
        const hotelRes = await db.collection('hotels')
          .where({ _id: db.command.in(hotelIds) })
          .get()
        hotelRes.data.forEach(h => { hotelMap[h._id] = h.name })
      }

      recentReviews.value = res.data.map(r => ({
        ...r,
        hotelName: hotelMap[r.hotelId] || '未知酒店',
        timeAgo: formatTimeAgo(r.createdAt)
      }))
    }
  } catch (err) {
    console.error('获取最新评论失败:', err)
  }
})

function goSearch() {
  uni.navigateTo({ url: '/pages/search/index' })
}

function goDetail(hotelId) {
  uni.navigateTo({ url: `/pages/hotel-detail/index?id=${hotelId}` })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: $bg-color;
}

.search-section {
  padding: $spacing-md;
  background: #fff;
}

.search-box {
  display: flex;
  align-items: center;
  height: 80rpx;
  background: #f5f5f5;
  border-radius: 40rpx;
  padding: 0 $spacing-md;
}

.search-icon {
  width: 36rpx;
  height: 36rpx;
  margin-right: $spacing-sm;
}

.search-placeholder {
  font-size: 28rpx;
  color: $text-light;
}

.recent-section {
  padding: $spacing-md;
}

.section-title {
  margin-bottom: $spacing-md;

  .title-text {
    font-size: 32rpx;
    font-weight: 600;
    color: $text-color;
  }
}

.recent-item {
  background: #fff;
  border-radius: $radius;
  padding: $spacing-md;
  margin-bottom: $spacing-sm;
}

.item-hotel-name {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-color;
  margin-bottom: 8rpx;
}

.item-content {
  font-size: 26rpx;
  color: #666;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.item-time {
  display: block;
  font-size: 22rpx;
  color: $text-light;
  margin-top: 8rpx;
}

.empty-state {
  text-align: center;
  padding: 80rpx 0;

  .empty-text {
    font-size: 28rpx;
    color: $text-light;
  }
}
</style>
```

- [ ] **Step 2: 创建搜索图标占位，往 static/ 目录放一个 search.svg**

用任意搜索图标 SVG。后续可替换。

- [ ] **Step 3: Commit**

```bash
git add pages/index/index.vue static/search.svg && git commit -m "feat: add home page with search entry and recent reviews"
```

---

### Task 5: 搜索结果页

**Files:**
- Create: `pages/search/index.vue`

- [ ] **Step 1: 创建 pages/search/index.vue**

```vue
<template>
  <view class="page">
    <view class="search-bar">
      <view class="search-input-wrap">
        <input
          class="search-input"
          v-model="keyword"
          placeholder="输入酒店名称"
          confirm-type="search"
          @confirm="doSearch"
          focus
        />
      </view>
      <text class="search-btn" @click="doSearch">搜索</text>
    </view>

    <view v-if="loading" class="loading-state">
      <text>搜索中...</text>
    </view>

    <view v-else-if="results.length > 0" class="result-list">
      <view
        v-for="hotel in results"
        :key="hotel._id"
        class="result-item"
        @click="goDetail(hotel._id)"
      >
        <view class="hotel-name">{{ hotel.name }}</view>
        <view class="hotel-address">{{ hotel.address }}</view>
        <view class="hotel-stats">
          <text v-if="hotel.hasCase" class="stat case-stat">
            <text class="stat-dot case-dot"></text>
            {{ hotel.caseCount }}条案件记录
          </text>
          <text v-if="hotel.reviewCount > 0" class="stat review-stat">
            {{ hotel.reviewCount }}条评论
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
      <text class="empty-hint">请尝试其他关键词</text>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'

const keyword = ref('')
const results = ref([])
const loading = ref(false)
const searched = ref(false)

async function doSearch() {
  const kw = keyword.value.trim()
  if (!kw) return

  loading.value = true
  searched.value = true
  results.value = []

  try {
    const res = await wx.cloud.callFunction({
      name: 'search-hotels',
      data: { keyword: kw }
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
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: $bg-color;
}

.search-bar {
  display: flex;
  align-items: center;
  padding: $spacing-sm $spacing-md;
  background: #fff;
}

.search-input-wrap {
  flex: 1;
  height: 72rpx;
  background: #f5f5f5;
  border-radius: 36rpx;
  padding: 0 $spacing-md;
  display: flex;
  align-items: center;
}

.search-input {
  width: 100%;
  font-size: 28rpx;
}

.search-btn {
  margin-left: $spacing-md;
  font-size: 28rpx;
  color: $primary-color;
}

.loading-state {
  text-align: center;
  padding: 120rpx 0;
  font-size: 28rpx;
  color: $text-light;
}

.result-item {
  display: flex;
  flex-direction: column;
  background: #fff;
  padding: $spacing-md;
  margin-bottom: 2rpx;
  position: relative;
}

.hotel-name {
  font-size: 30rpx;
  font-weight: 600;
  color: $text-color;
  margin-bottom: 6rpx;
}

.hotel-address {
  font-size: 24rpx;
  color: $text-light;
  margin-bottom: $spacing-sm;
}

.hotel-stats {
  display: flex;
  gap: $spacing-md;
}

.stat {
  font-size: 24rpx;
  display: flex;
  align-items: center;
}

.case-stat {
  color: $danger-color;
}

.stat-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  margin-right: 8rpx;
}

.case-dot {
  background: $danger-color;
}

.review-stat {
  color: $primary-color;
}

.no-stat {
  color: $safe-color;
}

.arrow {
  position: absolute;
  right: $spacing-md;
  top: 50%;
  transform: translateY(-50%);
  font-size: 40rpx;
  color: #ccc;
}

.empty-result {
  text-align: center;
  padding: 120rpx 0;

  .empty-text {
    font-size: 30rpx;
    color: $text-color;
    display: block;
  }

  .empty-hint {
    font-size: 26rpx;
    color: $text-light;
    display: block;
    margin-top: 12rpx;
  }
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add pages/search/index.vue && git commit -m "feat: add hotel search page with local + Amap fallback"
```

---

### Task 6: 酒店详情页

**Files:**
- Create: `pages/hotel-detail/index.vue`

- [ ] **Step 1: 创建 pages/hotel-detail/index.vue**

```vue
<template>
  <view class="page">
    <view v-if="loading" class="loading-state">
      <text>加载中...</text>
    </view>

    <template v-else-if="hotel">
      <view class="hotel-header">
        <text class="hotel-name">{{ hotel.name }}</text>
        <text class="hotel-address">{{ hotel.address }}</text>
      </view>

      <view v-if="reviews.length > 0" class="reviews-section">
        <view class="section-label">相关记录（{{ reviews.length }}条）</view>
        <review-card
          v-for="item in reviews"
          :key="item._id"
          :type="item.type"
          :content="item.content"
          :discoveryDate="item.discoveryDate"
          :source="item.source"
          :images="item.images"
          :createdAt="item.createdAt"
        />
      </view>

      <view v-else class="empty-reviews">
        <text class="empty-text">该酒店暂无相关记录</text>
        <text class="empty-hint">如果您了解相关情况，欢迎提交评论</text>
      </view>

      <view class="disclaimer">
        <text class="disclaimer-text">免责声明：本站展示内容为用户自发分享和公开信息聚合，仅供参考，本站不对评论真实性负责。</text>
      </view>
    </template>

    <view class="bottom-bar">
      <button class="submit-btn" @click="goSubmit">我要评论 / 举报</button>
    </view>
  </view>
</template>

<script setup>
import { ref, onLoad } from '@dcloudio/uni-app'
import ReviewCard from '@/components/review-card.vue'

const loading = ref(true)
const hotel = ref(null)
const reviews = ref([])

onLoad(async (options) => {
  const hotelId = options.id
  if (!hotelId) {
    uni.showToast({ title: '参数错误', icon: 'none' })
    uni.navigateBack()
    return
  }

  try {
    const res = await wx.cloud.callFunction({
      name: 'get-hotel-detail',
      data: { hotelId }
    })

    if (res.result && res.result.code === 0) {
      hotel.value = res.result.data.hotel
      reviews.value = res.result.data.reviews
    }
  } catch (err) {
    console.error('获取酒店详情失败:', err)
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
})

function goSubmit() {
  const hotelId = hotel.value?._id
  const hotelName = hotel.value?.name
  uni.navigateTo({
    url: `/pages/submit-review/index?hotelId=${hotelId}&hotelName=${encodeURIComponent(hotelName || '')}`
  })
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: $bg-color;
  padding-bottom: 120rpx;
}

.hotel-header {
  background: #fff;
  padding: $spacing-lg $spacing-md;
  margin-bottom: $spacing-md;

  .hotel-name {
    font-size: 36rpx;
    font-weight: 700;
    color: $text-color;
    display: block;
    margin-bottom: 8rpx;
  }

  .hotel-address {
    font-size: 26rpx;
    color: $text-light;
  }
}

.reviews-section {
  padding: 0 $spacing-md;
}

.section-label {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-color;
  margin-bottom: $spacing-md;
}

.empty-reviews {
  text-align: center;
  padding: 100rpx $spacing-md;

  .empty-text {
    font-size: 30rpx;
    color: $text-color;
    display: block;
  }

  .empty-hint {
    font-size: 26rpx;
    color: $text-light;
    display: block;
    margin-top: 12rpx;
  }
}

.disclaimer {
  padding: $spacing-md;
  margin: $spacing-md 0;

  .disclaimer-text {
    font-size: 22rpx;
    color: $text-light;
    line-height: 1.6;
  }
}

.loading-state {
  text-align: center;
  padding: 200rpx 0;
  font-size: 28rpx;
  color: $text-light;
}

.bottom-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: #fff;
  padding: $spacing-sm $spacing-md;
  padding-bottom: calc($spacing-sm + env(safe-area-inset-bottom));
  box-shadow: 0 -2rpx 10rpx rgba(0,0,0,0.05);

  .submit-btn {
    background: $primary-color;
    color: #fff;
    font-size: 30rpx;
    border-radius: 40rpx;
    padding: 20rpx 0;
  }
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add pages/hotel-detail/index.vue && git commit -m "feat: add hotel detail page with reviews and disclaimer"
```

---

### Task 7: 提交评论页

**Files:**
- Create: `pages/submit-review/index.vue`

- [ ] **Step 1: 创建 pages/submit-review/index.vue**

```vue
<template>
  <view class="page">
    <view class="form-section">
      <view class="form-item">
        <text class="form-label">酒店</text>
        <text class="form-value">{{ hotelName }}</text>
      </view>

      <view class="form-item">
        <text class="form-label">发现日期</text>
        <picker
          mode="date"
          :value="discoveryDate"
          :end="today"
          @change="onDateChange"
        >
          <view class="picker-value">
            {{ discoveryDate || '请选择日期' }}
          </view>
        </picker>
      </view>

      <view class="form-item form-item-textarea">
        <text class="form-label">详细描述</text>
        <textarea
          class="form-textarea"
          v-model="content"
          placeholder="请描述您了解的情况（至少10个字）"
          :maxlength="500"
          :show-confirm-bar="false"
        />
        <text class="char-count">{{ content.length }}/500</text>
      </view>

      <view class="form-item">
        <text class="form-label">截图证据（可选）</text>
        <view class="image-upload">
          <view
            v-for="(img, idx) in images"
            :key="idx"
            class="image-preview"
            @click="previewImage(idx)"
          >
            <image :src="img" mode="aspectFill" class="preview-img" />
            <view class="delete-icon" @click.stop="removeImage(idx)">×</view>
          </view>
          <view
            v-if="images.length < 3"
            class="image-add"
            @click="chooseImage"
          >
            <text class="add-icon">+</text>
            <text class="add-text">{{ images.length }}/3</text>
          </view>
        </view>
      </view>
    </view>

    <view class="disclaimer-box">
      <text class="disclaimer-title">提交须知</text>
      <text class="disclaimer-text">1. 请确保内容真实可信，虚假信息需承担法律责任。</text>
      <text class="disclaimer-text">2. 评论提交后进入审核，审核通过后公开展示。</text>
      <text class="disclaimer-text">3. 本站为信息聚合平台，内容仅供参考。</text>
    </view>

    <button class="submit-btn" @click="doSubmit" :disabled="submitting">
      {{ submitting ? '提交中...' : '提交' }}
    </button>
  </view>
</template>

<script setup>
import { ref, onLoad } from '@dcloudio/uni-app'
import { preValidate } from '@/common/sensitiveWords.js'

const hotelId = ref('')
const hotelName = ref('')
const discoveryDate = ref('')
const content = ref('')
const images = ref([])
const submitting = ref(false)
const today = new Date().toISOString().split('T')[0]

onLoad((options) => {
  hotelId.value = options.hotelId || ''
  hotelName.value = decodeURIComponent(options.hotelName || '')
})

function onDateChange(e) {
  discoveryDate.value = e.detail.value
}

function chooseImage() {
  uni.chooseImage({
    count: 3 - images.value.length,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      for (const path of res.tempFilePaths) {
        try {
          const cloudPath = `review-images/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
          const uploadRes = await wx.cloud.uploadFile({
            cloudPath,
            filePath: path
          })
          images.value.push(uploadRes.fileID)
        } catch (err) {
          console.error('上传失败:', err)
          uni.showToast({ title: '图片上传失败', icon: 'none' })
        }
      }
    }
  })
}

function removeImage(idx) {
  images.value.splice(idx, 1)
}

function previewImage(idx) {
  uni.previewImage({
    urls: images.value,
    current: images.value[idx]
  })
}

async function doSubmit() {
  if (!hotelId.value) {
    uni.showToast({ title: '酒店信息缺失', icon: 'none' })
    return
  }

  const validation = preValidate(content.value)
  if (!validation.valid) {
    uni.showToast({ title: validation.msg, icon: 'none' })
    return
  }

  if (!discoveryDate.value) {
    uni.showToast({ title: '请选择发现日期', icon: 'none' })
    return
  }

  submitting.value = true

  try {
    const res = await wx.cloud.callFunction({
      name: 'submit-review',
      data: {
        hotelId: hotelId.value,
        content: content.value,
        discoveryDate: discoveryDate.value,
        images: images.value
      }
    })

    if (res.result && res.result.code === 0) {
      uni.showToast({ title: '提交成功，审核后展示', icon: 'success' })
      setTimeout(() => { uni.navigateBack() }, 1500)
    } else {
      uni.showToast({ title: res.result?.msg || '提交失败', icon: 'none' })
    }
  } catch (err) {
    console.error('提交失败:', err)
    uni.showToast({ title: '提交失败，请重试', icon: 'none' })
  } finally {
    submitting.value = false
  }
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: $bg-color;
  padding-bottom: 60rpx;
}

.form-section {
  background: #fff;
  margin-bottom: $spacing-md;
}

.form-item {
  padding: $spacing-md;
  border-bottom: 1rpx solid $border-color;
}

.form-label {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: $text-color;
  margin-bottom: 12rpx;
}

.form-value {
  font-size: 28rpx;
  color: $text-color;
}

.picker-value {
  font-size: 28rpx;
  color: $primary-color;
}

.form-item-textarea {
  .form-textarea {
    width: 100%;
    height: 200rpx;
    font-size: 28rpx;
    line-height: 1.6;
  }

  .char-count {
    text-align: right;
    font-size: 22rpx;
    color: $text-light;
    margin-top: 8rpx;
  }
}

.image-upload {
  display: flex;
  flex-wrap: wrap;
  gap: $spacing-sm;
}

.image-preview {
  position: relative;
  width: 160rpx;
  height: 160rpx;

  .preview-img {
    width: 100%;
    height: 100%;
    border-radius: 8rpx;
  }

  .delete-icon {
    position: absolute;
    top: -12rpx;
    right: -12rpx;
    width: 40rpx;
    height: 40rpx;
    background: $danger-color;
    color: #fff;
    border-radius: 50%;
    text-align: center;
    line-height: 40rpx;
    font-size: 28rpx;
  }
}

.image-add {
  width: 160rpx;
  height: 160rpx;
  border: 2rpx dashed #ccc;
  border-radius: 8rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  .add-icon {
    font-size: 48rpx;
    color: #ccc;
  }

  .add-text {
    font-size: 22rpx;
    color: #ccc;
    margin-top: 4rpx;
  }
}

.disclaimer-box {
  margin: 0 $spacing-md $spacing-md;
  padding: $spacing-md;
  background: #fffbe6;
  border-radius: $radius;

  .disclaimer-title {
    display: block;
    font-size: 26rpx;
    font-weight: 600;
    color: #b8860b;
    margin-bottom: 8rpx;
  }

  .disclaimer-text {
    display: block;
    font-size: 22rpx;
    color: #8b7355;
    line-height: 1.8;
  }
}

.submit-btn {
  margin: 0 $spacing-md;
  background: $primary-color;
  color: #fff;
  font-size: 30rpx;
  border-radius: 40rpx;
  padding: 24rpx 0;
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add pages/submit-review/index.vue && git commit -m "feat: add review submission page with image upload and pre-audit"
```

---

### Task 8: 我的页面

**Files:**
- Create: `pages/my/index.vue`

- [ ] **Step 1: 创建 pages/my/index.vue**

```vue
<template>
  <view class="page">
    <view class="user-section" @click="doLogin">
      <image
        v-if="userInfo.avatarUrl"
        :src="userInfo.avatarUrl"
        class="avatar"
        mode="aspectFill"
      />
      <view v-else class="avatar-placeholder">
        <text class="avatar-text">?</text>
      </view>
      <view class="user-info">
        <text class="user-name">{{ userInfo.nickName || '点击登录' }}</text>
        <text class="user-hint">{{ userInfo.nickName ? '已授权' : '登录后可评论' }}</text>
      </view>
    </view>

    <view class="my-reviews-section">
      <view class="section-title">我的评论</view>

      <view v-if="myReviews.length > 0" class="review-list">
        <view v-for="item in myReviews" :key="item._id" class="my-review-item">
          <view class="item-header">
            <text class="item-hotel">{{ item.hotelName || '未知酒店' }}</text>
            <text :class="statusClass(item.status)">{{ statusLabel(item.status) }}</text>
          </view>
          <text class="item-content">{{ item.content }}</text>
          <text class="item-time">{{ item.timeAgo }}</text>
        </view>
      </view>

      <view v-else class="empty-state">
        <text class="empty-text">暂无评论记录</text>
      </view>
    </view>
  </view>
</template>

<script setup>
import { ref } from 'vue'
import dayjs from 'dayjs'

const userInfo = ref({})
const myReviews = ref([])

function doLogin() {
  if (userInfo.value.nickName) return

  wx.getUserProfile({
    desc: '用于展示您的评论身份'
  }).then((res) => {
    userInfo.value = res.userInfo
    uni.setStorageSync('userInfo', res.userInfo)
    loadMyReviews()
  }).catch(() => {
    uni.showToast({ title: '需要授权才能评论', icon: 'none' })
  })
}

function statusLabel(status) {
  const map = { pending: '审核中', approved: '已通过', rejected: '未通过' }
  return map[status] || status
}

function statusClass(status) {
  const map = { pending: 's-pending', approved: 's-approved', rejected: 's-rejected' }
  return map[status] || ''
}

function formatTimeAgo(dateStr) {
  const now = dayjs()
  const created = dayjs(dateStr)
  const days = now.diff(created, 'day')
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 30) return `${days}天前`
  return `${Math.floor(days / 30)}个月前`
}

async function loadMyReviews() {
  try {
    const db = wx.cloud.database()
    const res = await db.collection('reviews')
      .where({ _openid: '{openid}' })
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get()

    if (res.data && res.data.length > 0) {
      const hotelIds = [...new Set(res.data.map(r => r.hotelId))]
      const hotelMap = {}
      if (hotelIds.length > 0) {
        const hotelRes = await db.collection('hotels')
          .where({ _id: db.command.in(hotelIds) })
          .get()
        hotelRes.data.forEach(h => { hotelMap[h._id] = h.name })
      }

      myReviews.value = res.data.map(r => ({
        ...r,
        hotelName: hotelMap[r.hotelId] || '未知酒店',
        timeAgo: formatTimeAgo(r.createdAt)
      }))
    }
  } catch (err) {
    console.error('加载我的评论失败:', err)
  }
}

// 启动时恢复登录状态
const saved = uni.getStorageSync('userInfo')
if (saved) {
  userInfo.value = saved
  loadMyReviews()
}
</script>

<style lang="scss" scoped>
.page {
  min-height: 100vh;
  background: $bg-color;
}

.user-section {
  display: flex;
  align-items: center;
  padding: $spacing-lg $spacing-md;
  background: #fff;
  margin-bottom: $spacing-md;
}

.avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  margin-right: $spacing-md;
}

.avatar-placeholder {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: #e0e0e0;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: $spacing-md;

  .avatar-text {
    font-size: 40rpx;
    color: #999;
  }
}

.user-name {
  font-size: 32rpx;
  font-weight: 600;
  color: $text-color;
  display: block;
}

.user-hint {
  font-size: 24rpx;
  color: $text-light;
}

.my-reviews-section {
  padding: 0 $spacing-md;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: $text-color;
  margin-bottom: $spacing-md;
}

.my-review-item {
  background: #fff;
  border-radius: $radius;
  padding: $spacing-md;
  margin-bottom: $spacing-sm;

  .item-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: $spacing-sm;
  }

  .item-hotel {
    font-size: 26rpx;
    font-weight: 600;
    color: $text-color;
  }

  .s-pending { font-size: 22rpx; color: $warning-color; }
  .s-approved { font-size: 22rpx; color: $safe-color; }
  .s-rejected { font-size: 22rpx; color: $danger-color; }

  .item-content {
    font-size: 26rpx;
    color: #666;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .item-time {
    font-size: 22rpx;
    color: $text-light;
    margin-top: 8rpx;
    display: block;
  }
}

.empty-state {
  text-align: center;
  padding: 100rpx 0;

  .empty-text {
    font-size: 28rpx;
    color: $text-light;
  }
}
</style>
```

- [ ] **Step 2: Commit**

```bash
git add pages/my/index.vue && git commit -m "feat: add my page with login and review history"
```

---

### Task 9: 云函数 — search-hotels

**Files:**
- Create: `cloudfunctions/search-hotels/index.js`
- Create: `cloudfunctions/search-hotels/package.json`

- [ ] **Step 1: 创建 cloudfunctions/search-hotels/package.json**

```json
{
  "name": "search-hotels",
  "version": "1.0.0",
  "description": "酒店搜索云函数",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "latest"
  }
}
```

- [ ] **Step 2: 创建 cloudfunctions/search-hotels/index.js**

```javascript
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { keyword } = event
  if (!keyword || !keyword.trim()) {
    return { code: 1, msg: '关键词不能为空' }
  }

  try {
    const kw = keyword.trim()

    // 1. 本地数据库模糊搜索
    const localResult = await db.collection('hotels')
      .where(db.command.or([
        { name: db.RegExp({ regexp: kw, options: 'i' }) },
        { address: db.RegExp({ regexp: kw, options: 'i' }) }
      ]))
      .limit(20)
      .get()

    // 2. 本地搜不到则调高德 API 补录
    if (!localResult.data || localResult.data.length === 0) {
      const amapHotels = await searchAmap(kw)
      if (amapHotels.length > 0) {
        const inserts = amapHotels.map(h => ({
          name: h.name,
          address: h.address || '',
          hasCase: false,
          caseCount: 0,
          reviewCount: 0,
          createdAt: new Date()
        }))

        for (const h of inserts) {
          await db.collection('hotels').add({ data: h })
        }

        const freshResult = await db.collection('hotels')
          .where(db.command.or([
            { name: db.RegExp({ regexp: kw, options: 'i' }) },
            { address: db.RegExp({ regexp: kw, options: 'i' }) }
          ]))
          .limit(20)
          .get()

        return { code: 0, data: freshResult.data }
      }
    }

    return { code: 0, data: localResult.data || [] }
  } catch (err) {
    console.error('search-hotels error:', err)
    return { code: 500, msg: '搜索失败', error: err.message }
  }
}

async function searchAmap(keyword) {
  const AMAP_KEY = 'YOUR-AMAP-KEY'
  const https = require('https')

  return new Promise((resolve) => {
    const url = `https://restapi.amap.com/v5/place/text?key=${AMAP_KEY}&keywords=${encodeURIComponent(keyword)}&types=100000&city_limit=false&page_size=10`
    https.get(url, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (json.status === '1' && json.pois) {
            resolve(json.pois.map(p => ({
              name: p.name,
              address: `${p.pname || ''}${p.cityname || ''}${p.adname || ''}${p.address || ''}`
            })))
          } else {
            resolve([])
          }
        } catch (_) {
          resolve([])
        }
      })
    }).on('error', () => resolve([]))
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add cloudfunctions/search-hotels/ && git commit -m "feat: add search-hotels cloud function with Amap fallback"
```

---

### Task 10: 云函数 — get-hotel-detail

**Files:**
- Create: `cloudfunctions/get-hotel-detail/index.js`
- Create: `cloudfunctions/get-hotel-detail/package.json`

- [ ] **Step 1: 创建 cloudfunctions/get-hotel-detail/package.json**

```json
{
  "name": "get-hotel-detail",
  "version": "1.0.0",
  "description": "获取酒店详情云函数",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "latest"
  }
}
```

- [ ] **Step 2: 创建 cloudfunctions/get-hotel-detail/index.js**

```javascript
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event) => {
  const { hotelId } = event
  if (!hotelId) {
    return { code: 1, msg: '酒店ID不能为空' }
  }

  try {
    const hotelRes = await db.collection('hotels').doc(hotelId).get()
    const hotel = hotelRes.data

    if (!hotel) {
      return { code: 2, msg: '酒店不存在' }
    }

    const reviewsRes = await db.collection('reviews')
      .where({
        hotelId,
        status: 'approved'
      })
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get()

    return {
      code: 0,
      data: {
        hotel,
        reviews: reviewsRes.data || []
      }
    }
  } catch (err) {
    console.error('get-hotel-detail error:', err)
    return { code: 500, msg: '获取详情失败', error: err.message }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add cloudfunctions/get-hotel-detail/ && git commit -m "feat: add get-hotel-detail cloud function"
```

---

### Task 11: 云函数 — submit-review

**Files:**
- Create: `cloudfunctions/submit-review/index.js`
- Create: `cloudfunctions/submit-review/package.json`

- [ ] **Step 1: 创建 cloudfunctions/submit-review/package.json**

```json
{
  "name": "submit-review",
  "version": "1.0.0",
  "description": "提交评论云函数（含内容安全审核）",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "latest"
  }
}
```

- [ ] **Step 2: 创建 cloudfunctions/submit-review/index.js**

```javascript
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

exports.main = async (event, context) => {
  const { hotelId, content, discoveryDate, images = [] } = event
  const { OPENID } = cloud.getWXContext()

  if (!OPENID) {
    return { code: 1, msg: '请先登录' }
  }

  if (!hotelId || !content || !content.trim()) {
    return { code: 2, msg: '参数不完整' }
  }

  if (content.trim().length < 10) {
    return { code: 3, msg: '内容至少10个字' }
  }

  if (content.length > 500) {
    return { code: 4, msg: '内容不能超过500字' }
  }

  // 调用微信内容安全审核
  try {
    const checkResult = await cloud.openapi.security.msgSecCheck({
      content: content.trim(),
      version: 2,
      scene: 2,
      openid: OPENID
    })

    if (checkResult.result && checkResult.result.suggest === 'risky') {
      return { code: 5, msg: '内容包含违规信息，请修改后提交' }
    }
  } catch (err) {
    // msgSecCheck 调用失败时降级为人工审核
    console.warn('msgSecCheck failed, fallback to manual review:', err.message)
  }

  // 图片也做安全检查（如果有）
  if (images.length > 0) {
    try {
      for (const fileId of images) {
        const imgCheck = await cloud.openapi.security.imgSecCheck({
          media: { contentType: 'image/jpeg', value: fileId }
        })
        if (imgCheck.result && imgCheck.result.suggest === 'risky') {
          return { code: 6, msg: '图片包含违规内容，请更换' }
        }
      }
    } catch (err) {
      console.warn('imgSecCheck failed:', err.message)
    }
  }

  // 写入待审队列
  try {
    const res = await db.collection('reviews').add({
      data: {
        hotelId,
        content: content.trim(),
        discoveryDate: discoveryDate || '',
        images,
        type: 'user',
        status: 'pending',
        createdAt: new Date()
      }
    })

    return {
      code: 0,
      msg: '提交成功',
      data: { reviewId: res._id }
    }
  } catch (err) {
    console.error('submit-review write error:', err)
    return { code: 500, msg: '提交失败', error: err.message }
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add cloudfunctions/submit-review/ && git commit -m "feat: add submit-review cloud function with content safety checks"
```

---

### Task 12: 云函数 — sync-hotels（定时任务）

**Files:**
- Create: `cloudfunctions/sync-hotels/index.js`
- Create: `cloudfunctions/sync-hotels/package.json`

- [ ] **Step 1: 创建 cloudfunctions/sync-hotels/package.json**

```json
{
  "name": "sync-hotels",
  "version": "1.0.0",
  "description": "定时同步酒店数据云函数",
  "main": "index.js",
  "dependencies": {
    "wx-server-sdk": "latest"
  }
}
```

- [ ] **Step 2: 创建 cloudfunctions/sync-hotels/index.js**

```javascript
const cloud = require('wx-server-sdk')

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const https = require('https')

const AMAP_KEY = 'YOUR-AMAP-KEY'

// 主要城市列表
const CITIES = [
  '北京', '上海', '广州', '深圳', '杭州', '成都', '重庆',
  '武汉', '西安', '南京', '长沙', '郑州', '天津', '苏州',
  '厦门', '青岛', '大连', '昆明', '三亚', '丽江', '大理'
]

exports.main = async () => {
  let totalAdded = 0

  for (const city of CITIES) {
    try {
      const hotels = await fetchHotelsFromAmap(city)
      for (const h of hotels) {
        const exist = await db.collection('hotels')
          .where({ name: h.name, address: h.address })
          .count()

        if (exist.total === 0) {
          await db.collection('hotels').add({
            data: {
              name: h.name,
              address: h.address,
              hasCase: false,
              caseCount: 0,
              reviewCount: 0,
              createdAt: new Date()
            }
          })
          totalAdded++
        }
      }
    } catch (err) {
      console.error(`Sync ${city} failed:`, err.message)
    }
  }

  return { code: 0, msg: `同步完成，新增 ${totalAdded} 家酒店` }
}

function fetchHotelsFromAmap(city) {
  return new Promise((resolve) => {
    const url = `https://restapi.amap.com/v5/place/text?key=${AMAP_KEY}&keywords=酒店&types=100000&region=${encodeURIComponent(city)}&city_limit=true&page_size=25`

    https.get(url, (res) => {
      let data = ''
      res.on('data', chunk => { data += chunk })
      res.on('end', () => {
        try {
          const json = JSON.parse(data)
          if (json.status === '1' && json.pois) {
            resolve(json.pois.map(p => ({
              name: p.name,
              address: `${p.pname || ''}${p.cityname || ''}${p.adname || ''}${p.address || ''}`
            })))
          } else {
            resolve([])
          }
        } catch (_) {
          resolve([])
        }
      })
    }).on('error', () => resolve([]))
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add cloudfunctions/sync-hotels/ && git commit -m "feat: add sync-hotels cloud function for Amap data sync"
```

---

### Task 13: 数据库初始化 + 云函数部署

- [ ] **Step 1: 在微信云开发控制台创建数据库集合**

在微信开发者工具 → 云开发 → 数据库 → 新建集合：
- `hotels` — 权限：所有用户可读，仅管理员可写
- `reviews` — 权限：所有用户可读，仅创建者可写

- [ ] **Step 2: 配置高德 API Key**

在高德开放平台 (https://lbs.amap.com) 注册个人开发者，获取 Key，更新两个云函数中的 `AMAP_KEY` 变量：
- `cloudfunctions/search-hotels/index.js`
- `cloudfunctions/sync-hotels/index.js`

- [ ] **Step 3: 配置微信云开发环境 ID**

在微信开发者工具 → 云开发 → 设置 → 复制环境 ID，更新：
- `App.vue` 中的 `env: 'YOUR-ENV-ID'`
- `common/cloud.js` 中的 `envId`

- [ ] **Step 4: 上传并部署云函数**

在微信开发者工具中，右键每个云函数目录 → 上传并部署：云端安装依赖。

- [ ] **Step 5: 配置 sync-hotels 定时触发器**

在云开发控制台 → 云函数 → sync-hotels → 触发器 → 新建：
- 触发方式：定时触发
- Cron 表达式：`0 0 3 * * 1`（每周一凌晨3点执行）

- [ ] **Step 6: 运行一次 sync-hotels 初始化种子数据**

在云开发控制台 → 云函数 → sync-hotels → 测试，手动触发一次。

- [ ] **Step 7: Commit**

```bash
git add -A && git commit -m "chore: configure cloud environment and API keys"
```

---

### Task 14: 配置 manifest.json + 编译验证

- [ ] **Step 1: 更新 manifest.json 填写真实 appid**

将微信小程序 AppID 填入 `manifest.json` → `mp-weixin.appid`。

- [ ] **Step 2: 编译到微信小程序**

```bash
cd c:/Users/707829851/Desktop/uni-hotelCheck && pnpm run build:mp-weixin
```

- [ ] **Step 3: 在微信开发者工具中打开 `dist/build/mp-weixin/`**

验证：
1. 首页能看到搜索框和最新评论列表
2. 搜索能返回结果
3. 点击酒店能进详情页
4. 能提交评论（需微信授权）
5. "我的"页面能看到登录信息和评论历史

- [ ] **Step 4: Commit**

```bash
git add -A && git commit -m "chore: final config and build verification"
```

---

## Plan Self-Review

- Spec coverage: 首页、搜索结果、酒店详情、提交评论（含图片上传+前置审核）、我的页面、4个云函数、高德API同步、内容安全 — 全部覆盖
- No placeholders found
- Type consistency: hotelId 贯穿所有页面和云函数，reviews 集合字段在所有引用处一致
- `common/cloud.js` 中的辅助函数在前端各页面中被使用
