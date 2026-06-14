// 上传页面
const app = getApp()

Page({
  data: {
    imageList: [],
    location: {
      name: '',
      address: '',
      latitude: 0,
      longitude: 0
    },
    description: ''
  },

  onLoad() {
    // 页面加载时提前获取用户信息授权，避免保存时的异步问题
    app.requestUserProfile((userInfo) => {
      console.log('用户信息已获取:', userInfo.nickName)
    })
  },

  // 选择图片
  chooseImage() {
    const remaining = 9 - this.data.imageList.length
    wx.chooseMedia({
      count: remaining,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const newImages = res.tempFiles.map(file => file.tempFilePath)
        this.setData({
          imageList: [...this.data.imageList, ...newImages]
        })
        // 如果还没选位置，自动获取当前位置
        if (!this.data.location.latitude) {
          this.getCurrentLocation()
        }
      }
    })
  },

  // 获取当前位置
  getCurrentLocation() {
    wx.getLocation({
      type: 'gcj02',
      success: (res) => {
        this.setData({
          'location.latitude': res.latitude,
          'location.longitude': res.longitude
        })
        // 逆地址解析获取地址描述
        this.reverseGeocode(res.latitude, res.longitude)
      },
      fail: () => {
        wx.showToast({ title: '获取位置失败，请手动选择', icon: 'none' })
      }
    })
  },

  // 简单的逆地址解析（使用微信内置接口选择位置）
  reverseGeocode(lat, lng) {
    // 使用 wx.chooseLocation 的返回结果来获取地址
    // 这里先用经纬度作为展示
    this.setData({
      'location.name': '当前位置',
      'location.address': `${lat.toFixed(4)}, ${lng.toFixed(4)}`
    })
  },

  // 选择位置
  chooseLocation() {
    wx.chooseLocation({
      latitude: this.data.location.latitude || undefined,
      longitude: this.data.location.longitude || undefined,
      success: (res) => {
        this.setData({
          'location.name': res.name,
          'location.address': res.address,
          'location.latitude': res.latitude,
          'location.longitude': res.longitude
        })
      },
      fail: () => {
        // 用户取消选择，尝试获取当前位置
        if (!this.data.location.latitude) {
          this.getCurrentLocation()
        }
      }
    })
  },

  // 预览图片
  previewImage(e) {
    const index = e.currentTarget.dataset.index
    wx.previewImage({
      current: this.data.imageList[index],
      urls: this.data.imageList
    })
  },

  // 移除图片
  removeImage(e) {
    const index = e.currentTarget.dataset.index
    const imageList = [...this.data.imageList]
    imageList.splice(index, 1)
    this.setData({ imageList })
  },

  // 描述输入
  onDescInput(e) {
    this.setData({ description: e.detail.value })
  },

  // 保存照片
  async savePhoto() {
    if (this.data.imageList.length === 0) {
      wx.showToast({ title: '请先选择图片', icon: 'none' })
      return
    }

    if (!this.data.location.latitude) {
      wx.showToast({ title: '请选择拍摄位置', icon: 'none' })
      return
    }

    wx.showLoading({ title: '上传图片中...', mask: true })

    try {
      // 1. 上传图片到云存储
      const cloudFileIds = await app.uploadImages(this.data.imageList)
      if (cloudFileIds.length === 0) {
        wx.hideLoading()
        return  // uploadImages 已显示错误提示
      }

      wx.showLoading({ title: '保存信息中...', mask: true })

      // 2. 保存照片信息到云数据库
      const photo = {
        paths: cloudFileIds,
        location: this.data.location,
        description: this.data.description
      }

      const result = await app.addPhoto(photo)
      if (!result) {
        wx.hideLoading()
        return  // addPhoto 已显示错误提示
      }

      wx.hideLoading()
      wx.showToast({ title: '上传成功', icon: 'success' })

      // 重置表单
      this.setData({
        imageList: [],
        location: {
          name: '',
          address: '',
          latitude: 0,
          longitude: 0
        },
        description: ''
      })
    } catch (err) {
      wx.hideLoading()
      console.error('保存照片异常:', err)
      wx.showToast({ title: '上传失败: ' + (err.errMsg || '请重试'), icon: 'none' })
    }
  }
})
