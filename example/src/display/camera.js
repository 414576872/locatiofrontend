var ALL_CAMERA = [];//存储所有摄像头设备信息的数组
var VIDEO_DIV_CNT = 0;//视频播放容器
var HGPLAY_OBJ = [];//未跟踪定位卡视频播放实例对象
var TRACK_HGPLAY_OBJ = [];//跟踪定位卡和报警视频播放实例对象
var OPEN_CAMERA_IDS = [];//所有已打开的未跟踪定位卡的摄像头设备id
var OPEN_TRACK_CAMERA_IDS = [];//所有已打开的跟踪定位卡和报警的摄像头设备id
var VIDEO_SPEED;//摄像头转动速度
var VIDEO_WIDTH;//摄像头视频宽度
var VIDEO_HEIGHT;//摄像头视频高度
var OVER_MAN_CARD;//聚众报警时，视频标题栏显示的所有聚众卡号
var RECORD_LENGTH;//正在录像的摄像头数量
var RECORD_NUM = 0;//已保存录像的摄像头数量
var HREF;//录像时点击跳转的链接
var CLOSE_RECORD_FLOOR;//录像时需要切换楼层时的楼层id
var CLOSE_RECORD_DATA;//录像时需要切换楼层时的其他楼层信息

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
 获取所有摄像头设备
*/
function getCamera(three) {
    ALL_CAMERA = [];
    HG_AJAX("/position_sdk/ModularVideo/Equip/getEquip",{},"post",function (data) {
        if (data.type == 1){
            var result = data.result;
            for (var i in result){
                var id       = result[i].id,
                    name     = result[i].name,
                    scene_id = result[i].scene_id,
                    building_id = result[i].building_id,
                    floor_id = result[i].floor_id,
                    x        = result[i].place_x,
                    y        = result[i].place_y,
                    z        = result[i].place_z,
                    url      = result[i].rtsp_url,
                    user     = result[i].user,
                    password = result[i].password,
                    support = parseInt(result[i].ptz_support);
                ALL_CAMERA[id] = {name:name,scene_id:scene_id,building_id:building_id,floor_id:floor_id,x:x,y:y,z:z,url:url,user:user,password:password,support:support};
            }
            if (MY_MAP && ALL_CAMERA){
                if(three){
                    showCameraThree();
                }else{
                    showCamera(ICON_SCALE,TEXT_SCALE);
                }

            }
        }
    });
}

/*
 地图上摄像头图标自适应缩放比的方法
*/
function changeCamera(flag,text_flag) {
    MY_MAP.removeAllFeature();
    if(flag > 0.2){
        for (var i in ALL_CAMERA){
            if(ALL_CAMERA[i].floor_id == FLOOR_ID){
                var id       = parseInt(i);
                var x        = parseFloat(ALL_CAMERA[i].x);
                var y        = parseFloat(ALL_CAMERA[i].y);
                var name     = ALL_CAMERA[i].name;
                var feature = new HG2DMap.feature.point([x,y],{icon:'img/camera.png',text:name,icon_scale:flag,text_scale:text_flag});
                feature.type ='camera';
                feature.camera_id = id;
                MY_MAP.addFeature(feature);
            }else{
                continue;
            }
        }
    }
}

/*
 在3D地图中展示摄像头设备
*/
function showCameraThree(){
    var floor_id = parseInt($("#floor_select").val());
    if(!FLOOR_DATA[floor_id] || FLOOR_DATA[floor_id].floor_3d_file =="0"){
        return;
    }
    for (var i in ALL_CAMERA){
        if (ALL_CAMERA[i].floor_id == floor_id){
            var id       = parseInt(i);
            var x        = parseFloat(ALL_CAMERA[i].x);
            var y        = parseFloat(ALL_CAMERA[i].y);
            var z        = parseFloat(ALL_CAMERA[i].z);
            MY_MAP.addStaticModel(id,"camera",3,x,y,z)
        }
    }
}

/*
 在2D地图中展示摄像头设备
*/
function showCamera(flag,text_flag) {
    var floor_id = parseInt($("#floor_select").val());
    if(!FLOOR_DATA[floor_id] || FLOOR_DATA[floor_id].floor_2d_file =="0"){
        return;
    }
    MY_MAP.removeAllFeature();
    if(flag > 0.2){
        for (var i in ALL_CAMERA){
            if (ALL_CAMERA[i].floor_id == floor_id){
                var id       = parseInt(i);
                var x        = parseFloat(ALL_CAMERA[i].x);
                var y        = parseFloat(ALL_CAMERA[i].y);
                var name     = ALL_CAMERA[i].name;
                var feature = new HG2DMap.feature.point([x,y],{icon:'img/camera.png',text:name,icon_scale:flag,text_scale:text_flag});
                feature.type ='camera';
                feature.camera_id = id;
                MY_MAP.addFeature(feature);
            }
        }
    }
    if(sessionStorage.getItem('locations')){
        var keys = JSON.parse(sessionStorage.getItem('locations'));
        if(keys.type == '视频'){
            var result = keys.result,
                camera_id = result[0].camera_id,
                alarm_id = result[0].alarm_id,
                card_id = result[0].card_id;
            if(typeof card_id == "string"){
                OVER_MAN_CARD = card_id;
                card_id = "over_man";
            }
            playTheCamera(alarm_id,camera_id,card_id);
        }
    }
}

/*
 点击地图上摄像头图标后创建播放容器并且立即播放视频
*/
function playTheCamera(alarm_id,camera_id,card_id) {
    if(card_id){
        OPEN_TRACK_CAMERA_IDS.push(card_id);
    }else {
        OPEN_CAMERA_IDS.push(camera_id);
    }
    var url = ALL_CAMERA[camera_id].url;
    var element_id = createDiv(alarm_id,camera_id,card_id);
    handleDrag(element_id);
    if(alarm_id){
        playVideo(element_id,url,camera_id,alarm_id,card_id);
        mouseDrag(undefined,card_id);
    }else if(card_id){
        playVideo(element_id,url,camera_id,undefined,card_id);
        mouseDrag(undefined,card_id);
    }else{
        playVideo(element_id,url,camera_id,undefined,undefined);
        mouseDrag(camera_id,undefined);
    }
}

/*
 区分是报警卡还是追踪卡
*/
function cardOrAlarm(alarm_id,card_id) {
    if(card_id && card_id != "undefined" && card_id != "over_man"){
        if(alarm_id) {
            return "报警卡号:" + card_id;
        }else {
            return "跟踪卡号:"+card_id;
        }
    }else if (card_id == "over_man"){
        return "聚众报警卡号:" + OVER_MAN_CARD;
    }
    else {
        return "";
    }
}

/*
 创建播放容器的方法
*/
function createDiv(alarm_id,camera_id,card_id) {
    //如果是跟踪定位卡或报警，则在视频播放器的头部加上跟踪或报警的卡号
    if(card_id){
        var id  = "video_container_track_" + card_id;
        if ($("#" + id).length > 0){
            return id;
        }
        var top = (100 + VIDEO_DIV_CNT * 50) + "px";
        var left = (10 + parseInt(VIDEO_DIV_CNT/5)) + "px";
        var width = VIDEO_WIDTH + 'px';
        var height = (VIDEO_HEIGHT+40) + 'px';
        var div;
        div = "<div class='hg_video_container' style='top: "+top+";left: "+left+";width: "+width+";height: "+height+"' >" +
            "<div class='hg_video_container_header'><h4 class='h4_change' data-toggle='tooltip' data-placement='top' title='"+ALL_CAMERA[camera_id].name+"'>"+ALL_CAMERA[camera_id].name+"</h4><h5 data-toggle='tooltip' data-placement='top' title='"+cardOrAlarm(alarm_id,card_id)+"'>"+cardOrAlarm(alarm_id,card_id)+"</h5><i class='glyphicon glyphicon-remove-circle' data-id='"+camera_id+"' data-card='"+card_id+"'></i><i class='glyphicon glyphicon-fullscreen' data-id='"+camera_id+"' data-card='"+card_id+"' style='float: right;color: white;font-size: 1.7em;margin-top: 7px;margin-right: 10px;cursor: pointer;'></i><i class='glyphicon glyphicon-resize-small' data-id='"+camera_id+"' data-card='"+card_id+"' style='float: right;color: white;font-size: 1.7em;margin-top: 7px;margin-right: 10px;cursor: pointer;display: none;'></i></div>"+
            "<div id='"+id+"' class='hg_video_play_container'></div>"+
            "<div class='mouse_div' data-id='"+camera_id+"' data-card='"+card_id+"'></div>"+
            "</div>";
    }else {
        var id  = "video_container_" + camera_id;
        if ($("#" + id).length > 0){
            return id;
        }
        var top = (100 + VIDEO_DIV_CNT * 50) + "px";
        var left = (10 + parseInt(VIDEO_DIV_CNT/5)) + "px";
        var width = VIDEO_WIDTH + 'px';
        var height = (VIDEO_HEIGHT+40) + 'px';
        var div;
        if(ALL_CAMERA[camera_id].support){
            div = "<div class='hg_video_container' style='top: "+top+";left: "+left+";width: "+width+";height:"+height+"' >" +
                "<div class='hg_video_container_header'><h4 data-toggle='tooltip' data-placement='top' title='"+ALL_CAMERA[camera_id].name+"'>"+ALL_CAMERA[camera_id].name+"</h4><i class='glyphicon glyphicon-remove-circle' data-id='"+camera_id+"' data-card='"+card_id+"'></i><i class='glyphicon glyphicon-fullscreen' data-id='"+camera_id+"' data-card='"+card_id+"' style='float: right;color: white;font-size: 1.7em;margin-top: 7px;margin-right: 10px;cursor: pointer;'></i><i class='glyphicon glyphicon-resize-small' data-id='"+camera_id+"' data-card='"+card_id+"' style='float: right;color: white;font-size: 1.7em;margin-top: 7px;margin-right: 10px;cursor: pointer;display: none;'></i></div>"+
                "<div id='"+id+"' class='hg_video_play_container'></div>"+
                "<div class='hg_video_container_footer'>" +
                "<div class='hg_video_directions'>" +
                "<span class='glyphicon glyphicon-triangle-top' data-id='"+camera_id+"'></span>"+
                "<span class='glyphicon glyphicon-triangle-bottom' data-id='"+camera_id+"'></span>"+
                "<span class='glyphicon glyphicon-triangle-left' data-id='"+camera_id+"'></span>"+
                "<span class='glyphicon glyphicon-triangle-right' data-id='"+camera_id+"'></span>"+
                "</div>"+
                "<div class='hg_video_buttons'>" +
                "<span class='glyphicon glyphicon-plus-sign' data-id='"+camera_id+"'></span>"+
                "<span class='glyphicon glyphicon-minus-sign' data-id='"+camera_id+"'></span>"+
                "<span class='glyphicon glyphicon-camera' data-id='"+camera_id+"'></span>" +
                "<span class='glyphicon glyphicon-facetime-video' data-id='"+camera_id+"'></span>"+
                "</div>"+
                "</div>"+
                "<div class='mouse_div' data-id='"+camera_id+"' data-card='"+card_id+"'></div>"+
                "</div>";
        }else{
            div = "<div class='hg_video_container' style='top: "+top+";left: "+left+";width: "+width+";height:"+height+"' >" +
                "<div class='hg_video_container_header'><h4 data-toggle='tooltip' data-placement='top' title='"+ALL_CAMERA[camera_id].name+"'>"+ALL_CAMERA[camera_id].name+"</h4><i class='glyphicon glyphicon-remove-circle' data-id='"+camera_id+"' data-card='"+card_id+"'></i><i class='glyphicon glyphicon-fullscreen' data-id='"+camera_id+"' data-card='"+card_id+"' style='float: right;color: white;font-size: 1.7em;margin-top: 7px;margin-right: 10px;cursor: pointer;'></i><i class='glyphicon glyphicon-resize-small' data-id='"+camera_id+"' data-card='"+card_id+"' style='float: right;color: white;font-size: 1.7em;margin-top: 7px;margin-right: 10px;cursor: pointer;display: none;'></i></div>"+
                "<div id='"+id+"' class='hg_video_play_container'></div>"+
                "<div class='hg_video_container_footer'>" +
                "<div class='hg_video_directions' style='visibility: hidden'>" +
                "<span class='glyphicon glyphicon-triangle-top' data-id='"+camera_id+"'></span>"+
                "<span class='glyphicon glyphicon-triangle-bottom' data-id='"+camera_id+"'></span>"+
                "<span class='glyphicon glyphicon-triangle-left' data-id='"+camera_id+"'></span>"+
                "<span class='glyphicon glyphicon-triangle-right' data-id='"+camera_id+"'></span>"+
                "</div>"+
                "<div class='hg_video_buttons'>" +
                "<span class='glyphicon glyphicon-plus-sign' data-id='"+camera_id+"' style='visibility: hidden'></span>"+
                "<span class='glyphicon glyphicon-minus-sign' data-id='"+camera_id+"' style='visibility: hidden'></span>"+
                "<span class='glyphicon glyphicon-camera' data-id='"+camera_id+"'></span>" +
                "<span class='glyphicon glyphicon-facetime-video' data-id='"+camera_id+"'></span>"+
                "</div>"+
                "</div>"+
                "<div class='mouse_div' data-id='"+camera_id+"' data-card='"+card_id+"'></div>"+
                "</div>";
        }
    }
    $("#example").append(div);
    VIDEO_DIV_CNT++;
    return id;
}

/*
 处理视频播放容器的拖拽的方法
*/
function handleDrag(div_id) {
    var containerObj = $("#" + div_id).parent();
    var elementObj =$("#" + div_id).siblings('.hg_video_container_header');

    elementObj.mousedown(function (e) {
        $(".hg_video_container").css("z-index",1000);
        containerObj.css("z-index",2000);
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
            // a.stopPropagation();
            $(document).off("mousemove");
        })
    })
}

/*
 处理视频播放容器右下角拖拽放大缩小的方法
*/
function mouseDrag(camera_id,card_id) {
    if(camera_id){
        $("#video_container_" + camera_id).parent().find(".mouse_div").css("cursor","nw-resize");
        $("#video_container_" + camera_id).parent().on("mousedown",".mouse_div",function (e) {
            var x = e.clientX;
            var y = e.clientY;
            var pa = {"width":-1,"height":-1,"onreso":function () {
                console.log("success");
            }};
            var width = $("#video_container_" + camera_id).parent().width();
            var height = $("#video_container_" + camera_id).parent().height() - 40;
            var parent_o_height = $("#video_container_" + camera_id).parent().height();
            $("#example").mousemove(function (event) {
                var change_width = event.clientX - x;
                var change_height = event.clientY - y;
                var parent_width = width + change_width;
                var parent_height = height + change_height;
                var parent = parent_o_height + change_height;
                if(parent_width < VIDEO_WIDTH){
                    parent_width = VIDEO_WIDTH;
                }
                if(parent_height < VIDEO_HEIGHT){
                    parent_height = VIDEO_HEIGHT;
                    parent = VIDEO_HEIGHT + 40;
                }
                HGPLAY_OBJ[camera_id].changeResolution(pa);
                $("#video_container_" + camera_id).parent().css({"width":parent_width+"px","height":parent+"px"});
                $("#video_container_" + camera_id).css({"width":parent_width+"px","height":parent_height+"px"});
                $("#video_container_" + camera_id).find(".hg_player_content").css({"width":parent_width+"px","height":parent_height+"px"});
                $("#video_container_" + camera_id).find("canvas").css({"width":parent_width+"px","height":parent_height+"px"});
                $("#video_container_" + camera_id).siblings(".hg_video_container_header").find(".glyphicon-resize-small").show();

            });
            $("#example").mouseup(function (e) {
                $("#example").off("mousemove");
            });
        });
    }else {
        $("#video_container_track_" + card_id).parent().find(".mouse_div").css("cursor","nw-resize");
        $("#video_container_track_" + card_id).parent().on("mousedown",".mouse_div",function (e) {
            var x = e.clientX;
            var y = e.clientY;
            var pa = {"width":-1,"height":-1,"onreso":function () {
                console.log("success");
            }};
            var width = $("#video_container_track_" + card_id).parent().width();
            var height = $("#video_container_track_" + card_id).parent().height() - 40;
            var parent_o_height = $("#video_container_track_" + card_id).parent().height();
            $("#example").mousemove(function (event) {
                var change_width = event.clientX - x;
                var change_height = event.clientY - y;
                var parent_width = width + change_width;
                var parent_height = height + change_height;
                var parent = parent_o_height + change_height;

                if(parent_width < VIDEO_WIDTH){
                    parent_width = VIDEO_WIDTH;
                }
                if(parent_height < VIDEO_HEIGHT){
                    parent_height = VIDEO_HEIGHT;
                    parent = VIDEO_HEIGHT + 40;
                }
                TRACK_HGPLAY_OBJ[card_id].changeResolution(pa);
                $("#video_container_track_" + card_id).parent().css({"width":parent_width+"px","height":parent+"px"});
                $("#video_container_track_" + card_id).css({"width":parent_width+"px","height":parent_height+"px"});
                $("#video_container_track_" + card_id).find(".hg_player_content").css({"width":parent_width+"px","height":parent_height+"px"});
                $("#video_container_track_" + card_id).find("canvas").css({"width":parent_width+"px","height":parent_height+"px"});
                $("#video_container_track_" + card_id).siblings(".hg_video_container_header").find(".glyphicon-resize-small").show();
            });
            $("#example").mouseup(function (e) {
                $("#example").off("mousemove");
            });
        })
    }
}

/*
 点击摄像头标题栏的放大图标，将视频窗口放到最大
*/
$("#example").on("click",".glyphicon-fullscreen",function (e) {
    e.stopPropagation();
    var camera_id = $(this).data("id");
    var card_id = $(this).data("card");
    var $this = this;
    var height = $("#example").height();
    var width = $("#example").width();
    width = parseInt(width);
    height = parseInt(height);
    if(card_id != "undefined"){
        if(TRACK_HGPLAY_OBJ[card_id]){
            var pa = {"width":-1,"height":-1,"onreso":function () {
                console.log("success");
            }};
            TRACK_HGPLAY_OBJ[card_id].changeResolution(pa);
            $("#video_container_track_" + card_id).parent().css({"width":width+"px","height":height+"px"});
            $("#video_container_track_" + card_id).css({"width":width+"px","height":(height-40)+"px"});
            $("#video_container_track_" + card_id).find(".hg_player_content").css({"width":width+"px","height":(height-40)+"px"});
            $("#video_container_track_" + card_id).find("canvas").css({"width":width+"px","height":(height-40)+"px"});
            $("#video_container_track_" + card_id).parent().addClass("video_width_change");
            $($this).hide().siblings(".glyphicon-resize-small").show();
            $("#video_container_track_" + card_id).parent().find(".mouse_div").css("cursor","none");
            $("#video_container_track_" + card_id).parent().off("mousedown",".mouse_div");

        }
    }else {
        if(HGPLAY_OBJ[camera_id]){
            var pa = {"width":-1,"height":-1,"onreso":function () {
                console.log("success");
            }};
            HGPLAY_OBJ[camera_id].changeResolution(pa);
            $("#video_container_" + camera_id).parent().css({"width":width+"px","height":height+"px"});
            $("#video_container_" + camera_id).css({"width":width+"px","height":(height-40)+"px"});
            $("#video_container_" + camera_id).find(".hg_player_content").css({"width":width+"px","height":(height-40)+"px"});
            $("#video_container_" + camera_id).find("canvas").css({"width":width+"px","height":(height-40)+"px"});
            $("#video_container_" + camera_id).parent().addClass("video_width_change");
            $($this).hide().siblings(".glyphicon-resize-small").show();
            $("#video_container_" + camera_id).parent().find(".mouse_div").css("cursor","none");
            $("#video_container_" + camera_id).parent().off("mousedown",".mouse_div");
        }
    }
});

/*
 点击摄像头标题栏的缩小图标，将视频窗口放到最小
*/
$("#example").on("click",".glyphicon-resize-small",function (e) {
    e.stopPropagation();
    var camera_id = $(this).data("id");
    var card_id = $(this).data("card");
    var $this = this;
    var width = VIDEO_WIDTH ;
    var height = VIDEO_HEIGHT+40;
    var pa = {"width":VIDEO_WIDTH,"height":VIDEO_HEIGHT,"onreso":function () {
        console.log("success");
    }};
    if(card_id != "undefined"){
        if(TRACK_HGPLAY_OBJ[card_id]){
            TRACK_HGPLAY_OBJ[card_id].changeResolution(pa);
            $("#video_container_track_" + card_id).parent().css({"width":width+"px","height":height+"px"});
            $("#video_container_track_" + card_id).css({"width":width+"px","height":(height-40)+"px"});
            $("#video_container_track_" + card_id).find(".hg_player_content").css({"width":width+"px","height":(height-40)+"px"});
            $("#video_container_track_" + card_id).find("canvas").css({"width":width+"px","height":(height-40)+"px"});
            $("#video_container_track_" + card_id).parent().removeClass("video_width_change");
            $($this).hide().siblings(".glyphicon-fullscreen").show();
            mouseDrag(undefined,card_id);
        }
    }else {
        if(HGPLAY_OBJ[camera_id]){
            HGPLAY_OBJ[camera_id].changeResolution(pa);
            $("#video_container_" + camera_id).parent().css({"width":width+"px","height":height+"px"});
            $("#video_container_" + camera_id).css({"width":width+"px","height":(height-40)+"px"});
            $("#video_container_" + camera_id).find(".hg_player_content").css({"width":width+"px","height":(height-40)+"px"});
            $("#video_container_" + camera_id).find("canvas").css({"width":width+"px","height":(height-40)+"px"});
            $("#video_container_" + camera_id).parent().removeClass("video_width_change");
            $($this).hide().siblings(".glyphicon-fullscreen").show();
            mouseDrag(camera_id,undefined);
        }
    }
});

/*
 删除数组id的方法
*/
function removerByValue(camera_id,card_id) {
    if(card_id){
        if(OPEN_TRACK_CAMERA_IDS.length){
            for(var i=0;i<OPEN_TRACK_CAMERA_IDS.length;i++){
                if(OPEN_TRACK_CAMERA_IDS[i] == card_id){
                    OPEN_TRACK_CAMERA_IDS.splice(i,1);
                    break;
                }
            }
        }
    }else {
        if(OPEN_CAMERA_IDS.length){
            for(var i=0;i<OPEN_CAMERA_IDS.length;i++){
                if(OPEN_CAMERA_IDS[i] == camera_id){
                    OPEN_CAMERA_IDS.splice(i,1);
                    break;
                }
            }
        }
    }
}

/*
 播放视频的方法
*/
function onStatistic(msg){console.log("onStatistic", msg)}
function onOpen(msg){console.log("open", msg)}
function onInfo(msg,id,camera_id){
    if(msg.code == 80){
        $("#video_container_track_"+id).siblings(".hg_video_container_header").children("h4").html(msg.msg.name);
    }
    if(msg.code == 11){
        var src = AJAX_URL+'/position_sdk/'+msg.msg;
        $("#video_container_"+camera_id).siblings(".hg_video_container_footer").find(".glyphicon-facetime-video").removeClass('heart');
        downloadImageOrVideo(src,undefined,true);
        RECORD_NUM++;
        if(RECORD_LENGTH == RECORD_NUM){
            RECORD_NUM = 0;
            if(HREF){
                window.location.href = HREF;
            }else {
                mapChange(CLOSE_RECORD_FLOOR,CLOSE_RECORD_DATA);
            }
        }
    }
    if(msg.code == 9 || msg.code == 10){
        $("#video_container_"+camera_id).siblings(".hg_video_container_footer").find(".glyphicon-facetime-video").removeClass('heart');
        HG_MESSAGE(msg.msg);
    }
    console.log("info", msg);
}
function onError(msg){console.log("error", msg)}
function playVideo(element_id,url,camera_id,alarm_id,card_id) {
    function onInfo_Ex(msg) {
        onInfo(msg,card_id,camera_id);
    }
    var user = ALL_CAMERA[camera_id].user,
        password = ALL_CAMERA[camera_id].password;
    //播放器配置参数
    var opts = {
        "width": VIDEO_WIDTH,
        "height": VIDEO_HEIGHT,
        "onStatistic": onStatistic,
        "onopen": onOpen,
        "oninfo": onInfo_Ex,
        "onerr": onError,
        'user': user,
        'password': password
    };
    var type = 'h264';   //播放器播放视频类型
    var parent_div = document.getElementById(element_id);
    if(alarm_id){
        if(TRACK_HGPLAY_OBJ[card_id]){
            return;
        }
        opts.alarm_id = alarm_id;
        TRACK_HGPLAY_OBJ[card_id] = new HGPlayer(parent_div, type,url, VIDEO_WS_URL,opts);
        if(TRACK_HGPLAY_OBJ[card_id].sucess == false){
            HG_MESSAGE(TRACK_HGPLAY_OBJ[card_id].err_msg);
            $("#example .glyphicon-remove-circle").parent().parent().remove();
            TRACK_HGPLAY_OBJ[card_id] = null;
            removerByValue(camera_id,card_id);
            VIDEO_DIV_CNT--;
        }
    }
    else if(card_id){
        if(TRACK_HGPLAY_OBJ[card_id]){
            return;
        }
        opts.card_id = card_id;
        TRACK_HGPLAY_OBJ[card_id] = new HGPlayer(parent_div, type,url, VIDEO_WS_URL,opts);
        if(TRACK_HGPLAY_OBJ[card_id].sucess == false){
            HG_MESSAGE(TRACK_HGPLAY_OBJ[card_id].err_msg);
            $("#example .glyphicon-remove-circle").parent().parent().remove();
            TRACK_HGPLAY_OBJ[card_id] = null;
            removerByValue(camera_id,card_id);
            VIDEO_DIV_CNT--;
        }
    }else {
        if(HGPLAY_OBJ[camera_id]){
            return;
        }
        HGPLAY_OBJ[camera_id] = new HGPlayer(parent_div, type,url, VIDEO_WS_URL,opts);
        if(HGPLAY_OBJ[camera_id].sucess == false){
            HG_MESSAGE(HGPLAY_OBJ[camera_id].err_msg);
            $("#example .glyphicon-remove-circle").parent().parent().remove();
            HGPLAY_OBJ[camera_id] = null;
            removerByValue(camera_id);
            VIDEO_DIV_CNT--;
        }
    }
    if(alarm_id && sessionStorage.getItem('locations')){
        sessionStorage.removeItem('locations');
    }
}

/*
 下载资源文件
*/
function downloadImageOrVideo(src,camera_id,video) {
    if(video){
        var a = $("<a></a>").attr("href", src).attr('download','').appendTo("body");
        a[0].click();
        a.remove();
        return src;
    }else if(!video){
        var camera_name = ALL_CAMERA[camera_id].name,
            time = new Date().getTime(),
            filename = getFileName(time,camera_name);
        if('msSaveOrOpenBlob' in navigator){
            //IE浏览器的下载方法
            function base64Img2Blob(code){
                var parts = code.split(';base64,');
                var contentType = parts[0].split(':')[1];
                var raw = window.atob(parts[1]);
                var rawLength = raw.length;

                var uInt8Array = new Uint8Array(rawLength);

                for (var i = 0; i < rawLength; ++i) {
                    uInt8Array[i] = raw.charCodeAt(i);
                }

                return new Blob([uInt8Array], {type: contentType});
            }
            var blob = base64Img2Blob(src);
            window.navigator.msSaveOrOpenBlob(blob, filename);
        }else{
            //其他浏览器的下载方法
            var a = $("<a></a>").attr("href", src).attr("download", filename).appendTo("body");
            a[0].click();
            a.remove();
        }
    }
}

/*
 抓拍文件处理文件名
*/
function getFileName(msec,camera) {
    var time = new Date(msec);
    var year = time.getFullYear();
    var month = time.getMonth() + 1 < 10 ? "0" + (time.getMonth() + 1) : time.getMonth() + 1;
    var day = time.getDate() < 10 ? "0" + time.getDate() : time.getDate();
    var hour = time.getHours() < 10 ? "0" + time.getHours() : time.getHours();
    var minutes = time.getMinutes() < 10 ? "0" + time.getMinutes() : time.getMinutes();
    var second = time.getSeconds() < 10 ? "0" + time.getSeconds() : time.getSeconds();
    return year + "年" + month + "月" + day + "日_" + hour + "时" + minutes + "分" + second+'秒_'+camera+'.png';
}

/*
 抓拍照片
*/
$('#example').on('click','.glyphicon-camera',function () {
    var camera_id = $(this).data('id');
    HGPLAY_OBJ[camera_id].getImage(function (data) {
        var src = $(data).attr('src');
        downloadImageOrVideo(src,camera_id,undefined);
    })
});

/*
 录像按钮
*/
$('#example').on('click','.glyphicon-facetime-video',function () {
    var status = $(this).hasClass('heart'),
        id = $(this).data('id');
    if(!status){
        $(this).addClass('heart');
        HGPLAY_OBJ[id].startRecord();
    }else if(status){
        $(this).removeClass('heart');
        HGPLAY_OBJ[id].stopRecord();
    }
});

/*
 改变摄像头方向
*/

/*
 点击视频播放器里的向上按钮，使摄像头向上转动
*/
$('#example').on('mousedown','.glyphicon-triangle-top',function () {
    var camera_id = $(this).data('id');
    $(this).addClass('direction');
    HGPLAY_OBJ[camera_id].moveRelative({"up_speed":VIDEO_SPEED});
});
$('#example').on('mouseup','.glyphicon-triangle-top',function () {
    $(this).removeClass('direction');
    var camera_id = $(this).data('id');
    HGPLAY_OBJ[camera_id].moveStop({});
});
$('#example').on('mouseleave','.glyphicon-triangle-top',function () {
    var status = $(this).hasClass('direction');
    if(status){
        $(this).removeClass('direction');
        var camera_id = $(this).data('id');
        HGPLAY_OBJ[camera_id].moveStop({});
    }
});

/*
 点击视频播放器里的向下按钮，使摄像头向下转动
*/
$('#example').on('mousedown','.glyphicon-triangle-bottom',function () {
    var camera_id = $(this).data('id');
    $(this).addClass('direction');
    HGPLAY_OBJ[camera_id].moveRelative({"up_speed":-VIDEO_SPEED});
});
$('#example').on('mouseup','.glyphicon-triangle-bottom',function () {
    $(this).removeClass('direction');
    var camera_id = $(this).data('id');
    HGPLAY_OBJ[camera_id].moveStop({});
});
$('#example').on('mouseleave','.glyphicon-triangle-bottom',function () {
    var status = $(this).hasClass('direction');
    if(status){
        $(this).removeClass('direction');
        var camera_id = $(this).data('id');
        HGPLAY_OBJ[camera_id].moveStop({});
    }
});

/*
 点击视频播放器里的向左按钮，使摄像头向左转动
*/
$('#example').on('mousedown','.glyphicon-triangle-left',function () {
    var camera_id = $(this).data('id');
    $(this).addClass('direction');
    HGPLAY_OBJ[camera_id].moveRelative({"right_speed":-VIDEO_SPEED});
});
$('#example').on('mouseup','.glyphicon-triangle-left',function () {
    $(this).removeClass('direction');
    var camera_id = $(this).data('id');
    HGPLAY_OBJ[camera_id].moveStop({});
});
$('#example').on('mouseleave','.glyphicon-triangle-left',function () {
    var status = $(this).hasClass('direction');
    if(status){
        $(this).removeClass('direction');
        var camera_id = $(this).data('id');
        HGPLAY_OBJ[camera_id].moveStop({});
    }
});

/*
 点击视频播放器里的向右按钮，使摄像头向右转动
*/
$('#example').on('mousedown','.glyphicon-triangle-right',function () {
    var camera_id = $(this).data('id');
    $(this).addClass('direction');
    HGPLAY_OBJ[camera_id].moveRelative({"right_speed":VIDEO_SPEED});
});
$('#example').on('mouseup','.glyphicon-triangle-right',function () {
    $(this).removeClass('direction');
    var camera_id = $(this).data('id');
    HGPLAY_OBJ[camera_id].moveStop({});
});
$('#example').on('mouseleave','.glyphicon-triangle-right',function () {
    var status = $(this).hasClass('direction');
    if(status){
        $(this).removeClass('direction');
        var camera_id = $(this).data('id');
        HGPLAY_OBJ[camera_id].moveStop({});
    }
});

/*
 点击视频播放器里的“+”按钮，使摄像头拉近镜头
*/
$('#example').on('mousedown','.glyphicon-plus-sign',function () {
    var camera_id = $(this).data('id');
    $(this).addClass('direction');
    HGPLAY_OBJ[camera_id].moveRelative({"far_speed":VIDEO_SPEED});
});
$('#example').on('mouseup','.glyphicon-plus-sign',function () {
    $(this).removeClass('direction');
    var camera_id = $(this).data('id');
    HGPLAY_OBJ[camera_id].moveStop({});
});
$('#example').on('mouseleave','.glyphicon-plus-sign',function () {
    var status = $(this).hasClass('direction');
    if(status){
        $(this).removeClass('direction');
        var camera_id = $(this).data('id');
        HGPLAY_OBJ[camera_id].moveStop({});
    }
});

/*
 点击视频播放器里的“-”按钮，使摄像头拉远镜头
*/
$('#example').on('mousedown','.glyphicon-minus-sign',function () {
    var camera_id = $(this).data('id');
    $(this).addClass('direction');
    HGPLAY_OBJ[camera_id].moveRelative({"far_speed":-VIDEO_SPEED});
});
$('#example').on('mouseup','.glyphicon-minus-sign',function () {
    $(this).removeClass('direction');
    var camera_id = $(this).data('id');
    HGPLAY_OBJ[camera_id].moveStop({});
});
$('#example').on('mouseleave','.glyphicon-minus-sign',function () {
    var status = $(this).hasClass('direction');
    if(status){
        $(this).removeClass('direction');
        var camera_id = $(this).data('id');
        HGPLAY_OBJ[camera_id].moveStop({});
    }
});

/*
 关闭视频容器的方法
*/
$("#example").on("click",".glyphicon-remove-circle",function (e) {
    e.stopPropagation();
    $(this).parent().off("mousedown");
    $(this).parent().parent().remove();
    var camera_id = $(this).data("id");
    var card_id = $(this).data("card");
    if(card_id != "undefined"){
        TRACK_HGPLAY_OBJ[card_id].close();
        TRACK_HGPLAY_OBJ[card_id] = null;
    }else {
        HGPLAY_OBJ[camera_id].close();
        HGPLAY_OBJ[camera_id] = null;
    }
    removerByValue(camera_id,card_id);
    VIDEO_DIV_CNT--;
});

/*
 录像跳转
*/

/*
 当摄像头正在录像时，如果离开此页面，则弹出是否保存录像模态框
*/
$("#main_nav a").click(function () {
    var record = $('#example').find(".heart");
    if(record.length>0){
        $("#modal_video_download").modal("show");
        HREF = $(this).attr("href");
        return false;
    }
});

/*
 点击模态框的保存按钮，保存录像并跳转至其他页面
*/
$("#confirm_download_video").click(function () {
    var record = $('#example').find(".heart");
    RECORD_LENGTH = record.length;
    for (var i = 0; i < record.length; i++) {
        var id = $(record[i]).data("id");
        $(record[i]).removeClass('heart');
        HGPLAY_OBJ[id].stopRecord();
    }
    $("#modal_video_download").modal("hide");
});

/*
 点击模态框的取消按钮，直接跳转至其他页面
*/
$("#cancel_save").click(function () {
    $("#modal_video_download").modal("hide");
    if(HREF){
        window.location.href = HREF;
    }else {
        mapChange(CLOSE_RECORD_FLOOR,CLOSE_RECORD_DATA);
    }
});
