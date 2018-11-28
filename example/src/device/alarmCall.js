var NOW_PAGE = 1;//页码，初始化为1
var LIMIT = 50;//每页数据数量，初始化为50
var TOTAL_PAGE;//总页数，后端方法确定
var TIME_START;//开始时间
var TIME_END;//结束时间
var TYPE;//类型
var STATUS;//呼救信息状态
var LIST = [];//存储呼救信息的数据的数组
var EDIT_ID;//修改某一呼救信息的Id
var ALL_PHOTOS = [];//视频报警中的图片路径
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
 获取呼救表格信息的总数，分页用
*/
function count() {
    HG_AJAX("/position_sdk/ModularAlarm/Alarm/getHelpCount", {
        start: TIME_START,
        end: TIME_END,
        status: STATUS,
        type: TYPE
    }, "post",function (data) {
        if (data.type == 1) {
            var result = data.result;
            TOTAL_PAGE = Math.ceil(result / LIMIT);
            getPage();
        } else {
            HG_MESSAGE("获取数据最失败");
        }
    });
}

/*
 获取呼救表格的数据
*/
function get () {
    HG_AJAX("/position_sdk/ModularAlarm/Alarm/getHelp", {
        start: TIME_START,
        end: TIME_END,
        status: STATUS,
        type: TYPE,
        page: NOW_PAGE,
        limit: LIMIT
    }, "post",function (data) {
        if (data.type == 1) {
            var result = data.result;
            var html = "";
            $(result).each(function (index) {
                var id = this.id;
                LIST[id] = {
                    status: this.status,
                    comment: this.comment
                };
                var options;
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
                            }else if(type == '2'){
                                if(ALL_PHOTOS[id]){
                                    ALL_PHOTOS[id].files.push('/position_sdk'+name);
                                    ALL_PHOTOS[id].names.push(camera_name);
                                }else{
                                    var photo_obj = {
                                        files:[],
                                        names:[]
                                    };
                                    photo_obj.files.push('/position_sdk'+name);
                                    photo_obj.names.push(camera_name);
                                    ALL_PHOTOS[id] = photo_obj
                                }
                            }
                        }
                    }
                    if(ALL_PHOTOS[id] && ALL_VIDEOS[id]){
                        options = "<i class='glyphicon glyphicon-picture' data-id='" + this.id + "'></i><i class='glyphicon glyphicon-facetime-video' data-id='" + this.id + "'></i><i class='glyphicon glyphicon-edit' data-id='" + this.id + "'></i><i class='glyphicon glyphicon-trash' data-id='" + this.id + "'></i>";
                    }else if(!ALL_PHOTOS[id] && ALL_VIDEOS[id]){
                        options = "<i class='glyphicon glyphicon-facetime-video' data-id='" + this.id + "'></i><i class='glyphicon glyphicon-edit' data-id='" + this.id + "'></i><i class='glyphicon glyphicon-trash ' data-id='" + this.id + "'></i>";
                    }else if(ALL_PHOTOS[id] && !ALL_VIDEOS[id]){
                        options = "<i class='glyphicon glyphicon-picture' data-id='" + this.id + "'></i><i class='glyphicon glyphicon-edit' data-id='" + this.id + "'></i><i class='glyphicon glyphicon-trash' data-id='" + this.id + "'></i>";
                    }else{
                        options = "<i class='glyphicon glyphicon-edit' data-id='" + this.id + "'></i><i class='glyphicon glyphicon-trash' data-id='" + this.id + "'></i>";
                    }
                }else{
                    options = "<i class='glyphicon glyphicon-edit' data-id='" + this.id + "'></i><i class='glyphicon glyphicon-trash' data-id='" + this.id + "'></i>";
                }
                html += "<tr>" +
                    "<td>" + (index + 1  + ((NOW_PAGE - 1 ) * LIMIT)) + "</td>" +
                    "<td>" + this.card_id + "</td>" +
                    "<td>" + unixToDate(this.time) + "</td>" +
                    "<td>" + this.alarm_info + "</td>" +
                    "<td>" + checkStatus(this.status) + "</td>" +
                    "<td>" + this.comment + "</td>" +
                    "<td>" + options+"</td>" +
                    "</tr>";
            });
            $("#table_alarm_call").html(html);
        } else {
            HG_MESSAGE("获取数据最失败");
        }
    });
}

/*
 点击图片按钮
*/
$('#table_alarm_call').on('click','.glyphicon-picture',function (){
    EDIT_ID = $(this).data('id');
    var lis = '',
        divs = '',
        files = ALL_PHOTOS[EDIT_ID].files;
    for(var i in files){
        var src = AJAX_URL+''+files[i],
            content = ALL_PHOTOS[EDIT_ID].names[i];
        if(i == 0){
            lis += '<li data-target="#photos'+EDIT_ID+'" data-slide-to="'+i+'" class="active"></li>';
            divs += '<div class="item active">'+
                '<img src="'+src+'" alt="...">'+
                '<div class="carousel-caption">'+content+'</div>'+
                '</div>'
        }else{
            lis += '<li data-target="#photos'+EDIT_ID+'" data-slide-to="'+i+'"></li>';
            divs += '<div class="item">'+
                '<img src="'+src+'" alt="...">'+
                '<div class="carousel-caption">'+content+'</div>'+
                '</div>'
                
        }
    }
    var div = '<div id="photos'+EDIT_ID+'" class="carousel slide" data-ride="carousel">'+
        '<ol class="carousel-indicators">'+ lis+ '</ol>'+
        '<div class="carousel-inner" role="listbox">'+ divs+'</div>'+
        '<a class="left carousel-control" href="#photos'+EDIT_ID+'" role="button" data-slide="prev">'+
        '<span class="glyphicon glyphicon-chevron-left" aria-hidden="true"></span>'+
        '<span class="sr-only">Previous</span>'+
        '</a>'+
        '<a class="right carousel-control" href="#photos'+EDIT_ID+'" role="button" data-slide="next">'+
        '<span class="glyphicon glyphicon-chevron-right" aria-hidden="true"></span>'+
        '<span class="sr-only">Next</span>'+
        '</a>'+
        '</div>';
    $("#modal_fence_alarm_picture .history_photos_container").html(div);
    $('#modal_fence_alarm_picture').modal('show');
});

/*
 关闭图片容器的方法
*/
$('#modal_fence_alarm_picture').on('click','.glyphicon-remove-circle',function () {
    $('#modal_fence_alarm_picture').modal('hide');
    $("#modal_fence_alarm_picture").find('#photos'+EDIT_ID).remove();
});

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
    var camera_name_id = 'camera_name'+id;
    $('#'+camera_name_id).html(ALL_VIDEOS[id].names[VIDEO_CURS[id]]);
    var next = AJAX_URL+files[VIDEO_CURS[id]];
    VIDEO_PLAYERS[id].changeSource(next);
}

/*
 点击摄像头按钮
*/
$('#table_alarm_call').on('click','.glyphicon-facetime-video',function () {
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
 呼救表格的分页方法
*/
function getPage() {
    laypage({
        cont: 'pages',
        pages: TOTAL_PAGE,
        curr: NOW_PAGE,
        skin: '#4ba9dc',
        groups: 5,
        skip: false,
        first: '首页',
        last: '尾页',
        prev: '上一页',
        next: '下一页',
        jump: function (obj, first) {
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
    initDataInput();
    initTimeInput();
    TIME_START = getSearchStartTimeStamp();
    TIME_END = getSearchEndTimeStamp();
    STATUS = undefined;
    TYPE = undefined;
    count();
    get();
});

/*
 查询按钮
*/
$("#query_alarm_call").click(function () {
    NOW_PAGE = 1;
    TIME_START = getSearchStartTimeStamp(); //设置历史数据的开始时间
    TIME_END = getSearchEndTimeStamp(); //设置历史数据的结束时间
    STATUS = $("#status_alarm_call").val();
    if (STATUS == "all") {
        STATUS = undefined;
    }
    TYPE = $("#type_alarm_call").val();
    if (TYPE == "all") {
        TYPE = undefined;
    }
    count();
    get();
});

/*
 呼救表格中的编辑按钮
*/
$("#table_alarm_call").on("click", ".glyphicon-edit", function () {
    $("#modal_alarm_call_edit").modal("show");
    EDIT_ID = $(this).data("id");
    var status = LIST[EDIT_ID].status;
    var comment = LIST[EDIT_ID].comment;
    $("#modal_alarm_call_status").val(status);
    $("#modal_alarm_call_comment").val(comment);
});

/*
 呼救表格中的删除按钮
*/
$("#table_alarm_call").on("click", ".glyphicon-trash", function () {
    $("#modal_alarm_call_delete").modal("show");
    EDIT_ID = $(this).data("id");
});

/*
 呼救表格中的编辑弹窗保存按钮
*/
$("#modal_alarm_call_save").click(function () {
    var status = $("#modal_alarm_call_status").val();
    var comment = $("#modal_alarm_call_comment").val();
    HG_AJAX("/position_sdk/ModularAlarm/Alarm/updateHelp", {
        id: EDIT_ID,
        status: status,
        comment: comment
    }, "post",function (data) {
        if (data.type == 1) {
            count();
            get();
        } else {
            HG_MESSAGE("修改失败");
        }
    });
});

/*
 呼救表格中的删除弹窗确认按钮
*/
$("#modal_alarm_call_delete_ensure").click(function () {
    HG_AJAX("/position_sdk/ModularAlarm/Alarm/deleteHelp", {
        id: EDIT_ID
    },"post",function (data) {
        if (data.type == 1) {
            count();
            get();
        } else {
            HG_MESSAGE("删除失败");
        }
    });
});