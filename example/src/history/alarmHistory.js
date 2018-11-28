var SCENE_ID;//场景id
var BUILDING_ID;//建筑id
var FLOOR_ID;//楼层id
var MY_MAP;//地图对象
var ALL_SEARCH_CARD_STRING;//所有查询历史轨迹的卡的字符串
var ALL_SEARCH_AREA_STRING = undefined;
var SEARCH_DRAW_AREA = undefined;
var ALL_ZONE = {};//所有区域
var ALL_FLOOR = [];//存储所有的楼层
var CENTER;//初始地图视点
var ZOOM;//初始地图缩放比
var ZOOM_CHANGE_VALUE;
var TEXT_CHANGE_VALUE;
var NOW_DATA = [];
var IS_MOVE_VIEW = true;
var IS_CHANGE_MAP = false;
var ALREADY_CARD = [];
var ALL_AREA_TO_SEARCH = [];

var ALL_VIDEOS = [];//视频报警中的视频路径
var VIDEO_PLAYERS_OBJ;//视频播放器对象
var VIDEO_WIDTH;//摄像头视频宽度
var VIDEO_HEIGHT;//摄像头视频高度
var VIDEO_CURS = 0;//报警视频事件的播放顺序

/*
 获取视频的分辨率以及摄像头云台转动速度
*/
(function getVideoSizeAndSpeed() {
    HG_AJAX('/position_sdk/ModularVideo/Equip/getVideoSize',{},'post',function (data) {
        if(data.type == 1){
            var data = data.result;
            VIDEO_WIDTH = parseInt(data.CAMERA_ALARM_WIDTH);
            VIDEO_HEIGHT = parseInt(data.CAMERA_ALARM_HEIGHT);
        }else{
            VIDEO_WIDTH = 640;
            VIDEO_HEIGHT = 480;
        }
    })
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
            initPage();
        }
    });
})();

/*
 初始化页面，获得页面URL的参数
*/
function initPage() {
    var url = window.location.href;
    var para = url.split("?")[1];
    var alarm_id = para.split("=")[1];
    HG_AJAX("/position_sdk/ModularAlarm/Alarm/getAlarm", {id:alarm_id}, "post", function (data) {
        if (data.type == 1){
            var result = data.result;
            if (result.length < 1){
                HG_MESSAGE("错误的报警信息，2S后返回原页面");
                jumpBackToFenceAlarm();
            }
            var alarm     = result[0];
            var card_id   = alarm.card_id;
            var card_list = alarm.card_list;
            var type      = alarm.type;
            var camera    = alarm.camera;
            START_SEARCH_TIME_STAMP = alarm.time * 1000;
            END_SEARCH_TIME_STAMP   = START_SEARCH_TIME_STAMP + 30 * 1000;
            FLOOR_ID                = parseInt(alarm.floor_id);
            ALL_SEARCH_CARD_STRING  = card_id;
            if (card_list.length > 0){
                ALL_SEARCH_CARD_STRING = card_list;
            }
            if (camera.length >= 1){
                ALL_VIDEOS = camera;
            }
            if (!START_SEARCH_TIME_STAMP || START_SEARCH_TIME_STAMP == 0){
                HG_MESSAGE("获取到错误的时间，2S后返回原页面");
                jumpBackToFenceAlarm();
            }
            if (!FLOOR_ID){
                HG_MESSAGE("获取到错误的楼层信息，2S后返回原页面");
                jumpBackToFenceAlarm();
            }
            mapInit();
        }else {
            HG_MESSAGE("获取报警数据失败，2S后返回原页面");
            jumpBackToFenceAlarm();
        }
    })
}

/*
 获取并显示所有区域
*/
function showAllZone( ) {
    MY_MAP.removeAllZone();
    HG_AJAX("/position_sdk/ModularArea/Area/getArea",{floor_id: FLOOR_ID},'post',function (data) {
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
 回放的时候,处理定位数据
*/
function handleLocationData(card_id, x, y, z) {
    if (IS_MOVE_VIEW){
        MY_MAP.setCenter(x,y);
        IS_MOVE_VIEW = false
    }
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
    }
}

/*
 初始化地图
*/
function mapInit() {
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

    MY_MAP = new HG2DMap.map(AJAX_URL + ALL_FLOOR[FLOOR_ID].file_2d_path, "map", center, map_zoom,format,extend,{extent:extent,zoom_factor:1.5});

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
            showAllZone(FLOOR_ID);
        }
        playHistoryData();
        playAlarmVideo();
    });
    var my_mouse_postion = new HG2DMap.control.mouse_position();
    var my_scale_line = new HG2DMap.control.scale_line();
    var my_drag_rotate = new HG2DMap.draw.drag_rotate();
    MY_MAP.addInteraction(my_drag_rotate);
    MY_MAP.addControl(my_mouse_postion);
    MY_MAP.addControl(my_scale_line);
}


/*
 根据卡号和报警时间获取历史数据并播放
*/
function playHistoryData() {
    GET_DATA_TIME_STAMP = START_SEARCH_TIME_STAMP;
    NOW_TIME_STAMP      = START_SEARCH_TIME_STAMP;
    POST_CHECK_CODE = 0;
    IS_SKIP_BLANK_TIME = false;
    //获得历史数据
    getHistoryData(START_SEARCH_TIME_STAMP, ALL_SEARCH_CARD_STRING, ALL_SEARCH_AREA_STRING, SEARCH_DRAW_AREA, END_SEARCH_TIME_STAMP);
}

/*
 播放报警的视频
*/
function playAlarmVideo() {
    if (ALL_VIDEOS.length < 1){
        return;
    }
    var top = 100 + "px";
    var left = 110 + "px";
    var width = VIDEO_WIDTH + 'px';
    var height = (VIDEO_HEIGHT+40) + 'px';
    var camera_name_id = 'camera_name';
    var video_id = 'video_player';
    var div = '<div class="video_container" id="video_container" style="top:'+top+';left:'+left+';width: '+width+';height: '+height+'">'+
        '<div class="video_title" id="video_title">'+
        '<span id="'+camera_name_id+'"></span>'+
        '<span class="glyphicon glyphicon-remove-circle" style="cursor: pointer"></span>'+
        '</div>'+
        '<div id="'+video_id+'" style="width: '+width+';height: '+VIDEO_HEIGHT+'px"></div>'+
        '</div>';
    $('#example').append(div);
    $('#'+camera_name_id).html(ALL_VIDEOS[VIDEO_CURS].camera_name);
    var src = AJAX_URL + "/position_sdk" + ALL_VIDEOS[VIDEO_CURS].file_name,
        dom = document.getElementById(video_id),
        type = 'mp4',
        options = {
            width:VIDEO_WIDTH,
            height:VIDEO_HEIGHT,
            onended:loopVideo,
            autoplay:true
        };
    VIDEO_PLAYERS_OBJ = new HGPlayer(dom,type,src,undefined,options);
    handleVideoHerderDrag();
}

/*
 摄像头视频循环播放事件方法
*/
function loopVideo() {
    if(VIDEO_CURS + 1 == ALL_VIDEOS.length){
        return
    }
    VIDEO_CURS += 1;
    var camera_name_id = 'camera_name';
    $('#'+camera_name_id).html(ALL_VIDEOS[VIDEO_CURS].camera_name);
    var next = AJAX_URL + "/position_sdk" + ALL_VIDEOS[VIDEO_CURS].file_name;
    VIDEO_PLAYERS_OBJ.changeSource(next);
}

/*
 返回报警信息页面
*/
function jumpBackToFenceAlarm() {
    setTimeout(function () {
        window.location.href = "/HGMap/example/fenceAlarm.html"
    },2000)
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
    for (var i in ALREADY_CARD){
        MY_MAP.setCardIcon(i,"img/location.png",{icon_scale:value,text_scale:text_value});
    }
}

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
 关闭视频容器的方法
*/
$(document).on('click','.glyphicon-remove-circle',function () {
    $(this).parent().parent().remove();
});


/*
 处理视频播放窗口的拖动事件
*/
function handleVideoHerderDrag(){
    var containerObj = $("#video_container");
    var elementObj =$("#video_title");

    elementObj.mousedown(function (e) {
        //e.stopPropagation();
        $(".hg_video_container").css("z-index",5);
        containerObj.css("z-index",10);
        //获取鼠标按下的时候左侧偏移量和上侧偏移量
        var old_left = containerObj.css("left").split("p")[0];//左侧偏移量
        var old_top = containerObj.css("top").split("p")[0];//竖直偏移量

        //获取鼠标的位置
        var old_position_left = e.pageX;
        var old_position_top = e.pageY;

        $(document).mousemove(function (event) {
            event.stopPropagation();
            var new_left = event.pageX;//新的鼠标左侧偏移量
            var new_top = event.pageY;//新的鼠标竖直方向上的偏移量

            //计算发生改变的偏移量是多少
            var chang_x = new_left - old_position_left;
            var change_y = new_top - old_position_top;

            //计算出现在的位置是多少
            var new_position_left = old_left*1 + chang_x*1;
            var new_position_top = old_top*1 + change_y*1;

            containerObj.css({
                left: new_position_left + 'px',
                top: new_position_top + 'px'
            })
        });

        elementObj.mouseup(function(a){
            /*a.stopPropagation();*/
            $(document).off("mousemove");
            containerObj.css("z-index",5);
        })
    })
}

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