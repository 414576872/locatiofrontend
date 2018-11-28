var NOW_PAGE = 1;//页码，初始化为1
var LIMIT = 50;//每页数据量，初始化为50
var TOTAL_PAGE;//总页数，由后端请求确定
var TIME_START;//开始时间
var TIME_END;//结束时间
var STATUS;//欠压信息状态
var LIST = [];//存储欠压数据的数组
var EDIT_ID;//修改的某一条欠压信息的id

/*
 欠压表格中的数据总数，分页用
*/
function count() {
    HG_AJAX("/position_sdk/ModularAlarm/Alarm/getPowerCount", {
        start: TIME_START,
        end: TIME_END,
        status: STATUS
    }, "post",function (data) {
        if (data.type == 1) {
            var result = data.result;
            TOTAL_PAGE = Math.ceil(result / LIMIT);
            getPage();
        } else {
            HG_MESSAGE("获取数据失败");
        }
    });
}

/*
 欠压表格中的数据获取方法
*/
function get () {
    HG_AJAX("/position_sdk/ModularAlarm/Alarm/getPower", {
        start: TIME_START,
        end: TIME_END,
        status: STATUS,
        page: NOW_PAGE,
        limit: LIMIT
    }, "post",function (data) {
        if (data.type == 1) {
            var result = data.result;
            var html = "";
            $(result).each(function (index) {
                LIST[this.id] = {
                    status: this.status,
                    comment: this.comment
                };
                html += "<tr>" +
                    "<td>" + (index + 1  + ((NOW_PAGE - 1 ) * LIMIT)) + "</td>" +
                    "<td>" + this.card_id + "</td>" +
                    "<td>" + unixToDate(this.time) + "</td>" +
                    "<td>" + this.alarm_info + "</td>" +
                    "<td>" + checkStatus(this.status) + "</td>" +
                    "<td>" + this.comment + "</td>" +
                    "<td>" +
                    "<i class='glyphicon glyphicon-edit table_lower_power_edit' data-id='" + this.id + "'></i>" +
                    "</td>" +
                    "</tr>";
            });
            $("#table_lower_power").html(html);
        } else {
            HG_MESSAGE("获取数据失败");
        }
    });
}

/*
 欠压表格中的分页方法
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
    count();
    get();
});

/*
 查询按钮
*/
$("#query_lower_power").click(function () {
    NOW_PAGE = 1;
    TIME_START = getSearchStartTimeStamp();
    TIME_END = getSearchEndTimeStamp();
    STATUS = $("#status_lower_power").val();
    if (STATUS == "all") {
        STATUS = undefined;
    }
    count();
    get();
});

/*
 欠压表格中的编辑按钮
*/
$("#table_lower_power").on("click", ".table_lower_power_edit", function () {
    $("#modal_lower_power_edit").modal("show");
    EDIT_ID = $(this).data("id");
    var status = LIST[EDIT_ID].status;
    var comment = LIST[EDIT_ID].comment;
    $("#modal_lower_power_status").val(status);
    $("#modal_lower_power_comment").val(comment);
});

/*
 欠压表格编辑按钮弹窗的保存按钮
*/
$("#modal_lower_power_save").click(function () {
    var status = $("#modal_lower_power_status").val();
    var comment = $("#modal_lower_power_comment").val();
    HG_AJAX("/position_sdk/ModularAlarm/Alarm/updatePower",
        {id: EDIT_ID, status: status, comment: comment},
        "post",function (data) {
            if (data.type == 1) {
                count();
                get();
            } else {
                HG_MESSAGE("修改失败");
            }
        });
});