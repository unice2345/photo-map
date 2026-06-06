App({
  onLaunch() {
    // 初始化本地存储
    if (!wx.getStorageSync('photos')) {
      wx.setStorageSync('photos', [])
    }
  },

  // 全局数据：所有照片
  getPhotos() {
    return wx.getStorageSync('photos') || []
  },

  // 添加照片
  addPhoto(photo) {
    const photos = this.getPhotos()
    photo.id = Date.now()
    photo.createTime = new Date().toLocaleString()
    photos.unshift(photo)
    wx.setStorageSync('photos', photos)
    return photo
  },

  // 删除照片
  deletePhoto(id) {
    let photos = this.getPhotos()
    photos = photos.filter(p => p.id !== id)
    wx.setStorageSync('photos', photos)
  }
})
