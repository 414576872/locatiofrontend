var MY_MAP;//地图对象
var ADD_DRAW_ID;//新建区域id
var DRAW = false;//绘画模式是否开启
var GROUP_AREA = {};//将获取的区域信息出入一个对象中
var ALL_ZONE = {};//所有的区域信息
var ALREADY_ZONE = [];//已显示区域列表
var EDIT_ID;//用于编辑的id
var CHECKED_INPUT = {};
var EDIT_CHECKED_INPUT = {};
var NEW_AREA = {
    area: "",
    zoom_area: "",
    name: "",
    relative_start: "",
    relative_end: "",
    area_style: "",
    line_style: "",
    alarm_rule_ids: [""],
    type: ""
};//新建区域用的对像,新建区域需要好几个步骤才能完成,所有用对象存放
var DRAWING = false;//正在绘制的时候,进行其他操作将会弹出提示框
var EDITING = false;//正在修改的时候,进行其他操作将会弹出提示框
var FLOOR_ID;//当前的楼层id
var FLOOR_DATA = {};//楼层信息.用于获取地图缩放比例,判断楼层中是否存在地图
var CENTER;//初始地图视点
var ZOOM;//初始地图缩放比
var STATION_DATA;//保存初始化得到的所有基站信息
var ICON_SCALE;//当地图缩放时，地图上的图标需要缩放的比例值
var TEXT_SCALE;//当地图缩放时，地图上的图标的字需要缩放的比例值
var ALL_AREA_POINT = {};//保存当前楼层所有区域的点对象
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
                var url =AJAX_URL + FLOOR_DATA[id].file_2d_path;
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
 获取区域函数
*/
function getArea() {
    for (var k in ALREADY_ZONE) {
        MY_MAP.removeOneZone(k);
    }
    ALREADY_ZONE = [];
    ALL_ZONE = {};
    ALL_AREA_POINT = {};
    $("#area_list").find("thead").find("input")[0].checked = false;
    HG_AJAX("/position_sdk/ModularArea/Area/getArea", {
        floor_id: FLOOR_ID
    },'post',function (data) {
        if (data.type == 1) {
            var result = data.result;
            var table = "";
            $(result).each(function () {
                GROUP_AREA[this.id] = this;
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
                table += "<tr><td><input type='checkbox' data-id='" + this.id + "'></td>" +
                    "<td>" + this.name + "</td>" +
                    "<td><i class='glyphicon glyphicon-edit icon_area_basic_set' data-id='" + this.id + "'></i>" +
                    "<i class='glyphicon glyphicon-user icon_area_jurisdiction_set' data-id='" + this.id + "'></i>" +
                    "<i class='glyphicon glyphicon-trash icon_area_delete' data-id='" + this.id + "'></i>" +
                    "</td></tr>";
            });
            $("#table_area").html(table);
        } else {
            HG_MESSAGE(data.result);
        }
    });
}

/*
 初始化地图
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
    //地图加载进度
    MY_MAP.on('progress',function (e) {
        var progress = e.progress*100;
        $(".progress_bar p").html(progress.toFixed(1)+"%");
        $(".progress_bar_top").css("width",progress+"%");
    });
    //地图加载完成后
    MY_MAP.on('loaded',function () {
        $("#loading_img").hide();
        if(FLOOR_ID){
            CENTER = MY_MAP.getCenter();
            ZOOM = MY_MAP.getZoom();
            getIconScale();
            MY_MAP.setMapTextScale(TEXT_SCALE);
            //初始化区域
            getArea();
            //初始化基站图标
            getAllBaseStation();
            //缩放地图事件操作
            MY_MAP.getView().on('change:zoom', function () {
                getIconScale();
                MY_MAP.setMapTextScale(TEXT_SCALE);
                //改变基站图标大小
                changeStation(ICON_SCALE,TEXT_SCALE);
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
 显示所有基站
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
 规则类型值转换为字符串
*/
function checkType(type) {
    switch (type) {
        case "1":
            return "仅允许进入";
            break;
        case "2":
            return "仅拒绝进入";
            break;
        case "3":
            return "仅允许离开";
            break;
        case "4":
            return "仅拒绝离开";
            break;
        case "5":
            return "区域超时";
            break;
        case "6":
            return "区域不动";
            break;
        case "7":
            return "区域消失";
            break;
        case "8":
            return "聚众报警";
            break;
        default:
            return "无判断"
    }
}

/*
 得到所有规则数据
*/
function getAllAddRule() {
    var rule_name = checkInputNull($("#search_rule_name").val());
    if(!$("#search_rule_type").val()){
        var rule_type = [1,2,3,4,5,6,7,8];
    }else {
        var rule_type = [$("#search_rule_type").val()];
    }
    $("#area_rule_all_add")[0].checked = false;
    HG_AJAX("/position_sdk/ModularAlarmRule/AlarmRule/getAlarmRule",{
        name: rule_name,
        type: rule_type
    },'post',function (data) {
        if (data.type == 1) {
            var result = data.result;
            var html = "";
            $(result).each(function (index) {
                html += "<tr>" +
                    "<td><input type='checkbox' data-id='"+this.id+"'></td>"+
                    "<td>" + this.name + "</td>" +
                    "<td>" + checkType(this.type) + "</td>" +
                    "<td>" + checkNull(this.comment) + "</td>" +
                    "</tr>";
            });
            $("#list_area_rule_add").html(html);
            var check_flag = 0;
            for (var i in result) {
                if (CHECKED_INPUT[result[i].id]) {
                    if(CHECKED_INPUT[result[i].id].flag == true){
                        $("#list_area_rule_add input[data-id=" + result[i].id + "]")[0].checked = true;
                        check_flag++;
                    }
                }
            }
            var input = $("#list_area_rule_add").find("input");
            if (check_flag == input.length) {
                $("#area_rule_all_add")[0].checked = true;
            } else {
                $("#area_rule_all_add")[0].checked = false;
            }
        } else {
            HG_MESSAGE(data.result);
        }
    });
}

/*
 初始化得到所有需要修改规则数据
*/
function getAllEditRule() {
    var rule_name = checkInputNull($("#edit_search_name").val());
    if(!$("#edit_rule_type").val()){
        var rule_type = [1,2,3,4,5,6,7,8];
    }else {
        var rule_type = [$("#edit_rule_type").val()];
    }
    $("#area_rule_all_update")[0].checked = false;
    HG_AJAX("/position_sdk/ModularAlarmRule/AlarmRule/getAlarmRule",{
        name: rule_name,
        type: rule_type
    },'post',function (data) {
        if (data.type == 1) {
            var result = data.result;
            var html = "";
            $(result).each(function (index) {
                html += "<tr>" +
                    "<td><input type='checkbox' data-id='"+this.id+"'></td>"+
                    "<td>" + this.name + "</td>" +
                    "<td>" + checkType(this.type) + "</td>" +
                    "<td>" + checkNull(this.comment) + "</td>" +
                    "</tr>";
            });
            $("#list_area_rule_update").html(html);//写入修改区域的权限卡号列表
            if(EDIT_ID && GROUP_AREA[EDIT_ID].alarm_rule_ids){
                for (var i in GROUP_AREA[EDIT_ID].alarm_rule_ids){
                    EDIT_CHECKED_INPUT[GROUP_AREA[EDIT_ID].alarm_rule_ids[i]] = {
                        "flag":true,
                        "rule_id":GROUP_AREA[EDIT_ID].alarm_rule_ids[i]
                    }
                }
            }
            var check_flag = 0;
            for (var i in result) {
                if (EDIT_CHECKED_INPUT[result[i].id]) {
                    if(EDIT_CHECKED_INPUT[result[i].id].flag == true){
                        $("#list_area_rule_update input[data-id=" + result[i].id + "]")[0].checked = true;
                        check_flag++;
                    }
                }
            }
            var input = $("#list_area_rule_update").find("input");
            if (check_flag == input.length) {
                $("#area_rule_all_update")[0].checked = true;
            } else {
                $("#area_rule_all_update")[0].checked = false;
            }
        } else {
            HG_MESSAGE(data.result);
        }
    });
}

/*
 查询所有需要修改规则数据
*/
function getQueryEditRule() {
    var rule_name = checkInputNull($("#edit_search_name").val());
    if(!$("#edit_rule_type").val()){
        var rule_type = [1,2,3,4,5,6,7,8];
    }else {
        var rule_type = [$("#edit_rule_type").val()];
    }
    $("#area_rule_all_update")[0].checked = false;
    HG_AJAX("/position_sdk/ModularAlarmRule/AlarmRule/getAlarmRule",{
        name: rule_name,
        type: rule_type
    },'post',function (data) {
        if (data.type == 1) {
            var result = data.result;
            var html = "";
            $(result).each(function (index) {
                html += "<tr>" +
                    "<td><input type='checkbox' data-id='"+this.id+"'></td>"+
                    "<td>" + this.name + "</td>" +
                    "<td>" + checkType(this.type) + "</td>" +
                    "<td>" + checkNull(this.comment) + "</td>" +
                    "</tr>";
            });
            $("#list_area_rule_update").html(html);//写入修改区域的权限卡号列表
            var check_flag = 0;
            for (var i in result) {
                if (EDIT_CHECKED_INPUT[result[i].id]) {
                    if(EDIT_CHECKED_INPUT[result[i].id].flag == true){
                        $("#list_area_rule_update input[data-id=" + result[i].id + "]")[0].checked = true;
                        check_flag++;
                    }
                }
            }
            var input = $("#list_area_rule_update").find("input");
            if (check_flag == input.length) {
                $("#area_rule_all_update")[0].checked = true;
            } else {
                $("#area_rule_all_update")[0].checked = false;
            }
        } else {
            HG_MESSAGE(data.result);
        }
    });
}

/*
 绘制区域图形转字符串
*/
function areaTrans(array) {
    var string = array.join(" ");
    return string;
}

/*
 清除新建区域中的输入
*/
function clearAddInput() {
    var input = $("#modal_area_add_set").find("input");
    $(input).each(function () {
        if ($(this).attr("type") == "text") {
            $(this).val("");
        }
        if ($(this).attr("type") == "checkbox") {
            $(this)[0].checked = false;
        }
    });
    $("#select_area_type_add option:first").prop("selected", "selected");
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
 初始执行
*/
$(function () {
    //初始化地图
    getAllFloor();
    //获取所有规则信息
    getAllAddRule();
    setInterval(function () {
        getAllBaseStation();
    }, 4000);
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
                if (typeof console === 'object') {
                    console.log(value);
                }
            },
            theme: 'bootstrap'
        });
    });
});

/*
 切换地图
*/
$("#floor_select").change(function () {
    var floor_id = $("#floor_select").val();
    if(FLOOR_DATA[floor_id].floor_2d_file =="0"){
        HG_MESSAGE("没有相关地图文件，无法切换");
        $("#floor_select").val(FLOOR_ID);
        return;
    }
    if (DRAWING) {
        $("#modal_area_drawing").modal("show");
        return;
    }
    if (EDITING) {
        $("#modal_area_editing").modal("show");
        return;
    }
    MY_MAP.reset();
    FLOOR_ID = floor_id;
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
        MY_MAP.changeMap(AJAX_URL + FLOOR_DATA[FLOOR_ID].file_2d_path, obj.center, obj.zoom,"kml",[],{extent:obj.extent,zoom_factor:1.5});
    }else {
        MY_MAP.changeMap(AJAX_URL + FLOOR_DATA[FLOOR_ID].file_2d_path, obj.center, obj.zoom,"image",extend,{extent:obj.extent,zoom_factor:1.5});
    }
});

/*
 点击区域列表,显示或者隐藏区域列表
*/
$("#area_title").click(function () {
    var glyphicon = $(this).find("i").attr("class");
    if (glyphicon == "glyphicon glyphicon-chevron-down") {
        $(this).find("i").attr("class", "glyphicon glyphicon-chevron-right");
        $("#area_list").slideUp();
    } else {
        $(this).find("i").attr("class", "glyphicon glyphicon-chevron-down");
        $("#area_list").slideDown();
    }
});

/*
 右侧菜单,区域列表面板中,区域列表的表头点击多选框,实现所有区域都选中
*/
$("#area_list").find("thead").find("input").click(function () {
    var input = $("#area_list").find("tbody").find("input");
    if ($(this)[0].checked) {
        for (var j in ALL_ZONE) {
            if (!ALREADY_ZONE[j]) {
                ALREADY_ZONE[j] = true;
                MY_MAP.addZone(ALL_ZONE[j].area, j, ALL_ZONE[j].name, ALL_ZONE[j].color);
                ALL_AREA_POINT[j] = moveViewToArea(ALL_ZONE[j].area,false);
            }
        }
        $(input).each(function () {
            $(this)[0].checked = true;
        });
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
        for (var k in ALL_ZONE) {
            MY_MAP.removeOneZone(k);
        }
        ALREADY_ZONE = [];
        $(input).each(function () {
            $(this)[0].checked = false;
        });
    }
});

/*
 区域列表,选择列表中的多选框,实现单个区域的显示和隐藏
*/
$("#table_area").on("click", "input", function () {
    var id = $(this).data("id");
    if ($(this)[0].checked) {
        MY_MAP.addZone(ALL_ZONE[id].area, id, ALL_ZONE[id].name, ALL_ZONE[id].color);
        ALL_AREA_POINT[id] = moveViewToArea(ALL_ZONE[id].area,true);
        ALREADY_ZONE[id] = true;
        var input = $("#table_area").find("input");
        var num = 0;
        $(input).each(function () {
            if ($(this)[0].checked) {
                num += 1;
                if (num == input.length) {
                    $("#area_list").find("thead").find("input")[0].checked = true;
                }
            }
        });
    } else {
        MY_MAP.removeOneZone(id);
        delete ALREADY_ZONE[id];
        $("#area_list").find("thead").find("input")[0].checked = false;
    }
});

/*
 点击新增区域,打开绘制类型
*/
$("#area_draw_btn").click(function () {
    if (DRAWING) {
        $("#modal_area_drawing").modal("show");
        return;
    }
    if (EDITING) {
        $("#modal_area_editing").modal("show");
        return;
    }
    $("#draw_type_menu").css("display", "table");
    $("#draw_box").click();
});

/*
 点击绘制类型右侧的取消,关闭绘制类型
*/
$("#draw_cancel").click(function () {
    if (DRAWING) {
        $("#modal_area_drawing").modal("show");
        return;
    }
    if (DRAW) {
        MY_MAP.removeInteraction(DRAW);
        DRAW = undefined;
    }
    $("#draw_type_menu").css("display", "none");
    $("#draw_list").hide();
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
        $("#modal_area_drawing").modal("show");
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
        ADD_DRAW_ID = -1001;
        NEW_AREA.area = areaTrans(polygon[0]);
        MY_MAP.addZone(polygon[0], ADD_DRAW_ID, "新增区域");  //新加区域
        $("#draw_list").show();
        $("#draw_list").find(".minicolors-swatch-color").css("background-color", "rgba(52, 64, 158, 0.5)");
        $("#area_color_set").val("rgba(52, 64, 158, 0.5)");
        MY_MAP.removeInteraction(DRAW);  //删除绘制方式
        DRAWING = true;
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
        $("#modal_area_drawing").modal("show");
        return;
    }
    $("#draw_type").html("矩形<span class='caret'></span>");
    $("#draw_info").val("先画一个顶点,再拖动");
    if (DRAW) {
        MY_MAP.removeInteraction(DRAW);
    }
    DRAW = new HG2DMap.draw.rectangle; //实例化一个绘制矩形的方法
    MY_MAP.addInteraction(DRAW);  //将绘制矩形方法添加到场景
    //绘制完成后,得到所绘制图形的坐标点,将图形添加到场景中,并且删除绘制矩形形的方式,方便再次添加绘制方法
    DRAW.on("drawend", function (e) {
        var polygon = e.feature.getGeometry().getCoordinates(); //获取图形坐标点
        ADD_DRAW_ID = -1002;
        NEW_AREA.area = areaTrans(polygon[0]);
        MY_MAP.addZone(polygon[0], ADD_DRAW_ID, "新增区域"); //新加区域
        $("#draw_list").show();
        $("#draw_list").find(".minicolors-swatch-color").css("background-color", "rgba(52, 64, 158, 0.5)");
        $("#area_color_set").val("rgba(52, 64, 158, 0.5)");
        MY_MAP.removeInteraction(DRAW);  //删除绘制方式
        DRAWING = true;
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
        $("#modal_area_drawing").modal("show");
        return;
    }
    $("#draw_type").html("多边形<span class='caret'></span>");
    $("#draw_info").val("单击依次画点");
    if (DRAW) {
        MY_MAP.removeInteraction(DRAW);
    }
    DRAW = new HG2DMap.draw.polygon; //实例化一个绘制多边形的方法
    MY_MAP.addInteraction(DRAW); //将绘制矩形的方法添加入场景
    //绘制完成后,得到所绘制图形的坐标点,将图形添加到场景中,并且删除绘制多边形的方式,方便再次添加绘制方法
    DRAW.on("drawend", function (e) {
        var polygon = e.feature.getGeometry().getCoordinates(); //获取图形坐标点
        //多边形绘制完成后会判断图形是否自相交,使用SDK中的isSelfIntersection()判断
        if((polygon[0][2][0] == polygon[0][1][0]) && (polygon[0][2][1] == polygon[0][1][1])){
            HG_MESSAGE("图形不能是一条直线");
        }else if (!(HG2DMap.draw.isSelfIntersection(polygon[0]))) {
            ADD_DRAW_ID = -1003;
            NEW_AREA.area = areaTrans(polygon[0]);
            MY_MAP.addZone(polygon[0], ADD_DRAW_ID, "新增区域"); //新加区域
            $("#draw_list").show();
            $("#draw_list").find(".minicolors-swatch-color").css("background-color", "rgba(52, 64, 158, 0.5)");
            $("#area_color_set").val("rgba(52, 64, 158, 0.5)");
            MY_MAP.removeInteraction(DRAW);  //删除绘制方式
            DRAWING = true;
            DRAW = undefined;
        } else {
            HG_MESSAGE("图形不能自相交");
        }
    });
});

/*
 正在绘制的时候,弹出提示框,点击确定,取消绘制操作
*/
$("#button_area_drawing_sure").click(function () {
    DRAWING = false;
    MY_MAP.removeOneZone(ADD_DRAW_ID); //取消的时候删除新增的区域
    $("#draw_list").hide();
    $("#draw_type").html("类型<span class='caret'></span>");
    $("#draw_info").val("请选择需要绘制的类型");
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
 新建区域颜色设置
*/
$("#area_color_set").change(function () {
    var val = $(this).val();
    MY_MAP.setZoneColor(ADD_DRAW_ID, val); //设置区域的颜色
});

/*
 取消保存绘制好的图形
*/
$("#draw_list_cancel").click(function () {
    MY_MAP.removeOneZone(ADD_DRAW_ID);
    $("#draw_list").hide();
    DRAWING = false;
    $("#draw_type").html("类型<span class='caret'></span>");
    $("#draw_info").val("请选择需要绘制的类型");
});

/*
 保存绘制好的图形
*/
$("#button_area_add_set").click(function () {
    var color = $("#area_color_set").val();
    NEW_AREA.area_style = color;
    NEW_AREA.line_style = color;
    CHECKED_INPUT = {};
    $("#input_area_z_start_add").val(0);
    $("#input_area_z_end_add").val(parseFloat(FLOOR_DATA[FLOOR_ID].height) - parseFloat(FLOOR_DATA[FLOOR_ID].start));
    $("#modal_area_add_set").modal("show");
});

/*
 新增区域设置面板中点击下一步
*/
$("#area_add_next").click(function () {
    $("#area_add_basic_set").hide();
    $("#area_add_jurisdiction_set").show();
});

/*
 新增区域设置面板中点击上一步
*/
$("#area_add_prev").click(function () {
    $("#area_add_basic_set").show();
    $("#area_add_jurisdiction_set").hide();
});

/*
 查询新增区域的规则列表
*/
$("#query_rule").click(function () {
    getAllAddRule();
});

/*
 规则设置点击规则 若为不选  取消全选状态
*/
$("#area_rule_all_add").click(function () {
    var input = $("#list_area_rule_add").find("input");
    if ($(this)[0].checked) {
        for (var i = 0; i < input.length; i++) {
            if ($(input[i])[0].checked == false) {
                $(input[i])[0].checked = true;
                var id = $(input[i]).data("id");
                CHECKED_INPUT[id]= {
                    "flag":true,
                    "rule_id":id
                }
            }
        }
    } else {
        for (var o = 0; o < input.length; o++) {
            if ($(input[o])[0].checked == true) {
                $(input[o])[0].checked = false;
                var id = $(input[o]).data("id");
                CHECKED_INPUT[id]= {
                    "flag":false,
                    "rule_id":id
                };
            }
        }
    }
});

/*
 点击规则列表前的单选按钮，选中规则
*/
$("#list_area_rule_add").on("click", "input", function () {
    var check_flag = 0;
    var input = $("#list_area_rule_add").find("input");
    var id = $(this).data("id");
    for (var i = 0; i < input.length; i++) {
        if ($(input[i])[0].checked == true) {
            check_flag++;
        }
    }
    if (check_flag == input.length) {
        $("#area_rule_all_add")[0].checked = true;
    } else {
        $("#area_rule_all_add")[0].checked = false;
    }
    if (this.checked) {
        CHECKED_INPUT[id]= {
            "flag":true,
            "rule_id":id
        };
    } else {
        CHECKED_INPUT[id]= {
            "flag":false,
            "rule_id":id
        };
    }
});

/*
 新增区域设置面板保存
*/
$("#button_area_add_save").click(function () {
    NEW_AREA.name = $("#input_area_name_add").val();
    NEW_AREA.relative_start = $("#input_area_z_start_add").val();
    NEW_AREA.relative_end = $("#input_area_z_end_add").val();
    NEW_AREA.zoom_area = NEW_AREA.area;
    NEW_AREA.type = $("#select_area_type_add").val();
    if (NEW_AREA.name == "") {
        HG_MESSAGE("区域名字不能为空");
        return;
    }
    if ((!$("#input_area_z_start_add").val()) || (isNaN($("#input_area_z_start_add").val())) ){
        HG_MESSAGE("无效的起始高度");
        return;
    }
    if ((!$("#input_area_z_end_add").val()) || (isNaN($("#input_area_z_end_add").val()))){
        HG_MESSAGE("无效的终止高度");
        return;
    }
    if (parseFloat($("#input_area_z_start_add").val()) >= parseFloat($("#input_area_z_end_add").val())){
        HG_MESSAGE("终止高度应大于起始高度");
        return;
    }
    NEW_AREA.alarm_rule_ids = [""];
    for(var i in CHECKED_INPUT){
        if(CHECKED_INPUT[i].flag == true){
            NEW_AREA.alarm_rule_ids.push(CHECKED_INPUT[i].rule_id);
        }
    }
    HG_AJAX("/position_sdk/ModularArea/Area/addArea", {
        floor_id:FLOOR_ID,
        area:NEW_AREA.area,
        name:NEW_AREA.name,
        relative_start:NEW_AREA.relative_start,
        relative_end:NEW_AREA.relative_end,
        type:NEW_AREA.type,
        zoom_area:NEW_AREA.zoom_area,
        alarm_rule_ids:NEW_AREA.alarm_rule_ids,
        area_style: NEW_AREA.area_style,
        line_style: NEW_AREA.line_style
    },'post',function (data) {
        if (data.type == 1) {
            DRAWING = false;
            MY_MAP.removeOneZone(ADD_DRAW_ID);
            clearAddInput();
            $("#area_add_basic_set").show();
            $("#area_add_jurisdiction_set").hide();
            $("#draw_type_menu").css("display", "none");
            $("#draw_list").hide();
            $("#modal_area_add_set").modal("hide");
            getArea();
            HG_MESSAGE("新增成功");
        } else {
            HG_MESSAGE(data.result);
        }
    });
});

/*
 新建区域的时候点击取消清空输入信息
*/
$("#button_area_add_cancel").click(clearAddInput);

/*
 区域列表 点击删除弹出删除确定框
*/
$("#table_area").on("click", ".icon_area_delete", function () {
    if (DRAWING) {
        $("#modal_area_drawing").modal("show");
        return;
    }
    if (EDITING) {
        $("#modal_area_editing").modal("show");
        return;
    }
    EDIT_ID = $(this).data("id");
    $("#modal_area_delete").modal("show");
});

/*
 确定删除
*/
$("#button_area_delete_save").click(function () {
    HG_AJAX("/position_sdk/ModularArea/Area/deleteArea", { id: EDIT_ID},'post',function (data) {
        if (data.type == 1) {
            getArea();
            HG_MESSAGE("删除成功");
        } else {
            HG_MESSAGE(data.result);
        }
    });
});

/*
 区域列表中点击设置 弹出基础设置面板
*/
$("#table_area").on("click", ".icon_area_basic_set", function () {
    if (DRAWING) {
        $("#modal_area_drawing").modal("show");
        return;
    }
    EDITING = true;
    $("#panel_area_basic_update").show();
    EDIT_ID = $(this).data("id");
    $(this).parents("tr").find("input")[0].checked = true;
    $($(this).parents("tr").find("input")).attr("disabled",true);
    if (!ALREADY_ZONE[EDIT_ID]) {
        ALREADY_ZONE[EDIT_ID] = true;
        MY_MAP.addZone(ALL_ZONE[EDIT_ID].area, EDIT_ID, ALL_ZONE[EDIT_ID].name, ALL_ZONE[EDIT_ID].color);
        ALL_AREA_POINT[EDIT_ID] = moveViewToArea(ALL_ZONE[EDIT_ID].area,true);
    }
    $("#input_area_color_update").val(GROUP_AREA[EDIT_ID].area_style);
    $("#panel_area_basic_update").find(".minicolors-swatch-color").css("background-color", GROUP_AREA[EDIT_ID].area_style);
    $("#input_area_name_update").val(GROUP_AREA[EDIT_ID].name);
    $("#input_area_z_start_update").val(GROUP_AREA[EDIT_ID].relative_start);
    $("#input_area_z_end_update").val(GROUP_AREA[EDIT_ID].relative_end);
    $("#select_area_type_update").val(GROUP_AREA[EDIT_ID].type);
    $("#select_area_is_use_update").val(GROUP_AREA[EDIT_ID].is_use);
});

/*
 正在修改的时候,进行其他操作后的弹出框中点击确定
*/
$("#button_area_editing_sure").click(function () {
    EDITING = false;
    $("#button_area_basic_update_cancel").click();
});

/*
 区域修改基本修改中,修改区域颜色
*/
$("#input_area_color_update").change(function () {
    var val = $(this).val();
    MY_MAP.setZoneColor(EDIT_ID, val); //设置区域颜色
});

/*
 区域修改基本修改中,修改区域名字
*/
$("#input_area_name_update").change(function () {
    var name = $(this).val();
    MY_MAP.setZoneText(EDIT_ID, name); //设置了区域名字
});

/*
 保存区域基本信息修改
*/
$("#button_area_basic_update_save").click(function () {
    EDITING = false;
    var name = $("#input_area_name_update").val();
    var type = $("#select_area_type_update").val();
    var relative_start = $("#input_area_z_start_update").val();
    var relative_end = $("#input_area_z_end_update").val();
    var color = $("#input_area_color_update").val();
    var is_use = $("#select_area_is_use_update").val();
    if (name == "") {
        HG_MESSAGE("区域名字不能为空");
        return;
    }
    if ((!$("#input_area_z_start_update").val()) || (isNaN($("#input_area_z_start_update").val())) ){
        HG_MESSAGE("无效的起始高度");
        return;
    }
    if ((!$("#input_area_z_end_update").val()) || (isNaN($("#input_area_z_end_update").val()))){
        HG_MESSAGE("无效的终止高度");
        return;
    }
    if (parseFloat($("#input_area_z_start_update").val()) >= parseFloat($("#input_area_z_end_update").val())){
        HG_MESSAGE("终止高度应大于起始高度");
        return;
    }
    HG_AJAX("/position_sdk/ModularArea/Area/updateArea",{
        id: EDIT_ID,
        name: name,
        type: type,
        relative_start: relative_start,
        relative_end: relative_end,
        area_style: color,
        line_style: color,
        is_use:is_use
    },'post',function (data) {
        if (data.type == 1) {
            $("#panel_area_basic_update").hide();
            getArea();
            HG_MESSAGE("修改成功");
        } else {
            HG_MESSAGE(data.result);
        }
    });
});

/*
 取消区域基本信息修改
*/
$("#button_area_basic_update_cancel").click(function () {
    EDITING = false;
    MY_MAP.setZoneColor(EDIT_ID, GROUP_AREA[EDIT_ID].area_style);
    MY_MAP.setZoneText(EDIT_ID, GROUP_AREA[EDIT_ID].name);
    var all_input = $("#table_area").find("input[type=checkbox]");
    for (var i=0;i<all_input.length;i++){
        $(all_input[i]).attr("disabled",false);
    }
    $("#panel_area_basic_update").hide();
});

/*
 区域规则设置修改
*/
$("#table_area").on("click", ".icon_area_jurisdiction_set", function () {
    if (DRAWING) {
        $("#modal_area_drawing").modal("show");
        return;
    }
    if (EDITING) {
        $("#modal_area_editing").modal("show");
        return;
    }
    EDIT_ID = $(this).data("id");
    $("#edit_search_name").val("");
    $("#edit_rule_type").val("");
    EDIT_CHECKED_INPUT = {};
    $(this).parents("tr").find("input")[0].checked = true;
    $($(this).parents("tr").find("input")).attr("disabled",true);
    if (!ALREADY_ZONE[EDIT_ID]) {
        ALREADY_ZONE[EDIT_ID] = true;
        MY_MAP.addZone(ALL_ZONE[EDIT_ID].area, EDIT_ID, ALL_ZONE[EDIT_ID].name, ALL_ZONE[EDIT_ID].color);
        ALL_AREA_POINT[EDIT_ID] = moveViewToArea(ALL_ZONE[EDIT_ID].area,true);
    }
    $("#modal_area_jurisdiction_update").modal("show");
    getAllEditRule();
});

/*
 查询修改区域的规则列表
*/
$("#edit_query_rule").click(function () {
    getQueryEditRule();
});

/*
 修改规则设置点击规则 若为不选  取消全选状态
*/
$("#area_rule_all_update").click(function () {
    var input = $("#list_area_rule_update").find("input");
    if ($(this)[0].checked) {
        for (var i = 0; i < input.length; i++) {
            if ($(input[i])[0].checked == false) {
                $(input[i])[0].checked = true;
                var id = $(input[i]).data("id");
                EDIT_CHECKED_INPUT[id]= {
                    "flag":true,
                    "rule_id":id
                }
            }
        }
    } else {
        for (var o = 0; o < input.length; o++) {
            if ($(input[o])[0].checked == true) {
                $(input[o])[0].checked = false;
                var id = $(input[o]).data("id");
                EDIT_CHECKED_INPUT[id]= {
                    "flag":false,
                    "rule_id":id
                };
            }
        }
    }
});

/*
 点击修改规则列表前的单选按钮，选中规则
*/
$("#list_area_rule_update").on("click", "input", function () {
    var check_flag = 0;
    var input = $("#list_area_rule_update").find("input");
    var id = $(this).data("id");
    for (var i = 0; i < input.length; i++) {
        if ($(input[i])[0].checked == true) {
            check_flag++;
        }
    }
    if (check_flag == input.length) {
        $("#area_rule_all_update")[0].checked = true;
    } else {
        $("#area_rule_all_update")[0].checked = false;
    }
    if (this.checked) {
        EDIT_CHECKED_INPUT[id]= {
            "flag":true,
            "rule_id":id
        };
    } else {
        EDIT_CHECKED_INPUT[id]= {
            "flag":false,
            "rule_id":id
        };
    }
});

/*
 区域规则设置取消修改
*/
$("#rule_update_cancel").click(function () {
    var all_input = $("#table_area").find("input[type=checkbox]");
    for (var i=0;i<all_input.length;i++){
        $(all_input[i]).attr("disabled",false);
    }
});

/*
 区域规则设置保存修改
*/
$("#button_area_jurisdiction_update_save").click(function () {
    var alarm_rule_ids = [""];
    for(var i in EDIT_CHECKED_INPUT){
        if(EDIT_CHECKED_INPUT[i].flag == true){
            alarm_rule_ids.push(EDIT_CHECKED_INPUT[i].rule_id);
        }
    }
    HG_AJAX("/position_sdk/ModularArea/Area/updateArea",{
        id: EDIT_ID,
        alarm_rule_ids: alarm_rule_ids
    },'post',function (data) {
        if (data.type == 1) {
            getArea();
        } else {
            HG_MESSAGE(data.result);
        }
    });
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
    //调用2d地图SDK中的删除测量工具
    MY_MAP.removeControlMeasure();
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