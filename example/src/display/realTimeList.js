var FLOOR_ID; //楼层id
var AREA_ID = undefined; //区域id,默认不向后台发送
var BLIND = undefined; //是否盲区,默认不向后台发送
var FIRST = true;  //加载完成时自动初始化
var NOW_PAGE = 1;  //地图分页的当前页
var LIMIT = 50;    //地图分页每页显示数量
var TOTAL_PAGE = 0;//地图分页总页数

/*
 盲区id好转化为字符串
*/
function transBlind(id) {
    switch (id) {
        case true :
            return "盲区";
            break;
        case false:
            return "非盲区";
            break;
    }
}

/*
 获得所有场景、建筑、楼层
*/
function getAllFloor() {
    HG_AJAX("/position_sdk/ModularFloor/Floor/getAllFloorInfo",{},"post",function (data) {
        if (data.type == 1) {
            var scene_data = data.result;
            var options = "";
            for (var i in scene_data){
                if(scene_data[i]){
                    var building_data = scene_data[i].node;
                    if(building_data.length>0){
                        for(var j in building_data){
                            var floor_data = building_data[j].node;
                            if(floor_data.length>0){
                                for (var k in floor_data){
                                    options+="<option value='"+floor_data[k].id+"' data-toggle='tooltip' data-placement='top' title='"+scene_data[i].name+"-"+building_data[j].name+"-"+floor_data[k].name+"'>"+floorStringSlice(scene_data[i].name+"-"+building_data[j].name+"-"+floor_data[k].name)+"</option>";
                                }
                            }
                        }
                    }
                }
            }
            $("#floor_select").html(options);
            FLOOR_ID = $("#floor_select").val();
            getArea();
        }
    });
}

/*
 获取所有区域
*/
function getArea() {
     if(FLOOR_ID == "" || FLOOR_ID == null){
        $("#select_area").html("").change();
        return;
    }
    ALL_ZONE = {};
    HG_AJAX("/position_sdk/ModularArea/Area/getArea", {
        floor_id: FLOOR_ID
    },"post",function (data) {
        if (data.type == 1) {
            var result = data.result;
            var option = "<option value='all'>全部</option>";
            $(result).each(function () {
                option += "<option value='" + this.id + "'>" + this.name + "</option>";
            });
            $("#select_area").html(option).change();
        } else {
            HG_MESSAGE("获取区域失败");
        }
    });
}

/*
 获取信息总数
*/
function getCount() {
     if(FLOOR_ID == null){
        return;
    }
    HG_AJAX("/position_sdk/ModularNowInfo/NowInfo/getNowInfo", {
        floor_id: FLOOR_ID,
        area_id: AREA_ID,
        blind: BLIND,
        limit: 1
    }, "post",function (data) {
        if (data.type == 1) {
            var count = data.result.count;
            TOTAL_PAGE = Math.ceil(count / LIMIT);
            if (TOTAL_PAGE < NOW_PAGE) {
                NOW_PAGE = TOTAL_PAGE;
                getNowInfo();
            }
            getPage();
        }
    });
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
                getNowInfo();
            }
        }
    });
}

/*
 获取实时信息
*/
function getNowInfo() {
    if(FLOOR_ID == null){
        $("#table_now_info").html("");
        return;
    }
    HG_AJAX("/position_sdk/ModularNowInfo/NowInfo/getNowInfo", {
        floor_id: FLOOR_ID,
        area_id: AREA_ID,
        blind: BLIND,
        limit: LIMIT,
        page: NOW_PAGE
    }, "post",function (data) {
        if (data.type == 1) {
            var result = data.result.data;
            var html = "";
            if(NOW_PAGE == 0){
                NOW_PAGE = 1;
            }
            $(result).each(function (index) {
                html += "<tr>" +
                    "<td>" + (index + 1  + ((NOW_PAGE - 1 ) * LIMIT)) + "</td>" +
                    "<td>" + this.card_id + "</td>" +
                    "<td>X：" + parseFloat(this.x).toFixed(2) + "，Y：" + parseFloat(this.y).toFixed(2) + "，Z：" + parseFloat(this.card_relative_z).toFixed(2) +"</td>" +
                    "<td>" + transBlind(this.blind) + "</td>" +
                    "<td><i class='glyphicon glyphicon-earphone' data-id='" + this.card_id + "'></i></td></tr>"
            });
            $("#table_now_info").html(html);
        }else {
            $("#table_now_info").html("");
        }
    });
}

/*
 初始执行
*/
$(function () {
    getAllFloor();
    setInterval(function () {
        getCount();
        getNowInfo();
    }, 4000);
});

/*
 地图切换的时候,获取区域选单
*/
$("#floor_select").change(function () {
    FLOOR_ID = $(this).val();
    getArea();
});


/*
 区域切换的时候,获取实时信息总数和实时信息
*/
$("#select_area").change(function () {
    NOW_PAGE = 1;
    AREA_ID = $(this).val();
    if (AREA_ID == "all") {
        AREA_ID = undefined;
    }
    if (FIRST) {
        getCount();
        getNowInfo();
        FIRST = false;
    }
});

/*
 盲区切换的时候
*/
$("#blind_area").change(function () {
    NOW_PAGE = 1;
    BLIND = $(this).val();
});

/*
 点击查询按钮,重置轮询时间,获取信息
*/
$("#button_list_query").click(function () {
    NOW_PAGE = 1;
    getCount();
    getNowInfo();
});

/*
 点击表格每行的呼叫图标,发送呼叫
*/
$("#table_now_info").on("click", "i", function () {
    var id = $(this).data("id");
    HG_AJAX("/position_sdk/ModularNowInfo/NowInfo/callCardList", {card_list: [id]},"post",function (data) {
        if (data.type == 1) {
            HG_MESSAGE("卡号:" + id + "已下发");
        } else {
            HG_MESSAGE(data.result);
        }
    });
});