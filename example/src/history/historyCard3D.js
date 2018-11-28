var MY_MAP;//地图对象
var SCENE_ID;//场景id
var BUILDING_ID;//建筑id
var FLOOR_ID;//楼层id
var ALL_CARD_TO_SEARCH = [];//所有查询历史轨迹的卡
var ALL_SEARCH_CARD_STRING;//所有查询历史轨迹的卡的字符串
var ALL_AREA_TO_SEARCH = [];//所有要查询的区域ID
var ALL_SEARCH_AREA_STRING = undefined;//由区域ID组成的字符串
var SEARCH_DRAW_AREA = undefined;//查询的绘制区域的xmin,ymin.xmax,ymax;
var ALL_ZONE = {};//所有区域的信息
var ALREADY_CARD = [];//所有卡号
var ALREADY_CARD_TIME = [];//给所有卡绑上时间属性,每收到后台信息的时候更新
var ALL_BUILDING = [];//获取所有的建筑
var ALL_FLOOR = [];//获取所有的楼层
var IS_HISTORY = true;
var CARD_MODEL = false;
var IS_CHANGE_MAP = false;
var TIP_CARD = undefined; //用于记录点击的定位卡,方便清除定位卡提示框
var MOVING_CACHE_TIME = 2;
var SCENE_CARD_HISTORY_DATA,VIDEO_HISTORY_DATA;

/*
 初始执行
*/
$(function () {
    getSystemConfig();
    initDataInput();
    initTimeInput();
    setInterval(removeOldCard, 4100);
});

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
            initScene();
        })
}

/*
 关闭卡号详细信息弹窗
*/
function closeCardTip() {
    if(TIP_CARD ){
        $("#panel_card_info").hide();
        TIP_CARD = undefined;
    }
}

/*
 打开卡号详细信息弹窗
*/
function writeCardInfo(id,x,y,z) {
    var html =  "<i class='glyphicon glyphicon-remove'></i><p>卡号：" + id + "</p>" +
        "<p id='panel_card_info_position'>坐标：" + parseFloat(x).toFixed(2) + "，" +
        parseFloat(y).toFixed(2) + "，" +
        parseFloat(z).toFixed(2) + "</p>";
    $("#panel_card_info").css({"left":-1000,"top":-1000}).show();
    $("#panel_card_info>div").html(html);
}
/*
 获取场景地图
*/
function initScene() {
    //卡号情况下使用默认地图文件
    var url = AJAX_URL + "/position_sdk/App/Common/MapFile/basic.json";
    //初始化设置
    var init_val = {
        scene_url: url,
        track_height:0.07,//轨迹高度
        dom_element: "canvas_3d",//使用的html容器id号
        camera_model_patrol_dist:20,//配置巡视卡号的摄像机高度
        track_length: 500, //轨迹最大长度
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
            if (CARD_MODEL) {
                showAllZone(FLOOR_ID);
            } else {
                getArea($("#select_floor").val());
            }
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
 得到所有的建筑
*/
(function getAllBuild() {
    //调用得到建筑接口
    HG_AJAX("/position_sdk/ModularBuilding/Building/getBuilding",{},'post',function (data) {
        if (data.type == 1){
            var data = data.result;
            for(var i in data){
                var id = data[i].id;
                var obj = {
                    id:id,
                    name:data[i].name,
                    scene_id:data[i].scene_id,
                    scene_name:data[i].scene_name
                };
                ALL_BUILDING[id] = obj;
            }
        }
    });
})();

/*
 得到所有的楼层
*/
(function getAllFloor() {
    HG_AJAX("/position_sdk/ModularFloor/Floor/getFloor",{},'post',function (data) {
        if (data.type == 1){
            var data = data.result;
            for(var i in data){
                var id = data[i].id;
                var obj = {
                    id:id,
                    name:data[i].name,
                    building_id:data[i].building_id,
                    floor_3d_file:data[i].floor_3d_file,
                    file_3d_path:data[i].file_3d_path
                };
                ALL_FLOOR[id] = obj;
            }
        }
    });
})();

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
            $("#search_area").val(null);
        } else {
            HG_MESSAGE("获取区域失败");
        }
    });
}

/*
 获取并显示所有区域
*/
function showAllZone(floor_id){
    HG_AJAX("/position_sdk/ModularArea/Area/getArea", {floor_id: floor_id},"post",function (data) {
        if (data.type == 1) {
            var result = data.result;
            $(result).each(function () {
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
                var zone = {
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
                MY_MAP.addZone(zone);
            });
            if ($("#is_show_area")[0].checked){
                MY_MAP.showAllZone();
            }else {
                MY_MAP.hideAllZone();
            }
        }else{
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
        MY_MAP.setCameraPosition( parseFloat(x), parseFloat(y), parseFloat(card_relative_z),0,-3,10);
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

/*
 选择去区域回放的时候,自动显示选择的区域
*/
function showThisArea(id) {
    MY_MAP.addZone(ALL_ZONE[id]);
}

/*
 输入卡号，模糊查询相关的卡
*/
$("#search_card_id").keyup(function (e) {
    if (e.keyCode == 13) {
        $("#button_history_card_sure").click();
        return;
    }
    var flag = parseInt($(this).val());
    if(!flag){
        $("#search_card_list").html("");
        $("#search_card_list").addClass("hide");
        return;
    }
    HG_AJAX('/position_sdk/ModularHistory/History/getHistoryList',{
        flag:flag
    },"post",function (data) {
        if(data.type == 1){
            var data = data.result;
            var html = "";
            for(var i in data){
                var card_id = data[i].card_id;
                html+= '<button type="button" class="list-group-item search_card" data-id="'+card_id+'">'+card_id+'</button>';
            }
            $("#search_card_list").html(html);
            $("#search_card_list").removeClass("hide")
        }
    })
});

/*
 搜索按钮点击事件
*/
$("#search_card_list").on("click",".search_card",function () {
    var card = $(this).data("id");
    $("#search_card_id").val(card);
    $("#search_card_list").html("");
    $("#search_card_list").addClass("hide")
});

/*
 点击列表中的某一项，立即显示该历史轨迹
*/
$("#button_history_card_sure").click(function () {
    $("#button_history_list").hide();
    $("#search_card_list").html("");
    $("#search_card_list").addClass("hide");
    var search_condition = checkSearchCondition();
    if (search_condition == undefined) return;
    SCENE_CARD_HISTORY_DATA = undefined;
    VIDEO_HISTORY_DATA      = undefined;
    getSceneByCard(search_condition.card_id, search_condition.start_time, search_condition.end_time);
    getVideoByCard(search_condition.card_id, search_condition.start_time, search_condition.end_time);
});

/*
 检测搜索条件是否合理
*/
function checkSearchCondition() {
    var card_id = $("#search_card_id").val();
    if(!card_id){
        HG_MESSAGE('请输入查询卡号！');
        return;
    }
    if(!/^[0-9]*$/.test(card_id)){
        HG_MESSAGE('卡号只能为数字！');
        return;
    }
    var start_time = getSearchStartTimeStamp(IS_HISTORY);
    var end_time = getSearchEndTimeStamp(IS_HISTORY);
    if(!start_time || !end_time){
        HG_MESSAGE('请输入查询时间范围！');
        return;
    }
    return {card_id:card_id, start_time:start_time, end_time:end_time}
}

/*
 根据卡号，开始时间，结束时间查询所有场景的信息，列表显示
*/
function getSceneByCard(card_id, start_time, end_time) {
    HG_AJAX("/position_sdk/ModularHistory/History/getCardFloorDataTime",{
        start_time:start_time,
        end_time:end_time,
        card_id:card_id
    },'post',function (data) {
        if(data.type == 1){
            var data = data.result;
            SCENE_CARD_HISTORY_DATA = data;
            if (SCENE_CARD_HISTORY_DATA && VIDEO_HISTORY_DATA){
                disPlaySearchHistoryData(card_id);
            }
        }else{
            HG_MESSAGE(data.result);
        }
    })
}

/*
 根据卡号，开始时间，结束时间查询存在摄像头数据的信息
*/
function getVideoByCard(card_id, start_time, end_time){
    HG_AJAX("/position_sdk/ModularVideo/Equip/getNVRFile",{card_id:card_id, time_begin:start_time, time_end:end_time},"post",function (data) {
        if(data.type == 1){
            data = data.result;
            VIDEO_HISTORY_DATA = data;
            if (SCENE_CARD_HISTORY_DATA && VIDEO_HISTORY_DATA){
                disPlaySearchHistoryData(card_id);
            }
        }else{
            HG_MESSAGE(data.result);
        }
    })
}

/*
 显示搜索出来的历史信息
*/
function disPlaySearchHistoryData(search_card_id){
    var html = '';
    for(var i in SCENE_CARD_HISTORY_DATA){
        var start = SCENE_CARD_HISTORY_DATA[i].str,end = SCENE_CARD_HISTORY_DATA[i].end,floor_id = SCENE_CARD_HISTORY_DATA[i].floor_id;
        if(!ALL_FLOOR[floor_id] || !ALL_BUILDING[ALL_FLOOR[floor_id].building_id]){
            continue
        }
        html += '<tr>'+
            '<td>'+unixToDate(start).substring(0,16)+' — '+unixToDate(end).substring(0,16)+'</td>'+
            '<td>'+ALL_BUILDING[ALL_FLOOR[floor_id].building_id].scene_name+'</td>'+
            '<td>'+ALL_BUILDING[ALL_FLOOR[floor_id].building_id].name+'</td>'+
            '<td>'+ALL_FLOOR[floor_id].name+'</td>'+
            '<td>'+
            '<i class="glyphicon glyphicon-eye-open" data-scene="'+ALL_BUILDING[ALL_FLOOR[floor_id].building_id].scene_id+'" data-build="'+ALL_FLOOR[floor_id].building_id+'" data-floor="'+floor_id+'" data-start="'+start+'" data-end="'+end+'" data-card="'+search_card_id+'"></i>'+
            '</td>'+ '</tr>';
    }

    if (VIDEO_HISTORY_DATA.length < 1){
        HG_MESSAGE("该时间段没有视频数据！");
    }
    for(var i in VIDEO_HISTORY_DATA){
        var start = VIDEO_HISTORY_DATA[i].start;
        var end = VIDEO_HISTORY_DATA[i].end;
        var floor_id = VIDEO_HISTORY_DATA[i].floor_id;
        var card_id  = VIDEO_HISTORY_DATA[i].card_id;
        html += '<tr>'+
            '<td>'+unixToDate(start).substring(0,16)+' — '+unixToDate(end).substring(0,16)+'</td>'+
            '<td>'+ALL_BUILDING[ALL_FLOOR[floor_id].building_id].scene_name+'</td>'+
            '<td>'+ALL_BUILDING[ALL_FLOOR[floor_id].building_id].name+'</td>'+
            '<td>'+ALL_FLOOR[floor_id].name+'</td>'+
            '<td>'+
            '<i class="go_to_history_video glyphicon glyphicon-film" data-scene="'+ALL_BUILDING[ALL_FLOOR[floor_id].building_id].scene_id+'" data-build="'+ALL_FLOOR[floor_id].building_id+'" data-floor="'+floor_id+'" data-start="'+start+'" data-end="'+end+'" data-card="'+card_id+'"></i>'+
            '</td>'+ '</tr>';
    }
    $("#table_history_card tbody").html(html);
    $("#table_history_card").show();
}

/*
 点击眼睛图标，开始回放
*/
$('#table_history_card').on('click','.glyphicon-eye-open',function (e) {
    e.preventDefault();
    resetMap();
    CARD_MODEL = true;
    SCENE_ID = $(this).data('scene'); //场景id
    BUILDING_ID = $(this).data('build'); //建筑id
    FLOOR_ID = $(this).data('floor'); //楼层id
    if(ALL_FLOOR[FLOOR_ID].floor_3d_file == "0"){
        HG_MESSAGE("该楼层没有地图文件，无法切换地图以及回放历史数据");
        return;
    }
    MY_MAP.changeScene(AJAX_URL + ALL_FLOOR[FLOOR_ID].file_3d_path);

    PLAY_MODE = "data";
    if ($("#history_video_container").length > 0){
        $(".hg_video_container .glyphicon-remove-circle").click();
    }
    if (!THE_PLAY_SLIDER.slider("enable")){
        THE_PLAY_SLIDER.slider("disable")
    }

    //获得查询历史数据的开始和结束时间戳，并将时间戳转为毫秒为单位
    START_SEARCH_TIME_STAMP = parseInt($(this).data('start')) * 1000;
    END_SEARCH_TIME_STAMP   = parseInt($(this).data('end')) * 1000;

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
    $("#table_history_card").find("span").click();
    //当前只是卡号查询，设定一些查询条件，手动置空区域相关的条件
    ALL_CARD_TO_SEARCH.push(parseInt($(this).data("card")));
    ALL_SEARCH_CARD_STRING = ALL_CARD_TO_SEARCH.join(",");
    //第一次查询数据的时间戳，和当前播放的其实时间戳
    GET_DATA_TIME_STAMP = START_SEARCH_TIME_STAMP;
    NOW_TIME_STAMP      = START_SEARCH_TIME_STAMP;
    POST_CHECK_CODE = parseInt(Math.random() * 1000);
    AUTO_PLAY = true;
    PLAY_TIMES = 1;
    MAX_POST_TIME = 30;
    $("#displayPlayRate").html("X&nbsp" + PLAY_TIMES);
    //获得历史数据
    getHistoryData(START_SEARCH_TIME_STAMP, ALL_SEARCH_CARD_STRING, ALL_SEARCH_AREA_STRING, SEARCH_DRAW_AREA, END_SEARCH_TIME_STAMP);

    //如果是正在播放轨迹的途中，点击了回放按钮，需要初始化以下变量，并重置地图，重新开始播放
    if (HISTORY_DATA != undefined){
        HISTORY_DATA = [];
        UPDATE_DATA  = [];
        DATA_POINTER  = 0;
        clearInterval(PLAY_TIMER);
        resetMap();
    }
});

/*
  点击录像回放，回访历史轨迹和录像
*/
$("#table_history_card").on("click",".go_to_history_video",function (e) {
    e.preventDefault();
    resetMap();
    CARD_MODEL = true;
    SCENE_ID = $(this).data('scene'); //场景id
    BUILDING_ID = $(this).data('build'); //建筑id
    FLOOR_ID = $(this).data('floor'); //楼层id
    if(ALL_FLOOR[FLOOR_ID].floor_3d_file == "0"){
        HG_MESSAGE("该楼层没有地图文件，无法切换地图以及回放历史数据");
        return;
    }
    MY_MAP.changeScene(AJAX_URL + ALL_FLOOR[FLOOR_ID].file_3d_path);

    PLAY_MODE = "video";
    if (THE_PLAY_SLIDER.slider("isEnabled")){
        THE_PLAY_SLIDER.slider("disable")
    }
    //获得查询历史数据的开始和结束时间戳，并将时间戳转为毫秒为单位
    START_SEARCH_TIME_STAMP = parseInt($(this).data('start')) * 1000;
    END_SEARCH_TIME_STAMP   = parseInt($(this).data('end')) * 1000;

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
    $("#table_history_card").find("span").click();

    //当前只是卡号查询，设定一些查询条件，手动置空区域相关的条件
    ALL_CARD_TO_SEARCH.push(parseInt($(this).data("card")));
    ALL_SEARCH_CARD_STRING = ALL_CARD_TO_SEARCH.join(",");

    //第一次查询数据的时间戳，和当前播放的其实时间戳
    GET_DATA_TIME_STAMP = START_SEARCH_TIME_STAMP;
    NOW_TIME_STAMP      = START_SEARCH_TIME_STAMP;
    POST_CHECK_CODE = parseInt(Math.random() * 1000);
    AUTO_PLAY = false;
    IS_SKIP_BLANK_TIME = false;
    PLAY_TIMES = 1;
    MAX_POST_TIME = 120;
    $("#displayPlayRate").html("X&nbsp" + PLAY_TIMES);

    //获得历史数据
    getHistoryData(START_SEARCH_TIME_STAMP, ALL_SEARCH_CARD_STRING, ALL_SEARCH_AREA_STRING, SEARCH_DRAW_AREA, END_SEARCH_TIME_STAMP);

    if (VIDEO_OBJ){
        $(".hg_video_container_header .glyphicon").click();
    }
    playHistoryVideo(parseInt($(this).data("card")), parseInt($(this).data('start')), parseInt($(this).data('end')));

    // //如果是正在播放轨迹的途中，点击了回放按钮，需要初始化以下变量，并重置地图，重新开始播放
    if (HISTORY_DATA != undefined){
        HISTORY_DATA = [];
        UPDATE_DATA  = [];
        DATA_POINTER  = 0;
        clearInterval(PLAY_TIMER);
    }
});

/*
 打开或者关闭卡号回放列表
*/
$("#table_history_card").find("span").click(function () {
    $("#table_history_card").slideUp(function () {
        $("#button_history_list").show();
    });
});

/*
 打开或者关闭卡号回放列表
*/
$("#button_history_list").find("button").click(function () {
    $("#button_history_list").hide();
    $("#table_history_card").slideDown();
});

/*
 回到默认中心
*/
$("#back_origin").click(function () {
   MY_MAP.goBackToCenter();
});

/*
 是否显示区域的点击事件处理
*/
$("#is_show_area").change(function () {
    if ($(this)[0].checked && FLOOR_ID){
        MY_MAP.showAllZone();
    }else {
        MY_MAP.hideAllZone();
    }
});