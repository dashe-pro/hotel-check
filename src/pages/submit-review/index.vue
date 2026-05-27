<template>
  <view class="page">
    <view class="form-section">
      <view class="form-item">
        <text class="form-label">酒店</text>
        <text class="form-value">{{ hotelName }}</text>
      </view>

      <view class="form-item">
        <text class="form-label">发现日期（可选）</text>
        <picker
          mode="date"
          :value="discoveryDate"
          :end="today"
          @change="onDateChange"
        >
          <view class="picker-value">
            {{ discoveryDate || '请选择日期（选填）' }}
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
      <text class="disclaimer-text">2. 反馈提交后进入审核，审核通过后公开展示。</text>
      <text class="disclaimer-text">3. 本站为信息聚合平台，内容仅供参考。</text>
      <text class="disclaimer-text">4. 你的身份信息不会公开，请放心提交。</text>
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
  console.log('chooseImage called')
  uni.chooseImage({
    count: 3 - images.value.length,
    sizeType: ['compressed'],
    sourceType: ['album', 'camera'],
    success: async (res) => {
      console.log('chooseImage success, temp paths:', res.tempFilePaths)
      uni.showLoading({ title: '上传并检测中...' })
      for (const path of res.tempFilePaths) {
        try {
          const cloudPath = `review-images/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`
          const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath: path })
          const fileID = uploadRes.fileID

          // 内容安全检测
          const checkRes = await wx.cloud.callFunction({
            name: 'check-image',
            data: { fileID }
          })
          if (checkRes.result && checkRes.result.code !== 0) {
            uni.showToast({ title: checkRes.result.msg || '图片包含违规内容', icon: 'none' })
            continue
          }

          images.value.push(fileID)
          console.log('upload success, fileID:', fileID)
        } catch (err) {
          console.error('上传失败:', err)
          uni.showToast({ title: '图片上传失败: ' + (err.errMsg || err.message || ''), icon: 'none' })
        }
      }
      uni.hideLoading()
    },
    fail: (err) => {
      console.error('chooseImage fail:', err)
      uni.showToast({ title: '选择图片失败', icon: 'none' })
    }
  })
}

function removeImage(idx) {
  images.value.splice(idx, 1)
}

function previewImage(idx) {
  uni.previewImage({
    urls: images.value,
    current: String(images.value[idx]),
    fail: (err) => {
      console.error('previewImage fail:', err)
    }
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

  submitting.value = true

  try {
    const res = await wx.cloud.callFunction({
      name: 'submit-review',
      data: {
        hotelId: hotelId.value,
        hotelName: hotelName.value,
        content: content.value,
        discoveryDate: discoveryDate.value,
        images: images.value
      }
    })

    if (res.result && res.result.code === 0) {
      uni.showToast({ title: '提交成功，审核后展示', icon: 'success' })

      const reviewId = res.result.data?.reviewId
      if (reviewId) {
        try {
          const tmplId = 'QCXWPP2a79qUfchm7Rfg0c3E4HY_Vi1hhLE3X1R3bKk'
          const subRes = await wx.requestSubscribeMessage({ tmplIds: [tmplId] })
          if (subRes[tmplId] === 'accept') {
            await wx.cloud.callFunction({
              name: 'mark-review-subscribed',
              data: { reviewId }
            })
          }
        } catch { /* 用户拒绝或失败，不影响主流程 */ }
      }

      setTimeout(() => {
        uni.showModal({
          title: '提交成功',
          content: '你的反馈已提交，正在审核中。你可以在"我的"页面查看审核进度。',
          showCancel: true,
          cancelText: '稍后再看',
          confirmText: '查看反馈状态',
          success: (modalRes) => {
            if (modalRes.confirm) {
              uni.switchTab({ url: '/pages/my/index' })
            } else {
              uni.navigateBack()
            }
          }
        })
      }, 800)
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
  background: var(--bg-color);
  padding-bottom: 60rpx;
}

.form-section {
  background: var(--bg-white);
  margin: $spacing-md;
  border-radius: $radius;
  box-shadow: var(--shadow-sm);
  overflow: hidden;
}

.form-item {
  padding: $spacing-md;
  border-bottom: 1rpx solid var(--border-color);

  &:last-child { border-bottom: none; }
}

.form-label {
  display: block;
  font-size: $font-md;
  font-weight: 600;
  color: var(--text-color);
  margin-bottom: $spacing-sm;
}

.form-value {
  font-size: $font-md;
  color: var(--text-secondary);
}

.picker-value {
  font-size: $font-md;
  color: var(--primary-color);
}

.form-item-textarea {
  .form-textarea {
    width: 100%;
    height: 200rpx;
    font-size: $font-md;
    line-height: 1.6;
    color: var(--text-color);
  }

  .char-count {
    text-align: right;
    font-size: $font-xs;
    color: var(--text-muted);
    margin-top: $spacing-xs;
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
    border-radius: $radius-sm;
  }

  .delete-icon {
    position: absolute;
    top: -12rpx;
    right: -12rpx;
    width: 40rpx;
    height: 40rpx;
    background: var(--danger-color);
    color: #fff;
    border-radius: 50%;
    text-align: center;
    line-height: 40rpx;
    font-size: 28rpx;
    box-shadow: var(--shadow-sm);
  }
}

.image-add {
  width: 160rpx;
  height: 160rpx;
  border: 2rpx dashed var(--text-muted);
  border-radius: $radius-sm;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: border-color var(--transition);

  &:active { border-color: var(--primary-color); }

  .add-icon {
    font-size: 48rpx;
    color: var(--text-muted);
  }

  .add-text {
    font-size: $font-xs;
    color: var(--text-muted);
    margin-top: 4rpx;
  }
}

.disclaimer-box {
  margin: 0 $spacing-md $spacing-md;
  padding: $spacing-md;
  background: var(--primary-light);
  border-radius: $radius;

  .disclaimer-title {
    display: block;
    font-size: $font-sm;
    font-weight: 600;
    color: var(--primary-dark);
    margin-bottom: $spacing-xs;
  }

  .disclaimer-text {
    display: block;
    font-size: $font-xs;
    color: var(--text-secondary);
    line-height: 1.8;
  }
}

.submit-btn {
  margin: 0 $spacing-md;
  background: var(--primary-color);
  color: #fff;
  font-size: $font-lg;
  border-radius: $radius-round;
  padding: 24rpx 0;
  font-weight: 500;
  box-shadow: 0 4rpx 12rpx rgba(253, 94, 2, 0.3);
}
</style>
