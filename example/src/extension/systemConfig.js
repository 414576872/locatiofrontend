var CONFIG = {};     //存放配置,用于修改配置时获取配置项和数值
var EDIT_NAME = "";  //正在编辑的配置项,点击编辑图标时获取,用于确定修改向后台发送
var EDIT_TYPE = "";  //编辑的配置项类型,用于确定使用的后台接口(配置项来自不同的两个后台接口)

/*
 获取配置项,从两个不同的后台接口获取配置项,以配置名字作为键名把数据存放到CONFIG中,
 根据后台接口的名字作为type以及配置名字name绑定到编辑图标上,方便修改配置时使用.
*/
function getConfig() {
    var tbody = "";
    var index = 0 ;
    HG_AJAX("/position_sdk/ModularConfiguration/SysConfig/getSysConfig", {},"post",function (data) {
        if(data.type == 1){
            var result = data.result;
            $(result).each(function () {
                CONFIG[this.name] = {
                    value:this.value,
                    comment:this.comment
                };
                index += 1;
                tbody += "<tr><td>" + index + "</td>" +
                    "<td>" + this.name + "</td>" +
                    "<td>" + this.value + "</td>" +
                    "<td>" + this.comment + "</td>" +
                    "<td><i class='glyphicon glyphicon-edit' data-name='" + this.name + "' data-type='sysConfig'></i></td></tr>"
            });
            HG_AJAX("/position_sdk/ModularConfiguration/Configuration/getConfiguration", {},"post",function (data) {
                if(data.type == 1){
                    var result = data.result;
                    $(result).each(function () {
                        CONFIG[this.name] = {
                            value:this.value,
                            comment:this.comment
                        };
                        index += 1;
                        tbody += "<tr><td>" + index + "</td>" +
                            "<td>" + this.name + "</td>" +
                            "<td>" + this.value + "</td>" +
                            "<td>" + this.comment + "</td>" +
                            "<td><i class='glyphicon glyphicon-edit' data-name='" + this.name + "' data-type='configuration'></i></td></tr>";
                    });
                    $("#table_sys_config").html(tbody);
                    $(".system_name").html(CONFIG.SYSTEM_NAME.value + "<span style='font-size: 12px;margin-left: 5px'>当前版本：sdk_v"+VERSION+"</span>");
                    $("title").html(CONFIG.SYSTEM_NAME.value);
                }else{
                    HG_MESSAGE("无法获取配置项");
                }
            });
        }else{
            HG_MESSAGE("无法获取配置项");
        }
    });
}

/*
 文档加载完成后,获取配置项和优化坐标设置
*/
getConfig();

/*
 配置列表中的编辑图标点击时,讲配置名字和type存放到全局变量中
*/
$("#table_sys_config").on("click","i",function () {
    EDIT_NAME = $(this).data("name");
    EDIT_TYPE = $(this).data("type");
    var label = EDIT_NAME + "&emsp;" + CONFIG[EDIT_NAME].comment;
    $("#label_modify_config_name").html(label);
    $("#input_modify_config_value").val(CONFIG[EDIT_NAME].value);
    $("#modal_modify_config").modal("show");
});

/*
 确定修改配置,根据type向不同的后台接口发送修改请求
*/
$("#button_modify_config_save").click(function () {
    var data = {
        name:EDIT_NAME,
        value:$("#input_modify_config_value").val()
    };
    if(EDIT_TYPE == "sysConfig"){
        HG_AJAX("/position_sdk/ModularConfiguration/SysConfig/setSysConfig", data,"post",function (data) {
            if(data.type == 1){
                $("#modal_modify_config").modal("hide");
                getConfig();
            }else{
                HG_MESSAGE("修改配置失败");
            }
        });
    }else{
        HG_AJAX("/position_sdk/ModularConfiguration/Configuration/setConfiguration", data,"post",function (data) {
            if(data.type == 1){
                $("#modal_modify_config").modal("hide");
                getConfig();
            }else{
                HG_MESSAGE("修改配置失败");
            }
        });
    }
});

/*
 内外网穿透设置的相关逻辑
*/
var THIS_PENETRATE_ID,
    ALL_PENETRATE_INFO = [];
function getPenetrate() {
    HG_AJAX('/position_sdk/ModularConfiguration/TunnelConfig/getConfiguration',{},'post',function (data) {
        if(data.type == 1){
            var data = data.result,
                html = '';
            for(var i in data){
                var id = data[i].id,
                    index = parseInt(i)+1,
                    target_address = data[i].target_address,
                    master_port = data[i].master_port,
                    customer_port = data[i].customer_port,
                    options = '<i class="glyphicon glyphicon-edit" data-id="'+id+'"></i><i class="glyphicon glyphicon-trash" data-id="'+id+'"></i>',
                    obj = {
                        id:id,
                        target_address:target_address,
                        master_port:master_port,
                        customer_port:customer_port

                    };
                ALL_PENETRATE_INFO[id] = obj;
                html += '<tr><td>'+index+'</td><td>'+target_address+'</td><td>'+master_port+'</td><td>'+customer_port+'</td><td>'+options+'</td></tr>';
            }
            $("#table_penetrate").html(html);

        }else{
            HG_MESSAGE(data.result);
        }
    })
}
getPenetrate();

/*
 新增
*/
$("#add_penetrate").click(function () {
    $("#add_target_address").val(null);
    $("#add_master_address").val(null);
    $("#add_customer_port").val(null);
    $("#modal_add_penetrate").modal('show');
});

/*
 确定新增
*/
$("#confirm_add_penetrate").click(function () {
    var target_address = checkInputNull($("#add_target_address").val()),
        master_port = checkInputNull($("#add_master_address").val()),
        customer_port = checkInputNull($("#add_customer_port").val());
    if(!target_address || !master_port || !customer_port){
        HG_MESSAGE('请填入必要信息！');
        return;
    }
    HG_AJAX('/position_sdk/ModularConfiguration/TunnelConfig/addConfiguration',{
        target_address:target_address,
        master_port:master_port,
        customer_port:customer_port
    },'post',function (data) {
        if(data.type == 1){
            HG_MESSAGE('新增成功！');
            getPenetrate();
            $("#modal_add_penetrate").modal('hide');
        }else{
            HG_MESSAGE(data.result);
        }
    })
});

/*
 编辑
*/
$('#table_penetrate').on('click','.glyphicon-edit',function () {
    THIS_PENETRATE_ID = $(this).data('id');
    $("#target_address").val(ALL_PENETRATE_INFO[THIS_PENETRATE_ID].target_address);
    $("#master_address").val(ALL_PENETRATE_INFO[THIS_PENETRATE_ID].master_port);
    $("#customer_port").val(ALL_PENETRATE_INFO[THIS_PENETRATE_ID].customer_port);
   $("#modal_update_penetrate").modal('show');
});

/*
 确认编辑
*/
$("#confirm_update_penetrate").click(function () {
    var target_address = checkInputNull($("#target_address").val()),
        master_port = checkInputNull($("#master_address").val()),
        customer_port = checkInputNull($("#customer_port").val());

    if(!target_address || !master_port || !customer_port){
        HG_MESSAGE('请填入必要信息！');
        return;
    }
    HG_AJAX('/position_sdk/ModularConfiguration/TunnelConfig/setConfiguration',{
        id:THIS_PENETRATE_ID,
        target_address:target_address,
        master_port:master_port,
        customer_port:customer_port
    },'post',function (data) {
        if(data.type == 1){
            HG_MESSAGE('修改成功！');
            getPenetrate();
            $("#modal_update_penetrate").modal('hide');
        }else{
            HG_MESSAGE(data.result);
        }
    })
});

/*
 删除
*/
$('#table_penetrate').on('click','.glyphicon-trash',function () {
    THIS_PENETRATE_ID = $(this).data('id');
    $("#modal_delete_penetrate").modal('show');
});

/*
 确认删除
*/
$("#confirm_delete_penetrate").click(function () {
    HG_AJAX('/position_sdk/ModularConfiguration/TunnelConfig/deleteConfiguration',{
        id:THIS_PENETRATE_ID
    },'post',function (data) {
        if(data.type == 1){
            HG_MESSAGE('删除成功！');
            getPenetrate();
            $("#modal_delete_penetrate").modal('hide');
        }else{
            HG_MESSAGE(data.result);
        }
    })
});


$("#btn_restore_default").click(function () {
    $("#modal_restore_default").modal("show");
});

$("#btn_restore_default_sure").click(function () {
    HG_AJAX('/position_sdk/ModularConfiguration/SysConfig/resetConfiguration',{},'post',function (data) {
        if(data.type == 1){
            HG_MESSAGE(data.result);
            getConfig();
            $("#modal_restore_default").modal('hide');
        }else{
            HG_MESSAGE(data.result);
        }
    })
});