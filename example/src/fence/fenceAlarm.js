var NOW_PAGE = 1;//地图分页的当前页
var LIMIT = 50;//地图分页每页显示数量
var TOTAL_PAGE = 0;//分页总页数
var TIME_START;//开始时间
var TIME_END;//结束时间
var TYPE;//类型
var STATUS;//报警信息状态
var LIST = [];//存储报警信息的数据的数组
var EDIT_ID;//修改某一报警信息的Id
var ALL_VIDEOS = [];//视频报警中的视频路径
var VIDEO_PLAYERS = [];//视频播放器存储
var VIDEO_DIV_CNT = 0;//视频播放容器数量
var VIDEO_WIDTH;//摄像头视频宽度
var VIDEO_HEIGHT;//摄像头视频高度
var VIDEO_CURS = {};//报警视频事件的播放顺序

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
 获取报警总数
*/
function count() {
    HG_AJAX("/position_sdk/ModularAlarm/Alarm/getCount",{
        start: TIME_START,
        end: TIME_END,
        status: STATUS,
        type: TYPE
    },'post',function (data) {
        if (data.type == 1) {
            var result = data.result;
            TOTAL_PAGE = Math.ceil(result / LIMIT);
            if (TOTAL_PAGE < NOW_PAGE) {
                NOW_PAGE = TOTAL_PAGE;
                get();
            }
            getPage();
        } else {
            HG_MESSAGE("获取数据失败");
        }
    });
}

/*
 获取报警信息
*/
function get() {
    $('.table_div').scrollTop(0);
    HG_AJAX("/position_sdk/ModularAlarm/Alarm/getAlarm",{
        start: TIME_START,
        end: TIME_END,
        status: STATUS,
        type: TYPE,
        page: NOW_PAGE,
        limit: LIMIT
    },'post',function (data) {
        if (data.type == 1) {
            var result = data.result;
            var html = "";
            $(result).each(function (index) {
                var id = this.id;
                LIST[id] = {
                    status: this.status,
                    comment: this.comment
                };
                var  options = '<i class="glyphicon glyphicon-paperclip" data-id="' + this.id + '" ></i>' +
                    '<i class="glyphicon glyphicon-edit" data-id="' + this.id + '"></i>' +
                    '<i class="glyphicon glyphicon-trash" data-id="' + this.id + '"></i>';
                if(this.camera.length){
                    var camera = this.camera;
                    for(var i in camera){
                        var status = camera[i].operation_status;
                        if(status == '0'){
                            var type = camera[i].file_type,
                                name = camera[i].file_name,
                                camera_name = camera[i].camera_name;
                            if(type == '1'){
                                if(ALL_VIDEOS[id]){
                                    ALL_VIDEOS[id].files.push('/position_sdk'+name);
                                    ALL_VIDEOS[id].names.push(camera_name);
                                }else{
                                    var video_obj = {
                                        files:[],
                                        names:[],
                                    };
                                    video_obj.files.push('/position_sdk'+name);
                                    video_obj.names.push(camera_name);
                                    ALL_VIDEOS[id] = video_obj
                                }
                            }
                        }
                    }
                    if(ALL_VIDEOS[id]){
                        options = '<i class="glyphicon glyphicon-facetime-video" data-id="' + this.id + '"></i>'+
                            '<i class="glyphicon glyphicon-paperclip" data-id="' + this.id + '" ></i>' +
                            '<i class="glyphicon glyphicon-edit" data-id="' + this.id + '"></i>' +
                            '<i class="glyphicon glyphicon-trash" data-id="' + this.id + '"></i>';
                    }
                }
                html += "<tr>" +
                    "<td>" + (index + 1  + ((NOW_PAGE - 1 ) * LIMIT)) + "</td>" +
                    "<td>" + this.card_id + "</td>" +
                    "<td>" + unixToDate(this.time) + "</td>" +
                    "<td>" + this.alarm_info + "</td>" +
                    "<td>" + checkStatus(this.status) + "</td>" +
                    "<td>" + this.comment + "</td>" +
                    "<td>" + options+"</td>" +
                    "</tr>"
            });
            $("#table_fence_alarm").html(html);
        } else {
            HG_MESSAGE("获取数据失败");
        }
    })
}

/*
 摄像头视频循环播放事件方法
*/
function loopVideo() {
    var that = $(this).parent().parent();
    var id = $(that).data('id');
    var files = ALL_VIDEOS[id].files;
    if(VIDEO_CURS[id]+1 == files.length){
        return
    }
    VIDEO_CURS[id] += 1;
    var camera_name_id = 'camera_name' + id;
    $('#'+camera_name_id).html(ALL_VIDEOS[id].names[VIDEO_CURS[id]]);
    var next = AJAX_URL + files[VIDEO_CURS[id]];
    VIDEO_PLAYERS[id].changeSource(next);
}

/*
 点击摄像头按钮
*/
$('#table_fence_alarm').on('click','.glyphicon-facetime-video',function () {
    EDIT_ID = $(this).data('id');
    if(VIDEO_PLAYERS[EDIT_ID]){
        HG_MESSAGE('当前已存在该事件的播放器！');
        return;
    }
    VIDEO_CURS[EDIT_ID] = 0;
    var top = (100 + VIDEO_DIV_CNT * 50) + "px";
    var left = (500 + parseInt(VIDEO_DIV_CNT/5)) + "px";
    var width = VIDEO_WIDTH + 'px';
    var height = (VIDEO_HEIGHT+40) + 'px';
    var camera_name_id = 'camera_name'+EDIT_ID;
    var video_id = 'video'+EDIT_ID;
    var div = '<div class="video_container" style="top:'+top+';left:'+left+';width: '+width+';height: '+height+'">'+
        '<div class="video_title">'+
        '<span id="'+camera_name_id+'"></span>'+
        '<span class="glyphicon glyphicon-remove-circle" style="cursor: pointer" data-id="'+EDIT_ID+'"></span>'+
        '</div>'+
        '<div id="'+video_id+'" style="width: '+width+';height: '+VIDEO_HEIGHT+'px" data-id="'+EDIT_ID+'"></div>'+
        '</div>';
    $('body').append(div);
    $('#'+camera_name_id).html(ALL_VIDEOS[EDIT_ID].names[0]);
    var src = AJAX_URL+ALL_VIDEOS[EDIT_ID].files[0],
        dom = document.getElementById(video_id),
        type = 'mp4',
        options = {
            width:VIDEO_WIDTH,
            height:VIDEO_HEIGHT,
            onended:loopVideo,
            autoplay:true
        };
    VIDEO_PLAYERS[EDIT_ID] = new HGPlayer(dom,type,src,undefined,options);
    VIDEO_DIV_CNT++;
    handleDrag(video_id);
});

/*
 关闭视频容器的方法
*/
$(document).on('click','.glyphicon-remove-circle',function () {
    var event_id = $(this).data('id');
    $(this).parent().parent().remove();
    VIDEO_PLAYERS[event_id] = null;
    VIDEO_DIV_CNT--;
});

$("#table_fence_alarm").on("click",".glyphicon-paperclip",function (){
    var id = $(this).data('id');
    window.location.href = "alarmHistory.html?id=" + id ;
});

/*
 视频容器的拖拽方法
*/
function handleDrag(div_id) {
    var containerObj = $("#" + div_id).parent();
    var elementObj =$("#" + div_id).siblings('.video_title');

    elementObj.mousedown(function (e) {
        $(".video_container").css("z-index",2);
        containerObj.css("z-index",1100);
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
                get();
            }
        }
    });
}

/*
 初始执行
*/
$(function () {
    //初始化时间输入控件
    initDataInput();
    initTimeInput();
    TIME_START = getSearchStartTimeStamp();//设置历史数据的开始时间
    TIME_END = getSearchEndTimeStamp();//设置历史数据的结束时间
    STATUS = undefined;
    TYPE = undefined;
    count();
    get();
});

/*
 点击查询按钮
*/
$("#query_fence_alarm").click(function () {
    NOW_PAGE = 1;
    TIME_START = getSearchStartTimeStamp(); //设置历史数据的开始时间
    TIME_END = getSearchEndTimeStamp(); //设置历史数据的结束时间
    STATUS = $("#status_fence_alarm").val();
    TYPE = $("#type_act_alarm").val();
    if (STATUS == "all") {
        STATUS = undefined;
    }
    if (TYPE == "all") {
        TYPE = undefined;
    }
    count();
    get();
});

/*
 点击修改图标
*/
$("#table_fence_alarm").on("click", ".glyphicon-edit", function () {
    $("#modal_fence_alarm_edit").modal("show");
    EDIT_ID = $(this).data("id");
    var status = LIST[EDIT_ID].status;
    var comment = LIST[EDIT_ID].comment;
    $("#modal_fence_alarm_status").val(status);
    $("#modal_fence_alarm_comment").val(comment);
});

/*
 点击删除图标
*/
$("#table_fence_alarm").on("click", ".glyphicon-trash", function () {
    $("#modal_fence_alarm_delete").modal("show");
    EDIT_ID = $(this).data("id");
});

/*
 保存更新
*/
$("#modal_fence_alarm_save").click(function () {
    var status = $("#modal_fence_alarm_status").val();
    var comment = $("#modal_fence_alarm_comment").val();
    HG_AJAX("/position_sdk/ModularAlarm/Alarm/updateAlarm",{
        id: EDIT_ID,
        status: status,
        comment: comment
    },'post',function (data) {
        if (data.type == 1) {
            count();
            get();
        } else {
            HG_MESSAGE("修改失败");
        }
    })
});

/*
确认删除报警
*/
$("#modal_fence_alarm_delete_ensure").click(function () {
    HG_AJAX("/position_sdk/ModularAlarm/Alarm/deleteAlarm",{
        id: EDIT_ID
    },'post',function (data) {
        if (data.type == 1) {
            count();
            get();
        } else {
            HG_MESSAGE("删除失败");
        }
    });
});