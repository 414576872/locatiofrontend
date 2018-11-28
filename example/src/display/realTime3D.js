/*
全局变量
 */
var MY_MAP; //地图场景对象,SDK基本都在MY_MAP对象上进行操作
var SCENE_ID; //场景id
var BUILDING_ID; //建筑id
var FLOOR_ID; //楼层id
var FLOOR_DATA = {};//保存当前场景、建筑里的所有楼层数据
var ALL_ZONE = {};   //所有区域,储存区域信息
var ALREADY_ZONE = [];   //已经显示的区域列表,用于判断重复操作
var ALREADY_CARD = [];  //已经添加如场景的卡号,若是已经存在的卡,则更新卡号位置
var ALL_CARD = {};   //所有卡号的信息 会根据MQTT推送信息更新,用于获取卡号的详细信息
var THROUGH_CARD_CHANGE = {open:false}; //通过查询卡号切换场景的时候,保存卡号以及坐标
var TIME = 0; //用于记录时间,4秒一次轮询
var MAP_IS_ALREADY = false; //用于判断地图是否初始完成
var FLASH_CARD = []; //用于保存闪烁的定位卡,避免重复添加闪烁
var FLASH_ZONE = []; //用于保存闪烁的区域,避免重复添加闪烁
var TIP_CARD = undefined; //用于记录点击的定位卡,方便清除定位卡提示框
var TIP_STATION = undefined;
var PATROL_RANDOM = undefined; //随机巡视
var NOW_PATROL_CARD; //当前巡视的定位卡卡号
var PATROL_RANDOM_IS_RUN = false; //判断随机巡视是否运行中
var PATROL_SCENE_IS_RUN = false; //判断随机巡视是否运行中
var TRACK_CARD_IS_RUN = false;
var IS_LOCATION_MQTT_RECONNECT = false;
var CARD_TIPS = {}; //用于保存聚集图标
var TRACK_CHECKED_INPUT = {}; //人员列表中的多选框,用于开启和关闭轨迹追踪
var SEARCH_CARD_DATA = {}; //输入卡号模糊查询返回的结果
var CLIENT;
var CARD_VIEWPOINT_TRACK = undefined; //卡号视角追踪
var LITTLE_MAP_WIDTH ; //小地图宽度
var LITTLE_MAP_HEIGHT ; //小地图高度
var MOVING_CACHE_TIME = 2;

$(function () {
    getSystemConfig();
    setInterval(poll, 1000);
});

/*
轮询
 */
function poll() {
    TIME += 1;
    if (TIME > 4) {
        if(MAP_IS_ALREADY){
            //getAllBaseStation();
            getNowInfo();
            getCamera(true);
            filteringAreas();
            getFloorCamera();
        }
        TIME = 0;
    }
}

/*
清除sessionStorage保存的摄像机位置数据
 */
function clearSession() {
    sessionStorage.removeItem('zoom');
    sessionStorage.removeItem('center_x');
    sessionStorage.removeItem('center_y');
    sessionStorage.removeItem('point_x');
    sessionStorage.removeItem('point_y');
    sessionStorage.removeItem('point_z');
    sessionStorage.removeItem('deviation_x');
    sessionStorage.removeItem('deviation_y');
    sessionStorage.removeItem('deviation_z');
}

/*
获取系统配置
 */
function getSystemConfig() {
    HG_AJAX("/position_sdk/ModularConfiguration/SysConfig/getSysConfig",
        {name:"MOVING_CACHE_TIME"},"post",function (data) {
        if(data.type == 1) {
            var ret = data.result;
            if(ret[0] && ret[0].name == "MOVING_CACHE_TIME")
            MOVING_CACHE_TIME = ret[0].value;
        }
        getAllFloor();
    })
}

/*
获取所有楼层信息
 */
function getAllFloor() {
    HG_AJAX("/position_sdk/ModularFloor/Floor/getAllFloorInfo",{},"post",function (data) {
        if (data.type == 1) {
            var scene_data = data.result;
            var options = "";
            var all_floor_data = {};
            for (var i in scene_data){
                if(scene_data[i]){
                    var building_data = scene_data[i].node;
                    if(building_data.length>0){
                        for(var j in building_data){
                            var floor_data = building_data[j].node;
                            if(floor_data.length>0){
                                for (var k in floor_data){
                                    all_floor_data[floor_data[k].id] = floor_data[k];
                                    options+="<option value='"+floor_data[k].id+"' data-toggle='tooltip' data-placement='top' title='"+scene_data[i].name+"-"+building_data[j].name+"-"+floor_data[k].name+"'>"+floorStringSlice(scene_data[i].name+"-"+building_data[j].name+"-"+floor_data[k].name)+"</option>";
                                }
                            }
                        }
                    }
                }
            }
            $("#floor_select").html(options);
            if(all_floor_data[sessionStorage.floor_id]){
                $("#floor_select").val(sessionStorage.floor_id)
            }
            initFloorData($("#floor_select").val());

        }
    });
}

/*
初始化楼层函数,用于判断楼层是否为空以及楼层中是否存在地图
 */
function initFloorData(id) {
    //调用楼层数据接口
    HG_AJAX("/position_sdk/ModularFloor/Floor/getFloor",{},"post",function (data) {
        if (data.type == 1) {
            var data = data.result;
            $(data).each(function (index,ele) {
                FLOOR_DATA[this.id] = this;
            });
            var url;
            if(!FLOOR_DATA[id] || FLOOR_DATA[id].floor_3d_file =="0"){
                HG_MESSAGE("没有相关地图文件，将显示默认地图（功能无法实现）");
                url = AJAX_URL + "/position_sdk/App/Common/MapFile/basic.json";
                initScene(url);
                FLOOR_ID = id;
            }else {
                url = AJAX_URL + FLOOR_DATA[id].file_3d_path;
                initScene(url);
                FLOOR_ID = FLOOR_DATA[id].id;
            }
            //初始化连接mqtt
            // connectMQTT();

        }else {
            HG_MESSAGE(data.result);
        }
    });
}

/*
关闭卡号详细信息弹窗
 */
function closeCardTip() {
    if(TIP_CARD || TIP_STATION){
        $("#panel_card_info").hide();
        TIP_CARD = undefined;
        TIP_STATION = undefined;
    }
}

/*
打开卡号详细信息弹窗
 */
function writeCardInfo(id,x,y,z,type) {
    var operation = "";
    var name = "";
    switch (type){
        case 1:
            name = "卡号：";
            var track = "";
            if(TRACK_CHECKED_INPUT[id]){
                track = '<a class="a_panel_track" data-id="' + id + '">取消追踪</a>'
            }else{
                track = '<a class="a_panel_track" data-id="' + id + '">轨迹追踪</a>'
            }
            operation =  '<p>操作：' +
                '<a class="a_panel_phone" data-id="' + id + '">呼叫</a>' +
                track +
                '<a class="a_panel_video" data-id="' + id + '">视频</a>' +
                '</p>';
            break;
        case 2:
            name = "基站：";
            id = fromIntGetShowString(id);
            break;
    }
    var html =  "<i class='glyphicon glyphicon-remove'></i><p>" + name + id + "</p>" +
                "<p id='panel_card_info_position'>坐标：" + parseFloat(x).toFixed(2) + "，" +
                parseFloat(y).toFixed(2) + "，" +
                parseFloat(z).toFixed(2) + "</p>" + operation ;
    $("#panel_card_info").css({"left":-1000,"top":-1000}).show();
    $("#panel_card_info>div").html(html);
}

/*
请求卡号信息(主要用于获取处于不动状态的卡号)
 */
function getFirstCard() {
    HG_AJAX("/position_sdk/ModularNowInfo/NowInfo/getStaticList", {
        floor_id: FLOOR_ID
    },"post",function (data) {
        if(data.type == 1){
            var ret = data.result;
            for(var i in ret){
                var _id = ret[i].card_id;
                ALL_CARD[_id] = {
                    card: _id,
                    card_x: ret[i].x,
                    card_y: ret[i].y,
                    card_z: ret[i].card_relative_z
                };
                MY_MAP.addCardInfo(_id,0xffffff,{}, ret[i].x, ret[i].y, ret[i].card_relative_z,'',false);
                //调用SDK中的addCardInfo()方法,添加定位卡模型
                // 第一个参数是卡号,第二个为模型颜色,使用16进制颜色,前面要加"0x",
                // 第三个为模型上方的信息显示,可以传入多个属性,四五六是XYZ的坐标位置,
                // 第七个是模型上方信息的颜色,前面要加"#",最后一个参数是配置是否默认显示上方信息
                ALREADY_CARD[_id] = true;
                if( THROUGH_CARD_CHANGE["open"] && ALREADY_CARD[THROUGH_CARD_CHANGE["card"]] && !FLASH_CARD[THROUGH_CARD_CHANGE["card"]]){
                    MY_MAP.addCardTwinkle(THROUGH_CARD_CHANGE["card"]);
                    FLASH_CARD[THROUGH_CARD_CHANGE["card"]] = true;
                    THROUGH_CARD_CHANGE["open"] = false;
                    setTimeout(function () {
                        MY_MAP.clearCardTwinkle(THROUGH_CARD_CHANGE["card"]);
                        delete  FLASH_CARD[THROUGH_CARD_CHANGE["card"]];
                    },1800);
                }
            }
        }else{
            HG_MESSAGE(data.result);
        }

    });
}
/*
初始化场景,连接mqtt,绑定鼠标点击场景事件和鼠标点击定位卡事件
 */
function initScene(url) {
    if(CONFIG_3D.little_map){
        $("#panel_little_map").show();
        LITTLE_MAP_WIDTH = $("#little_map").width(); //小地图宽度
        LITTLE_MAP_HEIGHT = $("#little_map").height(); //小地图高度
    }
    //初始化设置
    var init_val = {
        scene_url: url,
        track_height:0.07,//轨迹高度
        dom_element: "canvas_3d",//使用的html容器id号
        ex_dom_element:"little_map",//小地图的dom元素
        camera_model_patrol_dist:20,//配置巡视卡号的摄像机高度
        track_length: 500, //轨迹最大长度
        scale_dist:100,//聚类距离系数，越大越密
        cache_time:MOVING_CACHE_TIME, //数据缓存时间
        card_type:CONFIG_3D.card_type,//1 代表的fbx，2 代表的是json
        offset_top: $("#canvas_3d").offset().top, // 场景偏移
        offset_left: $("#canvas_3d").offset().left, // 场景偏移
        open_fps: false, //是否显示帧率
        open_tips:true,
        model_path:"./json/", //定位卡基站模型存放目录
        select_color:0xff8c08, //配置定位卡模型点击时的颜色
        open_little_map:CONFIG_3D.little_map,
        open_shadow :CONFIG_3D.open_shadow,//开启阴影
        little_map_render_width : LITTLE_MAP_WIDTH,//小地图的渲染宽
        little_map_width_height_ratio :8/5//小地图的渲染宽高比例
    };
    if(CONFIG_3D.sky_box){
        init_val.scene_background_imgs = [ 'px.jpg', 'px.jpg', 'py.jpg', 'ny.jpg', 'px.jpg', 'px.jpg' ];
    }

    MY_MAP = new HG3DMap.map(init_val);//调用SDK的new HG3DMap.map()方法,初始化场景

    MY_MAP.loadModel("camera.json","camera");

    //地图文件加载完成后,获取区域和连接mqtt推送
    MY_MAP.addEventListener("sceneload", function (e) {
        var is_show = $("#loading_img").css("display");
        if(is_show == "none"){
            $("#loading_img").show();
        }
        $(".progress_bar p").html(e.progress + "%");
        $(".progress_bar_top").css("width",e.progress + "%");
        if (e.progress == 100) {
            setTimeout(function () {
                $("#loading_img").hide();
            },500);
            getArea();

            sessionStorage.floor_id = FLOOR_ID ;
            //判断是否通过卡号查询切换场景

            if(THROUGH_CARD_CHANGE["open"]){
                //使用SDK设置相机的方法将摄像机对准查询的定位卡,前三个参数填入定位卡的位置信息(x,y,z),后三个参数为偏移值,摄像机的位置等于定位卡位置加上偏移值
                MY_MAP.setCameraPosition(THROUGH_CARD_CHANGE["x"],THROUGH_CARD_CHANGE["y"],THROUGH_CARD_CHANGE["z"],0,-3,10);
            }else{
                if(sessionStorage.point_x){
                    var camera = sessionStorage;
                    MY_MAP.setCameraPosition(parseFloat(camera.point_x),parseFloat(camera.point_y),parseFloat(camera.point_z),parseFloat(camera.deviation_x),parseFloat(camera.deviation_y),parseFloat(camera.deviation_z));
                }
            }

            MAP_IS_ALREADY = true;
            getFirstCard();
            connectMQTT();
            getFloorCamera();
            getAllBaseStation();
            getNowInfo();
            getCamera(true);

        }
    });

    //鼠标点击场景,获取到点击位置的三维坐标,并在场景右下方显示出来
    MY_MAP.addEventListener("clickposition", function (e) {
        var mouse_position = "X：" + e.point.x.toFixed(2) +
            "，Y：" + e.point.y.toFixed(2) +
            "，Z：" + e.point.z.toFixed(2);
        $("#mouse_position").html(mouse_position);
    });

    //点击定位卡模型或者基站模型,打开信号详细弹窗
    MY_MAP.addEventListener("selectedmodel", function (e) {
        if(e.model_type == 1 || e.model_type == 2){
            writeCardInfo(e.model_id,e.position.x,e.position.y,e.position.z,e.model_type);
        }
        if(e.model_type == 1){
            TIP_CARD = e.model_id;
            TIP_STATION = undefined;
        }
        if(e.model_type == 2){
            TIP_STATION = e.model_id;
            TIP_CARD = undefined;
        }
        if(e.model_type == 3){
            playTheCamera(undefined,e.model_id,undefined)
        }
    });

    //实时更改详细信息弹窗位置,使其始终在模型头部位置
    MY_MAP.addEventListener("updateselectedmodelposition",function (e) {
        $("#panel_card_info").css({"top":e.screen_coord.y,"left":e.screen_coord.x});
        if (TIP_CARD) {
            var html_position = "坐标：" + parseFloat(e.position.x).toFixed(2) + "，" +
                parseFloat(e.position.y).toFixed(2) + "，" +
                parseFloat(e.position.z).toFixed(2);
            $("#panel_card_info_position").html(html_position);
        }
    });

    //聚集的人数显示,已经聚集中的卡号列表
    MY_MAP.addEventListener("updateclustercardlabel",function (object_list) {
        // update all room labels
        var _is_live = [];
        for (var key in object_list) {
            var card_tip = null;
            var list = object_list[key].card_list;
            if(list.length > 1 && object_list[key].cluster_center.z > -1 && object_list[key].cluster_center.z < 1 ) {
                _is_live[key] = true;
                var sub_content = '';
                var img = '<img src="img/tip_3d.png">';
                for (var i in list) {
                    sub_content += '<p data-id="' + list[i] + '" >' +
                        '<i class="glyphicon glyphicon-map-marker" style="margin-right: 6px"></i>'  + list[i] + '</p>';
                }

                if (!CARD_TIPS[key]) {
                    var card_tip = $('<div class="tip_label">' +
                        '<div class="tip_count">' + img + '<p>' + list.length + '</p></div>' +
                        '<div class="tip_sub"><div class="tip_sub_panel">' + sub_content + '</div></div></div>');
                    CARD_TIPS[key] = card_tip;
                    card_tip[0].key = key;
                    card_tip[0].style.display = "block";
                    card_tip[0].style["pointer-events"] = 'auto';
                    $("#tips_card").append(card_tip[0]);
                    $(card_tip[0]).click(function (e) {
                        var sub = $(this).find(".tip_sub");
                        var oth_sub = $(this).siblings(".tip_label").find(".tip_sub");
                        if ($(sub).css("display") == "none") {
                            $(sub).show();
                            oth_sub.hide();
                        } else {
                            $(sub).hide();
                        }
                    });
                    $(card_tip[0]).on('click', '.tip_sub p', function () {
                        if (PATROL_RANDOM) {
                            HG_MESSAGE("巡视中,无法使用选择卡号功能");
                            return;
                        }
                        var id = parseInt($(this).data("id"));
                        closeCardTip();
                        MY_MAP.selectCard(id);
                        writeCardInfo(id,ALL_CARD[id].card_x,ALL_CARD[id].card_y,ALL_CARD[id].card_z,1);
                        TIP_CARD = id;
                    });
                } else {
                    card_tip = CARD_TIPS[key];
                    $(card_tip).find(".tip_count p").html(list.length);
                    if ($(card_tip).find(".tip_sub").css("display") == "none") {
                        $(card_tip).find(".tip_sub_panel").html(sub_content);
                    }
                }
                // opacity won't be affected by disatnce if this room is active or selected
                var pct = object_list[key].camera_dist / 1000;
                pct = Math.floor((1 - pct) * 1000);
                if(pct < 0 ){
                    pct = 0
                }
                var opacity = 1;

                card_tip.css({
                    'transform': 'translate(' + object_list[key].cluster_center.x + 'px,' + object_list[key].cluster_center.y + 'px)',
                    'opacity': opacity,
                    'color': '#ffffff',
                    'z-index': pct
                });
                card_tip[0].style.display = "block";
            }
        }
        for(var i  in CARD_TIPS){
            if(!(_is_live[i])){
                $(CARD_TIPS[i]).remove();
                delete  CARD_TIPS[i];
            }
        }

        //鼠标点击事件
        MY_MAP.addEventListener("mousedown",function (e) {
            if(e.buttons == 1) {
                $(".tip_sub").hide();
                closeCardTip();
            }
        });
    });
}


/*
连接MQTT,获取实时的定位卡数据,和区域人数等数据
 */
function connectMQTT() {
    if (window.WebSocket) {
        var mqtt_username = MQTT_INFO.username;
        var mqtt_password = MQTT_INFO.password;
        if(sessionStorage.mqtt_username){
            mqtt_username = sessionStorage.mqtt_username
        }
        if(sessionStorage.mqtt_password){
            mqtt_password = sessionStorage.mqtt_password
        }
        CLIENT = mqtt.connect(WS_URL,{username:mqtt_username,password:mqtt_password});
        CLIENT.on("connect", function () {
            CLIENT.subscribe(["/pos_business/card_now_forweb/scene_id/" + FLOOR_DATA[FLOOR_ID].scene_id + "/building_id/" + FLOOR_DATA[FLOOR_ID].building_id + "/floor_id/" + FLOOR_ID,
                "/think_php/init_area",
                "/pos_business/card_now_floor_num",
                "/pos_business/del_card",
                "/pos_business/camera_alarm",
                "/pos_business/change_floor"]);
        });
        CLIENT.on("message", function (topic, payload) {
            switch (topic.split("/")[2]) {
                //获取到卡号数据,如果是新数据,则新增一个模型,并且将信息出入ALL_CARD中
                // 卡号存入到ALREADY_CARD中,方便查询卡号是否存在和设置单独显示卡号,若是老数据,则更新模型的位置
                case "card_now_forweb":
                    var data = JSON.parse(payload.toString());
                    for (var i in data) {
                        ALL_CARD[i] = {
                            card: i,
                            card_x: data[i].card_x,
                            card_y: data[i].card_y,
                            card_z: data[i].card_relative_z
                        };
                        if (!ALREADY_CARD[i]) {
                            MY_MAP.addCardInfo(i, 0xffffff, {}, data[i].card_x, data[i].card_y, data[i].card_relative_z, "", false);
                            //调用SDK中的addCardInfo()方法,添加定位卡模型
                            // 第一个参数是卡号,第二个为模型颜色,使用16进制颜色,前面要加"0x",
                            // 第三个为模型上方的信息显示,可以传入多个属性,四五六是XYZ的坐标位置,
                            // 第七个是模型上方信息的颜色,前面要加"#",最后一个参数是配置是否默认显示上方信息
                            ALREADY_CARD[i] = true;

                            if (TRACK_CHECKED_INPUT[i]) {
                                MY_MAP.addTrack(i);
                            }
                            if (PATROL_RANDOM_IS_RUN) {
                                if (!PATROL_RANDOM) {
                                    MY_MAP.stopPatrol();
                                    random();
                                }
                            }
                        } else {
                            MY_MAP.updateCardCoordinate(i, data[i].card_x, data[i].card_y, data[i].card_relative_z);
                            //调用SDK中的updateCardCoordinate()更新定位卡的位置,参数很简单
                        }
                        //通过卡号查询切换场景后,定位卡闪烁三次
                        if (THROUGH_CARD_CHANGE["open"] && ALREADY_CARD[THROUGH_CARD_CHANGE["card"]]) {
                            MY_MAP.addCardTwinkle(THROUGH_CARD_CHANGE["card"]);

                            FLASH_CARD[THROUGH_CARD_CHANGE["card"]] = true;
                            THROUGH_CARD_CHANGE["open"] = false;
                            setTimeout(function () {
                                MY_MAP.clearCardTwinkle(THROUGH_CARD_CHANGE["card"]);
                            }, 1800);
                            delete  FLASH_CARD[THROUGH_CARD_CHANGE["card"]];
                        }

                        if(CARD_VIEWPOINT_TRACK && ALREADY_CARD[CARD_VIEWPOINT_TRACK] && !TRACK_CARD_IS_RUN){
                            TRACK_CARD_IS_RUN = true;
                            MY_MAP.selectCard(CARD_VIEWPOINT_TRACK);
                            MY_MAP.followCard(CARD_VIEWPOINT_TRACK,30);
                        }

                    }
                    delete data;
                    break;
                //获取当前地图总人数信息,写入到区域列表下方
                case "card_now_floor_num":
                    var card_now_map_num = JSON.parse(payload.toString());
                    var num = card_now_map_num[FLOOR_ID];
                    if (num) {
                        $("#area").find("h5").html("楼层总人数:" + num);
                    } else {
                        $("#area").find("h5").html("楼层总人数:0");
                    }
                    delete card_now_map_num;
                    break;
                //区域数据发生变化的时候(比如有人新增或者删除了某个区域),执行getArea()重新获取区域数据
                case "init_area":
                    getArea();
                    break;
                //接收到定位卡消失的信息后,删除定位卡模型,并将卡号从ALREADY_CARD的数据中移除,同时更新ALL_CARD对象
                case "del_card":
                    var data = JSON.parse(payload.toString());
                    for (var i in data) {
                        if (TIP_CARD) {
                            if (TIP_CARD == data[i]) {
                                $("#panel_card_info").hide();
                            }
                        }
                        delete ALREADY_CARD[data[i]];
                        delete ALL_CARD[data[i]];

                        if ($.isEmptyObject(ALREADY_CARD)) {
                            if (PATROL_RANDOM) {
                                MY_MAP.stopPatrol();
                                clearInterval(PATROL_RANDOM);
                                PATROL_RANDOM = undefined;
                                NOW_PATROL_CARD = undefined;
                                MY_MAP.patrolScene(20, 10000, 2);
                            }
                        }
                        if (NOW_PATROL_CARD == data[i]) {
                            if (PATROL_RANDOM) {
                                MY_MAP.stopPatrol();
                                NOW_PATROL_CARD = undefined;
                                clearInterval(PATROL_RANDOM);
                                PATROL_RANDOM = undefined;
                                random();
                            }
                        }
                        MY_MAP.removeCard(data[i]);

                        if (TIP_CARD && TIP_CARD == i) {
                            closeCardTip();
                            TIP_CARD = undefined;
                        }
                    }
                    delete data;
                    break;
                //报警信息,定位卡闪烁效果,以及电子围栏闪烁
                case "camera_alarm":
                    var data = JSON.parse(payload.toString());
                    for (var t in data) {
                        for (var n in data[t]) {
                            if (data[t][n].floor_id == FLOOR_ID) {
                                var area_id = data[t][n].area_id;
                                if (ALREADY_ZONE[area_id]) {
                                    if (!FLASH_ZONE[area_id]) {
                                        MY_MAP.startZoneFlash(area_id);
                                        FLASH_ZONE[area_id] = true;
                                        (function () {
                                            var now_area = area_id;
                                            setTimeout(function () {
                                                MY_MAP.stopZoneFlash(now_area);
                                                delete FLASH_ZONE[now_area];
                                            }, 4000);
                                        })();
                                    }
                                }
                                var card_id = data[t][n].card_id;
                                if (ALREADY_CARD[card_id] && !FLASH_CARD[card_id]) {
                                    MY_MAP.addCardTwinkle(card_id);
                                    FLASH_CARD[card_id] = true;
                                    (function () {
                                        var now_card = card_id;
                                        setTimeout(function () {
                                            MY_MAP.clearCardTwinkle(now_card);
                                            delete  FLASH_CARD[now_card];
                                        }, 4000);
                                    })();
                                }
                            }
                        }
                    }
                    delete data;
                    break;
                case "change_floor":
                    //处理实时消失的卡号，当有卡号消失时，删除对应的卡号定位图标
                    var data = JSON.parse(payload.toString());
                    for (var i in data) {
                        if(data[i] != FLOOR_ID){
                            if (ALREADY_CARD[i]) {
                                //调用2d地图SDK中的删除一个定位图标
                                MY_MAP.removeCard(i);
                                delete ALREADY_CARD[i];
                                if (TIP_CARD && TIP_CARD == i) {
                                    closeCardTip();
                                    TIP_CARD = undefined;
                                }
                            }
                            if(CARD_VIEWPOINT_TRACK == i){
                                mapChange(data[i],i);
                            }
                        }
                    }
                    delete data;
                    break;
                default:
            }
        });
        CLIENT.on("connect", function () {
            if (IS_LOCATION_MQTT_RECONNECT) {
                CLIENT.end();
                connectMQTT();
                IS_LOCATION_MQTT_RECONNECT = false;
            }
        });
        CLIENT.on("error", function () {
            console.log("mqtt client is error");
        });
        CLIENT.on("reconnect", function () {
            IS_LOCATION_MQTT_RECONNECT = true;
            console.log("mqtt client try to reconnect");
        });
    } else {
        HG_MESSAGE("该浏览版本过于老旧，无法显示定位数据，请使用最新版chrome浏览器");
    }
}

/*
判断使用状态
 */
function checkUse(val,num){
    if(val != "0"){
        if(num){
            return 0;
        }else{
            return "是";
        }

    }else{
        if(num){
            return "--";
        }else {
            return "否";
        }
    }
}

/*
获取所有区域
 */
function getArea() {
    $("#area").find("thead").find("input")[0].checked = false;
    ALREADY_ZONE = [];//清空显示区域列表
    ALL_ZONE = {};//清空区域对象
    HG_AJAX("/position_sdk/ModularArea/Area/getArea", {
        floor_id: FLOOR_ID
    }, "post",function (data) {
        if (data.type == 1) {
            var result = data.result;
            var tbody = "";
            $(result).each(function () {
                tbody += "<tr><td><input type='checkbox' data-id='" + this.id + "' ></td>" +
                    "<td>" + this.name + "</td>" +
                    "<td id='num_" + this.id + "'>" + checkUse(this.is_use,true) + "</td>" +
                    "<td>" + checkUse(this.is_use) + "</td>" +
                    "<td><a href='#' data-id='" + this.id + "'>撤离</a></td>";
                var area = this.area.split(" ");
                var area_list = [];
                for (var i in area) {
                    var xy = area[i].split(",");
                    var obj = {
                        x: parseFloat(xy[0]),
                        y: parseFloat(xy[1])
                    };
                    area_list.push(obj);
                }
                var color = rgb2hex(this.area_style); //调用main.js中的rgb2hex()函数,把agb的颜色格式转换成16进制
                ALL_ZONE[this.id] = {
                    id: this.id,
                    zone_color: color,
                    z_start: this.relative_start,
                    z_end: this.relative_end,
                    area_list: [
                        {
                            area: area_list
                        }
                    ]
                };
            });
            $("#table_area").html(tbody);
            filteringAreas()
        } else {
            HG_MESSAGE("获取区域失败");
        }
    });
}

/*
获取区域人数
 */
function filteringAreas() {
    HG_AJAX("/position_sdk/ModularNowInfo/NowInfo/getCardByArea", {
        online: 1
    }, "post", function (data) {
        if (data.type == 1) {
            var data = data.result;
            if (data) {
                for (var i in data) {
                    if (ALL_ZONE[i] && $("#num_" + i)) {
                        if (ALL_ZONE[i].is_use != 0) {
                            $("#num_" + i).html(data[i].length);
                        } else {
                            $("#num_" + i).html("--");
                        }
                    }
                }
            }
        }
    })
}

/*
显示所有基站
 */
function getAllBaseStation() {
    HG_AJAX("/position_sdk/ModularBaseStation/BaseStation/getAllBaseStationInfo", {
        floor_id: FLOOR_ID
    }, "post",function (data) {
        if (data.type == 1) {
            var ret = data.result;
            // MY_MAP.removeAllStaticModel();
            for(var i in ret){
                MY_MAP.addStaticModel(ret[i].base_station_id,"baseStation",2 ,ret[i].base_station_x, ret[i].base_station_y, ret[i].base_station_z);
            };
        }
    });
}

/*
 获取当前楼层摄像头列表
*/
function getFloorCamera() {
    HG_AJAX("/position_sdk/ModularVideo/Equip/getEquip",{floor_id:FLOOR_ID},"post",function (data) {
        if (data.type == 1){
            var data = data.result;
            var html = "";
            $(data).each(function (index, ele) {
                html += '<tr><td>' + this.name + '</td><td><a class="show_camera" data-id=' + this.id + '>查看</a></td></tr>';
            });
            $("#table_equip").html(html);
        }
    });
}

/*
切换楼层函数
 */
function mapChange(floor_id, card){
    var record = $('#example').find(".heart");
    if(record.length>0 && !CLOSE_RECORD_FLOOR){
        $("#modal_video_download").modal("show");
        CLOSE_RECORD_FLOOR = floor_id;
        if(card){
            CLOSE_RECORD_DATA = card;
        }
        return;
    }
    CLIENT.unsubscribe([
        "/pos_business/card_now_forweb/scene_id/" + FLOOR_DATA[FLOOR_ID].scene_id + "/building_id/" + FLOOR_DATA[FLOOR_ID].building_id + "/floor_id/" + FLOOR_ID,
        "/think_php/init_area",
        "/pos_business/card_now_floor_num",
        "/pos_business/del_card",
        "/pos_business/camera_alarm",
        "/pos_business/change_floor"
    ],function () {
        //当轨迹列表存在卡号的时候,切换地图时清空轨迹列表
        if(card){
            THROUGH_CARD_CHANGE["open"] = true;
            THROUGH_CARD_CHANGE["x"] = SEARCH_CARD_DATA[card].x;
            THROUGH_CARD_CHANGE["y"] = SEARCH_CARD_DATA[card].y;
            THROUGH_CARD_CHANGE["z"] = SEARCH_CARD_DATA[card].z;
            THROUGH_CARD_CHANGE["card"] = card;
        }
        if(TRACK_CARD_IS_RUN){
            TRACK_CARD_IS_RUN = false;
            MY_MAP.stopFollowCard(CARD_VIEWPOINT_TRACK);
        }
        $("#query_card_input").val("");
        $("#search_card_list").html("");
        TRACK_CHECKED_INPUT = {};
        ALL_CARD = {};//清空卡号对象
        ALREADY_CARD = [];//清空加入场景的卡
        $("#panel_card_info>div").html("");
        $("#panel_card_info").hide();//关闭并清空信息面板
        FLOOR_ID = floor_id;
        MAP_IS_ALREADY = false;
        //调用SDK的changeScene()方法,切换地图文件,并清空场景中的模型(定位卡,区域等)
        MY_MAP.changeScene(AJAX_URL + FLOOR_DATA[FLOOR_ID].file_3d_path);
        CLOSE_RECORD_FLOOR = undefined;
        clearSession();
        $("#floor_select").val(FLOOR_ID);
    });
}

/*
点击地图下拉框选择楼层后切换楼层
 */
$("#floor_select").change(function (e) {
    e.preventDefault();
    var floor_id = $("#floor_select").val();
    if(FLOOR_DATA[floor_id].floor_3d_file =="0"){
        HG_MESSAGE("没有相关地图文件，无法切换");
        $("#floor_select").val(FLOOR_ID);
        return;
    }
    mapChange(floor_id);
});

/*
定位卡标识弹出面板中,点击轨迹追踪
 */
$("#panel_card_info").on("click", ".a_panel_track", function () {
    var glyphicon = $('.right_menu').find("div").eq(1).find("i").attr("class");
    if (glyphicon == "glyphicon glyphicon-chevron-right") {
        $('.right_menu').find("div").eq(1).click();
    }
    var id = $(this).data("id");
    var input = $("#tbody_card_info").find("input");
    var len = input.length;
    if ($(this).html() == "轨迹追踪" ) {
        TRACK_CHECKED_INPUT[id] = true;
        MY_MAP.addTrack(id);//调用SDK的addTrack()方法,添加模型轨迹绘制功能
        $(this).html("取消追踪");
        for(var i = 0; i < len; i++){
            var _id = $(input[i]).data("id");
            if(_id == id){
                $(input[i])[0].checked = true;
            }
        }
    } else {
        delete TRACK_CHECKED_INPUT[id];
        MY_MAP.removeTrack(id);//调用SDK的addTrack()方法,添加模型轨迹绘制功能
        $(this).html("轨迹追踪");
        for(var i = 0; i < len; i++){
            var _id = $(input[i]).data("id");
            if(_id == id){
                $(input[i])[0].checked = false;
            }
        }
        $("#thead_card_info")[0].checked = false;
    }
    cardInfoTheadChecked();
});

/*
发送呼叫函数
 */
function callCard(card_id) {
    HG_AJAX("/position_sdk/ModularNowInfo/NowInfo/callCardList", {
        card_list: [card_id]
    }, "post",function (data) {
        if (data.type == 1) {
            HG_MESSAGE("卡号:" + card_id + "呼叫成功");
        } else {
            HG_MESSAGE(data.result);
        }
    });
}

/*
播放视频函数
 */
function playCardVideo(card){
    HG_AJAX('/position_sdk/ModularVideo/Equip/getTheWatcher',{
        floor_id:FLOOR_ID,
        x:ALL_CARD[card].card_x,
        y:ALL_CARD[card].card_y,
        z:ALL_CARD[card].card_z
    },'post',function (data) {
        if(data.type == 1){
            var data = data.result,
                camera_id = data;
            if(camera_id == -1){
                HG_MESSAGE('当前选择的人员标签卡不处于任何摄像头的拍摄区域!');
                return;
            }else{
                playTheCamera(undefined,camera_id,card);
            }
        }else{
            HG_MESSAGE(data.result);
        }
    });
}

/*
定位卡标识弹出面板中 呼叫操作
 */
$("#panel_card_info").on("click", ".a_panel_phone", function () {
    var id = $(this).data("id");
    callCard(id);
});

/*
定位卡标识弹出面板中,播放视频
 */
$("#panel_card_info").on("click",".a_panel_video",function () {
    var id = $(this).data("id");
    playCardVideo(id);
});

/*
定位卡标识弹出面板中 关闭面板
 */
$("#panel_card_info").on("click", "i", function () {
    closeCardTip();
});

/*
左侧输入框输入卡号，进行模糊查询
 */
$("#query_card_input").keyup(function (e) {
    var card_id = $("#query_card_input").val();
    if (e.keyCode == 13) {
        var search_list = $("#search_card_list .search_card");
        var len = search_list.length;
        var is_true = 0;
        for(var i = 0 ; i < len;i++){
            if(card_id == search_list.html()){
                $(search_list[i]).trigger("click");
                is_true++;
            }
        }
        if(len < 1 || is_true < 1){
            HG_MESSAGE("定位标签不存在");
            $("#query_card_input").addClass("input_change");
            setTimeout(function () {
                $("#query_card_input").removeClass("input_change");
                $("#search_card_list").html("");
            },1000);
        }
        return;
    }
    if(!card_id){
        $("#search_card_list").html("");
    }
    if(!$.trim(card_id)){
        card_id = undefined
    }
    if(!card_id){
        $("#search_card_list").html("");
        return;
    }
    HG_AJAX("/position_sdk/ModularNowInfo/NowInfo/getAllCardNowPos",{
        card_id:card_id
    },"post",function (data) {
        if(data.type == 1){
            var data = data.result;
            var html = "";
            for(var i in data){
                SEARCH_CARD_DATA[data[i].card_id] = data[i];
                var card_id = data[i].card_id;
                html+= '<button type="button" class="list-group-item search_card" data-id="'+card_id+'">'
                    + card_id + '</button>';
            }
            $("#search_card_list").html(html);
        }
    })
});

/*
选择模糊查询返回的卡号
 */
$("#search_card_list").on("click",".search_card",function () {
    var card = $(this).data("id");
    if(ALREADY_CARD[card]){
        //定位卡在本楼层，将地图的视点中心设置为该定位卡的位置，并闪烁3秒
        //定位卡在本楼层，将地图的视点中心设置为该定位卡的位置，并闪烁3秒
        MY_MAP.setCameraPosition(ALL_CARD[card].card_x,ALL_CARD[card].card_y,ALL_CARD[card].card_z,0,-3,10);
        //给定位卡添加闪烁效果,完成三次后取消闪烁(三次差不多需要1.8秒)
        if(!FLASH_CARD[card]){
            MY_MAP.addCardTwinkle(card);
            FLASH_CARD[card] = true;
            setTimeout(function(){
                MY_MAP.clearCardTwinkle(card);
                delete FLASH_CARD[card];
            },1800);
        }
        $("#search_card_list").html("");
    }else {
        if(FLOOR_DATA[SEARCH_CARD_DATA[card].floor_id].floor_3d_file == "0"){
            HG_MESSAGE("没有相关地图文件，不能跳转");
            return;
        }
        mapChange(SEARCH_CARD_DATA[card].floor_id,card);
    }

});

/*
点击右侧菜单 切换区域列表 和轨迹追踪的显示
 */
$(".right_menu").find('div').click(function () {
    var glyphicon = $(this).find("i").attr("class");
    var this_id = $(this).find("i").data("id");
    if (glyphicon == "glyphicon glyphicon-chevron-right") {
        $(this).find("i").attr("class", "glyphicon glyphicon-chevron-down");
        $(this).siblings().find("i").attr("class", "glyphicon glyphicon-chevron-right");
        $("#" + this_id).show();
        var other_i = $(this).siblings().find("i");
        for (var i = 0; i < other_i.length; i++) {
            var other_id = $(other_i[i]).data("id");
            $("#" + other_id).hide();
        }
        $(".right_content").slideDown();
    } else {
        $(this).find("i").attr("class", "glyphicon glyphicon-chevron-right");
        $(".right_content").slideUp();
    }
});

/*
计算可以完整显示区域的摄像机位置
 */
function findMax(area,center){
    var max_x = -Infinity;
    var max_y = -Infinity;
    var min_x = Infinity;
    var min_y = Infinity;
    for(var i in area){
        if(area[i].x > max_x){
            max_x = area[i].x;
        }
        if(area[i].y > max_y){
            max_y = area[i].y
        }
        if(area[i].x < min_x){
            min_x = area[i].x;
        }
        if(area[i].y < min_y){
            min_y = area[i].y
        }
    }
    var max_z = (max_x - min_x);
    var _max_z = (max_y - min_y) * 5;
    if(max_z < _max_z){
        max_z = _max_z
    }
    if(max_z > 1000){
        max_z = 1000
    }
    var obj = {
        x:(max_x + min_x) / 2,
        y:(max_y + min_y) / 2,
        z:max_z
    };
    var max_obj = [
        {
            x:max_x,y:max_y
        },
        {
            x:min_x,y:min_y
        }
    ];
    if(center){
        return obj;
    }else{
        return max_obj;
    }
}

/*
点击区域列表中的多选框,显示和隐藏区域
 */
$("#table_area").on("click", "input", function () {
    var id = $(this).data("id");
    if ($(this)[0].checked) {
        MY_MAP.addZone(ALL_ZONE[id]);//调用SDK的addZone()方法,添加区域
        ALREADY_ZONE[id]  = true;
        if(!PATROL_RANDOM_IS_RUN && !PATROL_SCENE_IS_RUN && !TRACK_CARD_IS_RUN){
            var area_list = ALL_ZONE[id]["area_list"][0]["area"];
            var camera = findMax(area_list,true);
            MY_MAP.setCameraPosition(camera['x'],camera['y'],0,0,0,camera['z']);
        }
        var input = $("#area").find("tbody").find("input");
        var num = 0;
        for (var i = 0; i < input.length; i++) {
            if ($(input[i])[0].checked) {
                num += 1;
                if (num == input.length) {
                    $("#area").find("thead").find("input")[0].checked = true;
                }
            }
        }
    } else {
        MY_MAP.removeZone(id);//调用SDK的removerZone()方法,删除区域
        delete ALREADY_ZONE[id];
        $("#area").find("thead").find("input")[0].checked = false;
    }
});

/*
右侧菜单,区域列表面板中,区域列表的表头点击多选框 实现所有区域都选中
 */
$("#area").find("thead").find("input").click(function () {
    var input = $("#area").find("tbody").find("input");
    var all_area = [];
    if ($(this)[0].checked) {
        //循环ALL_ZONE,如是区域未显示,则添加区域显示
        for (var j in ALL_ZONE) {
            if (!ALREADY_ZONE[j]) {
                ALREADY_ZONE[j] = true;
                MY_MAP.addZone(ALL_ZONE[j]);//调用SDK的addZone()方法,添加区域
                var area_list = ALL_ZONE[j]["area_list"][0]["area"];
                var one = findMax(area_list);
                all_area.push(one[0]);
                all_area.push(one[1]);
            }
        }
        if(!PATROL_RANDOM_IS_RUN && !PATROL_SCENE_IS_RUN && !TRACK_CARD_IS_RUN){
            var camera = findMax(all_area,true);
            MY_MAP.setCameraPosition(camera['x'],camera['y'],0,0,0,camera['z']);
        }
        for (var i = 0; i < input.length; i++) {
            $(input[i])[0].checked = true;
        }
    } else {
        for (var k in ALL_ZONE) {
            MY_MAP.removeZone(k);//调用SDK的removeZone()方法,删除区域
        }
        ALREADY_ZONE = [];
        for (var o = 0; o < input.length; o++) {
            $(input[o])[0].checked = false;
        }
    }
});

/*
右侧菜单,区域列表每行最后点击撤离,对区域内所有卡号发送呼叫
 */
$("#table_area").on("click", "a", function () {
    var area_id = $(this).data("id");
    HG_AJAX("/position_sdk/ModularNowInfo/NowInfo/evacuateArea", {
        area_id_str: [area_id]
    }, "post",function (data) {
        if (data.type == 1) {
            HG_MESSAGE("发送区域撤离成功");
        } else {
            HG_MESSAGE(data.result);
        }
    });
});

/*
卡号列表中点击选择，改变卡号弹出框中轨迹的操作文字
 */
function trackIcoText(text){
    if($("#panel_card_info").css("display") != "none"){
        $("#panel_card_info").find(".a_panel_track").html(text)
    }
}

/*
判断卡号列表是否全选
 */
function cardInfoTheadChecked(){
    var check_flag = 0;
    var input = $("#tbody_card_info").find("input");
    var len = input.length;
    for (var i = 0; i < len; i++) {
        if ($(input[i])[0].checked) {
            check_flag++;
        }
    }
    if (check_flag == len) {
        $("#thead_card_info input")[0].checked = true;
    } else {
        $("#thead_card_info input")[0].checked = false;
    }
}

/*
实时获取卡号列表
 */
function getNowInfo() {
    var floor_id = FLOOR_ID;
    HG_AJAX("/position_sdk/ModularNowInfo/NowInfo/getNowInfo", {
        page: 1,
        limit: 10000,
        floor_id: floor_id,
        blind: "2"
    }, "post", function (data) {
        if (data.type == 1) {
            var ret = data.result.data;
            var html = "";
            for (var i  in ret) {
                var checked = "";
                var active = "";
                var style = "";
                if (TRACK_CHECKED_INPUT[ret[i].card_id]) {
                    checked = "checked";
                }
                if(CARD_VIEWPOINT_TRACK && ret[i].card_id == CARD_VIEWPOINT_TRACK){
                    active = " active"
                }
                if(PATROL_SCENE_IS_RUN || PATROL_RANDOM_IS_RUN){
                    style = "cursor:not-allowed";
                }
                html += '<tr><td><input type="checkbox" ' + checked + '  data-id="' + ret[i].card_id + '"/></td>' +
                    '<td>' + ret[i].card_id + '</td>' +
                    '<td>' +
                    '<a class="a_td_phone" data-card="' + ret[i].card_id + '" >呼叫</a>' +
                    '<a class="a_td_video" data-card="' + ret[i].card_id + '" data-coordinates="' + [ret[i].x, ret[i].y] + '" >视频</a>' +
                    '</td>' +
                    '<td><b class="glyphicon glyphicon-ok' + active + '" style="' + style + '"  data-card="' + ret[i].card_id + '"></b></td>' +
                    '</tr>';
            }
            $("#tbody_card_info").html(html);
            cardInfoTheadChecked();
        }
    });
}

/*
卡号列表全选操作
 */
$("#thead_card_info").find("input").click(function (e) {
    e.stopPropagation();
    var id;
    var input = $("#tbody_card_info").find("input");
    if ($(this)[0].checked) {
        for (var i = 0; i < input.length; i++) {
            if ($(input[i])[0].checked == false) {
                $(input[i])[0].checked = true;
                id = $(input[i]).data("id");
                MY_MAP.addTrack(id);
                TRACK_CHECKED_INPUT[id]= true;
                if(id == TIP_CARD){
                    trackIcoText("取消追踪")
                }
            }
        }
    } else {
        for (var o = 0; o < input.length; o++) {
            if ($(input[o])[0].checked == true) {
                $(input[o])[0].checked = false;
                id = $(input[o]).data("id");
                MY_MAP.removeTrack(id);
                delete TRACK_CHECKED_INPUT[id];
                if(id == TIP_CARD){
                    trackIcoText("轨迹追踪")
                }
            }
        }
    }
});

/*
卡号列表点击选择
 */
$("#tbody_card_info").on("click", "input", function (e) {
    e.stopPropagation();
    var id = $(this).data("id");
    if (this.checked) {
        MY_MAP.addTrack(id);
        TRACK_CHECKED_INPUT[id]= true;
        if(id == TIP_CARD){
            trackIcoText("取消追踪")
        }
    } else {
        MY_MAP.removeTrack(id);
        delete TRACK_CHECKED_INPUT[id];
        if(id == TIP_CARD){
            trackIcoText("轨迹追踪")
        }
    }
    cardInfoTheadChecked()
});

/*
卡号列表中点击清除轨迹
 */
$("#btn_clear_track").click(function () {
    for(var i in TRACK_CHECKED_INPUT){
        MY_MAP.clearTrack(i);
    }
});

/*
卡号列表中点击呼叫
 */
$("#tbody_card_info").on("click",".a_td_phone",function (){
    var card = $(this).data("card");
    callCard(card);

});

/*
卡号列表中点击视频
 */
$("#tbody_card_info").on("click",".a_td_video",function (){
    var card = $(this).data("card");
    playCardVideo(card);
});

/*
卡号列表中打开或者关闭视点追踪
 */
$("#tbody_card_info").on("click","b",function () {
    if($(this).css("cursor") == "not-allowed"){
        return;
    }
    if(TRACK_CARD_IS_RUN){
        TRACK_CARD_IS_RUN = false;
        MY_MAP.stopFollowCard(CARD_VIEWPOINT_TRACK);
    }
    var card = $(this).data("card");
    if($(this).attr("class") == "glyphicon glyphicon-ok"){
        TRACK_CARD_IS_RUN = true;
        MY_MAP.followCard(card,30);
        MY_MAP.selectCard(card);
        $("#back_origin").css("cursor","not-allowed");
        $("#btn_patrol_random").css("cursor","not-allowed");
        $("#btn_patrol_scene").css("cursor","not-allowed");
        $("#table_equip").find(".show_camera").css("cursor","not-allowed");
        $("#query_card_input").attr("disabled","disabled");
        $("#floor_select").attr("disabled","disabled");
        writeCardInfo(card,ALL_CARD[card].card_x,ALL_CARD[card].card_y,ALL_CARD[card].card_z,1);
        $(this).attr("class","glyphicon glyphicon-ok active");
        $(this).parent().parent().siblings().find("b").attr("class","glyphicon glyphicon-ok");
        TIP_CARD = card;
        CARD_VIEWPOINT_TRACK = card;
    }else{
        $("#back_origin").css("cursor","pointer");
        $("#btn_patrol_random").css("cursor","pointer");
        $("#btn_patrol_scene").css("cursor","pointer");
        $("#table_equip").find(".show_camera").css("cursor","pointer");
        $("#query_card_input").removeAttr("disabled");
        $("#floor_select").removeAttr("disabled");
        TRACK_CARD_IS_RUN = false;
        MY_MAP.stopFollowCard(card);
        MY_MAP.unSelectCard();
        closeCardTip();
        $(this).attr("class","glyphicon glyphicon-ok");
        TIP_CARD = card;
        CARD_VIEWPOINT_TRACK = undefined;
    }
});

/*
点击场景巡视图标
 */
$("#btn_patrol_scene").click(function () {
    if($(this).css("cursor") == "not-allowed"){
        return;
    }
    if($(this).attr("src") == "img/patrol_scene.png"){
        $(this).attr("src","img/patrol_scene_active.png");
        $("#back_origin").css("cursor","not-allowed");
        $("#tbody_card_info").find("b").css("cursor","not-allowed");
        $("#table_equip").find(".show_camera").css("cursor","not-allowed");
        $("#btn_patrol_random").css("cursor","not-allowed");
        $("#query_card_input").attr("disabled","disabled");
        $("#floor_select").attr("disabled","disabled");
        MY_MAP.patrolScene(20,100000,2);
        PATROL_SCENE_IS_RUN = true;
    }else{
        $(this).attr("src","img/patrol_scene.png");
        $("#back_origin").css("cursor","pointer");
        $("#tbody_card_info").find("b").css("cursor","pointer");
        $("#table_equip").find(".show_camera").css("cursor","pointer");
        $("#btn_patrol_random").css("cursor","pointer");
        $("#query_card_input").removeAttr("disabled");
        $("#floor_select").removeAttr("disabled");
        MY_MAP.stopPatrol();
        PATROL_SCENE_IS_RUN = false;
    }
});

/*
随机巡视函数
 */
function random() {
    if(!$.isEmptyObject(ALREADY_CARD)){
        if (NOW_PATROL_CARD) {
            MY_MAP.stopPatrol();
        }
        var arr = [];
        for (var i in ALREADY_CARD) {
            arr.push(i)
        }
        NOW_PATROL_CARD = arr[Math.floor(Math.random() * arr.length)];
        MY_MAP.patrolCard(NOW_PATROL_CARD, 20, 100, 2);
        closeCardTip();
        MY_MAP.selectCard(NOW_PATROL_CARD);

        writeCardInfo(NOW_PATROL_CARD,ALL_CARD[NOW_PATROL_CARD].card_x,ALL_CARD[NOW_PATROL_CARD].card_y,ALL_CARD[NOW_PATROL_CARD].card_z,1);
        TIP_CARD = NOW_PATROL_CARD;
        if(!PATROL_RANDOM){
            PATROL_RANDOM = setInterval(random,30000);
        }
    }
}

/*
点击随机巡视图标
 */
$("#btn_patrol_random").click(function () {
    if($(this).css("cursor") == "not-allowed"){
        return;
    }
    if($(this).attr("src") == "img/patrol_random.png"){
        if($.isEmptyObject(ALREADY_CARD)){
            HG_MESSAGE("场景中没有定位卡,无法使用随机巡视功能");
            return;
        }
        $(this).attr("src","img/patrol_random_active.png");
        $("#back_origin").css("cursor","not-allowed");
        $("#tbody_card_info").find("b").css("cursor","not-allowed");
        $("#table_equip").find(".show_camera").css("cursor","not-allowed");
        $("#btn_patrol_scene").css("cursor","not-allowed");
        $("#query_card_input").attr("disabled","disabled");
        $("#input_patrol_add").attr("disabled","disabled");
        $("#floor_select").attr("disabled","disabled");
        random();
        PATROL_RANDOM_IS_RUN = true;
    }else{
        $(this).attr("src","img/patrol_random.png");
        $("#back_origin").css("cursor","pointer");
        $("#tbody_card_info").find("b").css("cursor","pointer");
        $("#btn_patrol_scene").css("cursor","pointer");
        $("#table_equip").find(".show_camera").css("cursor","pointer");
        $("#query_card_input").removeAttr("disabled");
        $("#input_patrol_add").removeAttr("disabled");
        $("#floor_select").removeAttr("disabled");
        MY_MAP.stopPatrol();
        clearInterval(PATROL_RANDOM);
        PATROL_RANDOM = undefined;
        if(NOW_PATROL_CARD){
            closeCardTip();
            MY_MAP.unSelectCard();
            NOW_PATROL_CARD = undefined;
        }
        PATROL_RANDOM_IS_RUN = false;
    }

});

/*
 回到默认中心
 */
$("#back_origin").click(function () {
    if($(this).css("cursor") != "not-allowed"){
        MY_MAP.goBackToCenter();
    }
});

/*
离开页面是记录摄像机位置
 */
$(window).bind('beforeunload',function () {
    var camera = MY_MAP.getCameraInfo();
    sessionStorage.deviation_x = parseFloat(camera.x) - parseFloat(camera.center_x);
    sessionStorage.deviation_y = parseFloat(camera.y) - parseFloat(camera.center_y);
    sessionStorage.deviation_z = parseFloat(camera.z) - parseFloat(camera.center_z);
    sessionStorage.point_x = parseFloat(camera.center_x);
    sessionStorage.point_y = parseFloat(camera.center_y);
    sessionStorage.point_z = parseFloat(camera.center_z);
});

/*
 摄像头列表中查看摄像头具体位置
*/
$("#table_equip").on("click",".show_camera",function () {
    if($(this).css("cursor") == "not-allowed"){
        return;
    }
    var id = $(this).data("id");
    MY_MAP.setCameraPosition(parseFloat(ALL_CAMERA[id].x),parseFloat(ALL_CAMERA[id].y),parseFloat(ALL_CAMERA[id].z),0,-3,14);
});

$("#little_map_panel>i").click(function () {
    $("#little_map_panel").animate({"width":"0","height":"0"},200,function () {
        $("#btn_open_little_map").show();
        $("#little_map_panel").hide();
    })
});

$("#btn_open_little_map").click(function () {
    $("#btn_open_little_map").hide();
    $("#little_map_panel").show().animate({"width":LITTLE_MAP_WIDTH,"height":LITTLE_MAP_HEIGHT},200);
});