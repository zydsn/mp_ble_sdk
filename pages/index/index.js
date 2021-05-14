// pages/index/index.js
Component({
  
  data: {
    
  },
  methods: {
    tapButton (e) {
      console.log(e)
    },
    jumpInput () {
      let devices = wx.getStorageSync('devices')
      let url
      if (devices && devices.length > 0) {
        url = '/pages/device/connection/index'
      } else {
        url = '/pages/device/binding/index'
      }
      wx.navigateTo({
        url: url
      })
    },
    jump (e) {
      let dataset = e.currentTarget.dataset
      wx.navigateTo({
        url: dataset.url,
      })
    }
  }
})
