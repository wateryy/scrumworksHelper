// 获取当前所在页面的window对象
function getUnsafeWindow() {
	if(typeof(this.unsafeWindow) != "undefined") {
		return this.unsafeWindow;
	} else if(typeof(unsafeWindow) != "undefined" && this === window && unsafeWindow === window) {
		var node = document.createElement("div");
		node.setAttribute("onclick", "return window;");
		return node.onclick();
	} else {
		return window;
	}
}

// 获取当前所在scrum页面的window对象
var myUnsafeWindow = getUnsafeWindow(),

	// 获取jquery对象
	jQuery = myUnsafeWindow.jQuery || window.jQuery;

// 传入jquery及window对象
(function($, win) {

	// scrumworks端口为8080
	if(location.port != "8080") return;

	// 如果没有jquery不再进行
	if(!$ || !win) {
		window.console && console.log("ScrumHelper Error: Jquery is Not Found or Can't get The page window!");
		return;
	}

	// 浏览器及扩展支持判断
	if(!$.browser.webkit && !$.browser.mozilla) {
		alert("您的浏览器尚不支持脚本运行，请使用Firefox或Chrome浏览器!");
		return;
	} else if($.browser.mozilla && typeof(GM_notification) == 'undefined') {
		alert("很抱歉，本脚本需要最新的Scriptish扩展、不支持GreaseMonkey，请禁用您的GreaseMonkey扩展并安装Scriptish！");
		window.open("https://addons.mozilla.org/zh-CN/firefox/addon/scriptish/");
		return;
	}

	// 如果没有获取到scrum中的TaskboardHandler函数，不做后续处理
	if(!win.TaskboardHandler) return;

	window.console && console.log("ScrumWorks Helper start work!");

	// 重写移动任务操作
	win.TaskboardHandler.prototype.moveTask = function(taskId, success, failure) {
		var data = this.getMoveTaskData(taskId);

		// 劫持移动任务成功后返回的数据，发送给smhde处理
		var hijack = function(redata) {
				$("body").trigger("smhde", JSON.stringify(redata));

				// 继续保持原来函数作用域及参数
				success.apply(this.webClient, arguments);
			};

		this.webClient.postJSON("data/task/move", data, hijack, failure);
	};

	// 重写轮询操作
	win.TaskboardHandler.prototype.pollServer = function(table) {
		var me = this;
		var indicator = $('.taskboard-force-refresh');
		var prompt = indicator.find('.prompt');
		var callback = function(data) {

				// 这里劫持Scrum的轮询数据，发送给smhder处理
				$("body").trigger("smhder", JSON.stringify(data));

				prompt.text(me.messages.get('refresh.in.progress'));
				prompt.addClass('request-processing');
				var status = me.applyUpdates(data, table);
				prompt.stop(true, true);
				prompt.text(me.messages.get('refresh.now'));
				prompt.removeClass('request-in-progress request-processing');
				return status;
			};
		var beforeFetch = function() {
				prompt.stop(true, true);
				prompt.text(me.messages.get('refresh.in.progress'));
				prompt.addClass('request-in-progress');
			};
		var updateNow = function() {
				beforeFetch();
				me.updatePoller.triggerUpdate();
			};
		indicator.click(updateNow);
		var query = 'data/sprint/' + this.sprintId + '/updates/' + this.clientId;
		this.updatePoller.startUpdates(query, (30 * 1000), beforeFetch, callback);
		prompt.text(this.messages.get('refresh.now'));
	};


	// 当前所有task信息
	var currentMap,

	// 当前用户账号
	currentUser,

	// 当前用户姓名
	currentUserName,

	// 当前scrum所有的用户
	allUser,

	// 跟某story有关联的所有用户
	noticeUser;

	// 获取最新所有task信息
	function getNewStatus(callback) {
		$.ajax({
			type: 'GET',
			dataType: 'json',
			cache: false,
			url: "http://redmine.funshion.com:8080/scrumworks/data/sprint/" + win.sprintId + "/tasks/" + win.clientID
		}).done(function(json) {

			// 更新所有task信息
			currentMap = json;
			(typeof callback == 'function') && callback();
		});
	}

	// 用户移动task相关信息匹配
	var comp = {
		map: {},
		user: [],
		json: null,
		updateMap: null,
		init: function(json, updateMap) {
			this.map = {};
			this.user = [];
			this.json = json;
			this.updateMap = updateMap;
			this.itemAll();
		},
		itemAll: function() {
			var me = this;
			$.each(this.json, function(m, n) {
				if(n.backlogItem.id != me.updateMap.backlogItemId) return;
				me.itemList(n.tasksByStatuses);
			});
		},
		itemList: function(tasks) {
			var me = this;
			// 遍历story各种状态下task任务列表
			$.each(tasks, function(m, n) {
				var st = n.status;

				// 遍历当前task列表中所有task
				$.each(n.tasks, function(mm, nn) {

					// 不管是不是当前操作的task，取出相关人员信息存储
					me.user.push(nn["pointPerson"] || "暂无");

					// 如果不是当前task，不做处理
					if(nn.id != me.updateMap.id) return;

					// 如果没有任务状态，获取状态
					(!nn.status) && (nn.status = st);

					// 这里需要把指派给的人信息补全
					nn["pointPerson"] = me.updateMap["pointPerson"];

					// 过滤需要校验的信息
					me.checkInfo(nn);
				});
			});
		},
		checkInfo: function(map) {
			var me = this;
			$.each(this.updateMap, function(m, n) {
				if(["status", "pointPerson", "title"].indexOf(m) == -1) return;

				// 转换格式
				me.map[m] = {
					from: map[m],
					to: n
				};

				// 更改当前存储信息
				map[m] = n;
			});

			// 当前story下所有人员排重存储
			this.user = $.unique(this.user);

			// 处理完成
			this.send();
		},
		send: function() {
			console.log(this);
			// 移动成功后需要发送给node端数据
			// =============================
			// =============================
			// =============================
			// =============================
		}
	};

	// 当前用户移动task中间处理函数
	function moveHander(data) {
		if(!currentMap) {
			getNewStatus(function() {
				moveHander(data);
			});
			return;
		}
		// data是json串，需要注意转化为对象
		comp.init(currentMap, JSON.parse(data));
	}

	// 更新update过的数据
	function updateBackLogHandle(json){
		$.each(json, function(m, n){
			$.each(currentMap, function(mm, nn){
				if(n.backlogItem.id != nn.backlogItem.id) return;
				currentMap[mm] = n;
			});
		});
	}

	// 获取当前用户及所有用户姓名及账号信息
	(function() {
		// 所有用户信息
		var meb = win.teamMembers;
		var str1 = $("#header-info>div.welcome:first").html();
		if(!str1) return;
		var str2 = $.trim(str1).split(":")[0].split(" ");
		if(!str2 || str2.length < 4) return;
		currentUser = str2[3];

		// 根据所有人信息查出当前用户姓名
		$.each(meb, function(m, n) {
			var cc = m.split("(");
			if(cc.length < 2) return;
			var ename = $.trim(cc[1].split("\)")[0]);
			if(ename == currentUser) {
				currentUserName = $.trim(cc[0]);
			}
		});
	})();

	// 监听当前用户移动task操作
	$("body").bind("smhde", function(ev, data) {
		moveHander(data);
	});

	// 监听scrum轮询数据更改
	$("body").bind("smhder", function(ev, data) {
		var json = JSON.parse(data);

		// 如果没有更新，不再继续
		if(!json.updatedBacklogItems.length) return;

		// 更新当前所有信息中的数据
		updateBackLogHandle(json.updatedBacklogItems);
	});

	// 执行获取最新task信息函数
	getNewStatus();

	// 需要有更新版本提示
	// ========================
	// ========================
	// ========================
	// ========================

})(jQuery, myUnsafeWindow);