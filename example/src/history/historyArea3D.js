var MY_MAP;//地图对象
var SCENE_ID;//场景id
var BUILDING_ID;//建筑id
var FLOOR_ID;//楼层id
var ALL_CARD_TO_SEARCH = [];//所有查询历史轨迹的卡
var ALL_SEARCH_CARD_STRING;//所有查询历史轨迹的卡的字符串
var ALL_AREA_TO_SEARCH = [];//所有要查询的区域ID
var ALL_SEARCH_AREA_STRING;//由区域ID组成的字符串
var SEARCH_DRAW_AREA;//绘制区域不赋值，默认undefined
var ALL_ZONE = [];//所有区域的信息
var FLOOR_DATA = {};
var ALREADY_CARD = [];//所有卡号
var ALREADY_CARD_TIME = [];//给所有卡绑上时间属性,每收到后台信息的时候更新
var IS_CHANGE_MAP = false;//判断是否切换了地图，如果切换了地图，数据丢弃
var LAST_AREA_ID;//上一个区域id
var TIP_CARD = undefined; //用于记录点击的定位卡,方便清除定位卡提示框
var MOVING_CACHE_TIME = 2;
var CARD_TIPS = {}; //用于保存聚集图标


/*
 初始执行
*/
$(function () {
    getSystemConfig();
    initDataInput();
    initTimeInput();
    setInterval(removeOldCard, 4100);
});

//获取系统配置
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
 获得所有场景、建筑、楼层
*/
function getAllFloor() {
    HG_AJAX("/position_sdk/ModularFloor/Floor/getAllFloorInfo",{},"post",function (data) {
        if (data.type == 1) {
            var scene_data = data.result;
            var options = "";
            for (var i in scene_data){
                if(scene_data[i]){
                    var building_data = scene_data[i].node;
                    if(building_data.length>0){
                        for(var j in building_data){
                            var floor_data = building_data[j].node;
                            if(floor_data.length>0){
                                for (var k in floor_data){
                                    options+="<option value='"+floor_data[k].id+"' data-toggle='tooltip' data-placement='top' title='"+scene_data[i].name+"-"+building_data[j].name+"-"+floor_data[k].name+"'>"+floorStringSlice(scene_data[i].name+"-"+building_data[j].name+"-"+floor_data[k].name)+"</option>";
                                }
                            }
                        }
                    }
                }
            }
            $("#floor_select").html(options);
            initFloorData($("#floor_select").val());
        }
    });
}

/*
 页面初始化
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
                BUILDING_ID = undefined;
                SCENE_ID = undefined;
            }else {
                url = AJAX_URL + FLOOR_DATA[id].file_3d_path;
                initScene(url);
                FLOOR_ID = id;
                BUILDING_ID = FLOOR_DATA[FLOOR_ID].building_id;
                SCENE_ID = FLOOR_DATA[FLOOR_ID].scene_id;
            }
        }else {
            HG_MESSAGE(data.result);
        }
    });
}
//关闭卡号详细信息弹窗
function closeCardTip() {
    if(TIP_CARD ){
        $("#panel_card_info").hide();
        TIP_CARD = undefined;
    }
}

//打开卡号详细信息弹窗
function writeCardInfo(id,x,y,z) {
    var name = "";
    var html =  "<i class='glyphicon glyphicon-remove'></i><p>卡号：" + id + "</p>" +
        "<p id='panel_card_info_position'>坐标：" + parseFloat(x).toFixed(2) + "，" +
        parseFloat(y).toFixed(2) + "，" +
        parseFloat(z).toFixed(2) + "</p>";
    $("#panel_card_info").css({"left":-1000,"top":-1000}).show();
    $("#panel_card_info>div").html(html);
}

/*
 初始化场景
*/
function initScene(url) {
    //初始化设置
    var init_val = {
        scene_url: url,
        track_height:0.07,//轨迹高度
        dom_element: "canvas_3d",//使用的html容器id号
        camera_model_patrol_dist:20,//配置巡视卡号的摄像机高度
        track_length: 500, //轨迹最大长度
        scale_dist:100,//聚类距离系数，越大越密
        cache_time:MOVING_CACHE_TIME, //数据缓存时间
        card_type:CONFIG_3D.card_type,//1 代表的fbx，2 代表的是json
        offset_top: $("#canvas_3d").offset().top, // 场景偏移
        offset_left: $("#canvas_3d").offset().left, // 场景偏移
        open_fps: false, //是否显示帧率
        open_tips:false,
        model_path:"./json/", //定位卡基站模型存放目录
        select_color:0xff8c08, //配置定位卡模型点击时的颜色
        open_shadow :CONFIG_3D.open_shadow,//开启阴影
        open_little_map:false
    };
    if(CONFIG_3D.sky_box){
        init_val.scene_background_imgs = [ 'px.jpg', 'px.jpg', 'py.jpg', 'ny.jpg', 'px.jpg', 'px.jpg' ];
    }
    MY_MAP = new HG3DMap.map(init_val); //3DSDK初始化地图的方法
    MY_MAP.addEventListener("sceneload", function (e) {
        var is_show = $("#loading_img").css("display");
        if (is_show == "none") {
            $("#loading_img").show();
        }
        $(".progress_bar p").html(e.progress + "%");
        $(".progress_bar_top").css("width", e.progress + "%");
        if (e.progress == 100) {
            setTimeout(function () {
                $("#loading_img").hide();
            }, 500);
            getArea(FLOOR_ID);
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
        if (e.model_type == 1 ) {
            writeCardInfo(e.model_id, e.position.x, e.position.y, e.position.z);
            TIP_CARD = e.model_id;
        }
    });

    //实时更改详细信息弹窗位置,使其始终在模型头部位置
    MY_MAP.addEventListener("updateselectedmodelposition", function (e) {
        $("#panel_card_info").css({"top": e.screen_coord.y, "left": e.screen_coord.x});
        if (TIP_CARD) {
            var html_position = "坐标：" + parseFloat(e.position.x).toFixed(2) + "，" +
                parseFloat(e.position.y).toFixed(2) + "，" +
                parseFloat(e.position.z).toFixed(2);
            $("#panel_card_info_position").html(html_position);
        }
    });

    //聚集的人数显示,已经聚集中的卡号列表
    MY_MAP.addEventListener("updateclustercardlabel", function (object_list) {
        // update all room labels
        var _is_live = [];
        for (var key in object_list) {
            var card_tip = null;
            var list = object_list[key].card_list;
            if (list.length > 1 && object_list[key].cluster_center.z > -1 && object_list[key].cluster_center.z < 1) {
                _is_live[key] = true;
                var sub_content = '';
                var img = '<img src="img/tip_3d.png">';
                for (var i in list) {
                    sub_content += '<p data-id="' + list[i] + '" >' +
                        '<i class="glyphicon glyphicon-map-marker" style="margin-right: 6px"></i>' + list[i] + '</p>';
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
                        var id = parseInt($(this).data("id"));
                        closeCardTip();
                        MY_MAP.selectCard(id);
                        writeCardInfo(id, 0, 0, 0, 1);
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
                if (pct < 0) {
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
        for (var i  in CARD_TIPS) {
            if (!(_is_live[i])) {
                $(CARD_TIPS[i]).remove();
                delete  CARD_TIPS[i];
            }
        }
    });

    //鼠标点击事件
    MY_MAP.addEventListener("mousedown", function (e) {
        if (e.buttons == 1) {
            $(".tip_sub").hide();
            closeCardTip();
        }
    });
}

$("#panel_card_info").on("click", "i", function () {
    closeCardTip();
});
/*
 获取所有区域 将绘制区域的信息存入All_ZONE中,方便之后显示和隐藏区域
*/
function getArea(floor_id) {
    ALL_ZONE = {};//清空区域对象
    HG_AJAX("/position_sdk/ModularArea/Area/getArea", {floor_id: floor_id},"post",function (data) {
        if (data.type == 1) {
            var result = data.result;
            var options = "";
            $(result).each(function () {
                options += "<option value='" + this.id + "'>" + this.name + "</option>";
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
                var color = rgb2hex(this.area_style);
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
            $("#search_area").html(options);
            if(options){
                $("#search_area").change();
            }
        } else {
            HG_MESSAGE("获取区域失败");
        }
    });
}

/*
 回放的时候,处理定位卡数据
*/
function handleLocationData(card_id, x, y, z, card_relative_z) {
    var time = Date.parse(new Date());
    ALREADY_CARD_TIME[card_id] = time;
    if ( !ALREADY_CARD[card_id]) {
        MY_MAP.addCardInfo(card_id, 0xffffff, {card: card_id}, parseFloat(x), parseFloat(y), parseFloat(card_relative_z));
        MY_MAP.addTrack(card_id);
        ALREADY_CARD[card_id] = true;
    } else {
        MY_MAP.updateCardCoordinate(card_id, parseFloat(x), parseFloat(y), parseFloat(card_relative_z));
    }
}

/*
 删除太久没有数据的定位卡模型
*/
function removeOldCard() {
    var now = Date.parse(new Date());
    for (var i in ALREADY_CARD_TIME) {
        if (( now - ALREADY_CARD_TIME[i]) > 4000) {
            MY_MAP.removeCard(i);
            MY_MAP.removeTrack(i);
            delete ALREADY_CARD[i];
            delete ALREADY_CARD_TIME[i];
            if (TIP_CARD && TIP_CARD == i) {
                closeCardTip();
                TIP_CARD = undefined;
            }
        }
    }
}

/*
 重置地图
*/
function resetMap() {
    MY_MAP.reset();
    ALREADY_CARD = [];
    ALREADY_CARD_TIME = [];
}

/*
 重置地图（拖动进度条专用）
*/
function resetMapProgress() {
    for(var i in ALREADY_CARD){
        MY_MAP.removeCard(i)
    }
    MY_MAP.removeAllTrack();
    ALREADY_CARD = [];
    ALREADY_CARD_TIME = [];
}

function findMax(area){
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
    return obj;
}

/*
 选择去区域回放的时候,自动显示选择的区域
*/
function showThisArea(id) {
    if(!ALL_ZONE[id]){
        return;
    }
    MY_MAP.addZone(ALL_ZONE[id]);
    var area_list = ALL_ZONE[id]["area_list"][0]["area"];
    var camera = findMax(area_list);
    MY_MAP.setCameraPosition(camera['x'],camera['y'],0,0,0,camera['z']);
}

/*
 区域切换事件
*/
$("#search_area").change(function () {
    if(LAST_AREA_ID){
        MY_MAP.removeZone(LAST_AREA_ID);
    }
    var area_id = $(this).val();
    showThisArea(area_id);
    LAST_AREA_ID = area_id;
});

/*
 切换地图
*/
$("#floor_select").change(function () {
    var floor_id = $("#floor_select").val();
    if(FLOOR_DATA[floor_id].floor_3d_file =="0"){
        HG_MESSAGE("没有相关地图文件，无法切换");
        $("#floor_select").val(FLOOR_ID);
        return;
    }
    if (PLAY_TIMER){
        handleChangeMap();
    }
    resetMap();
    FLOOR_ID = floor_id;
    SCENE_ID = FLOOR_DATA[FLOOR_ID].scene_id;
    BUILDING_ID = FLOOR_DATA[FLOOR_ID].building_id;
    MY_MAP.changeScene(AJAX_URL + FLOOR_DATA[FLOOR_ID].file_3d_path);
    IS_CHANGE_MAP = true;
});

/*
 点击回放按钮，开始查询数据，并播放历史数据
*/
$("#to_search_history").click(function (e) {
    e.preventDefault();
    resetMap();
    //获得查询历史数据的开始和结束时间戳，并将时间戳转为毫秒为单位
    START_SEARCH_TIME_STAMP = getSearchStartTimeStamp(true) * 1000;
    END_SEARCH_TIME_STAMP   = getSearchEndTimeStamp(true) * 1000;
    ALL_CARD_TO_SEARCH = [];
    ALL_AREA_TO_SEARCH = [];
    //检查输入参数是否合法
    if(START_SEARCH_TIME_STAMP>END_SEARCH_TIME_STAMP){
        HG_MESSAGE("起始时间应小于结束时间");
        return;
    }

    if(!START_SEARCH_TIME_STAMP||!END_SEARCH_TIME_STAMP){
        HG_MESSAGE("请输入时间范围");
        return;
    }

    //检查是否根据现有区域查询，如果是，将选中的区域id加入查询条件
    if (parseInt($("#search_area").val())){
        ALL_AREA_TO_SEARCH.push(parseInt($("#search_area").val()));
        ALL_SEARCH_AREA_STRING = ALL_AREA_TO_SEARCH.join(",");
    }else {
        ALL_SEARCH_AREA_STRING = undefined;
    }

    for(var x in ALL_AREA_TO_SEARCH){
        showThisArea(ALL_AREA_TO_SEARCH[x]);
    }

    //检查查询条件是否满足条件
    if (ALL_AREA_TO_SEARCH.length == 0){
        HG_MESSAGE("请输入查询范围");
        return;
    }
    //第一次查询数据的时间戳，和当前播放的其实时间戳
    GET_DATA_TIME_STAMP = START_SEARCH_TIME_STAMP;
    NOW_TIME_STAMP      = START_SEARCH_TIME_STAMP;

    IS_CHANGE_MAP = false;
    POST_CHECK_CODE = parseInt(Math.random() * 1000);
    //获得历史数据
    getHistoryData(START_SEARCH_TIME_STAMP, ALL_SEARCH_CARD_STRING, ALL_SEARCH_AREA_STRING, SEARCH_DRAW_AREA, END_SEARCH_TIME_STAMP);

    // //如果是正在播放轨迹的途中，点击了回放按钮，需要初始化以下变量，并重置地图，重新开始播放
    if (HISTORY_DATA != undefined){
        HISTORY_DATA = [];
        UPDATE_DATA  = [];
        DATA_POINTER   = 0;
        clearInterval(PLAY_TIMER);
        for(var x in ALL_AREA_TO_SEARCH){
            showThisArea(ALL_AREA_TO_SEARCH[x]);
        }
    }
});

/*
 回到默认中心
*/
$("#back_origin").click(function () {
   MY_MAP.goBackToCenter();
});