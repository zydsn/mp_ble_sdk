const SDK = requirePlugin('YC_BLE_SDK')
let sdk
Component({
  data: {},
  methods: {
    onShow () {
      this.initalData()
      this.initBluetooth()
    },
    // 初始化蓝牙模块
    initBluetooth () {
      let devices = wx.getStorageSync('devices')
      sdk = new SDK({
        timeout: 30,
        mode: 'conn',
        devices: devices,
        init: () => {
          this.setData({
            isOpen: true
          })
        },
        onConnect: device => {
          // console.log(device)
          this.setData({
            isConnect: true,
            device: device
          })
          sdk.startNotice(device)
        },
        onUpload: (res) => {
          console.log(res.result)
          console.log(res.type)
          let historyList = this.data.historyList
          if (res.type === '01') {
            this.setData({
              list: res.result,
              uploadEnd: true
            })
          } else if (res.type === '11') {
            this.setData({
              historyList: [...historyList, ...res.result],
              uploadEnd: true
            })
          }
        },
        offConnect: res => {
          this.setData({
            isDisconnect: true
          })
        },
        onError (err) {
          console.log(err)
        },
        onTimeout: () => {
          this.setData({
            timeout: true
          })
        }
      })
    },

    initalData () {
      this.setData({
        isDisconnect: false,
        isConnect: false,
        isOpen: false,
        timeout: false,
        isOpenBluetooth: false,
        current: {},
        historyList: [
          // {
          //   temperature: 34.55,
          //   date: '04-12',
          //   time: '18:12'
          // }
        ],
        list: {
          // temperature: 34.55,
          // date: '04-12',
          // time: '18:12'
        }
      })
    },

    restart () {
      this.initalData()
      sdk.restart()
    },
    
    back () {
      wx.navigateBack({
        delta: 1
      })
    },
    tapUploadEnd () {
      this.setData({
        uploadEnd: false,
        isUpload: false,
        list: {},
        historyList: []
      })
    },
    onUnload () {
      sdk.closeBluetoothAdapter()
    }
  }
})
