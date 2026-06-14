App({
  onLaunch() {
    // 初始化云开发环境
    if (!wx.cloud) {
      console.error('请使用 2.2.3 或以上的基础库以使用云能力')
      return
    }

    wx.cloud.init({
      env: 'cloud1-d9gjpcebsb8fca4e9',
      traceUser: true
    })

    this.db = wx.cloud.database()
    this.photosCollection = this.db.collection('photos')

    // 校验云环境是否可连通
    this.checkCloudReady()
  },

  // 检查云环境连通性
  async checkCloudReady() {
    try {
      await this.photosCollection.count()
      console.log('✅ 云环境 + photos集合 已就绪')
      this.cloudReady = true
    } catch (e) {
      // 集合不存在：自动创建
      if (e.errCode === -502005 || (e.errMsg && e.errMsg.includes('not exist'))) {
        console.log('⏳ photos 集合不存在，尝试自动创建...')
        try {
          await this.db.createCollection('photos')
          console.log('✅ photos 集合已自动创建！编译后可正常使用')
          console.log('📌 记得去云开发控制台→数据库→photos→权限设置，设为自定义规则')
          this.cloudReady = true
        } catch (createErr) {
          console.warn('⚠️ 自动创建失败:', createErr.errMsg || createErr)
          console.warn('📌 请手动在云开发控制台创建 photos 集合')
          this.cloudReady = true  // 云环境本身是通的
        }
      } else {
        console.warn('⚠️ 云环境异常:', e.errMsg || e)
        this.cloudReady = false
      }
    }
  },

  // 同步获取缓存的用户信息（不弹窗请求）
  getUserInfo() {
    const cached = wx.getStorageSync('userInfo')
    if (cached) return cached
    // 无缓存时返回匿名
    return { nickName: '匿名用户', avatarUrl: '' }
  },

  // 请求用户授权获取头像昵称（必须在用户点击事件中调用）
  requestUserProfile(callback) {
    const cached = wx.getStorageSync('userInfo')
    if (cached) {
      callback && callback(cached)
      return
    }
    wx.getUserProfile({
      desc: '用于显示您的头像和昵称',
      success: (res) => {
        wx.setStorageSync('userInfo', res.userInfo)
        callback && callback(res.userInfo)
      },
      fail: () => {
        const anonymous = { nickName: '匿名用户', avatarUrl: '' }
        wx.setStorageSync('userInfo', anonymous)
        callback && callback(anonymous)
      }
    })
  },

  // 从云数据库获取所有照片（多用户共享）
  async getPhotos() {
    try {
      const MAX_LIMIT = 20
      const countResult = await this.photosCollection.count()
      const total = countResult.total
      if (total === 0) return []

      const batchTimes = Math.ceil(total / MAX_LIMIT)
      const tasks = []
      for (let i = 0; i < batchTimes; i++) {
        tasks.push(
          this.photosCollection
            .skip(i * MAX_LIMIT)
            .limit(MAX_LIMIT)
            .orderBy('createTime', 'desc')
            .get()
        )
      }
      const results = await Promise.all(tasks)
      return results.reduce((acc, cur) => acc.concat(cur.data), [])
    } catch (err) {
      console.error('获取照片失败:', err)
      wx.showToast({ title: '加载失败，请重试', icon: 'none' })
      return []
    }
  },

  // 添加照片到云数据库
  async addPhoto(photo) {
    try {
      const userInfo = this.getUserInfo()
      // 剔除 _id / _openid 等云数据库保留字段，避免 add 操作冲突
      const { _id, _openid, ...cleanPhoto } = photo || {}
      const data = {
        ...cleanPhoto,
        user: {
          nickName: userInfo.nickName,
          avatarUrl: userInfo.avatarUrl
        },
        createTime: this.db.serverDate(),
        likes: 0
      }
      const result = await this.photosCollection.add({ data })
      // serverDate() 由服务端写入真实时间；此处返回本地近似时间供前端即时展示
      return { ...data, _id: result._id, createTime: new Date() }
    } catch (err) {
      console.error('添加照片失败:', err)
      wx.showToast({ title: '保存失败，请重试', icon: 'none' })
      return null
    }
  },

  // ---------- 业务层接口（页面应只调用这些） ----------

  // 保存一组照片：上传文件 → 写入数据库（页面无需关心底层是云还是本地）
  async savePhotos({ imageList, location, description }) {
    if (!imageList || imageList.length === 0) return null

    // 1. 上传图片文件到云存储
    const cloudFileIds = await this.uploadImages(imageList)
    if (cloudFileIds.length === 0) return null

    // 2. 将元信息写入云数据库
    return this.addPhoto({
      paths: cloudFileIds,
      location,
      description
    })
  },

  // 删除照片（仅允许删除自己的）
  async deletePhoto(id) {
    try {
      await this.photosCollection.doc(id).remove()
      return true
    } catch (err) {
      console.error('删除照片失败:', err)
      wx.showToast({ title: '删除失败，仅可删除自己的照片', icon: 'none' })
      return false
    }
  },

  // 上传图片到云存储（带重试），返回 cloud fileID 数组
  async uploadImages(tempFilePaths, retryCount = 0) {
    const MAX_RETRY = 2
    const tasks = tempFilePaths.map((filePath, index) => {
      const cloudPath = `photos/${Date.now()}_${index}_${Math.random().toString(36).slice(2)}.jpg`
      return wx.cloud.uploadFile({ cloudPath, filePath })
    })
    try {
      const results = await Promise.all(tasks)
      console.log('上传成功, fileIDs:', results.map(r => r.fileID))
      return results.map(r => r.fileID)
    } catch (err) {
      console.error(`上传失败 (第${retryCount + 1}次):`, err.errMsg || err)

      // 如果是权限问题，不重试
      if (err.errMsg && err.errMsg.includes('permission')) {
        wx.showToast({ title: '云存储权限不足，请在云开发控制台设置', icon: 'none' })
        return []
      }

      if (retryCount < MAX_RETRY) {
        console.log(`1秒后重试...`)
        await new Promise(r => setTimeout(r, 1000))
        return this.uploadImages(tempFilePaths, retryCount + 1)
      }

      wx.showToast({ title: '上传超时，请检查网络', icon: 'none' })
      return []
    }
  }
})
