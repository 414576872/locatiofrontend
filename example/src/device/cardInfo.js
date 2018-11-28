var CARD_INFO_LIST = [];//存储卡号数据的数组
var EDIT_ID;//修改某一条卡号信息的id
var NOW_PAGE = 1;//页码，初始化为1
var LIMIT = 50;//每页数量，初始化为50
var TOTAL_PAGE;// 总页数，后端方法确定

/*
 获取总数，用于分页
*/
function count() {
    HG_AJAX("/position_sdk/ModularCard/Card/getCount",{},"post",function (data) {
        if (data.type == 1) {
            var result = data.result;
            TOTAL_PAGE = Math.ceil(result / LIMIT);
            if (TOTAL_PAGE < NOW_PAGE) {
                NOW_PAGE = TOTAL_PAGE;
                select();
            }
            getPage();
        } else {
            HG_MESSAGE("获取数据最失败");
        }
    });
}

/*
 获取表格数据的方法
*/
function select() {
    $('.table_div').scrollTop(0);
    HG_AJAX("/position_sdk/ModularCard/Card/getCard", {
        limit: LIMIT,
        page: NOW_PAGE
    }, "post",function (data) {
        if (data.type == 1) {
            var result = data.result;
            var html = "";
            $(result).each(function (index) {
                CARD_INFO_LIST[this.id] = {
                    card: this.card_id,
                    comment: this.comment,
                    uuid:this.uuid
                };
                html += "<tr>" +
                    "<td>" + (index + 1  + ((NOW_PAGE - 1 ) * LIMIT)) + "</td>" +
                    "<td>" + this.card_id + "</td>" +
                    "<td>" + this.uuid + "</td>" +
                    "<td>" + this.comment + "</td>" +
                    "<td>" +
                    "<i class='glyphicon glyphicon-edit table_card_info_edit' data-id='" + this.id + "'></i>" +
                    "<i class='glyphicon glyphicon-trash table_card_info_delete' data-id='" + this.id + "'></i>" +
                    "</td>" +
                    "</tr>";
            });
            $("#table_card_info").html(html);
        } else {
            HG_MESSAGE("获取数据失败");
        }
    });
}

/*
 分页方法
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
                select();
            }
        }
    });
}

/*
 初始执行
*/
$(function () {
    count();
    select();
});

/*
 修改按钮点击
*/
$("#table_card_info").on("click", ".table_card_info_edit", function () {
    $("#modal_card_edit").modal("show");
    EDIT_ID = $(this).data("id");
    var card = CARD_INFO_LIST[EDIT_ID].card;
    var comment = CARD_INFO_LIST[EDIT_ID].comment;
    var id = CARD_INFO_LIST[EDIT_ID].uuid;
    $("#modal_card_edit_card").val(card);
    $("#modal_card_edit_id").val(id);
    $("#modal_card_edit_comment").val(comment);
});

/*
 删除按钮点击
*/
$("#table_card_info").on("click", ".table_card_info_delete", function () {
    EDIT_ID = $(this).data("id");
    $("#modal_card_delete").modal("show");
});

/*
 新增的确认保存的方法
*/
$("#modal_card_add_save").click(function () {
    var card = $("#modal_card_add_card").val();
    var comment = $("#modal_card_add_comment").val();
    HG_AJAX("/position_sdk/ModularCard/Card/addCard",{
        card_id: card,
        comment: comment
    }, "post",function (data) {
        if (data.type == 1) {
            $("#modal_card_add_card").val("");
            $("#modal_card_add_comment").val("");
            count();
            select();
        } else {
            HG_MESSAGE("添加卡号失败");
        }
    });
});

/*
 修改后确认保存的方法
*/
$("#modal_card_edit_save").click(function () {
    var card = $("#modal_card_edit_card").val();
    var comment = $("#modal_card_edit_comment").val();
    HG_AJAX("/position_sdk/ModularCard/Card/updateCard", {
        id: EDIT_ID,
        card_id: card,
        comment: comment
    }, "post",function (data) {
        if (data.type == 1) {
            count();
            select();
        } else {
            HG_MESSAGE("添加卡号失败");
        }
    });
});

/*
 确认删除的方法
*/
$("#modal_card_delete_ensure").click(function () {
    HG_AJAX("/position_sdk/ModularCard/Card/deleteCard", {id: EDIT_ID}, "post",function (data) {
        if (data.type == 1) {
            count();
            select();
        } else {
            HG_MESSAGE(" 删除卡号失败");
        }
    });
});


