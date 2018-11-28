var SCENE_ID;//场景id
var BUILDING_ID;//建筑id
var FLOOR_ID;//楼层id
var MY_MAP;//地图对象
var FLOOR_DATA = [];//楼层信息,主要用来获取地图初始缩放比列,以及判断该楼层是否存在地图文件
var MAP_DRAW = new HG2DMap.draw.rectangle();
var ALL_CARD_TO_SEARCH = [];//所有查询历史轨迹的卡
var ALL_SEARCH_CARD_STRING;//所有查询历史轨迹的卡的字符串
var ALL_AREA_TO_SEARCH = [];//所有要查询的区域ID
var ALL_SEARCH_AREA_STRING;//由区域ID组成的字符串
var DRAW_AREA = [];//绘制区域的xmin,ymin.xmax,ymax;
var SEARCH_DRAW_AREA = [];//查询的绘制区域的xmin,ymin.xmax,ymax;
var DRAW_FEATURE;//绘制的区域
var ALL_ZONE = {};//所有区域
var ALREADY_CARD = [];//已显示的卡
var ALREADY_CARD_TIME = [];//给所有卡绑上时间属性,每收到后台信息的时候更新
var IS_HISTORY= true;//调用时间初始化方法，轨迹回放的平面视图和立体视图特殊处理
var IS_CHANGE_MAP = false ;//播放过程中，是否刚刚切换了地图，如果刚刚切换了地图，之前的请求的返回应该丢弃
var CENTER;//初始地图视点
var ZOOM;//初始地图缩放比
var ZOOM_CHANGE_VALUE;
var TEXT_CHANGE_VALUE;
var NOW_DATA = [];//存储播放的数据
var HEAT_FEATURE = {};//热力图
var CONTROL_MEASURE = false;//初始化测距绘制对象

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
            if(!FLOOR_DATA[id] || FLOOR_DATA[id].floor_2d_file =="0"){
                HG_MESSAGE("没有相关地图文件，将显示默认地图（功能无法实现）");
                var url = AJAX_URL + "/position_sdk/App/Common/MapFile/basic.kml";
                mapInit(url,"38",[],[0,0],[-100,-100,100,100]);
                FLOOR_ID = id;
                SCENE_ID = undefined;
                BUILDING_ID = undefined;
            }else {
                var floor_data = FLOOR_DATA[id];
                var extend = [floor_data.coordinate_left, floor_data.coordinate_down, floor_data.coordinate_right, floor_data.coordinate_upper];
                var url = AJAX_URL + floor_data.file_2d_path;
                //调用计算自动缩放比
                var obj = mapAutomaticSetting(floor_data.floor_scaling_ratio, floor_data.origin_x, floor_data.origin_y, floor_data.drop_multiple, extend, "map");
                mapInit(url,obj.zoom,extend,obj.center,obj.extent);
                FLOOR_ID = id;
                SCENE_ID = FLOOR_DATA[FLOOR_ID].scene_id;
                BUILDING_ID = FLOOR_DATA[FLOOR_ID].building_id;
            }
        }else {
            HG_MESSAGE(data.result);
        }
    });
}

/*
 获取区域数据,写入到区域列表和区域的选单
*/
function getArea(floor_id) {
    ALL_ZONE = {};
    HG_AJAX("/position_sdk/ModularArea/Area/getArea",{floor_id: floor_id},'post',function (data) {
        if (data.type == 1) {
            var result = data.result;
            var options = "";
            $(result).each(function () {
                var area = this.area.split(" ");
                var area_trans = [];
                for (var i in area) {
                    var xy = area[i].split(",");
                    xy[0] = parseFloat(xy[0]);
                    xy[1] = parseFloat(xy[1]);
                    area_trans.push(xy);
                }
                ALL_ZONE[this.id] = {
                    area: area_trans,
                    name: this.name,
                    color: this.area_style
                };
                options += "<option value='" + this.id + "'>" + this.name + "</option>";
            });
            $("#search_area").html(options);
            $("#search_area").val(null);
        } else {
            HG_MESSAGE("获取区域失败");
        }
    })
}

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
 初始化地图
*/
function mapInit(url,map_zoom,extend,center,extent) {
    var is_show = $("#loading_img").css("display");
    if(is_show == "none"){
        $("#loading_img").show();
    }
    if(url.substr(url.length-3,3) == "kml"){
        //地图为kml文件，调用2d地图SDK中的new HG2DMap.map,实例化一个kml地图对象
        MY_MAP = new HG2DMap.map(url+"?time="+Math.random(), "map",center, map_zoom,"kml",[],{extent:extent,zoom_factor:1.5,animation_enable:true,animation_cache_time:MOVING_CACHE_TIME});
    }else {
        //地图为图片文件，调用2d地图SDK中的new HG2DMap.map,实例化一个图片地图对象
        MY_MAP = new HG2DMap.map(url+"?time="+Math.random(), "map",center, map_zoom,"image",extend,{extent:extent,zoom_factor:1.5,animation_enable:true,animation_cache_time:MOVING_CACHE_TIME});
    }
    //地图加载进度
    MY_MAP.on('progress',function (e) {
        var progress = e.progress*100;
        $(".progress_bar p").html(progress.toFixed(1)+"%");
        $(".progress_bar_top").css("width",progress+"%");
    });
    MY_MAP.on('loaded',function () {
        $("#loading_img").hide();
        if(FLOOR_ID){
            CENTER = MY_MAP.getCenter();
            ZOOM = MY_MAP.getZoom();
            getNowZoom();
            MY_MAP.setMapTextScale(TEXT_CHANGE_VALUE);
            getArea(FLOOR_ID);
            MY_MAP.getView().on('change:zoom', function () {
                if(ALREADY_CARD.length){
                    getNowZoom();
                    changeLocation(ZOOM_CHANGE_VALUE,TEXT_CHANGE_VALUE);
                    MY_MAP.setMapTextScale(TEXT_CHANGE_VALUE);
                }
            });
        }
    });
    MAP_DRAW.on("drawend", function (e) {
        DRAW_FEATURE = e.feature;
        MY_MAP.addFeature(DRAW_FEATURE);
        MAP_DRAW.setActive(false);
        //计算绘制区域的xmin,ymin,xmax,ymax
        var points = e.feature.getCoordinates()[0];
        var x_array = [];
        var y_array = [];
        for (var i in points) {
            x_array.push(points[i][0]);
            y_array.push(points[i][1]);
        }
        var x_min = Math.min.apply({}, x_array);
        var x_max = Math.max.apply({}, x_array);
        var y_min = Math.min.apply({}, y_array);
        var y_max = Math.max.apply({}, y_array);

        DRAW_AREA = [];

        DRAW_AREA.push(x_min);
        DRAW_AREA.push(x_max);
        DRAW_AREA.push(y_min);
        DRAW_AREA.push(y_max);
    });
    MAP_DRAW.setActive(false);
    var my_mouse_postion = new HG2DMap.control.mouse_position();
    var my_scale_line = new HG2DMap.control.scale_line();
    var my_drag_rotate = new HG2DMap.draw.drag_rotate();
    MY_MAP.addInteraction(my_drag_rotate);
    MY_MAP.addControl(my_mouse_postion);
    MY_MAP.addControl(my_scale_line);
    MY_MAP.addInteraction(MAP_DRAW);
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
 显示出选择区域回放的当前区域
*/
function showThisArea(id) {
    var areas = MY_MAP.all_area;
    if(areas[id]){
        console.log('存在此区域，不再添加！');
        return;
    }
    MY_MAP.addZone(ALL_ZONE[id].area, id, ALL_ZONE[id].name, ALL_ZONE[id].color);
    moveViewToArea(ALL_ZONE[id].area);
}

/*
 回放的时候,处理定位数据
*/
function handleLocationData(card_id, x, y, z) {
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
 删除长时间没有更新的定位卡模型
*/
function removeOldCard() {
    var now = Date.parse(new Date());
    for (var i in ALREADY_CARD_TIME) {
        if (( now - ALREADY_CARD_TIME[i] ) > 4000) {
            MY_MAP.removeOneCard(i);
            MY_MAP.removeOneTrack(i);
            delete ALREADY_CARD[i];
            delete ALREADY_CARD_TIME[i];
        }
    }
}

/*
 点击回放按钮，开始查询数据，并播放历史数据
*/
$("#to_search_history").click(function (e) {
    e.preventDefault();
    getNowZoom();
    MY_MAP.removeControlMeasure();
    MY_MAP.clearMeasureFeature();
    $("#clear_measure_location").hide();
    resetMap();
    //获得查询历史数据的开始和结束时间戳，并将时间戳转为毫秒为单位
    START_SEARCH_TIME_STAMP = getSearchStartTimeStamp(IS_HISTORY) * 1000;
    END_SEARCH_TIME_STAMP   = getSearchEndTimeStamp(IS_HISTORY) * 1000;
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
    if ((ALL_AREA_TO_SEARCH.length == 0) && (DRAW_AREA.length == 0)){
        HG_MESSAGE("请输入查询范围");
        return;
    }

    //设定查询条件
    if (DRAW_AREA.length > 0){
        SEARCH_DRAW_AREA       = DRAW_AREA;
    }else {
        SEARCH_DRAW_AREA = undefined;
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
        resetMap();
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
    if (DRAW_FEATURE) {
        MY_MAP.addFeature(DRAW_FEATURE);
    }
}

/*
 拖动进度条后单独重置地图（专用于拖动进度条后的处理）
*/
function resetMapProgress() {
    MY_MAP.removeControlMeasure();
    MY_MAP.clearMeasureFeature();
    $("#clear_measure_location").hide();
    MY_MAP.reset();
    ALREADY_CARD = [];
    ALREADY_CARD_TIME = [];
    NOW_DATA = [];
    if (DRAW_FEATURE) {
        MY_MAP.addFeature(DRAW_FEATURE);
    }
}

/*
 初始执行
*/
$(function () {
    //初始化查询的时间输入框
    initDataInput();
    initTimeInput();
    //获取场景,自动触发获取建筑获取楼层,自动初始化场景,获取区域
    getAllFloor();
    //每过4秒检测是否有定位卡没有数据更新,若没有更新则删除此卡
    setInterval(removeOldCard, 4100);
});


/*
 选择了已有区域立即于地图上显示区域
*/
$("#search_area").change(function () {
    var id = $(this).val();
    MY_MAP.removeAllZone();
    if (id) {
        MY_MAP.addZone(ALL_ZONE[id].area, id, ALL_ZONE[id].name, ALL_ZONE[id].color);
        moveViewToArea(ALL_ZONE[id].area);
    }
});


/*
 切换地图的点击事件
*/
$("#floor_select").change(function () {
    var floor_id = $("#floor_select").val();
    if(FLOOR_DATA[floor_id].floor_2d_file =="0"){
        HG_MESSAGE("没有相关地图文件，无法切换");
        $("#floor_select").val(FLOOR_ID);
        return;
    }
    IS_CHANGE_MAP = true;
    if (PLAY_TIMER){
        handleChangeMap();
    }
    MY_MAP.reset();
    ALREADY_CARD = [];
    ALREADY_CARD_TIME = [];
    MY_MAP.removeControlMeasure();
    MY_MAP.clearMeasureFeature();
    $("#clear_measure_location").hide();
    FLOOR_ID = floor_id;
    SCENE_ID = FLOOR_DATA[FLOOR_ID].scene_id;
    BUILDING_ID = FLOOR_DATA[FLOOR_ID].building_id;

    var postfix =  FLOOR_DATA[FLOOR_ID].file_2d_postfix;
    var format;
    if( postfix  == "kml"){
        format = "kml";
    }else{
        format = "image"
    }
    var extend = [FLOOR_DATA[FLOOR_ID].coordinate_left,FLOOR_DATA[FLOOR_ID].coordinate_down,FLOOR_DATA[FLOOR_ID].coordinate_right,FLOOR_DATA[FLOOR_ID].coordinate_upper];
    //调用计算自动缩放比
    var obj = mapAutomaticSetting(FLOOR_DATA[FLOOR_ID].floor_scaling_ratio,FLOOR_DATA[FLOOR_ID].origin_x,FLOOR_DATA[FLOOR_ID].origin_y,FLOOR_DATA[FLOOR_ID].drop_multiple,extend,"map");
    var extent = obj.extent;
    var center = obj.center;
    var map_zoom = obj.zoom;

    //显示地图加载图标
    var is_show = $("#loading_img").css("display");
    if(is_show == "none"){
        $("#loading_img").show();
    }
    MY_MAP.changeMap(FLOOR_DATA[FLOOR_ID].file_2d_path,center,map_zoom,format,extend,{extent:extent,zoom_factor:1.5,animation_enable:true,animation_cache_time:MOVING_CACHE_TIME});
});

/*
 区域列表切换绘制区域和选择区域
*/
$("#to_search_draw").click(function () {
    if(CONTROL_MEASURE){
        MY_MAP.removeControlMeasure();
        $("#measure_location").attr("src","img/mapStaff.png");
        CONTROL_MEASURE = false;
    }
    $("#search_area").hide();
    $("#search_draw").show();
    $("#search_type").html("绘制");
    $("#search_area").val(null);
    $("#search_area").change();
    MY_MAP.removeAllFeature();
    MAP_DRAW.setActive(true);
});
$("#to_search_area").click(function () {
    $("#search_area").show();
    $("#search_draw").hide();
    $("#search_type").html("区域");
    MY_MAP.removeAllFeature();
    MAP_DRAW.setActive(false);
    DRAW_AREA = [];
    DRAW_FEATURE = undefined;
});

/*
 测距工具
*/
$("#measure_location").click(function () {
    if (MAP_DRAW.getActive()) {
        HG_MESSAGE("正在绘制图形");
        return;
    }
    if(CONTROL_MEASURE){
        return;
    }

    $(this).attr("src","img/mapStaffActive.png");
    $("#clear_measure_location").show();
    //调用2d地图SDK中的添加测量工具
    CONTROL_MEASURE = MY_MAP.addControlMeasure("line",{drawend:drawEnd});
    function drawEnd() {
        //调用2d地图SDK中的删除测量工具
        MY_MAP.removeControlMeasure();
        $("#clear_measure_location").show();
        $("#measure_location").attr("src","img/mapStaff.png");
        CONTROL_MEASURE = false;
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
    CONTROL_MEASURE = false;
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
 将视角移到区域中间
*/
function moveViewToArea(points) {
    var x = 0,y = 0 ,array_x = [], array_y = [];
    for (var i in points){
        x += points[i][0];
        y += points[i][1];
        array_x.push(points[i][0]);
        array_y.push(points[i][1]);
    }
    var area_width = Math.max.apply(null,array_x) - Math.min.apply(null,array_x);
    var area_height = Math.max.apply(null,array_y) - Math.min.apply(null,array_y);
    var resolution = (area_width > area_height ? area_width / $("#map").width() : area_height / $("#map").height()) * 1.8;
    x = x / points.length;
    y = y / points.length;

    MY_MAP.getView().animate({resolution:resolution,center:[x,y]});
}

/*
 按ESC取消测距
 */
$(document).keydown(function (e) {
    if (MAP_DRAW.getActive()){
        if (e.which === 27) {
            MAP_DRAW.setActive(false);
            MAP_DRAW.setActive(true);
        }
    }else {
        if (e.which === 27) {
            MY_MAP.removeControlMeasure();
            $("#measure_location").attr("src","img/mapStaff.png");
            CONTROL_MEASURE = false;
        }
    }
});

