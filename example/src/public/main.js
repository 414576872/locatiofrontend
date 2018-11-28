var IS_ALARM_MQTT_RECONNECT = false; //mqtt重连标识
var MOVING_CACHE_TIME; //平滑移动的缓存时间

/*
 发送一次post请求，判断是否登陆(该方法特殊，不适用封装好的HG_AJAX方法)
*/
(function () {
    var href = window.location.href.split("/").pop();
    if (href == "index.html"){
        return;
    }
    HG_AJAX('/position_sdk/ModularUser/User/isLogin',{},'post',function (data) {
        if (data.type != 1) {
            window.location.href = 'index.html';
        }
    })
})();

/*
 获取平滑移动的缓存时间
*/
function getMovingCacheTime() {
    HG_AJAX("/position_sdk/ModularConfiguration/SysConfig/getSysConfig", {},"post",function (data) {
        if(data.type == 1){
            var result = data.result;
            for(var i in result){
                if(result[i].name == "MOVING_CACHE_TIME"){
                    MOVING_CACHE_TIME = parseFloat(result[i].value);
                }
            }
        }else {
            MOVING_CACHE_TIME = 1.5;
        }
    });
}
getMovingCacheTime();

/*全局修改网站名称*/
(function () {
    HG_AJAX("/position_sdk/ModularConfiguration/Configuration/getSystemName", {},"post",function (data) {
        if(data.type == 1){
            var result = data.result;
            $(".system_name").html(result + "<span style='font-size: 12px;margin-left: 5px'>当前版本：sdk_v"+VERSION+"</span>");
            $("title").html(result);
        }else {
            $(".system_name").html("定位系统SDK样例网站" + "<span style='font-size: 12px;margin-left: 5px'>当前版本：sdk_v"+VERSION+"</span>");
            $("title").html("定位系统SDK样例网站");
        }
    });
})();

/*
 报警铃铛及其报警列表变量
*/
var TOTAL_COUNT, LIST_COUNT = 0, HTML = '';

/*
 退出功能
*/
$('.login_out').click(function () {
    var record = $('#example').find(".heart");
    if(record.length>0){
        $("#modal_video_download").modal("show");
        HREF = 'index.html';
        return false;
    }
    HG_AJAX('/position_sdk/ModularUser/User/loginOut',{},'post',function (data) {
        if (data.type == 1) {
            sessionStorage.removeItem('mqtt_username');
            sessionStorage.removeItem('mqtt_password');
            window.location.href = 'index.html';
        } else {
            HG_MESSAGE(data.message);
        }
    });
});

/*
 报警铃铛红点显示
*/
function getAlarmCount() {
    HTML = '';
    LIST_COUNT = 0;
    HG_AJAX('/position_sdk/ModularAlarm/Alarm/getAllCount',{},"post",function (data) {
        if (data.type == 1) {
            var data = data.result;
            //判断未处理的各种报警提醒信息，大于0才会出现在铃铛下面的列表中
            if (parseInt(data.alarm) > 0) {
                HTML += '<li>' + parseInt(data.alarm) + '条未处理' + '<a href="fenceAlarm.html">警示信息</a></li>';
                LIST_COUNT++;
            }
            if (parseInt(data.help) > 0) {
                HTML += '<li>' + parseInt(data.help) + '条未处理' + '<a href="alarmCall.html">呼叫求救</a></li>';
                LIST_COUNT++;
            }
            if (parseInt(data.low_power) > 0) {
                HTML += '<li>' + parseInt(data.low_power) + '条未处理' + '<a href="lowerPower.html">欠压提醒</a></li>';
                LIST_COUNT++;
            }
            if(parseInt(data.alarm) <= 0 &&parseInt(data.help) <= 0&&parseInt(data.low_power) <= 0){
                HTML += '<li>无任何未处理报警信息</li>';
                LIST_COUNT++;
            }
            $(".bell_container .alarm_list").html(HTML);
            TOTAL_COUNT = parseInt(data.alarm) + parseInt(data.help) + parseInt(data.low_power);
            if(TOTAL_COUNT > 0){
                $('.bell_container .glyphicon-bell').addClass('shake');
            }else{
                $('.bell_container .glyphicon-bell').removeClass('shake');
            }
        }
    });
}

getAlarmCount();
setInterval(getAlarmCount, 120000);

/*
 铃铛下方的报警列表显示方法（点击铃铛即可切换列表的显示状态）
*/
$(".bell_container").on('click', '.glyphicon-bell', function () {
    var dispaly = $('.alarm_list').css('display');
    if (dispaly == 'none') {
        $('.alarm_list').show().animate({
            height: LIST_COUNT * 20
        })
    } else if (dispaly == 'block') {
        $('.alarm_list').show().animate({
            height: 0
        }, function () {
            $(this).hide();
        })
    }
});

/*
 监听新报警以及创建报警语音提示
*/
var IS_NEW_ALARM = false;
var audio = document.createElement("audio");
audio.loop = true;

/*
 页面上方新警报提示
*/
function htmlAlarm(msg,btn,asrc) {
    $('.new_alarm_info').fadeIn(function () {
        $("#new_alarm_text > p").html(msg);
        $("#event_buttons").html(btn);
    });
    audio.src = "./audio/" + asrc;
    audio.addEventListener("canplaythrough",function (ev) {
        audio.play();
    });
    IS_NEW_ALARM = true;
}

/*
 新报警的方法
 （备注：如果频繁发生报警，且上一个报警用户并未关闭，将不会出现新的报警）
*/
function getNewAlarm(type, result) {
    if (!result) {
        return;
    }
    if (!IS_NEW_ALARM) {
        switch (type) {
            //进入越界报警
            case "enter_cross_area":
                htmlAlarm(result.msg, result.button, "cross_area.wav");
                break;
            //离开越界报警
            case "leave_cross_area":
                htmlAlarm(result.msg, result.button, "cross_area.wav");
                break;
            //危险源报警
            case "danger_source":
                htmlAlarm(result.msg, result.button, "danger_source.wav");
                break;
            //聚众
            case "over_man":
                htmlAlarm(result.msg, result.button, "over_man.wav");
                break;
            //消失
            case "area_disappear":
                htmlAlarm(result.msg, result.button, "disappear.wav");
                break;
            //超时
            case "area_over_time":
                htmlAlarm(result.msg, result.button, "over_time.wav");
                break;

            //不动
            case "area_static":
                htmlAlarm(result.msg, result.button, "static.wav");
                break;
            //陪同报警
            case "escort":
                htmlAlarm(result.msg, result.button, "escort.wav");
                break;
            //离群
            case "stray":
                htmlAlarm(result.msg, result.button, "leave.wav");
                break;

            //强拆
            case "dismantle":
                htmlAlarm(result.msg, result.button, "dismantle.wav");
                break;
            //求救报警
            case "get_help":
                htmlAlarm(result.msg, result.button, "get_help.wav");
                break;
            //监护组报警
            case "custody":
                htmlAlarm(result.msg, result.button, 'custody.wav');
                break;
            case "fall":
                htmlAlarm(result.msg, result.button, 'fall.wav');
                break;
            //视频报警
            case "video":
                $('.new_alarm_info').fadeIn(function () {
                    $("#new_alarm_text > p").html(result.msg);
                    $("#event_buttons").html(result.button);
                });

                var   alarm_type = result.alarm_type;
                switch (alarm_type) {
                    case 13:
                        if (ALARM_TOP_CONFIG.enter_cross_area) {
                            htmlAlarm(result.msg, result.button, "cross_area.wav");
                        }
                        break;
                    case 14:
                        if (ALARM_TOP_CONFIG.leave_cross_area) {
                            htmlAlarm(result.msg, result.button, "cross_area.wav");
                        }
                        break;
                    case 15:
                        if (ALARM_TOP_CONFIG.danger_source) {
                            htmlAlarm(result.msg, result.button, "danger_source.wav");
                        }
                        break;
                    case 10:
                        if (ALARM_TOP_CONFIG.over_man) {
                            htmlAlarm(result.msg, result.button, "over_man.wav");
                        }
                        break;
                    case 9:
                        if (ALARM_TOP_CONFIG.area_disappear) {
                            htmlAlarm(result.msg, result.button, "disappear.wav");
                        }
                        break;
                    case 12:
                        if (ALARM_TOP_CONFIG.area_over_time) {
                            htmlAlarm(result.msg, result.button, "over_time.wav");
                        }
                        break;
                    case 11:
                        if (ALARM_TOP_CONFIG.area_static) {
                            htmlAlarm(result.msg, result.button, "static.wav");
                        }
                        break;
                    case 19:
                        if (ALARM_TOP_CONFIG.escort) {
                            htmlAlarm(result.msg, result.button, "escort.wav");
                        }
                        break;
                    case 4:
                        if (ALARM_TOP_CONFIG.dismantle) {
                            htmlAlarm(result.msg, result.button, "dismantle.wav");
                        }
                        break;
                    case 6:
                        if (ALARM_TOP_CONFIG.get_help) {
                            htmlAlarm(result.msg, result.button, "get_help.wav");
                        }
                        break;
                    case 16:
                        if (ALARM_TOP_CONFIG.custody) {
                            htmlAlarm(result.msg, result.button, "custody.wav");
                        }
                        break;
                    case 20:
                        if (ALARM_TOP_CONFIG.stray) {
                            htmlAlarm(result.msg, result.button, "leave.wav");
                        }
                        break;
                    case 21:
                        if (ALARM_TOP_CONFIG.fall) {
                            htmlAlarm(result.msg, result.button, "fall.wav");
                        }
                        break;
                }
                break;
        }
    }
}

/*
 新报警提示框头部关闭按钮
*/
$(".close_button > .glyphicon-remove").click(function () {
    audio.pause();
    IS_NEW_ALARM = false;
    $('.new_alarm_info').fadeOut(function () {
        console.log('报警弹窗关闭');
    })
});

/*
 判断浏览器是否支持websocket,并处理新的报警
*/
function initAlarmMqtt() {
    if (window.WebSocket) {
        var mqtt_username = MQTT_INFO.username;
        var mqtt_password = MQTT_INFO.password;
        if(sessionStorage.mqtt_username){
            mqtt_username = sessionStorage.mqtt_username
        }
        if(sessionStorage.mqtt_password){
            mqtt_password = sessionStorage.mqtt_password
        }
        var client = mqtt.connect(WS_URL,{username:mqtt_username,password:mqtt_password});
        client.subscribe(ALARM_TOPIC);
        client.on("message", function (topic, payload) {
            var data = JSON.parse(payload.toString());
            console.log(data);
            if(IS_NEW_ALARM){
                return;
            }
            if (data[13] && ALARM_TOP_CONFIG.enter_cross_area) {            //进入越界报警
                getNewAlarm("enter_cross_area", getAlarmMSG('enter_cross_area',data[13]))
            } else if(data[14] && ALARM_TOP_CONFIG.leave_cross_area){  //离开越界
                getNewAlarm("leave_cross_area", getAlarmMSG('leave_cross_area',data[14]))
            }else if(data[15] && ALARM_TOP_CONFIG.danger_source){  //危险源
                getNewAlarm('danger_source',getAlarmMSG('danger_source',data[15]));
            }else if(data[10] && ALARM_TOP_CONFIG.over_man){  //聚众
                getNewAlarm('over_man',getAlarmMSG('over_man',data[10]));
            }else if(data[9] && ALARM_TOP_CONFIG.area_disappear){  //消失
                getNewAlarm('area_disappear',getAlarmMSG('area_disappear',data[9]));
            }else if(data[12] && ALARM_TOP_CONFIG.area_over_time){  //超时
                getNewAlarm('area_over_time',getAlarmMSG('area_over_time',data[12]));
            }else if(data[11] && ALARM_TOP_CONFIG.area_static){  //不动
                getNewAlarm('area_static',getAlarmMSG('area_static',data[11]));
            }else if(data[19] && ALARM_TOP_CONFIG.escort){  //陪同
                getNewAlarm('escort',getAlarmMSG('escort',data[19]));
            }else if(data[20] && ALARM_TOP_CONFIG.stray){  //离群
                getNewAlarm('stray',getAlarmMSG('stray',data[20]));
            }else if(data[4] && ALARM_TOP_CONFIG.dismantle){   //强拆
                getNewAlarm("dismantle", getAlarmMSG('dismantle',data[4]))
            }else if (data[6] && ALARM_TOP_CONFIG.get_help) {      //求救报警
                getNewAlarm("get_help", getAlarmMSG('get_help',data[6]))
            }else if(data[17] && ALARM_TOP_CONFIG.video){     //视频
                getNewAlarm("video", getAlarmMSG('video',data[17]))
            }else if(data[16] && ALARM_TOP_CONFIG.custody){ //监护组
                getNewAlarm('custody',getAlarmMSG('custody',data[16]));
            }else if(data[21] && ALARM_TOP_CONFIG.fall){ //跌倒
                getNewAlarm('fall',getAlarmMSG('fall',data[21]));
            }
            delete data;
        });
        client.on("connect", function () {
            if (IS_ALARM_MQTT_RECONNECT){
                client.end();
                initAlarmMqtt();
                IS_ALARM_MQTT_RECONNECT = false;
            }
        });
        client.on("reconnect", function () {
            IS_ALARM_MQTT_RECONNECT = true;
            console.log("mqtt client try to reconnect");
        })
    } else {
        HG_MESSAGE("该浏览版本过于老旧，无法显示定位数据，请使用最新版chrome浏览器");
    }
}
initAlarmMqtt();

/*
 报警提示框里面的文本提示内容方法
*/
function getAlarmMSG(type, data) {
    console.log(data);
    var button = '';

    if (type == 'video' && !data[0].camera_id) {
        return undefined;
    }
    var floor_id = data[0].floor_id;
    if (floor_id == 0) {
        return undefined;
    }
    if(data[0].card_id){
        var card_id = data[0].card_id;
    }else {
        var card_id = data[0].card_ids;
    }
    var scene_id = data[0].scene_id,
        building_id = data[0].building_id,
        area_id = data[0].area_id;
    if (type == 'video') {
        var camera_id = data[0].camera_id;
        var alarm_id = data[0].alarm_id;
        button = '<i class="video" ' +
            'data-alarm="' + alarm_id + '" ' +
            'data-camera="' + camera_id + '" ' +
            'data-scene="' + scene_id + '" ' +
            'data-building="' + building_id + '" ' +
            'data-floor="' + floor_id + '" ' +
            'data-area="' + area_id + '" ' +
            'data-card="' + card_id + '">视频</i>';
    } else {
        button = '<i class="location" ' +
            'data-scene="' + scene_id + '" ' +
            'data-building="' + building_id + '" ' +
            'data-floor="' + floor_id + '" ' +
            'data-area="' + area_id + '" ' +
            'data-card="' + card_id + '">定位</i>';
    }
    var _alarm_info = data[0].alarm_info;
    if (_alarm_info.length > 30) {
        _alarm_info = _alarm_info.substring(0, 30) + "...";
    }
    if(data[0].card_id){
        var msg = '监测到卡号' + data[0].card_id + _alarm_info;
    }else {
        var msg = '监测到' + _alarm_info;
    }
    var alarm_type = data[0].alarm_type;
    return {msg: msg, button: button, alarm_type: alarm_type};
}

/*
 点击定位报警跳转
*/
$('#event_buttons').on('click','.location',function () {
    var locations = {
        type:'定位',
        result:[{
            scene_id:$(this).data('scene'),
            building_id:$(this).data('building'),
            floor_id:$(this).data('floor'),
            card_id:$(this).data('card'),
            area_id:$(this).data('area')
        }]
    };
    sessionStorage.setItem('locations',JSON.stringify(locations));
    location.href = 'realTime2D.html';
});

/*
 点击视频报警跳转
*/
$("#event_buttons").on('click','.video',function () {
    var locations = {
        type:'视频',
        result:[{
            camera_id:$(this).data('camera'),
            alarm_id:$(this).data('alarm'),
            scene_id:$(this).data('scene'),
            building_id:$(this).data('building'),
            card_id:$(this).data('card'),
            floor_id:$(this).data('floor')
        }]
    };
    sessionStorage.setItem('locations',JSON.stringify(locations));
    location.href = 'realTime2D.html';
});

/*
 报警时间状态，0未处理，1已处理
*/
function checkStatus(status) {
    status = parseInt(status);
    switch (status) {
        case 1:
            return "已处理";
            break;
        case 0:
            return "未处理";
            break;
        default:
            return "状态不明"
    }
}

/*
 时间戳转化为yyyy-mm-dd hh:mm:ss格式
*/
function unixToDate(unixTime) {
    var time = new Date(parseInt(unixTime) * 1000);
    var year = time.getFullYear();
    var month = time.getMonth() + 1 < 10 ? "0" + (time.getMonth() + 1) : time.getMonth() + 1;
    var day = time.getDate() < 10 ? "0" + time.getDate() : time.getDate();
    var hour = time.getHours() < 10 ? "0" + time.getHours() : time.getHours();
    var minutes = time.getMinutes() < 10 ? "0" + time.getMinutes() : time.getMinutes();
    var second = time.getSeconds() < 10 ? "0" + time.getSeconds() : time.getSeconds();
    return year + "-" + month + "-" + day + " " + hour + ":" + minutes + ":" + second;
}

/*
 获得当前时间以及一个月前的时间，格式均为yyyy-mm-dd hh:mm:ss
*/
function getNowTimeString() {
    var now_time_stamp = new Date();
    var last_time_stamp = new Date(Date.parse(new Date()) - 2592000000);
    var now_month = now_time_stamp.getMonth() * 1 + 1;
    var last_month = last_time_stamp.getMonth() * 1 + 1;
    if (now_month < 10) {
        now_month = "0" + now_month;
    }
    if (last_month < 10) {
        last_month = "0" + last_month;
    }
    var now_day = now_time_stamp.getDate();
    var last_day = last_time_stamp.getDate();
    if (now_day < 10) {
        now_day = "0" + now_day;
    }
    if (last_day < 10) {
        last_day = "0" + last_day;
    }
    var now = now_time_stamp.getFullYear() + "-" + now_month + "-" + now_day + " " + "23" + ":" + "59";
    var last = last_time_stamp.getFullYear() + "-" + last_month + "-" + last_day + " " + "00" + ":" + "00";
    return {now: now, last: last};
}

/*
 初始化页面的时间框的value值，开始处一月前的时间，结束处当前时间
 格式均为yyyy-mm-dd
*/
function initDataInput() {
    var time = getNowTimeString();
    $('.search_start_data').val(time.last.split(" ")[0]);
    $('.search_start_data_history').val(time.now.split(" ")[0]);
    $('.search_end_data').val(time.now.split(" ")[0]);
    $('.search_end_data_history').val(time.now.split(" ")[0]);
    $('.search_start_data').datetimepicker({
        format: 'yyyy-mm-dd',
        autoclose: true,
        language: "zh-CN",
        startView: 2,
        minView: 2
    }).on('hide', function (event) {
        event.preventDefault();
        event.stopPropagation();
    });
    $('.search_start_data_history').datetimepicker({
        format: 'yyyy-mm-dd',
        autoclose: true,
        language: "zh-CN",
        startView: 2,
        minView: 2
    }).on('hide', function (event) {
        event.preventDefault();
        event.stopPropagation();
    });
    $('.search_end_data').datetimepicker({
        format: 'yyyy-mm-dd',
        autoclose: true,
        language: "zh-CN",
        startView: 2,
        minView: 2
    }).on('hide', function (event) {
        event.preventDefault();
        event.stopPropagation();
    });
    $('.search_end_data_history').datetimepicker({
        format: 'yyyy-mm-dd',
        autoclose: true,
        language: "zh-CN",
        startView: 2,
        minView: 2
    }).on('hide', function (event) {
        event.preventDefault();
        event.stopPropagation();
    });
}

/*
 初始化页面的时间框的value值，开始处一月前的时间的00:00，结束处当前时间的23:59
 格式均为hh:mm
*/
function initTimeInput() {
    var time = getNowTimeString();
    $('.search_start_time').val(time.last.split(" ")[1]);
    $('.search_start_time_history').val(time.last.split(" ")[1]);
    $('.search_end_time').val(time.now.split(" ")[1]);
    $('.search_end_time_history').val(time.now.split(" ")[1]);
    $('.search_start_time').datetimepicker({
        format: 'hh:ii',
        autoclose: true,
        language: "zh-CN",
        startView: 1,
        maxView: 1,
        startDate: time.last.split(" ")[0]
    }).on('hide', function (event) {
        event.preventDefault();
        event.stopPropagation();
    });
    $('.search_start_time_history').datetimepicker({
        format: 'hh:ii',
        autoclose: true,
        language: "zh-CN",
        startView: 1,
        maxView: 1,
        startDate: time.now.split(" ")[0]
    }).on('hide', function (event) {
        event.preventDefault();
        event.stopPropagation();
    });
    $('.search_end_time').datetimepicker({
        format: 'hh:ii',
        autoclose: true,
        language: "zh-CN",
        startView: 1,
        maxView: 1,
        startDate: time.now.split(" ")[0]
    }).on('hide', function (event) {
        event.preventDefault();
        event.stopPropagation();
    });
    $('.search_end_time_history').datetimepicker({
        format: 'hh:ii',
        autoclose: true,
        language: "zh-CN",
        startView: 1,
        maxView: 1,
        startDate: time.now.split(" ")[0]
    }).on('hide', function (event) {
        event.preventDefault();
        event.stopPropagation();
    });
    $('.search_start_data').on('changeDate', function () {
        $('.search_start_time').datetimepicker('setStartDate', $(this).val())
    });
    $('.search_end_data').on('changeDate', function () {
        $('.search_end_time').datetimepicker('setStartDate', $(this).val())
    })
}

/*
 字符串时间转换成时间戳传递后端
 兼容IE和firefox的写法
*/
function delimiterConvert(value) {
    return value.replace(/-/g, '/');
}

function StringToTimeStamp(value){
    var data  = delimiterConvert(value);
    if (Date.parse(new Date(data))){
        return Date.parse(new Date(data))/1000
    }else {
        return undefined
    }
}

/*
 开始处时间转换为时间戳，精确到秒
*/
function getSearchStartTimeStamp(IS_HISTORY) {
    var data,time;
    if(IS_HISTORY){
        data = delimiterConvert($('.search_start_data_history').val());
        time = $('.search_start_time_history').val();
    }else {
        data = delimiterConvert($('.search_start_data').val());
        time = $('.search_start_time').val();
    }
    if (Date.parse(new Date(data + " " + time))) {
        return Date.parse(new Date(data + " " + time)) / 1000;
    } else {
        return undefined;
    }
}

/*
 开始时间精确到天,时间戳
*/
function getSearchStartDayStamp() {
    var data = delimiterConvert($('.search_start_data').val());
    if (Date.parse(new Date(data))) {
        return Date.parse(new Date(data)) / 1000;
    } else {
        return undefined;
    }
}

/*
 结束时间转换为时间戳，精确到秒
*/
function getSearchEndTimeStamp(IS_HISTORY) {
    var data,time;
    if(IS_HISTORY){
        data = delimiterConvert($('.search_end_data_history').val());
        time = $('.search_end_time_history').val();
    }else{
        data = delimiterConvert($('.search_end_data').val());
        time = $('.search_end_time').val();
    }
    if (Date.parse(new Date(data + " " + time))) {
        return Date.parse(new Date(data + " " + time)) / 1000;
    } else {
        return undefined;
    }
}

/*
 结束时间精确到天,时间戳
*/
function getSearchEndDayStamp() {
    var data = delimiterConvert($('.search_end_data').val());
    if (Date.parse(new Date(data + " " + "23:59:59"))) {
        return Date.parse(new Date(data + " " + "23:59:59")) / 1000
    } else {
        return undefined
    }
}

/*
 rgb颜色转换为16进制颜色
*/
function zeroFillHex(num, digits) {
    var s = num.toString(16);
    while (s.length < digits)
        s = "0" + s;
    return s;
}

/*
 十六进制颜色值的正则表达式
*/
function rgb2hex(rgb) {
    if (rgb.charAt(0) == '#')
        return rgb;
    var ds = rgb.split(/\D+/);
    var decimal = Number(ds[1]) * 65536 + Number(ds[2]) * 256 + Number(ds[3]);
    return "#" + zeroFillHex(decimal, 6);
}

/*
 左边导航栏 点击时的效果
*/
$("#main_nav").find("h4").click(function () {
    var span = $(this).find("span");
    if ($(span).attr("class") == "glyphicon glyphicon-chevron-right") {
        $(this).parent("div").find("ul").show();
        $(span).attr("class", "glyphicon glyphicon-chevron-down");
        $(this).parent("div").siblings("div").find("span").attr("class", "glyphicon glyphicon-chevron-right");
        $(this).parent("div").siblings("div").find("ul").hide();
    } else {
        $(this).parent("div").find("ul").hide();
        $(span).attr("class", "glyphicon glyphicon-chevron-right")
    }
});

/*
 针对输入框为空的处理
*/
function checkInputNull(value) {
    if (!$.trim(value) || value == 'all') {
        return undefined;
    } else {
        return value;
    }
}

/*
 针对回传数据为空的处理
*/
function checkNull(value) {
    if (!value || value == null) {
        return '--';
    } else {
        return value;
    }
}

/*
 打开修改用户名密码模态框
*/
$(".modify_user").click(function () {
    HG_AJAX("/position_sdk/ModularUser/User/getUsername",{},"post",function (data) {
        if(data.type == 1){
            $("#input_modify_user_name").val(data.result);
            $("#input_modify_user_password_old").val("");
            $("#input_modify_user_password_new").val("");
            $("#input_modify_user_password_again").val("");
            $("#modal_modify_user").modal("show");
        }else{
            HG_MESSAGE("无法修改用户名和密码");
        }
    });
});

/*
 提交用户名密码修改
*/
$("#button_modify_user_save").click(function () {
    var username = $("#input_modify_user_name").val();
    var old_password = $("#input_modify_user_password_old").val();
    var new_password = $("#input_modify_user_password_new").val();
    var again_password = $("#input_modify_user_password_again").val();
    if (username == "") {
        HG_MESSAGE("用户名不能为空");
        return;
    }
    if (old_password == "") {
        HG_MESSAGE("旧密码不能为空");
        return;
    }
    if (new_password == "") {
        HG_MESSAGE("新密码不能为空");
        return;
    }
    if (again_password == "") {
        HG_MESSAGE("请再次输入新密码");
        return;
    }
    if (again_password != new_password) {
        HG_MESSAGE("新密码两次输入不一致");
        return;
    }
    HG_AJAX("/position_sdk/ModularUser/User/checkUserInfo",
        {username:username, old_password:md5(old_password), new_password:md5(new_password), again_password:md5(again_password)},
        "post",function (data) {
            if(data.type == 1){
                $("#modal_modify_user").modal("hide");
                HG_MESSAGE("修改用户名和密码成功");
            }else{
                HG_MESSAGE("修改用户名和密码失败");
            }
        });
});


/*
 自适应缩放比
*/
function mapAutomaticSetting(map_zoom,x,y,times,extend,map_div) {
    var obj = {};
    //如果缩放比为空
    if(map_zoom == 0){
        var map_x = parseFloat(Math.abs(parseFloat(extend[2]) - parseFloat(extend[0])));//得到地图文件的宽
        var map_y = parseFloat(Math.abs(parseFloat(extend[3]) - parseFloat(extend[0])));//得到地图文件的高
        var div_x = parseFloat($("#"+map_div).width());//得到显示地图的div的宽
        var div_y = parseFloat($("#"+map_div).height());//得到显示地图的div的高
        var max_x = parseFloat(div_x/(map_x * 0.04));//当缩放比为20时，地图1m对应像素值7px,当缩放比加1，对应像素值增加1倍。max_x为对应像素值还需要增加或减少多少倍才能等于div的宽度
        var max_y = parseFloat(div_y/(map_y * 0.04));//max_y 同理max_x
        var zoom_x = Math.log(max_x)/Math.log(1.5);//求出地图宽的对应像素值需要增加或减少的倍数值
        var zoom_y = Math.log(max_y)/Math.log(1.5);//高与宽同理
        obj.zoom = parseFloat(20 + Math.min(zoom_x,zoom_y)).toFixed(2);//20加上或减去倍数，就是最合适的缩放比
    }else {
        obj.zoom = parseFloat(map_zoom);
    }
    //如果中心视点为空
    if(x == null){
        //以地图文件的坐标系为原点算出地图文件的中心视点的x值
        var center_x = parseFloat(((parseFloat(extend[2]) - parseFloat(extend[0]))/2 + parseFloat(extend[0])).toFixed(2));
    }else {
        var center_x = parseFloat(x);
    }
    if(y == null){
        //以地图文件的坐标系为原点算出地图文件的中心视点的y值
        var center_y = parseFloat(((parseFloat(extend[3]) - parseFloat(extend[1]))/2 + parseFloat(extend[1])).toFixed(2));
    }else {
        var center_y = parseFloat(y);
    }
    obj.center = [center_x,center_y];
    //如果拖拽倍数为空
    if(times == null){
        //拖拽倍数设为1
        var times_drag = 1;
    }else {
        var times_drag = parseFloat(times);
    }
    //计算出限制地图离中心视点拖拽的距离(地图文件宽和高的times_drag倍)的坐标
    var extent = [center_x-times_drag*Math.abs((parseFloat(extend[2]) - parseFloat(extend[0]))),center_y-times_drag*Math.abs((parseFloat(extend[3]) - parseFloat(extend[1]))),center_x+times_drag*Math.abs((parseFloat(extend[2]) - parseFloat(extend[0]))),center_y+times_drag*Math.abs((parseFloat(extend[3]) - parseFloat(extend[1])))];
    obj.extent = extent;
    return obj;
}

/*
 基站显示转换为16进制
*/
function fromIntGetShowString(value){
    return "0x" + parseInt(value).toString(16).toUpperCase();
}

/*
 楼层字符串截断函数
*/
function floorStringSlice(value) {
    if(!value){
        return "--";
    }else if(value.length > 23) {
        return value.slice(0,23)+"...";
    }else {
        return value;
    }
}