const SDK = requirePlugin('YC_BLE_SDK')

let sdk
Component({
  data: {
    interval: 1, // 蓝牙搜索间隔，秒
    isOpen: false, // 蓝牙是否打开
    
    isSearch: false, // 是否正在搜索
    isConnect: false, // 是否链接体温计
    isOpenBluetooth: false, // 弹窗显示
    isNothing: true,
    buttons: [
      { text: '确定' }
    ],
    isBindDevice: false
  },
  methods: {
    onLoad () {
      sdk = new SDK({
        interval: 1,
        init: () => {
          this.setData({
            isOpen: true
          })
        },
        onConnect: res => {
          this.saveDevice(res)
          this.setData({
            isConnect: true
          })
        },
        offConnect: res => {
          this.setData({
            isConnect: false
          })
        },
        onSearch: (res) => {
          // console.log(res.devices)
          if (res.devices.length > 0) {
            this.setData({
              isNothing: false
            })
            this.bindingHandle(res)
          }
        },
        onError (err) {
          console.log(err)
        }
      })
    },
    onUnload () {
      sdk.closeBluetoothAdapter()
    },
    // 保存设备
    saveDevice (item) {
      let devices = wx.getStorageSync('devices') || []
      devices = [...devices, item]
      wx.setStorageSync('devices', devices)
      wx.redirectTo({
        url: '/pages/device/complete/index',
      })
    },

    // 绑定新设备
    bindingHandle (res) {
      console.log(res)
      let devices = wx.getStorageSync('devices')
      let oldDevice = false
      let newDevices = []
      // console.log(oldDevice)
      if (devices.length > 0) {
        res.devices.forEach(item => {
          let state = devices.some(age => age.deviceId == item.deviceId)
          if (state) {
            oldDevice = true
          } else {
            newDevices.push(item)
          }
        })
        if (newDevices.length > 0) {
          sdk.connectedBluetooth(newDevices[0])
        } else if (oldDevice) {
          this.setData({ isBindDevice: true, stop: true })
        }
      } else {
        sdk.connectedBluetooth(res.devices[0])
      }
    },
    // 关闭提示弹窗
    tapBluetoothDialog () {
      this.setData({
        isOpenBluetooth: false
      })
    },
    // 已绑定，返回上个页面
    tapBindDialog () {
      this.setData({
        isBindDevice: false
      })
      wx.navigateBack({
        delta: 1
      })
    }
  }
})