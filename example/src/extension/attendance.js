var ALL_AREA = [];  //所有区域
var NOW_PAGE = 1; //页码，初始化为1
var TOTAL_PAGE;   //总页数，由后端方法确定
var LIMIT = 50;

/*
 初始化日期的函数方法
*/
initDataInput();

/*
 分页方法
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
                getAttendance();
            }
        }
    });
}

/*
 获取所有区域
*/
(function getAllArea() {
    HG_AJAX("/position_sdk/ModularArea/Area/getArea",{},'post',function (data) {
        if(data.type == 1){
            var result = data.result;
            var option = "<option value=''>全部</option>";
            for(var i in result){
                var id = result[i].id,name = result[i].name;
                var obj = {
                    id:id,
                    name:name
                };
                ALL_AREA[id] = obj;
                option += "<option value='" + result[i].id + "'>" + result[i].name + "</option>";
            }
            $("#select_area").html(option).change();
            getAttendance();
        }else{
            HG_MESSAGE("获取区域失败");
        }
    });
})();

/*
 向后端请求考勤报表数据的方法
*/
function getAttendance() {
    var start = checkInputNull($(".search_start_data").val()) == 'undefined' ? 'undefined' : getSearchStartDayStamp();
    var end = checkInputNull($(".search_end_data").val()) == 'undefined' ? 'undefined' : getSearchEndDayStamp();
    var card = checkInputNull($("#search_card").val());
    var area_id = checkInputNull($("#select_area").val());
    HG_AJAX('/position_sdk/ModularHistory/History/getAreaCardRecord',{
        page: NOW_PAGE,
        limit: LIMIT,
        start_time: start,
        end_time: end,
        card_id: card,
        area_id:area_id
    },'post',function (data) {
        if (data.type == 1) {
            var data = data.result, html = '', TableData = data.data;
            TOTAL_PAGE = Math.ceil(data.count / 50);
            if (NOW_PAGE < 2) {
                getPage();
            }
            for (var i in TableData) {
                var data = TableData[i];
                html += '<tr><td>' + (parseInt(i) + 1 + ((NOW_PAGE - 1 ) * LIMIT)) + '</td>' +
                    '<td>' + data.card_id + '</td>' +
                    '<td>' + checkArea(data.area_id) + '</td>' +
                    '<td>' + unixToDate(data.start_time) + '</td>' +
                    '<td>' + unixToDate(data.end_time) + '<td></tr>';
            }
            $('#table_attendance_content').html(html);
        } else {
            HG_MESSAGE(data.message);
        }
    });
}

/*
 获取区域信息
*/
function checkArea(id) {
    if(ALL_AREA[id]){
        return ALL_AREA[id].name
    }
    return "区域不明"
}

/*
 查询按钮点击
*/
$("#query_attendance_data").click(function () {
    getAttendance();
});
