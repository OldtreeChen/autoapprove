var Utility =
{
	//-----------------------------------------------------------------------
	// window/tab/dialog
	//-----------------------------------------------------------------------

	navigate: function(url, args, wnd)
	{
		(wnd || window).location.href = Utility.getUrl(url, args);
	},
	
	openTab: function(url, args, title, icon, hint, id, activate, options)
	{
		var tabStrip = Utility.getTabStrip();
		if (/^([\w\.]+)\.page/.test(url)) {
			var page = Utility.getPage(RegExp.$1);
			if (Jui.string.isEmpty(title)) {
				title = page.title;
			}
			if (Jui.string.isEmpty(icon)) {
				icon = page.icon;
			}
		}
		var json = Jui.object.merge({
			id		: id,
			text	: title,
			url		: Utility.getUrl(url, args),
			icon	: icon,
			hint	: hint
		}, options);
		var tabId = tabStrip.add(json, activate, true);
		tabStrip.setTabAttribute(tabId, "openerWindow", window);
		if (Utility.isInTab()) {
			var openerTabId = tabStrip.getIdByWindow(window);
			var tabWindow = Jui.dom.getFrameWindow(tabStrip.getBody(openerTabId));
			tabStrip.setTabAttribute(tabId, "openerTopWindow", tabWindow);
		}
	},

	closeTab: function()
	{
		if (Utility.isInTab()) {
			var tabStrip = Utility.getTabStrip();
			var tabId = tabStrip.getIdByWindow(window);
			tabStrip.remove(tabId);
		}
		else {
			Utility.postMessage(window.top, {action:"closeCurrentTab"});
		}
	},

	setTabIcon: function(icon)
	{
		if (Utility.isInTab()) {
			var tabStrip = Utility.getTabStrip();
			var tabId = tabStrip.getIdByWindow(window);
			if (tabId != -1) {
				tabStrip.setTabIcon(tabId, icon);
			}
		}
	},

	setTabTitle: function(title)
	{
		if (Utility.isInTab()) {
			var tabStrip = Utility.getTabStrip();
			var tabId = tabStrip.getIdByWindow(window);
			if (tabId != -1) {
				tabStrip.setTabTitle(tabId, title);
			}
		}
		else {
			var data = {action:"setTabTitle", args:{url:location.href, title:title}};
			Utility.postMessage(window.top, data);
		}
	},
	
	openWindow: function(url, args, name, features)
	{
		var wnd = window.open(Utility.getUrl(url, args), name, features || "");
		if (wnd == null) {
			Jui.message.hint($text("Qs.Browser.PopupWindowBlocked"));
		}
		return wnd;
	},
	
	close: function()
	{
		if (Utility.isInDialog()) {
			Utility.closeDialog();
		}
		else if (Utility.isInTab()) {
			Utility.closeTab();
		}
		else {
			window.close();
		}
	},
	
	openDialog: function(url, args, options, callback, cancelCallback)
	{
		options = Jui.object.merge({}, options);
		if (/^([\w\.]+)\.page/.test(url)) {
			var page = Utility.getPage(RegExp.$1);
			if (options.width == null) {
				options.width = page.dialogWidth || options.defaultWidth;
			}
			if (options.height == null) {
				options.height = page.dialogHeight || options.defaultHeight;
			}
			if (options.showCloseButton == null) {
				options.showCloseButton = true;
			}
			if (options.maximize == null && page.dialogMaximized) {
				options.maximize = true;
			}
			delete options.defaultWidth;
			delete options.defaultHeight;
		}
		
		var isInTab = Utility.isInTab();
		if (isInTab && options.openInTab) {
			var w = window;
			while (w.parent != window.top) {
				w = w.parent;
			}
			if (w != window.top) {
				options.window = w;
			}
		}
		
		var dialog = Jui.basic.Dialog.open(Utility.getUrl(url, args), options, callback, cancelCallback);
		if (Utility.isInAnalogDialog()) {
			dialog.setAttribute("openerTopWindow", Utility.getCurrentDialog().getContentWindow());
		}
		else if (isInTab) {
			var tabStrip = Utility.getTabStrip();
			var openerTabId = tabStrip.getIdByWindow(window);
			var tabWindow = Jui.dom.getFrameWindow(tabStrip.getBody(openerTabId));
			dialog.setAttribute("openerTopWindow", tabWindow);
		}
	},

	openRealDialog: function(url, args, features)
	{
		return window.showModalDialog(Utility.getUrl(url, args), null, features);
	},

	closeDialog: function(result)
	{
		var dialog = Utility.getCurrentDialog();
		if (typeof(result) != "undefined") {
			if (dialog == null) {
				window.returnValue = result;
			}
			else {
				dialog.setResult(result);
			}
		}
		dialog == null ? window.close() : dialog.close();
	},
	
	getOpenerWindow: function(isTabOrDialogDirectWindow)
	{
		var checkWindowStatus = function(wnd) {
			try {
				return wnd == null || wnd.closed ? null : wnd;
			}
			catch (e) {
				return null;
			}
		};
		if (Utility.isInTab()) {
			var tabStrip = Utility.getTabStrip();
			var tabId = tabStrip.getIdByWindow(window);
			var key = isTabOrDialogDirectWindow ? "openerTopWindow" : "openerWindow";
			return checkWindowStatus(tabStrip.getTabAttribute(tabId, key));
		}
		else if (Utility.isInAnalogDialog()) {
			var dialog = Utility.getCurrentDialog();
			var wnd = isTabOrDialogDirectWindow ? dialog.getAttribute("openerTopWindow") : dialog.getOpener();
			return checkWindowStatus(wnd);
		}
		else {
			return null;
		}
	},
	
	setDialogSize: function(width, height)
	{
		var dialog = Utility.getCurrentDialog();
		dialog.setSize(width, height);
	},
	
	getCurrentDialog: function()
	{
		return Jui.basic.Dialog.getCurrent();
	},
	
	getDialogResult: function()
	{
		if (Utility.isInAnalogDialog()) {
			return Utility.getCurrentDialog().getResult();
		}
		else if (Utility.isInRealDialog()) {
			return window.returnValue;
		}
	},
	
	setDialogResult: function(result)
	{
		if (Utility.isInAnalogDialog()) {
			Utility.getCurrentDialog().setResult(result);
		}
		else if (Utility.isInRealDialog()) {
			window.returnValue = result;
		}
	},
	
	setDialogResultAttribute: function(key, value)
	{
		var result = Utility.getDialogResult();
		if (result == null) {
			result = {};
		}
		result[key] = value;
		Utility.setDialogResult(result);
	},
	
	isInDialog: function()
	{
		return Utility.isInRealDialog() || Utility.isInAnalogDialog();
	},

	isInTab: function()
	{
		if (Utility.isInDialog()) {
			return false;
		}
		var tabStrip = Utility.getTabStrip();
		return tabStrip != null && tabStrip.getIdByWindow(window) != null;
	},
	
	isInWindowOpenByQs: function()
	{
		try {
			return window.top.opener != null && window.top.opener.Utility != null;
		}
		catch (e) {
			return false;
		}
	},

	isInRealDialog: function()
	{
		return window.dialogWidth != null;
	},
	
	isInAnalogDialog: function()
	{
		return Utility.getCurrentDialog() != null;
	},

	isDialogTop: function()
	{
		if (window == window.top && window.dialogWidth != null) {
			return true;
		}
		dialog = Utility.getCurrentDialog();
		return dialog != null && window == dialog.getContentWindow();
	},

	showWarningBar: function(message)
	{
		var warningBar = $elem("QsWarningBar");
		if (warningBar == null) {
			var html	= "<div id='QsWarningBar' class='QsWarningBar'>"
						+ 	"<div></div>"
						+ 	"<div></div>"
						+ "</div>";
			Jui.dom.insertHtml(document.body, "AfterBegin", html);
			warningBar = $elem("QsWarningBar");
			warningBar.lastChild.onclick = function() {
				document.body.removeAttribute("warningbar");
			};
		}
		Jui.dom.setInnerText(warningBar.firstChild, message);
		document.body.setAttribute("warningbar", true);
	},
	
	getTabStrip: function()
	{
		var topWindow = Jui.window.getTop();
		for (var w = window; w != topWindow; w = w.parent) {
			if (typeof w.getTabStrip == "function") {
				var tabStrip = w.getTabStrip();
				if (tabStrip != null) {
					return tabStrip;
				}
			}
			var owner = Jui.$owner(w.frameElement, "TabStrip");
			if (owner != null && owner.isDynamic()) {
				return owner;
			}
		}
		return topWindow.MainFrame == null ? null : topWindow.MainFrame.tabStrip;
	},
	
	getTopTabStrip: function()
	{
		return Jui.window.getTop().MainFrame.tabStrip;
	},
	
	/**
	 * @param toMainPage 
	 * if @toMainPage == true then switch to the main page, 
	 * else switch to the custom main page.
	 */
	switchMainPage: function(toMainPage)
	{
		var toMainPage = Jui.cast.toBool(toMainPage, false);
		var mainFrame = Jui.window.getTop().MainFrame;
		if (mainFrame == null) {
			console.error("The object named \"MainFrame\" can not be found in the top window.");
			return;
		}
		mainFrame.switchMainPage(toMainPage);
	},
	
	//-----------------------------------------------------------------------
	// message
	//-----------------------------------------------------------------------

	broadcast: function(data)
	{
		Utility.postMessage(window.top, {action:"broadcast", args:{data:data}});
	},

	crossFrameCall: function(frameId, functionName, functionArgs)
	{
		if (frameId == null) {
			var args = {functionName:functionName, functionArgs:functionArgs}; 
			Utility.postMessage(window.top, {action:"callFunction", args:args});
		}
		else {
			var args = {frameId:frameId, functionName:functionName, functionArgs:functionArgs}; 
			Utility.postMessage(window.top, {action:"crossFrameCall", args:args});
		}
	},

	postMessage: function(wnd, data)
	{
		wnd.postMessage(data, "*");
	},

	doMessage: function(event)
	{
		var data = event.data;
		if (data.action == "callFunction") {
			var func = eval(data.args.functionName);
			var funcArgs = data.args.functionArgs || [];
			func.apply(window, funcArgs);
		}
	},

	//-----------------------------------------------------------------------
	// framework
	//-----------------------------------------------------------------------

	download: function(url, args)
	{
		if (!/\.file$/.test(url)) {
			url += ".file";
		}
		url = Utility.setUrlParam(url, "pageCode", clientData.pageCode);
		Utility.openWindow(url, args);
	},
	
	showError: function(error)
	{
		var url		= error.page == null ? "Qs.Misc.ActionError.page" : error.page.url;
		var width	= error.page == null ? 450 : error.page.dialogWidth;
		var height	= error.page == null ? 125 : error.page.dialogHeight;
		var options	= {width:width, height:height};
		var data	= error.page && error.page.data;
		var args	= Jui.object.merge({message:error.message, stackTrace:error.stackTrace}, data);
		Utility.openDialog(url, args, options);
	},
	
	showCaptcha: function(message, callback)
	{
		Utility.openDialog("Qs.Misc.Captcha.page", {message:message}, null, callback);
	},
	
	setToolBarJsonProcessor: function(processor)
	{
		Utility._toolBarJsonProcessor = processor;
	},

	getToolBarJson: function()
	{
		var toolBarJson = clientData.toolBarJson || {};
		if (Utility.isDialogTop()) {
		    var showCloseButton = true;
		    try {
		        showCloseButton = Utility.getCurrentDialog().isShowCloseButton();
		    }
		    catch (e) {
		        logger.error(e);
		    }
		    if (showCloseButton) {
                toolBarJson.right = toolBarJson.right || [];
                toolBarJson.right.push({
                    control		: "Button",
                    icon		: "quicksilver/image/16/Return.gif",
                    name		: "Return",
                    onclick		: "Utility.closeDialog()",
                    text		: $text("Public.Return"),
                    keepStatus	: true
                });
		    }
		}
		if (Utility._toolBarJsonProcessor != null) {
			toolBarJson = Utility._toolBarJsonProcessor.processToolBarJson(toolBarJson);
		}
		else if (typeof(processToolBarJson) == "function") {
			toolBarJson = processToolBarJson(toolBarJson);
		}
		return toolBarJson;
	},

	openPageSet: function(code, args)
	{
	    Utility.getPageSet(code, function(pageSet) {
	        var pageSetArgs = {code: code, args: args};
            if (Utility.isInDialog()) {
                Utility.openDialog("Qs.PageSet.page", pageSetArgs, {title: pageSet.name});
            }
            else {
    	        Utility.openTab("Qs.PageSet.page", pageSetArgs, pageSet.name, pageSet.icon);
            }
	    });
	},

	//-----------------------------------------------------------------------
	// server
	//-----------------------------------------------------------------------

	invoke: function(url, args, showAnimation, callback, options)
	{
		options 				= options || {};
		var callbackIsObject	= typeof(callback) == "object" && callback != null;
		var ajax 				= new Utility.Ajax(url, args);
		ajax.showAnimation 		= showAnimation;
		ajax.ignoreError 		= window._ignoreError || options.ignoreError;
		ajax.onsuccess 			= callbackIsObject ? callback.onsuccess : callback;
		if (callbackIsObject && "onfailure" in callback) {
			ajax.onfailure = callback.onfailure;
		}
		ajax.submit();
		return ajax;
	},

	syncInvoke: function(url, args, callback, options)
	{
		url 	= /\.data($|\?)/.test(url) ? url : url + ".data";
		var xhr = Utility.Ajax._createAndOpenXmlHttpRequest(url, false);
		try {
			xhr.send(JSON.stringify(args || {}));
		}
		catch (e) {
			if (!window._ignoreError && (options == null || !options.ignoreError)) {
				window._ignoreError = true;
				try {
					if (Jui.string.isEmpty(e.description)) {
						console.error("synchronized XMLHttpRequest failed. url=%s", url);
						console.error(e);
						Jui.message.alert($text("Qs.Ajax.ErrorWithoutMessage"));
					}
					else {
						Jui.message.alert(Utility.formatText("Qs.Ajax.ErrorWithMessage", e.description));
					}
					Utility.Ajax._logHttpError(xhr.status, url, e.description);
				}
				finally {
					delete window._ignoreError;
				}
			}
			return;
		}
		var result = Utility.Ajax._parseXmlHttpRequestResponse(xhr);
		if (result.success) {
			if (callback != null) {
				callback(result.json);
			}
			return result.json;
		}
		else if (!window._ignoreError && (options == null || !options.ignoreError)) {
			Utility.Ajax.showError(result);
		}
	},
	
	getTokenId: function(callback)
	{
		Utility.invoke("Qs.Token.getTokenId", null, true, callback);
	},

	encryptFieldValue: function(value)
	{
		if (value == null) {
			return null;
		}
		var key = Jui.window.getTop().Utility._encryptKey;
		if (key == null) {
			key = Utility.syncInvoke("Qs.Misc.getFieldEncryptKey").key;
			Utility.setFieldEncryptKey(key);
		}
		return "\u0002\u0011\u0005\u0007\u0014\u0003:" + Jui.rsa.encrypt(key, value);
	},

	setFieldEncryptKey: function(key)
	{
		Jui.window.getTop().Utility._fieldEncryptKey = key;
	},

	decryptFieldValue: function(value)
	{
		if (typeof(value) == "string") {
			var key = Jui.window.getTop().Utility._fieldDecryptKey;
			if (key == null) {
				key = Utility.syncInvoke("Qs.Misc.getFieldDecryptKey").key;
				Utility.setFieldDecryptKey(key);
			}
			var result = value.match(/^\u0002\u0011\u0005\u0007\u0014\u0003:([a-z0-9+/\-_]+={0,3})$/i);
			if (result != null) {
				return Jui.rsa.decrypt(key, result[1]);
			}
		}
		return value;
	},

	setFieldDecryptKey: function(key)
	{
		Jui.window.getTop().Utility._fieldDecryptKey = key;
	},

	upload: function(url, args, file, callback, options)
	{
		options 			= options || {};
		var ajax 			= new Utility.Ajax(url);
		ajax.showAnimation 	= false;
		ajax.ignoreError 	= window._ignoreError || options.ignoreError;
		ajax.onsuccess 		= callback;
		ajax.submit(args);
	},

	logToFile: function(level, message)
	{
		var args = {level:level, message:message};
		Utility.invoke("Qs.Misc.WriteLog", args, false, null, {ignoreError:true});
	},

	logToDb: function(level, name, description)
	{
		var args = {level:level, name:name, description:description};
		Utility.invoke("Qs.EventLog.Log", args, false, null, {ignoreError:true});
	},

	getTenantCode: function()
	{
	    return Utility._tenantCode;
	},

	getBaseUrl: function(withEndSlash)
	{
	    var url = Utility._systemBaseUrl;
	    if (Utility._tenantCode) {
	        url += "/tenant/" + Utility._tenantCode;
	    }
	    if (withEndSlash == null) {
	        withEndSlash = !Utility._tenantCode;
	    }
	    return withEndSlash ? url + "/" : url;
	},

	getSystemBaseUrl: function(withEndSlash)
	{
	    var url = Utility._systemBaseUrl;
	    return withEndSlash !== false ? url + "/" : url;
	},
	
	getUrl: function(url, args)
	{
	    var tenantCode = Utility.getTenantCode();
	    if (tenantCode && (/^[^?]+\.(page|data|file|html|htm|js|css)(\?|$)/.test(url) || /^qsvd-report\/frameset/.test(url))) {
	        var baseUrl = Utility._systemBaseUrl;
	        var tenantPath = "tenant/" + tenantCode;
	        if (url.startsWith(baseUrl) && !url.startsWith(baseUrl + "/" + tenantPath)) {
                url = baseUrl + "/" + tenantPath + url.substring(baseUrl.length);
	        }
	        else if (!/^http(s?):[/][/]/.test(url) && !url.startsWith(tenantPath)) {
    	        url = "tenant/" + tenantCode + "/" + url;
	        }
	    }
		url = Utility.processVirtualDirectory(url);
		if (args == null) {
			return url;
		}
		var result = Utility.setUrlParam(url, "args", JSON.stringify(args));
		if (args != null && result.length > 1000) {
			var ret = Utility.syncInvoke("Qs.Misc.putLongUrlArguments", args, null, {ignoreError:true});
			if (ret == null) {
				console.error("failed to put long url arguments to server.", url, args);
				throw "unexpected error: Qs.Misc.putLongUrlArguments";
			}
			url = Utility.removeUrlParam(url, "args");
			result = Utility.setUrlParam(url, "argsKey", ret.key);
		}
		return result;
	},

	getUrlParam: function(url, key)
	{
		url = url || window.location.href;
		var reg = new RegExp("(\\?|&)" + key + "=([^&]*)");
		return reg.test(url) ? RegExp.$2 : null;
	},

	setUrlParam: function(url, key, value)
	{
		var reg = new RegExp("(\\?|&)" + key + "=[^&]*");
		if (reg.test(url))
		{
			url = url.replace(reg, "$1" + key + "=" + encodeURIComponent(value));
		}
		else
		{
			url += (url.indexOf("?") == -1 ? "?" : "&") + key + "=" + encodeURIComponent(value);
		}
		return url;	
	},

	removeUrlParam: function(url, key, ignoreCase)
	{
		var flag = ignoreCase ? "" : "i";
		var reg1 = new RegExp("\\?" + key + "=[^&]*$", flag);
		var reg2 = new RegExp("\\?" + key + "=[^&]*&", flag);
		var reg3 = new RegExp("&" + key + "=[^&]*", flag);
		return url.replace(reg1, "").replace(reg2, "?").replace(reg3, "");
	},

	//-----------------------------------------------------------------------
	// util
	//-----------------------------------------------------------------------
	
	formatText: function(code)
	{
		var text = $text(code);
		for (var i = 1; i < arguments.length; ++i) {
			text = text.replace("${" + (i - 1) + "}", arguments[i]);
		}
		return text;
	},
	
	formatFileSize: function(size)
	{
		if (size == null) {
			return "";
		}
		var units = ["B", "KB", "MB", "GB", "TB", "PB"];
		for (var i = 0; i < units.length; ++i) {
			if (size < 10) {
				return Jui.cast.toString(size, "0.00") + " " + units[i];
			}
			else if (size < 100) {
				return Jui.cast.toString(size, "0.0") + " " + units[i];
			}
			else if (size < 1000 || i == units.length - 1) {
				return Jui.cast.toString(size, "0") + " " + units[i];
			}
			else {
				size = size / 1024;
			}
		}
	},
	
	isUuid: function(s)
	{
		return /^\w{8}-\w{4}-\w{4}-\w{4}-\w{12}$/.test(s);
	},

	addFunctionAlias: function(object)
	{
		for (var property in object) {
			var value = object[property];
			if (property.charAt(0) != "$" && typeof(value) == "function") {
				object["$" + property] = value;
			}
		}
	},

	getTableCellsForExport: function(table)
	{
		return Utility.getTableDataForExport(table).cells;
	},

	getTableDataForExport: function(table)
	{
		var cells = [];
		var matrix = [];
		var columnWidths = [];
		for (var i = 0; i < table.rows.length; ++i) {
			var row = table.rows[i];
			for (var j = 0; j < row.cells.length; ++j) {
				var cell = row.cells[j];
				var item = {
					rowIndex: row.rowIndex,
					colIndex: Utility._getTableColumnIndex(row.rowIndex, cell.cellIndex, matrix)
				};
				if (cell.rowSpan > 1) {
					item.rowSpan = cell.rowSpan;
				}
				if (cell.colSpan > 1) {
					item.colSpan = cell.colSpan;
				}
				else if (typeof columnWidths[item.colIndex] === "undefined") {
					columnWidths[item.colIndex] = cell.offsetWidth;
				}
				if (!Jui.string.isEmpty(cell.innerText)) {
					item.text = cell.innerText;
				}
				var style = Jui.dom.getComputedStyle(cell);
				var properties = {
					color			: "#000000",
					backgroundColor	: "transparent",
					fontWeight		: "400",
					textAlign		: "left"
				};
				for (var key in properties) {
					var value = style[key];
					if (!Jui.string.isEmpty(value) && value != properties[key]) {
						item[key] = value;
					}
				}
				Utility._fillTableSpanMatrix(item, matrix);
				cells.push(item);
			}
		}
		for (var i = 0; i < columnWidths.length; ++i) {
			if (typeof columnWidths[i] === "undefined") {
				columnWidths[i] = -1;
			}
		}
		return {cells: cells, columnWidths: columnWidths};
	},

	_getTableColumnIndex: function(rowIndex, colIndex, matrix)
	{
		var usedCells = matrix[rowIndex];
		if (usedCells == null) {
			return colIndex;
		}
		var count = 0;
		for (var i = 0; ; ++i) {
			if (usedCells[i] != 1) {
				if (count == colIndex) {
					return i;
				}
				++count;
			}
		}
	},

	_fillTableSpanMatrix: function(item, matrix)
	{
		var rowSpan = item.rowSpan || 1;
		var colSpan = item.colSpan || 1;
		if (rowSpan == 1 && colSpan == 1) {
			return;
		}
		for (var i = 0; i < rowSpan; ++i) {
			var rowIndex = item.rowIndex + i;
			for (var j = 0; j < colSpan; ++j) {
				if (i != 0 || j != 0) {
					var colIndex = item.colIndex + j;
					if (matrix[rowIndex] == null) {
						matrix[rowIndex] = [];
					}
					matrix[rowIndex][colIndex] = 1;
				}
			}
		}
	},

	//-----------------------------------------------------------------------
	// resource
	//-----------------------------------------------------------------------

	loadAllTexts: function(map)
	{
		Utility._textMap = map;
	},
	
	getText: function(key)
	{
		var map = Jui.window.getTop().Utility._textMap;
		var value = map[key];
		if (value == null) {
			var ret = Utility.syncInvoke("Qs.TextResource.getText", {keys:[key]});
			value = ret != null && ret.text != null && ret.text.length > 0 ? ret.text[0] : key;
			map[key] = value;
		}
		for (var i = 1; i < arguments.length; ++i) {
			var reg = new RegExp("\\$\\{" + (i - 1) + "\\}", "g");
			value = value.replace(reg, arguments[i]);
		}
		return value;
	},

	loadAllPages: function(properties, pages)
	{
		Utility._pageMap = {};
	    Utility._loadServerDataArray(properties, pages, Utility._pageMap);
	},

	getPage: function(idOrCode)
	{
		var map = Jui.window.getTop().Utility._pageMap;
		var page = map[idOrCode];
		if (page == null) {
			page = Utility.syncInvoke("Qs.Page.getClientItemJson", {pageCode:idOrCode});
			map[page.id] = page;
			map[page.code] = page;
		}
		return page;
	},

	loadAllPageSets: function(properties, pageSets)
	{
		Utility._pageSetMap = {};
	    Utility._loadServerDataArray(properties, pageSets, Utility._pageSetMap);
	},

	getPageSet: function(code, callback)
	{
		var map = Jui.window.getTop().Utility._pageSetMap;
		var pageSet = map[code];
		if (pageSet != null) {
		    callback(pageSet);
		    return;
		}
        Utility.invoke("Qs.PageSet.getClientItemJson", {code: code}, false, function(pageSet) {
            map[pageSet.id] = pageSet;
            map[pageSet.code] = pageSet;
            callback(pageSet);
        });
	},

	loadAllUnits: function(properties, units)
	{
		Utility._unitMap = {};
	    Utility._loadServerDataArray(properties, units, Utility._unitMap);
	},
	
	getUnit: function(unitIdOrCode)
	{
		var map = Jui.window.getTop().Utility._unitMap || {};
		var unit = map[unitIdOrCode];
		if (unit == null) {
			var args = Utility.isUuid(unitIdOrCode) ? {unitId:unitIdOrCode} : {unitCode:unitIdOrCode};
			unit = Utility.syncInvoke("Qs.Unit.getClientItemJson", args);
			map[unit.id] = unit;
			map[unit.code] = unit;
		}
		return unit;
	},

	loadVirtualDirectories: function(list)
	{
		Utility._virtualDirectories = list;
	},

	processVirtualDirectory: function(path)
	{
		if (Jui.string.isEmpty(path) || path.indexOf("/") != -1) {
			return path;
		}
		var list = Jui.window.getTop().Utility._virtualDirectories || [];
		var virtualDirectory = null;
		for (var i = 0; i < list.length; ++i) {
			var item = list[i];
			try {
				if (item.isPlainText) {
					if (item.path.toLowerCase() == path.toLowerCase()) {
						virtualDirectory = item.virtualDirectory;
					}
				}
				else {
					if (path.match(new RegExp(item.path, "i"))) {
						virtualDirectory = item.virtualDirectory;
					}
				}
			}
			catch (e) {
				console.error(e);
			}
		}
		return Jui.string.isEmpty(virtualDirectory) ? path : virtualDirectory + "/" + path;
	},

	getFieldTitle: function(unitCode, fieldName)
	{
		var key = "fieldTitle." + unitCode.replace(/\./g, "-") + "." + fieldName;
		var value = Utility.getCacheItem(key);
		if (value == null) {
			var ret = Utility.syncInvoke("Qs.Field.getTitle", {unitCode:unitCode, fieldName:fieldName});
			if (ret == null) {
				value = unitCode + "." + fieldName;
			}
			else {
				value = ret.fieldTitle;
				Utility.setCacheItem(key, value);
			}
		}
		return value;
	},
	
	loadParameters: function(map)
	{
		Utility._parameterMap = map;
	},
	
	getParameterValue: function(key)
	{
		var map = Jui.window.getTop().Utility._parameterMap;
		var value = map[key];
		return value;
	},
	
	importScript: function(src, addRandomParameter)
	{
		if (addRandomParameter != false) {
			var random = Jui.random.nextUuid().toLowerCase().replace(/-/g, "");
			src = src + (src.indexOf("?") == -1 ? "?r=" : "&r=") + random;
		}
		document.writeln("<script src='" + src + "'></script>");
	},
	
	importCss: function(src, addRandomParameter)
	{
		if (addRandomParameter != false) {
			var random = Jui.random.nextUuid().toLowerCase().replace(/-/g, "");
			src = src + (src.indexOf("?") == -1 ? "?r=" : "&r=") + random;
		}
		document.writeln("<link rel='stylesheet' type='text/css' href='" + src + "'>");
	},

	_loadServerDataArray: function(properties, data, map)
	{
		for (var i = 0; i < data.length; ++i) {
			var array = data[i];
			var item = {};
			for (var j = 0; j < properties.length; ++j) {
				item[properties[j]] = array[j];
			}
			map[item.code] = item;
			map[item.id] = item;
		}
	},

	//-----------------------------------------------------------------------
	// units
	//-----------------------------------------------------------------------

	refreshMenuNumbers: function(unitId)
	{
		var topWindow = Jui.window.getTop();
		if (topWindow.MainFrame != null) {
			var unitIds = Jui.array.wrap(arguments);
			topWindow.MainFrame.refreshMenuNumbers(unitIds);
		}
	},

	//-----------------------------------------------------------------------
	// upload
	//-----------------------------------------------------------------------
	
	selectFile: function(options, callback)
	{
		Jui.upload.selectFile(options, callback);
	},

	selectFileForBatchUpload: function(url, args, options, callback)
	{
		Jui.upload.selectFile(options, function(files) {
			var data = {url:url, args:args, options:options, files:files};
			var dialogOption = options.hasDescription ? {data:data, width:900} : {data:data};
			Utility.openDialog("Qs.Misc.FileBatchUpload.page", null, dialogOption, callback);
		});
	},
	
	setFileDropZone: function(element, options, callback)
	{
		Jui.upload.setFileDropZone(element, options, callback);
	},
	
	setFileDropZoneForBatchUpload: function(element, url, args, options, callback)
	{
		Jui.upload.setFileDropZone(element, options, function(files) {
			var data = {url:url, args:args, options:options, files:files};
			var dialogOption = options.hasDescription ? {data:data, width:900} : {data:data};
			Utility.openDialog("Qs.Misc.FileBatchUpload.page", null, dialogOption, callback);
		});
	},

	//-----------------------------------------------------------------------
	// cache
	//-----------------------------------------------------------------------

	getCacheItem: function(key)
	{
		return Utility._cacheManager.getItem(key);
	},

	setCacheItem: function(key, value)
	{
		Utility._cacheManager.setItem(key, value);
	},

	deleteCacheItem: function(key)
	{
		Utility._cacheManager.deleteItem(key);
	},

	getCacheItems: function(keys, prefix)
	{
		return Utility._cacheManager.getItems(keys, prefix);
	},

	setCacheItems: function(keys, values, prefix)
	{
		Utility._cacheManager.setItems(keys, values, prefix);
	},

	clearCache: function()
	{
		Utility._cacheManager.clearCache();
	}
};

//-----------------------------------------------------------------------
// AJAX
//-----------------------------------------------------------------------

Utility.Ajax = function(url, args)
{
	this.url				= /\.data($|\?)/.test(url) ? url : url + ".data";
	this.args				= args;
	this.showAnimation		= false;
	this.onsuccess			= null;
	this.onfailure			= Utility.Ajax.defaultFailureHandler;
	this.onuploadprogress	= null;
	this._status			= Utility.Ajax.STATUS_NEW;
};

Utility.Ajax.STATUS_NEW		= 0;
Utility.Ajax.STATUS_SENDING = 1;
Utility.Ajax.STATUS_LOAD	= 2;
Utility.Ajax.STATUS_ERROR 	= 3;
Utility.Ajax.STATUS_ABORT 	= 4;
Utility.Ajax.STATUS_TIMEOUT	= 5;

Utility.Ajax.doLoad = function(event)
{
	event.target._ajax._finish(event, Utility.Ajax.STATUS_LOAD);
};

Utility.Ajax.doError = function(event)
{
	event.target._ajax._finish(event, Utility.Ajax.STATUS_ERROR);
};

Utility.Ajax.doAbort = function(event)
{
	event.target._ajax._finish(event, Utility.Ajax.STATUS_ABORT);
};

Utility.Ajax.doTimeout = function(event)
{
	event.target._ajax._finish(event, Utility.Ajax.STATUS_TIMEOUT);
};

Utility.Ajax.doLoadEnd = function(event)
{
	event.target._ajax._cleanup();
};

Utility.Ajax.doUploadProgress = function(event)
{
	var xhr = event.target;
	var ajax = xhr._ajax;
	if (ajax.onuploadprogress != null) {
		var ratio = event.lengthComputable ? event.loaded / event.total : null; 
		ajax.onuploadprogress(event, ratio);
	}
};

Utility.Ajax._logHttpError = function(httpStatus, url, message)
{
	var description = "status:" + httpStatus
					+ ", browser:" + Jui.browser.type 
					+ ", url:" + url 
					+ ", message:" + message;
	Utility.logToDb("error", "HTTP failed", description);
};

window.ondblclick = function()
{
	Utility.logToDb("info", "double click", "user double click");
};

Utility.Ajax._createAndOpenXmlHttpRequest = function(url, async)
{
	url = Utility.getUrl(url);
	var xhr = new XMLHttpRequest();
	xhr.open("POST", url, async);
	xhr.setRequestHeader("Cache-Control", "no-store, no-cache");
	if (typeof(clientData) != "undefined" && clientData.pageCode != null) {
		xhr.setRequestHeader("Qs-PageCode", clientData.pageCode);
	}
	return xhr;
};

Utility.Ajax._parseXmlHttpRequestResponse = function(xhr, status)
{
	var result			= {};
	var text 			= xhr.responseText;
	result.success		= false;
	result.httpStatus	= xhr.status;
	if (status == Utility.Ajax.STATUS_ABORT) {
		result.errorMessage = $text("Qs.Ajax.AbortAlert");
		console.warn("AJAX aborted. URL: %s", xhr._ajax.url);
	}
	else if (status == Utility.Ajax.STATUS_TIMEOUT) {
		result.errorMessage = $text("Qs.Ajax.TimeoutAlert");
	}
	else if (xhr.status == 200) {
		try {
			result.json = JSON.parse(text);
			result.success = !result.json._failed;
			if (!result.success) {
				result.errorMessage = result.json.message;
				if (result.json.code === "Qs.Auth.SessionInvalid") {
					Utility.postMessage(Jui.window.getTop(), {action: "login"});
				}
			}
		}
		catch (e) {
			result.errorMessage = Utility.formatText("Qs.Ajax.JsonFormatInvalid", text);
		}
	}
	else {
		if (/<\/html>/.test(text)) {
			result.errorMessage = $text("Qs.Ajax.ErrorWithHtml");
			result.errorHtml = text;
		}
		else if (!Jui.string.isEmpty(text)) {
			result.errorMessage = Utility.formatText("Qs.Ajax.ErrorWithMessage", text);
		}
		else {
			console.error("XMLHttpRequest failed. status=%d, url=%s", xhr.status, this.url);
			result.errorMessage = $text("Qs.Ajax.ErrorWithoutMessage");
		}
	}
	return result;
};

Utility.Ajax.showError = function(result)
{
	if (result.json != null) {
		Utility.showError(result.json);
	}
	else if (result.errorHtml != null) {
		Jui.message.alert(result.errorHtml); //TODO HTML5 show HTML content
	}
	else if (result.errorMessage != null) {
		Jui.message.alert(result.errorMessage);
	}
},

Utility.Ajax.defaultFailureHandler = function(event)
{
	Utility.Ajax.showError(this.result);
},

Utility.Ajax.prototype = 
{
	submitFile: function(file)
	{
		var data = new FormData();
		data.append("args", encodeURIComponent(JSON.stringify(this.args || {})));
		data.append("file", file);
		this.submit(data);
	},

	submit: function(data)
	{
		var ajax 				= this;
		var xhr 				= Utility.Ajax._createAndOpenXmlHttpRequest(ajax.url, true);
		ajax._xhr				= xhr;
		xhr._ajax				= ajax;
		xhr.upload._ajax		= ajax;
		xhr.onload 				= Utility.Ajax.doLoad;
		xhr.onerror 			= Utility.Ajax.doError;
		xhr.onabort 			= Utility.Ajax.doAbort;
		xhr.ontimeout			= Utility.Ajax.doTimeout;
		xhr.upload.onprogress	= Utility.Ajax.doUploadProgress;
		if (ajax.showAnimation) {
			ajax._progressBar = Jui.message.progress(function(){xhr.abort();});
		}
		if (data == null) {
			xhr.send(JSON.stringify(this.args || {}));
		}
		else {
			xhr.send(data);
		}
		ajax._status = Utility.Ajax.STATUS_SENDING;
	},

	abort: function()
	{
		this._xhr.abort();
	},
	
	isLoad: function()
	{
		return this._status == Utility.Ajax.STATUS_LOAD;
	},

	isError: function()
	{
		return this._status == Utility.Ajax.STATUS_ERROR;
	},

	isAbort: function()
	{
		return this._status == Utility.Ajax.STATUS_ABORT;
	},

	isTimeout: function()
	{
		return this._status == Utility.Ajax.STATUS_TIMEOUT;
	},
	
	_finish: function(event, status)
	{
		var ajax 		= this;
		var xhr 		= ajax._xhr;
		ajax._status	= status;
		if (ajax._progressBar != null) {
			ajax._progressBar.close();
			ajax._progressBar = null;
		}
		ajax.result = Utility.Ajax._parseXmlHttpRequestResponse(xhr, status);
		if (ajax.result != null && ajax.result.success) {
			if (ajax.onsuccess != null) {
				ajax.onsuccess(ajax.result.json);
			}
		}
		else if (!ajax.ignoreError) {
			try {
				if (ajax.onfailure != null) {
					ajax.onfailure(event);
				}
			}
			finally {
				if (xhr.status != 200) {
					Utility.Ajax._logHttpError(xhr.status, ajax.url, xhr.responseText);
				}
			}
		}
	},
	
	_cleanup: function()
	{
		var ajax			= this;
		var xhr 			= ajax._xhr;
		xhr._ajax			= null;
		ajax._xhr			= null;
		xhr.upload._ajax	= null;
	}
};

//-----------------------------------------------------------------------
// UrlBuilder
//-----------------------------------------------------------------------

Utility.UrlBuilder = function(url)
{
	this.url = url;
};

Utility.UrlBuilder.prototype =
{
	set: function(key, value)
	{
		this.url = Utility.setUrlParam(this.url, key, value);
		return this;
	},
	
	remove: function(key)
	{
		this.url = Utility.removeUrlParam(this.url, key);
		return this;
	},
	
	toString: function()
	{
		return this.url;
	}
};

//-----------------------------------------------------------------------
// Random
// http://davidbau.com/encode/seedrandom.js
// TODO Utility.Random is only used in Chart.js, remove it later 
//-----------------------------------------------------------------------

Utility.Random = function(seed)
{
    this.width 			= 256;
    this.mask 			= this.width - 1;
    this.chunks			= 6;
    this.startdenom		= Math.pow(this.width, this.chunks),
    this.significance	= Math.pow(2, 52),
    this.overflow		= this.significance * 2;
	this.seed			= seed + "";
	
    var key = [];
    for (var i = 0; i < this.seed.length; ++i) {
    	var index = this.mask & i;
    	var temp = index < key.length ? key[index] * 19 : 0; 
    	key[index] = this.mask & (temp + this.seed.charCodeAt(i));
    }
    this.algo = new Utility.Random.Algorithm(key, this.width, this.mask);
};

Utility.Random.Algorithm = function(key, width, mask)
{
    var t, keylen = key.length,
        me = this,
        i = 0,
        j = me.i = me.j = 0,
        s = me.S = [];

    // The empty key [] is treated as [0].
    if (!keylen) {
        key = [keylen++];
    }

    // Set up S using the standard key scheduling algorithm.
    while (i < width) {
        s[i] = i++;
    }
    for (i = 0; i < width; i++) {
        s[i] = s[j = mask & (j + key[i % keylen] + (t = s[i]))];
        s[j] = t;
    }

    (me.g = function (count) {
        var t, r = 0,
            i = me.i,
            j = me.j,
            s = me.S;
        while (count--) {
            t = s[i = mask & (i + 1)];
            r = r * width + s[mask & ((s[i] = s[j = mask & (j + t)]) + (s[j] = t))];
        }
        me.i = i;
        me.j = j;
        return r;
    })(width);
};

Utility.Random.prototype =
{
	nextInt: function(bound)
	{
		return Math.floor(this.nextFloat() * bound);
	},
	
	nextFloat: function()
	{
        var n = this.algo.g(this.chunks);	// Start with a numerator n < 2 ^ 48
        var d = this.startdenom; 			//   and denominator d = 2 ^ 48.
        var x = 0; 							//   and no 'extra last byte'.
        while (n < this.significance) { 	// Fill up all significant digits by
            n = (n + x) * this.width; 		//   shifting numerator and
            d *= this.width; 				//   denominator and generating a
            x = this.algo.g(1); 			//   new least-significant-byte.
        }
        while (n >= this.overflow) { 		// To avoid rounding up, before adding
            n /= 2; 						//   last byte, shift everything
            d /= 2; 						//   right using integer math until
            x >>>= 1; 						//   we have exactly the desired bits.
        }
        return (n + x) / d; 				// Form the number within [0, 1).
	},
	
    _mixkey: function(seed)
    {
        var key = [];
        for (var i = 0, s = seed + ""; i < s.length; ++i) {
        	key[this.mask & i] = this.mask & (key[this.mask & i] * 19 + s.charCodeAt(i));
        }
        return key;
    }
};

//-----------------------------------------------------------------------
// cache
//-----------------------------------------------------------------------

Utility.ClientCache = function(){};

Utility.ClientCache.prototype =
{
	getItem: function(key)
	{
		var keyParts = key.split(".");
		var hash = this._getItemHash(keyParts);
		return hash && hash[keyParts[keyParts.length - 1] + "__"];
	},

	setItem: function(key, value)
	{
		var keyParts = key.split(".");
		var hash = this._getItemHash(keyParts, true);
		hash[keyParts[keyParts.length - 1] + "__"] = value;
	},

	deleteItem: function(key)
	{
		var keyParts = key.split(".");
		var hash = this._getItemHash(keyParts);
		if (hash != null) {
			delete hash[keyParts[keyParts.length - 1] + "__"];
		}
	},

	getItems: function(keys, prefix)
	{
		var ret = [];
		for (var i = 0; i < keys.length; ++i) {
			var key = prefix == null ? keys[i] : prefix + keys[i];
			ret.push(this.getItem(key));
		}
		return ret;
	},

	setItems: function(keys, values, prefix)
	{
		for (var i = 0; i < keys.length; ++i) {
			var key = prefix == null ? keys[i] : prefix + keys[i];
			this.setItem(key, values[i]);
		}
	},

	clear: function()
	{
		Jui.window.getTop()._cache = {};
	},

	_getItemHash: function(keyParts, createIfNotExists)
	{
		var wnd = Jui.window.getTop();
		if (wnd._cache == null) {
			wnd._cache = {};
		}
		var hash = wnd._cache;
		for (var i = 0; i < keyParts.length - 1; ++i) {
			var keyPart = keyParts[i];
			if (!(keyPart in hash)) {
				if (createIfNotExists) {
					hash[keyPart] = {};
				}
				else {
					return null;
				}
			}
			hash = hash[keyPart];
		}
		return hash;
	}
};

//-----------------------------------------------------------------------
// Base64
//-----------------------------------------------------------------------

var Base64Util =
{
	ENCODE_MAP:
	[
		'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J',
		'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T',
		'U', 'V', 'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd',
		'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n',
		'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x',
		'y', 'z', '0', '1', '2', '3', '4', '5', '6', '7',
		'8', '9', '+', '/'
	],
	
	DECODE_MAP:
	[
		-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
		-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
		-1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, 62, -1, -1, -1, 63,
		52, 53, 54, 55, 56, 57, 58, 59, 60, 61, -1, -1, -1, -1, -1, -1,
		-1,  0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14,
		15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, -1, -1, -1, -1, -1,
		-1, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40,
		41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, -1, -1, -1, -1, -1
	],

	encode: function(s)
	{
		var bytes = typeof(s) == "string" ? Base64Util._stringToBytes(s) : s;
		var n = bytes.length;
		var buffer = [];
		for (var i = 0; i < n; i += 3) {
			var count = Math.min(3, n - i);
			var data = 0;
			for (var j = 0; j < count; ++j) {
				data |= (bytes[i + j] & 0xFF) << (16 - 8 * j);
			}
			for (var j = 0; j <= count; ++j) {
				buffer.push(Base64Util.ENCODE_MAP[(data >> (18 - 6 * j)) & 0x3F]);
			}
		}
		while (buffer.length % 4 != 0) {
			buffer.push('=');
		}
		return buffer.join("");
	},

	decode: function(s)
	{
		var n = s.length;
		while (n > 0 && s.charAt(n - 1) == '=') {
			--n;
		}
		var bytes = [];
		for (var i = 0; i < n; i += 4) {
			var count = Math.min(3, n - i - 1);
			var data = 0;
			for (var j = 0; j <= count; ++j) {
				data |= Base64Util.DECODE_MAP[s.charCodeAt(i + j)] << (18 - 6 * j);
			}
			for (var j = 0; j < count; ++j) {
				bytes.push((data >> (16 - 8 * j)) & 0xFF);
			}
		}
		return bytes;
	},

	decodeToString: function(s)
	{
		var bytes = Base64Util.decode(s);
		return Base64Util._bytesToString(bytes);
	},

	_stringToBytes: function(s)
	{
		var bytes = [];
		for(var i = 0; i < s.length; ++i) {
			var c = s.charCodeAt(i);
			if (c <= 0x007F) {
				bytes.push(c);
			}
			else if (c <= 0x07FF) {
				bytes.push(0xC0 | ((c >> 6) & 0x1F));
				bytes.push(0x80 | (c & 0x3F));
			}
			else {
				bytes.push(0xE0 | ((c >> 12) & 0x0F));
				bytes.push(0x80 | ((c >> 6) & 0x3F));
				bytes.push(0x80 | (c & 0x3F));
			}
		}
		return bytes;
	},

	_bytesToString: function(bytes)
	{
		var buffer = [];
		for (var i = 0; i < bytes.length; ) {
			var b = bytes[i++];
			var h = b >> 4;
			if (h >= 12 && h <= 13) { // 110x xxxx, 10xx xxxx
				var b2 = bytes[i++];
				b = ((b & 0x1F) << 6) | (b2 & 0x3F);
			}
			else if (h == 14) { // 1110 xxxx, 10xx xxxx, 10xx xxxx
				var b2 = bytes[i++];
				var b3 = bytes[i++];
				b = ((b & 0x0F) << 12) | ((b2 & 0x3F) << 6) | (b3 & 0x3F);
			}
			buffer.push(String.fromCharCode(b));
		}
		return buffer.join("");
	}
};

//-----------------------------------------------------------------------
// alias/shortcuts
//-----------------------------------------------------------------------

var $text = Utility.getText;

var $fieldTitle = Utility.getFieldTitle;

var $elem = function(key)
{
	if (typeof(key) === "object") {
		return key;
	}
	else if (typeof(key) === "string") {
		return document.getElementById(key); 
	}
};

//-----------------------------------------------------------------------
// initialization
//-----------------------------------------------------------------------

(function() {
	var scripts = document.getElementsByTagName("script");
	var currentScriptSrc = scripts[scripts.length - 1].src;
    var baseUrl = currentScriptSrc.replace(/\?.*$/, "").replace(/\/quicksilver\/page\/util\/Utility\.js(\?[^/]*)?$/, "");
    var pagePath = location.href.substring(baseUrl.length);
    var tenantCode = /^\/tenant\/([a-z0-9_-]+)([/?]|$)/.test(pagePath) ? RegExp.$1 : null;
    Utility._systemBaseUrl = baseUrl; // without tail slash
    Utility._tenantCode = tenantCode;

	var language = /\?language=([^&]+)/.test(currentScriptSrc) ? RegExp.$1 : "en-us";
	var args = encodeURIComponent("{language:\"" + language + "\"}");
	Utility.importCss("Qs.Language.GetFontCss.script?args=" + args, false);
	if (window == Jui.window.getTop()) {
		Utility.importScript("Qs.Misc.GetScript.script?args=" + args, false);
		Utility.importScript("Qs.TextResource.GetFullScript.script?args=" + args, false);	
		Utility.importScript("Qs.Page.GetFullScript.script?args=" + args, false);	
		Utility.importScript("Qs.Unit.GetFullScript.script?args=" + args, false);
		Utility.importScript("Qs.SpecialPath.GetFullScript.script?args=" + args, false);	
	}
	
	Utility._cacheManager = new Utility.ClientCache();
	Jui.i18n.setTextGetter(Utility.getText);
	window.addEventListener("message", Utility.doMessage);

    window.addEventListener('keydown', function() {
    	var onSelect = Utility.getParameterValue('onSelect');
    	var keyboardCtrlP = Utility.getParameterValue('keyboardCtrlP');
    	var keyboardCtrlC = Utility.getParameterValue('keyboardCtrlC');
    	if (event.keyCode == 8) {
        	var elem = event.srcElement;
        	var tag = event.srcElement.tagName.toLowerCase();
        	return tag == "text" || tag == "textarea" || (tag == "input" && !elem.readOnly);
        }
    	if (keyboardCtrlP && event.ctrlKey == true && event.keyCode == 80 ) {
            event.keyCode = 0;
            Jui.event.stop();
	    }
	    if (onSelect && event.shiftKey == true && (event.keyCode == 37||event.keyCode==39)) {
            event.keyCode = 0;
            Jui.event.stop();
	    }
	    if (keyboardCtrlC && event.ctrlKey == true && event.keyCode == 67 ) {
            event.keyCode = 0;
            Jui.event.stop();
	    }
    }, true);

    window.addEventListener('contextmenu', function()
    {
    	if (Utility.getParameterValue('rightClick')) {
    		Jui.event.stop();
    	}
    });

    window.addEventListener('selectstart', function()
    {
    	if (Utility.getParameterValue('onSelect')) {
    		Jui.event.stop();
    	}
    });
})();

