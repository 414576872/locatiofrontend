var FLOOR_ID;//楼层id
var UPLOADER;//上传地图文件初始化对象
var MAP_TYPE;//地图类型
var EXT;//地图文件后缀名
var FLOOR_DATA = {};//楼层数据初始化
var NOW_PAGE = 1;//地图分页的当前页
var LIMIT = 50;//地图分页每页显示数量
var TOTAL_PAGE = 0;
var MY_MAP;//上传图片地图时的临时预览地图对象
var MAP_WIDTH;//图片地图的分辨率
var MAP_HEIGHT;//图片地图的分辨率
var MAP_URL;//地图上传的服务器地址
var XMIN;//地图坐标系的x最小
var YMIN;//地图坐标系的y最小
var XMAX;//地图坐标系的x最大
var YMAX;//地图坐标系的y最大
var DRAW = false;//地图绘制线条对象
var POLYGON;//绘制点坐标
var MY_3DMAP;//3d地图对象
var LOCATION_X;//地图x偏移量
var LOCATION_Y;//地图y偏移量

/*
 获取所有的场景
*/
function getAllScene() {
    HG_AJAX("/position_sdk/ModularScene/Scene/getScene",{},"post",function (data) {
        if (data.type == 1){
            var data = data.result;
            var option = '';
            $(data).each(function (index,ele) {
                option+="<option value="+data[index].id+">"+data[index].name+"</option>";
            });
            $("#select_scene").html(option);
            var scene_id = $("#select_scene").val();
            getBuilding(scene_id);
        }
    });
}

/*
 获取所有的建筑
*/
function getBuilding(scene_id) {
    HG_AJAX("/position_sdk/ModularBuilding/Building/getBuilding",{scene_id:scene_id},"post",function (data) {
        if (data.type == 1){
            var data = data.result;
            var option = "";
            $(data).each(function (index,ele) {
                option+="<option value="+data[index].id+">"+data[index].name+"</option>";
            });
            $("#select_building").html(option);
            getMap();//楼层列表初始化
            get();
        }
    });
}

/*
 处理2D地图的功能图标
*/
function is2DMap(value) {
    if(value==0){
        return "<i class='glyphicon glyphicon-open handle_map' data-type='2d'></i>";
    }else {
        return "<i class='glyphicon glyphicon-edit handle_map' data-type='2d'></i>";
    }
}

/*
 分页
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
                getMap();
            }
        }
    });
}

/*
 显示2d地图函数
*/
function map2dShow() {
    //如果3d地图对象MY_3DMAP存在，则立即停止渲染3d地图
    if(MY_3DMAP){
        $("#loading_img").hide();
        MY_3DMAP.stopLoadScene();
    }
    var scene_id = $("#select_scene").val();
    var building_id = $("#select_building").val();
    $("#map").html("");
    var file_type = FLOOR_DATA[FLOOR_ID].file_2d_postfix;
    //得到地图文件的坐标值[left,down,right,upper],必须是这个顺序
    var extend = [FLOOR_DATA[FLOOR_ID].coordinate_left,FLOOR_DATA[FLOOR_ID].coordinate_down,FLOOR_DATA[FLOOR_ID].coordinate_right,FLOOR_DATA[FLOOR_ID].coordinate_upper];
    //调用mapAutomaticSetting函数返回缩放比，中心视点和地图拖拽比
    var obj =  mapAutomaticSetting(FLOOR_DATA[FLOOR_ID].floor_scaling_ratio,FLOOR_DATA[FLOOR_ID].origin_x,FLOOR_DATA[FLOOR_ID].origin_y,FLOOR_DATA[FLOOR_ID].drop_multiple,extend,"map");
    var is_show = $("#loading_img").css("display");
    if(is_show == "none"){
        $("#loading_img").show();
    }
    if(file_type == 'kml'){
        //调用2d地图SDK,初始化kml地图对象
        var map = new HG2DMap.map(AJAX_URL+FLOOR_DATA[FLOOR_ID].file_2d_path,"map",obj.center,obj.zoom,'kml',[],{extent:obj.extent,zoom_factor:1.5});
    }else {
        //调用2d地图SDK,初始化图片地图对象
        var map = new HG2DMap.map(AJAX_URL+FLOOR_DATA[FLOOR_ID].file_2d_path,"map",obj.center,obj.zoom,'image',extend,{extent:obj.extent,zoom_factor:1.5});
    }
    var my_mouse_postion = new HG2DMap.control.mouse_position();//调用2d地图SDK中的实例化鼠标坐标工具
    var my_scale_line = new HG2DMap.control.scale_line();//调用2d地图SDK中的实例化比例尺工具
    var my_drag_rotate = new HG2DMap.draw.drag_rotate();//调用2d地图SDK中的地图旋转
    map.addInteraction(my_drag_rotate);//调用2d地图SDK中的给地图添加地图旋转
    map.addControl(my_mouse_postion);//调用2d地图SDK中的给地图添加鼠标坐标工具
    map.addControl(my_scale_line);//调用2d地图SDK中的给地图添加比例尺工具
    //地图加载进度
    map.on('progress',function (e) {
        var progress = e.progress*100;
        $(".progress_bar p").html(progress.toFixed(1)+"%");
        $(".progress_bar_top").css("width",progress+"%");
    });
    map.on('loaded',function () {
        $("#loading_img").hide();
        $("#show_zoom").show();
        if(!FLOOR_DATA[FLOOR_ID] || FLOOR_DATA[FLOOR_ID].floor_scaling_ratio==0){
            $("#show_zoom input").val(obj.zoom);
        }else {
            $("#show_zoom input").val(FLOOR_DATA[FLOOR_ID].floor_scaling_ratio);
        }
    });
    map.on("moveend",function (){
        var zoom = map.getZoom();
        $("#show_zoom input").val(zoom);
        var text_scale = 1+(parseInt(zoom)-40)*0.06;
        map.setMapTextScale(text_scale);
    });
}

/*
 显示3d地图函数
*/
function map3dShow() {
    //如果3d地图对象MY_3DMAP存在，则立即停止渲染3d地图
    if(MY_3DMAP){
        $("#loading_img").hide();
        MY_3DMAP.stopLoadScene();
    }
    var scene_id = $("#select_scene").val();
    var building_id = $("#select_building").val();
    $("#map").html("");
    $("#show_zoom").hide();
    MY_3DMAP = new HG3DMap.map();//调用3d地图SDK,定义地图对象
    var init_val = {
        scene_url:AJAX_URL+FLOOR_DATA[FLOOR_ID].file_3d_path,//场景地址
        dom_element:"map",//3d渲染的dom元素
        offset_top:$("#map").offset().top,//地图位置偏移量
        offset_left:$("#map").offset().left,//地图位置偏移量
        model_path:"./json/"
    };
    MY_3DMAP.init(init_val);
    //当浏览器窗口大小改变时，改变它的偏移量
    window.onresize = function(){
        MY_3DMAP.setMapOffset($("#map").offset().top,$("#map").offset().left);
    };
    //地图文件加载完成后,显示图片
    MY_3DMAP.addEventListener("sceneload", function (e) {
        var is_show = $("#loading_img").css("display");
        if(is_show == "none"){
            $("#loading_img").show();
        }
        $(".progress_bar p").html(e.progress + "%");
        $(".progress_bar_top").css("width",e.progress + "%");
        if (e.progress == 100) {
            $("#loading_img").hide();
        }
    });
}

/*
 楼层列表表格获取方法
*/
function getMap() {
    var building_id = $("#select_building").val();
    if(building_id){
        HG_AJAX("/position_sdk/ModularFloor/Floor/getFloor",{building_id:building_id,page:NOW_PAGE,limit:LIMIT},"post",function (data) {
            if (data.type == 1){
                var data = data.result;
                var html = '';
                if(NOW_PAGE == 0){
                    NOW_PAGE = 1;
                }
                $(data).each(function (index,ele) {
                    html+= "<tr class='show_map'><td>"+(index + 1  + ((NOW_PAGE - 1 ) *　LIMIT))+"</td><td>"+data[index].name+"</td><td>"+data[index].start+"</td><td>"+data[index].height+"</td><td data-id="+data[index].id+">"+is2DMap(data[index].floor_2d_file)+"<i class='show_2dmap glyphicon glyphicon-eye-close'></i></td><td data-id="+data[index].id+">"+is3DMap(data[index].floor_3d_file)+"<i class='show_3dmap glyphicon glyphicon-eye-close'></i></td><td data-id="+data[index].id+"><i class='glyphicon glyphicon-edit edit_floor'></i><i class='glyphicon glyphicon-trash'></i></td></tr>"
                    FLOOR_DATA[data[index].id] = data[index];
                });
                $("#table_for_floors tbody").html(html);
                $(".show_map").find(".glyphicon-eye-open").removeClass("glyphicon-eye-open").addClass("glyphicon-eye-close");
                if(data[0] && data[0].floor_2d_file == 1){
                    if(!FLOOR_ID){
                        FLOOR_ID = data[0].id;
                    }
                    if(EXT=="json"){
                        if(FLOOR_DATA[FLOOR_ID].floor_3d_file == 1){
                            $("td[data-id="+FLOOR_ID+"]").find(".show_3dmap").removeClass("glyphicon-eye-close").addClass("glyphicon-eye-open");
                            map3dShow();
                        }else {
                            FLOOR_ID = data[0].id;
                            $("td[data-id="+FLOOR_ID+"]").find(".show_3dmap").removeClass("glyphicon-eye-close").addClass("glyphicon-eye-open");
                            map3dShow();
                        }

                    }else {
                        if(FLOOR_DATA[FLOOR_ID].floor_2d_file == 1){
                            $("td[data-id="+FLOOR_ID+"]").find(".show_2dmap").removeClass("glyphicon-eye-close").addClass("glyphicon-eye-open");
                            map2dShow();
                        }else {
                            FLOOR_ID = data[0].id;
                            $("td[data-id="+FLOOR_ID+"]").find(".show_2dmap").removeClass("glyphicon-eye-close").addClass("glyphicon-eye-open");
                            map2dShow();
                        }
                    }
                }else {
                    //如果3d地图对象MY_3DMAP存在，则立即停止渲染3d地图
                    if(MY_3DMAP){
                        $("#loading_img").hide();
                        MY_3DMAP.stopLoadScene();
                    }
                    $("#map").html("");
                    $("#show_zoom").hide();
                }
            }
        });
    }else {
        $("#table_for_floors tbody").html("");
    }
}

/*
 楼层列表分页总数
*/
function get(){
    var building_id = $("#select_building").val();
    if (building_id){
        HG_AJAX("/position_sdk/ModularFloor/Floor/getCount",{building_id:building_id},"post",function (data) {
            if (data.type == 1) {
                var result = data.result;
                TOTAL_PAGE = Math.ceil(result / LIMIT);
                if (TOTAL_PAGE < NOW_PAGE) {
                    NOW_PAGE = TOTAL_PAGE;
                    getMap();
                }
                getPage();
            } else {
                HG_MESSAGE("获取数据失败");
            }
        });
    }else {
        $("#pages").html("");
    }
}

/*
 处理3D地图的功能图标
*/
function is3DMap(value) {
    if(value==0){
        return "<i class='glyphicon glyphicon-open handle_map' data-type='3d'></i>";
    }else {
        return "<i class='glyphicon glyphicon-edit handle_map' data-type='3d'></i>";
    }
}

/*
 初始执行
*/
$(function () {
    //场景下拉框初始化
    getAllScene();
});


/*
 改变场景
*/
$("#select_scene").change(function () {
    FLOOR_ID = undefined;
    getBuilding($(this).val());

});

/*
 改变建筑
*/
$("#select_building").change(function () {
    FLOOR_ID = undefined;
    getMap();
    get();
});

/*
 显示“新增楼层”模态框
*/
$("#btn_to_add_floor").click(function (e) {
    e.preventDefault();
    var building_id = $("#select_building").val();
    FLOOR_ID = undefined;
    if (building_id){
        $("#add_floor_name").val("");
        $("#add_floor_start").val("");
        $("#add_floor_end").val("");
        $("#add_map_zoom").val("");
        $("#center_x").val("");
        $("#center_y").val("");
        $("#drag_times").val("");
        $(".add_text").show();
        $("#save_file").show();
        $("#edit_save_file").hide();
        $(".edit_text").hide();
        $("#map_zoom").hide();
        $("#center_view").hide();
        $("#drag_distance").hide();
        $("#modal_add_map").modal("show");
    }else {
        HG_MESSAGE("请选择建筑");
    }
});

/*
 新增楼层确定保存按钮
*/
$("#save_file").click(function () {
    var name = $.trim($("#add_floor_name").val());
    var start = parseFloat($("#add_floor_start").val());
    var end = parseFloat($("#add_floor_end").val());
    var building_id = $("#select_building").val();
    var drag_times = $("#drag_times").val();
    if (!name){
        HG_MESSAGE("无效的楼层名字");
        return;
    }
    if ((!$("#add_floor_start").val()) || (isNaN($("#add_floor_start").val()))){
        HG_MESSAGE("无效的楼层起始高度");
        return;
    }
    if ((!$("#add_floor_end").val()) || (isNaN($("#add_floor_end").val()))){
        HG_MESSAGE("无效的楼层终止高度");
        return;
    }
    if (start >= end){
        HG_MESSAGE("楼层的终止高度应大于起始高度");
        return;
    }
    HG_AJAX("/position_sdk/ModularFloor/Floor/floorNameAvailable",{name:name,building_id:building_id},"post",function (data) {
        if (data.type == 1){
            HG_AJAX("/position_sdk/ModularFloor/Floor/addFloor",{floor_name:name,start:start,height:end,building_id:building_id,floor_scaling_ratio:"",origin_x:"",origin_y:"",drop_multiple:drag_times},"post",function (data) {
                EXT = "";
                getMap();
                get();
                $("#modal_add_map").modal("hide");
            })
        }else {
            HG_MESSAGE("楼层名不能重复");
        }
    });
});

/*
 显示“修改楼层”模态框
*/
$("#table_for_floors").on("click",".edit_floor",function () {
    FLOOR_ID = $(this).parent().data("id");
    $("#add_floor_name").val(FLOOR_DATA[FLOOR_ID].name);
    $("#add_floor_start").val(FLOOR_DATA[FLOOR_ID].start);
    $("#add_floor_end").val(FLOOR_DATA[FLOOR_ID].height);
    if(FLOOR_DATA[FLOOR_ID].floor_scaling_ratio == 0){
        $("#add_map_zoom").val("");
    }else{
        $("#add_map_zoom").val(FLOOR_DATA[FLOOR_ID].floor_scaling_ratio);
    }
    if(FLOOR_DATA[FLOOR_ID].origin_x == null ){
        $("#center_x").val("");
    }else {
        $("#center_x").val(FLOOR_DATA[FLOOR_ID].origin_x);
    }
    if(FLOOR_DATA[FLOOR_ID].origin_y == null){
        $("#center_y").val("");
    }else {
        $("#center_y").val(FLOOR_DATA[FLOOR_ID].origin_y);
    }
    $("#drag_times").val(FLOOR_DATA[FLOOR_ID].drop_multiple);
    $(".add_text").hide();
    $("#save_file").hide();
    $("#edit_save_file").show();
    $(".edit_text").show();
    $("#map_zoom").show();
    $("#center_view").show();
    $("#drag_distance").show();
    $("#modal_add_map").modal("show");
});

/*
 修改楼层确定保存按钮
*/
$("#edit_save_file").click(function () {
    var name = $.trim($("#add_floor_name").val());
    var start = parseFloat($("#add_floor_start").val());
    var end = parseFloat($("#add_floor_end").val());
    var map_zoom = $("#add_map_zoom").val();
    var center_x = $("#center_x").val();
    var center_y = $("#center_y").val();
    var drag_times = $("#drag_times").val();
    if (!name){
        HG_MESSAGE("无效的楼层名字");
        return;
    }
    if ((!$("#add_floor_start").val()) || (isNaN($("#add_floor_start").val())) ){
        HG_MESSAGE("无效的楼层起始高度");
        return;
    }
    if ((!$("#add_floor_end").val()) || (isNaN($("#add_floor_end").val()))){
        HG_MESSAGE("无效的楼层终止高度");
        return;
    }
    if (start >= end){
        HG_MESSAGE("楼层的终止高度应大于起始高度");
        return;
    }
    HG_AJAX( "/position_sdk/ModularFloor/Floor/updateFloor",{
        name: name,
        start: start,
        height: end,
        id: FLOOR_ID,
        floor_scaling_ratio: map_zoom,
        origin_x:center_x,
        origin_y:center_y,
        drop_multiple:drag_times
    },"post",function (data) {
        if(data.type == 1){
            if(sessionStorage.getItem('floor_id') == FLOOR_ID){
                sessionStorage.removeItem('zoom');
                sessionStorage.removeItem('center');
            }
            EXT = "";
            getMap();
            get();
            $("#modal_add_map").modal("hide");
        }else if(data.type == 102){
            HG_MESSAGE("楼层名不能重复");
        }else {
            HG_MESSAGE("修改失败");
        }
    });
});

/*
 显示“删除楼层”模态框
*/
$("#table_for_floors").on("click",".glyphicon-trash",function () {
    FLOOR_ID =  $(this).parent().data("id");
    $("#modal_del_map").modal("show");
});

/*
 确定删除楼层按钮
*/
$("#confirm_delete_floor").click(function () {
    HG_AJAX("/position_sdk/ModularFloor/Floor/deleteFloor",{id:FLOOR_ID},"post",function (data) {
        if(sessionStorage.getItem('floor_id') == FLOOR_ID){
            sessionStorage.removeItem('zoom');
            sessionStorage.removeItem('floor_id');
            sessionStorage.removeItem('center');
        }
        EXT = "";
        FLOOR_ID = "";
        getMap();
        get();
        $("#map").html("");
        $("#modal_del_map").modal("hide");
    })
});

/*
 显示“上传地图”模态框
*/
$("#table_for_floors tbody").on("click",".handle_map",function () {
    $("#image_map_location").hide();
    $("#map_tool").html("");
    $("#map_tool").css("height","0px");
    FLOOR_ID = $(this).parent().data("id");
    var map_type = $(this).data("type");
    if (map_type == "2d"){
        MAP_TYPE = 2;
        EXT = "kml,jpg,png";
        $("#all_text_tip>span").show();
        $("#step_four>span").html("4");
    }else{
        MAP_TYPE = 3;
        EXT = "json";
        $("#step_two").hide();
        $("#step_three").hide();
        $("#step_four>span").html("2");
    }
    $("#all_text_tip>span").removeClass("text_active");
    $("#all_text_tip>span").find("span").removeClass("num_active");
    $("#step_one").addClass("text_active");
    $("#step_one").find("span").addClass("num_active");
    $("#modal_uploader_map").modal("show");
});

/*
 查看2d地图
*/
$("#table_for_floors tbody").on("click",".show_2dmap",function () {
    //判断是否已上传地图文件
   if($(this).siblings("i").hasClass("glyphicon-edit")){
       $(".show_map").find(".glyphicon-eye-open").removeClass("glyphicon-eye-open").addClass("glyphicon-eye-close");
       $(this).removeClass("glyphicon-eye-close").addClass("glyphicon-eye-open");
       FLOOR_ID = $(this).parent().data("id");
       EXT = "";
       map2dShow();
   }else {
       HG_MESSAGE("请先上传地图文件");
   }
});

/*
 查看3d地图
*/
$("#table_for_floors tbody").on("click",".show_3dmap",function () {
    //判断是否已上传地图文件
    if($(this).siblings("i").hasClass("glyphicon-edit")){
        $(".show_map").find(".glyphicon-eye-open").removeClass("glyphicon-eye-open").addClass("glyphicon-eye-close");
        $(this).removeClass("glyphicon-eye-close").addClass("glyphicon-eye-open");
        FLOOR_ID = $(this).parent().data("id");
        map3dShow();
    }else {
        HG_MESSAGE("请先上传地图文件");
    }
});

/*
 点击地图确定坐标系
*/
$("#sure_up").click(function () {
    if(DRAW){
        MY_MAP.removeInteraction(DRAW);
    }
    if (($("#map_width").val()) && ($("#map_height").val())){
        $("#step_three").addClass("text_active");
        $("#step_three").find("span").addClass("num_active");
        $("#map_tool").html("");
        $("#map_coordinate_origin").show();
        var map_width = parseFloat($("#map_width").val());//地图文件的长
        var map_height = parseFloat($("#map_height").val());//地图文件的宽
        $("#coordinate_origin_x").val("0");//地图偏移量默认为0
        $("#coordinate_origin_y").val("0");//地图偏移量默认为0
        var extend = [0,0,map_width,map_height];//默认设置地图中心为0,0
        var obj = mapAutomaticSetting(0,null,null,2,extend,"map_tool");//调用函数计算缩放比、中心视点
        var map = new HG2DMap.map(MAP_URL,"map_tool",obj.center,obj.zoom,'image',extend,{extent:obj.extent,zoom_factor:1.5});
        map.getTarget().style.cursor = "pointer";
        map.on("click",function (e) {
             $("#step_four").addClass("text_active");
             $("#step_four").find("span").addClass("num_active");
             if (e.dragging) {
                 return;
             }
             //得到鼠标点击地图时的像素点
             var pixel = map.getEventPixel(e.originalEvent);
             //得到该像素点的坐标
             LOCATION_X = map.getCoordinateFromPixel(pixel)[0];
             LOCATION_Y = map.getCoordinateFromPixel(pixel)[1];
             map.removeAllCard();
             map.addCardInfo(1, "img/icon/mapLocation.png",LOCATION_X,LOCATION_Y," ");
         });
    }else {
        HG_MESSAGE("请输入地图的长和宽");
    }
});

/*
 上传地图确认
*/
$("#up_map").click(function () {
    var files = UPLOADER.getFiles();
    if((files[0].ext != "kml") && (files[0].ext != "json")){
        //得到图片地图的坐标系
        XMIN = (0-LOCATION_X)+ parseFloat($("#coordinate_origin_x").val());
        YMIN = (0-LOCATION_Y)+ parseFloat($("#coordinate_origin_y").val());
        XMAX =(parseFloat($("#map_width").val())-LOCATION_X)+ parseFloat($("#coordinate_origin_x").val());
        YMAX =(parseFloat($("#map_height").val())-LOCATION_Y)+ parseFloat($("#coordinate_origin_y").val());
        if (XMIN && YMIN && XMAX && YMAX){
            HG_AJAX("/position_sdk/ModularFloor/Floor/imageFloorFile",{floor_id:FLOOR_ID,coordinate_left:XMIN,coordinate_right:XMAX,coordinate_upper:YMAX,coordinate_down:YMIN},"post",function (data) {
                if(data.type == 1){
                    getMap();
                    get();
                    $("#modal_uploader_map").modal("hide");
                }else{
                    HG_MESSAGE("上传失败");
                }
            })
        }else {
            HG_MESSAGE("请确定坐标");
        }
    }else {
        XMIN = "";
        YMIN = "";
        XMAX = "";
        YMAX = "";
        /*UPLOADER.options.server = AJAX_URL+'/position_sdk/ModularFloor/Floor/importFile';
        UPLOADER.options.formData = {layer:files,floor_id:FLOOR_ID,file_type:MAP_TYPE,coordinate_left:XMIN,coordinate_right:XMAX,coordinate_upper:YMAX,coordinate_down:YMIN};
        UPLOADER.upload();*/
        HG_AJAX("/position_sdk/ModularFloor/Floor/imageFloorFile",{floor_id:FLOOR_ID,coordinate_left:XMIN,coordinate_right:XMAX,coordinate_upper:YMAX,coordinate_down:YMIN},"post",function (data) {
            if(data.type == 1){
                getMap();
                get();
                $("#modal_uploader_map").modal("hide");
            }else{
                HG_MESSAGE("上传失败");
            }
        })

    }
    if(sessionStorage.getItem('floor_id') == FLOOR_ID){
        sessionStorage.removeItem('zoom');
        sessionStorage.removeItem('center');
    }
});

/*
 上传完成后清除创建的上传任务
*/
$('#modal_uploader_map').on('show.bs.modal',function () {
    if(UPLOADER){
        UPLOADER.destroy();
        $("#thelist").html("");
    }
});

/*
 创建上传地图文件任务
*/
$('#modal_uploader_map').on('shown.bs.modal',function () {
    //实例化上传控件
    var $list = $('#thelist'), UploaderStatus = 'pending' ;
    UPLOADER = WebUploader.create({
        // swf文件路径
        swf:"",
        // 文件接收服务端。
        server: AJAX_URL+'/position_sdk/ModularFloor/Floor/importFile',
        // 选择文件的按钮。可选。
        pick: '#picker',
        formData:{},
        accept: {
            extensions: EXT
        },
        withCredentials: true,
        duplicate :true
    });
    UPLOADER.on('beforeFileQueued', function( file ) {
        UPLOADER.reset();
        $list.html("");
    });
    UPLOADER.on( 'fileQueued', function( file ) {
        $list.append( '<div id="' + file.id + '" class="item">' +
            '<h4 class="info">' + file.name + '</h4>' +
            '</div>' );
            //文件为kml或json，手动上传
            if(file.name.substr(file.name.length-3,3) == "kml" || file.name.substr(file.name.length-4,4) == "json"){
                $("#step_two").hide();
                $("#step_three").hide();
                $("#step_four>span").html("2");
                $("#step_four").addClass("text_active");
                $("#step_four").find("span").addClass("num_active");
                $("#image_map_location").hide();
                $("#map_tool").html("");
                UPLOADER.options.auto = true;
                /*UPLOADER.options.server = AJAX_URL+'/position_sdk/ModularFloor/Floor/importFile';*/
                /*UPLOADER.options.auto = false;*/
            }else {
                $("#map_tool").html("");
                $("#map_coordinate_origin").hide();
                $("#map_tool").css("height","300px");
                //文件为图片地图则自动上传
                UPLOADER.options.auto = true;
                /*UPLOADER.options.server = AJAX_URL+'/position_sdk/ModularFloor/Floor/importFile';*/
                $("#map_width").val("");
                $("#map_height").val("");
                $("#image_map_location").show();
            }
    });
    UPLOADER.on( 'uploadProgress', function( file, percentage ) {
        if(file.ext == "kml" || file.ext == "json"){
            var $li = $( '#'+file.id ),
                $percent = $li.find('.progress .progress-bar');
            // 避免重复创建
            if ( !$percent.length ) {
                $percent = $('<div class="progress progress-striped active">' +
                    '<div class="progress-bar" role="progressbar" style="width: 0%">' +
                    '</div>' +
                    '</div>').appendTo( $li ).find('.progress-bar');
            }
            $li.find('p.state').text('上传中');
            $percent.css( 'width', percentage * 100 + '%' );
        }
    });
    UPLOADER.on( 'uploadSuccess', function( file,response) {
        $( '#'+file.id ).find('p.state').text('已上传');
        if(file.ext == "kml" || file.ext == "json"){
            /*getMap();
            get();
            $("#modal_uploader_map").modal("hide");*/
        }else {
            //文件是图片地图，调用接口获取图片的分辨率作为地图的长和宽
            HG_AJAX("/position_sdk/ModularFloor/Floor/getResolution",{},"post",function (data) {
                if(data.type == 1){
                     $("#step_two").show();
                     $("#step_three").show();
                     $("#step_two").addClass("text_active");
                     $("#step_two").find("span").addClass("num_active");
                     MAP_URL = AJAX_URL +"/position_sdk/File/Tmpfile/tmp."+file.ext+"?time="+Math.random();
                     MAP_WIDTH = parseFloat(data.result.width);
                     MAP_HEIGHT = parseFloat(data.result.height);
                     var extend = [0,0,MAP_WIDTH,MAP_HEIGHT];//默认设置地图中心为0,0
                     var obj = mapAutomaticSetting(0,null,null,2,extend,"map_tool");//调用函数计算缩放比、中心视点
                     //调用2d地图sdk初始化图片地图文件
                    MY_MAP = new HG2DMap.map(MAP_URL,"map_tool",obj.center,obj.zoom,'image',extend,{extent:obj.extent,zoom_factor:1.5});
                }
            })
        }
    });
    UPLOADER.on( 'uploadError', function( file ) {
        $( '#'+file.id ).find('p.state').text('上传出错');
    });
    UPLOADER.on( 'uploadComplete', function( file,data ) {
        $( '#'+file.id ).find('.progress').fadeOut();
    });
});

/*
 点击地图测量长宽
*/
$("#map_measure").click(function () {
    //移除地图所有添加的元素
    MY_MAP.removeAllFeature();
    $("#map_tool").html("");
    $("#map_coordinate_origin").hide();
    var extend = [0,0,MAP_WIDTH,MAP_HEIGHT];//默认设置地图中心为0,0
    var obj = mapAutomaticSetting(0,null,null,2,extend,"map_tool");//调用函数计算缩放比、中心视点
    //调用2d地图sdk初始化图片地图文件
    MY_MAP = new HG2DMap.map(MAP_URL,"map_tool",obj.center,obj.zoom,'image',extend,{extent:obj.extent,zoom_factor:1.5});
    if(DRAW){
        MY_MAP.removeInteraction(DRAW);
    }
    //调用2d地图sdk绘制线条
    DRAW = new HG2DMap.draw.line({max_point:2});
    //将绘制对象添加到地图MY_MAP上
    MY_MAP.addInteraction(DRAW);
    DRAW.on("drawend", function (e) {
        //得到绘制线条的起点和终点坐标
        POLYGON = e.feature.getGeometry().getCoordinates();
        var feature = new HG2DMap.feature.line(POLYGON);
        MY_MAP.addFeature(feature);
        MY_MAP.removeInteraction(DRAW);
        $("#real_length").val("");
        $("#modal_map_length").modal("show");
    });
});

/*
 确定绘制线条的实际长度
*/
$("#sure_length").click(function () {
    var real_length = parseFloat($("#real_length").val());
    if ((!real_length) || (isNaN($("#real_length").val())) ){
        HG_MESSAGE("无效的长度");
        return;
    }
    var x =Math.abs(POLYGON[0][0]-POLYGON[1][0]);
    var y =Math.abs(POLYGON[0][1]-POLYGON[1][1]);
    //得到地图实际的长宽
    $("#map_width").val(((real_length/Math.sqrt((x*x+y*y)))*MAP_WIDTH).toFixed(2));
    $("#map_height").val(((real_length/Math.sqrt((x*x+y*y)))*MAP_HEIGHT).toFixed(2));
    $("#modal_map_length").modal("hide");
});


