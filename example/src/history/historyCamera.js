var VIDEO_WIDTH = 480;
var VIDEO_HEIGHT = 320;

/*
 创建视频播放器，准备相关参数
*/
function playHistoryVideo(card_id, time_start, time_end) {
    var opts = {
        width: VIDEO_WIDTH,
        height: VIDEO_HEIGHT,

        oninfo: onInfo,
        //onopen: onOpen,
        //onerr: onError,
        //onstatistic: onStatistic,
        autoplay: false,
        time_start: time_start,
        time_end: time_end,
        card_id: card_id
    };
    var element_id = creatDiv();
    handleDrag(element_id);
    var element_obj = document.getElementById(element_id);
    VIDEO_OBJ = new HGPlayer(element_obj, "play", "nvr", VIDEO_WS_URL, opts);
    VIDEO_OBJ.send_time_timer = setInterval(function () {
        VIDEO_OBJ.sendTime({card_id:card_id,utime:NOW_TIME_STAMP})
    },1000);
}
/*
创建播放容器的方法
*/
function creatDiv() {
    if ($("#history_video_container").length > 0){
        return
    }
    var id  = "history_video_container";
    if ($("#" + id).length > 0){
        return id;
    }

    var top = "130px";
    var left = "10px";
    var width = VIDEO_WIDTH + 'px';
    var height = (VIDEO_HEIGHT+40) + 'px';
    var div;

    div = "<div class='hg_video_container' style='top: "+top+";left: "+left+";width: "+width+";height: "+height+"' >" +
        "<div class='hg_video_container_header'><h5 id='hg_history_video_name'>历史视频</h5><i class='glyphicon glyphicon-remove-circle'></i></div>"+
        "<div id='"+id+"' class='hg_video_play_container'></div>"+
        "</div>";
    $("#example").append(div);
    return id;
}

/*
 关闭视频容器的方法
*/
$("#example").on("click",".glyphicon-remove-circle",function (e) {
    e.stopPropagation();
    if (VIDEO_OBJ){
        clearInterval(VIDEO_OBJ.send_time_timer);
        VIDEO_OBJ.close();
        VIDEO_OBJ = null;
    }
    $(this).parent().off("mousedown");
    $(this).parent().parent().remove();
});

/*
 处理视频播放容器的拖拽的方法
*/
function handleDrag(div_id) {
    var containerObj = $("#" + div_id).parent();
    var elementObj =$("#" + div_id).siblings('.hg_video_container_header');

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
 播放视频的一些回调方法
*/
function onStatistic(msg){console.log("onStatistic", msg)}
function onOpen(msg){console.log("open", msg)}
function onError(msg){console.log("error", msg)}
function onInfo(msg,id,camera_id){
    console.log(msg)
    if (msg.code == 1 && msg.msg == "开始观看"){
        if (UPDATE_DATA && UPDATE_DATA.length > 0){
            if (IS_TO_GET_NEW_DATA_NOW){
                AUTO_PLAY = true
            }else {
                refreshSlider(true);
                startToPlay();
            }
        }else {
            AUTO_PLAY = true
        }

        if (HISTORY_DATA && HISTORY_DATA.length > 0){
        if ($(".glyphicon-play").css("display") != "none") {
            $(".playerContent .glyphicon-play").click();
            console.log("video start");
        }}
    }else if (msg.code == 80){
        $("#hg_history_video_name").html(msg.msg.name);
    } else if (msg.code == 20) {
        $(".playerContent .glyphicon-pause").click();
        console.log("video stop");
    }
}
