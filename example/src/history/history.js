var HISTORY_DATA;//存储所有历史数据
var UPDATE_DATA;//存储之后用到的数据
var THE_PLAY_SLIDER;//拖动的滚动条
var PLAY_SPEED = 100;//播放速度
var PLAY_TIMES = 1;//播放的倍数
var PLAY_TIMER;//播放历史数据的定时器
var START_SEARCH_TIME_STAMP;//查询历史数据的开始时间戳
var END_SEARCH_TIME_STAMP;//查询历史数据的结束时间戳
var NOW_TIME_STAMP;//历史数据当前播放的时间戳
var GET_DATA_TIME_STAMP;//上次获取数据的时间戳
var GET_NEW_DATA_TIME_STAMP;//下一次取数据的时间戳
var IS_TO_GET_NEW_DATA_NOW = false;//是否应该去获得新的数据
var NO_DATA_WITH_END_TIME = false;//是否到截止时间已经没有数据了
var MAX_POST_TIME=30;//取一次历史数据的最大耗时
var DATA_POINTER = 0;//当前播放的指针
var IS_TO_SMOOTH = true;//是否开启平滑
var IS_SKIP_BLANK_TIME = true;//是否跳过空白数据段
var CARD_NOW_INFO = [];
var POST_CHECK_CODE = 0;//判断请求返回是否正确
var AUTO_PLAY = true;
var PLAY_MODE = "data";
var VIDEO_OBJ = undefined;
/*
 时间戳转字符串
*/
function transTimeStampToString(value){
    var time = new Date(parseInt(value));
    var year = time.getFullYear();
    var month = time.getMonth()+1<10?"0"+(time.getMonth()+1):time.getMonth()+1;
    var day   = time.getDate()<10?"0"+time.getDate():time.getDate();
    var hour = time.getHours()<10?"0"+time.getHours():time.getHours();
    var minutes = time.getMinutes()<10?"0"+time.getMinutes():time.getMinutes();
    var second  = time.getSeconds()<10?"0"+time.getSeconds():time.getSeconds();
    return year+"-"+month+"-"+day+" "+hour+":"+minutes+":"+second;
}

/*
 播放历史数据的具体逻辑
*/
function playHistory(){
    //播放到结束时间停止播放
    if (NOW_TIME_STAMP == END_SEARCH_TIME_STAMP){
        $(".playerContent .glyphicon-pause").click();
        HG_MESSAGE("历史数据播放完毕！");
        return
    }
    NOW_TIME_STAMP += 100;//播放的下一秒
    if (NOW_TIME_STAMP >= GET_NEW_DATA_TIME_STAMP){
        isToGetNewData();
    }
    if (DATA_POINTER < HISTORY_DATA.length ) {      //如果HISTORY_DATA还有数据，就继续播放，播放指针DATA_POINTER会自增
        for (DATA_POINTER; HISTORY_DATA[DATA_POINTER].time < NOW_TIME_STAMP; DATA_POINTER++){   //将HISTORY_DATA中所有小于NOW_TIME_STAMP的数据播放出来
            if (DATA_POINTER == HISTORY_DATA.length-1){
                DATA_POINTER++;
                break;
            }
            var x = HISTORY_DATA[DATA_POINTER].card_x;
            var y = HISTORY_DATA[DATA_POINTER].card_y;
            var z = HISTORY_DATA[DATA_POINTER].card_z;
            var card_relative_z = HISTORY_DATA[DATA_POINTER].card_relative_z;
            var card_id= parseFloat(HISTORY_DATA[DATA_POINTER].card_id);
            if ($.inArray(card_id, CARD_NOW_INFO) == -1) {
                CARD_NOW_INFO.push(card_id);
            }
            handleLocationData(card_id,x,y,z,card_relative_z);                  //在地图上显示历史数据
        }

        //如果开启了跳过空白段，判断是否满足跳过条件
        if (IS_SKIP_BLANK_TIME && HISTORY_DATA[DATA_POINTER] && (HISTORY_DATA[DATA_POINTER].time - NOW_TIME_STAMP) > 10000){
            NOW_TIME_STAMP = HISTORY_DATA[DATA_POINTER].time - 100
        }

        //移动播放进度条
        THE_PLAY_SLIDER.slider("setValue",NOW_TIME_STAMP);
    }
    else {
        //如果是因为历史数据不够出错，需要把UPDATE_DATA转移到HISTORY_DATA
        if ( UPDATE_DATA.length > 0){
            HISTORY_DATA = UPDATE_DATA;
            DATA_POINTER=0;
            UPDATE_DATA = [];
            NOW_TIME_STAMP -= 100;
        }
        else {
            //判断是否还有数据，有数据会等待数据，没有数据则会继续播放
            if (NO_DATA_WITH_END_TIME){
                HG_MESSAGE("到结束时间，已经没有定位数据");
                clearInterval(PLAY_TIMER);
                $(".playerContent .glyphicon-pause").click();
            }else {
                if (NOW_TIME_STAMP < GET_NEW_DATA_TIME_STAMP){
                    THE_PLAY_SLIDER.slider("setValue",NOW_TIME_STAMP);
                }else {
                    //如果请求没有返回，则需要等待请求返回
                    NOW_TIME_STAMP -= 100;
                    console.log("加载数据中，请稍后…");
                }
            }
        }
    }
}

/*
 判断是否满足取新数据的条件
*/
function isToGetNewData(){
    //因为这个判断一定是在结束时间之前，所以不用做结束时间的判断
    if (!IS_TO_GET_NEW_DATA_NOW && !NO_DATA_WITH_END_TIME){
        console.log("to get new data from player");
        if (UPDATE_DATA.length > 0){
            GET_DATA_TIME_STAMP = UPDATE_DATA[UPDATE_DATA.length - 1].time;
        }else {
            if(HISTORY_DATA.length > 0){
                GET_DATA_TIME_STAMP = HISTORY_DATA[HISTORY_DATA.length - 1].time;
            }
        }
        getHistoryData(GET_DATA_TIME_STAMP, ALL_SEARCH_CARD_STRING, ALL_SEARCH_AREA_STRING, SEARCH_DRAW_AREA, END_SEARCH_TIME_STAMP);
    }
}

/*
 取得历史数据后，开始播放
*/
function startToPlay(){
    HISTORY_DATA = UPDATE_DATA;
    UPDATE_DATA = [];
    $(".playerContent .glyphicon-play").click();
}

/*
 每次回放，需要设置进度条的一些参数
*/
function refreshSlider(refresf){
    THE_PLAY_SLIDER.slider("setAttribute","min",START_SEARCH_TIME_STAMP);
    THE_PLAY_SLIDER.slider("setAttribute","max",END_SEARCH_TIME_STAMP);
    THE_PLAY_SLIDER.slider("relayout");

    if (refresf){
        $(".playerContent").show();
        THE_PLAY_SLIDER.slider("setValue",NOW_TIME_STAMP);
    }
}

/*
 获取历史数据
 接收四个参数，分别是查询起始时间，卡号，区域id，绘制范围，结束时间
*/
function getHistoryData(time, card_ids, area_ids, area_xy, end_time){
    IS_TO_GET_NEW_DATA_NOW = true;
    var post_check_code = POST_CHECK_CODE;
    HG_AJAX('/position_sdk/ModularHistory/History/getCardHistory',{
        time:time,
        end_time:end_time,
        card_ids:card_ids,
        area_ids:area_ids,
        area_xy:area_xy,
        data_flag:IS_TO_SMOOTH,
        scene_id:SCENE_ID,
        building_id:BUILDING_ID,
        floor_id:FLOOR_ID
    },'post',function (data) {
        if(data.type==1){
            if (IS_CHANGE_MAP){
                return;
            }
            if (post_check_code !== POST_CHECK_CODE){
                return;
            }
            POST_CHECK_CODE++;
            var data=data.result;
            if(!data.length){
                IS_TO_GET_NEW_DATA_NOW = false;
                if ( (HISTORY_DATA == undefined || HISTORY_DATA.length == 0) && (UPDATE_DATA == undefined || UPDATE_DATA.length == 0)  ){
                    HG_MESSAGE("该时间段没有定位数据");
                    $(".playerContent .glyphicon-pause").click();
                }else {
                    NO_DATA_WITH_END_TIME = true;
                }
            } else {
                if (GET_DATA_TIME_STAMP == data[data.length -1].time){
                    GET_DATA_TIME_STAMP = GET_DATA_TIME_STAMP *1 + 1000;
                    getHistoryData(GET_DATA_TIME_STAMP, ALL_SEARCH_CARD_STRING, ALL_SEARCH_AREA_STRING, SEARCH_DRAW_AREA, END_SEARCH_TIME_STAMP);
                    return;
                }

                //将新获得数据更新到UPDATE_DATA
                if (UPDATE_DATA == undefined){
                    UPDATE_DATA = data;
                }else {
                    UPDATE_DATA = UPDATE_DATA.concat(data);
                }

                //计算下次取数据的时间戳，如果下次获取的时间戳小于当前时间，会继续获得下次数据，知道下次获得时间戳大于当前时间
                if (UPDATE_DATA.length > 0){
                    GET_NEW_DATA_TIME_STAMP = parseInt(UPDATE_DATA[UPDATE_DATA.length - 1].time - MAX_POST_TIME  * PLAY_TIMES * 1000);
                    GET_DATA_TIME_STAMP =UPDATE_DATA[UPDATE_DATA.length - 1].time;
                    if (GET_NEW_DATA_TIME_STAMP <= NOW_TIME_STAMP){
                        console.log("to get new data from get");
                        getHistoryData(GET_DATA_TIME_STAMP, ALL_SEARCH_CARD_STRING, ALL_SEARCH_AREA_STRING, SEARCH_DRAW_AREA, END_SEARCH_TIME_STAMP);
                    }else {
                        IS_TO_GET_NEW_DATA_NOW = false;
                    }
                }

                //初次取数据进行一些初始化
                if (HISTORY_DATA == undefined){
                    if (AUTO_PLAY){
                        refreshSlider(true);
                        startToPlay();
                    }
                    NO_DATA_WITH_END_TIME = false;
                }else {
                    refreshSlider(false);
                }

                if (AUTO_PLAY && HISTORY_DATA.length == 0){
                    startToPlay();
                }
            }
        }else {
            HG_MESSAGE(data.message);
            return;
        }
    });
}

/*
 拖动后的逻辑处理
*/
function handleSliderDrag(e){
    clearInterval(PLAY_TIMER);
    NOW_TIME_STAMP = e.value;
    GET_DATA_TIME_STAMP = NOW_TIME_STAMP;
    NO_DATA_WITH_END_TIME = false;
    HISTORY_DATA = [];
    UPDATE_DATA  = [];
    DATA_POINTER   = 0;
    resetMapProgress();
    POST_CHECK_CODE = parseInt(Math.random() * 1000);
    getHistoryData(GET_DATA_TIME_STAMP, ALL_SEARCH_CARD_STRING, ALL_SEARCH_AREA_STRING, SEARCH_DRAW_AREA, END_SEARCH_TIME_STAMP);
    for(var x in ALL_AREA_TO_SEARCH){
        showThisArea(ALL_AREA_TO_SEARCH[x]);
    }
}

/*
 处理回放途中再点回放
*/
function handleRepeatSearch() {
    clearInterval(PLAY_TIMER);
    HISTORY_DATA = undefined;

    UPDATE_DATA = undefined;
    DATA_POINTER   = 0;

    PLAY_SPEED = 100;
    PLAY_TIMES = 1;

    START_SEARCH_TIME_STAMP = undefined;
    END_SEARCH_TIME_STAMP = undefined;
    NOW_TIME_STAMP = undefined;
    GET_DATA_TIME_STAMP = undefined;
    GET_NEW_DATA_TIME_STAMP = undefined;
    IS_TO_GET_NEW_DATA_NOW = false;
    NO_DATA_WITH_END_TIME = false;
    $("#displayPlayRate").html(null);
    $(".playerContent").hide();
}

/*
 处理地图的切换
*/
function handleChangeMap() {
    clearInterval(PLAY_TIMER);
    HISTORY_DATA = undefined;

    UPDATE_DATA = undefined;

    PLAY_SPEED = 100;
    PLAY_TIMES = 1;

    START_SEARCH_TIME_STAMP = undefined;
    END_SEARCH_TIME_STAMP = undefined;
    NOW_TIME_STAMP = undefined;
    GET_DATA_TIME_STAMP = undefined;
    GET_NEW_DATA_TIME_STAMP = undefined;
    IS_TO_GET_NEW_DATA_NOW = false;
    NO_DATA_WITH_END_TIME = false;
    $("#displayPlayRate").html(null);
    $(".playerContent").hide();
}

/*
 快进，慢放，播放，暂停等逻辑
*/
$(".playerContent .glyphicon-play").click(function(e){
    if (HISTORY_DATA.length <= 0 && UPDATE_DATA.length <= 0 && IS_TO_GET_NEW_DATA_NOW == false){
        HG_MESSAGE("已没有历史数据");
        return;
    }
    $(".playerContent .glyphicon-play").hide();
    $(".playerContent .glyphicon-pause").show();
    if (VIDEO_OBJ && PLAY_MODE == "video"){
        VIDEO_OBJ.sendSpeed({card_id:ALL_CARD_TO_SEARCH, speed:PLAY_TIMES});
        console.log({card_id:ALL_CARD_TO_SEARCH, speed:PLAY_TIMES})
    }
    clearInterval(PLAY_TIMER);
    PLAY_TIMER = setInterval(playHistory,parseInt(PLAY_SPEED/PLAY_TIMES));
});
$(".playerContent .glyphicon-pause").click(function(e){
    $(".playerContent .glyphicon-play").show();
    $(".playerContent .glyphicon-pause").hide();
    if (VIDEO_OBJ && PLAY_MODE == "video"){
        VIDEO_OBJ.sendSpeed({card_id:ALL_CARD_TO_SEARCH, speed:0});
        console.log({card_id:ALL_CARD_TO_SEARCH, speed:0})
    }
    clearInterval(PLAY_TIMER);
});

$(".playerContent .glyphicon-backward").click(function(e){
    if (HISTORY_DATA.length <= 0 && UPDATE_DATA.length <= 0 && IS_TO_GET_NEW_DATA_NOW == false){
        HG_MESSAGE("已没有历史数据");
        return;
    }
    if (PLAY_TIMES <= 1/8 ){
        HG_MESSAGE("已到达最小播放速度");
        if (PLAY_TIMER == undefined){
            PLAY_TIMER = setInterval(playHistory,parseInt(PLAY_SPEED/PLAY_TIMES));
            $(".playerContent .glyphicon-play").hide();
            $(".playerContent .glyphicon-pause").show();
        }
        return;
    }
    PLAY_TIMES = PLAY_TIMES / 2;
    clearInterval(PLAY_TIMER);
    PLAY_TIMER = setInterval(playHistory,parseInt(PLAY_SPEED/PLAY_TIMES));
    $(".playerContent .glyphicon-play").hide();
    $(".playerContent .glyphicon-pause").show();
    /*
     改变播放速度会影响下次取数据的时间,但是放慢速度不会提前取数据的时间，所以不做取数据的判断
     下次取数据的时间戳
    */
    if (UPDATE_DATA.length > 0){
        GET_NEW_DATA_TIME_STAMP = parseInt(UPDATE_DATA[UPDATE_DATA.length - 1].time - MAX_POST_TIME  * PLAY_TIMES *1000);
    }else {
        if(HISTORY_DATA.length > 0){
            GET_NEW_DATA_TIME_STAMP = parseInt(HISTORY_DATA[HISTORY_DATA.length - 1].time - MAX_POST_TIME  * PLAY_TIMES * 1000);
        }
    }
    if (VIDEO_OBJ && PLAY_MODE == "video"){
        VIDEO_OBJ.sendSpeed({card_id:ALL_CARD_TO_SEARCH, speed:PLAY_TIMES});
        console.log({card_id:ALL_CARD_TO_SEARCH, speed:PLAY_TIMES})
    }
    $("#displayPlayRate").html("X&nbsp" + PLAY_TIMES);
});
$(".playerContent .glyphicon-forward").click(function(e){
    if (HISTORY_DATA.length <= 0 && UPDATE_DATA.length <= 0 && IS_TO_GET_NEW_DATA_NOW == false){
        HG_MESSAGE("已没有历史数据");
        return;
    }
    if (MAX_POST_TIME  * PLAY_TIMES *2 >= 600){
        HG_MESSAGE("已到达最大播放速度");
        if (PLAY_TIMER == undefined){
            PLAY_TIMER = setInterval(playHistory,parseInt(PLAY_SPEED/PLAY_TIMES));
            $(".playerContent .glyphicon-play").hide();
            $(".playerContent .glyphicon-pause").show();
        }
        return
    }else {
        PLAY_TIMES = PLAY_TIMES * 2;
        clearInterval(PLAY_TIMER);
        PLAY_TIMER = setInterval(playHistory,parseInt(PLAY_SPEED/PLAY_TIMES));
        $(".playerContent .glyphicon-play").hide();
        $(".playerContent .glyphicon-pause").show();

        //改变播放速度会影响下次取数据的时间戳
        //下次取数据的时间戳
        if (UPDATE_DATA.length > 0){
            GET_NEW_DATA_TIME_STAMP = parseInt(UPDATE_DATA[UPDATE_DATA.length - 1].time - MAX_POST_TIME  * PLAY_TIMES * 1000);
        }else {
            if(HISTORY_DATA.length > 0 ){
                GET_NEW_DATA_TIME_STAMP = parseInt(HISTORY_DATA[HISTORY_DATA.length - 1].time - MAX_POST_TIME  * PLAY_TIMES * 1000);
            }else{
                console.log('等待获取数据！');
            }
        }
        if (GET_NEW_DATA_TIME_STAMP <= NOW_TIME_STAMP){
            getHistoryData(GET_NEW_DATA_TIME_STAMP, ALL_SEARCH_CARD_STRING, ALL_SEARCH_AREA_STRING, SEARCH_DRAW_AREA, END_SEARCH_TIME_STAMP);
        }
    }
    if (VIDEO_OBJ && PLAY_MODE == "video"){
        VIDEO_OBJ.sendSpeed({card_id:ALL_CARD_TO_SEARCH, speed:PLAY_TIMES});
        console.log({card_id:ALL_CARD_TO_SEARCH, speed:PLAY_TIMES})
    }
    $("#displayPlayRate").html("X&nbsp" + PLAY_TIMES);
});


/*
 初始化播放进度条
*/
THE_PLAY_SLIDER = $('#slider').slider({
    step:100,
    tooltip: 'always',
    id: 'slider22',
    formatter: function(value) {
        return transTimeStampToString(value);
    }
});

/*
 当滑动条出现拖动事件时的事件处理
*/
$('#slider').on("slideStop",handleSliderDrag);
$("#slider").on("slideStart",function(){
    clearInterval(PLAY_TIMER);
});



