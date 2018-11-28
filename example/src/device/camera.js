var FLOOR_ID;//当前的楼层id
var MY_MAP;//地图场景对象,SDK基本都在MY_MAP对象上进行操作
var NOW_PAGE = 1;//分页的当前页
var LIMIT = 20;//分页每页显示数量
var TOTAL_PAGE;//分页总页数
var FLOOR_DATA = {};//存储所有楼层信息的对象
var DRAW = false; //绘画模式是否开启
var DRAWING = false;//正在绘制的时候,进行其他操作将会弹出提示框
var AREA = {
    area: "",
    z_start: "",
    z_end: "",
    area_id:1001,
    area_style:""
};//监控范围的区域参数初始化
var EQUIP_DATA = {};//存储当前地图里的所有摄像头数据
var ALL_EQUIP_DATA = {};//存储所有摄像头数据
var EQUIP_ID;//用于编辑的摄像头id
var MOVE_FEATURE;//新增摄像头时，随鼠标移动的摄像头图标对象
var MOVE_LOCATION_X;//移动的摄像头图标对象的x坐标
var MOVE_LOCATION_Y;//移动的摄像头图标对象的y坐标
var FEATURE_OBJ = {};//所有摄像头图标对象
var VIDEO_PLAYER;//视频播放器
var ICON_SCALE;//当地图缩放时，地图上的图标需要缩放的比例值
var TEXT_SCALE;//当地图缩放时，地图上的图标的字需要缩放的比例值
var VIDEO_SPEED;//摄像头转动速度
var VIDEO_WIDTH;//摄像头视频宽度
var VIDEO_HEIGHT;//摄像头视频高度
var NEW_EQUIP = {};//存储搜索到的未添加的摄像头对象
var EDIT_IP;//用于新增、编辑的搜索到的未添加的摄像头的IP
var TIME_OBJ = {
    "mon_time_list":{},
    "tue_time_list":{},
    "wed_time_list":{},
    "thu_time_list":{},
    "fri_time_list":{},
    "sat_time_list":{},
    "sun_time_list":{}
};//录像计划的时间对象初始化
var WEEK_ID;//用于编辑的星期数
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
 地图初始化
*/
function mapInit(url,map_zoom,extend,center,extent) {
    //显示地图加载图标
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
    var my_mouse_postion = new HG2DMap.control.mouse_position();//调用2d地图SDK中的实例化鼠标坐标工具
    var my_scale_line = new HG2DMap.control.scale_line();//调用2d地图SDK中的实例化比例尺工具
    var my_drag_rotate = new HG2DMap.draw.drag_rotate();//调用2d地图SDK中的地图旋转
    MY_MAP.addInteraction(my_drag_rotate);//调用2d地图SDK中的给地图添加地图旋转
    MY_MAP.addControl(my_mouse_postion);//调用2d地图SDK中的给地图添加鼠标坐标工具
    MY_MAP.addControl(my_scale_line);//调用2d地图SDK中的给地图添加比例尺工具
    //鼠标点击地图的时候 若是点到了图标，则打开视频播放器
    MY_MAP.on('click', function (e) {
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
            //如果图标对象是定位图标，则打开视频播放器
            if (feature.equip_id) {
                MY_MAP.getTarget().style.cursor = 'pointer';
                if(VIDEO_PLAYER){
                    VIDEO_PLAYER.close();
                    VIDEO_PLAYER = null;
                    $('#map .hg_video_container').remove();
                }
                playTheCamera(EQUIP_DATA[feature.equip_id].name,EQUIP_DATA[feature.equip_id].user,EQUIP_DATA[feature.equip_id].password,EQUIP_DATA[feature.equip_id].rtsp_url,EQUIP_DATA[feature.equip_id].ip,EQUIP_DATA[feature.equip_id].port,false);
            }
            else {
                MY_MAP.getTarget().style.cursor = '';
            }
        }else {
            MY_MAP.getTarget().style.cursor = '';
        }
    });
    //地图加载进度
    MY_MAP.on('progress',function (e) {
        var progress = e.progress*100;
        $(".progress_bar p").html(progress.toFixed(1)+"%");
        $(".progress_bar_top").css("width",progress+"%");
    });
    //当地图加载完成后
    MY_MAP.on('loaded',function () {
        $("#loading_img").hide();
        if(FLOOR_ID){
            getIconScale();
            MY_MAP.setMapTextScale(TEXT_SCALE);
            getEquip();
            MY_MAP.getView().on('change:zoom', function () {
                getIconScale();
                MY_MAP.setMapTextScale(TEXT_SCALE);
                changeCamera(ICON_SCALE,TEXT_SCALE);
            });
        }
    });
}

/*
 获取视频的分辨率以及摄像头云台转动速度
*/
(function getVideoSizeAndSpeed() {
    HG_AJAX('/position_sdk/ModularVideo/Equip/getVideoSize',{},'post',function (data) {
        if(data.type == 1){
            var data = data.result;
            VIDEO_SPEED = parseFloat(data.CAMERA_PTZ_SPEED);
            VIDEO_WIDTH = parseFloat(data.CAMERA_USER_WIDTH);
            VIDEO_HEIGHT = parseFloat(data.CAMERA_USER_HEIGHT);
        }else{
            VIDEO_SPEED = 0.2;
            VIDEO_WIDTH = 640;
            VIDEO_HEIGHT = 480;
        }
    })
})();

/*
 绘制区域图形转字符串
*/
function areaTrans(array) {
    var string = array.join(" ");
    return string;
}

/*
 截取字符串的长度
*/
function stringSlice(value) {
    if(!value){
        return "--";
    }else if(value.length > 8) {
        return value.slice(0,8)+"...";
    }else {
        return value;
    }
}

/*
 字符串转区域图形
*/
function transArea(string) {
    var array = string.split(" ");
    var point_array = [];
    for (var i in array) {
        point_array.push([parseFloat(array[i].split(",")[0]),parseFloat(array[i].split(",")[1])]);
    }
    return point_array;
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
 当地图的缩放比变化时，摄像头的图标跟着一起缩放
*/
function changeCamera(icon_scale,text_scale) {
    MY_MAP.removeAllFeature();
    if(icon_scale > 0.2){
        //当icon_scale>0.2时，改变摄像头图标的大小
        for(var i in EQUIP_DATA){
            var feature = new HG2DMap.feature.point([EQUIP_DATA[i].place_x,EQUIP_DATA[i].place_y], {icon:"img/camera.png",text:EQUIP_DATA[i].name,icon_scale:icon_scale,text_scale:text_scale});
            feature.equip_id = EQUIP_DATA[i].id;
            MY_MAP.addFeature(feature);
            FEATURE_OBJ[EQUIP_DATA[i].id] = feature;
        }
        if(MOVE_FEATURE){
            MOVE_FEATURE = new HG2DMap.feature.point([MOVE_LOCATION_X,MOVE_LOCATION_Y], {icon:"img/camera.png",text:"",icon_scale:icon_scale,text_scale:text_scale});
            MY_MAP.addFeature(MOVE_FEATURE);
        }
    }
}

/*
 地图视图里得到所有摄像头
*/
function getEquip() {
    MY_MAP.removeAllZone();
    MY_MAP.removeAllFeature();
    MOVE_FEATURE = undefined;
    $("#add_list").hide();
    EQUIP_DATA = {};
    FEATURE_OBJ = {};
    HG_AJAX("/position_sdk/ModularVideo/Equip/getEquip",{floor_id:FLOOR_ID},"post",function (data) {
        if(data.type == 1){
            $('#popup').popover('hide');
            var data = data.result;
            var html = "";
            $(data).each(function (index,ele) {
                html += '<tr><td>' + this.name + '</td><td><i class="glyphicon glyphicon-edit edit_equip" data-id="' + this.id + '"></i><i class="glyphicon glyphicon-trash delete_equip" data-id="' + this.id + '"></i></tr>';
                EQUIP_DATA[this.id] = this;
                if(ICON_SCALE > 0.2){
                    var feature = new HG2DMap.feature.point([this.place_x,this.place_y], {icon:"img/camera.png",text:this.name,icon_scale:ICON_SCALE,text_scale:TEXT_SCALE});
                    feature.equip_id = this.id;
                    MY_MAP.addFeature(feature);
                    FEATURE_OBJ[this.id] = feature;
                }
                if(this.real_area){
                    MY_MAP.addZone(transArea(this.real_area), this.id, this.name+"监控区域",this.area_style);  //新加区域
                }
            });
            $("#table_camera").html(html);
        }
    })
}

/*
 检测筛选输入框为全部或空的方法
*/
function checkIsAll(value){
    if(value == 'all' || !$.trim(value)){
        return undefined;
    }
    return value;
}

/*
 列表视图分页
*/
function getPage() {
    laypage({
        cont: 'pages', //容器。值支持id名、原生dom对象，jquery对象。【如该容器为】：<div id="page1"></div>
        pages: TOTAL_PAGE, //通过后台拿到的总页数
        curr: NOW_PAGE, //初始化当前页
        skin: '#4ba9dc',//皮肤颜色
        groups: 5, //连续显示分页数
        skip: false, //是否开启跳页
        first: '首页', //若不显示，设置false即可
        last: '尾页', //若不显示，设置false即可
        prev: '上一页', //若不显示，设置false即可
        next: '下一页', //若不显示，设置false即可
        jump: function (obj, first) { //触发分页后的回调
            if (!first) {
                NOW_PAGE = obj.curr;
                getAllEquip();
            }
        }
    });
}

/*
 列表视图获取信息总数
*/
function getCount() {
    var name = checkIsAll($("#search_name").val());
    HG_AJAX("/position_sdk/ModularVideo/Equip/getCount", {name:name},"post",function (data) {
        if (data.type == 1) {
            var count = data.result;
            TOTAL_PAGE = Math.ceil(count / LIMIT);
            if (TOTAL_PAGE < NOW_PAGE) {
                NOW_PAGE = TOTAL_PAGE;
                getAllEquip();
            }
            $("#page_count").html(count);
            getPage();
        }
    });
}

/*
 列表视图里添加和修改录像计划的切换
*/
function hasRecord(value) {
    if(value == 0){
        return "<a class='add_nvr' style='padding-right: 10px;'>添加录像计划</a>";
    }else {
        return "<a class='edit_nvr' style='padding-right: 10px;'>修改录像计划</a><a class='del_nvr' style='padding-right: 10px;'>删除录像计划</a>";
    }
}

/*
 列表视图获取信息
*/
function getAllEquip() {
    var name = checkIsAll($("#search_name").val());
    HG_AJAX("/position_sdk/ModularVideo/Equip/getEquip",{name:name,page:NOW_PAGE,limit:LIMIT},"post",function (data) {
        if (data.type == 1) {
            var result = data.result;
            var html = "";
            if(NOW_PAGE == 0){
                NOW_PAGE = 1;
            }
            $(result).each(function (index,ele) {
                ALL_EQUIP_DATA[this.id] = this;
                html += "<tr>"+"<td>" + (index + 1  + ((NOW_PAGE - 1 ) * LIMIT)) + "</td>" +
                    "<td>" + this.name + "</td>" +
                    "<td>" + this.scene_name + "</td>" +
                    "<td>" + this.building_name + "</td>" +
                    "<td>" + this.floor_name + "</td>" +
                    "<td>X：" + parseFloat(this.place_x).toFixed(2) + "，Y：" + parseFloat(this.place_y).toFixed(2) +"，Z：" + parseFloat(this.place_z).toFixed(2) +"</td>" +
                    "<td data-id='" + this.id + "'><a class='show_map' data-id='" + this.id + "' href='#map_view' aria-controls='list_view' role='tab' data-toggle='tab'>查看</a><a data-id='" + this.id + "' class='delete_list' style='padding-right: 10px;'>删除</a>"+hasRecord(this.order)+"<a data-id='" + this.id + "' class='show_record_list' style='padding-right: 10px;'>查看录像结果</a></td></tr>"
            });
            $("#list_view_table tbody").html(html);
        }
    });


}

/*
 初始执行
*/
$(function () {
    //地图下拉框得到所有地图
    getAllFloor();
    //列表视图获取摄像头信息
    getCount();
    getAllEquip();
    $('.demo').each(function () {
        $(this).minicolors({
            control: $(this).attr('data-control') || 'hue',
            defaultValue: $(this).attr('data-defaultValue') || '',
            format: $(this).attr('data-format') || 'hex',
            keywords: $(this).attr('data-keywords') || '',
            inline: $(this).attr('data-inline') === 'true',
            letterCase: $(this).attr('data-letterCase') || 'lowercase',
            opacity: $(this).attr('data-opacity'),
            position: $(this).attr('data-position') || 'bottom left',
            swatches: $(this).attr('data-swatches') ? $(this).attr('data-swatches').split('|') : [],
            change: function (value, opacity) {
                if (!value) return;
                if (opacity) value += ', ' + opacity;
            },
            theme: 'bootstrap'
        });
    });
});

/*
 地图视图里切换地图
*/
$("#floor_select").change(function () {
    var floor_id = $("#floor_select").val();
    if($("#add_list").css("display") == "block"){
        HG_MESSAGE("正在操作中，不能切换");
        return;
    }
    //如果已点击了新增摄像头，则取消新增摄像头事件
    if(MOVE_FEATURE){
        MY_MAP.un("pointermove",moveCamera);
        MY_MAP.un("click",addCamera);
        MY_MAP.removeFeature(MOVE_FEATURE);
        MOVE_FEATURE = undefined;
        MY_MAP.getTarget().style.cursor = "";
        $(document.getElementById('popup')).popover('hide');
    }
    if(FLOOR_DATA[floor_id].floor_2d_file =="0"){
        HG_MESSAGE("没有相关地图文件，无法切换");
        $("#floor_select").val(FLOOR_ID);
        return;
    }
    FLOOR_ID = floor_id;
    MY_MAP.reset();
    $("#add_list").hide();
    //获得切换后的场景、建筑、楼层id
    var file_type = FLOOR_DATA[FLOOR_ID].file_2d_postfix;
    var extend = [FLOOR_DATA[FLOOR_ID].coordinate_left,FLOOR_DATA[FLOOR_ID].coordinate_down,FLOOR_DATA[FLOOR_ID].coordinate_right,FLOOR_DATA[FLOOR_ID].coordinate_upper];
    //调用计算自动缩放比
    var obj = mapAutomaticSetting(FLOOR_DATA[FLOOR_ID].floor_scaling_ratio,FLOOR_DATA[FLOOR_ID].origin_x,FLOOR_DATA[FLOOR_ID].origin_y,FLOOR_DATA[FLOOR_ID].drop_multiple,extend,"map");
    //显示地图加载图标
    var is_show = $("#loading_img").css("display");
    if(is_show == "none"){
        $("#loading_img").show();
    }
    if (file_type == "kml"){
        //改变地图文件
        MY_MAP.changeMap(AJAX_URL + FLOOR_DATA[FLOOR_ID].file_2d_path, obj.center, obj.zoom,"kml",[],{extent: obj.extent,zoom_factor:1.5});
    }else {
        MY_MAP.changeMap(AJAX_URL + FLOOR_DATA[FLOOR_ID].file_2d_path, obj.center, obj.zoom,"image",extend,{extent: obj.extent,zoom_factor:1.5});
    }
});

/*
 地图上移动鼠标上摄像头图标事件
*/
var moveCamera = function (e) {
    if (e.dragging) {
        return;
    }
    //得到鼠标的像素点
    var pixel = MY_MAP.getEventPixel(e.originalEvent);
    //得到该像素点的坐标
    var location_x = MY_MAP.getCoordinateFromPixel(pixel)[0].toFixed(2);
    var location_y = MY_MAP.getCoordinateFromPixel(pixel)[1].toFixed(2);
    MOVE_LOCATION_X = location_x;
    MOVE_LOCATION_Y = location_y;
    MOVE_FEATURE.setCoordinates([location_x,location_y]);
};

/*
 地图上点击增加摄像头事件
*/
var addCamera = function (e) {
    if(ICON_SCALE <= 0.2){
        HG_MESSAGE("地图缩放比太小，不能新增");
        return;
    }
    MY_MAP.un("pointermove",moveCamera);
    MY_MAP.removeFeature(MOVE_FEATURE);
    if (e.dragging) {
        return;
    }
    //得到鼠标点击地图时的像素点
    var pixel = MY_MAP.getEventPixel(e.originalEvent);
    //得到该像素点的坐标
    var location_x = MY_MAP.getCoordinateFromPixel(pixel)[0].toFixed(2);
    var location_y = MY_MAP.getCoordinateFromPixel(pixel)[1].toFixed(2);
    MOVE_FEATURE = new HG2DMap.feature.point([location_x,location_y], {icon:"img/camera.png",text:"",icon_scale:ICON_SCALE,text_scale:TEXT_SCALE});
    MY_MAP.addFeature(MOVE_FEATURE);
    $("#add_camera_name").val("");
    $("#add_user_name").val("");
    $("#add_password").val("");
    $("#add_camera_address").val("");
    $("#select_video_stream").html("");
    $("#add_ip").val("");
    $("#add_port").val(80);
    $("#add_location_x").val(location_x);
    $("#add_location_y").val(location_y);
    $("#add_location_z").val((parseFloat(FLOOR_DATA[FLOOR_ID].height) - parseFloat(FLOOR_DATA[FLOOR_ID].start))/2);
    $("#add_text").show();
    $("#edit_text").hide();
    $("#edit_save_camera").hide();
    $("#save_camera").show();
    $("#repeat_draw").hide();
    $("#draw_type_menu").show();
    $("#ptz_status").hide();
    $("#chose_status").hide();
    $("#ptz").hide();
    $("#ptz input").val("");
    $("#auto_get_text").hide();
    $("#draw_type").html("类型<span class='caret'></span>");
    $("#draw_info").val("请选择绘制的类型");
    AREA = {
        area: "",
        z_start: "",
        z_end: "",
        area_id:1001,
        area_style:""
    };
    $("#add_list").show();
    MY_MAP.un("click",addCamera);
};

/*
 点击新增摄像头
*/
$("#add_camera").click(function (e) {
    if($("#add_list").css("display") == "block"){
        HG_MESSAGE("正在操作中，不能新建");
        return;
    }
    if(MOVE_FEATURE){
        return;
    }
    if (e.dragging) {
        return;
    }
    MY_MAP.getTarget().style.cursor = "pointer";
    //得到鼠标的像素点
    var pixel = MY_MAP.getEventPixel(e.originalEvent);
    //得到该像素点的坐标
    var location_x = MY_MAP.getCoordinateFromPixel(pixel)[0].toFixed(2);
    var location_y = MY_MAP.getCoordinateFromPixel(pixel)[1].toFixed(2);
    if(ICON_SCALE <= 0.2){
        HG_MESSAGE("地图缩放比太小，不能新增");
        return;
    }
    MOVE_FEATURE = new HG2DMap.feature.point([location_x,location_y], {icon:"img/camera.png",text:"",icon_scale:ICON_SCALE,text_scale:TEXT_SCALE});
    MY_MAP.addFeature(MOVE_FEATURE);
    MOVE_LOCATION_X = location_x;
    MOVE_LOCATION_Y = location_y;
    MY_MAP.on("pointermove",moveCamera);
    MY_MAP.on("click",addCamera);
});

/*
 选择圆形绘制
*/
$("#draw_circle").click(function () {
    if(CONTROL_MEASURE){
        MY_MAP.removeControlMeasure();
        $("#measure_location").attr("src","img/mapStaff.png");
        CONTROL_MEASURE = false;
    }
    if (DRAWING) {
        return;
    }
    $("#draw_type").html("圆形<span class='caret'></span>");
    $("#draw_info").val("先画一个圆心,再拖动");
    if (DRAW) {
        MY_MAP.removeInteraction(DRAW);
    }
    DRAW = new HG2DMap.draw.regular_polygon(64); //实例化一个绘制圆形的方法(64个点组成的圆,可配置)
    MY_MAP.addInteraction(DRAW); //将绘制圆的方法添加到地图对象中
    //绘制完成后,得到所绘制图形的坐标点,将图形添加到场景中,并且删除绘制圆形的方式,方便再次添加绘制方法
    DRAW.on("drawend", function (e) {
        var polygon = e.feature.getGeometry().getCoordinates(); //获取图形坐标点
        AREA.area = areaTrans(polygon[0]);
        MY_MAP.addZone(polygon[0], AREA.area_id, "监控区域");  //新加区域
        $("#input_area_z_start_add").val(0);
        $("#input_area_z_end_add").val(parseFloat(FLOOR_DATA[FLOOR_ID].height) - parseFloat(FLOOR_DATA[FLOOR_ID].start));
        $("#modal_area_add_set").modal("show");
        $("#modal_area_add_set").find(".minicolors-swatch-color").css("background-color", "rgba(52, 64, 158, 0.5)");
        $("#area_color_set").val("rgba(52, 64, 158, 0.5)");
        MY_MAP.removeInteraction(DRAW);  //删除绘制方式
        DRAW = undefined;
    });
});

/*
 选择矩形绘制
*/
$("#draw_box").click(function () {
    if(CONTROL_MEASURE){
        MY_MAP.removeControlMeasure();
        $("#measure_location").attr("src","img/mapStaff.png");
        CONTROL_MEASURE = false;
    }
    if (DRAWING) {
        return;
    }
    if (DRAW) {
        MY_MAP.removeInteraction(DRAW);
    }
    $("#draw_type").html("矩形<span class='caret'></span>");
    $("#draw_info").val("先画一个顶点,再拖动");
    DRAW = new HG2DMap.draw.rectangle; //实例化一个绘制矩形的方法
    MY_MAP.addInteraction(DRAW);  //将绘制矩形方法添加到场景
    //绘制完成后,得到所绘制图形的坐标点,将图形添加到场景中,并且删除绘制矩形形的方式,方便再次添加绘制方法
    DRAW.on("drawend", function (e) {
        var polygon = e.feature.getGeometry().getCoordinates(); //获取图形坐标点
        AREA.area = areaTrans(polygon[0]);
        MY_MAP.addZone(polygon[0], AREA.area_id, "监控区域"); //新加区域
        $("#input_area_z_start_add").val(0);
        $("#input_area_z_end_add").val(parseFloat(FLOOR_DATA[FLOOR_ID].height) - parseFloat(FLOOR_DATA[FLOOR_ID].start));
        $("#modal_area_add_set").modal("show");
        $("#modal_area_add_set").find(".minicolors-swatch-color").css("background-color", "rgba(52, 64, 158, 0.5)");
        $("#area_color_set").val("rgba(52, 64, 158, 0.5)");
        MY_MAP.removeInteraction(DRAW);  //删除绘制方式
        DRAW = undefined;
    });
});

/*
 选择多边形绘制
*/
$("#draw_polygon").click(function () {
    if(CONTROL_MEASURE){
        MY_MAP.removeControlMeasure();
        $("#measure_location").attr("src","img/mapStaff.png");
        CONTROL_MEASURE = false;
    }
    if (DRAWING) {
        return;
    }
    if (DRAW) {
        MY_MAP.removeInteraction(DRAW);
    }
    $("#draw_type").html("多边形<span class='caret'></span>");
    $("#draw_info").val("单击依次画点");
    DRAW = new HG2DMap.draw.polygon; //实例化一个绘制多边形的方法
    MY_MAP.addInteraction(DRAW); //将绘制矩形的方法添加入场景
    //绘制完成后,得到所绘制图形的坐标点,将图形添加到场景中,并且删除绘制多边形的方式,方便再次添加绘制方法
    DRAW.on("drawend", function (e) {
        var polygon = e.feature.getGeometry().getCoordinates(); //获取图形坐标点
        //多边形绘制完成后会判断图形是否自相交,使用SDK中的isSelfIntersection()判断
        if((polygon[0][2][0] == polygon[0][1][0]) && (polygon[0][2][1] == polygon[0][1][1])){
            HG_MESSAGE("图形不能是一条直线");
        }else if(!(HG2DMap.draw.isSelfIntersection(polygon[0]))) {
            AREA.area = areaTrans(polygon[0]);
            MY_MAP.addZone(polygon[0], AREA.area_id, "监控区域"); //新加区域
            $("#input_area_z_start_add").val(0);
            $("#input_area_z_end_add").val(parseFloat(FLOOR_DATA[FLOOR_ID].height) - parseFloat(FLOOR_DATA[FLOOR_ID].start));
            $("#modal_area_add_set").modal("show");
            $("#modal_area_add_set").find(".minicolors-swatch-color").css("background-color", "rgba(52, 64, 158, 0.5)");
            $("#area_color_set").val("rgba(52, 64, 158, 0.5)");
            MY_MAP.removeInteraction(DRAW);  //删除绘制方式
            DRAW = undefined;
        } else {
            HG_MESSAGE("图形不能自相交");
        }
    });
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
    }else if(MOVE_FEATURE && $("#add_list").css("display") == "none" ){
        if (e.which === 27) {
            MY_MAP.un("pointermove",moveCamera);
            MY_MAP.un("click",addCamera);
            MY_MAP.removeFeature(MOVE_FEATURE);
            MOVE_FEATURE = undefined;
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
 新建区域颜色设置
*/
$("#area_color_set").change(function () {
    var val = $(this).val();
    MY_MAP.setZoneColor(AREA.area_id, val); //设置区域的颜色
});

/*
 点击绘制类型右侧的取消,关闭绘制类型
*/
$("#cancel_draw").click(function () {
    if (DRAW) {
        MY_MAP.removeInteraction(DRAW);
        DRAW = undefined;
    }
    $("#draw_type").html("类型<span class='caret'></span>");
    $("#draw_info").val("请选择绘制的类型");
});

/*
 点击保存绘制的区域
*/
$("#button_area_add_save").click(function () {
    AREA.area_style = $("#area_color_set").val();
    AREA.z_start = $("#input_area_z_start_add").val();
    AREA.z_end = $("#input_area_z_end_add").val();
    if ((!AREA.z_start) || (isNaN(AREA.z_start))){
        HG_MESSAGE("无效的起始高度");
        return;
    }
    if ((!AREA.z_end) || (isNaN(AREA.z_end))){
        HG_MESSAGE("无效的结束高度");
        return;
    }
    if (parseFloat(AREA.z_start) > parseFloat(AREA.z_end)) {
        HG_MESSAGE("起始高度不能大于结束高度");
        return;
    }
    DRAWING = true;
    $("#repeat_draw").show();
    $("#draw_type_menu").hide();
    $("#modal_area_add_set").modal("hide");
});

/*
 点击取消绘制的区域
*/
$("#button_area_add_cancel").click(function () {
    MY_MAP.removeOneZone(AREA.area_id);
    $("#repeat_draw").hide();
    DRAWING = false;
    $("#draw_type_menu").show();
    $("#draw_type").html("类型<span class='caret'></span>");
    $("#draw_info").val("请选择绘制的类型");
});

/*
 点击重绘区域
*/
$("#repeat_draw").click(function () {
    MY_MAP.removeOneZone(AREA.area_id);
    DRAWING = false;
    AREA = {
        area: "",
        z_start: "",
        z_end: "",
        area_id:1001,
        area_style:""
    };
    $("#draw_type_menu").show();
    $("#draw_box").click();
    $("#repeat_draw").hide();
});

/*
 鼠标在摄像头x坐标值输入框聚焦时，判断是否有已绘制的监控区域
*/
$("#add_location_x").focus(function () {
    if(AREA.area){
        $("#modal_del_area").modal("show");
    }
});

/*
 鼠标在摄像头y坐标值输入框聚焦时，判断是否有已绘制的监控区域
*/
$("#add_location_y").focus(function () {
    if(AREA.area){
        $("#modal_del_area").modal("show");
    }
});

/*
 鼠标在摄像头x坐标值输入框失焦时，修改摄像头图标的位置
*/
$("#add_location_x").blur(function () {
    var location_x = $("#add_location_x").val();
    var location_y = $("#add_location_y").val();
    if(MOVE_FEATURE){
        MOVE_FEATURE.setCoordinates([location_x,location_y]);
        MOVE_LOCATION_X = location_x;
        MOVE_LOCATION_Y = location_y;
    }else {
        if(FEATURE_OBJ[EQUIP_ID]){
            FEATURE_OBJ[EQUIP_ID].setCoordinates([location_x,location_y]);
            EQUIP_DATA[EQUIP_ID].place_x = location_x;
            EQUIP_DATA[EQUIP_ID].place_y = location_y;
        }
    }
});

/*
 鼠标在摄像头y坐标值输入框失焦时，修改摄像头图标的位置
*/
$("#add_location_y").blur(function () {
    var location_x = $("#add_location_x").val();
    var location_y = $("#add_location_y").val();
    if(MOVE_FEATURE){
        MOVE_FEATURE.setCoordinates([location_x,location_y]);
        MOVE_LOCATION_X = location_x;
        MOVE_LOCATION_Y = location_y;
    }else {
        if(FEATURE_OBJ[EQUIP_ID]){
            FEATURE_OBJ[EQUIP_ID].setCoordinates([location_x,location_y]);
            EQUIP_DATA[EQUIP_ID].place_x = location_x;
            EQUIP_DATA[EQUIP_ID].place_y = location_y;
        }
    }
});

/*
 鼠标在链接地址输入框聚焦时，自动获取链接地址
*/
$("#add_camera_address").focus(function () {
    var user_name = $("#add_user_name").val();
    var password = $("#add_password").val();
    var ip = $("#add_ip").val();
    var port = $("#add_port").val();
    if(!$("#add_camera_address").val()){
        HG_AJAX("/position_sdk/ModularVideo/Equip/getEquipSupport",{ip:ip,port:port,user:user_name,password:password},"post",function (data) {
            if(data.type == 1){
                var data = data.result.stream;
                var option = "";
                for(var i in data){
                    if(i == 0){
                        var name = "主码流：";
                    }else if(i == 1){
                        var name = "子码流：";
                    }else {
                        var name = "第三码流：";
                    }
                    option+="<option value='"+data[i].url+"'>"+name+checkNull(data[i].video_width)+"*"+checkNull(data[i].video_height)+"</option>"
                }
                $("#select_video_stream").html(option);
                $("#add_camera_address").val(data[0].url);
                $("#auto_get_text").hide();
            }else {
                $("#select_video_stream").html("");
                $("#add_camera_address").val("");
                $("#auto_get_text").show();
            }
        })
    }
});

/*
 选择不同码流的链接地址
*/
$("#select_video_stream").change(function () {
    $("#add_camera_address").val($(this).val());
});

/*
 改变坐标值，确认删除已绘制的监控区域
*/
$("#sure_del_area").click(function () {
    MY_MAP.removeOneZone(AREA.area_id);
    AREA.area = "";
    $("#modal_del_area").modal("hide");
    $("#draw_type_menu").show();
    $("#draw_type").html("类型<span class='caret'></span>");
    $("#draw_info").val("请选择绘制的类型");
    $("#repeat_draw").hide();
    DRAWING = false;
});

/*
 保存新增的摄像头
*/
$("#save_camera").click(function () {
    if (DRAW) {
        MY_MAP.removeInteraction(DRAW);
        DRAW = undefined;
    }
    DRAWING = false;
    var name = $("#add_camera_name").val();
    var user_name = $("#add_user_name").val();
    var password = $("#add_password").val();
    var url = $("#add_camera_address").val();
    var ip = $("#add_ip").val();
    var port = $("#add_port").val();
    if(!name || !user_name || !password || !url){
        HG_MESSAGE('请输入必要信息！');
        return;
    }
    if(!AREA.area){
        HG_MESSAGE('请绘制监控范围！');
        return;
    }
    var location_x = $("#add_location_x").val();
    var location_y = $("#add_location_y").val();
    var location_z = $("#add_location_z").val();
    HG_AJAX("/position_sdk/ModularVideo/Equip/getEquipSupport",{ip:ip,port:port,user:user_name,password:password},"post",function (data) {
        if(data.type == 1){
            var data = data.result;
            if(data.is_onvif){
                var onvif = 1;
            }else {
                var onvif = 0;
            }
            if(data.is_ptz){
                var ptz = 1;
            }else {
                var ptz = 0;
            }
            for(var i in data.stream){
                if(url == data.stream[i].url){
                    var fps = data.stream[i].video_fps;
                }else {
                    var fps = undefined;
                }
            }
        }else {
            var onvif = 0;
            var ptz = 0;
            var fps = undefined;
        }
        var ptz_x = checkIsAll($("#ptz_x").val());
        var ptz_y = checkIsAll($("#ptz_y").val());
        var ptz_z = checkIsAll($("#ptz_z").val());
        if($("#chose_status input")[0].checked == true){
            var move_support = 1;
        }else {
            var move_support = 0;
        }
        HG_AJAX("/position_sdk/ModularVideo/Equip/addEquip",{move_support:move_support,onvif_support:onvif,ptz_support:ptz,ptz_x:ptz_x,ptz_y:ptz_y,ptz_z:ptz_z,ip:ip,port:port,floor_id:FLOOR_ID,rtsp_url:url,name:name,real_area:AREA.area,place_x:location_x,place_y:location_y,place_z:location_z,z_start:AREA.z_start,z_end:AREA.z_end,area_style:AREA.area_style,user:user_name,password:password,fps:fps},"post",function (data) {
            if(data.type == 1){
                HG_MESSAGE("新增成功");
                getCount();
                getAllEquip();
                getEquip();
                EQUIP_ID = undefined;
                if(VIDEO_PLAYER){
                    VIDEO_PLAYER.close();
                    VIDEO_PLAYER = null;
                    $('#map .hg_video_container').remove();
                }
                if($("#search_camera_list").css("display") == "block"){
                    $("#search_camera_btn").click();
                }
            }else {
                HG_MESSAGE(data.result);
            }
        })
    })
});

/*
 点击摄像头列表里的修改图标，修改摄像头设置
*/
$("#table_camera").on("click",".edit_equip",function () {
    if($("#add_list").css("display") == "block"){
        HG_MESSAGE("正在操作中，不能修改");
        return;
    }
    EQUIP_ID = $(this).data("id");
    AREA = {
        area: EQUIP_DATA[EQUIP_ID].real_area,
        z_start:EQUIP_DATA[EQUIP_ID].z_start,
        z_end:EQUIP_DATA[EQUIP_ID].z_end,
        area_id:EQUIP_ID,
        area_style:EQUIP_DATA[EQUIP_ID].area_style
    };
    if(AREA.area){
        $("#repeat_draw").show();
        $("#draw_type_menu").hide();
        DRAWING = true;
    }else {
        $("#repeat_draw").hide();
        $("#draw_type_menu").show();
        $("#draw_type").html("类型<span class='caret'></span>");
        $("#draw_info").val("请选择绘制的类型");
        DRAWING = false;
    }
    $("#add_location_x").val(EQUIP_DATA[EQUIP_ID].place_x);
    $("#add_location_y").val(EQUIP_DATA[EQUIP_ID].place_y);
    $("#add_location_z").val(EQUIP_DATA[EQUIP_ID].place_z);
    $("#add_camera_name").val(EQUIP_DATA[EQUIP_ID].name);
    $("#add_camera_address").val(EQUIP_DATA[EQUIP_ID].rtsp_url);
    $("#add_user_name").val(EQUIP_DATA[EQUIP_ID].user);
    $("#add_password").val(EQUIP_DATA[EQUIP_ID].password);
    $("#add_ip").val(EQUIP_DATA[EQUIP_ID].ip);
    $("#add_port").val(EQUIP_DATA[EQUIP_ID].port);
    $("#ptz_status").hide();
    $("#ptz").hide();
    $("#chose_status").hide();
    $("#ptz input").val("");
    $("#auto_get_text").hide();
    $("#add_text").hide();
    $("#edit_text").show();
    $("#edit_save_camera").show();
    $("#save_camera").hide();
    HG_AJAX("/position_sdk/ModularVideo/Equip/getEquipSupport",{ip:EQUIP_DATA[EQUIP_ID].ip,port:EQUIP_DATA[EQUIP_ID].port,user:EQUIP_DATA[EQUIP_ID].user,password:EQUIP_DATA[EQUIP_ID].password},"post",function (data) {
        if(data.type == 1){
            var data = data.result.stream;
            var option = "";
            for(var i in data){
                if(i == 0){
                    var name = "主码流：";
                }else if(i == 1){
                    var name = "子码流：";
                }else {
                    var name = "第三码流：";
                }
                option+="<option value='"+data[i].url+"'>"+name+checkNull(data[i].video_width)+"*"+checkNull(data[i].video_height)+"</option>"
            }
            $("#select_video_stream").html(option);
            $("#select_video_stream").val(EQUIP_DATA[EQUIP_ID].rtsp_url);
            $("#add_list").show();
        }else {
            $("#select_video_stream").html("");
            $("#add_camera_address").val("");
            $("#add_list").show();
        }
    })
});

/*
 保存修改的摄像头设置
*/
$("#edit_save_camera").click(function () {
    if (DRAW) {
        MY_MAP.removeInteraction(DRAW);
        DRAW = undefined;
    }
    DRAWING = false;
    var user_name = $("#add_user_name").val();
    var password = $("#add_password").val();
    var name = $("#add_camera_name").val();
    var url = $("#add_camera_address").val();
    var ip = $("#add_ip").val();
    var port = $("#add_port").val();
    if(!name || !user_name || !password || !url){
        HG_MESSAGE('请输入必要信息！');
        return;
    }
    if(!AREA.area){
        HG_MESSAGE('请绘制监控范围！');
        return;
    }
    var location_x = $("#add_location_x").val();
    var location_y = $("#add_location_y").val();
    var location_z = $("#add_location_z").val();
    HG_AJAX("/position_sdk/ModularVideo/Equip/getEquipSupport",{ip:ip,port:port,user:user_name,password:password},"post",function (data) {
        if(data.type == 1){
            var data = data.result;
            if(data.is_onvif){
                var onvif = 1;
            }else {
                var onvif = 0;
            }
            if(data.is_ptz){
                var ptz = 1;
            }else {
                var ptz = 0;
            }
            for(var i in data.stream){
                if(url == data.stream[i].url){
                    var fps = data.stream[i].video_fps;
                }else {
                    var fps = undefined;
                }
            }
        }else {
            var onvif = 0;
            var ptz = 0;
            var fps = undefined;
        }
        var ptz_x = checkIsAll($("#ptz_x").val());
        var ptz_y = checkIsAll($("#ptz_y").val());
        var ptz_z = checkIsAll($("#ptz_z").val());
        if($("#chose_status input")[0].checked == true){
            var move_support = 1;
        }else {
            var move_support = 0;
        }
        HG_AJAX("/position_sdk/ModularVideo/Equip/updateEquip",{move_support:move_support,id:EQUIP_ID,floor_id:FLOOR_ID,rtsp_url:url,name:name,real_area:AREA.area,place_x:location_x,place_y:location_y,place_z:location_z,z_start:AREA.z_start,z_end:AREA.z_end,area_style:AREA.area_style,user:user_name,password:password,ip:ip,port:port,onvif_support:onvif,ptz_support:ptz,ptz_x:ptz_x,ptz_y:ptz_y,ptz_z:ptz_z,fps:fps},"post",function (data) {
            if(data.type == 1){
                HG_MESSAGE("修改成功");
                getCount();
                getAllEquip();
                getEquip();
                EQUIP_ID = undefined;
                if(VIDEO_PLAYER){
                    VIDEO_PLAYER.close();
                    VIDEO_PLAYER = null;
                    $('#map .hg_video_container').remove();
                }
            }else {
                HG_MESSAGE(data.result);
            }
        })
    })
});

/*
 取消新增摄像头
*/
$("#cancel_camera").click(function () {
    if (DRAW) {
        MY_MAP.removeInteraction(DRAW);
        DRAW = undefined;
    }
    DRAWING = false;
    getEquip();
    EQUIP_ID = undefined;
    if(VIDEO_PLAYER){
        VIDEO_PLAYER.close();
        VIDEO_PLAYER = null;
        $('#map .hg_video_container').remove();
    }
});

/*
 点击地图上的摄像头图标，删除摄像头设置
*/
$("#table_camera").on("click",".delete_equip",function () {
    if($("#add_list").css("display") == "block"){
        HG_MESSAGE("正在进行修改操作，不能删除");
        return;
    }
    EQUIP_ID = $(this).data("id");
    $("#modal_del_camera").modal("show");
});

/*
 确定删除摄像头设置
*/
$("#confirm_delete_camera").click(function () {
    HG_AJAX("/position_sdk/ModularVideo/Equip/deleteEquip",{id:EQUIP_ID},"post",function (data) {
        if(data.type == 1){
            HG_MESSAGE("删除成功");
            EQUIP_ID = undefined;
            getEquip();
            getCount();
            getAllEquip();
            if($("#search_camera_list").css("display") == "block"){
                $("#search_camera_btn").click();
            }
        }else {
            HG_MESSAGE(data.result);
        }
        $("#modal_del_camera").modal("hide");
    })
});

/*
 搜索未添加的摄像头
*/
$("#search_camera_btn").click(function () {
    HG_AJAX("/position_sdk/ModularVideo/Equip/getSearchList",{reStart:true},"post",function (data) {
        if(data.type == 1){
            var data = data.result;
            if(data == -1){
                setTimeout(function () {
                    $("#search_camera_btn").click();
                },1000);
            }else {
                var html = "";
                for (var i in data){
                    if(!NEW_EQUIP [data[i].ip]){
                        NEW_EQUIP [data[i].ip] = {
                            ip:data[i].ip,
                            port:data[i].port,
                            name:data[i].name,
                            user:"",
                            password:"",
                            url:""
                        }
                    }
                    html += '<tr><td><input type="checkbox" data-ip="'+data[i].ip+'"></td><td data-toggle="tooltip" data-placement="top" title="'+data[i].name+'">' + stringSlice(data[i].name) + '</td><td>' + data[i].ip + '</td><td><i class="glyphicon glyphicon-edit" data-ip="'+data[i].ip+'"></i><i class="glyphicon glyphicon-eye-open" data-ip="'+data[i].ip+'"></i><i class="glyphicon glyphicon-plus" data-ip="'+data[i].ip+'"></i></td></tr>';
                }
                $("#search_table_camera").html(html);
                $("#table_content").show();
                $("#text_content").hide();
                $("#search_camera_list").show();
            }
        }else {
            $("#table_content").hide();
            $("#text_content").html("未搜索到摄像头");
            $("#text_content").show();
            $("#search_camera_list").show();
        }
    })
});

/*
 点击未添加摄像头列表表头的选择框，实现全选
*/
$("#search_camera_list").find("thead").find("input").click(function () {
    var input = $("#search_camera_list").find("tbody").find("input");
    if ($(this)[0].checked) {
        $(input).each(function () {
            $(this)[0].checked = true;
        });
    } else {
        $(input).each(function () {
            $(this)[0].checked = false;
        });
    }
});

/*
 点击未添加摄像头列表的选择框，实现单个选中
*/
$("#search_table_camera").on("click", "input", function () {
    if ($(this)[0].checked) {
        var input = $("#search_table_camera").find("input");
        var num = 0;
        $(input).each(function () {
            if ($(this)[0].checked) {
                num += 1;
                if (num == input.length) {
                    $("#search_camera_list").find("thead").find("input")[0].checked = true;
                }
            }
        });
    } else {
        $("#search_camera_list").find("thead").find("input")[0].checked = false;
    }
});

/*
 点击未添加摄像头列表右上角的修改图标，批量修改摄像头的用户名和密码
*/
$("#all_camera_edit").click(function () {
    var input = $("#search_table_camera").find("input");
    var num = 0;
    $(input).each(function () {
        if ($(this)[0].checked) {
            num += 1;
        }
    });
    if (num == 0) {
        HG_MESSAGE("请至少选择一个编辑");
    }else {
        $("#user_set").val("");
        $("#password_set").val("");
        $("#only_button_user_set_save").hide();
        $("#button_user_set_save").show();
        $("#modal_user_set").modal("show");
    }
});

/*
 地图上点击增加搜索到的未添加的摄像头事件
*/
var newAddCamera = function (e) {
    if(ICON_SCALE <= 0.2){
        HG_MESSAGE("地图缩放比太小，不能新增");
        return;
    }
    MY_MAP.un("pointermove",moveCamera);
    MY_MAP.removeFeature(MOVE_FEATURE);
    if (e.dragging) {
        return;
    }
    //得到鼠标点击地图时的像素点
    var pixel = MY_MAP.getEventPixel(e.originalEvent);
    //得到该像素点的坐标
    var location_x = MY_MAP.getCoordinateFromPixel(pixel)[0].toFixed(2);
    var location_y = MY_MAP.getCoordinateFromPixel(pixel)[1].toFixed(2);
    MOVE_FEATURE = new HG2DMap.feature.point([location_x,location_y], {icon:"img/camera.png",text:"",icon_scale:ICON_SCALE,text_scale:TEXT_SCALE});
    MY_MAP.addFeature(MOVE_FEATURE);
    $("#add_camera_name").val(NEW_EQUIP[EDIT_IP].name);
    $("#add_user_name").val(NEW_EQUIP[EDIT_IP].user);
    $("#add_password").val(NEW_EQUIP[EDIT_IP].password);
    $("#add_camera_address").val(NEW_EQUIP[EDIT_IP].url);
    if(!NEW_EQUIP[EDIT_IP].url){
        $("#select_video_stream").html("");
    }
    $("#add_ip").val(NEW_EQUIP[EDIT_IP].ip);
    $("#add_port").val(NEW_EQUIP[EDIT_IP].port);
    $("#add_location_x").val(location_x);
    $("#add_location_y").val(location_y);
    $("#add_location_z").val((parseFloat(FLOOR_DATA[FLOOR_ID].height) - parseFloat(FLOOR_DATA[FLOOR_ID].start))/2);
    $("#add_text").show();
    $("#edit_text").hide();
    $("#edit_save_camera").hide();
    $("#save_camera").show();
    $("#repeat_draw").hide();
    $("#draw_type_menu").show();
    $("#ptz_status").hide();
    $("#ptz").hide();
    $("#chose_status").hide();
    $("#ptz input").val("");
    $("#auto_get_text").hide();
    $("#draw_type").html("类型<span class='caret'></span>");
    $("#draw_info").val("请选择绘制的类型");
    AREA = {
        area: "",
        z_start: "",
        z_end: "",
        area_id:1001,
        area_style:""
    };
    $("#add_list").show();
    MY_MAP.un("click",newAddCamera);
};

/*
 新增搜索到的摄像头
*/
$("#search_table_camera").on("click",".glyphicon-plus",function (e) {
    EDIT_IP = $(this).data("ip");
    if($("#add_list").css("display") == "block"){
        HG_MESSAGE("正在操作中，不能新建");
        return;
    }
    if(MOVE_FEATURE){
        return;
    }
    if (e.dragging) {
        return;
    }
    MY_MAP.getTarget().style.cursor = "pointer";
    //得到鼠标的像素点
    var pixel = MY_MAP.getEventPixel(e.originalEvent);
    //得到该像素点的坐标
    var location_x = MY_MAP.getCoordinateFromPixel(pixel)[0].toFixed(2);
    var location_y = MY_MAP.getCoordinateFromPixel(pixel)[1].toFixed(2);
    if(ICON_SCALE <= 0.2){
        HG_MESSAGE("地图缩放比太小，不能新增");
        return;
    }
    MOVE_FEATURE = new HG2DMap.feature.point([location_x,location_y], {icon:"img/camera.png",text:"",icon_scale:ICON_SCALE,text_scale:TEXT_SCALE});
    MY_MAP.addFeature(MOVE_FEATURE);
    MOVE_LOCATION_X = location_x;
    MOVE_LOCATION_Y = location_y;
    MY_MAP.on("pointermove",moveCamera);
    MY_MAP.on("click",newAddCamera);
});

/*
 查看搜索到的摄像头的实时画面
*/
$("#search_table_camera").on("click",".glyphicon-eye-open",function () {
    var ip = $(this).data("ip");
    var user = NEW_EQUIP[ip].user;
    var password = NEW_EQUIP[ip].password;
    var port = NEW_EQUIP[ip].port;
    if(!user || !password){
        HG_MESSAGE("请编辑用户名和密码！");
        return;
    }
    if(NEW_EQUIP[ip].url){
        if(VIDEO_PLAYER){
            VIDEO_PLAYER.close();
            VIDEO_PLAYER = null;
            $('#map .hg_video_container').remove();
        }
        playTheCamera(NEW_EQUIP[ip].name,user,password,NEW_EQUIP[ip].url,ip,port,false);
    }else {
        HG_AJAX("/position_sdk/ModularVideo/Equip/getEquipSupport",{ip:ip,port:port,user:user,password:password},"post",function (data) {
            if(data.type == 1){
                var data = data.result.stream;
                var option = "";
                for(var i in data){
                    if(i == 0){
                        var name = "主码流：";
                    }else if(i == 1){
                        var name = "子码流：";
                    }else {
                        var name = "第三码流：";
                    }
                    option+="<option value='"+data[i].url+"'>"+name+checkNull(data[i].video_width)+"*"+checkNull(data[i].video_height)+"</option>"
                }
                $("#select_video_stream").html(option);
                var url = data[0].url;
                NEW_EQUIP[ip].url = url;
                if(VIDEO_PLAYER){
                    VIDEO_PLAYER.close();
                    VIDEO_PLAYER = null;
                    $('#map .hg_video_container').remove();
                }
                playTheCamera(NEW_EQUIP[ip].name,user,password,url,ip,port,false);
            }else {
                $("#select_video_stream").html("");
                HG_MESSAGE(data.result);
            }
        })
    }
});

/*
 修改单个摄像头的用户名和密码
*/
$("#search_table_camera").on("click",".glyphicon-edit",function () {
    var ip = $(this).data("ip");
    EDIT_IP = ip;
    if(NEW_EQUIP[ip].user){
        $("#user_set").val(NEW_EQUIP[ip].user);
    }else {
        $("#user_set").val("");
    }
    if(NEW_EQUIP[ip].password){
        $("#password_set").val(NEW_EQUIP[ip].password);
    }else {
        $("#password_set").val("");
    }
    $("#only_button_user_set_save").show();
    $("#button_user_set_save").hide();
    $("#modal_user_set").modal("show");
});

/*
 关闭搜索到的摄像头列表
*/
$("#search_camera_list").on("click",".glyphicon-remove",function () {
    $("#search_camera_list").hide();
});

/*
 保存单个修改的摄像头的用户名和密码
*/
$("#only_button_user_set_save").click(function () {
    NEW_EQUIP[EDIT_IP].user = $("#user_set").val();
    NEW_EQUIP[EDIT_IP].password = $("#password_set").val();
    $("#modal_user_set").modal("hide");
});

/*
 保存批量修改的摄像头的用户名和密码
*/
$("#button_user_set_save").click(function () {
    var input = $("#search_table_camera").find("input");
    var user = $("#user_set").val();
    var password = $("#password_set").val();
    $(input).each(function () {
        if ($(this)[0].checked) {
            var ip = $(this).data("ip");
            NEW_EQUIP[ip].user = user;
            NEW_EQUIP[ip].password = password;
            $(this)[0].checked = false;
        }
    });
    $("#search_camera_list").find("thead").find("input")[0].checked = false;
    $("#modal_user_set").modal("hide");
});

/*
 点击实时画面查看
*/
$("#realTime_view").click(function () {
    var name = checkInputNull($("#add_camera_name").val()),
        user = checkInputNull($("#add_user_name").val()),
        password = checkInputNull($("#add_password").val()),
        url = checkInputNull($("#add_camera_address").val()),
        ip = checkInputNull($("#add_ip").val()),
        port = checkInputNull($("#add_port").val());
    if(!name || !user || !password || !url || !ip || !port){
        HG_MESSAGE('请填入必要信息后在查看！');
        return;
    }
    HG_AJAX("/position_sdk/ModularVideo/Equip/getEquipSupport",{ip:ip,port:port,user:user,password:password},"post",function (data) {
        if(data.type == 1){
            var data = data.result;
            if(data.is_ptz){
                $("#ptz_status").show();
            }else {
                $("#ptz_status").hide();
            }
            var support = data.is_ptz;
        }else {
            $("#ptz_status").hide();
            var support = false;
        }
        if(VIDEO_PLAYER){
            VIDEO_PLAYER.close();
            VIDEO_PLAYER = null;
            $('#map .hg_video_container').remove();
        }
        playTheCamera(name,user,password,url,ip,port,support);
    });
});

/*
 点击获取到云台状态
*/
$("#ptz_status").click(function () {
    var user_name = $("#add_user_name").val();
    var password = $("#add_password").val();
    var ip = $("#add_ip").val();
    var port = $("#add_port").val();
    HG_AJAX("/position_sdk/ModularVideo/Equip/getEquipPtz",{ip:ip,port:port,user:user_name,password:password},"post",function (data) {
        if(data.type == 1){
            var data = data.result;
            $("#ptz_x").val(data.ptz_x);
            $("#ptz_y").val(data.ptz_y);
            $("#ptz_z").val(data.ptz_z);
            $("#ptz").show();
            $("#chose_status").show();
        }else {
            $("#ptz_x").val("");
            $("#ptz_y").val("");
            $("#ptz_z").val("");
            $("#ptz").hide();
            $("#chose_status").hide();
        }
    });
});

/*
 播放视频的方法
*/
function playTheCamera(name,user,password,url,ip,port,support) {
    var element_id = createDiv(name,user,password,ip,port,support);
    handleDrag(element_id);
    playVideo(element_id, url,user,password,ip);
}

/*
 处理视频播放容器的拖拽的方法
*/
function handleDrag(div_id) {
    var containerObj = $("#" + div_id).parent();
    var elementObj =$("#" + div_id).siblings('.hg_video_container_header');

    elementObj.mousedown(function (e) {
        $(".hg_video_container").css("z-index",2);
        containerObj.css("z-index",999);
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

        elementObj.mouseup(function(){
            $(document).off("mousemove");
        })
    })
}

/*
 创建播放容器的方法
*/
function createDiv(name,user,password,ip,port,support) {
    var id  = "video_container";
    var top = 110  + "px";
    var right = 390 + "px";
    var width = VIDEO_WIDTH + 'px';
    var height = (VIDEO_HEIGHT+40) + 'px';
    var div;
    if(support){
        div = "<div class='hg_video_container' style='top: "+top+";right: "+right+";width: "+width+";height: "+height+"'>" +
            "<div class='hg_video_container_header'><h4>"+name+"</h4><i class='glyphicon glyphicon-remove-circle'></i></div>"+
            "<div id='"+id+"' class='hg_video_play_container'></div>"+
            "<div class='hg_video_container_footer'>" +
            "<div class='hg_video_directions'>" +
            "<span class='glyphicon glyphicon-triangle-top' data-ip='"+ip+"' data-port='"+port+"' data-user='"+user+"' data-password='"+password+"'></span>"+
            "<span class='glyphicon glyphicon-triangle-bottom' data-ip='"+ip+"' data-port='"+port+"' data-user='"+user+"' data-password='"+password+"'></span>"+
            "<span class='glyphicon glyphicon-triangle-left' data-ip='"+ip+"' data-port='"+port+"' data-user='"+user+"' data-password='"+password+"'></span>"+
            "<span class='glyphicon glyphicon-triangle-right' data-ip='"+ip+"' data-port='"+port+"' data-user='"+user+"' data-password='"+password+"'></span>"+
            "</div>"+
            "<div class='hg_video_buttons'>" +
            "<span class='glyphicon glyphicon-plus-sign' data-ip='"+ip+"' data-port='"+port+"' data-user='"+user+"' data-password='"+password+"'></span>"+
            "<span class='glyphicon glyphicon-minus-sign' data-ip='"+ip+"' data-port='"+port+"' data-user='"+user+"' data-password='"+password+"'></span>"+
            "</div>"+
            "</div>";
    }else if(!support){
        div = "<div class='hg_video_container' style='top: "+top+";right: "+right+";width: "+width+";height: "+height+"' >" +
            "<div class='hg_video_container_header'><h4>"+name+"</h4><i class='glyphicon glyphicon-remove-circle'></i></div>"+
            "<div id='"+id+"' class='hg_video_play_container'></div>"+
            "</div>"+
            "</div>";
    }
    $("#map").append(div);
    return id;
}

/*
 播放视频的方法
*/
function onOpen(msg) {console.log(msg)}
function onInfo(msg){console.log("info", msg)}
function onError(msg){console.log("error", msg)}
function playVideo(element_id,url,user,password,ip) {
    //播放器配置参数
    var opts = {
        "width": VIDEO_WIDTH,
        "height": VIDEO_HEIGHT,
        "oninfo": onInfo,
        'onopen':onOpen,
        "onerr": onError,
        'user': user,
        'password':password
    };
    var type = 'h264';   //播放器播放视频类型
    var parent_div = document.getElementById(element_id);
    VIDEO_PLAYER = new HGPlayer(parent_div, type,url, VIDEO_WS_URL,opts);
    if(VIDEO_PLAYER.sucess == false){
        HG_MESSAGE(VIDEO_PLAYER.err_msg);
        VIDEO_PLAYER = null;
        $('#map .hg_video_container').remove();
    }
}

/*
 改变摄像头方向
*/

/*
 点击视频播放器里的向上按钮，使摄像头向上转动
*/
$('#map').on('mousedown','.glyphicon-triangle-top',function () {
    var ip = $(this).data('ip');
    var port = $(this).data('port');
    var user = $(this).data('user');
    var password = $(this).data('password');
    $(this).addClass('direction');
    VIDEO_PLAYER.moveRelative({"ip":ip,"port":port,"user":user,"pwd":password,"up_speed":VIDEO_SPEED});

});
$('#map').on('mouseup','.glyphicon-triangle-top',function () {
    $(this).removeClass('direction');
    var ip = $(this).data('ip');
    var port = $(this).data('port');
    var user = $(this).data('user');
    var password = $(this).data('password');
    VIDEO_PLAYER.moveStop({"ip":ip,"port":port,"user":user,"pwd":password});
});
$('#map').on('mouseleave','.glyphicon-triangle-top',function () {
    var status = $(this).hasClass('direction');
    if(status){
        $(this).removeClass('direction');
        var ip = $(this).data('ip');
        var port = $(this).data('port');
        var user = $(this).data('user');
        var password = $(this).data('password');
        VIDEO_PLAYER.moveStop({"ip":ip,"port":port,"user":user,"pwd":password});
    }
});

/*
 点击视频播放器里的向上按钮，使摄像头向下转动
*/
$('#map').on('mousedown','.glyphicon-triangle-bottom',function () {
    var ip = $(this).data('ip');
    var port = $(this).data('port');
    var user = $(this).data('user');
    var password = $(this).data('password');
    $(this).addClass('direction');
    VIDEO_PLAYER.moveRelative({"ip":ip,"port":port,"user":user,"pwd":password,"up_speed":-VIDEO_SPEED});
});
$('#map').on('mouseup','.glyphicon-triangle-bottom',function () {
    $(this).removeClass('direction');
    var ip = $(this).data('ip');
    var port = $(this).data('port');
    var user = $(this).data('user');
    var password = $(this).data('password');
    VIDEO_PLAYER.moveStop({"ip":ip,"port":port,"user":user,"pwd":password});
});
$('#map').on('mouseleave','.glyphicon-triangle-bottom',function () {
    var status = $(this).hasClass('direction');
    if(status){
        $(this).removeClass('direction');
        var ip = $(this).data('ip');
        var port = $(this).data('port');
        var user = $(this).data('user');
        var password = $(this).data('password');
        VIDEO_PLAYER.moveStop({"ip":ip,"port":port,"user":user,"pwd":password});
    }
});

/*
 点击视频播放器里的向上按钮，使摄像头向左转动
*/
$('#map').on('mousedown','.glyphicon-triangle-left',function () {
    var ip = $(this).data('ip');
    var port = $(this).data('port');
    var user = $(this).data('user');
    var password = $(this).data('password');
    $(this).addClass('direction');
    VIDEO_PLAYER.moveRelative({"ip":ip,"port":port,"user":user,"pwd":password,"right_speed":-VIDEO_SPEED});
});
$('#map').on('mouseup','.glyphicon-triangle-left',function () {
    $(this).removeClass('direction');
    var ip = $(this).data('ip');
    var port = $(this).data('port');
    var user = $(this).data('user');
    var password = $(this).data('password');
    VIDEO_PLAYER.moveStop({"ip":ip,"port":port,"user":user,"pwd":password});
});
$('#map').on('mouseleave','.glyphicon-triangle-left',function () {
    var status = $(this).hasClass('direction');
    if(status){
        $(this).removeClass('direction');
        var ip = $(this).data('ip');
        var port = $(this).data('port');
        var user = $(this).data('user');
        var password = $(this).data('password');
        VIDEO_PLAYER.moveStop({"ip":ip,"port":port,"user":user,"pwd":password});
    }
});

/*
 点击视频播放器里的向上按钮，使摄像头向右转动
*/
$('#map').on('mousedown','.glyphicon-triangle-right',function () {
    var ip = $(this).data('ip');
    var port = $(this).data('port');
    var user = $(this).data('user');
    var password = $(this).data('password');
    $(this).addClass('direction');
    VIDEO_PLAYER.moveRelative({"ip":ip,"port":port,"user":user,"pwd":password,"right_speed":VIDEO_SPEED});
});
$('#map').on('mouseup','.glyphicon-triangle-right',function () {
    $(this).removeClass('direction');
    var ip = $(this).data('ip');
    var port = $(this).data('port');
    var user = $(this).data('user');
    var password = $(this).data('password');
    VIDEO_PLAYER.moveStop({"ip":ip,"port":port,"user":user,"pwd":password});
});
$('#map').on('mouseleave','.glyphicon-triangle-right',function () {
    var status = $(this).hasClass('direction');
    if(status){
        $(this).removeClass('direction');
        var ip = $(this).data('ip');
        var port = $(this).data('port');
        var user = $(this).data('user');
        var password = $(this).data('password');
        VIDEO_PLAYER.moveStop({"ip":ip,"port":port,"user":user,"pwd":password});
    }
});

/*
 点击视频播放器里的“+”按钮，使摄像头拉近镜头
*/
$('#map').on('mousedown','.glyphicon-plus-sign',function () {
    var ip = $(this).data('ip');
    var port = $(this).data('port');
    var user = $(this).data('user');
    var password = $(this).data('password');
    $(this).addClass('direction');
    VIDEO_PLAYER.moveRelative({"ip":ip,"port":port,"user":user,"pwd":password,"far_speed":VIDEO_SPEED});
});
$('#map').on('mouseup','.glyphicon-plus-sign',function () {
    $(this).removeClass('direction');
    var ip = $(this).data('ip');
    var port = $(this).data('port');
    var user = $(this).data('user');
    var password = $(this).data('password');
    VIDEO_PLAYER.moveStop({"ip":ip,"port":port,"user":user,"pwd":password});
});
$('#map').on('mouseleave','.glyphicon-plus-sign',function () {
    var status = $(this).hasClass('direction');
    if(status){
        $(this).removeClass('direction');
        var ip = $(this).data('ip');
        var port = $(this).data('port');
        var user = $(this).data('user');
        var password = $(this).data('password');
        VIDEO_PLAYER.moveStop({"ip":ip,"port":port,"user":user,"pwd":password});
    }
});

/*
 点击视频播放器里的“-”按钮，使摄像头拉远镜头
*/
$('#map').on('mousedown','.glyphicon-minus-sign',function () {
    var ip = $(this).data('ip');
    var port = $(this).data('port');
    var user = $(this).data('user');
    var password = $(this).data('password');
    $(this).addClass('direction');
    VIDEO_PLAYER.moveRelative({"ip":ip,"port":port,"user":user,"pwd":password,"far_speed":-VIDEO_SPEED});
});
$('#map').on('mouseup','.glyphicon-minus-sign',function () {
    $(this).removeClass('direction');
    var ip = $(this).data('ip');
    var port = $(this).data('port');
    var user = $(this).data('user');
    var password = $(this).data('password');
    VIDEO_PLAYER.moveStop({"ip":ip,"port":port,"user":user,"pwd":password});
});
$('#map').on('mouseleave','.glyphicon-minus-sign',function () {
    var status = $(this).hasClass('direction');
    if(status){
        $(this).removeClass('direction');
        var ip = $(this).data('ip');
        var port = $(this).data('port');
        var user = $(this).data('user');
        var password = $(this).data('password');
        VIDEO_PLAYER.moveStop({"ip":ip,"port":port,"user":user,"pwd":password});
    }
});

/*
 关闭视频容器的方法
*/
$("#map").on("click",".glyphicon-remove-circle",function (e) {
    e.stopPropagation();
    if(VIDEO_PLAYER){
        VIDEO_PLAYER.close();
        VIDEO_PLAYER = null;
        $(this).parent().parent().remove();
    }
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

/*
 列表视图
*/

/*
 初始化时间（年月日）
*/
function initDayTime(start_day_id,end_day_id){
    var time = getNowTimeString();
    $('#'+start_day_id).val(time.last.split(" ")[0]);
    $('#'+end_day_id).val(time.now.split(" ")[0]);
    $('#'+start_day_id).datetimepicker({
        format: 'yyyy-mm-dd',
        autoclose:true,
        language:"zh-CN",
        startView:2,
        minView:2
    }).on('hide', function(event){
        event.preventDefault();
        event.stopPropagation();
    });
    $('#'+end_day_id).datetimepicker({
        format: 'yyyy-mm-dd',
        autoclose:true,
        language:"zh-CN",
        startView:2,
        minView:2
    }).on('hide', function(event) {
        event.preventDefault();
        event.stopPropagation();
    });
}

/*
 初始化时间（时分）
*/
function initDateTime(start_date_id,end_date_id,start_day_id,end_day_id){
    var time = getNowTimeString();
    $('#'+start_date_id).val(time.last.split(" ")[1]);
    $('#'+end_date_id).val(time.now.split(" ")[1]);
    $('#'+start_date_id).datetimepicker({
        format: 'hh:ii',
        autoclose:true,
        language:"zh-CN",
        startView:1,
        maxView:1,
        startDate:time.last.split(" ")[0]
    }).on('hide', function(event) {
        event.preventDefault();
        event.stopPropagation();
    });
    $('#'+end_date_id).datetimepicker({
        format: 'hh:ii',
        autoclose:true,
        language:"zh-CN",
        startView:1,
        maxView:1,
        startDate:time.now.split(" ")[0]
    }).on('hide', function(event) {
        event.preventDefault();
        event.stopPropagation();
    });

    $('#'+start_day_id).on('changeDate',function () {
        $('#'+start_date_id).datetimepicker('setStartDate',$(this).val())
    });
    $('#'+end_day_id).on('changeDate',function () {
        $('#'+end_date_id).datetimepicker('setStartDate',$(this).val())
    })
}

/*
 时间转换为时间戳，精确到秒
*/
function getSearchTime(input_data_id,input_time_id) {
    var data,time;
    data = delimiterConvert($("#"+input_data_id).val());
    time = $("#"+input_time_id).val();

    if (Date.parse(new Date(data + " " + time))) {
        return Date.parse(new Date(data + " " + time)) / 1000;
    } else {
        return undefined;
    }
}

/*
 时间戳转字符串函数
*/
function transTimeStampToString(value,flag){
    var time = new Date(parseInt(value) * 1000);
    var year = time.getFullYear();
    var month = time.getMonth()+1<10?"0"+(time.getMonth()+1):time.getMonth()+1;
    var day   = time.getDate()<10?"0"+time.getDate():time.getDate();
    var time = new Date(parseInt(value) * 1000);
    var hour = time.getHours()<10?"0"+time.getHours():time.getHours();
    var minutes = time.getMinutes()<10?"0"+time.getMinutes():time.getMinutes();
    if(flag == 1){
        return year+"-"+month+"-"+day+" "+ hour+":"+minutes;
    }else if(flag == 2){
        return year+"-"+month+"-"+day;
    }else {
        return hour+":"+minutes;
    }

}

/*
 得到录像结果列表
*/
function getRecordInfo() {
    var start_time = getSearchTime("search_start_data","search_start_time");
    var end_time = getSearchTime("search_end_data","search_end_time");
    HG_AJAX("/position_sdk/ModularVideo/Equip/getRecordInfo",{camera_id:EQUIP_ID,begin:start_time,end:end_time},"post",function (data) {
        if(data.type == 1){
            var data = data.result;
            var html = "";
            $(data).each(function (index) {
                if(this.status == "0"){
                    html+= "<tr>"+
                        "<td>" + transTimeStampToString(this.begin,1)+"--" + transTimeStampToString(this.end,1)+"</td>" +
                        "<td><i class='glyphicon glyphicon-eye-open' data-file='" + this.file_name + "'></i>" +
                        "<i class='glyphicon glyphicon-trash' data-id='" + this.id + "'></i>" +
                        "</td></tr>";
                }
            });
            $("#record_list").html(html);
        }else {
            HG_MESSAGE(data.result);
        }
    })
}

/*
 录像计划时间初始化
*/
function TimeObjNull() {
    TIME_OBJ = {
        "mon_time_list":{},
        "tue_time_list":{},
        "wed_time_list":{},
        "thu_time_list":{},
        "fri_time_list":{},
        "sat_time_list":{},
        "sun_time_list":{}
    };
    $(".time_list").html("");
    $(".week_text").css("color","#000");
    $("#show_time_select").hide();
}

/*
 列表视图查询摄像头
*/
$("#search_btn").click(function () {
    getCount();
    getAllEquip();
});

/*
 跳转到地图视图
*/
$("#map_view_button>a").click(function () {
    $("#list_view_button>a").removeClass("panel_active");
    $("#map_view_button>a").addClass("panel_active");
});

/*
 跳转到列表视图
*/
$("#list_view_button>a").click(function () {
    $("#map_view_button>a").removeClass("panel_active");
    $("#list_view_button>a").addClass("panel_active");
});

/*
 点击列表视图里“查看”，跳转到地图视图
*/
$("#list_view_table tbody").on("click",".show_map",function () {
    var floor_id = ALL_EQUIP_DATA[$(this).data("id")].floor_id;
    if(!floor_id || FLOOR_DATA[floor_id].floor_2d_file == "0") {
        HG_MESSAGE("没有相关地图文件，无法查看");
        return;
    }
    if(MOVE_FEATURE){
        MY_MAP.un("pointermove",moveCamera);
        MY_MAP.un("click",addCamera);
        MY_MAP.getTarget().style.cursor = "";
    }
    FLOOR_ID = floor_id;
    $("#list_view_button>a").removeClass("panel_active");
    $("#map_view_button>a").addClass("panel_active");
    $(this).tab("show");
    MY_MAP.reset();//调用2d地图SDK中的重置地图函数
    $("#add_list").hide();
    //获得切换后的场景、建筑、楼层id
    var file_type = FLOOR_DATA[FLOOR_ID].file_2d_postfix;
    var extend = [FLOOR_DATA[FLOOR_ID].coordinate_left,FLOOR_DATA[FLOOR_ID].coordinate_down,FLOOR_DATA[FLOOR_ID].coordinate_right,FLOOR_DATA[FLOOR_ID].coordinate_upper];
    //调用计算自动缩放比
    var obj = mapAutomaticSetting(FLOOR_DATA[FLOOR_ID].floor_scaling_ratio,FLOOR_DATA[FLOOR_ID].origin_x,FLOOR_DATA[FLOOR_ID].origin_y,FLOOR_DATA[FLOOR_ID].drop_multiple,extend,"map");
    var is_show = $("#loading_img").css("display");
    if(is_show == "none"){
        $("#loading_img").show();
    }
    if (file_type == "kml"){
        //改变地图文件
        MY_MAP.changeMap(AJAX_URL + FLOOR_DATA[FLOOR_ID].file_2d_path, [parseFloat(ALL_EQUIP_DATA[$(this).data("id")].place_x),parseFloat(ALL_EQUIP_DATA[$(this).data("id")].place_y)], 41,"kml",[],{extent:obj.extent,zoom_factor:1.5});
    }else {
        MY_MAP.changeMap(AJAX_URL + FLOOR_DATA[FLOOR_ID].file_2d_path, [parseFloat(ALL_EQUIP_DATA[$(this).data("id")].place_x),parseFloat(ALL_EQUIP_DATA[$(this).data("id")].place_y)], 41,"image",extend,{extent:obj.extent,zoom_factor:1.5});
    }
    $("#floor_select").val(FLOOR_ID);
});

/*
 点击列表视图里“删除”，删除该摄像头
*/
$("#list_view_table tbody").on("click",".delete_list",function () {
    EQUIP_ID = $(this).data("id");
    $("#modal_del_camera").modal("show");
});

/*
 点击列表视图里“添加录像计划”，为该摄像头添加录像计划
*/
$("#list_view_table tbody").on("click",".add_nvr",function () {
    EQUIP_ID = $(this).parent().data("id");
    $("#set_camera_name").val(EQUIP_DATA[EQUIP_ID].name);
    $("#all_day")[0].checked = false;
    $("#chose_time_group").show();
    TimeObjNull();
    HG_AJAX("/position_sdk/ModularVideo/Equip/getDiskInfo",{},"post",function (data) {
        if(data.type == 1){
            var data = data.result;
            if(data.occupied > 1024){
                var occupied = (parseFloat(data.occupied) / 1024).toFixed(2)+"G";
            }else {
                var occupied = data.occupied +"M";
            }
            if(data.free > 1024){
                var free = (parseFloat(data.free) / 1024).toFixed(2)+"G";
            }else {
                var free = data.free +"M";
            }
            $("#disk_info").html("(存储在本地，已占用"+occupied+"，还剩"+free+")");
        }else {
            $("#disk_info").html("");
        }
        $("#modal_set_nvr").modal("show");
    });
});

/*
 点击列表视图里“修改录像计划”，修改该摄像头的录像计划
*/
$("#list_view_table tbody").on("click",".edit_nvr",function () {
    EQUIP_ID = $(this).parent().data("id");
    HG_AJAX("/position_sdk/ModularVideo/Equip/getAllRecordOrder",{camera_id:EQUIP_ID},"post",function (data) {
        if(data.type == 1){
            var data = data.result;
            $("#set_camera_name").val(EQUIP_DATA[EQUIP_ID].name);
            if(data.all_day == 1){
                $("#all_day")[0].checked = true;
                $("#chose_time_group").hide();
            }else {
                $("#all_day")[0].checked = false;
                TimeObjNull();
                function timeTranslateString(obj,value) {
                    if(obj){
                        for (var i in obj){
                            var start_hour = parseInt(parseInt(obj[i][0])/ 3600);
                            var start_minute = parseInt(parseInt(obj[i][0]) % 3600 / 60);
                            var end_hour = parseInt(parseInt(obj[i][1])/ 3600);
                            var end_minute = parseInt(parseInt(obj[i][1]) % 3600 / 60);
                            if(start_hour < 10){
                                var start_hour_html = "0"+start_hour;
                            }else {
                                var start_hour_html = start_hour;
                            }
                            if(start_minute < 10){
                                var start_minute_html = "0"+start_minute;
                            }else {
                                var start_minute_html = start_minute;
                            }
                            if(end_hour < 10){
                                var end_hour_html = "0"+end_hour;
                            }else {
                                var end_hour_html = end_hour;
                            }
                            if(end_minute < 10){
                                var end_minute_html = "0"+end_minute;
                            }else {
                                var end_minute_html = end_minute;
                            }
                            var repeat_time = [start_hour * 3600 + start_minute *60,end_hour * 3600 + end_minute *60];
                            var time_value = start_hour * 3600 + start_minute *60 + end_hour * 3600 + end_minute *60;
                            TIME_OBJ[value][time_value] = repeat_time;
                            var time_list = '<div style="display: inline-block;margin-right:10px;" data-value="'+time_value+'"><span>'+start_hour_html+":"+start_minute_html+'</span>~<span>'+end_hour_html+":"+end_minute_html+'</span><span class="glyphicon glyphicon-remove" data-value="'+time_value+'" data-id="'+value+'"></span></div>';
                            $("#"+value).append(time_list);
                        }
                    }
                }
                timeTranslateString(data.mon,"mon_time_list");
                timeTranslateString(data.tue,"tue_time_list");
                timeTranslateString(data.wed,"wed_time_list");
                timeTranslateString(data.thu,"thu_time_list");
                timeTranslateString(data.fri,"fri_time_list");
                timeTranslateString(data.sat,"sat_time_list");
                timeTranslateString(data.sun,"sun_time_list");
                $("#chose_time_group").show();
            }
            HG_AJAX("/position_sdk/ModularVideo/Equip/getDiskInfo",{},"post",function (data) {
                if(data.type == 1){
                    var data = data.result;
                    if(data.occupied > 1024){
                        var occupied = (parseFloat(data.occupied) / 1024).toFixed(2)+"G";
                    }else {
                        var occupied = data.occupied +"M";
                    }
                    if(data.free > 1024){
                        var free = (parseFloat(data.free) / 1024).toFixed(2)+"G";
                    }else {
                        var free = data.free +"M";
                    }
                    $("#disk_info").html("(存储在本地，已占用"+occupied+"，还剩"+free+")");
                }else {
                    $("#disk_info").html("");
                }
                $("#modal_set_nvr").modal("show");
            });
        }
    });



});

/*
 选择是否为全天录制
*/
$("#all_day").click(function () {
    if($(this)[0].checked){
        $("#chose_time_group").hide();
    }else {
        TimeObjNull();
        $("#chose_time_group").show();
    }
});

/*
 点击加号图标，添加时间段的选择
*/
$(".glyphicon-plus").click(function () {
    $(".week_text").css("color","#000");
    $(this).siblings("label").css("color","#00BFFF");
    WEEK_ID = $(this).data("id");
    $("#start_hour_time").val("0");
    $("#start_minute_time").val("0");
    $("#end_hour_time").val("23");
    $("#end_minute_time").val("59");
    $("#show_time_select").show();
});

/*
 确认添加时间段
*/
$("#show_time_select").on("click",".glyphicon-ok",function () {
    var start_hour = $("#start_hour_time").val();
    var start_minute = $("#start_minute_time").val();
    var end_hour = $("#end_hour_time").val();
    var end_minute = $("#end_minute_time").val();
    var start_hour_html = $('#start_hour_time option:selected').text();
    var start_minute_html = $('#start_minute_time option:selected').text();
    var end_hour_html = $('#end_hour_time option:selected').text();
    var end_minute_html = $('#end_minute_time option:selected').text();
    var repeat_time = [start_hour * 3600 + start_minute *60,end_hour * 3600 + end_minute *60];
    var time_value = start_hour * 3600 + start_minute *60 + end_hour * 3600 + end_minute *60;
    if((end_hour * 3600 + end_minute *60)<=(start_hour * 3600 + start_minute *60)){
        HG_MESSAGE("开始时间段不能大于等于结束时间段");
        return;
    }
    if(TIME_OBJ[WEEK_ID][time_value]){
        HG_MESSAGE("该时间段已存在");
        return;
    }

    for(var i in TIME_OBJ[WEEK_ID]){
        if(!(repeat_time[1]< TIME_OBJ[WEEK_ID][i][0] || repeat_time[1] == TIME_OBJ[WEEK_ID][i][0] || repeat_time[0]> TIME_OBJ[WEEK_ID][i][1] || repeat_time[0] == TIME_OBJ[WEEK_ID][i][1])){
            HG_MESSAGE("时间段不能重复");
            return;
        }
    }
    TIME_OBJ[WEEK_ID][time_value] = repeat_time;
    var time_list = '<div style="display: inline-block;margin-right:10px;" data-value="'+time_value+'"><span>'+start_hour_html+":"+start_minute_html+'</span>~<span>'+end_hour_html+":"+end_minute_html+'</span><span class="glyphicon glyphicon-remove" data-value="'+time_value+'" data-id="'+WEEK_ID+'"></span></div>';
    $("#"+WEEK_ID).append(time_list);
    $("#show_time_select").hide();
});

/*
 取消添加时间段
*/
$("#show_time_select").on("click",".glyphicon-remove",function () {
    $("#show_time_select").hide();
});

/*
 取消已添加的时间段
*/
$(".time_list").on("click",".glyphicon-remove",function () {
    var week_id = $(this).data("id");
    $(this).parent("div").remove();
    var time_flag = $(this).data("value");
    delete TIME_OBJ[week_id][time_flag];
});

/*
 保存设置好的录像计划
*/
$("#save_nvr").click(function () {
    if($("#all_day")[0].checked == true){
        var all_day = 1;
    }else {
        var all_day = 0;
    }
    function translateTimeObj(obj) {
        if(JSON.stringify(obj) == "{}"){
            var value = undefined;
        }else {
            var value = [];
            for(var i in obj){
                value.push(obj[i]);
            }
        }
        return value;
    }
    var mon = translateTimeObj(TIME_OBJ.mon_time_list);
    var tue = translateTimeObj(TIME_OBJ.tue_time_list);
    var wed = translateTimeObj(TIME_OBJ.wed_time_list);
    var thu = translateTimeObj(TIME_OBJ.thu_time_list);
    var fri = translateTimeObj(TIME_OBJ.fri_time_list);
    var sat = translateTimeObj(TIME_OBJ.sat_time_list);
    var sun = translateTimeObj(TIME_OBJ.sun_time_list);
    HG_AJAX("/position_sdk/ModularVideo/Equip/addAllRecordOrder",{
        camera_id:EQUIP_ID,
        all_day:all_day,
        mon:mon,
        tue:tue,
        wed:wed,
        thu:thu,
        fri:fri,
        sat:sat,
        sun:sun
    },"post",function (data) {
        if(data.type == 1){
            $("#modal_set_nvr").modal("hide");
            getCount();
            getAllEquip();
        }else {
            HG_MESSAGE(data.result);
        }
    })
});

/*
 点击列表视图里“删除录像计划”，弹出删除录像计划的模态框
*/
$("#list_view_table tbody").on("click",".del_nvr",function () {
    EQUIP_ID = $(this).parent().data("id");
    $("#modal_del_nvr").modal("show");
});

/*
 点击模态框里的“确定”，确定删除该录像计划
*/
$("#confirm_delete_nvr").click(function () {
    HG_AJAX("/position_sdk/ModularVideo/Equip/delAllRecordOrder",{camera_id:EQUIP_ID},"post",function (data) {
        if(data.type == 1){
            $("#modal_del_nvr").modal("hide");
            getCount();
            getAllEquip();
        }else {
            HG_MESSAGE(data.result);
        }
    })
});

/*
 点击列表视图里“查看录像结果”，查看该摄像头的录制的结果列表
*/
$("#list_view_table tbody").on("click",".show_record_list",function () {
    EQUIP_ID = $(this).parent().data("id");
    $("#modal_show_record h4").html(EQUIP_DATA[EQUIP_ID].name+"--录像结果列表");
    $("#modal_show_record").modal("show");
    initDayTime("search_start_data","search_end_data");
    initDateTime("search_start_time","search_end_time","search_start_data","search_end_data");
    $("#record_list").html("");
    getRecordInfo();
});

/*
 点击录像结果列表里“删除”图标，删除这条记录的视频
*/
$("#record_list").on("click",".glyphicon-trash",function () {
    var id = $(this).data("id");
    HG_AJAX("/position_sdk/ModularVideo/Equip/delRecordInfo",{id:[id]},"post",function (data) {
        if(data.type == 1){
            HG_MESSAGE("删除成功");
            getRecordInfo();
        }else {
            HG_MESSAGE(data.result);
        }
    })
});

/*
 根据选择的时间段，查询该时间段的录像结果
*/
$("#query_record").click(function () {
    getRecordInfo();
});

/*
 点击录像结果列表里“查看”图标，查看该视频
*/
$("#record_list").on("click",".glyphicon-eye-open",function () {
    var file_name = AJAX_URL +"/position_sdk/"+ $(this).data("file");
    $("video").attr("src",file_name);
    $("#modal_show_video").modal("show")
});




