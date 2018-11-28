/*
 全局变量，用于跨域请求，ajax请求URL处最前面拼接上去
 例："http:// + Ip";
*/
var Ip = "192.168.162.170"
var AJAX_URL = "http://" + Ip;

/*
 全局变量,用于配置系统版本
*/
var VERSION = "1.2.0";

/*
 全局变量，mqtt客户端链接地址，
 例：ws://+IP+':端口/'
*/
var WS_URL = "ws://" + Ip + ":9001/";

/*
 实时报警监听的topic（必须数组形式存在）
*/
// var ALARM_TOPIC = ["/pos_business/alarm_inform",'/pos_business/camera_alarm'] (普通报警和视频报警的topic，存在设计缺陷)
// var ALARM_TOPIC = ['/pos_business/alarm_inform']; (普通报警的topic)
var ALARM_TOPIC = ['/pos_business/camera_alarm'];    //优化过后的topic,即视频报警会把普通报警的处理一遍

/*
 视频联动websocket端口
*/
var VIDEO_WS_URL = "ws://" + Ip + ":9100/";

/*
 全局函数，封装ajax请求，
 需传入四个参数url,data,type,callback
*/
var HG_AJAX = function (url,data,type,callback) {
    $.ajax({
        type: type,
        url: AJAX_URL + url,
        data: data,
        xhrFields: {
            withCredentials: true
        },
        success:function (data) {
            if(data.type != 0){
                callback(data);
            }else{
                console.error('未登录，即将跳转至登录界面...');
            }
        }
    })
};

/*
 封装的弹窗消息提示框，需要传入消息内容参数
*/
var HG_MESSAGE = function (content) {
    layer.open({
        content: content,
        skin:'layui-layer-lan',
        closeBtn: 0,
        time:5000,
        title:['信息','background:#32404a;color:#eee'],
        success: function(layero, index){
            this.enterESC = function (e) {
                if(e.keyCode == 13){
                    layer.close(index);
                    return false;
                }
            };
            $(document).on('keydown', this.enterESC);
        }
    });
};

/*
 警报配置,true为打开
*/
var ALARM_TOP_CONFIG = {
    enter_cross_area:true,  //进入越界
    leave_cross_area:true,  //离开越界
    danger_source:true,     //危险源
    over_man:true,         //聚众
    area_disappear:true,   //消失
    area_over_time:true,   //超时
    area_static:true,      //不动
    escort:true,            //陪同
    stray:true,            //离群
    dismantle:true,         //强拆
    get_help:true,          //求救
    video:true,             //视频
    custody:true,            //监护组
    fall:true               //跌倒
};

// 3d的全局配置
var CONFIG_3D = {
    sky_box:true,    //天空盒子
    little_map:true,  //小地图
    card_type:1,    //1 代表的fbx，2 代表的是json
    open_shadow:true //是否开启阴影
};

//mqtt用户名密码
var MQTT_INFO = {
    username:"admin123",
    password:"admin123"
};