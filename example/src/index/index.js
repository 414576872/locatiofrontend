/*
 登录函数
*/
function login(){
    var username = $("#text_username").val();
    var password = $("#text_password").val();
    //判断用户名密码是否为空
    if(username == "" || password == ""){
        HG_MESSAGE("用户名或者密码不能为空,请检查后重新登录");
        return;
    }
    HG_AJAX("/position_sdk/ModularUser/User/login", {
        username:username,
        password:md5(password),
        http_api_version:VERSION
    }, "post",function (data) {
        if(data.type == 1){
            var result = data.result;
            sessionStorage.setItem('mqtt_username', result.username);
            sessionStorage.setItem('mqtt_password', result.password);
            window.location.href = "realTime2D.html";
        }else{
            HG_MESSAGE("登录失败");
        }
    });
}

/*
 点击登录按钮,调用登录函数
*/
$("#btn_login").click(function () {
    login();
});

/*
 用户输入框点击回车,将输入焦点跳到密码输入框
*/
$("#text_username").keydown(function (e) {
    if(e.keyCode == 13){
        $(this).blur();
        $("#text_password").focus();
    }
});

/*
 密码输入框点击回车,调用登录函数
*/
$("#text_password").keydown(function (e) {
    if(e.keyCode == 13){
        $(this).blur();
        login();
    }
});
(function () {
    HG_AJAX("/position_sdk/ModularConfiguration/Configuration/getSystemName", {},"post",function (data) {
        if(data.type == 1){
            var result = data.result;
            $("h4").html(result);
            $("title").html(result);
        }else {
            $("h4").html("定位系统SDK样例网站");
            $("title").html("定位系统SDK样例网站");
        }
    });
})();
