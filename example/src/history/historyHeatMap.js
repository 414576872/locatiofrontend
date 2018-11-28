var FLOOR_ID;//楼层id
var MY_MAP;//地图对象
var FLOOR_DATA = [];//楼层信息,主要用来获取地图初始缩放比列,以及判断该楼层是否存在地图文件
var CENTER;//初始地图视点
var ZOOM;//初始地图缩放比
var POINTS_COUNT = [];
var SEARCH_START_TIME,SEARCH_END_TIME,SEARCH_FLOOR,SEARCH_CARDS;
var ALL_SEARCH_CARD = [];
/*
 初始执行
*/
$(function () {
    //初始化查询的时间输入框
    initDataInput();
    initTimeInput();
    //获取场景,自动触发获取建筑获取楼层,自动初始化场景,获取区域
    getAllFloor();
});

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
            }else {
                var extend = [FLOOR_DATA[id].coordinate_left,FLOOR_DATA[id].coordinate_down,FLOOR_DATA[id].coordinate_right,FLOOR_DATA[id].coordinate_upper];
                var url = AJAX_URL + FLOOR_DATA[id].file_2d_path;
                //调用计算自动缩放比
                var obj = mapAutomaticSetting(FLOOR_DATA[id].floor_scaling_ratio,FLOOR_DATA[id].origin_x,FLOOR_DATA[id].origin_y,FLOOR_DATA[id].drop_multiple,extend,"map");
                mapInit(url,obj.zoom,extend,obj.center,obj.extent);
                FLOOR_ID = id;
            }
        }else {
            HG_MESSAGE(data.result);
        }
    });
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
        MY_MAP = new HG2DMap.map(url, "map",center, map_zoom,"kml",[],{extent:extent,zoom_factor:1.5});
    }else {
        //地图为图片文件，调用2d地图SDK中的new HG2DMap.map,实例化一个图片地图对象
        MY_MAP = new HG2DMap.map(url, "map",center, map_zoom,"image",extend,{extent:extent,zoom_factor:1.5});
    }
    //地图加载进度
    MY_MAP.on('progress',function (e) {
        var progress = e.progress*100;
        $("#progress_bar p").html(progress.toFixed(1)+"%");
        $("#progress_bar_top").css("width",progress+"%");
    });
    MY_MAP.on('loaded',function () {
        $("#loading_img").hide();
        if(FLOOR_ID){
            CENTER = MY_MAP.getCenter();
            ZOOM = MY_MAP.getZoom();
            MY_MAP.setMapTextScale(1+(parseInt(ZOOM)-40)*0.06);
            MY_MAP.getView().on('change:zoom', function () {
                var zoom = MY_MAP.getZoom();
                MY_MAP.setMapTextScale(1+(parseInt(zoom)-40)*0.06);
            });
        }
    });
    var my_mouse_postion = new HG2DMap.control.mouse_position();
    var my_scale_line = new HG2DMap.control.scale_line();
    var my_drag_rotate = new HG2DMap.draw.drag_rotate();
    MY_MAP.addInteraction(my_drag_rotate);
    MY_MAP.addControl(my_mouse_postion);
    MY_MAP.addControl(my_scale_line);
}

/*
 输入卡号后点击确定按钮
*/
$("#to_search_history").click(function () {
    if (!getSearchCondition()) return;
    getHeatMapData();
    $("#to_search_history").attr('disabled',true);
});

/*
 输入卡号后回车按钮
*/
$('#search_card_id').keydown(function (e) {
    if(e.keyCode == 13){
        var card = parseInt($("#search_card_id").val());
        if (!card){
            HG_MESSAGE("请输入正确的卡号！");
            return false;
        }
        ALL_SEARCH_CARD[card] = true;
        showSearCard();
    }
});

/*
 显示搜索额卡号
*/
function showSearCard() {
    var html = "";
    for (var i in ALL_SEARCH_CARD){
        if (ALL_SEARCH_CARD[i]) html += "<span><span>"+i+"</span><i class='glyphicon glyphicon-remove'></i></span>"
    }
    $(".search_card_container").html(html)
}

/*
 删除卡号
*/
$(".search_card_container").on("click","i",function () {
    var card = parseInt($(this).prev().text());
    ALL_SEARCH_CARD[card] = false;
    showSearCard();
});

/*
 判断搜索条件
*/
function getSearchCondition() {
    //获得查询历史数据的开始和结束时间戳，并将时间戳转为毫秒为单位
    SEARCH_START_TIME = getSearchStartTimeStamp(true) * 1000;
    SEARCH_END_TIME   = getSearchEndTimeStamp(true) * 1000;

    //检查输入参数是否合法
    if(SEARCH_START_TIME>SEARCH_END_TIME){
        HG_MESSAGE("开始时间大于结束时间！请修改！");
        return false;
    }

    if(!SEARCH_START_TIME||!SEARCH_END_TIME){
        HG_MESSAGE("请输入时间范围");
        return false;
    }

    SEARCH_FLOOR = $("#floor_select").val();


    var all_cards = [];
    for (var i in ALL_SEARCH_CARD){
        if (ALL_SEARCH_CARD[i]) all_cards.push(i)
    }

    SEARCH_CARDS = all_cards.join(",");
    if (all_cards.length < 1){
        SEARCH_CARDS = undefined
    }
    return true
}

/*
 获取热力图数据
*/
function getHeatMapData(last_respense_time){
    var search_start_time = SEARCH_START_TIME;
    if (last_respense_time) {
        search_start_time = last_respense_time;
    }else {
        POINTS_COUNT = [];
        MY_MAP.clearHeatMap();
        $("#data_progress_bar p").html("0%");
        $("#data_progress_bar_top").css("width",1+"%");
        $("#data_progress").removeClass("hide");
    }

    HG_AJAX("/position_sdk/ModularHistory/History/getHistoryHeatMap",{start_time:search_start_time,end_time:SEARCH_END_TIME,card_ids:SEARCH_CARDS,floor_id:SEARCH_FLOOR,area_grid_size:0.1},"post",function (data) {
        if (data.type == 1){
            var data = data.result;
            var points = data.data;

            for (var i in points){
                if (POINTS_COUNT[i]){
                    POINTS_COUNT[i] += points[i]
                }else {
                    POINTS_COUNT[i] = points[i]
                }
            }

            if (data.get_all){
                $("#data_progress").addClass("hide");
                if (checkObjIsNull(POINTS_COUNT)){
                    HG_MESSAGE("未查询到历史数据");
                }else {
                    drawHeatMap();
                }
                $("#to_search_history").attr('disabled',false);
            }else {
                var progress = ((data.last_time - SEARCH_START_TIME) / (SEARCH_END_TIME - SEARCH_START_TIME)) * 100;
                progress = progress.toFixed(2);
                $("#data_progress_bar p").html( progress + "%");
                $("#data_progress_bar_top").css("width",progress+"%");
                getHeatMapData(data.last_time);
            }
        }else {
            HG_MESSAGE(data.message);
        }
    })
}

/*
 绘制热力图
*/
function drawHeatMap(){
    MY_MAP.clearHeatMap();
    for (var i in POINTS_COUNT){
        var x = parseFloat(i.split("_")[0]);
        var y = parseFloat(i.split("_")[1]);
        var count = parseInt(POINTS_COUNT[i]) / 1000;

        if (count > 1) count = 1;
        if (count < 0.1) count = 0.2;

        var feature = new ol.Feature(new ol.geom.Point([x,y]));
        feature.set('weight', count);
        MY_MAP.heat_map_source.addFeature(feature);
    }

}
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
    MY_MAP.reset();
    MY_MAP.removeControlMeasure();
    MY_MAP.clearMeasureFeature();
    $("#clear_measure_location").hide();
    FLOOR_ID = floor_id;

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
    MY_MAP.changeMap(AJAX_URL + FLOOR_DATA[FLOOR_ID].file_2d_path,center,map_zoom,format,extend,{extent:extent,zoom_factor:1.5});
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
 按ESC取消测距
 */
$(document).keydown(function (e) {
    if (e.which === 27) {
        MY_MAP.removeControlMeasure();
        $("#measure_location").attr("src","img/mapStaff.png");
    }
});

/*
 改变热力图模糊度
*/
function changeBlur(value) {
    MY_MAP.heat_map_layer.setBlur(value);
}

/*
 改变热力图半径
*/
function changeRadius(value) {
    MY_MAP.heat_map_layer.setRadius(value);
}

/*
 改变一个对象是否没有任何属性
*/
function checkObjIsNull(obj) {
    for (var i in obj){
        return false
    }
    return true;
}