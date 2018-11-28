var NOW_PAGE = 1; //页码，初始化为1
var LIMIT = 50;  //每页数据量，初始化为50
var TOTAL_PAGE; //总页数，由后端请求确定
var RULE_DATA = {};//存储规则数据的对象
var ID = "";//修改规则时的全局id
var TIME_OBJ = {};//存储重复时间段的对象

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
 获取所有卡号,用于规则设置
*/
function getCard(id) {
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
            $("#list_area_card_add").html(list); //写入添加区域的权限卡号列表
            var check_flag = 0;
            if(id && RULE_DATA[id].card_ids){
                for (var i in RULE_DATA[id].card_ids){
                    $("#list_area_card_add input[data-id=" + RULE_DATA[id].card_ids[i] + "]")[0].checked = true;
                    check_flag++;
                }
            }
            if (check_flag == 0){
                $("#area_card_all_add")[0].checked = false;
            }else if(check_flag == result.length) {
                $("#area_card_all_add")[0].checked = true;
            } else {
                $("#area_card_all_add")[0].checked = false;
            }
        } else {
            HG_MESSAGE(data.result);
        }
    });
}

/*
 分页函数
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
                getAllRule();
            }
        }
    });
}

/*
 得到规则数量，用于分页
*/
function getCount() {
    var start_time = getSearchTime("search_start_data","search_start_time");
    var end_time = getSearchTime("search_end_data","search_end_time");
    var rule_name = checkInputNull($("#search_rule_name").val());
    var rule_type = checkTypeNull($("#search_rule_type").val());
    HG_AJAX("/position_sdk/ModularAlarmRule/AlarmRule/getCount", {
        name: rule_name,
        type: rule_type,
        start: start_time,
        end: end_time
    }, "post",function (data) {
        if (data.type == 1) {
            var result = data.result;
            TOTAL_PAGE = Math.ceil(result / LIMIT);
            if (TOTAL_PAGE < NOW_PAGE) {
                NOW_PAGE = TOTAL_PAGE;
                getAllRule();
            }
            getPage();
        } else {
            HG_MESSAGE(data.result);
        }
    });
}

/*
 规则类型值与字符串的转换
*/
function checkTypeNull(value) {
    if (value == '') {
        return [1,2,3,4,5,6,7,8];
    } else {
        return [value];
    }
}

/*
 得到所有规则数据
*/
function getAllRule() {
    var start_time = getSearchTime("search_start_data","search_start_time");
    var end_time = getSearchTime("search_end_data","search_end_time");
    var rule_name = checkInputNull($("#search_rule_name").val());
    var rule_type = checkTypeNull($("#search_rule_type").val());
    HG_AJAX("/position_sdk/ModularAlarmRule/AlarmRule/getAlarmRule",{
        name: rule_name,
        type: rule_type,
        start_time: start_time,
        end_time:end_time,
        page:NOW_PAGE,
        limit:LIMIT
    },'post',function (data) {
        if (data.type == 1) {
            var result = data.result;
            var html = "";
            if(NOW_PAGE == 0){
                NOW_PAGE = 1;
            }
            $(result).each(function (index) {
                RULE_DATA[this.id] = this;
                html += "<tr>" +
                    "<td>" + (index + 1  + ((NOW_PAGE - 1 ) * LIMIT)) + "</td>" +
                    "<td>" + this.name + "</td>" +
                    "<td>" + checkType(this.type) + "</td>" +
                    "<td>" + checkTimeNull(this.start_time,this.end_time) + "</td>" +
                    "<td>" + checkNull(this.comment) + "</td>" +
                    "<td>" +
                    "<i class='glyphicon glyphicon-edit' data-id='" + this.id + "'></i>" +
                    "<i class='glyphicon glyphicon-trash' data-id='" + this.id + "'></i>" +
                    "</td>" +
                    "</tr>";
            });
            $("#table_rule").html(html);
        } else {
            HG_MESSAGE(data.result);
        }
    });
}

/*
 初始执行
*/
$(function () {
    //初始化时间输入控件
    initDayTime("search_start_data","search_end_data");
    initDateTime("search_start_time","search_end_time","search_start_data","search_end_data");
    getCount();
    getAllRule();
});

/*
 查询按钮
*/
$("#query_rule").click(function () {
    getCount();
    getAllRule();
});

/*
 点击新增规则，显示模态框
*/
$("#add_rule").click(function () {
    initDayTime("start_data","end_data");
    initDateTime("start_time","end_time","start_data","end_data");
    $("#input_static_time").hide();
    $("#input_over_time").hide();
    $("#input_over_man").hide();
    $("#input_area_card").hide();
    $("#input_card_all").show();
    $("#add_text").show();
    $("#edit_text").hide();
    $("#save_rule").show();
    $("#edit_rule").hide();
    $("#add_rule_type").val("1");
    $("#card_all").val("1");
    $("#select_rule_is_use").val("1");
    $("#add_rule_name").val("");
    $("#add_comment").val("");
    $("#valid_time")[0].checked = true;
    $("#time_input").hide();
    $("#time_list").html("");
    TIME_OBJ = {};
    $("#repeat_week").hide();
    $("#show_time_select").hide();
    $("#every_day")[0].checked = true;
    $("#week_select").find(".btn").removeClass("btn-default").addClass("btn-blue");
    $("#week_select").hide();
    $("#modal_add_rule").modal("show");
});

/*
 选择规则报警类型，当类型为超时、不动、聚众时显示出相应的输入框
*/
$("#add_rule_type").change(function () {
    $("#input_static_time").hide();
    $("#input_over_time").hide();
    $("#input_over_man").hide();
    $("#input_area_card").hide();
    $("#card_all").val("1");
    $("#input_card_all").show();
    if($(this).val() == "5"){
        $("#input_over_time").show();
        $("#add_over_time").val("");
    }else if($(this).val() == "6"){
        $("#input_static_time").show();
        $("#add_static_time").val("");
    }else if($(this).val() == "8"){
        $("#input_over_man").show();
        $("#add_over_man").val("");
        $("#add_over_area").val("");
        $("#card_all").val("1");
        $("#input_area_card").hide();
    }
});

/*
 选择是否用于所有卡号
*/
$("#card_all").change(function () {
    if($(this).val() == "1"){
        $("#input_area_card").hide();
    }else {
        getCard("");
        $("#input_area_card").show();
    }
});

/*
 全选卡号按钮
*/
$("#area_card_all_add").click(function () {
    var all_card = $("#list_area_card_add").find("input");
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
$("#list_area_card_add").on("click", "input", function () {
    var check_flag = 0;
    var input = $("#list_area_card_add").find("input");
    for (var i = 0; i < input.length; i++) {
        if ($(input[i])[0].checked == true) {
            check_flag++;
        }
    }
    if (check_flag == input.length) {
        $("#area_card_all_add")[0].checked = true;
    } else {
        $("#area_card_all_add")[0].checked = false;
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
 点击保存按钮，保存新增规则
*/
$("#save_rule").click(function () {
   var rule_name = $("#add_rule_name").val();
   if(!rule_name){
       HG_MESSAGE("名称不能为空");
       return;
   }
   var rule_type = $("#add_rule_type").val();
   if (rule_type == "5"){
       var data = parseFloat($("#add_over_time").val())*60;
       if(!data || data< 0 || isNaN($("#add_over_time").val())){
           HG_MESSAGE("请填写正确的报警时间");
           return;
       }
   }else if(rule_type == "6"){
       var data = parseFloat($("#add_static_time").val())*60;
       if(!data || data< 0 || isNaN($("#add_static_time").val())){
           HG_MESSAGE("请填写正确的报警时间");
           return;
       }
   }else if(rule_type == "8"){
       var man = parseFloat($("#add_over_man").val());
       var area = parseFloat($("#add_over_area").val());
       if(!man || !area || man < 0 || area < 0 || isNaN($("#add_over_man").val()) || isNaN($("#add_over_area").val()) || (parseInt($("#add_over_man").val()) != man)){
           HG_MESSAGE("请填写正确的聚众报警参数");
           return;
       }
       var data = parseFloat($("#add_over_man").val())/parseFloat($("#add_over_area").val());
       var special_json = JSON.stringify({area:$("#add_over_area").val(),man:$("#add_over_man").val()});
   }else {
       var data = undefined;
       var special_json = undefined;
   }
   var card_all = $("#card_all").val();
    if (card_all == "1") {
       var card_id = [""];
    } else {
        var card_id = [];
        var list = $("#list_area_card_add").find("input");
        $(list).each(function () {
            if ($(this)[0].checked) {
                card_id.push($(this).data("id"));
            }
        });
        if(card_id.length == 0){
            card_id = [""];
        }
    }
    if($("#valid_time")[0].checked){
        var start_time = 0;
        var end_time = 0;
    }else {
        var start_time = getSearchTime("start_data","start_time");
        var end_time = getSearchTime("end_data","end_time");
    }
    if(start_time>end_time){
        HG_MESSAGE("开始时间不能大于结束时间");
        return;
    }
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
    var is_use = $("#select_rule_is_use").val();
    var comment = $("#add_comment").val();
    HG_AJAX("/position_sdk/ModularAlarmRule/AlarmRule/addAlarmRule",{
        name: rule_name,
        type: rule_type,
        card_all: card_all,
        data: data,
        start_time: start_time,
        end_time:end_time,
        comment:comment,
        card_ids:card_id,
        is_use:is_use,
        special_json:special_json,
        time_json:time_json,
        day_json:day_json
    },'post',function (data) {
        if (data.type == 1) {
            HG_MESSAGE("添加成功");
        } else {
            HG_MESSAGE(data.result);
        }
        getCount();
        getAllRule();
        $("#modal_add_rule").modal("hide");
    });
});

/*
 点击修改规则，显示修改模态框
*/
$("#table_rule").on("click",".glyphicon-edit",function () {
    initDayTime("start_data","end_data");
    initDateTime("start_time","end_time","start_data","end_data");
    ID = $(this).data("id");
    $("#add_text").hide();
    $("#edit_text").show();
    $("#save_rule").hide();
    $("#edit_rule").show();
    $("#input_static_time").hide();
    $("#input_over_time").hide();
    $("#input_over_man").hide();
    $("#input_card_all").show();
    $("#show_time_select").hide();
    $("#add_rule_name").val(RULE_DATA[ID].name);
    $("#add_rule_type").val(RULE_DATA[ID].type);
    if (RULE_DATA[ID].type == "5"){
        $("#add_over_time").val(parseFloat(RULE_DATA[ID].data)/60);
        $("#input_over_time").show();
    }else if(RULE_DATA[ID].type == "6"){
        $("#add_static_time").val(parseFloat(RULE_DATA[ID].data)/60);
        $("#input_static_time").show();
    }else if(RULE_DATA[ID].type == "8"){
        var special_json = JSON.parse(RULE_DATA[ID].special_json);
        $("#add_over_man").val(special_json.man);
        $("#add_over_area").val(special_json.area);
        $("#input_over_man").show();
        $("#card_all").val("1");
        $("#input_area_card").hide();
    }
    $("#card_all").val(RULE_DATA[ID].card_all);
    if(RULE_DATA[ID].card_all == "1"){
        $("#input_area_card").hide();
    }else {
        getCard(ID);
        $("#input_area_card").show();
    }
    if(RULE_DATA[ID].start_time == "0" || RULE_DATA[ID].end_time == "0"){
        $("#valid_time")[0].checked = true;
        $("#time_input").hide();
    }else {
        $("#valid_time")[0].checked = false;
        $("#start_data").val(transTimeStampToString(RULE_DATA[ID].start_time,2));
        $("#start_time").val(transTimeStampToString(RULE_DATA[ID].start_time));
        $("#start_time").datetimepicker('setStartDate',$("#start_data").val());
        $("#end_data").val(transTimeStampToString(RULE_DATA[ID].end_time,2));
        $("#end_time").val(transTimeStampToString(RULE_DATA[ID].end_time));
        $("#end_time").datetimepicker('setStartDate',$("#end_data").val());
        $("#time_input").show();
    }
    $("#time_list").html("");
    TIME_OBJ = {};
    if(RULE_DATA[ID].time_json){
        var time_json = JSON.parse(RULE_DATA[ID].time_json);
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
        var day_json = JSON.parse(RULE_DATA[ID].day_json);
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
    $("#select_rule_is_use").val(RULE_DATA[ID].is_use);
    $("#add_comment").val(RULE_DATA[ID].comment);
    $("#modal_add_rule").modal("show");
});

/*
 点击保存，保存修改规则
*/
$("#edit_rule").click(function () {
    var rule_name = $("#add_rule_name").val();
    if(!rule_name){
        HG_MESSAGE("名称不能为空");
        return;
    }
    var rule_type = $("#add_rule_type").val();
    if (rule_type == "5"){
        var data = parseFloat($("#add_over_time").val())*60;
    }else if(rule_type == "6"){
        var data = parseFloat($("#add_static_time").val())*60;
    }else if(rule_type == "8"){
        if((!$("#add_over_man").val()) || (!$("#add_over_area").val()) || (parseFloat($("#add_over_man").val()) <= 0) || (parseFloat($("#add_over_area").val() <= 0))){
            HG_MESSAGE("请填写正确的聚众报警参数");
            return;
        }
        var data = parseFloat($("#add_over_man").val())/parseFloat($("#add_over_area").val());
        var special_json = JSON.stringify({area:$("#add_over_area").val(),man:$("#add_over_man").val()});
    }else {
        var data = undefined;
        var special_json = undefined;
    }
    var card_all = $("#card_all").val();
    if (card_all == "1") {
        var card_id = [""];
    } else {
        var card_id = [];
        var list = $("#list_area_card_add").find("input");
        $(list).each(function () {
            if ($(this)[0].checked) {
                card_id.push($(this).data("id"));
            }
        });
        if(card_id.length == 0){
            card_id = [""];
        }
    }
    if($("#valid_time")[0].checked){
        var start_time = 0;
        var end_time = 0;
    }else {
        var start_time = getSearchTime("start_data","start_time");
        var end_time = getSearchTime("end_data","end_time");
    }
    if(start_time>end_time){
        HG_MESSAGE("开始时间不能大于结束时间");
        return;
    }
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
    var is_use = $("#select_rule_is_use").val();
    var comment = $("#add_comment").val();
    HG_AJAX("/position_sdk/ModularAlarmRule/AlarmRule/updateAlarmRule",{
        id:ID,
        name: rule_name,
        type: rule_type,
        card_all: card_all,
        data: data,
        start_time: start_time,
        end_time:end_time,
        comment:comment,
        card_ids:card_id,
        is_use:is_use,
        special_json:special_json,
        time_json:time_json,
        day_json:day_json
    },'post',function (data) {
        if (data.type == 1) {
            HG_MESSAGE("修改成功");
        } else {
            HG_MESSAGE(data.result);
        }
        getCount();
        getAllRule();
        $("#modal_add_rule").modal("hide");
    });
});

/*
 点击删除规则，显示删除模态框
*/
$("#table_rule").on("click",".glyphicon-trash",function () {
    ID = $(this).data("id");
    $("#modal_delete_rule").modal("show");
});

/*
 点击确定，确定删除
*/
$("#delete_rule").click(function () {
    HG_AJAX("/position_sdk/ModularAlarmRule/AlarmRule/deleteAlarmRule",{
        id:ID
    },'post',function (data) {
        if (data.type == 1) {
            HG_MESSAGE("删除成功");
        } else {
            HG_MESSAGE(data.result);
        }
        getCount();
        getAllRule();
        $("#modal_delete_rule").modal("hide");
    });
});