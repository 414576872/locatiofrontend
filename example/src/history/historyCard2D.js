var SCENE_ID;//场景id
var BUILDING_ID;//建筑id
var FLOOR_ID;//楼层id
var MY_MAP;//地图对象
var ALL_CARD_TO_SEARCH = [];//所有查询历史轨迹的卡
var ALL_SEARCH_CARD_STRING;//所有查询历史轨迹的卡的字符串
var ALL_ZONE = {};//所有区域
var ALREADY_CARD = [];//已显示的卡
var ALREADY_CARD_TIME = [];//给所有卡绑上时间属性,每收到后台信息的时候更新
var ALL_BUILDING = [];//存储所有的建筑
var ALL_FLOOR = [];//存储所有的楼层
var IS_HISTORY = true;
var ALL_SEARCH_AREA_STRING = undefined;
var SEARCH_DRAW_AREA = undefined;
var IS_CHANGE_MAP = false;
var CENTER;//初始地图视点
var ZOOM;//初始地图缩放比
var ZOOM_CHANGE_VALUE;//鼠标改变的地图缩放比
var TEXT_CHANGE_VALUE;
var NOW_DATA = [];
var HEAT_FEATURE = {};//热力图
var IS_MOVE_VIEW = false;
var SCENE_CARD_HISTORY_DATA,VIDEO_HISTORY_DATA;
/*
 初始化时间
*/
initDataInput();
initTimeInput();

/*
 得到所有的建筑
*/
(function getAllBuild() {
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
                    floor_2d_file:data[i].floor_2d_file,
                    file_2d_path:data[i].file_2d_path,
                    floor_scaling_ratio:data[i].floor_scaling_ratio,
                    extend:[data[i].coordinate_left,data[i].coordinate_down,data[i].coordinate_right,data[i].coordinate_upper],
                    postfix:data[i].file_2d_postfix,
                    obj: mapAutomaticSetting(data[i].floor_scaling_ratio,data[i].origin_x,data[i].origin_y,data[i].drop_multiple,[data[i].coordinate_left,data[i].coordinate_down,data[i].coordinate_right,data[i].coordinate_upper],"map")
                };
                ALL_FLOOR[id] = obj;
            }
        }
    });
})();

/*
 获取并显示所有区域
*/
function showAllZone( floor_id) {
    MY_MAP.removeAllZone();
    HG_AJAX("/position_sdk/ModularArea/Area/getArea",{floor_id: floor_id},'post',function (data) {
        if(data.type == 1){
            var result = data.result;
            $(result).each(function () {
                var area = this.area.split(" ");
                var area_trans = [];
                for (var i in area) {
                    var xy = area[i].split(",");
                    xy[0] = parseFloat(xy[0]);
                    xy[1] = parseFloat(xy[1]);
                    area_trans.push(xy);
                }
                MY_MAP.addZone(area_trans, this.id, this.name, this.area_style);
            });
        }else{
            HG_MESSAGE("获取区域失败");
        }
    });
}

/*
 初始化地图
*/
function mapInit() {
    //卡号情况下使用默认地图文件
    var is_show = $("#loading_img").css("display");
    if(is_show == "none"){
        $("#loading_img").show();
    }
    var url = AJAX_URL + "/position_sdk/App/Common/MapFile/basic.kml";
    var map_zoom =38;
    var extent = [-100,-100,100,100];
    MY_MAP = new HG2DMap.map(url, "map", [0, 0], map_zoom,'kml',[],{extent:extent,zoom_factor:1.5,animation_enable:true,animation_cache_time:MOVING_CACHE_TIME});
    //地图加载进度
    MY_MAP.on('progress',function (e) {
        var progress = e.progress*100;
        $(".progress_bar p").html(progress.toFixed(1)+"%");
        $(".progress_bar_top").css("width",progress+"%");
    });
    MY_MAP.on("loaded",function (e) {
        $("#loading_img").hide();
        CENTER = MY_MAP.getCenter();
        ZOOM = MY_MAP.getZoom();
        getNowZoom();
        MY_MAP.setMapTextScale(TEXT_CHANGE_VALUE);
        MY_MAP.getView().on('change:zoom', function () {
            getNowZoom();
            changeLocation(ZOOM_CHANGE_VALUE,TEXT_CHANGE_VALUE);
            MY_MAP.setMapTextScale(TEXT_CHANGE_VALUE);
        });
        if(FLOOR_ID){
            if ($("#is_show_area")[0].checked){
                showAllZone(FLOOR_ID);
            }
        }
    });
    var my_mouse_postion = new HG2DMap.control.mouse_position();
    var my_scale_line = new HG2DMap.control.scale_line();
    var my_drag_rotate = new HG2DMap.draw.drag_rotate();
    MY_MAP.addInteraction(my_drag_rotate);
    MY_MAP.addControl(my_mouse_postion);
    MY_MAP.addControl(my_scale_line);
}
mapInit();

/*
 当地图的缩放比变化时，计算出地图上的图标需要缩放的比例值
*/
function getNowZoom() {
    var zoom = MY_MAP.getZoom();
    ZOOM_CHANGE_VALUE = 1-(47-parseInt(zoom))*0.06;
    TEXT_CHANGE_VALUE = 1+(parseInt(zoom)-40)*0.06;
    if(ZOOM_CHANGE_VALUE <= 0.1){
        ZOOM_CHANGE_VALUE = 0.1;
    }
    if(TEXT_CHANGE_VALUE <= 0.1){
        ZOOM_CHANGE_VALUE = 0.1;
    }
}

/*
 改变缩放比
*/
function changeLocation(value,text_value) {
    if(value <= 0.2){
        MY_MAP.hideAllCard();
        MY_MAP.clearHeatMap();
        HEAT_FEATURE = {};
        for (var i in ALREADY_CARD){
            HEAT_FEATURE[i] = MY_MAP.addHeatMapPoint(NOW_DATA[i].card_x,NOW_DATA[i].card_y);
        }
    }else {
        MY_MAP.showAllCard();
        MY_MAP.clearHeatMap();
        for (var i in ALREADY_CARD){
            MY_MAP.setCardIcon(i,"img/location.png",{icon_scale:value,text_scale:text_value});
        }
    }
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
 输入卡号后点击确定按钮
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
            var html = '';
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
* 显示搜索出来的历史信息
* */
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
    SCENE_ID = $(this).data('scene'); //场景id
    BUILDING_ID = $(this).data('build'); //建筑id
    FLOOR_ID = $(this).data('floor'); //楼层id
    if(ALL_FLOOR[FLOOR_ID].floor_2d_file == "0"){
        HG_MESSAGE("该楼层没有地图文件，无法切换地图以及回放历史数据");
        return;
    }
    e.preventDefault();
    PLAY_MODE = "data";
    if ($("#history_video_container").length > 0){
        $(".hg_video_container .glyphicon-remove-circle").click();
    }

    if (!THE_PLAY_SLIDER.slider("enable")){
        THE_PLAY_SLIDER.slider("disable")
    }
    MY_MAP.removeControlMeasure();
    MY_MAP.clearMeasureFeature();
    $("#clear_measure_location").hide();
    resetMap();
    var is_show = $("#loading_img").css("display");
    if(is_show == "none"){
        $("#loading_img").show();
    }
    var postfix =  ALL_FLOOR[FLOOR_ID].postfix;
    var format;
    if( postfix  == "kml"){
        format = "kml";
    }else{
        format = "image"
    }
    var extend = ALL_FLOOR[FLOOR_ID].extend;
    var extent = ALL_FLOOR[FLOOR_ID].obj.extent;
    var center = ALL_FLOOR[FLOOR_ID].obj.center;
    var map_zoom = ALL_FLOOR[FLOOR_ID].obj.zoom;
    MY_MAP.changeMap(AJAX_URL+ALL_FLOOR[FLOOR_ID].file_2d_path,center,map_zoom,format,extend,{extent:extent,zoom_factor:1.5,animation_enable:true,animation_cache_time:MOVING_CACHE_TIME});

    CENTER = MY_MAP.getCenter();
    ZOOM = MY_MAP.getZoom();
    IS_MOVE_VIEW = true;
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

    // //如果是正在播放轨迹的途中，点击了回放按钮，需要初始化以下变量，并重置地图，重新开始播放
    if (HISTORY_DATA != undefined){
        HISTORY_DATA = [];
        UPDATE_DATA  = [];
        DATA_POINTER  = 0;
        clearInterval(PLAY_TIMER);
    }
});

/*
  点击录像回放，回访历史轨迹和录像
*/
$("#table_history_card").on("click",".go_to_history_video",function (e) {
    SCENE_ID = $(this).data('scene'); //场景id
    BUILDING_ID = $(this).data('build'); //建筑id
    FLOOR_ID = $(this).data('floor'); //楼层id
    if(ALL_FLOOR[FLOOR_ID].floor_2d_file == "0"){
        HG_MESSAGE("该楼层没有地图文件，无法切换地图以及回放历史数据");
        return;
    }
    e.preventDefault();
    PLAY_MODE = "video";
    if (THE_PLAY_SLIDER.slider("isEnabled")){
        THE_PLAY_SLIDER.slider("disable")
    }
    MY_MAP.removeControlMeasure();
    MY_MAP.clearMeasureFeature();
    $("#clear_measure_location").hide();
    resetMap();
    $("#loading_img").show();
    $('#popup').popover('hide');
    var postfix =  ALL_FLOOR[FLOOR_ID].postfix;
    var format;
    if( postfix  == "kml"){
        format = "kml";
    }else{
        format = "image"
    }
    var extend = ALL_FLOOR[FLOOR_ID].extend;
    var extent = ALL_FLOOR[FLOOR_ID].obj.extent;
    var center = ALL_FLOOR[FLOOR_ID].obj.center;
    var map_zoom = ALL_FLOOR[FLOOR_ID].obj.zoom;
    MY_MAP.changeMap(ALL_FLOOR[FLOOR_ID].file_2d_path,center,map_zoom,format,extend,{extent:extent,zoom_factor:1.5});
    CENTER = MY_MAP.getCenter();
    ZOOM = MY_MAP.getZoom();
    IS_MOVE_VIEW = true;

    //获得查询历史数据的开始和结束时间戳，并将时间戳转为毫秒为单位
    START_SEARCH_TIME_STAMP = parseInt($(this).data('start')) * 1000;
    END_SEARCH_TIME_STAMP   = parseInt($(this).data('end')) * 1000;
    ALL_CARD_TO_SEARCH = [];
    ALL_AREA_TO_SEARCH = [];

    //检查输入参数是否合法
    if(START_SEARCH_TIME_STAMP>END_SEARCH_TIME_STAMP){
        HG_MESSAGE("开始时间大于结束时间！请修改！");
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
 回放的时候,处理定位数据
*/
function handleLocationData(card_id, x, y, z) {
    if (IS_MOVE_VIEW){
        MY_MAP.setCenter(x,y);
        IS_MOVE_VIEW = false
    }
    var time = Date.parse(new Date());
    ALREADY_CARD_TIME[card_id] = time;
    if ( !ALREADY_CARD[card_id]) {
        MY_MAP.addCardInfo(card_id, "./img/location.png", x, y,"",{icon_scale:ZOOM_CHANGE_VALUE,text_scale:TEXT_CHANGE_VALUE});
        NOW_DATA[card_id] = {
          card_x:x,
          card_y:y
        };
        var color_value = 360 * Math.random();
        MY_MAP.addTrack(card_id,500,"HSL("+color_value+",100%,40%)");
        ALREADY_CARD[card_id] = true;
        if(ZOOM_CHANGE_VALUE <= 0.2){
            HEAT_FEATURE[card_id] = MY_MAP.addHeatMapPoint(x,y);
            MY_MAP.hideAllCard();
        }
    } else {
        MY_MAP.setCardCoordinate(card_id, x, y);
        NOW_DATA[card_id] = {
            card_x:x,
            card_y:y
        };
        if(ZOOM_CHANGE_VALUE <= 0.2){
            if(HEAT_FEATURE[card_id]){
                MY_MAP.updateHeatMapPoint(HEAT_FEATURE[card_id],x,y);
            }
        }
    }
}

/*
 重置地图
*/
function resetMap() {
    MY_MAP.removeControlMeasure();
    MY_MAP.clearMeasureFeature();
    $("#clear_measure_location").hide();
    MY_MAP.reset();
    ALREADY_CARD = [];
    ALREADY_CARD_TIME = [];
    NOW_DATA = [];
}

/*
 重置地图（拖动进度条专用）
*/
function resetMapProgress() {
    MY_MAP.removeAllCard();
    MY_MAP.removeAllTrack();
    MY_MAP.removeControlMeasure();
    MY_MAP.clearMeasureFeature();
    $("#clear_measure_location").hide();
    ALREADY_CARD = [];
    ALREADY_CARD_TIME = [];
    NOW_DATA = [];
}

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
 测距工具
*/
$("#measure_location").click(function () {
    //调用2d地图SDK中的删除测量工具
    MY_MAP.removeControlMeasure();
    $(this).attr("src","img/mapStaffActive.png");
    $("#clear_measure_location").show();
    //调用2d地图SDK中的添加测量工具
    MY_MAP.addControlMeasure("line",{drawend:drawEnd});
    function drawEnd() {
        //调用2d地图SDK中的删除测量工具
        MY_MAP.removeControlMeasure();
        $("#clear_measure_location").show();
        $("#measure_location").attr("src","img/mapStaff.png");
    }
});

/*
 清空测量记录
*/
$("#clear_measure_location").click(function () {
    //调用2d地图SDK中的清除已测量的记录
    MY_MAP.clearMeasureFeature();
    MY_MAP.removeControlMeasure();
    $("#clear_measure_location").hide();
    $("#measure_location").attr("src","img/mapStaff.png");
});

/*
 回到默认中心
*/
$("#back_origin").click(function () {
    //调用2d地图SDK中设置地图中心视点
    MY_MAP.setCenter(CENTER[0],CENTER[1]);
    //调用2d地图SDK中设置地图缩放比
    MY_MAP.setZoom(ZOOM);
});

/*
 旋转90°
*/
$("#rotate").click(function () {
    var rotation =MY_MAP.getView().getRotation() + Math.PI/2;
    if(Math.abs(rotation - 6.28318530717) < 0.001){
        rotation = 0;
    }
    MY_MAP.getView().setRotation(rotation);
});

/*
 检查URL是否带有参数，判断是否是报警信息跳转
*/
function checkURLPara() {
    console.log(window.location.href)
}

/*
 是否显示区域的点击事件处理
*/
$("#is_show_area").change(function () {
    MY_MAP.removeAllZone();
    if ($(this)[0].checked && FLOOR_ID){
        showAllZone(FLOOR_ID);
    }
});

/*
 按ESC取消测距
*/
$(document).keydown(function (e) {
    if (e.which === 27) {
        MY_MAP.removeControlMeasure();
        $("#measure_location").attr("src","img/mapStaff.png");
    }
});
