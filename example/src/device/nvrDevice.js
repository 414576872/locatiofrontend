var NVR_DATA = {};//存储所有的NVR数据
var NOW_PAGE = 1;//分页的当前页
var LIMIT =50;//分页每页显示数量
var TOTAL_PAGE;//分页总页数
var HANDLE_ID;//当前正在编辑的NVR的ID
var CAMERA_DATA = {};//存储所有已添加的摄像头数据
var CHAN_DATA;//存储NVR里搜索到的摄像头数据

/*
 NVR的类型值与字符串的转换
*/
function typeString(value) {
    if(value == "1"){
        return "海康";
    }else if (value == "2"){
        return "大华";
    }
}

/*
 查询是否有已添加的摄像头
*/
function checkCameraName(id) {
    if(!id){
        return "--";
    }else {
        return CAMERA_DATA[id].name;
    }
}

/*
 映射关系值与字符串的转换
*/
function checkStatus(value) {
    if(value == "0"){
        return "关系不匹配";
    }else if(value == "1") {
        return "正常";
    }else {
        return "摄像机不存在";
    }
}

/*
 获取所有已添加的摄像头信息
*/
function getAllCamera() {
    HG_AJAX("/position_sdk/ModularVideo/Equip/getEquip",{},"post",function (data) {
        if(data.type == 1){
            var data = data.result;
            for (var i in data){
                CAMERA_DATA[data[i].id] = data[i];
            }
        }
    })
}

/*
 分页函数
*/
function getPage() {
    laypage({
        cont: 'pages', //容器。值支持id名、原生dom对象，jquery对象。【如该容器为】：<div id="page1"></div>
        pages: TOTAL_PAGE, //通过后台拿到的总页数
        curr: NOW_PAGE, //初始化当前页
        skin: '#4ba9dc',//皮肤颜色
        groups:5, //连续显示分页数
        skip: true, //是否开启跳页
        first: '首页', //若不显示，设置false即可
        last: '尾页', //若不显示，设置false即可
        prev: '上一页', //若不显示，设置false即可
        next: '下一页', //若不显示，设置false即可
        jump: function (obj, first) { //触发分页后的回调
            if (!first) {
                NOW_PAGE = obj.curr;
                getNvrInfo();
            }
        }
    });
}

/*
 得到NVR列表分页总数
*/
function getCount() {
    HG_AJAX("/position_sdk/ModularVideo/Equip/getNVRCount",{},"post", function (data) {
        if (data.type == 1) {
            var result = data.result;
            TOTAL_PAGE = Math.ceil(result / LIMIT);
            if (TOTAL_PAGE < NOW_PAGE) {
                NOW_PAGE = TOTAL_PAGE;
                getNvrInfo();
            }
            getPage();
        } else {
            HG_MESSAGE(data.result);
        }
    });
}

/*
 NVR列表获取信息
*/
function getNvrInfo() {
    HG_AJAX("/position_sdk/ModularVideo/Equip/getNVR",{
        page:NOW_PAGE,
        limit:LIMIT
    },"post",function (data) {
        if(data.type == 1){
            var data = data.result;
            var html = '';
            if(NOW_PAGE == 0){
                NOW_PAGE = 1;
            }
            $(data).each(function (index,ele) {
                NVR_DATA[this.id] = this;
                html+= "<tr><td>"+(index + 1  + ((NOW_PAGE  - 1 ) * LIMIT))+"</td>" +
                    "<td>"+this.name+"</td>" +
                    "<td>"+this.ip+"</td>" +
                    "<td>"+this.port+"</td>" +
                    "<td>"+typeString(this.type)+"</td>" +
                    "<td>"+checkNull(this.model)+"</td>" +
                    "<td>"+checkNull(this.sn)+"</td>" +
                    "<td data-id="+this.id+"><i class='glyphicon glyphicon-edit edit'></i><i class='glyphicon glyphicon-trash del'></i><i class='glyphicon glyphicon-search search'></i></td></tr>";
            });
            $("#tbody").html(html);
        }
    })
}

getCount();
getNvrInfo();
getAllCamera();

/*
 点击新增按钮，弹出新增NVR模态框
*/
$("#btn_add").click(function () {
    //清空输入框的值
    $("#new_nvr_name").val(null);
    $("#new_nvr_ip").val(null);
    $("#new_nvr_port").val(null);
    $("#new_nvr_type").val(1);
    $("#new_nvr_user").val(null);
    $("#new_nvr_password").val(null);
    $("#online_text").html("");
    $("#new_nvr_model input").val("");
    $("#new_nvr_model").hide();
    $("#new_nvr_sn input").val("");
    $("#new_nvr_sn").hide();
    $("#add_text").show();
    $("#edit_text").hide();
    $("#sure_add").show();
    $("#sure_edit").hide();
    $("#modal_set").modal("show");
});

/*
 点击模态框确定按钮，确定新增NVR
*/
$("#sure_add").click(function () {
    var name = $("#new_nvr_name").val(),
        ip = $("#new_nvr_ip").val(),
        port = $("#new_nvr_port").val(),
        type = $("#new_nvr_type").val(),
        user = $("#new_nvr_user").val(),
        sn = $("#new_nvr_sn input").val(),
        model = $("#new_nvr_model input").val(),
        password = $("#new_nvr_password").val();

    HG_AJAX("/position_sdk/ModularVideo/Equip/addNVR",{name:name,ip:ip,port:port,type:type,user:user,password:password,sn:sn,model:model},"post",function (data) {
        if(data.type == 1){
            getCount();
            getNvrInfo();
            $("#modal_set").modal("hide");
            HG_MESSAGE("新增成功");
        }else {
            HG_MESSAGE(data.result);
        }
    })
});

/*
 点击查询该NVR是否在线
*/
$("#search_online").click(function () {
    var ip = $("#new_nvr_ip").val(),
        port = $("#new_nvr_port").val(),
        type = $("#new_nvr_type").val(),
        user = $("#new_nvr_user").val(),
        password = $("#new_nvr_password").val();
    HG_AJAX("/position_sdk/ModularVideo/Equip/getNVRInfo",{ip:ip,port:port,type:type,user:user,password:password},"post",function (data) {
        if(data.type == 1){
            var data = data.result;
            $("#online_text").html("在线");
            $("#new_nvr_model input").val(data.model);
            $("#new_nvr_model").show();
            $("#new_nvr_sn input").val(data.sn);
            $("#new_nvr_sn").show();
        }else {
            $("#online_text").html("不在线");
            $("#new_nvr_model input").val("");
            $("#new_nvr_model").hide();
            $("#new_nvr_sn input").val("");
            $("#new_nvr_sn").hide();
        }
    })
});

/*
 点击NVR列表里的修改图标，弹出修改NVR模态框
*/
$("#tbody").on("click",".edit",function () {
    HANDLE_ID = $(this).parent().data("id");
    $("#new_nvr_name").val(NVR_DATA[HANDLE_ID].name);
    $("#new_nvr_ip").val(NVR_DATA[HANDLE_ID].ip);
    $("#new_nvr_port").val(NVR_DATA[HANDLE_ID].port);
    $("#new_nvr_type").val(NVR_DATA[HANDLE_ID].type);
    $("#new_nvr_user").val(NVR_DATA[HANDLE_ID].user);
    $("#new_nvr_password").val(NVR_DATA[HANDLE_ID].password);
    $("#online_text").html("");
    $("#new_nvr_model input").val("");
    $("#new_nvr_model").hide();
    $("#new_nvr_sn input").val("");
    $("#new_nvr_sn").hide();
    $("#add_text").hide();
    $("#edit_text").show();
    $("#sure_add").hide();
    $("#sure_edit").show();
    $("#modal_set").modal("show");
});

/*
 点击模态框确定按钮，确定修改NVR
*/
$("#sure_edit").click(function () {
    var name = $("#new_nvr_name").val(),
        ip = $("#new_nvr_ip").val(),
        port = $("#new_nvr_port").val(),
        type = $("#new_nvr_type").val(),
        user = $("#new_nvr_user").val(),
        sn = $("#new_nvr_sn input").val(),
        model = $("#new_nvr_model input").val(),
        password = $("#new_nvr_password").val();

    HG_AJAX("/position_sdk/ModularVideo/Equip/editNVR",{id:HANDLE_ID,name:name,ip:ip,port:port,type:type,user:user,password:password,sn:sn,model:model},"post",function (data) {
        if(data.type == 1){
            getCount();
            getNvrInfo();
            $("#modal_set").modal("hide");
            HG_MESSAGE("修改成功");
        }else {
            HG_MESSAGE(data.result);
        }
    })
});

/*
 点击NVR列表里的删除图标，弹出是否删除NVR模态框
*/
$("#tbody").on("click",".del",function () {
    HANDLE_ID = $(this).parent().data("id");
    $("#modal_del").modal("show");
});

/*
 点击模态框确定按钮，确定删除NVR
*/
$("#sure_del").click(function () {
    HG_AJAX("/position_sdk/ModularVideo/Equip/deleteNVR",{id:HANDLE_ID},"post",function (data) {
        if(data.type == 1){
            getCount();
            getNvrInfo();
            $("#modal_del").modal("hide");
            HG_MESSAGE("删除成功");
        }else {
            HG_MESSAGE(data.result);
        }
    })
});

/*
 点击NVR列表里的搜索图标，弹出NVR与摄像头的映射关系表的模态框
*/
$("#tbody").on("click",".search",function () {
    HANDLE_ID = $(this).parent().data("id");
    HG_AJAX("/position_sdk/ModularVideo/Equip/getNVRChanInfo",{id:HANDLE_ID},'post',function (data) {
        if(data.type == 1){
            var result = data.result;
            var html = "";
            CHAN_DATA = result;
            for(var i in result){
                html += "<tr>" +
                    "<td>" + checkCameraName(result[i].camera_id) + "</td>" +
                    "<td>" + result[i].address + "</td>" +
                    "<td>" + checkNull(result[i].port) + "</td>" +
                    "<td>" + checkNull(result[i].channel_id) + "</td>" +
                    "<td>" + checkNull(result[i].protocol) + "</td>" +
                    "<td>" + checkNull(result[i].type) + "</td>" +
                    "<td>" + checkStatus(result[i].status) + "</td>" +
                    "</tr>";
            }
            $("#show_camera_tbody").html(html);
            $("#modal_camera_info").modal("show");
        }else {
            HG_MESSAGE(data.result);
        }
    })
});

/*
 点击映射关系表模态框里的保存正确的通道信息按钮，确认保存正确的通道信息
*/
$("#save_chan_info").click(function () {
    var data = [];
    for(var i in CHAN_DATA){
        if(CHAN_DATA[i].status == "1"){
            data.push({"camera_id":CHAN_DATA[i].camera_id,"chan_id":CHAN_DATA[i].channel_id})
        }
    }
    if(data.length == 0){
        HG_MESSAGE("没有正常的通道信息");
        return;
    }
    HG_AJAX("/position_sdk/ModularVideo/Equip/editNVRCamera",{nvr_id:HANDLE_ID,data:data},"post",function (data) {
        if(data.type == 1){
            HG_MESSAGE("保存成功");
            $("#modal_camera_info").modal("hide");
        }else {
            HG_MESSAGE(data.result);
        }
    })
});

