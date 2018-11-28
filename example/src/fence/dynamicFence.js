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
 时间戳转换为时间，时间戳为0为永久有效
*/
function checkTimeNull(start,end) {
    if (start == "0" || end == "0") {
        return '永久有效';
    } else {
        return transTimeStampToString(start,1)+"至"+transTimeStampToString(end,1);
    }
}

/*
 检测使用状态的方法
*/
function checkUseStatus(value) {
    switch (value) {
        case '1':
            return "使用";
            break;
        case '0':
            return "停用";
            break;
    }
}

/*
 陪同设置
*/
var ESCORT_TOTAL_PAGE;//陪同总页数，后端方法确定
var ESCORT_NOW_PAGE = 1;//陪同页码
var LIMIT_ESCORT =50;//陪同每页显示数量
var ALL_ESCORT_INFO = [];//存储陪同信息的数组
var ESCORT_THIS_DATA_ID;//操作某条数据所用id
var TIME_OBJ = {};//存储重复时间段的对象

/*
 陪同分页
*/
function getEscortPage() {
    laypage({
        cont: 'escort_pages', //容器。值支持id名、原生dom对象，jquery对象。【如该容器为】：<div id="page1"></div>
        pages: ESCORT_TOTAL_PAGE, //通过后台拿到的总页数
        curr: ESCORT_NOW_PAGE, //初始化当前页
        skin: '#4ba9dc',//皮肤颜色
        groups: 5, //连续显示分页数
        skip: false, //是否开启跳页
        first: '首页', //若不显示，设置false即可
        last: '尾页', //若不显示，设置false即可
        prev: '上一页', //若不显示，设置false即可
        next: '下一页', //若不显示，设置false即可
        jump: function (obj, first) { //触发分页后的回调
            if (!first) {
                ESCORT_NOW_PAGE = obj.curr;
                getEscort();
            }
        }
    });
}

/*
 获取陪同数据表格
*/
function getEscort() {
    var name = checkInputNull($("#escort_name").val());
    HG_AJAX('/position_sdk/ModularArea/EscortStray/getEscortStray',{
        page:ESCORT_NOW_PAGE,
        limit:LIMIT_ESCORT,
        name:name,
        type:11
    },'post',function (data) {
        if(data.type == 1){
            var data = data.result,
                htmls = '';
            if(ESCORT_NOW_PAGE == 0){
                ESCORT_NOW_PAGE = 1;
            }
            for(var i in data){
                var id = data[i].id,
                    index = (parseInt(i) + 1  + ((ESCORT_NOW_PAGE  - 1 ) * LIMIT_ESCORT)),
                    name = data[i].name,
                    card_id = data[i].card_id,
                    radius = data[i].radius,
                    time = checkTimeNull(data[i].start_time,data[i].end_time),
                    is_use = checkUseStatus(data[i].is_use),
                    comment = checkNull(data[i].comment),
                    options = "<i class='glyphicon glyphicon-edit' data-id='" + id + "'></i><i class='glyphicon glyphicon-trash' data-id='" + id + "'></i>",
                    obj = {
                        id:id,
                        name:name,
                        radius:radius,
                        is_use:data[i].is_use,
                        card_id:card_id,
                        start_time:data[i].start_time,
                        end_time:data[i].end_time,
                        time_json:data[i].time_json,
                        day_json:data[i].day_json,
                        card_ids:data[i].card_ids,
                        passive_card_ids:data[i].passive_card_ids,
                        comment:data[i].comment
                    };
                ALL_ESCORT_INFO[id] = obj;
                htmls += '<tr><td>'+index+'</td><td>'+name+'</td><td>'+radius+'</td><td>'+time+'</td><td>'+is_use+'</td><td>'+comment+'</td><td>'+options+'</td></tr>';
            }
            $('#escort_table tbody').html(htmls);
        }else{
            HG_MESSAGE(data.result);
        }
    })
}

/*
 陪同的数据总量
*/
function getEscortCount() {
    var card_id = checkInputNull($("#escort_card_id").val()),
        name = checkInputNull($("#escort_name").val());
    HG_AJAX('/position_sdk/ModularArea/EscortStray/getCount',{
        card_id:card_id,
        name:name,
        type:11
    },'post',function (data) {
        if(data.type == 1){
            var result = data.result;
            ESCORT_TOTAL_PAGE = Math.ceil(result / LIMIT_ESCORT);
            if (ESCORT_TOTAL_PAGE < ESCORT_NOW_PAGE) {
                ESCORT_NOW_PAGE = ESCORT_TOTAL_PAGE;
                getEscort();
            }
            getEscortPage();
        }else{
            HG_MESSAGE(data.result);
        }
    })
}

/*
 获取所有卡号,用于被陪同人员设置
*/
function getBeEscortCard(id) {
    HG_AJAX("/position_sdk/ModularCard/Card/getCard",{
        limit: 100000000,
        page: 1
    },'post',function (data) {
        if (data.type == 1) {
            var result = data.result;
            var list = "";
            $(result).each(function () {
                list += "<label><input type='checkbox' data-id='" + this.card_id + "'>" + this.card_id + "</label>";
            });
            $("#list_be_escort_persons").html(list);
            var check_flag = 0;
            if(id && ALL_ESCORT_INFO[id].passive_card_ids){
                for (var i in ALL_ESCORT_INFO[id].passive_card_ids){
                    $("#list_be_escort_persons input[data-id=" + ALL_ESCORT_INFO[id].passive_card_ids[i] + "]")[0].checked = true;
                    check_flag++;
                }
            }
            if (check_flag == 0){
                $("#be_escort_persons_all")[0].checked = false;
            }else if(check_flag == result.length) {
                $("#be_escort_persons_all")[0].checked = true;
            } else {
                $("#be_escort_persons_all")[0].checked = false;
            }
        } else {
            HG_MESSAGE(data.result);
        }
    });
}

/*
 获取所有卡号,用于陪同人员设置
*/
function getEscortCard(id) {
    HG_AJAX("/position_sdk/ModularCard/Card/getCard",{
        limit: 100000000,
        page: 1
    },'post',function (data) {
        if (data.type == 1) {
            var result = data.result;
            var list = "";
            $(result).each(function () {
                list += "<label><input type='checkbox' data-id='" + this.card_id + "'>" + this.card_id + "</label>";
            });
            $("#list_escort_persons").html(list);
            var check_flag = 0;
            if(id && ALL_ESCORT_INFO[id].card_ids){
                for (var i in ALL_ESCORT_INFO[id].card_ids){
                    $("#list_escort_persons input[data-id=" + ALL_ESCORT_INFO[id].card_ids[i] + "]")[0].checked = true;
                    check_flag++;
                }
            }
            if (check_flag == 0){
                $("#escort_persons_all")[0].checked = false;
            }else if(check_flag == result.length) {
                $("#escort_persons_all")[0].checked = true;
            } else {
                $("#escort_persons_all")[0].checked = false;
            }
        } else {
            HG_MESSAGE(data.result);
        }
    });
}

getEscort();
getEscortCount();

/*
 陪同设置的查询按钮
*/
$("#escort_search_btn").click(function () {
    getEscort();
    getEscortCount();
});

/*
 陪同人员全选卡号按钮
*/
$("#escort_persons_all").click(function () {
    var all_card = $("#list_escort_persons").find("input");
    if ($(this)[0].checked) {
        $(all_card).each(function () {
            $(this)[0].checked = true;
        });
    } else {
        $(all_card).each(function () {
            $(this)[0].checked = false;
        });
    }
});

/*
 点击陪同人员卡号，若为不选，则取消全选状态
*/
$("#list_escort_persons").on("click", "input", function () {
    var check_flag = 0;
    var input = $("#list_escort_persons").find("input");
    for (var i = 0; i < input.length; i++) {
        if ($(input[i])[0].checked == true) {
            check_flag++;
        }
    }
    if (check_flag == input.length) {
        $("#escort_persons_all")[0].checked = true;
    } else {
        $("#escort_persons_all")[0].checked = false;
    }
});

/*
 被陪同人员全选卡号按钮
*/
$("#be_escort_persons_all").click(function () {
    var all_card = $("#list_be_escort_persons").find("input");
    if ($(this)[0].checked) {
        $(all_card).each(function () {
            $(this)[0].checked = true;
        });
    } else {
        $(all_card).each(function () {
            $(this)[0].checked = false;
        });
    }
});

/*
 点击被陪同人员卡号，若为不选，则取消全选状态
*/
$("#list_be_escort_persons").on("click", "input", function () {
    var check_flag = 0;
    var input = $("#list_be_escort_persons").find("input");
    for (var i = 0; i < input.length; i++) {
        if ($(input[i])[0].checked == true) {
            check_flag++;
        }
    }
    if (check_flag == input.length) {
        $("#be_escort_persons_all")[0].checked = true;
    } else {
        $("#be_escort_persons_all")[0].checked = false;
    }
});

/*
 选择时间是否为永久有效
*/
$("#valid_time").click(function () {
    if($(this)[0].checked){
        $("#time_input").hide();
    }else {
        $("#time_input").show();
    }
});

/*
 点击加号图标，添加时间段的选择
*/
$("#time_plus").click(function () {
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
    if(TIME_OBJ[time_value]){
        HG_MESSAGE("该时间段已存在");
        return;
    }
    TIME_OBJ[time_value] = repeat_time;
    var time_list = '<div style="display: inline-block;margin-right:10px;" data-value="'+time_value+'"><span>'+start_hour_html+":"+start_minute_html+'</span>~<span>'+end_hour_html+":"+end_minute_html+'</span><span class="glyphicon glyphicon-remove" data-value="'+time_value+'"></span></div>';
    $("#time_list").append(time_list);
    $("#show_time_select").hide();
    $("#repeat_week").show();
});

/*
 取消添加时间段
*/
$("#show_time_select").on("click",".glyphicon-remove",function () {
    $("#show_time_select").hide();
    if(JSON.stringify(TIME_OBJ) == "{}"){
        $("#repeat_week").hide();
        $("#every_day")[0].checked = true;
        $("#week_select").find(".btn").removeClass("btn-default").addClass("btn-blue");
        $("#week_select").hide();
    }
});

/*
 取消已添加的时间段
*/
$("#time_list").on("click",".glyphicon-remove",function () {
    $(this).parent("div").remove();
    var time_flag = $(this).data("value");
    delete TIME_OBJ[time_flag];
    if(JSON.stringify(TIME_OBJ) == "{}"){
        $("#repeat_week").hide();
        $("#every_day")[0].checked = true;
        $("#week_select").find(".btn").removeClass("btn-default").addClass("btn-blue");
        $("#week_select").hide();
    }
});

/*
 点击每天的单选框，选择每天重复
*/
$("#every_day").click(function () {
    if($(this)[0].checked == true){
        $("#week_select").find(".btn").removeClass("btn-default").addClass("btn-blue");
        $("#week_select").hide();
    }else {
        $("#week_select").find(".btn").removeClass("btn-blue").addClass("btn-default");
        $("#week_select").show();
    }
});

/*
 选择周几重复
*/
$("#week_select").on("click",".btn",function () {
    var check_flag = 0;
    var btn = $("#week_select").find(".btn");
    if($(this).hasClass("btn-default")){
        $(this).removeClass("btn-default").addClass("btn-blue");
    }else {
        $(this).removeClass("btn-blue").addClass("btn-default");
    }
    for (var i = 0; i < btn.length; i++) {
        if ($(btn[i]).hasClass("btn-blue")) {
            check_flag++;
        }
    }
    if (check_flag == btn.length) {
        $("#every_day")[0].checked = true;
    } else {
        $("#every_day")[0].checked = false;
    }
});

/*
 陪同设置的新增按钮
*/
$("#escort_add_btn").click(function () {
    $('#escort_right_side h4').html('新增陪同');
    $('#escort_right_side input').val(null);
    $('#escort_right_side select').find('option:first').prop('selected',true);
    $("#valid_time")[0].checked = true;
    $("#time_input").hide();
    $("#time_list").html("");
    TIME_OBJ = {};
    $("#repeat_week").hide();
    $("#show_time_select").hide();
    $("#every_day")[0].checked = true;
    $("#week_select").find(".btn").removeClass("btn-default").addClass("btn-blue");
    $("#week_select").hide();
    initDayTime("escort_start_data","escort_end_data");
    initDateTime("escort_start_time","escort_end_time","escort_start_data","escort_end_data");
    getBeEscortCard("");
    getEscortCard("");
    $("#escort_right_side").modal("show");
});

/*
 陪同设置侧边栏取消按钮
*/
$("#escort_cancel_btn").click(function () {
    $("#escort_right_side").modal("hide");
});

/*
 陪同设置人员的编辑按钮
*/
$('#escort_table tbody').on('click','.glyphicon-edit',function () {
    $('#escort_right_side h4').html('修改陪同');
    ESCORT_THIS_DATA_ID = $(this).data('id');
    $("#escort_right_side #escort_add_name").val(ALL_ESCORT_INFO[ESCORT_THIS_DATA_ID].name);
    $("#escort_right_side #escort_add_radius").val(ALL_ESCORT_INFO[ESCORT_THIS_DATA_ID].radius);
    $("#escort_right_side #escort_add_status").val(ALL_ESCORT_INFO[ESCORT_THIS_DATA_ID].is_use);
    $("#escort_right_side #escort_add_comment").val(ALL_ESCORT_INFO[ESCORT_THIS_DATA_ID].comment);
    $("#show_time_select").hide();
    initDayTime("escort_start_data","escort_end_data");
    initDateTime("escort_start_time","escort_end_time","escort_start_data","escort_end_data");
    if(ALL_ESCORT_INFO[ESCORT_THIS_DATA_ID].start_time == "0" || ALL_ESCORT_INFO[ESCORT_THIS_DATA_ID].end_time == "0"){
        $("#valid_time")[0].checked = true;
        $("#time_input").hide();
    }else {
        $("#valid_time")[0].checked = false;
        $("#escort_start_data").val(transTimeStampToString(ALL_ESCORT_INFO[ESCORT_THIS_DATA_ID].start_time,2));
        $("#escort_start_time").val(transTimeStampToString(ALL_ESCORT_INFO[ESCORT_THIS_DATA_ID].start_time));
        $("#escort_start_time").datetimepicker('setStartDate',$("#escort_start_data").val());
        $("#escort_end_data").val(transTimeStampToString(ALL_ESCORT_INFO[ESCORT_THIS_DATA_ID].end_time,2));
        $("#escort_end_time").val(transTimeStampToString(ALL_ESCORT_INFO[ESCORT_THIS_DATA_ID].end_time));
        $("#escort_end_time").datetimepicker('setStartDate',$("#escort_end_data").val());
        $("#time_input").show();
    }
    $("#time_list").html("");
    TIME_OBJ = {};
    if(ALL_ESCORT_INFO[ESCORT_THIS_DATA_ID].time_json){
        var time_json = JSON.parse(ALL_ESCORT_INFO[ESCORT_THIS_DATA_ID].time_json);
        for (var i in time_json){
            var start_hour = parseInt(parseInt(time_json[i][0])/ 3600);
            var start_minute = parseInt(parseInt(time_json[i][0]) % 3600 / 60);
            var end_hour = parseInt(parseInt(time_json[i][1])/ 3600);
            var end_minute = parseInt(parseInt(time_json[i][1]) % 3600 / 60);
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
            TIME_OBJ[time_value] = repeat_time;
            var time_list = '<div style="display: inline-block;margin-right:10px;" data-value="'+time_value+'"><span>'+start_hour_html+":"+start_minute_html+'</span>~<span>'+end_hour_html+":"+end_minute_html+'</span><span class="glyphicon glyphicon-remove" data-value="'+time_value+'"></span></div>';
            $("#time_list").append(time_list);
        }
    }
    if(JSON.stringify(TIME_OBJ) == "{}"){
        $("#repeat_week").hide();
        $("#every_day")[0].checked = true;
        $("#week_select").find(".btn").removeClass("btn-default").addClass("btn-blue");
        $("#week_select").hide();
    }else {
        $("#repeat_week").show();
        var day_json = JSON.parse(ALL_ESCORT_INFO[ESCORT_THIS_DATA_ID].day_json);
        $("#week_select").find(".btn").removeClass("btn-blue").addClass("btn-default");
        if(day_json.length == 7){
            $("#every_day")[0].checked = true;
            $("#week_select").find(".btn").removeClass("btn-default").addClass("btn-blue");
            $("#week_select").hide();
        }else {
            $("#every_day")[0].checked = false;
            for (var i in day_json){
                $("#week_select button[data-value="+day_json[i]+"]").removeClass("btn-default").addClass("btn-blue");
            }
            $("#week_select").show();
        }
    }
    getBeEscortCard(ESCORT_THIS_DATA_ID);
    getEscortCard(ESCORT_THIS_DATA_ID);
    $("#escort_right_side").modal("show");
});

/*
 陪同设置模态框保存按钮
*/
$('#escort_save_btn').click(function () {
    var name = $('#escort_add_name').val(),
        radius = $("#escort_add_radius").val(),
        comment = $("#escort_add_comment").val(),
        status = $("#escort_add_status").val();
    if(!name || !radius || !status){
        HG_MESSAGE('请填写具体信息！');
        return;
    }
    if(parseFloat(radius) <= 0){
        HG_MESSAGE('错误的陪同距离！');
        return;
    }
    if($("#valid_time")[0].checked){
        var start_time = 0;
        var end_time = 0;
    }else {
        var start_time = getSearchTime("escort_start_data","escort_start_time");
        var end_time = getSearchTime("escort_end_data","escort_end_time");
    }
    if(start_time > end_time){
        HG_MESSAGE('开始时间不能大于结束时间！');
        return;
    }
    var text = $('#escort_right_side h4').text();

    if(JSON.stringify(TIME_OBJ) == "{}"){
        var time_json = [""];
        var day_json = [""];
    }else {
        var time_json = [];
        for(var i in TIME_OBJ){
            time_json.push(TIME_OBJ[i]);
        }
        var day_json = [];
        if($("#every_day")[0].checked == true){
            day_json = [0,1,2,3,4,5,6];
        }else {
            var btn = $("#week_select").find(".btn-blue");
            for (var i = 0; i < btn.length; i++) {
                day_json.push($(btn[i]).data("value"));
            }
        }
        if(day_json.length <=0 ){
            HG_MESSAGE("循环日期不能为空");
            return;
        }
    }

    var be_escort_card_ids = [];
    var be_escort_list = $("#list_be_escort_persons").find("input");
    $(be_escort_list).each(function () {
        if ($(this)[0].checked) {
            be_escort_card_ids.push($(this).data("id"));
        }
    });
    if(be_escort_card_ids.length == 0){
        HG_MESSAGE('请选择被陪同人员！');
        return;
    }
    var escort_card_ids = [];
    var escort_list = $("#list_escort_persons").find("input");
    $(escort_list).each(function () {
        if ($(this)[0].checked) {
            escort_card_ids.push($(this).data("id"));
        }
    });
    if(escort_card_ids.length == 0){
        HG_MESSAGE('请选择陪同人员！');
        return;
    }
    if(text == '新增陪同'){
        HG_AJAX('/position_sdk/ModularArea/EscortStray/addEscort',{
            name:name,
            radius:radius,
            is_use:status,
            card_ids:escort_card_ids,
            passive_card_ids:be_escort_card_ids,
            start_time:start_time,
            end_time:end_time,
            time_json:time_json,
            day_json:day_json,
            comment:comment
        },'post',function (data) {
            if(data.type == 1){
                HG_MESSAGE('新增成功！');
                getEscort();
                getEscortCount();
                $("#escort_right_side").modal("hide");
            }else{
                HG_MESSAGE(data.result);
            }
        })
    }else if(text == '修改陪同'){
        HG_AJAX('/position_sdk/ModularArea/EscortStray/updateEscort',{
            id:ESCORT_THIS_DATA_ID,
            name:name,
            radius:radius,
            is_use:status,
            card_ids:escort_card_ids,
            passive_card_ids:be_escort_card_ids,
            start_time:start_time,
            end_time:end_time,
            time_json:time_json,
            day_json:day_json,
            comment:comment
        },'post',function (data) {
            if(data.type == 1){
                HG_MESSAGE('修改成功！');
                getEscort();
                $("#escort_right_side").modal("hide");
            }else{
                HG_MESSAGE(data.result);
            }
        })
    }
});

/*
 陪同设置人员的删除按钮
*/
$('#escort_table tbody').on('click','.glyphicon-trash',function () {
    ESCORT_THIS_DATA_ID = $(this).data('id');
    $("#modal_delete_escort").modal('show');
});

/*
 确认删除
*/
$('#confirm_delete_escort').click(function () {
    HG_AJAX('/position_sdk/ModularArea/EscortStray/deleteEscortStray',{id:ESCORT_THIS_DATA_ID},'post',function (data) {
        if(data.type == 1){
            $("#modal_delete_escort").modal('hide');
            getEscort();
            getEscortCount();
            HG_MESSAGE('删除成功！');
        }else{
            HG_MESSAGE(data.result);
        }
    })
});

/*
 离群设置
*/
var LEAVE_TOTAL_PAGE;//离群总页数，后端方法确定
var LEAVE_NOW_PAGE = 1;//离群页码
var LIMIT_LEAVE = 50;//离群每页显示数量
var ALL_LEAVE_INFO = [];//存储离群信息的数组
var LEAVE_THIS_DATA_ID;//操作某条数据所用id
var LEAVE_TIME_OBJ = {};//存储重复时间段的对象

/*
 离群分页
*/
function getLeavePage() {
    laypage({
        cont: 'leave_pages', //容器。值支持id名、原生dom对象，jquery对象。【如该容器为】：<div id="page1"></div>
        pages: LEAVE_TOTAL_PAGE, //通过后台拿到的总页数
        curr: LEAVE_NOW_PAGE, //初始化当前页
        skin: '#4ba9dc',//皮肤颜色
        groups: 5, //连续显示分页数
        skip: false, //是否开启跳页
        first: '首页', //若不显示，设置false即可
        last: '尾页', //若不显示，设置false即可
        prev: '上一页', //若不显示，设置false即可
        next: '下一页', //若不显示，设置false即可
        jump: function (obj, first) { //触发分页后的回调
            if (!first) {
                LEAVE_NOW_PAGE = obj.curr;
                getLeave();
            }
        }
    });
}

/*
 获取离群的数据
*/
function getLeave() {
    var name = checkInputNull($("#leave_name").val());
    HG_AJAX('/position_sdk/ModularArea/EscortStray/getEscortStray',{
        page:LEAVE_NOW_PAGE,
        limit:LIMIT_LEAVE,
        name:name,
        type:12
    },'post',function (data) {
        if(data.type == 1){
            var data = data.result,
                htmls = '';
            if(LEAVE_NOW_PAGE == 0){
                LEAVE_NOW_PAGE = 1;
            }
            for(var i in data){
                var id = data[i].id,
                    index = (parseInt(i) + 1  + ((LEAVE_NOW_PAGE  - 1 ) * LIMIT_LEAVE)),
                    name = data[i].name,
                    radius = data[i].radius,
                    time = checkTimeNull(data[i].start_time,data[i].end_time),
                    is_use = checkUseStatus(data[i].is_use),
                    comment = checkNull(data[i].comment),
                    options = "<i class='glyphicon glyphicon-edit' data-id='" + id + "'></i><i class='glyphicon glyphicon-trash' data-id='" + id+ "'></i>",
                    obj = {
                        id:id,
                        name:name,
                        radius:radius,
                        is_use:data[i].is_use,
                        time_json:data[i].time_json,
                        day_json:data[i].day_json,
                        card_ids:data[i].card_ids,
                        start_time:data[i].start_time,
                        end_time:data[i].end_time,
                        comment:data[i].comment
                    };
                ALL_LEAVE_INFO[id] = obj;
                htmls += '<tr><td>'+index+'</td><td>'+name+'</td><td>'+radius+'</td><td>'+time+'</td><td>'+is_use+'</td><td>'+comment+'</td><td>'+options+'</td></tr>';
            }
            $('#leave_table tbody').html(htmls);
        }else{
            HG_MESSAGE(data.result);
        }
    })
}

/*
 离群的数据总量
*/
function getLeaveCount() {
    var name = checkInputNull($("#leave_name").val());
    HG_AJAX('/position_sdk/ModularArea/EscortStray/getCount',{
        name:name,
        type:12
    },'post',function (data) {
        if(data.type == 1){
            var result = data.result;
            LEAVE_TOTAL_PAGE = Math.ceil(result / LIMIT_LEAVE);
            if (LEAVE_TOTAL_PAGE < LEAVE_NOW_PAGE) {
                LEAVE_NOW_PAGE = LEAVE_TOTAL_PAGE;
                getLeave();
            }
            getLeavePage();
        }else{
            HG_MESSAGE(data.result);
        }
    })
}

/*
 获取所有卡号,用于离群人员设置
*/
function getLeaveCard(id) {
    HG_AJAX("/position_sdk/ModularCard/Card/getCard",{
        limit: 100000000,
        page: 1
    },'post',function (data) {
        if (data.type == 1) {
            var result = data.result;
            var list = "";
            $(result).each(function () {
                list += "<label><input type='checkbox' data-id='" + this.card_id + "'>" + this.card_id + "</label>";
            });
            $("#list_chose_leave_person").html(list); //写入添加区域的权限卡号列表
            var check_flag = 0;
            if(id && ALL_LEAVE_INFO[id].card_ids){
                for (var i in ALL_LEAVE_INFO[id].card_ids){
                    $("#list_chose_leave_person input[data-id=" + ALL_LEAVE_INFO[id].card_ids[i] + "]")[0].checked = true;
                    check_flag++;
                }
            }
            if (check_flag == 0){
                $("#chose_leave_person_all")[0].checked = false;
            }else if(check_flag == result.length) {
                $("#chose_leave_person_all")[0].checked = true;
            } else {
                $("#chose_leave_person_all")[0].checked = false;
            }
        } else {
            HG_MESSAGE(data.result);
        }
    });
}

getLeave();
getLeaveCount();

/*
 离群查询
*/
$('#leave_search_btn').click(function () {
    getLeave();
    getLeaveCount();
});

/*
 全选卡号按钮
*/
$("#chose_leave_person_all").click(function () {
    var all_card = $("#list_chose_leave_person").find("input");
    if ($(this)[0].checked) {
        $(all_card).each(function () {
            $(this)[0].checked = true;
        });
    } else {
        $(all_card).each(function () {
            $(this)[0].checked = false;
        });
    }
});

/*
 点击离群设置卡号，若为不选，则取消全选状态
*/
$("#list_chose_leave_person").on("click", "input", function () {
    var check_flag = 0;
    var input = $("#list_chose_leave_person").find("input");
    for (var i = 0; i < input.length; i++) {
        if ($(input[i])[0].checked == true) {
            check_flag++;
        }
    }
    if (check_flag == input.length) {
        $("#chose_leave_person_all")[0].checked = true;
    } else {
        $("#chose_leave_person_all")[0].checked = false;
    }
});

/*
 选择时间是否为永久有效
*/
$("#leave_valid_time").click(function () {
    if($(this)[0].checked){
        $("#leave_time_input").hide();
    }else {
        $("#leave_time_input").show();
    }
});

/*
 点击加号图标，添加时间段的选择
*/
$("#leave_time_plus").click(function () {
    $("#leave_start_hour_time").val("0");
    $("#leave_start_minute_time").val("0");
    $("#leave_end_hour_time").val("23");
    $("#leave_end_minute_time").val("59");
    $("#leave_show_time_select").show();
});

/*
 确认添加时间段
*/
$("#leave_show_time_select").on("click",".glyphicon-ok",function () {
    var start_hour = $("#leave_start_hour_time").val();
    var start_minute = $("#leave_start_minute_time").val();
    var end_hour = $("#leave_end_hour_time").val();
    var end_minute = $("#leave_end_minute_time").val();
    var start_hour_html = $('#leave_start_hour_time option:selected').text();
    var start_minute_html = $('#leave_start_minute_time option:selected').text();
    var end_hour_html = $('#leave_end_hour_time option:selected').text();
    var end_minute_html = $('#leave_end_minute_time option:selected').text();
    var repeat_time = [start_hour * 3600 + start_minute *60,end_hour * 3600 + end_minute *60];
    var time_value = start_hour * 3600 + start_minute *60 + end_hour * 3600 + end_minute *60;
    if((end_hour * 3600 + end_minute *60)<=(start_hour * 3600 + start_minute *60)){
        HG_MESSAGE("开始时间段不能大于等于结束时间段");
        return;
    }
    if(LEAVE_TIME_OBJ[time_value]){
        HG_MESSAGE("该时间段已存在");
        return;
    }
    LEAVE_TIME_OBJ[time_value] = repeat_time;
    var time_list = '<div style="display: inline-block;margin-right:10px;" data-value="'+time_value+'"><span>'+start_hour_html+":"+start_minute_html+'</span>~<span>'+end_hour_html+":"+end_minute_html+'</span><span class="glyphicon glyphicon-remove" data-value="'+time_value+'"></span></div>';
    $("#leave_time_list").append(time_list);
    $("#leave_show_time_select").hide();
    $("#leave_repeat_week").show();
});

/*
 取消添加时间段
*/
$("#leave_show_time_select").on("click",".glyphicon-remove",function () {
    $("#leave_show_time_select").hide();
    if(JSON.stringify(LEAVE_TIME_OBJ) == "{}"){
        $("#leave_repeat_week").hide();
        $("#leave_every_day")[0].checked = true;
        $("#leave_week_select").find(".btn").removeClass("btn-default").addClass("btn-blue");
        $("#leave_week_select").hide();
    }
});

/*
 取消已添加的时间段
*/
$("#leave_time_list").on("click",".glyphicon-remove",function () {
    $(this).parent("div").remove();
    var time_flag = $(this).data("value");
    delete LEAVE_TIME_OBJ[time_flag];
    if(JSON.stringify(LEAVE_TIME_OBJ) == "{}"){
        $("#leave_repeat_week").hide();
        $("#leave_every_day")[0].checked = true;
        $("#leave_week_select").find(".btn").removeClass("btn-default").addClass("btn-blue");
        $("#leave_week_select").hide();
    }
});

/*
 点击每天的单选框，选择每天重复
*/
$("#leave_every_day").click(function () {
    if($(this)[0].checked == true){
        $("#leave_week_select").find(".btn").removeClass("btn-default").addClass("btn-blue");
        $("#leave_week_select").hide();
    }else {
        $("#leave_week_select").find(".btn").removeClass("btn-blue").addClass("btn-default");
        $("#leave_week_select").show();
    }
});

/*
 选择周几重复
*/
$("#leave_week_select").on("click",".btn",function () {
    var check_flag = 0;
    var btn = $("#leave_week_select").find(".btn");
    if($(this).hasClass("btn-default")){
        $(this).removeClass("btn-default").addClass("btn-blue");
    }else {
        $(this).removeClass("btn-blue").addClass("btn-default");
    }
    for (var i = 0; i < btn.length; i++) {
        if ($(btn[i]).hasClass("btn-blue")) {
            check_flag++;
        }
    }
    if (check_flag == btn.length) {
        $("#leave_every_day")[0].checked = true;
    } else {
        $("#leave_every_day")[0].checked = false;
    }
});

/*
 离群设置的新增
*/
$("#leave_add_btn").click(function () {
    $('#leave_right_side h4').html('新增离群');
    $('#leave_right_side input').val(null);
    $("#leave_valid_time")[0].checked = true;
    $("#leave_time_input").hide();
    $("#leave_time_list").html("");
    LEAVE_TIME_OBJ = {};
    $("#leave_repeat_week").hide();
    $("#leave_show_time_select").hide();
    $("#leave_every_day")[0].checked = true;
    $("#leave_week_select").find(".btn").removeClass("btn-default").addClass("btn-blue");
    $("#leave_week_select").hide();
    initDayTime("leave_start_data","leave_end_data");
    initDateTime("leave_start_time","leave_end_time","leave_start_data","leave_end_data");
    getLeaveCard("");
    $('#leave_right_side select').find('option:first').prop('checked',true);
    $("#leave_right_side").modal("show");
});

/*
 离群侧边栏的取消按钮
*/
$("#leave_cancel_btn").click(function () {
    $("#leave_right_side").modal("hide");
});

/*
 离群设置人员的编辑按钮
*/
$('#leave_table tbody').on('click','.glyphicon-edit',function () {
    $('#leave_right_side h4').html('修改离群');
    LEAVE_THIS_DATA_ID = $(this).data('id');
    $("#leave_right_side #leave_add_name").val(ALL_LEAVE_INFO[LEAVE_THIS_DATA_ID].name);
    $("#leave_right_side #leave_add_radius").val(ALL_LEAVE_INFO[LEAVE_THIS_DATA_ID].radius);
    $("#leave_right_side #leave_add_status").val(ALL_LEAVE_INFO[LEAVE_THIS_DATA_ID].is_use);
    $("#leave_show_time_select").hide();
    initDayTime("leave_start_data","leave_end_data");
    initDateTime("leave_start_time","leave_end_time","leave_start_data","leave_end_data");
    if(ALL_LEAVE_INFO[LEAVE_THIS_DATA_ID].start_time == "0" || ALL_LEAVE_INFO[LEAVE_THIS_DATA_ID].end_time == "0"){
        $("#leave_valid_time")[0].checked = true;
        $("#leave_time_input").hide();
    }else {
        $("#leave_valid_time")[0].checked = false;
        $("#leave_start_data").val(transTimeStampToString(ALL_LEAVE_INFO[LEAVE_THIS_DATA_ID].start_time,2));
        $("#leave_start_time").val(transTimeStampToString(ALL_LEAVE_INFO[LEAVE_THIS_DATA_ID].start_time));
        $("#leave_start_time").datetimepicker('setStartDate',$("#leave_start_data").val());
        $("#leave_end_data").val(transTimeStampToString(ALL_LEAVE_INFO[LEAVE_THIS_DATA_ID].end_time,2));
        $("#leave_end_time").val(transTimeStampToString(ALL_LEAVE_INFO[LEAVE_THIS_DATA_ID].end_time));
        $("#leave_end_time").datetimepicker('setStartDate',$("#leave_end_data").val());
        $("#leave_time_input").show();
    }
    $("#leave_time_list").html("");
    LEAVE_TIME_OBJ = {};
    if(ALL_LEAVE_INFO[LEAVE_THIS_DATA_ID].time_json){
        var time_json = JSON.parse(ALL_LEAVE_INFO[LEAVE_THIS_DATA_ID].time_json);
        for (var i in time_json){
            var start_hour = parseInt(parseInt(time_json[i][0])/ 3600);
            var start_minute = parseInt(parseInt(time_json[i][0]) % 3600 / 60);
            var end_hour = parseInt(parseInt(time_json[i][1])/ 3600);
            var end_minute = parseInt(parseInt(time_json[i][1]) % 3600 / 60);
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
            LEAVE_TIME_OBJ[time_value] = repeat_time;
            var time_list = '<div style="display: inline-block;margin-right:10px;" data-value="'+time_value+'"><span>'+start_hour_html+":"+start_minute_html+'</span>~<span>'+end_hour_html+":"+end_minute_html+'</span><span class="glyphicon glyphicon-remove" data-value="'+time_value+'"></span></div>';
            $("#leave_time_list").append(time_list);
        }
    }
    if(JSON.stringify(LEAVE_TIME_OBJ) == "{}"){
        $("#leave_repeat_week").hide();
        $("#leave_every_day")[0].checked = true;
        $("#leave_week_select").find(".btn").removeClass("btn-default").addClass("btn-blue");
        $("#leave_week_select").hide();
    }else {
        $("#leave_repeat_week").show();
        var day_json = JSON.parse(ALL_LEAVE_INFO[LEAVE_THIS_DATA_ID].day_json);
        $("#leave_week_select").find(".btn").removeClass("btn-blue").addClass("btn-default");
        if(day_json.length == 7){
            $("#leave_every_day")[0].checked = true;
            $("#leave_week_select").find(".btn").removeClass("btn-default").addClass("btn-blue");
            $("#leave_week_select").hide();
        }else {
            $("#leave_every_day")[0].checked = false;
            for (var i in day_json){
                $("#leave_week_select button[data-value="+day_json[i]+"]").removeClass("btn-default").addClass("btn-blue");
            }
            $("#leave_week_select").show();
        }
    }
    getLeaveCard(LEAVE_THIS_DATA_ID);
    $("#leave_right_side").modal("show");
});

/*
 离群侧边栏的保存按钮
*/
$('#leave_save_btn').click(function () {
    var name = $('#leave_add_name').val(),
        radius = $("#leave_add_radius").val(),
        comment = $("#leave_add_comment").val(),
        status = $("#leave_add_status").val();
    if(!name ||!radius ||!status){
        HG_MESSAGE('请填写具体信息！');
        return;
    }
    if(parseFloat(radius) <= 0){
        HG_MESSAGE('错误的最远距离！');
        return;
    }
    var card_ids = [];
    var list = $("#list_chose_leave_person").find("input");
    $(list).each(function () {
        if ($(this)[0].checked) {
            card_ids.push($(this).data("id"));
        }
    });
    if(card_ids.length == 0){
        HG_MESSAGE('请选择人员！');
        return;
    }
    if($("#leave_valid_time")[0].checked){
        var start_time = 0;
        var end_time = 0;
    }else {
        var start_time = getSearchTime("leave_start_data","leave_start_time");
        var end_time = getSearchTime("leave_end_data","leave_end_time");
    }
    if(start_time > end_time){
        HG_MESSAGE('开始时间不能大于结束时间！');
        return;
    }
    if(JSON.stringify(LEAVE_TIME_OBJ) == "{}"){
        var time_json = [""];
        var day_json = [""];
    }else {
        var time_json = [];
        for(var i in LEAVE_TIME_OBJ){
            time_json.push(LEAVE_TIME_OBJ[i]);
        }
        var day_json = [];
        if($("#leave_every_day")[0].checked == true){
            day_json = [0,1,2,3,4,5,6];
        }else {
            var btn = $("#leave_week_select").find(".btn-blue");
            for (var i = 0; i < btn.length; i++) {
                day_json.push($(btn[i]).data("value"));
            }
        }
        if(day_json.length <=0 ){
            HG_MESSAGE("循环日期不能为空");
            return;
        }
    }
    var text = $('#leave_right_side h4').text();
    if(text == '新增离群'){
        HG_AJAX('/position_sdk/ModularArea/EscortStray/addStray',{
            name:name,
            radius:radius,
            is_use:status,
            start_time:start_time,
            end_time:end_time,
            card_ids:card_ids,
            day_json:day_json,
            comment:comment,
            time_json:time_json
        },'post',function (data){
            if(data.type == 1){
                HG_MESSAGE('新增成功！');
                getLeave();
                getLeaveCount();
                $("#leave_right_side").modal("hide");
            }else{
                HG_MESSAGE(data.result);
            }
        })
    }else if(text == '修改离群'){
        HG_AJAX('/position_sdk/ModularArea/EscortStray/updateStray',{
            id:LEAVE_THIS_DATA_ID,
            name:name,
            radius:radius,
            is_use:status,
            start_time:start_time,
            end_time:end_time,
            card_ids:card_ids,
            day_json:day_json,
            comment:comment,
            time_json:time_json
        },'post',function (data) {
            if(data.type == 1){
                HG_MESSAGE('修改成功！');
                getLeave() ;
                $("#leave_right_side").modal("hide");
            }else{
                HG_MESSAGE(data.result);
            }
        })
    }
});

/*
 离群设置人员的删除按钮
*/
$('#leave_table tbody').on('click','.glyphicon-trash',function () {
    LEAVE_THIS_DATA_ID = $(this).data('id');
    $("#modal_delete_leave").modal('show');
});

/*
 确认删除
*/
$('#confirm_delete_leave').click(function () {
    HG_AJAX('/position_sdk/ModularArea/EscortStray/deleteEscortStray',{id:LEAVE_THIS_DATA_ID},'post',function (data) {
        if(data.type == 1){
            $("#modal_delete_leave").modal('hide');
            HG_MESSAGE('删除成功！');
            getLeave();
            getLeaveCount();
        }else{
            HG_MESSAGE(data.result);
        }
    })
});



/*
 监护组设置
*/
var CUSTODY_TOTAL_PAGE;//监护组总页数，后端方法确定
var CUSTODY_NOW_PAGE = 1;//监护组页码
var LIMIT_CUSTODY = 50;//监护组每页显示数量
var ALL_CUSTODY_INFO = [];//存储监护组信息的数组
var CUSTODY_THIS_DATA_ID;//操作某条数据所用id
var CUSTODY_TIME_OBJ = {};//存储重复时间段的对象

/*
 监护组分页
*/
function getCustodyPage() {
    laypage({
        cont: 'custody_pages', //容器。值支持id名、原生dom对象，jquery对象。【如该容器为】：<div id="page1"></div>
        pages: CUSTODY_TOTAL_PAGE, //通过后台拿到的总页数
        curr: CUSTODY_NOW_PAGE, //初始化当前页
        skin: '#4ba9dc',//皮肤颜色
        groups: 5, //连续显示分页数
        skip: false, //是否开启跳页
        first: '首页', //若不显示，设置false即可
        last: '尾页', //若不显示，设置false即可
        prev: '上一页', //若不显示，设置false即可
        next: '下一页', //若不显示，设置false即可
        jump: function (obj, first) { //触发分页后的回调
            if (!first) {
                CUSTODY_NOW_PAGE = obj.curr;
                getCustody();
            }
        }
    });
}

/*
 获取监护组的数据
*/
function getCustody() {
    var card = checkInputNull($("#custody_card").val());
    HG_AJAX('/position_sdk/ModularArea/Dynamic/getDynamic',{
        page:CUSTODY_NOW_PAGE,
        limit:LIMIT_CUSTODY,
        card_id:card,
        type:9
    },'post',function (data) {
        if(data.type == 1){
            var data = data.result,
                htmls = '';
            if(CUSTODY_NOW_PAGE == 0){
                CUSTODY_NOW_PAGE = 1;
            }
            for(var i in data){
                var id = data[i].id,
                    index = (parseInt(i) + 1  + ((CUSTODY_NOW_PAGE  - 1 ) * LIMIT_CUSTODY)),
                    name = data[i].name,
                    card_id = data[i].card_id,
                    radius = data[i].radius,
                    time = checkTimeNull(data[i].alarm_rule_infos[0].start_time,data[i].alarm_rule_infos[0].end_time),
                    is_use = checkUseStatus(data[i].is_use),
                    comment = checkNull(data[i].alarm_rule_infos[0].comment),
                    options = "<i class='glyphicon glyphicon-edit' data-id='" + id + "'></i><i class='glyphicon glyphicon-trash' data-id='" + id+ "'></i>",
                    obj = {
                        id:id,
                        name:name,
                        card_id:card_id,
                        radius:radius,
                        is_use:data[i].is_use,
                        time_json:data[i].alarm_rule_infos[0].time_json,
                        day_json:data[i].alarm_rule_infos[0].day_json,
                        card_ids:data[i].alarm_rule_infos[0].card_ids,
                        start_time:data[i].alarm_rule_infos[0].start_time,
                        end_time:data[i].alarm_rule_infos[0].end_time,
                        comment:data[i].alarm_rule_infos[0].comment,
                        alarm_rule_id:data[i].alarm_rule_ids[0]
                    };
                ALL_CUSTODY_INFO[id] = obj;
                htmls += '<tr><td>'+index+'</td><td>'+name+'</td><td>'+card_id+'</td><td>'+radius+'</td><td>'+time+'</td><td>'+is_use+'</td><td>'+comment+'</td><td>'+options+'</td></tr>';
            }
            $('#custody_table tbody').html(htmls);
        }else{
            HG_MESSAGE(data.result);
        }
    })
}

/*
 监护组的数据总量
*/
function getCustodyCount() {
    var card = checkInputNull($("#custody_card").val());
    HG_AJAX('/position_sdk/ModularArea/Dynamic/getCount',{
        card_id:card,
        type:9
    },'post',function (data) {
        if(data.type == 1){
            var result = data.result;
            CUSTODY_TOTAL_PAGE = Math.ceil(result / LIMIT_CUSTODY);
            if (CUSTODY_TOTAL_PAGE < CUSTODY_NOW_PAGE) {
                CUSTODY_NOW_PAGE = CUSTODY_TOTAL_PAGE;
                getCustody();
            }
            getCustodyPage();
        }else{
            HG_MESSAGE(data.result);
        }
    })
}

/*
 获取所有卡号,用于监护组人员设置
*/
function getCustodyCard(id) {
    HG_AJAX("/position_sdk/ModularCard/Card/getCard",{
        limit: 100000000,
        page: 1
    },'post',function (data) {
        if (data.type == 1) {
            var result = data.result;
            var list = "";
            $(result).each(function () {
                list += "<label><input type='checkbox' data-id='" + this.card_id + "'>" + this.card_id + "</label>";
            });
            $("#list_chose_custody_person").html(list); //写入添加区域的权限卡号列表
            var check_flag = 0;
            if(id && ALL_CUSTODY_INFO[id].card_ids){
                for (var i in ALL_CUSTODY_INFO[id].card_ids){
                    $("#list_chose_custody_person input[data-id=" + ALL_CUSTODY_INFO[id].card_ids[i] + "]")[0].checked = true;
                    check_flag++;
                }
            }
            if (check_flag == 0){
                $("#chose_custody_person_all")[0].checked = false;
            }else if(check_flag == result.length) {
                $("#chose_custody_person_all")[0].checked = true;
            } else {
                $("#chose_custody_person_all")[0].checked = false;
            }
        } else {
            HG_MESSAGE(data.result);
        }
    });
}

getCustody();
getCustodyCount();

/*
 监护组查询
*/
$('#custody_search_btn').click(function () {
    getCustody();
    getCustodyCount();
});

/*
 全选卡号按钮
*/
$("#chose_custody_person_all").click(function () {
    var all_card = $("#list_chose_custody_person").find("input");
    if ($(this)[0].checked) {
        $(all_card).each(function () {
            $(this)[0].checked = true;
        });
    } else {
        $(all_card).each(function () {
            $(this)[0].checked = false;
        });
    }
});

/*
 点击卡号, 若为不选, 则取消全选状态
*/
$("#list_chose_custody_person").on("click", "input", function () {
    var check_flag = 0;
    var input = $("#list_chose_custody_person").find("input");
    for (var i = 0; i < input.length; i++) {
        if ($(input[i])[0].checked == true) {
            check_flag++;
        }
    }
    if (check_flag == input.length) {
        $("#chose_custody_person_all")[0].checked = true;
    } else {
        $("#chose_custody_person_all")[0].checked = false;
    }
});

/*
 选择时间是否为永久有效
*/
$("#custody_valid_time").click(function () {
    if($(this)[0].checked){
        $("#custody_time_input").hide();
    }else {
        $("#custody_time_input").show();
    }
});

/*
 点击加号图标，添加时间段的选择
*/
$("#custody_time_plus").click(function () {
    $("#custody_start_hour_time").val("0");
    $("#custody_start_minute_time").val("0");
    $("#custody_end_hour_time").val("23");
    $("#custody_end_minute_time").val("59");
    $("#custody_show_time_select").show();
});

/*
 确认添加时间段
*/
$("#custody_show_time_select").on("click",".glyphicon-ok",function () {
    var start_hour = $("#custody_start_hour_time").val();
    var start_minute = $("#custody_start_minute_time").val();
    var end_hour = $("#custody_end_hour_time").val();
    var end_minute = $("#custody_end_minute_time").val();
    var start_hour_html = $('#custody_start_hour_time option:selected').text();
    var start_minute_html = $('#custody_start_minute_time option:selected').text();
    var end_hour_html = $('#custody_end_hour_time option:selected').text();
    var end_minute_html = $('#custody_end_minute_time option:selected').text();
    var repeat_time = [start_hour * 3600 + start_minute *60,end_hour * 3600 + end_minute *60];
    var time_value = start_hour * 3600 + start_minute *60 + end_hour * 3600 + end_minute *60;
    if((end_hour * 3600 + end_minute *60)<=(start_hour * 3600 + start_minute *60)){
        HG_MESSAGE("开始时间段不能大于等于结束时间段");
        return;
    }
    if(CUSTODY_TIME_OBJ[time_value]){
        HG_MESSAGE("该时间段已存在");
        return;
    }
    CUSTODY_TIME_OBJ[time_value] = repeat_time;
    var time_list = '<div style="display: inline-block;margin-right:10px;" data-value="'+time_value+'"><span>'+start_hour_html+":"+start_minute_html+'</span>~<span>'+end_hour_html+":"+end_minute_html+'</span><span class="glyphicon glyphicon-remove" data-value="'+time_value+'"></span></div>';
    $("#custody_time_list").append(time_list);
    $("#custody_show_time_select").hide();
    $("#custody_repeat_week").show();
});

/*
 取消添加时间段
*/
$("#custody_show_time_select").on("click",".glyphicon-remove",function () {
    $("#custody_show_time_select").hide();
    if(JSON.stringify(CUSTODY_TIME_OBJ) == "{}"){
        $("#custody_repeat_week").hide();
        $("#custody_every_day")[0].checked = true;
        $("#custody_week_select").find(".btn").removeClass("btn-default").addClass("btn-blue");
        $("#custody_week_select").hide();
    }
});

/*
 取消已添加的时间段
*/
$("#custody_time_list").on("click",".glyphicon-remove",function () {
    $(this).parent("div").remove();
    var time_flag = $(this).data("value");
    delete CUSTODY_TIME_OBJ[time_flag];
    if(JSON.stringify(CUSTODY_TIME_OBJ) == "{}"){
        $("#custody_repeat_week").hide();
        $("#custody_every_day")[0].checked = true;
        $("#custody_week_select").find(".btn").removeClass("btn-default").addClass("btn-blue");
        $("#custody_week_select").hide();
    }
});

/*
 点击每天的单选框，选择每天重复
*/
$("#custody_every_day").click(function () {
    if($(this)[0].checked == true){
        $("#custody_week_select").find(".btn").removeClass("btn-default").addClass("btn-blue");
        $("#custody_week_select").hide();
    }else {
        $("#custody_week_select").find(".btn").removeClass("btn-blue").addClass("btn-default");
        $("#custody_week_select").show();
    }
});

/*
 选择周几重复
*/
$("#custody_week_select").on("click",".btn",function () {
    var check_flag = 0;
    var btn = $("#custody_week_select").find(".btn");
    if($(this).hasClass("btn-default")){
        $(this).removeClass("btn-default").addClass("btn-blue");
    }else {
        $(this).removeClass("btn-blue").addClass("btn-default");
    }
    for (var i = 0; i < btn.length; i++) {
        if ($(btn[i]).hasClass("btn-blue")) {
            check_flag++;
        }
    }
    if (check_flag == btn.length) {
        $("#custody_every_day")[0].checked = true;
    } else {
        $("#custody_every_day")[0].checked = false;
    }
});

/*
 监护组设置的新增
*/
$("#custody_add_btn").click(function () {
    $('#custody_right_side h4').html('新增监护组');
    $('#custody_right_side input').val(null);
    $("#custody_valid_time")[0].checked = true;
    $("#custody_time_input").hide();
    $("#custody_time_list").html("");
    CUSTODY_TIME_OBJ = {};
    $("#custody_repeat_week").hide();
    $("#custody_show_time_select").hide();
    $("#custody_every_day")[0].checked = true;
    $("#custody_week_select").find(".btn").removeClass("btn-default").addClass("btn-blue");
    $("#custody_week_select").hide();
    initDayTime("custody_start_data","custody_end_data");
    initDateTime("custody_start_time","custody_end_time","custody_start_data","custody_end_data");
    getCustodyCard("");
    $('#custody_right_side select').find('option:first').prop('checked',true);
    $("#custody_right_side").modal("show");
});

/*
 监护组侧边栏的取消按钮
*/
$("#custody_cancel_btn").click(function () {
    $("#custody_right_side").modal("hide");
});

/*
 监护组设置人员的编辑按钮
*/
$('#custody_table tbody').on('click','.glyphicon-edit',function () {
    $('#custody_right_side h4').html('修改监护组');
    CUSTODY_THIS_DATA_ID = $(this).data('id');
    $("#custody_right_side #custody_add_name").val(ALL_CUSTODY_INFO[CUSTODY_THIS_DATA_ID].name);
    $("#custody_right_side #custody_add_radius").val(ALL_CUSTODY_INFO[CUSTODY_THIS_DATA_ID].radius);
    $("#custody_right_side #custody_add_status").val(ALL_CUSTODY_INFO[CUSTODY_THIS_DATA_ID].is_use);
    $("#custody_right_side #custody_add_card").val(ALL_CUSTODY_INFO[CUSTODY_THIS_DATA_ID].card_id);
    $("#custody_right_side #custody_add_comment").val(ALL_CUSTODY_INFO[CUSTODY_THIS_DATA_ID].comment);
    $("#custody_show_time_select").hide();
    initDayTime("custody_start_data","custody_end_data");
    initDateTime("custody_start_time","custody_end_time","custody_start_data","custody_end_data");
    if(ALL_CUSTODY_INFO[CUSTODY_THIS_DATA_ID].start_time == "0" || ALL_CUSTODY_INFO[CUSTODY_THIS_DATA_ID].end_time == "0"){
        $("#custody_valid_time")[0].checked = true;
        $("#custody_time_input").hide();
    }else {
        $("#custody_valid_time")[0].checked = false;
        $("#custody_start_data").val(transTimeStampToString(ALL_CUSTODY_INFO[CUSTODY_THIS_DATA_ID].start_time,2));
        $("#custody_start_time").val(transTimeStampToString(ALL_CUSTODY_INFO[CUSTODY_THIS_DATA_ID].start_time));
        $("#custody_start_time").datetimepicker('setStartDate',$("#custody_start_data").val());
        $("#custody_end_data").val(transTimeStampToString(ALL_CUSTODY_INFO[CUSTODY_THIS_DATA_ID].end_time,2));
        $("#custody_end_time").val(transTimeStampToString(ALL_CUSTODY_INFO[CUSTODY_THIS_DATA_ID].end_time));
        $("#custody_end_time").datetimepicker('setStartDate',$("#custody_end_data").val());
        $("#custody_time_input").show();
    }
    $("#custody_time_list").html("");
    CUSTODY_TIME_OBJ = {};
    if(ALL_CUSTODY_INFO[CUSTODY_THIS_DATA_ID].time_json){
        var time_json = JSON.parse(ALL_CUSTODY_INFO[CUSTODY_THIS_DATA_ID].time_json);
        for (var i in time_json){
            var start_hour = parseInt(parseInt(time_json[i][0])/ 3600);
            var start_minute = parseInt(parseInt(time_json[i][0]) % 3600 / 60);
            var end_hour = parseInt(parseInt(time_json[i][1])/ 3600);
            var end_minute = parseInt(parseInt(time_json[i][1]) % 3600 / 60);
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
            CUSTODY_TIME_OBJ[time_value] = repeat_time;
            var time_list = '<div style="display: inline-block;margin-right:10px;" data-value="'+time_value+'"><span>'+start_hour_html+":"+start_minute_html+'</span>~<span>'+end_hour_html+":"+end_minute_html+'</span><span class="glyphicon glyphicon-remove" data-value="'+time_value+'"></span></div>';
            $("#custody_time_list").append(time_list);
        }
    }
    if(JSON.stringify(CUSTODY_TIME_OBJ) == "{}"){
        $("#custody_repeat_week").hide();
        $("#custody_every_day")[0].checked = true;
        $("#custody_week_select").find(".btn").removeClass("btn-default").addClass("btn-blue");
        $("#custody_week_select").hide();
    }else {
        $("#custody_repeat_week").show();
        var day_json = JSON.parse(ALL_CUSTODY_INFO[CUSTODY_THIS_DATA_ID].day_json);
        $("#custody_week_select").find(".btn").removeClass("btn-blue").addClass("btn-default");
        if(day_json.length == 7){
            $("#custody_every_day")[0].checked = true;
            $("#custody_week_select").find(".btn").removeClass("btn-default").addClass("btn-blue");
            $("#custody_week_select").hide();
        }else {
            $("#custody_every_day")[0].checked = false;
            for (var i in day_json){
                $("#custody_week_select button[data-value="+day_json[i]+"]").removeClass("btn-default").addClass("btn-blue");
            }
            $("#custody_week_select").show();
        }
    }
    getCustodyCard(CUSTODY_THIS_DATA_ID);
    $("#custody_right_side").modal("show");
});

/*
 监护组侧边栏的保存按钮
*/
$('#custody_save_btn').click(function () {
    var name = $('#custody_add_name').val(),
        radius = $("#custody_add_radius").val(),
        comment = $("#custody_add_comment").val(),
        card = $("#custody_add_card").val(),
        status = $("#custody_add_status").val();
    if(!name ||!radius ||!status ||!card){
        HG_MESSAGE('请填写具体信息！');
        return;
    }
    if(parseFloat(radius) <= 0){
        HG_MESSAGE('错误的最远距离！');
        return;
    }
    var card_ids = [];
    var list = $("#list_chose_custody_person").find("input");
    $(list).each(function () {
        if ($(this)[0].checked) {
            card_ids.push($(this).data("id"));
        }
    });
    if(card_ids.length == 0){
        HG_MESSAGE('请选择人员！');
        return;
    }
    if($("#custody_valid_time")[0].checked){
        var start_time = 0;
        var end_time = 0;
    }else {
        var start_time = getSearchTime("custody_start_data","custody_start_time");
        var end_time = getSearchTime("custody_end_data","custody_end_time");
    }
    if(start_time > end_time){
        HG_MESSAGE('开始时间不能大于结束时间！');
        return;
    }
    if(JSON.stringify(CUSTODY_TIME_OBJ) == "{}"){
        var time_json = [""];
        var day_json = [""];
    }else {
        var time_json = [];
        for(var i in CUSTODY_TIME_OBJ){
            time_json.push(CUSTODY_TIME_OBJ[i]);
        }
        var day_json = [];
        if($("#custody_every_day")[0].checked == true){
            day_json = [0,1,2,3,4,5,6];
        }else {
            var btn = $("#custody_week_select").find(".btn-blue");
            for (var i = 0; i < btn.length; i++) {
                day_json.push($(btn[i]).data("value"));
            }
        }
        if(day_json.length <=0 ){
            HG_MESSAGE("循环日期不能为空");
            return;
        }
    }
    var text = $('#custody_right_side h4').text();
    if(text == '新增监护组'){
        HG_AJAX('/position_sdk/ModularArea/Dynamic/addDynamic',{
            name:name,
            rule_name:name,
            card_id:card,
            radius:radius,
            is_use:status,
            start_time:start_time,
            end_time:end_time,
            card_ids:card_ids,
            day_json:day_json,
            comment:comment,
            time_json:time_json,
            type:9
        },'post',function (data){
            if(data.type == 1){
                HG_MESSAGE('新增成功！');
                getCustody();
                getCustodyCount();
                $("#custody_right_side").modal("hide");
            }else{
                HG_MESSAGE(data.result);
            }
        })
    }else if(text == '修改监护组'){
        HG_AJAX('/position_sdk/ModularArea/Dynamic/updateDynamic',{
            id:CUSTODY_THIS_DATA_ID,
            name:name,
            rule_name:name,
            card_id:card,
            radius:radius,
            is_use:status,
            start_time:start_time,
            end_time:end_time,
            card_ids:card_ids,
            day_json:day_json,
            comment:comment,
            time_json:time_json,
            type:9,
            alarm_rule_id:ALL_CUSTODY_INFO[CUSTODY_THIS_DATA_ID].alarm_rule_id
        },'post',function (data) {
            if(data.type == 1){
                HG_MESSAGE('修改成功！');
                getCustody();
                getCustodyCount();
                $("#custody_right_side").modal("hide");
            }else{
                HG_MESSAGE(data.result);
            }
        })
    }
});

/*
 监护组设置人员的删除按钮
*/
$('#custody_table tbody').on('click','.glyphicon-trash',function () {
    CUSTODY_THIS_DATA_ID = $(this).data('id');
    $("#modal_delete_custody").modal('show');
});

/*
 确认删除
*/
$('#confirm_delete_custody').click(function () {
    HG_AJAX('/position_sdk/ModularArea/Dynamic/deleteDynamic',{id:CUSTODY_THIS_DATA_ID},'post',function (data) {
        if(data.type == 1){
            $("#modal_delete_custody").modal('hide');
            HG_MESSAGE('删除成功！');
            getCustody();
            getCustodyCount();
        }else{
            HG_MESSAGE(data.result);
        }
    })
});

/*
 危险源设置
*/
var DANGER_TOTAL_PAGE;//危险源总页数，后端方法确定
var DANGER_NOW_PAGE = 1;//危险源页码
var LIMIT_DANGER = 50;//危险源每页显示数量
var ALL_DANGER_INFO = [];//存储危险源信息的数组
var DANGER_THIS_DATA_ID;//操作某条数据所用id
var DANGER_TIME_OBJ = {};//存储重复时间段的对象

/*
 危险源分页
*/
function getDangerPage() {
    laypage({
        cont: 'danger_pages', //容器。值支持id名、原生dom对象，jquery对象。【如该容器为】：<div id="page1"></div>
        pages: DANGER_TOTAL_PAGE, //通过后台拿到的总页数
        curr: DANGER_NOW_PAGE, //初始化当前页
        skin: '#4ba9dc',//皮肤颜色
        groups: 5, //连续显示分页数
        skip: false, //是否开启跳页
        first: '首页', //若不显示，设置false即可
        last: '尾页', //若不显示，设置false即可
        prev: '上一页', //若不显示，设置false即可
        next: '下一页', //若不显示，设置false即可
        jump: function (obj, first) { //触发分页后的回调
            if (!first) {
                DANGER_NOW_PAGE = obj.curr;
                getDanger();
            }
        }
    });
}

/*
 获取危险源的数据
*/
function getDanger() {
    var card = checkInputNull($("#danger_card").val());
    HG_AJAX('/position_sdk/ModularArea/Dynamic/getDynamic',{
        page:DANGER_NOW_PAGE,
        limit:LIMIT_DANGER,
        card_id:card,
        type:10
    },'post',function (data) {
        if(data.type == 1){
            var data = data.result,
                htmls = '';
            if(DANGER_NOW_PAGE == 0){
                DANGER_NOW_PAGE = 1;
            }
            for(var i in data){
                var id = data[i].id,
                    index = (parseInt(i) + 1  + ((DANGER_NOW_PAGE  - 1 ) * LIMIT_DANGER)),
                    name = data[i].name,
                    card_id = data[i].card_id,
                    radius = data[i].radius,
                    time = checkTimeNull(data[i].alarm_rule_infos[0].start_time,data[i].alarm_rule_infos[0].end_time),
                    is_use = checkUseStatus(data[i].is_use),
                    comment = checkNull(data[i].alarm_rule_infos[0].comment),
                    options = "<i class='glyphicon glyphicon-edit' data-id='" + id + "'></i><i class='glyphicon glyphicon-trash' data-id='" + id+ "'></i>",
                    obj = {
                        id:id,
                        name:name,
                        card_id:card_id,
                        radius:radius,
                        is_use:data[i].is_use,
                        time_json:data[i].alarm_rule_infos[0].time_json,
                        day_json:data[i].alarm_rule_infos[0].day_json,
                        card_ids:data[i].alarm_rule_infos[0].card_ids,
                        start_time:data[i].alarm_rule_infos[0].start_time,
                        end_time:data[i].alarm_rule_infos[0].end_time,
                        comment:data[i].alarm_rule_infos[0].comment,
                        alarm_rule_id:data[i].alarm_rule_ids[0]
                    };
                ALL_DANGER_INFO[id] = obj;
                htmls += '<tr><td>'+index+'</td><td>'+name+'</td><td>'+card_id+'</td><td>'+radius+'</td><td>'+time+'</td><td>'+is_use+'</td><td>'+comment+'</td><td>'+options+'</td></tr>';
            }
            $('#danger_table tbody').html(htmls);
        }else{
            HG_MESSAGE(data.result);
        }
    })
}

/*
 危险源的数据总量
*/
function getDangerCount() {
    var card = checkInputNull($("#danger_card").val());
    HG_AJAX('/position_sdk/ModularArea/Dynamic/getCount',{
        card_id:card,
        type:10
    },'post',function (data) {
        if(data.type == 1){
            var result = data.result;
            DANGER_TOTAL_PAGE = Math.ceil(result / LIMIT_DANGER);
            if (DANGER_TOTAL_PAGE < DANGER_NOW_PAGE) {
                DANGER_NOW_PAGE = DANGER_TOTAL_PAGE;
                getDanger();
            }
            getDangerPage();
        }else{
            HG_MESSAGE(data.result);
        }
    })
}

/*
 获取所有卡号,用于危险源人员设置
*/
function getDangerCard(id) {
    HG_AJAX("/position_sdk/ModularCard/Card/getCard",{
        limit: 100000000,
        page: 1
    },'post',function (data) {
        if (data.type == 1) {
            var result = data.result;
            var list = "";
            $(result).each(function () {
                list += "<label><input type='checkbox' data-id='" + this.card_id + "'>" + this.card_id + "</label>";
            });
            $("#list_chose_danger_person").html(list); //写入添加区域的权限卡号列表
            var check_flag = 0;
            if(id && ALL_DANGER_INFO[id].card_ids){
                for (var i in ALL_DANGER_INFO[id].card_ids){
                    $("#list_chose_danger_person input[data-id=" + ALL_DANGER_INFO[id].card_ids[i] + "]")[0].checked = true;
                    check_flag++;
                }
            }
            if (check_flag == 0){
                $("#chose_danger_person_all")[0].checked = false;
            }else if(check_flag == result.length) {
                $("#chose_danger_person_all")[0].checked = true;
            } else {
                $("#chose_danger_person_all")[0].checked = false;
            }
        } else {
            HG_MESSAGE(data.result);
        }
    });
}

getDanger();
getDangerCount();

/*
 危险源查询
*/
$('#danger_search_btn').click(function () {
    getDanger();
    getDangerCount();
});

/*
 全选卡号按钮
*/
$("#chose_danger_person_all").click(function () {
    var all_card = $("#list_chose_danger_person").find("input");
    if ($(this)[0].checked) {
        $(all_card).each(function () {
            $(this)[0].checked = true;
        });
    } else {
        $(all_card).each(function () {
            $(this)[0].checked = false;
        });
    }
});

/*
 点击卡号，若为不选，则取消全选状态
*/
$("#list_chose_danger_person").on("click", "input", function () {
    var check_flag = 0;
    var input = $("#list_chose_danger_person").find("input");
    for (var i = 0; i < input.length; i++) {
        if ($(input[i])[0].checked == true) {
            check_flag++;
        }
    }
    if (check_flag == input.length) {
        $("#chose_danger_person_all")[0].checked = true;
    } else {
        $("#chose_danger_person_all")[0].checked = false;
    }
});

/*
 选择时间是否为永久有效
*/
$("#danger_valid_time").click(function () {
    if($(this)[0].checked){
        $("#danger_time_input").hide();
    }else {
        $("#danger_time_input").show();
    }
});

/*
 点击加号图标，添加时间段的选择
*/
$("#danger_time_plus").click(function () {
    $("#danger_start_hour_time").val("0");
    $("#danger_start_minute_time").val("0");
    $("#danger_end_hour_time").val("23");
    $("#danger_end_minute_time").val("59");
    $("#danger_show_time_select").show();
});

/*
 确认添加时间段
*/
$("#danger_show_time_select").on("click",".glyphicon-ok",function () {
    var start_hour = $("#danger_start_hour_time").val();
    var start_minute = $("#danger_start_minute_time").val();
    var end_hour = $("#danger_end_hour_time").val();
    var end_minute = $("#danger_end_minute_time").val();
    var start_hour_html = $('#danger_start_hour_time option:selected').text();
    var start_minute_html = $('#danger_start_minute_time option:selected').text();
    var end_hour_html = $('#danger_end_hour_time option:selected').text();
    var end_minute_html = $('#danger_end_minute_time option:selected').text();
    var repeat_time = [start_hour * 3600 + start_minute *60,end_hour * 3600 + end_minute *60];
    var time_value = start_hour * 3600 + start_minute *60 + end_hour * 3600 + end_minute *60;
    if((end_hour * 3600 + end_minute *60)<=(start_hour * 3600 + start_minute *60)){
        HG_MESSAGE("开始时间段不能大于等于结束时间段");
        return;
    }
    if(DANGER_TIME_OBJ[time_value]){
        HG_MESSAGE("该时间段已存在");
        return;
    }
    DANGER_TIME_OBJ[time_value] = repeat_time;
    var time_list = '<div style="display: inline-block;margin-right:10px;" data-value="'+time_value+'"><span>'+start_hour_html+":"+start_minute_html+'</span>~<span>'+end_hour_html+":"+end_minute_html+'</span><span class="glyphicon glyphicon-remove" data-value="'+time_value+'"></span></div>';
    $("#danger_time_list").append(time_list);
    $("#danger_show_time_select").hide();
    $("#danger_repeat_week").show();
});

/*
 取消添加时间段
*/
$("#danger_show_time_select").on("click",".glyphicon-remove",function () {
    $("#danger_show_time_select").hide();
    if(JSON.stringify(DANGER_TIME_OBJ) == "{}"){
        $("#danger_repeat_week").hide();
        $("#danger_every_day")[0].checked = true;
        $("#danger_week_select").find(".btn").removeClass("btn-default").addClass("btn-blue");
        $("#danger_week_select").hide();
    }
});

/*
 取消已添加的时间段
*/
$("#danger_time_list").on("click",".glyphicon-remove",function () {
    $(this).parent("div").remove();
    var time_flag = $(this).data("value");
    delete DANGER_TIME_OBJ[time_flag];
    if(JSON.stringify(DANGER_TIME_OBJ) == "{}"){
        $("#danger_repeat_week").hide();
        $("#danger_every_day")[0].checked = true;
        $("#danger_week_select").find(".btn").removeClass("btn-default").addClass("btn-blue");
        $("#danger_week_select").hide();
    }
});

/*
 点击每天的单选框，选择每天重复
*/
$("#danger_every_day").click(function () {
    if($(this)[0].checked == true){
        $("#danger_week_select").find(".btn").removeClass("btn-default").addClass("btn-blue");
        $("#danger_week_select").hide();
    }else {
        $("#danger_week_select").find(".btn").removeClass("btn-blue").addClass("btn-default");
        $("#danger_week_select").show();
    }
});

/*
 选择周几重复
*/
$("#danger_week_select").on("click",".btn",function () {
    var check_flag = 0;
    var btn = $("#danger_week_select").find(".btn");
    if($(this).hasClass("btn-default")){
        $(this).removeClass("btn-default").addClass("btn-blue");
    }else {
        $(this).removeClass("btn-blue").addClass("btn-default");
    }
    for (var i = 0; i < btn.length; i++) {
        if ($(btn[i]).hasClass("btn-blue")) {
            check_flag++;
        }
    }
    if (check_flag == btn.length) {
        $("#danger_every_day")[0].checked = true;
    } else {
        $("#danger_every_day")[0].checked = false;
    }
});

/*
 危险源设置的新增
*/
$("#danger_add_btn").click(function () {
    $('#danger_right_side h4').html('新增危险源');
    $('#danger_right_side input').val(null);
    $("#danger_valid_time")[0].checked = true;
    $("#danger_time_input").hide();
    $("#danger_time_list").html("");
    DANGER_TIME_OBJ = {};
    $("#danger_repeat_week").hide();
    $("#danger_show_time_select").hide();
    $("#danger_every_day")[0].checked = true;
    $("#danger_week_select").find(".btn").removeClass("btn-default").addClass("btn-blue");
    $("#danger_week_select").hide();
    initDayTime("danger_start_data","danger_end_data");
    initDateTime("danger_start_time","danger_end_time","danger_start_data","danger_end_data");
    getDangerCard("");
    $('#danger_right_side select').find('option:first').prop('checked',true);
    $("#danger_right_side").modal("show");
});

/*
 危险源侧边栏的取消按钮
*/
$("#danger_cancel_btn").click(function () {
    $("#danger_right_side").modal("hide");
});

/*
 危险源设置的编辑按钮
*/
$('#danger_table tbody').on('click','.glyphicon-edit',function () {
    $('#danger_right_side h4').html('修改危险源');
    DANGER_THIS_DATA_ID = $(this).data('id');
    $("#danger_right_side #danger_add_name").val(ALL_DANGER_INFO[DANGER_THIS_DATA_ID].name);
    $("#danger_right_side #danger_add_radius").val(ALL_DANGER_INFO[DANGER_THIS_DATA_ID].radius);
    $("#danger_right_side #danger_add_status").val(ALL_DANGER_INFO[DANGER_THIS_DATA_ID].is_use);
    $("#danger_right_side #danger_add_card").val(ALL_DANGER_INFO[DANGER_THIS_DATA_ID].card_id);
    $("#danger_right_side #danger_add_comment").val(ALL_DANGER_INFO[DANGER_THIS_DATA_ID].comment);
    $("#danger_show_time_select").hide();
    initDayTime("danger_start_data","danger_end_data");
    initDateTime("danger_start_time","danger_end_time","danger_start_data","danger_end_data");
    if(ALL_DANGER_INFO[DANGER_THIS_DATA_ID].start_time == "0" || ALL_DANGER_INFO[DANGER_THIS_DATA_ID].end_time == "0"){
        $("#danger_valid_time")[0].checked = true;
        $("#danger_time_input").hide();
    }else {
        $("#danger_valid_time")[0].checked = false;
        $("#danger_start_data").val(transTimeStampToString(ALL_DANGER_INFO[DANGER_THIS_DATA_ID].start_time,2));
        $("#danger_start_time").val(transTimeStampToString(ALL_DANGER_INFO[DANGER_THIS_DATA_ID].start_time));
        $("#danger_start_time").datetimepicker('setStartDate',$("#danger_start_data").val());
        $("#danger_end_data").val(transTimeStampToString(ALL_DANGER_INFO[DANGER_THIS_DATA_ID].end_time,2));
        $("#danger_end_time").val(transTimeStampToString(ALL_DANGER_INFO[DANGER_THIS_DATA_ID].end_time));
        $("#danger_end_time").datetimepicker('setStartDate',$("#danger_end_data").val());
        $("#danger_time_input").show();
    }
    $("#danger_time_list").html("");
    DANGER_TIME_OBJ = {};
    if(ALL_DANGER_INFO[DANGER_THIS_DATA_ID].time_json){
        var time_json = JSON.parse(ALL_DANGER_INFO[DANGER_THIS_DATA_ID].time_json);
        for (var i in time_json){
            var start_hour = parseInt(parseInt(time_json[i][0])/ 3600);
            var start_minute = parseInt(parseInt(time_json[i][0]) % 3600 / 60);
            var end_hour = parseInt(parseInt(time_json[i][1])/ 3600);
            var end_minute = parseInt(parseInt(time_json[i][1]) % 3600 / 60);
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
            DANGER_TIME_OBJ[time_value] = repeat_time;
            var time_list = '<div style="display: inline-block;margin-right:10px;" data-value="'+time_value+'"><span>'+start_hour_html+":"+start_minute_html+'</span>~<span>'+end_hour_html+":"+end_minute_html+'</span><span class="glyphicon glyphicon-remove" data-value="'+time_value+'"></span></div>';
            $("#danger_time_list").append(time_list);
        }
    }
    if(JSON.stringify(DANGER_TIME_OBJ) == "{}"){
        $("#danger_repeat_week").hide();
        $("#danger_every_day")[0].checked = true;
        $("#danger_week_select").find(".btn").removeClass("btn-default").addClass("btn-blue");
        $("#danger_week_select").hide();
    }else {
        $("#danger_repeat_week").show();
        var day_json = JSON.parse(ALL_DANGER_INFO[DANGER_THIS_DATA_ID].day_json);
        $("#danger_week_select").find(".btn").removeClass("btn-blue").addClass("btn-default");
        if(day_json.length == 7){
            $("#danger_every_day")[0].checked = true;
            $("#danger_week_select").find(".btn").removeClass("btn-default").addClass("btn-blue");
            $("#danger_week_select").hide();
        }else {
            $("#danger_every_day")[0].checked = false;
            for (var i in day_json){
                $("#danger_week_select button[data-value="+day_json[i]+"]").removeClass("btn-default").addClass("btn-blue");
            }
            $("#danger_week_select").show();
        }
    }
    getDangerCard(DANGER_THIS_DATA_ID);
    $("#danger_right_side").modal("show");
});

/*
 危险源侧边栏的保存按钮
*/
$('#danger_save_btn').click(function () {
    var name = $('#danger_add_name').val(),
        radius = $("#danger_add_radius").val(),
        comment = $("#danger_add_comment").val(),
        card = $("#danger_add_card").val(),
        status = $("#danger_add_status").val();
    if(!name ||!radius ||!status ||!card){
        HG_MESSAGE('请填写具体信息！');
        return;
    }
    if(parseFloat(radius) <= 0){
        HG_MESSAGE('错误的最远距离！');
        return;
    }
    var card_ids = [];
    var list = $("#list_chose_danger_person").find("input");
    $(list).each(function () {
        if ($(this)[0].checked) {
            card_ids.push($(this).data("id"));
        }
    });
    if(card_ids.length == 0){
        card_ids = [""];
    }
    if($("#danger_valid_time")[0].checked){
        var start_time = 0;
        var end_time = 0;
    }else {
        var start_time = getSearchTime("danger_start_data","danger_start_time");
        var end_time = getSearchTime("danger_end_data","danger_end_time");
    }
    if(start_time > end_time){
        HG_MESSAGE('开始时间不能大于结束时间！');
        return;
    }
    if(JSON.stringify(DANGER_TIME_OBJ) == "{}"){
        var time_json = [""];
        var day_json = [""];
    }else {
        var time_json = [];
        for(var i in DANGER_TIME_OBJ){
            time_json.push(DANGER_TIME_OBJ[i]);
        }
        var day_json = [];
        if($("#danger_every_day")[0].checked == true){
            day_json = [0,1,2,3,4,5,6];
        }else {
            var btn = $("#danger_week_select").find(".btn-blue");
            for (var i = 0; i < btn.length; i++) {
                day_json.push($(btn[i]).data("value"));
            }
        }
        if(day_json.length <=0 ){
            HG_MESSAGE("循环日期不能为空");
            return;
        }
    }
    var text = $('#danger_right_side h4').text();
    if(text == '新增危险源'){
        HG_AJAX('/position_sdk/ModularArea/Dynamic/addDynamic',{
            rule_name:name,
            name:name,
            radius:radius,
            is_use:status,
            card_id:card,
            start_time:start_time,
            end_time:end_time,
            card_ids:card_ids,
            day_json:day_json,
            comment:comment,
            time_json:time_json,
            type:10
        },'post',function (data){
            if(data.type == 1){
                HG_MESSAGE('新增成功！');
                getDanger();
                getDangerCount();
                $("#danger_right_side").modal("hide");
            }else{
                HG_MESSAGE(data.result);
            }
        })
    }else if(text == '修改危险源'){
        HG_AJAX('/position_sdk/ModularArea/Dynamic/updateDynamic',{
            id:DANGER_THIS_DATA_ID,
            rule_name:name,
            name:name,
            radius:radius,
            card_id:card,
            is_use:status,
            start_time:start_time,
            end_time:end_time,
            card_ids:card_ids,
            day_json:day_json,
            comment:comment,
            time_json:time_json,
            type:10,
            alarm_rule_id:ALL_DANGER_INFO[DANGER_THIS_DATA_ID].alarm_rule_id
        },'post',function (data) {
            if(data.type == 1){
                HG_MESSAGE('修改成功！');
                getDanger();
                getDangerCount();
                $("#danger_right_side").modal("hide");
            }else{
                HG_MESSAGE(data.result);
            }
        })
    }
});

/*
 危险源设置的删除按钮
*/
$('#danger_table tbody').on('click','.glyphicon-trash',function () {
    DANGER_THIS_DATA_ID = $(this).data('id');
    $("#modal_delete_danger").modal('show');
});

/*
 确认删除
*/
$('#confirm_delete_danger').click(function () {
    HG_AJAX('/position_sdk/ModularArea/Dynamic/deleteDynamic',{id:DANGER_THIS_DATA_ID,type:10},'post',function (data) {
        if(data.type == 1){
            $("#modal_delete_danger").modal('hide');
            HG_MESSAGE('删除成功！');
            getDanger();
            getDangerCount();
        }else{
            HG_MESSAGE(data.result);
        }
    })
});






