var TIME; //开始时间戳（毫秒）
var END_TIME; //结束时间戳(毫秒)
var DATA_FLAG; // 是否平滑
var AREA_XY; // 区域坐标：[x最小值， x最大值， y最小值，y最大值]
var CARD_IDS; // 卡号id以逗号分隔
var AREA_IDS; // 区域id 多个区域以逗号分开
var BUILDING_ID; // 建筑id
var SCENE_ID; // 场景id
var FLOOR_ID; // 楼层id

var dataSource, lastPage
var pages = 1
var limit = 50

var currentPage = 1
var pageNavHtml
var insertNavHtml
var start_page
var end_page


// navgation 所相关的变量
var navGroup // 分成多少个组别
var navCurrentGroup // 当前页码所在的组别
var navStartPage // 导航起始页码
var navEndPage // 导航终止页码
var navLimit // 导航每一组的页数

// 初始执行

/*
 获取历史表格的数据
*/
function get() {
  HG_AJAX("/position_sdk/ModularHistory/History/getCardHistory", {
    time: TIME,
    end_time: END_TIME,
    data_flag: DATA_FLAG,
    area_xy: AREA_XY,
    card_ids: CARD_IDS,
    area_ids: AREA_IDS,
    building_id: BUILDING_ID,
    scene_id: SCENE_ID,
    floor_id: FLOOR_ID
  }, "post", function (data) {
    if (data.type == 1) {
      $('#navgatorPage').html(` <li>
      <a href="#" aria-label="Previous">
        <span aria-hidden="true">&laquo;</span>
      </a>
    </li>
    <li id="navRightArrow">
      <a href="#" aria-label="Next">
        <span aria-hidden="true">&raquo;</span>
      </a>
    </li>`)
      drawTable('')
      if (!data.result.length) {
        HG_MESSAGE("当前时间段历史记录为空")
      } else {
        console.log(data.result)
        dataSource = data.result;
        pages = Math.floor(dataSource.length / limit) + 1
        lastPage = dataSource.length % limit
        currentPage = 1

        // console.log("总共页数 ： " + pages)
        // console.log("所有条数 ： " + dataSource.length)

        drawNavgator(currentPage, pages)
        drawTable(dataSource, 1, limit)
        toggleClassWithPage(currentPage)
      }
    } else {
      HG_MESSAGE("获取数据最失败");
    }
  });
}

// 确定页码组件的各个变量的值
function defineNav(currentPage, pages) {
  navLimit = 10
  navGroup = pages / 10 - Math.floor(pages / 10) > 0 ? Math.floor(pages / 10) + 1 : Math.floor(pages / 10)
  navCurrentGroup = Math.floor((currentPage - 1) / navLimit) + 1
  navStartPage = (navCurrentGroup - 1) * 10 + 1
  navEndPage = navGroup > 1 ? (navStartPage + 9 < pages ? navStartPage + 9 : pages) : pages  //修改这里

}

// 分页控件
function drawNavgator(currentPage, pages) {
  defineNav(currentPage, pages)
  $('#navgatorPage').html(` <li>
      <a href="#" aria-label="Previous">
        <span aria-hidden="true">&laquo;</span>
      </a>
    </li>
    <li id="navRightArrow">
      <a href="#" aria-label="Next">
        <span aria-hidden="true">&raquo;</span>
      </a>
    </li>`)
  if (navStartPage > 1) {
    $('#navRightArrow').before('<li><a href="#" class="toleft">...</a></li>')
  }

  for (var i = navStartPage; i <= navEndPage; i++) {
    $('#navRightArrow').before('<li><a href="#">' + i + '</a></li>')
  }
  if (navEndPage <= pages && navEndPage >= 10 && navEndPage - navStartPage >= 9) {
    $('#navRightArrow').before('<li><a href="#" class="toRight">...</a></li>')
  }
}

// 将数据表格分页
function drawTable(data, currentPage, limit) {
  if (!data) {
    $('#table_history_call').html('')
  }
  if (!currentPage) return
  var html = null
  var sliceStart = (currentPage - 1) * limit
  var sliceEnd = sliceStart + limit
  var showTable = data.slice(sliceStart, sliceEnd)
  showTable.forEach(item => {
    html += "<tr>" +
      "<td>" + item.id + "</td>" +
      "<td>" + item.card_id + "</td>" +
      "<td>" + timeFommat(item.time) + "</td>" +
      "<td>" + item.card_x + "</td>" +
      "<td>" + item.card_y + "</td>" +
      "<td>" + item.card_z + "</td>" +
      "<td>" + item.subnet_id + "</td>" +
      "<td>" + item.building_id + "</td>" +
      "<td>" + item.scene_id + "</td>" +
      "<td>" + item.floor_id + "</td>" +
      "</tr>"
  })
  $('#table_history_call').html(html)
}

// 时间格式化
function timeFommat(dateStamp) {
  var date = new Date(Number(dateStamp))
  var Y = date.getFullYear()
  var M = date.getMonth() + 1 < 10 ? '0' + (date.getMonth() + 1) : (date.getMonth() + 1)
  var D = date.getDate()
  var h = date.getHours()
  var m = date.getMinutes()
  var s = date.getSeconds() < 10 ? '0' + (date.getSeconds()) : (date.getSeconds()) 
  return Y + '-' + M + '-' + D + ' ' + h + ':' + m + ':' + s
}

/*
 查询按钮
*/
$("#query_history_research").click(function () {
  TIME = getSearchStartTimeStamp(true) * 1000; //设置历史数据的开始时间
  END_TIME = getSearchEndTimeStamp(true) * 1000; //设置历史数据的结束时间
  get();
})
// 分页按钮事件
$('#navgatorPage').on('click', function () {
  var pageIndex = event.target.innerText
  if (isNaN(pageIndex)) {
    if (pageIndex === '«') {
      if (currentPage - 1 <= 0) {
        return
      } else if (currentPage - 1 < navStartPage) {
        --currentPage
        drawNavgator(currentPage, pages)
        toggleClassWithPage(currentPage)
        drawTable(dataSource, currentPage, limit)
      } else {
        --currentPage
        drawTable(dataSource, currentPage, limit)
        toggleClassWithPage(currentPage)
      }
    } else if (pageIndex === '»') {
      if (Number(currentPage) + 1 > pages) {
        return
      } else if (Number(currentPage) + 1 > navEndPage) {
        ++currentPage
        drawNavgator(currentPage, pages)
        toggleClassWithPage(currentPage)
        drawTable(dataSource, currentPage, limit)
      } else {
        ++currentPage
        drawTable(dataSource, currentPage, limit)
        toggleClassWithPage(currentPage)
      }
    } else if (pageIndex === '...' && event.target.className === 'toRight') {
      currentPage = (Math.floor((currentPage - 1) / navLimit) + 1) * 10 + 1
      drawNavgator(currentPage, pages)
      toggleClassWithPage(currentPage)
      drawTable(dataSource, currentPage, limit)
    } else if (pageIndex === '...' && event.target.className === 'toleft') {
      currentPage = (Math.floor((currentPage - 1) / navLimit)) * 10
      drawNavgator(currentPage, pages)
      toggleClassWithPage(currentPage)
      drawTable(dataSource, currentPage, limit)
    }
  } else {
    currentPage = pageIndex
    drawTable(dataSource, pageIndex, limit)
    toggleClassWithPage(currentPage)
  }
})

function toggleClassWithPage(index) {
  var realIndex
  if (navCurrentGroup === 1) {
    realIndex = index
  } else {
    realIndex = index - (navCurrentGroup - 1) * navLimit + 1
  }
  $('#navgatorPage li').removeClass('active')
  $('#navgatorPage li').eq(realIndex).addClass('active')
}

// 导出为csv
         
function tableToExcel(data, startTime, endTime){
  //要导出的json数据
  var jsonData = [
    {
      name:'路人甲',
      phone:'123456789',
      email:'000@123456.com'
    },
    {
      name:'炮灰乙',
      phone:'123456789',
      email:'000@123456.com'
    },
    {
      name:'土匪丙',
      phone:'123456789',
      email:'000@123456.com'
    },
    {
      name:'流氓丁',
      phone:'123456789',
      email:'000@123456.com'
    },
  ]
  //列标题，逗号隔开，每一个逗号就是隔开一个单元格
  // let str = `姓名,电话,邮箱\n`;
  let str = `序号,卡号,时间,x坐标,y坐标,z坐标,定位小区,建筑,场景,楼层\n`
  //增加\t为了不让表格显示科学计数法或者其他格式
  for(let i = 0 ; i < jsonData.length ; i++ ){
    for(let item in jsonData[i]){
      if(item == 'time') {
        str+= `${timeFommat(item.time) + '\t'},`
      }
        str+=`${jsonData[i][item] + '\t'},`
    }
    str+='\n';
  }
  //encodeURIComponent解决中文乱码
  let uri = 'data:text/csv;charset=utf-8,\ufeff' + encodeURIComponent(str);
  //通过创建a标签实现
  var link = document.createElement("a");
  link.href = uri;
  //对下载的文件命名
  link.download =  `${startTime + '-' +endTime}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

$('#query_history_export').on('click', tableToExcel)