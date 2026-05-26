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
            :key="img"
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
import { ref } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
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
