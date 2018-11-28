var SCENE_ID;//场景id
var SCENE_DATA;//保存得到的所有的场景数据
var BUILDING_ID;//建筑id
var BELONG_SCENE_ID;//当前建筑所属的场景id
var BUILDING_DATA;//保存得到的所有的建筑数据
var NOW_PAGE_SCENE = 1;//场景分页的当前页
var LIMIT_SCENE =50;//场景分页每页显示数量
var TOTAL_PAGE_SCENE = 0;
var NOW_PAGE_BUILDING = 1;//建筑分页的当前页
var LIMIT_BUILDING = 50;//建筑分页每页显示数量
var TOTAL_PAGE_BUILDING = 0;

/*
 当新增和修改的场景、建筑的描述为0和不填时，场景列表和建筑列表的描述为空
*/
function transComment(value) {
    if(!value){
        return "";
    }else {
        return value;
    }
}

/*
 场景分页
*/
function getScenePage() {
    laypage({
        cont: 'pages_scene', //容器。值支持id名、原生dom对象，jquery对象。【如该容器为】：<div id="page1"></div>
        pages: TOTAL_PAGE_SCENE, //通过后台拿到的总页数
        curr: NOW_PAGE_SCENE, //初始化当前页
        skin: '#4ba9dc',//皮肤颜色
        groups: 5, //连续显示分页数
        skip: false, //是否开启跳页
        first: '首页', //若不显示，设置false即可
        last: '尾页', //若不显示，设置false即可
        prev: '上一页', //若不显示，设置false即可
        next: '下一页', //若不显示，设置false即可
        jump: function (obj, first) { //触发分页后的回调
            if (!first) {
                NOW_PAGE_SCENE = obj.curr;
                getAllScene();
            }
        }
    });
}

/*
 建筑分页
*/
function getBuildingPage(sceneId) {
    laypage({
        cont: 'pages_building', //容器。值支持id名、原生dom对象，jquery对象。【如该容器为】：<div id="page1"></div>
        pages: TOTAL_PAGE_BUILDING, //通过后台拿到的总页数
        curr: NOW_PAGE_BUILDING, //初始化当前页
        skin: '#4ba9dc',//皮肤颜色
        groups: 5, //连续显示分页数
        skip: false, //是否开启跳页
        first: '首页', //若不显示，设置false即可
        last: '尾页', //若不显示，设置false即可
        prev: '上一页', //若不显示，设置false即可
        next: '下一页', //若不显示，设置false即可
        jump: function (obj, first) { //触发分页后的回调
            if (!first) {
                NOW_PAGE_BUILDING = obj.curr;
                getAllBuilding(sceneId);
            }
        }
    });
}

/*
 得到场景分页总数
*/
function getSceneCount() {
    HG_AJAX("/position_sdk/ModularScene/Scene/getCount", {}, "post", function (data) {
        if (data.type == 1) {
            var result = data.result;
            TOTAL_PAGE_SCENE = Math.ceil(result / LIMIT_SCENE);
            if (TOTAL_PAGE_SCENE < NOW_PAGE_SCENE) {
                NOW_PAGE_SCENE = TOTAL_PAGE_SCENE;
                getAllScene();
            }
            getScenePage();
        } else {
            HG_MESSAGE("获取数据失败");
        }
    });
}

/*
 得到建筑分页总数
*/
function getBuildingCount(sceneId) {
    HG_AJAX("/position_sdk/ModularBuilding/Building/getCount", {scene_id:sceneId}, "post", function (data) {
        if (data.type == 1) {
            var result = data.result;
            TOTAL_PAGE_BUILDING = Math.ceil(result / LIMIT_BUILDING);
            if (TOTAL_PAGE_BUILDING < NOW_PAGE_BUILDING) {
                NOW_PAGE_BUILDING = TOTAL_PAGE_BUILDING;
                getAllBuilding(sceneId);
            }
            getBuildingPage(sceneId);
        } else {
            HG_MESSAGE("获取数据失败");
        }
    });
}

/*
 得到所有场景数据,更新场景列表
*/
function getAllScene() {
    //调用得到场景接口
    HG_AJAX("/position_sdk/ModularScene/Scene/getScene",{
        page:NOW_PAGE_SCENE,
        limit:LIMIT_SCENE
    },"post",function (data) {
        if (data.type == 1){
            var data = data.result;
            SCENE_DATA = data;
            var html = '';
            if(NOW_PAGE_SCENE == 0){
                NOW_PAGE_SCENE = 1;
            }
            $(data).each(function (index,ele) {
                html+= "<tr><td>"+(index + 1  + ((NOW_PAGE_SCENE  - 1 ) * LIMIT_SCENE))+"</td>" +
                    "<td>"+data[index].name+"</td>" +
                    "<td>"+transComment(data[index].comment)+"</td>" +
                    "<td data-id="+data[index].id+" data-index="+index+"><i class='glyphicon glyphicon-edit'></i><i class='glyphicon glyphicon-trash'></i></td></tr>";
            });
            $("#scene tbody").html(html);
        }
    });
    //调用得到场景接口，用于建筑页面下拉框
    HG_AJAX("/position_sdk/ModularScene/Scene/getScene",{},"post",function (data) {
        if (data.type == 1){
            var data = data.result;
            var option1 = '';
            var option2 = '<option value="">全部</option>';
            $(data).each(function (index,ele) {
                option1+="<option value="+data[index].id+">"+data[index].name+"</option>";
                option2+="<option value="+data[index].id+">"+data[index].name+"</option>";
            });
            $(".buildingSelect").html(option1);
            $("#show_belong_scene").html(option2);
        }
    });
}

/*
 得到所有建筑数据,更新建筑列表
*/
function getAllBuilding(sceneId) {
    //调用得到建筑接口
    HG_AJAX("/position_sdk/ModularBuilding/Building/getBuilding",{
        scene_id:sceneId,
        page:NOW_PAGE_BUILDING,
        limit:LIMIT_BUILDING
    },"post",function (data) {
        if (data.type == 1){
            var data = data.result;
            BUILDING_DATA = data;
            var html = '';
            if (NOW_PAGE_BUILDING == 0){
                NOW_PAGE_BUILDING = 1;
            }
            $(data).each(function (index,ele) {
                html+= "<tr><td>"+(index + 1  + ((NOW_PAGE_BUILDING - 1 ) * LIMIT_BUILDING))+"</td>" +
                    "<td>"+data[index].name+"</td>" +
                    "<td>"+data[index].scene_name+"</td>" +
                    "<td>"+transComment(data[index].comment)+"</td><td data-id="+data[index].id+" data-index="+index+"><i class='glyphicon glyphicon-edit'></i><i class='glyphicon glyphicon-trash'></i></td></tr>";
            });
            $("#building tbody").html(html);
        }
    });
}

/*
 初始执行
*/
$(function () {
    //初始化场景列表
    getAllScene();
    getSceneCount();
    //初始化建筑列表
    getAllBuilding();
    getBuildingCount();
});

/*
 点击“新建场景”按钮，弹出新增场景模态框
*/
$("#create_scene_btn").click(function () {
    $("#new_name").val("");
    $("#new_describe").val("");
    $("#modal_new_scene").modal("show");
});

/*
 点击新增场景模态框里的“确定”按钮，确定新增
*/
$("#create_save").click(function () {
    var new_name = $("#new_name").val();
    var new_describe = $("#new_describe").val();
    if (!new_name){
        HG_MESSAGE("场景名不能为空");
        return;
    }
    //判断场景名是否重名 
    HG_AJAX("/position_sdk/ModularScene/Scene/sceneNameAvailable",{name:new_name},"post",function (data) {
        if (data.type == 1){
            //调用新增场景接口
            HG_AJAX("/position_sdk/ModularScene/Scene/addScene",{
                name:new_name,
                comment:new_describe
            },"post",function (data) {
                if (data.type == 1){
                    getAllScene();
                    getSceneCount();
                    $("#modal_new_scene").modal("hide");
                }else {
                    HG_MESSAGE("保存失败");
                }
            });
        }else {
            HG_MESSAGE("场景名不能重复");
        }
    });
});

/*
 点击删除图标，弹出确定删除提示模态框
*/
$("#scene tbody").on("click",".glyphicon-trash",function () {
    SCENE_ID = $(this).parent().data("id");
    $("#modal_del_scene").modal("show");
});

/*
 点击删除提示模态框的确定按钮，确认删除
*/
$("#del_sure").click(function () {
    //调用删除场景接口
    HG_AJAX("/position_sdk/ModularScene/Scene/deleteScene",
        {scene_id:SCENE_ID},"post",function (data) {
            getAllScene();
            getSceneCount();
            getAllBuilding(BELONG_SCENE_ID);
            getBuildingCount(BELONG_SCENE_ID);
        });
});

/*
 点击修改图标，弹出修改场景模态框
*/
$("#scene tbody").on("click",".glyphicon-edit",function () {
    SCENE_ID = $(this).parent().data("id");
    var index = $(this).parent().data("index");
    var old_name = SCENE_DATA[index].name;
    var old_describe = transComment(SCENE_DATA[index].comment);
    $("#edit_name").val(old_name);
    $("#edit_describe").val(old_describe);
    $("#modal_update_scene").modal("show");
});

/*
 点击修改模态框的确定按钮，确认修改
*/
$("#edit_save").click(function () {
    var edit_name = $("#edit_name").val();
    var edit_describe = $("#edit_describe").val();
    if (!edit_name){
        HG_MESSAGE("场景名不能为空");
        return;
    }
    //调用修改场景接口
    HG_AJAX("/position_sdk/ModularScene/Scene/updateScene", {
        scene_id:SCENE_ID,
        name:edit_name,
        comment:edit_describe
    },"post",function (data) {
        if(data.type == 1){
            getAllScene();
            getSceneCount();
            getAllBuilding(BELONG_SCENE_ID);
            getBuildingCount(BELONG_SCENE_ID);
            $("#modal_update_scene").modal("hide");
        }else if(data.type == 102){
            HG_MESSAGE("场景名不能重复");
        }else{
            HG_MESSAGE("修改失败");
        }
    });
});

/*
 改变场景下拉框的值，得到相应建筑列表
*/
$("#show_belong_scene").change(function () {
    BELONG_SCENE_ID = $(this).val();
    getAllBuilding(BELONG_SCENE_ID);
    getBuildingCount(BELONG_SCENE_ID);
});

/*
 点击“新建建筑”按钮，弹出新增建筑模态框
*/
$("#create_building_btn").click(function () {
    $("#new_building_name").val("");
    $("#new_building_describe").val("");
    $("#modal_new_building").modal("show");
});

/*
 点击新增建筑模态框里的“确定”按钮，确定新增
*/
$("#create_building_save").click(function () {
    var new_building_name = $("#new_building_name").val();
    var new_building_describe = $("#new_building_describe").val();
    var create_belong_scene = $("#create_belong_scene").val();
    if (!new_building_name){
        HG_MESSAGE("建筑名不能为空");
        return;
    }
    HG_AJAX("/position_sdk/ModularBuilding/Building/buildingNameAvailable",{name:new_building_name,scene_id:create_belong_scene},"post",function (data) {
        if (data.type == 1){
            HG_AJAX("/position_sdk/ModularBuilding/Building/addBuilding",{
                name:new_building_name,
                comment:new_building_describe,
                scene_id:create_belong_scene
            },"post",function (data) {
                if (data.type == 1){
                    getAllBuilding(create_belong_scene);
                    getBuildingCount(create_belong_scene);
                    $("#show_belong_scene").val(create_belong_scene);
                    $("#modal_new_building").modal("hide");
                }else{
                    HG_MESSAGE("保存失败");
                }
            });
        }else {
            HG_MESSAGE("建筑名不能重复");
        }
    });
});

/*
 点击删除图标，弹出确定删除提示模态框
*/
$("#building tbody").on("click",".glyphicon-trash",function () {
    BUILDING_ID = $(this).parent().data("id");
    $("#modal_del_building").modal("show");
});

/*
 点击删除提示模态框的确定按钮，确认删除
*/
$("#del_building_sure").click(function () {
    //调用删除建筑接口
    HG_AJAX("/position_sdk/ModularBuilding/Building/deleteBuilding", {
        building_id:BUILDING_ID
    },"post",function (data) {
        //刷新建筑列表
        getAllBuilding(BELONG_SCENE_ID);
        getBuildingCount(BELONG_SCENE_ID);
    });
});

/*
 点击修改图标，弹出修改建筑模态框
*/
$("#building tbody").on("click",".glyphicon-edit",function () {
    BUILDING_ID = $(this).parent().data("id");
    var index = $(this).parent().data("index");
    var old_name = BUILDING_DATA[index].name;
    var old_describe = BUILDING_DATA[index].comment;
    var old_scene_id = BUILDING_DATA[index].scene_id;
    $("#edit_building_name").val(old_name);
    $("#edit_building_describe").val(old_describe);
    $("#edit_belong_scene").val(old_scene_id);
    $("#modal_update_building").modal("show");
});

/*
 点击修改模态框的确定按钮，确认修改
*/
$("#edit_building_save").click(function () {
    var edit_name = $("#edit_building_name").val();
    var edit_describe = $("#edit_building_describe").val();
    var sceneId = $("#edit_belong_scene").val();
    if (!edit_name){
        HG_MESSAGE("建筑名不能为空");
        return;
    }
    //调用修改建筑接口
    HG_AJAX("/position_sdk/ModularBuilding/Building/updateBuilding",{
        scene_id:sceneId,
        building_id:BUILDING_ID,
        name:edit_name,
        comment:edit_describe
    },"post",function (data) {
        if(data.type == 1){
            //刷新建筑列表
            getAllBuilding(sceneId);
            getBuildingCount(sceneId);
            $("#show_belong_scene").val(sceneId);
            $("#modal_update_building").modal("hide");
        }else if(data.type == 102){
            HG_MESSAGE("建筑名不能重复");
        }else{
            HG_MESSAGE("修改失败");
        }
    });
});