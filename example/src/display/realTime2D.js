/**
 * 实时显示二维维模式界面
 * 使用插件: jquery,bootstrap,mqtt
 * 使用SDK: HG2DMap
 * 使用后台接口:获取场景,获取建筑,获取楼层,获取区域,发送呼叫,发送区域撤离
 * 使用mqtt订阅topic:卡号实时数据,区域人数,地图总人数,卡号信息消失,区域变更，基站的删除，基站的增加，基站的变更
 * */
var FLOOR_ID;//当前的楼层id
var MY_MAP;//地图场景对象,SDK基本都在MY_MAP对象上进行操作
var CLIENT;//建立mqtt连接,保存到这个变量
var AREA_DATA;//从后台接口获取的所有的区域数据保存在这个变量
var FEATURE;//点击定位图标返回的对象保存在这个变量
var MY_POPUP;//保存实例化的定位信息悬浮框
var CARD;//输入框里输入的卡号
var CARD_ID = [];//地图上已有的所有定位卡号
var CALL_CARD_LIST = [];//已经添加的呼叫的卡号
var FLOOR_DATA = {};//保存当前场景、建筑里的所有楼层数据
var DRAW = false;//初始化绘制图形对象
var ADD_DRAW_ID = 100;//初始化自定义区域的id
var ADD_DRAW_NUM = 0;//初始化自定义区域的数量
var EVACUATE_TMP_AREA = {};//保存所有自定义区域的信息
var DRAW_ID_LIST = [];//保存自定义区域的id
var CHECKED_INPUT = {};//设置区域列表前的单选框是否选中
var TRACK_CHECKED_INPUT = {};//设置标签列表前的单选框是否选中
var STATION_DATA;//保存初始化得到的所有基站信息
var ICON_SCALE;//当地图缩放时，地图上的图标需要缩放的比例值
var TEXT_SCALE;//当地图缩放时，地图上的图标的字需要缩放的比例值
var NOW_DATA = {};//保存实时定位数据
var JUMP_FLAG = false;//是否跳转地图标识
var HEAT_POINT_FEATURE = {};//保存已创建的热力图图标对象
var LOCATION_CARD_ID = 0;//初始化报警定位卡号
var CARD_FLASH = {};//需要闪烁的定位卡对象
var FLASH_ZONE = {};//需要闪烁的区域对象
var IS_LOCATION_MQTT_RECONNECT = false;//mqtt重连标识
var ALL_AREA_POINT = {};//保存当前楼层所有区域的点对象
var CARD_VIEWPOINT_TRACK = undefined;//初始化视点追踪卡号
var SEARCH_CARD_DATA = {};//输入卡号模糊查询返回的结果
var ANIMATE_FLAG = true;//视点追踪动画效果是否完成标志
var CONTROL_MEASURE = false;//初始化测距绘制对象

/*
 获得所有场景、建筑、楼层
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
            if(all_floor_data[sessionStorage.getItem('floor_id')]){
                $("#floor_select").val(sessionStorage.getItem('floor_id'));
            }
            initFloorData($("#floor_select").val());
        }
    });
}

/*
 页面初始化
*/
function initFloorData(id) {
    HG_AJAX("/position_sdk/ModularFloor/Floor/getFloor",{},"post",function (data) {
        if (data.type == 1) {
            var data = data.result;
            $(data).each(function (index,ele) {
                FLOOR_DATA[this.id] = this;
            });
            if(sessionStorage.getItem('locations')) {
                var keys = JSON.parse(sessionStorage.getItem('locations')),
                    type = keys.type,
                    result = keys.result;
                FLOOR_ID = result[0].floor_id;
                var floor_data = FLOOR_DATA[FLOOR_ID];
                if(!floor_data || floor_data.floor_2d_file == '0'){
                    HG_MESSAGE("没有相关地图文件，将显示默认地图（功能无法实现）");
                    var url = AJAX_URL + "/position_sdk/App/Common/MapFile/basic.kml";
                    mapInit(url,"38",[],[0,0],[-100,-100,100,100]);
                    sessionStorage.removeItem('locations');
                }else{
                    if (type == '定位') {
                        $("#floor_select").val(FLOOR_ID);
                        var extend = [floor_data.coordinate_left, floor_data.coordinate_down, floor_data.coordinate_right, floor_data.coordinate_upper];
                        var url = AJAX_URL + floor_data.file_2d_path;
                        //调用计算自动缩放比
                        var obj = mapAutomaticSetting(floor_data.floor_scaling_ratio, floor_data.origin_x, floor_data.origin_y, floor_data.drop_multiple, extend, "map");
                        mapInit(url, 41, extend, obj.center, obj.extent);
                        if(typeof result[0].card_id != "string"){
                            LOCATION_CARD_ID = result[0].card_id;
                        }else {
                            LOCATION_CARD_ID = -1;
                        }
                        //显示区域
                        var area_id = result[0].area_id;
                        CHECKED_INPUT[area_id] = true;
                    } else if (type == '视频') {
                        $("#floor_select").val(FLOOR_ID);
                        var extend = [floor_data.coordinate_left, floor_data.coordinate_down, floor_data.coordinate_right, floor_data.coordinate_upper];
                        var url = AJAX_URL + floor_data.file_2d_path;
                        //调用计算自动缩放比
                        var obj = mapAutomaticSetting(floor_data.floor_scaling_ratio, floor_data.origin_x, floor_data.origin_y, floor_data.drop_multiple, extend, "map");
                        mapInit(url, obj.zoom, extend, obj.center, obj.extent);
                    }
                }
            }else{
                if(!FLOOR_DATA[id] || FLOOR_DATA[id].floor_2d_file =="0"){
                    HG_MESSAGE("没有相关地图文件，将显示默认地图（功能无法实现）");
                    var url = AJAX_URL + "/position_sdk/App/Common/MapFile/basic.kml";
                    mapInit(url,"38",[],[0,0],[-100,-100,100,100]);
                    FLOOR_ID = id;
                }else{
                    var extend = [FLOOR_DATA[id].coordinate_left,FLOOR_DATA[id].coordinate_down,FLOOR_DATA[id].coordinate_right,FLOOR_DATA[id].coordinate_upper];
                    var url = AJAX_URL + FLOOR_DATA[id].file_2d_path;
                    //调用计算自动缩放比
                    if((sessionStorage.getItem("floor_id") == id) && sessionStorage.getItem("zoom") && (sessionStorage.getItem("center_x") || sessionStorage.getItem("center_y"))){
                        var zoom = sessionStorage.getItem("zoom");
                        var center_x = sessionStorage.getItem("center_x");
                        var center_y = sessionStorage.getItem("center_y");
                        var obj = mapAutomaticSetting(zoom,center_x,center_y,FLOOR_DATA[id].drop_multiple,extend,"map");
                    }else {
                        var obj = mapAutomaticSetting(FLOOR_DATA[id].floor_scaling_ratio,FLOOR_DATA[id].origin_x,FLOOR_DATA[id].origin_y,FLOOR_DATA[id].drop_multiple,extend,"map");
                    }
                    mapInit(url,obj.zoom,extend,obj.center,obj.extent);
                    FLOOR_ID = id;
                }
            }
            if(sessionStorage.getItem('locations')){
                if(JSON.parse(sessionStorage.getItem('locations')).type == '定位'){
                    sessionStorage.removeItem('locations');
                }
            }
        }else {
            HG_MESSAGE(data.result);
        }
    });
}

/*
 当地图的缩放比变化时，基站的图标跟着一起缩放
*/
function changeStation(icon_scale,text_scale) {
    MY_MAP.removeAllBaseStation();
    if(icon_scale > 0.2){
        //当icon_scale>0.2时，改变基站图标的大小
        $(STATION_DATA).each(function (index, ele) {
            //调用2d地图SDK中的添加基站图标
            MY_MAP.addBaseStation(STATION_DATA[index].base_station_id, "img/baseStation.png", STATION_DATA[index].base_station_x, STATION_DATA[index].base_station_y,fromIntGetShowString(STATION_DATA[index].base_station_id),{icon_scale:icon_scale,text_scale:text_scale});
        });
    }
}

/*
 当地图的缩放比变化时，标签卡的图标跟着一起缩放
*/
function changeLocation(icon_scale,text_scale) {
    if(icon_scale <= 0.2){
        //当icon_scale<=0.2时，将标签卡的定位图标变为热力图
        MY_MAP.hideAllCard();
        MY_MAP.clearHeatMap();
        HEAT_POINT_FEATURE = {};
        for (var i in CARD_ID){
            HEAT_POINT_FEATURE[CARD_ID[i]] = MY_MAP.addHeatMapPoint(NOW_DATA[CARD_ID[i]].card_x,NOW_DATA[CARD_ID[i]].card_y);
        }
    }else {
        //当icon_scale>0.2时，改变定位图标的大小
        MY_MAP.showAllCard();
        MY_MAP.clearHeatMap();
        for (var i in CARD_ID){
            MY_MAP.setCardIcon(CARD_ID[i],"img/location.png",{icon_scale:icon_scale,text_scale:text_scale});
        }
    }
}

/*
 当地图的缩放比变化时，计算出地图上的图标需要缩放的比例值
*/
function getIconScale() {
    //得到当前地图的缩放比
    var zoom = MY_MAP.getZoom();
    //缩放比最大为47，根据2dSDK可知，改变图标的大小，就是改变参数icon_scale的值(参数icon_scale的默认值是1)
    ICON_SCALE = 1-(47-parseInt(zoom))*0.06;//当缩放比减小1，则icon_scale的值就减小0.06(这个值可以自己根据实际情况设置)；图标图片的大小应该选择缩放比为最大(即47)时最合适的大小
    TEXT_SCALE = 1+(parseInt(zoom)-40)*0.06;//同理ICON_SCALE，图标上的字体大小变化
    if(ICON_SCALE <= 0.1){
        ICON_SCALE = 0.1;
    }
    if(TEXT_SCALE <= 0.1){
        TEXT_SCALE = 0.1;
    }
}

/*
 获取当前楼层所有基站
*/
function getAllBaseStation() {
    //获得所有基站接口
    HG_AJAX("/position_sdk/ModularBaseStation/BaseStation/getAllBaseStationInfo", {
        floor_id: FLOOR_ID
    },"post",function (data) {
        if (data.type == 1) {
            STATION_DATA = data.result;
            changeStation(ICON_SCALE,TEXT_SCALE);
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
 获取当前楼层所有标签卡在地图上用图标显示出来（包括不动卡、非盲区卡）
*/
function getStaticList() {
    HG_AJAX("/position_sdk/ModularNowInfo/NowInfo/getStaticList", {
        floor_id: FLOOR_ID
    },"post",function (data) {
        if(data.type == 1){
            var data = data.result;
            for (var i in data) {
                if(!NOW_DATA[data[i].card_id]){
                    NOW_DATA[data[i].card_id] = {
                        "card_id":data[i].card_id,
                        "card_x":data[i].x,
                        "card_y":data[i].y,
                        "card_z":data[i].card_relative_z
                    }
                }
                var card_id = data[i].card_id.toString();
                if ($.inArray(card_id, CARD_ID) == -1) {
                    CARD_ID.push(card_id);
                    CARD_FLASH[card_id] = {
                        "is_flash":false
                    };
                    //调用2d地图SDK中的添加定位图标
                    var card_info = MY_MAP.addCardInfo(card_id, "img/location.png", data[i].x, data[i].y,"",{icon_scale:ICON_SCALE,text_scale:TEXT_SCALE});
                    card_info.card_id = card_id;
                    //缩放地图小时，显示热力图
                    if(ICON_SCALE <= 0.2){
                        HEAT_POINT_FEATURE[card_id] = MY_MAP.addHeatMapPoint(data[i].x,data[i].y);
                        MY_MAP.hideAllCard();
                    }
                    //报警定位时图标闪烁
                    if(LOCATION_CARD_ID == card_id){
                        MY_MAP.setCenter(data[i].x,data[i].y);
                        cardFlash(LOCATION_CARD_ID);
                        LOCATION_CARD_ID = 0;
                    }
                    //搜索的定位卡在其他楼层，需要跳转的标识
                    if(JUMP_FLAG == true){
                        if(CARD == card_id){
                            JUMP_FLAG = false;
                            changeLocation(ICON_SCALE,TEXT_SCALE);
                            cardFlash(CARD);
                        }
                        if(CARD_VIEWPOINT_TRACK == card_id){
                            JUMP_FLAG = false;
                            var color_value = 360 * Math.random();
                            MY_MAP.addTrack(card_id,500,"HSL("+color_value+",100%,40%)");
                        }
                    }
                }
            }
        }
    })
}

/*
 获取当前楼层所有标签卡并用列表展示出来（包括不动卡、非盲区卡）
*/
function getNowInfo() {
    var floor_id = FLOOR_ID;
    HG_AJAX("/position_sdk/ModularNowInfo/NowInfo/getNowInfo", {page:1,limit:10000,floor_id:floor_id,blind:"2"},"post",function (data) {
        if (data.type == 1) {
            var result = data.result.data;
            var html = "";
            $(result).each(function (index) {
                var active = "";
                if(CARD_VIEWPOINT_TRACK && this.card_id == CARD_VIEWPOINT_TRACK){
                    active = " active"
                }
                html += "<tr>" +"<td><input type='checkbox' data-id='" + this.card_id + "'/></td>" +
                    "<td>"+this.card_id+"</td>" +
                    "<td><a class='call_card' data-card='"+this.card_id+"' style='padding-right: 10px;cursor:pointer;'>呼叫</a><a class='add_video_btn' data-card='"+this.card_id+"' data-coordinates='"+[this.x,this.y]+"' style='padding-right: 10px;cursor:pointer;'>视频</a></td>"+
                    "<td><b class='glyphicon glyphicon-ok"+ active + "' data-card='" + this.card_id + "'></b></td></tr>"
            });
            $("#tbody_card_info").html(html);
            var check_flag = 0;
            for (var i in result) {
                if (TRACK_CHECKED_INPUT[result[i].card_id]) {
                    if(TRACK_CHECKED_INPUT[result[i].card_id].flag == true){
                        $("#tbody_card_info input[data-id=" + result[i].card_id + "]")[0].checked = true;
                        check_flag++;
                    }
                }
            }
            var input = $("#tbody_card_info").find("input");
            if(check_flag == 0){
                $("#track thead input")[0].checked = false;
            }else if (check_flag == input.length) {
                $("#track thead input")[0].checked = true;
            }else {
                $("#track thead input")[0].checked = false;
            }
        }
    });
}

/*
 显示聚类人数
*/
function cluster_test_function(feature) {
    var features = feature.get('features');
    var size = features.length;
    return size.toString() + "人";
}

/*
 设置聚类图标的半径
*/
function radius_function(feature) {
    var features = feature.get('features');
    var size = features.length;
    return (20 + size/2);
}

/*
 切换图标弹出框里的“轨迹追踪”和“取消追踪”
*/
function changeTrackBtn(card) {
    if(!TRACK_CHECKED_INPUT[card] || TRACK_CHECKED_INPUT[card].flag == false){
        return "<a style='float: left;margin-left: 10px' href='#' data-card='" + card + "' id='add_track_btn_icon'>轨迹追踪</a>";
    }else {
        return "<a style='float: left;margin-left: 10px;' href='#' data-card='" + card + "' id='cancel_track_btn_icon'>取消追踪</a>";
    }
}

/*
 地图初始化
*/
function mapInit(url,map_zoom,extend,center,extent) {
    //显示地图加载进度条和图标
    var is_show = $("#loading_img").css("display");
    if(is_show == "none"){
        $("#loading_img").show();
    }
    if(url.substr(url.length-3,3) == "kml"){
        //地图为kml文件，调用2d地图SDK中的new HG2DMap.map,实例化一个kml地图对象
        MY_MAP = new HG2DMap.map(url, "map",center, map_zoom,"kml",[],{extent:extent,zoom_factor:1.5,cluster_distance:30,cluster_text_function:cluster_test_function,radius_function:radius_function,animation_enable:true,animation_cache_time:MOVING_CACHE_TIME});
    }else {
        //地图为图片文件，调用2d地图SDK中的new HG2DMap.map,实例化一个图片地图对象
        MY_MAP = new HG2DMap.map(url, "map",center, map_zoom,"image",extend,{extent:extent,zoom_factor:1.5,cluster_distance:30,cluster_text_function:cluster_test_function,radius_function:radius_function,animation_enable:true,animation_cache_time:MOVING_CACHE_TIME});
    }
    var my_mouse_postion = new HG2DMap.control.mouse_position();//调用2d地图SDK中的实例化鼠标坐标工具
    var my_scale_line = new HG2DMap.control.scale_line();//调用2d地图SDK中的实例化比例尺工具
    var my_drag_rotate = new HG2DMap.draw.drag_rotate();//调用2d地图SDK中的地图旋转
    MY_MAP.addInteraction(my_drag_rotate);//调用2d地图SDK中的给地图添加地图旋转
    MY_MAP.addControl(my_mouse_postion);//调用2d地图SDK中的给地图添加鼠标坐标工具
    MY_MAP.addControl(my_scale_line);//调用2d地图SDK中的给地图添加比例尺工具
    MY_POPUP = MY_MAP.addPopup("popup");//调用2d地图SDK中的给地图添加信息悬浮框
    //鼠标点击地图上图标的时候，调用2d地图SDK中的点击事件
    MY_MAP.on('pointerdown', function (e) {
        if (e.dragging) {
            return;
        }
        var pixel = MY_MAP.getEventPixel(e.originalEvent);//调用2d地图SDK中的获得鼠标点击的事件像素
        var hit = MY_MAP.hasFeatureAtPixel(pixel);//调用2d地图SDK中的判断该像素是否存在图标
        MY_MAP.getTarget().style.cursor = hit ? 'pointer' : '';
        if (hit) {
            //调用2d地图SDK中的拿到该图标对象
            var feature = MY_MAP.forEachFeatureAtPixel(e.pixel,
                function (feature) {
                    return feature;
                });
            //如果图标对象是定位图标，则获得该图标的坐标，并弹出悬浮框
            if (feature.card_id) {
                MY_MAP.getTarget().style.cursor = 'pointer';
                var card = feature.card_id;//获得卡号
                var coordinates = feature.getGeometry().getCoordinates();//调用2d地图SDK中的获得坐标
                MY_POPUP.setPosition(coordinates);//调用2d地图SDK中的给悬浮框设置坐标
                $('#popup').attr("data-content",
                    "<p style='white-space :nowrap '>卡号: " + card + "</p>" +
                    "<p style='white-space :nowrap ' id='pop_location'>坐标: " + parseFloat(coordinates[0]).toFixed(2) + "," + parseFloat(coordinates[1]).toFixed(2) + "</p>" +
                    "<p style='float: left'>操作:</p><a style='float: left;margin-left: 10px' class='call_card' href='#' data-card='" + card + "'>呼叫</a>"+changeTrackBtn(card)+"<a style='float: left;margin-left: 42px' href='#' data-card='" + card + "' data-coordinates='"+coordinates+"' class='add_video_btn'>视频</a>"
                );
                $('#popup').popover({
                    'placement': 'top',
                    'html': true,
                    delay: {"show": 0, "hide": 500}
                });
                $('#popup').popover('show');
                FEATURE = feature;
            }
            //判断图标对象是否是聚类图标，如果是就设置地图缩放比至40，将地图中心视点移至该聚类图标坐标点，并且关闭聚类显示
            else if ( feature.get("features") && feature.get("features").length > 1){
                var cluster_coordinates = feature.getGeometry().getCoordinates();
                MY_MAP.setZoom(40);
                MY_MAP.setCenter(cluster_coordinates[0],cluster_coordinates[1]);
                getIconScale();
                changeLocation(ICON_SCALE,TEXT_SCALE);
                if(MY_MAP.getClusterEnable()){
                    MY_MAP.disableCluster();
                }
            }
            //判断图标对象是否是摄像头图标，如果是就播放该摄像头实时画面
            else if (feature.type == "camera"){
                playTheCamera(undefined,feature.camera_id,undefined)
            }
            else {
                MY_MAP.getTarget().style.cursor = '';
                $('#popup').popover('hide');
            }
        }else {
            MY_MAP.getTarget().style.cursor = '';
            $('#popup').popover('hide');
        }
    });
    //地图加载进度
    MY_MAP.on('progress',function (e) {
        var progress = e.progress*100;
        $(".progress_bar p").html(progress.toFixed(1)+"%");
        $(".progress_bar_top").css("width",progress+"%");
    });
    //当地图加载完成后，加载进度条和图标隐藏，初始化其他功能
    MY_MAP.on('loaded',function () {
        $("#loading_img").hide();
        if(FLOOR_ID){
            var session_center = MY_MAP.getCenter();
            var session_zoom = MY_MAP.getZoom();
            sessionStorage.setItem('floor_id', FLOOR_ID);
            sessionStorage.setItem("zoom",session_zoom);
            sessionStorage.setItem("center_x",session_center[0]);
            sessionStorage.setItem("center_y",session_center[1]);
            //判断此时聚类是开启还是关闭
            if(!sessionStorage.getItem("show_cluster") || sessionStorage.getItem("show_cluster") == "on"){
                sessionStorage.setItem("show_cluster","on");
                if(!MY_MAP.getClusterEnable()){
                    MY_MAP.enableCluster(30);
                }
                $("#change_show_cluster").html("关闭聚类显示");
            }else {
                sessionStorage.setItem("show_cluster","off");
                if(MY_MAP.getClusterEnable()){
                    MY_MAP.disableCluster();
                }
                $("#change_show_cluster").html("开启聚类显示");
            }
            getStaticList();
            getNowInfo();
            getIconScale();
            MY_MAP.setMapTextScale(TEXT_SCALE);
            //初始化显示基站图标
            getAllBaseStation();
            //初始化显示区域列表
            getAllArea();
            //显示该楼层上的摄像头
            getCamera();
            //初始化连接mqtt
            connectMQTT();
            //显示摄像头列表
            getFloorCamera();
            //让定位图标悬浮框跟随定位图标一起移动
            MY_MAP.on("animate_move",function (e) {
                if(FEATURE && FEATURE.card_id == e.feature.card_id){
                    var coordinates = e.coordinates;
                    //调用2d地图SDK中的设置弹出悬浮框的坐标
                    MY_POPUP.setPosition(coordinates);
                    $(".popover-content #pop_location").html(" 坐标: " + parseFloat(coordinates[0]).toFixed(2) + "," + parseFloat(coordinates[1]).toFixed(2))
                }
            });
            //移动地图结束后，存下地图的中心视点坐标值
            MY_MAP.on("moveend",function () {
                var center = MY_MAP.getCenter();
                sessionStorage.setItem("center_x",center[0]);
                sessionStorage.setItem("center_y",center[1]);
            });
            //改变地图缩放比，当缩放比大于等于39时就关闭聚类显示，小于39就开启聚类显示
            MY_MAP.getView().on('change:zoom', function () {
                var zoom = MY_MAP.getZoom();
                if(sessionStorage.getItem("show_cluster") == "on"){
                    if(zoom >= 39){
                        if(MY_MAP.getClusterEnable()){
                            MY_MAP.disableCluster();
                        }
                    }else {
                        if(!MY_MAP.getClusterEnable()){
                            MY_MAP.enableCluster(30);
                        }
                    }
                }else if(sessionStorage.getItem("show_cluster") == "off"){
                    if(MY_MAP.getClusterEnable()){
                        MY_MAP.disableCluster();
                    }
                }
                sessionStorage.setItem("zoom",zoom);
                getIconScale();
                MY_MAP.setMapTextScale(TEXT_SCALE);
                //改变基站图标大小
                changeStation(ICON_SCALE,TEXT_SCALE);
                //改变定位图标大小
                changeLocation(ICON_SCALE,TEXT_SCALE);
                //改变摄像头图标大小
                changeCamera(ICON_SCALE,TEXT_SCALE);
            });
        }
    });
}

/*
 呼叫卡号
*/
function callCard(card_id_list) {
    //呼叫卡号后台接口
    HG_AJAX("/position_sdk/ModularNowInfo/NowInfo/callCardList",{card_list: card_id_list},"post",function (data) {
        if (data.type == 1) {
            HG_MESSAGE("卡号:"+ card_id_list[0] +"已下发");
        }else{
            HG_MESSAGE(data.result);
        }
    });
}

/*
 区域是否启用
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
 将视角移到区域中间
*/
function moveViewToArea(points,flag) {
    var x = 0,y = 0 ,array_x = [], array_y = [];
    for (var i in points){
        x += points[i][0];
        y += points[i][1];
        array_x.push(points[i][0]);
        array_y.push(points[i][1]);
    }
    var area_width = Math.max.apply(null,array_x) - Math.min.apply(null,array_x);
    var area_height = Math.max.apply(null,array_y) - Math.min.apply(null,array_y);
    var resolution = (area_width > area_height ? area_width / $("#map").width() : area_height / $("#map").height()) * 4;
    x = x / points.length;
    y = y / points.length;
    if(flag){
        MY_MAP.getView().animate({resolution:resolution,center:[x,y]});
    }
    var area_obj = {
        x:x,
        y:y,
        points:points
    };
    return area_obj;
}

/*
 绘制区域图形转字符串
*/
function areaTrans(array) {
    var string = array.join(" ");
    return string;
}

/*
 地图上显示区域
*/
function showArea(index,flag) {
    var id = AREA_DATA[index].id;
    var name = AREA_DATA[index].name;
    var area = AREA_DATA[index].area.split(" ");
    var area_style = AREA_DATA[index].area_style;
    var point_array = [];
    for (var i in area) {
        point_array.push([parseFloat(area[i].split(",")[0]),parseFloat(area[i].split(",")[1])]);
    }
    //调用2d地图SDK中的添加区域
    var zone = MY_MAP.addZone(point_array, id, name, area_style);
    //如果报警是聚众，将聚众区域移动到中心视点
    if(LOCATION_CARD_ID == -1){
        flag = true;
        LOCATION_CARD_ID = 0;
     }
     //将地图中心视点移至该区域
    ALL_AREA_POINT[id] = moveViewToArea(point_array,flag);
    zone.is_flash = false;
    FLASH_ZONE[id] = zone;
}

/*
 得到每个区域里的非盲区人数
*/
function filteringAreas() {
    HG_AJAX("/position_sdk/ModularNowInfo/NowInfo/getCardByArea", {
        online: 1
    },"post",function (data) {
        if(data.type == 1){
            var data = data.result;
            for(var i in data){
                for(var j in AREA_DATA){
                    if(AREA_DATA[j].id == i){
                        if(AREA_DATA[j].is_use != 0){
                            $("#area_num_" + i).html(data[i].length);
                        }else{
                            $("#area_num_" + i).html("--");
                        }
                    }
                }
            }
        }
    })
}

/*
 得到区域列表
*/
function getAllArea() {
    //获得所有区域接口
    HG_AJAX("/position_sdk/ModularArea/Area/getArea",{floor_id: FLOOR_ID},"post",function (data) {
        //删除地图上所有已显示的区域
        if (AREA_DATA) {
            //调用2d地图SDK中的删除所有区域
            MY_MAP.removeAllZone();
        }
        ALL_AREA_POINT = {};
        if (data.type == 1) {
            AREA_DATA = data.result;
            var html = "";
            var check_flag = 0;
            $(AREA_DATA).each(function (index, ele) {
                html += '<tr><td><input type="checkbox" data-index=' + index + ' data-id=' + AREA_DATA[index].id + '></td><td>' + AREA_DATA[index].name + '</td><td id="area_num_' + AREA_DATA[index].id + '">'+checkUse(AREA_DATA[index].is_use,true)+'</td><td>'+checkUse(AREA_DATA[index].is_use)+'</td><td><a class="call_all_card" data-id=' + AREA_DATA[index].id + '>撤离</a></td></tr>';
            });
            $("#area tbody").html(html);
            filteringAreas();
            for (var i in AREA_DATA) {
                //如果区域列表前的选择框选中，在地图上显示区域
                if (CHECKED_INPUT[AREA_DATA[i].id] && CHECKED_INPUT[AREA_DATA[i].id] == true) {
                    $("#area tbody input[data-id=" + AREA_DATA[i].id + "]")[0].checked = true;
                    check_flag++;
                    showArea($("#area tbody input[data-id=" + AREA_DATA[i].id + "]").data('index'),false);
                }
            }
            if (check_flag == 0){
                $("#area").find("thead").find("input")[0].checked = false;
            }
            else if (check_flag == AREA_DATA.length) {
                $("#area").find("thead").find("input")[0].checked = true;
            }
            else {
                $("#area").find("thead").find("input")[0].checked = false;
            }
        }
    });
}

/*
 定位卡闪烁
*/
function cardFlash(id) {
    //每0.3秒更换一次定位图标
    var timer = setInterval(function () {
        if(CARD_FLASH[id] && CARD_FLASH[id].is_flash == false){
            MY_MAP.setCardIcon(id,"img/location0.png",{icon_scale:ICON_SCALE,text_scale:TEXT_SCALE});
            CARD_FLASH[id].is_flash = true;
        }else if(CARD_FLASH[id] && CARD_FLASH[id].is_flash == true){
            MY_MAP.setCardIcon(id,"img/location.png",{icon_scale:ICON_SCALE,text_scale:TEXT_SCALE});
            CARD_FLASH[id].is_flash = false;
        }
    },300);
    //3秒后停止更换图标
    setTimeout(function () {
        clearInterval(timer);
        if(CARD_FLASH[id]){
            MY_MAP.setCardIcon(id,"img/location.png",{icon_scale:ICON_SCALE,text_scale:TEXT_SCALE});
            CARD_FLASH[id].is_flash = false;
        }
    },3000);
}

/*
 收到实时数据处理函数
*/
function connectMQTT() {
    if (window.WebSocket) {
        var ip = WS_URL;//全局的ip地址
        var mqtt_username = MQTT_INFO.username;
        var mqtt_password = MQTT_INFO.password;
        if(sessionStorage.mqtt_username){
            mqtt_username = sessionStorage.mqtt_username
        }
        if(sessionStorage.mqtt_password){
            mqtt_password = sessionStorage.mqtt_password
        }
        CLIENT = mqtt.connect(ip,{username:mqtt_username,password:mqtt_password});//连接mqtt
        var now_info = "/pos_business/card_now_forweb/scene_id/" + FLOOR_DATA[FLOOR_ID].scene_id + "/building_id/" + FLOOR_DATA[FLOOR_ID].building_id + "/floor_id/" + FLOOR_ID;
        //订阅需要的topic消息
        CLIENT.subscribe([now_info, "/pos_business/card_now_num", "/think_php/init_area", "/pos_business/card_now_floor_num", "/pos_business/del_card", "/pos_business/camera_alarm","/pos_business/change_floor"]);
        CLIENT.on("message", function (topic, payload) {
            switch (topic.split("/")[2]) {
                case "card_now_forweb":
                    //处理得到的实时定位人员数据
                    var data = JSON.parse(payload.toString());
                    //遍历得到的实时定位人员数据，判断如果该定位人员已存在，则更新该卡号的坐标；如果不存在就新增该卡号信息
                    for (var i in data) {
                        NOW_DATA[i] = data[i];
                        if ($.inArray(i, CARD_ID) == -1) {
                            CARD_ID.push(i);
                            CARD_FLASH[i] = {
                                "is_flash":false
                            };
                            //调用2d地图SDK中的添加定位图标
                            var card_info = MY_MAP.addCardInfo(i, "img/location.png", data[i].card_x, data[i].card_y,"",{icon_scale:ICON_SCALE,text_scale:TEXT_SCALE});
                            card_info.card_id = i;
                            //缩放地图小时，显示热力图
                            if(ICON_SCALE <= 0.2){
                                HEAT_POINT_FEATURE[i] = MY_MAP.addHeatMapPoint(data[i].card_x,data[i].card_y);
                                MY_MAP.hideAllCard();
                            }
                            //报警定位时图标闪烁
                            if(LOCATION_CARD_ID == i){
                                MY_MAP.setCenter(data[i].card_x,data[i].card_y);
                                cardFlash(LOCATION_CARD_ID);
                                LOCATION_CARD_ID = 0;
                            }

                            //搜索的定位卡在其他楼层，需要跳转的标识
                            if(JUMP_FLAG == true){
                                if(CARD == i){
                                    JUMP_FLAG = false;
                                    changeLocation(ICON_SCALE,TEXT_SCALE);
                                    cardFlash(CARD);
                                }
                                if(CARD_VIEWPOINT_TRACK == i){
                                    JUMP_FLAG = false;
                                    var color_value = 360 * Math.random();
                                    MY_MAP.addTrack(i,500,"HSL("+color_value+",100%,40%)");
                                }
                            }
                        } else {
                            //调用2d地图SDK中的设置定位图标的坐标
                            MY_MAP.setCardCoordinate(i, data[i].card_x, data[i].card_y);
                            if(ICON_SCALE <= 0.2){
                                if(HEAT_POINT_FEATURE[i]){
                                    MY_MAP.updateHeatMapPoint(HEAT_POINT_FEATURE[i],data[i].card_x,data[i].card_y);
                                }
                            }
                        }
                        if(CARD_VIEWPOINT_TRACK == i){
                            var center = MY_MAP.getPixelFromCoordinate(MY_MAP.getCenter())
                            var card_center = MY_MAP.getPixelFromCoordinate([data[i].card_x,data[i].card_y])
                            var map_width = $("#map").width() / 2 - 50;
                            var map_height = $("#map").height() / 2 - 50;
                            if(ANIMATE_FLAG == true && (Math.abs(center[0]-card_center[0])>map_width || Math.abs(center[1]-card_center[1])>map_height)){
                                ANIMATE_FLAG = false;
                                MY_MAP.getView().animate({center:[data[i].card_x,data[i].card_y]},function () {
                                    ANIMATE_FLAG = true;
                                });
                            }
                            $("#center_card").html("卡号："+i+" 正在视点追踪");
                        }else if(!CARD_VIEWPOINT_TRACK) {
                            $("#center_card").html("");
                        }
                    }
                    delete data;
                    break;
                case "card_now_floor_num":
                    //处理实时楼层总人数，当人数变化，操作dom改变值
                    var data = JSON.parse(payload.toString());
                    var html = "楼层总人数：0";
                    if (data[FLOOR_ID]) {
                        html = "楼层总人数：" + data[FLOOR_ID];
                    }
                    $("#search_all_person").html(html);
                    delete data;
                    break;
                case "init_area":
                    //当区域发生增删改查时，重新加载区域，刷新区域列表
                    getAllArea();
                    break;
                case "del_card":
                    //处理实时消失的卡号，当有卡号消失时，删除对应的卡号定位图标
                    var data = JSON.parse(payload.toString());
                    for (var i in data) {
                        if ($.inArray(data[i].toString(), CARD_ID) != -1) {
                            //调用2d地图SDK中的删除一个定位图标
                            MY_MAP.removeOneCard(data[i].toString());
                            CARD_ID.splice($.inArray(data[i].toString(), CARD_ID), 1);
                            delete CARD_FLASH[data[i]];
                            delete NOW_DATA[data[i]];
                            delete HEAT_POINT_FEATURE[data[i]];
                        }
                        if (FEATURE) {
                            if (FEATURE.card_id == data[i]) {
                                $(document.getElementById('popup')).popover('hide');
                                FEATURE = undefined;
                            }
                        }
                    }
                    delete data;
                    break;
                case "change_floor":
                    //处理切换楼层的卡号，当有卡号切换至其他楼层，如果此时该卡此时正在进行视点追踪，那楼层也相应切换过去
                    var data = JSON.parse(payload.toString());
                    for (var i in data) {
                        if(data[i] != FLOOR_ID){
                            if ($.inArray(i.toString(), CARD_ID) != -1) {
                                //调用2d地图SDK中的删除一个定位图标
                                MY_MAP.removeOneCard(i.toString());
                                CARD_ID.splice($.inArray(i.toString(), CARD_ID), 1);
                                delete CARD_FLASH[i];
                                delete NOW_DATA[i];
                                delete HEAT_POINT_FEATURE[i];
                                if (FEATURE) {
                                    if (FEATURE.card_id == i) {
                                        $(document.getElementById('popup')).popover('hide');
                                        FEATURE = undefined;
                                    }
                                }
                            }
                            if(CARD_VIEWPOINT_TRACK == i){
                                mapChange(data[i],undefined,true);
                                $("#floor_select").val(data[i]);
                                JUMP_FLAG = true;
                            }
                        }
                    }
                    delete data;
                    break;
                case "camera_alarm":
                    var data = JSON.parse(payload.toString());
                    //如果报警时的区域是显示的，则报警区域闪烁
                    for (var i in data){
                        for(var j in data[i]){
                            if(data[i][j].area_id && CHECKED_INPUT[data[i][j].area_id]){
                                if(FLASH_ZONE[data[i][j].area_id].is_flash == false){
                                    FLASH_ZONE[data[i][j].area_id].startFlash(100);
                                    FLASH_ZONE[data[i][j].area_id].is_flash = true;
                                    setTimeout(function () {
                                        FLASH_ZONE[data[i][j].area_id].stopFlash();
                                        FLASH_ZONE[data[i][j].area_id].is_flash = false;
                                    },3000)
                                }
                            }
                            if(data[i][j].card_id){
                                cardFlash(data[i][j].card_id);
                            }
                        }
                    }
                    delete data;
                    break;
                default:
            }
        });
        //当mqtt连接上后，重连标识为true时，结束之前的CLIENT，重连一次
        CLIENT.on("connect", function () {
            if (IS_LOCATION_MQTT_RECONNECT){
                CLIENT.end();
                connectMQTT();
                IS_LOCATION_MQTT_RECONNECT = false;
            }
        });
        CLIENT.on("error", function () {
            console.log("mqtt client is error");
        });
        //当CLIENT重连时，将重连标识设为true
        CLIENT.on("reconnect", function () {
            IS_LOCATION_MQTT_RECONNECT = true;
            console.log("mqtt client try to reconnect");
        })
    } else {
        HG_MESSAGE("该浏览版本过于老旧，无法显示定位数据，请使用最新版chrome浏览器");
    }
}

/*
 清除3d页面缓存的地图参数
*/
function clearSession() {
    sessionStorage.removeItem('point_x');
    sessionStorage.removeItem('point_y');
    sessionStorage.removeItem('point_z');
    sessionStorage.removeItem('deviation_x');
    sessionStorage.removeItem('deviation_y');
    sessionStorage.removeItem('deviation_z');
}

/*
 判断输入框的卡号是否在本楼层,如果楼层上有该卡号，图标将会闪烁，如果卡号在其他楼层，则页面切换到它所在楼层
*/
function searchCard() {
    if($.inArray(CARD, CARD_ID) != -1){
        //定位卡在本楼层，将地图的视点中心设置为该定位卡的位置，并闪烁3秒
        MY_MAP.setZoom(41);
        getIconScale();
        changeLocation(ICON_SCALE,TEXT_SCALE);
        MY_MAP.setCenter(NOW_DATA[CARD].card_x,NOW_DATA[CARD].card_y);
        cardFlash(CARD);
        $("#search_card_list").html("");
    }else {
        if(FLOOR_DATA[SEARCH_CARD_DATA[CARD].floor_id].floor_2d_file == "0"){
            HG_MESSAGE("没有相关地图文件，不能跳转");
            return;
        }
        var record = $('#example').find(".heart");
        if(record.length>0){
            $("#modal_video_download").modal("show");
            CLOSE_RECORD_FLOOR = SEARCH_CARD_DATA[CARD].floor_id;
            CLOSE_RECORD_DATA = SEARCH_CARD_DATA[CARD];
            HREF = undefined;
            return false;
        }
        mapChange(SEARCH_CARD_DATA[CARD].floor_id,SEARCH_CARD_DATA[CARD]);
    }
}

/*
 切换地图函数
*/
function mapChange(floor_id,data,flag) {
    if(OPEN_CAMERA_IDS.length){
        $(".hg_video_container").remove();
        for(var i=0;i<OPEN_CAMERA_IDS.length;i++){
            if(HGPLAY_OBJ[OPEN_CAMERA_IDS[i]]){
                HGPLAY_OBJ[OPEN_CAMERA_IDS[i]].close();
                HGPLAY_OBJ[OPEN_CAMERA_IDS[i]] = null;
            }
        }
        OPEN_CAMERA_IDS = [];
        VIDEO_DIV_CNT = 0;
    }
    if(OPEN_TRACK_CAMERA_IDS.length){
        $(".hg_video_container").remove();
        for(var i=0;i<OPEN_TRACK_CAMERA_IDS.length;i++){
            if(TRACK_HGPLAY_OBJ[OPEN_TRACK_CAMERA_IDS[i]]){
                TRACK_HGPLAY_OBJ[OPEN_TRACK_CAMERA_IDS[i]].close();
                TRACK_HGPLAY_OBJ[OPEN_TRACK_CAMERA_IDS[i]] = null;
            }
        }
        OPEN_TRACK_CAMERA_IDS = [];
        VIDEO_DIV_CNT = 0;
    }
    if (FEATURE) {
        $(document.getElementById('popup')).popover('hide');
        FEATURE = undefined;
    }
    //取消切换地图前订阅的实时定位数据topic
    CLIENT.unsubscribe(["/pos_business/card_now_forweb/scene_id/" + FLOOR_DATA[FLOOR_ID].scene_id + "/building_id/" + FLOOR_DATA[FLOOR_ID].building_id + "/floor_id/" + FLOOR_ID,"/pos_business/card_now_num", "/think_php/init_area", "/pos_business/card_now_floor_num", "/pos_business/del_card", "/pos_business/camera_alarm","/pos_business/change_floor"],function () {
        MY_MAP.reset();//调用2d地图SDK中的重置地图函数
        MY_MAP.removeControlMeasure();
        MY_MAP.clearMeasureFeature();
        $("#clear_measure_location").hide();
        $("#card_select").hide();
        $("#search_card_list").html("");
        $("#query_card_input").val("");
        //清空前面所有存放数据的全局变量
        CARD_ID = [];
        NOW_DATA = {};
        CHECKED_INPUT = {};
        AREA_DATA = undefined;
        if(flag){
            TRACK_CHECKED_INPUT[CARD_VIEWPOINT_TRACK] = {
                "flag":true,
                "card_id":CARD_VIEWPOINT_TRACK
            };
        }else {
            TRACK_CHECKED_INPUT = {};
            CARD_VIEWPOINT_TRACK = undefined;
        }
        EVACUATE_TMP_AREA = {};
        CARD_FLASH = {};
        ADD_DRAW_ID = 100;
        ADD_DRAW_NUM = 0;
        //获得切换后楼层id
        FLOOR_ID = floor_id;
        //显示地图加载图标
        var is_show = $("#loading_img").css("display");
        if (is_show == "none") {
            $("#loading_img").show();
        }
        var file_type = FLOOR_DATA[FLOOR_ID].file_2d_postfix;
        var extend = [FLOOR_DATA[FLOOR_ID].coordinate_left, FLOOR_DATA[FLOOR_ID].coordinate_down, FLOOR_DATA[FLOOR_ID].coordinate_right, FLOOR_DATA[FLOOR_ID].coordinate_upper];
        //调用计算自动缩放比
        var obj = mapAutomaticSetting(FLOOR_DATA[FLOOR_ID].floor_scaling_ratio, FLOOR_DATA[FLOOR_ID].origin_x, FLOOR_DATA[FLOOR_ID].origin_y, FLOOR_DATA[FLOOR_ID].drop_multiple, extend, "map");
        if(data){
            var center = [data.x,data.y];
            var zoom = 41;
            $("#floor_select").val(FLOOR_ID);
            JUMP_FLAG = true;
        }else {
            var center = obj.center;
            var zoom = obj.zoom;
        }
        if (file_type == "kml") {
            //改变地图文件
            MY_MAP.changeMap(AJAX_URL + FLOOR_DATA[FLOOR_ID].file_2d_path,center, zoom, "kml", [], {
                extent: obj.extent,
                zoom_factor: 1.5,
                cluster_distance:30,
                cluster_text_function:cluster_test_function,
                radius_function:radius_function,
                animation_enable:true,
                animation_cache_time:MOVING_CACHE_TIME
            });
        } else {
            MY_MAP.changeMap(AJAX_URL + FLOOR_DATA[FLOOR_ID].file_2d_path, center, zoom, "image", extend, {
                extent: obj.extent,
                zoom_factor: 1.5,
                cluster_distance:30,
                cluster_text_function:cluster_test_function,
                radius_function:radius_function,
                animation_enable:true,
                animation_cache_time:MOVING_CACHE_TIME
            });
        }
        clearSession();
    });
}

/*
 初始执行
*/
$(function () {
    //地图下拉框得到所有地图
    getAllFloor();
    getNowInfo();
    setInterval(function () {
        getNowInfo();
        getIconScale();
        getAllBaseStation();
        getCamera();
        getFloorCamera();
        if(AREA_DATA){
            filteringAreas();
        }
    }, 4000);
});

/*
 下拉框切换地图
*/
$("#floor_select").change(function () {
    var floor_id = $("#floor_select").val();
    if(FLOOR_DATA[floor_id].floor_2d_file =="0"){
        HG_MESSAGE("没有相关地图文件，无法切换");
        $("#floor_select").val(FLOOR_ID);
        return;
    }
    var record = $('#example').find(".heart");
    if(record.length>0){
        $("#modal_video_download").modal("show");
        CLOSE_RECORD_FLOOR = floor_id;
        HREF = undefined;
        return false;
    }
    mapChange(floor_id);
});

/*
 左侧输入框输入卡号并回车,如果楼层上有该卡号，图标将会闪烁，如果卡号在其他楼层，则页面切换到它所在楼层
*/
$("#query_card_input").keydown(function (e) {
    if (e.keyCode == 13) {
        $("#search_card_list").html("");
        CARD = $("#query_card_input").val();
        if(!SEARCH_CARD_DATA[CARD]){
            var html = "<p style='color: #f00;font-size:16px;padding-top: 10px;padding-left: 10px;'>定位标签不存在!</p>";
            $("#search_card_list").html(html);
            $("#query_card_input").blur().val("");
            $("#query_card_input").addClass("input_change");
            setTimeout(function () {
                $("#query_card_input").removeClass("input_change");
                $("#search_card_list").html("");
            },1000);
            return;

        }
        //调用函数判断输入框的卡号是否在本楼层
        searchCard();
    }
});

/*
 左侧输入框输入卡号数字，并在输入框下面显示出模糊查询的卡号列表
*/
$("#query_card_input").keyup(function (e) {
    if (e.keyCode == 13) {
        return;
    }
    var card_id = $("#query_card_input").val();
    if(!card_id){
        $("#search_card_list").html("");
    }
    if(!$.trim(card_id)){
        card_id = undefined;
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
 点击输入框下面查询到的卡号，如果楼层上有该卡号，图标将会闪烁，如果卡号在其他楼层，则页面切换到它所在楼层
*/
$("#search_card_list").on("click",".search_card",function () {
    CARD = $(this).data("id").toString();
    $("#query_card_input").val(CARD);
    $("#search_card_list").html("");
    //调用函数判断输入框的卡号是否在本楼层
    searchCard();
});

/*
 点击定位图标弹出框或标签列表中的呼叫,进行卡号呼叫
*/
$("#example").on("click", ".call_card", function () {
    CALL_CARD_LIST = [];
    var card_id = $(this).data("card");
    CALL_CARD_LIST.push(card_id);
    callCard(CALL_CARD_LIST);
});

/*
 点击定位图标弹出框或标签列表中的视频按钮将查看距离该人员最近的摄像头的视频
*/
$("#example").on('click','.add_video_btn',function (){
    var coordinates = $(this).data('coordinates').split(','),
        x = coordinates[0],
        y = coordinates[1],
        z = FLOOR_DATA[FLOOR_ID].start,
        card_id = $(this).data('card');
    HG_AJAX('/position_sdk/ModularVideo/Equip/getTheWatcher',{
        floor_id:FLOOR_ID,
        x:x,
        y:y,
        z:z
    },'post',function (data) {
        if(data.type == 1){
            var data = data.result,
                camera_id = data;
            if(camera_id == -1){
                HG_MESSAGE('当前选择的人员标签卡不处于任何摄像头的拍摄区域!');
                return;
            }else{
                playTheCamera(undefined,camera_id,card_id);
            }
        }else{
            HG_MESSAGE(data.result);
        }
    });
});

/*
 点击定位图标弹出框中的轨迹追踪的时候，同时将标签列表里对应的选择框选中
*/
$("#example").on("click", "#add_track_btn_icon", function () {
    var card = $(this).data("card").toString();
    if(TRACK_CHECKED_INPUT[card]){
        TRACK_CHECKED_INPUT[card].flag = true;
        getNowInfo();
        var color_value = 360 * Math.random();
        MY_MAP.addTrack(card,500,"HSL("+color_value+",100%,40%)");
    }else {
        TRACK_CHECKED_INPUT[card]= {
            "flag":true,
            "card_id":card
        };
        getNowInfo();
        var color_value = 360 * Math.random();
        MY_MAP.addTrack(card,500,"HSL("+color_value+",100%,40%)");
    }
});

/*
 点击定位图标弹出框中的取消追踪的时候，同时取消选中标签列表里对应的选择框
*/
$("#example").on("click", "#cancel_track_btn_icon", function () {
    var card = $(this).data("card").toString();
    TRACK_CHECKED_INPUT[card].flag = false;
    getNowInfo();
    MY_MAP.removeOneTrack(card);
});

/*
 点击右侧菜单，跳转选择面板
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
 右侧菜单的区域列表面板中，区域列表的表头点击多选框，实现所有区域都选中
*/
$("#area").find("thead").find("input").click(function () {
    var input = $("#area").find("tbody").find("input");
    if ($(this)[0].checked) {
        for (var i = 0; i < input.length; i++) {
            if ($(input[i])[0].checked == false) {
                $(input[i])[0].checked = true;
                var index = $(input[i]).data("index");
                CHECKED_INPUT[AREA_DATA[index].id] = true;
                //调用显示区域函数，在地图上显示区域
                showArea(index,false);
            }
        }
        if(input.length <= 0){
            return;
        }
        var x = 0,y=0,array_x = [],array_y = [];
        for(var i in ALL_AREA_POINT){
            x+=ALL_AREA_POINT[i].x;
            y+=ALL_AREA_POINT[i].y;
            for (var j in ALL_AREA_POINT[i].points){
                array_x.push(ALL_AREA_POINT[i].points[j][0]);
                array_y.push(ALL_AREA_POINT[i].points[j][1]);
            }

        }
        var area_width = Math.max.apply(null,array_x) - Math.min.apply(null,array_x);
        var area_height = Math.max.apply(null,array_y) - Math.min.apply(null,array_y);
        var resolution = (area_width > area_height ? area_width / $("#map").width() : area_height / $("#map").height()) * 4;
        MY_MAP.getView().animate({resolution:resolution,center:[x/input.length,y/input.length]});
    } else {
        for (var o = 0; o < input.length; o++) {
            if ($(input[o])[0].checked == true) {
                $(input[o])[0].checked = false;
                var index = $(input[o]).data("index");
                CHECKED_INPUT[AREA_DATA[index].id] = false;
                //调用2d地图SDK中的删除一个区域
                MY_MAP.removeOneZone(AREA_DATA[index].id);
            }
        }
    }
});

/*
 单击选择框显示区域
*/
$("#area tbody").on("click", "input", function () {
    var check_flag = 0;
    var input = $("#area").find("tbody").find("input");
    var index = $(this).data("index");
    for (var i = 0; i < input.length; i++) {
        if ($(input[i])[0].checked == true) {
            check_flag++;
        }
    }
    if (check_flag == input.length) {
        $("#area thead input")[0].checked = true;
    } else {
        $("#area thead input")[0].checked = false;
    }
    if (this.checked) {
        CHECKED_INPUT[AREA_DATA[index].id] = true;
        showArea(index,true);
    } else {
        CHECKED_INPUT[AREA_DATA[index].id] = false;
        //调用2d地图SDK中的删除一个区域
        MY_MAP.removeOneZone(AREA_DATA[index].id);
    }
});

/*
 点击区域列表撤离
*/
$("#area tbody").on("click", ".call_all_card", function () {
    var area_id = [];
    area_id.push($(this).data("id"));
    //调用区域撤离接口
    HG_AJAX("/position_sdk/ModularNowInfo/NowInfo/evacuateArea",{area_id_str: area_id},"post",function (data) {
        if (data.type==1){
            HG_MESSAGE("已下发");
        }else{
            HG_MESSAGE(data.result);
        }
    });
});

/*
 点击区域列表下方的临时绘制撤离区域按钮，进行临时绘制撤离区域
*/
$("#evacuate_text").click(function () {
    if (DRAW) {
        MY_MAP.removeInteraction(DRAW);
    }
    for (var i in DRAW_ID_LIST) {
        //调用2d地图SDK中的删除一个区域
        MY_MAP.removeOneZone(DRAW_ID_LIST[i]);
    }
    NEW_AREA = {};
    DRAW_ID_LIST = [];
    ADD_DRAW_NUM = 0;
    ADD_DRAW_ID = 1000;
    $("#custom_evacuate_list").html("");
    $("#evacuate").show();
    $("#draw_box").click();
});

/*
 选择绘制圆形
*/
$("#draw_circle").click(function () {
    if(CONTROL_MEASURE){
        MY_MAP.removeControlMeasure();
        $("#measure_location").attr("src","img/mapStaff.png");
        CONTROL_MEASURE = false;
    }
    $("#draw_type").html("圆形<span class='caret'></span>");
    $("#draw_info").val("先画一个圆心,再拖动");
    if (DRAW) {
        MY_MAP.removeInteraction(DRAW);
    }
    //调用2d地图SDK中的实例化绘制圆形
    DRAW = new HG2DMap.draw.regular_polygon(64);
    //调用2d地图SDK中的addInteraction()方法，将绘制圆的对象添加到地图
    MY_MAP.addInteraction(DRAW);
    //调用2d地图SDK中，当绘制结束时触发事件
    DRAW.on("drawend", function (e) {
        ADD_DRAW_ID++;
        ADD_DRAW_NUM++;
        //调用2d地图SDK中获得所画圆的点坐标
        var polygon = e.feature.getGeometry().getCoordinates();
        EVACUATE_TMP_AREA[ADD_DRAW_ID] = areaTrans(polygon[0]);
        //调用2d地图SDK中的添加一个区域
        MY_MAP.addZone(polygon[0], ADD_DRAW_ID, "撤离区域"+ADD_DRAW_NUM);
        DRAW_ID_LIST.push(ADD_DRAW_ID);
        //调用2d地图SDK中的removeInteraction()方法，从地图上移除这个对象
        MY_MAP.removeInteraction(DRAW);
        var evacuate_area = '<div><p>撤离区域'+ADD_DRAW_NUM+'</p><i class="glyphicon glyphicon-remove" data-id=' + ADD_DRAW_ID + '></i></div>';
        $("#custom_evacuate_list").append(evacuate_area);
        $("#draw_type").html("类型<span class='caret'></span>");
        $("#draw_info").val("请选择需要绘制的类型");
        DRAW = undefined;
    })
});

/*
 选择绘制矩形
*/
$("#draw_box").click(function () {
    if(CONTROL_MEASURE){
        MY_MAP.removeControlMeasure();
        $("#measure_location").attr("src","img/mapStaff.png");
        CONTROL_MEASURE = false;
    }
    $("#draw_type").html("矩形<span class='caret'></span>");
    $("#draw_info").val("先画一个顶点,再拖动");
    if (DRAW) {
        MY_MAP.removeInteraction(DRAW);
    }
    //调用2d地图SDK中的实例化绘制矩形
    DRAW = new HG2DMap.draw.rectangle;
    //调用2d地图SDK中的addInteraction()方法，将绘制矩形的对象添加到地图
    MY_MAP.addInteraction(DRAW);
    //调用2d地图SDK中，当绘制结束时触发事件
    DRAW.on("drawend", function (e) {
        ADD_DRAW_ID++;
        ADD_DRAW_NUM++;
        //调用2d地图SDK中获得所画矩形的点坐标
        var polygon = e.feature.getGeometry().getCoordinates();
        EVACUATE_TMP_AREA[ADD_DRAW_ID] = areaTrans(polygon[0]);
        //调用2d地图SDK中的添加一个区域
        MY_MAP.addZone(polygon[0], ADD_DRAW_ID, "撤离区域"+ADD_DRAW_NUM);
        DRAW_ID_LIST.push(ADD_DRAW_ID);
        //调用2d地图SDK中的removeInteraction()方法，从地图上移除这个对象
        MY_MAP.removeInteraction(DRAW);
        var evacuate_area = '<div><p>撤离区域'+ADD_DRAW_NUM+'</p><i class="glyphicon glyphicon-remove" data-id=' + ADD_DRAW_ID + '></i></div>';
        $("#custom_evacuate_list").append(evacuate_area);
        $("#draw_type").html("类型<span class='caret'></span>");
        $("#draw_info").val("请选择需要绘制的类型");
        DRAW = undefined;
    });
});

/*
 选择绘制多边形
*/
$("#draw_polygon").click(function () {
    if(CONTROL_MEASURE){
        MY_MAP.removeControlMeasure();
        $("#measure_location").attr("src","img/mapStaff.png");
        CONTROL_MEASURE = false;
    }
    $("#draw_type").html("多边形<span class='caret'></span>");
    $("#draw_info").val("单击依次画点");
    if (DRAW) {
        MY_MAP.removeInteraction(DRAW);
    }
    //调用2d地图SDK中的实例化绘制多边形
    DRAW = new HG2DMap.draw.polygon;
    //调用2d地图SDK中的addInteraction()方法，将绘制多边形的对象添加到地图
    MY_MAP.addInteraction(DRAW);
    DRAW.on("drawend", function (e) {
        //调用2d地图SDK中获得所画多边形的点坐标
        var polygon = e.feature.getGeometry().getCoordinates();
        //判断所画的多边形是否相交
        if((polygon[0][2][0] == polygon[0][1][0]) && (polygon[0][2][1] == polygon[0][1][1])){
            HG_MESSAGE("图形不能是一条直线");
        }else if (!(HG2DMap.draw.isSelfIntersection(polygon[0]))) {
            ADD_DRAW_ID++;
            ADD_DRAW_NUM++;
            EVACUATE_TMP_AREA[ADD_DRAW_ID] = areaTrans(polygon[0]);
            //调用2d地图SDK中的添加一个区域
            MY_MAP.addZone(polygon[0], ADD_DRAW_ID, "撤离区域"+ADD_DRAW_NUM);
            DRAW_ID_LIST.push(ADD_DRAW_ID);
            //调用2d地图SDK中的removeInteraction()方法，从地图上移除这个对象
            MY_MAP.removeInteraction(DRAW);
            var evacuate_area = '<div><p>撤离区域'+ADD_DRAW_NUM+'</p><i class="glyphicon glyphicon-remove" data-id=' + ADD_DRAW_ID + '></i></div>';
            $("#custom_evacuate_list").append(evacuate_area);
            $("#draw_type").html("类型<span class='caret'></span>");
            $("#draw_info").val("请选择需要绘制的类型");
            DRAW = undefined;
        } else {
            HG_MESSAGE("图形不能自相交");
        }
    });
});

/*
 点击绘制类型右侧的取消 关闭绘制类型
*/
$("#cancel_draw").click(function () {
    if (DRAW) {
        MY_MAP.removeInteraction(DRAW);
        DRAW = undefined;
    }
    $("#draw_type").html("类型<span class='caret'></span>");
    $("#draw_info").val("请选择需要绘制的类型");
});

/*
 临时绘制撤离区域面板中，点击撤离列表中区域名字后面的小叉，将区域从列表中移除
*/
$("#custom_evacuate_list").on("click", "i", function () {
    var id = $(this).data("id");
    if ($.inArray(id, DRAW_ID_LIST) != -1) {
        //调用2d地图SDK中的删除一个区域
        MY_MAP.removeOneZone(id);
        if ($.inArray(id, DRAW_ID_LIST) != -1){
            DRAW_ID_LIST.splice($.inArray(id, DRAW_ID_LIST), 1);
            delete NEW_AREA[id];
        }
    }
    $(this).parent("div").remove();
});

/*
 点击临时绘制撤离区域页面右上方的小叉，关闭临时绘制撤离区域面板
*/
$("#evacuate").on("click", ".glyphicon-remove", function () {
    $("#cancel_leave").click();
});

/*
 点击取消按钮，清空所有自定义的区域
*/
$("#cancel_leave").click(function () {
    if (DRAW) {
        MY_MAP.removeInteraction(DRAW);
        DRAW = undefined;
    }
    for (var i in DRAW_ID_LIST) {
        //调用2d地图SDK中的删除一个区域
        MY_MAP.removeOneZone(DRAW_ID_LIST[i]);
    }
    NEW_AREA = {};
    DRAW_ID_LIST = [];
    ADD_DRAW_NUM = 0;
    ADD_DRAW_ID = 1000;
    $("#custom_evacuate_list").html("");
    $("#evacuate").hide();
});

/*
 点击确定按钮，像所有自定义区域发送撤离命令
*/
$("#sure_leave").click(function () {
    var tmp_area_array = [];
    for (var i in FLOOR_DATA) {
        if (FLOOR_DATA[i].id == FLOOR_ID) {
            var z_start = FLOOR_DATA[i].start;
            var z_end = FLOOR_DATA[i].height;
        }
    }
    for (var i in EVACUATE_TMP_AREA){
        if(EVACUATE_TMP_AREA[i]){
            tmp_area_array.push(EVACUATE_TMP_AREA[i]);
        }
    }
    if (tmp_area_array.length > 0) {
        //调用自定义区域发送撤离接口
        HG_AJAX("/position_sdk/ModularNowInfo/NowInfo/evacuateTmpArea",{
            floor_id: FLOOR_ID,
            area: tmp_area_array,
            z_start: z_start,
            z_end: z_end
        },"post",function (data) {
            if(data.type==1){
                HG_MESSAGE("已下发");
            }else {
                HG_MESSAGE(data.result);
            }
        });
    }
});

/*
 右侧菜单的标签列表面板中，标签列表的表头点击多选框，实现所有标签都选中添加轨迹追踪
*/
$("#track").find("thead").find("input").click(function (e) {
    e.stopPropagation();
    if (FEATURE) {
        $(document.getElementById('popup')).popover('hide');
        FEATURE = undefined;
    }
    var input = $("#tbody_card_info").find("input");
    if ($(this)[0].checked) {
        for (var i = 0; i < input.length; i++) {
            if ($(input[i])[0].checked == false) {
                $(input[i])[0].checked = true;
                var id = $(input[i]).data("id").toString();
                var color_value = 360 * Math.random();
                MY_MAP.addTrack(id,500,"HSL("+color_value+",100%,40%)");
                TRACK_CHECKED_INPUT[id]= {
                    "flag":true,
                    "card_id":id
                }
            }
        }
    } else {
        for (var o = 0; o < input.length; o++) {
            if ($(input[o])[0].checked == true) {
                $(input[o])[0].checked = false;
                var id = $(input[o]).data("id").toString();
                MY_MAP.removeOneTrack(id);
                TRACK_CHECKED_INPUT[id]= {
                    "flag":false,
                    "card_id":id
                };
            }
        }
        getNowInfo();
    }
});

/*
 单击选择框添加标签的轨迹追踪
*/
$("#tbody_card_info").on("click", "input", function (e) {
    e.stopPropagation();
    if (FEATURE) {
        $(document.getElementById('popup')).popover('hide');
        FEATURE = undefined;
    }
    var check_flag = 0;
    var input = $("#tbody_card_info").find("input");
    var id = $(this).data("id").toString();
    if (this.checked) {
        var color_value = 360 * Math.random();
        MY_MAP.addTrack(id,500,"HSL("+color_value+",100%,40%)");
        TRACK_CHECKED_INPUT[id]= {
            "flag":true,
            "card_id":id
        };
    } else {
        MY_MAP.removeOneTrack(id);
        TRACK_CHECKED_INPUT[id]= {
            "flag":false,
            "card_id":id
        };
        getNowInfo();
    }
    for (var i = 0; i < input.length; i++) {
        if ($(input[i])[0].checked == true) {
            check_flag++;
        }
    }
    if (check_flag == input.length) {
        $("#track thead input")[0].checked = true;
    } else {
        $("#track thead input")[0].checked = false;
    }
});

/*
 点击标签列表里的清除轨迹，清除当前已画好的所有标签的轨迹
*/
$("#clear_track_btn").click(function () {
    MY_MAP.clearAllTrack();
});

/*
 点击标签列表里的视点追踪，确定对当前卡进行视点追踪，并且同时进行轨迹追踪
*/
$("#tbody_card_info").on("click","b",function () {
    var card = $(this).data("card");
    if($(this).attr("class") == "glyphicon glyphicon-ok"){
        $(this).attr("class","glyphicon glyphicon-ok active");
        $(this).parent().parent().siblings().find("b").attr("class","glyphicon glyphicon-ok");
        CARD_VIEWPOINT_TRACK = card;
        if(TRACK_CHECKED_INPUT[card] && TRACK_CHECKED_INPUT[card].flag == false){
            TRACK_CHECKED_INPUT[card].flag = true;
            getNowInfo();
            var color_value = 360 * Math.random();
            MY_MAP.addTrack(card,500,"HSL("+color_value+",100%,40%)");
        }else if(!TRACK_CHECKED_INPUT[card]) {
            TRACK_CHECKED_INPUT[card]= {
                "flag":true,
                "card_id":card
            };
            getNowInfo();
            var color_value = 360 * Math.random();
            MY_MAP.addTrack(card,500,"HSL("+color_value+",100%,40%)");
        }
    }else{
        $(this).attr("class","glyphicon glyphicon-ok");
        CARD_VIEWPOINT_TRACK = undefined;
    }
});

/*
 开启或关闭聚类显示
 */
$("#change_show_cluster").click(function () {
    if(ICON_SCALE <= 0.2){
        HG_MESSAGE("热力图状态，不能操作聚类显示");
        return;
    }
    //聚类处于开启状态
    if(sessionStorage.getItem("show_cluster") == "on"){
        sessionStorage.setItem("show_cluster","off");
        $(this).html("开启聚类显示");
        if(MY_MAP.getClusterEnable()){
            MY_MAP.disableCluster();
        }
    }
    //聚类处于关闭状态
    else if(sessionStorage.getItem("show_cluster") == "off") {
        sessionStorage.setItem("show_cluster","on");
        $(this).html("关闭聚类显示");
        if(!MY_MAP.getClusterEnable()){
            MY_MAP.enableCluster(30);
        }
    }
});

/*
 点击摄像头列表里的查看，中心视点切换至摄像头具体位置
*/
$("#table_equip").on("click",".show_camera",function () {
    var id = $(this).data("id");
    MY_MAP.setZoom(41);
    MY_MAP.setCenter(ALL_CAMERA[id].x,ALL_CAMERA[id].y);
});

/*
 测距工具
*/
$("#measure_location").click(function () {
    if (DRAW) {
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
 按ESC取消绘制图形和测距
*/
$(document).keydown(function (e) {
    if (DRAW){
        if (e.which === 27) {
            if($("#draw_type").html() == '圆形<span class="caret"></span>'){
                $("#draw_circle").click();
            }else if($("#draw_type").html() == '多边形<span class="caret"></span>'){
                $("#draw_polygon").click();
            }else {
                $("#draw_box").click();
            }
        }

    }else {
        if (e.which === 27) {
            MY_MAP.removeControlMeasure();
            $("#measure_location").attr("src","img/mapStaff.png");
            CONTROL_MEASURE = false;
        }

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
    if(FLOOR_DATA[FLOOR_ID] && FLOOR_DATA[FLOOR_ID].floor_2d_file == "1"){
        var obj = mapAutomaticSetting(FLOOR_DATA[FLOOR_ID].floor_scaling_ratio, FLOOR_DATA[FLOOR_ID].origin_x, FLOOR_DATA[FLOOR_ID].origin_y, FLOOR_DATA[FLOOR_ID].drop_multiple, [FLOOR_DATA[FLOOR_ID].coordinate_left, FLOOR_DATA[FLOOR_ID].coordinate_down, FLOOR_DATA[FLOOR_ID].coordinate_right, FLOOR_DATA[FLOOR_ID].coordinate_upper], "map");
        var center = obj.center;
        var zoom = obj.zoom;
    }else {
        var center = [0,0];
        var zoom = 38;
    }
    //调用2d地图SDK中设置地图中心视点
   MY_MAP.setCenter(center[0],center[1]);
    //调用2d地图SDK中设置地图缩放比
   MY_MAP.setZoom(zoom);
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

