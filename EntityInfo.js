var EntityInfo = 
{
	menuCollapse: clientData.menuCollapse,
	
	contentMap: {}, 
	
	currentPageCode: null, 
	
	firstPageCode: clientData.pages[0].id,

	unloadedPages: {},
	
	pages: [],
	
	groupPages: [],

	initPageCode: null,
	
	leadingPageCodes: [],
	
	AVATAR_SUPPORT: "quicksilver/image/other/User-128.png",
	AVATAR_NOT_SUPPORT: "quicksilver/image/48/Edit.gif",
	newPictureId:null,
	supportAvatar: clientData.supportAvatar,
	pictureId: clientData.pictureId,
	pictureIds: clientData.pictureIds || [],
	avatarPopup: null,
	fileSelectOptions: {typePattern:"^image/", accept: "image/*", maxSize: 10 * 1024 * 1024},
	
	
	supportTag: clientData.supportTag,
	tag: clientData.tag,
	
	doLoad: function()
	{
		if (EntityInfo.supportAvatar) {
			var html 	= "<div class=AvatarPopup>"
						+	"<div class=AvatarPopupContent>" 
						+		"<div class=AvatarPopupButtonContainer></div>"
						+	"</div>"
						+ "</div>";
			EntityInfo.avatarPopup = Jui.dom.insertHtml(document.body, 'BeforeEnd', html);
			Jui.basic.Button.create({
				target	: EntityInfo.avatarPopup.firstChild.firstChild, 
				text	: $text("Public.Upload"), 
				icon	: "quicksilver/image/16/Upload.gif", 
				onclick	: EntityInfo.doAvatarUploadButtonClick
			});
			Jui.basic.Button.create({
				target	: EntityInfo.avatarPopup.firstChild.firstChild, 
				text	: $text("Qs.Picture.UsedAvatar"), 
				icon	: "quicksilver/image/16/Clock.png", 
				onclick	: EntityInfo.doAvatarHistoryButtonClick,
				disabled: EntityInfo.pictureIds.length == 0
			});
			$elem("Avatar").onmouseover = EntityInfo.doAvatarMouseOver;
			EntityInfo.avatarPopup.firstChild.onclick = EntityInfo.doAvatarClick;
			EntityInfo.avatarPopup.firstChild.firstChild.onclick = EntityInfo.doButtonContainerClick;
			EntityInfo.avatarPopup.onmouseover = EntityInfo.doAvatarPopupMouseOver;
			EntityInfo.avatarPopup.firstChild.onmouseover = EntityInfo.doAvatarPopupContentMouseOver;
		}
		EntityInfo.setAvatar(EntityInfo.pictureId);

		if (EntityInfo.tag != null) {
			EntityInfo.tagView = Jui.option.TagView.create({
				target			: "TagCell",
				autoCollapse 	: true,
				items			: EntityInfo.tag.items,
				values			: EntityInfo.tag.values,
				ontagadd		: EntityInfo.doTagViewItemAdd,
				onmenuclick     : CommonBusiness.getTagViewMenuClickHandler(),
				ontagheaddelete : EntityInfo.saveEntityTags,
				ontagclick		: EntityInfo.saveEntityTags,
				ontagfoldercheckclick: EntityInfo.saveEntityTags
			});
		}
		
		var toggleButton = Jui.dom.insertHtml($elem("LeftZone"), "BeforeEnd", '<div id="ToggleButton" class="ToggleButton"></div>');
		toggleButton.onclick = EntityInfo.doToggleButtonClick;
		Jui.dom.setAttribute($elem("LeftZone"), "Direction", "Left");
		$elem("HintClose").onclick = EntityInfo.hideHint;
		EntityInfo.tree = Jui.option.Tree.create({
			target		: "LeftZone",
			onleafclick	: EntityInfo.doTreeLeafClick,
			style		: "height:100%;width:100%;padding-left:6px;overflow:auto"
		});
		EntityInfo.resizer = Jui.option.Resizer.create({elements:["LeftZone", "ContentZone"]});
		Jui.dom.setInnerText($elem("TypeAndName"), clientData.typeAndName);

		EntityInfo.initPageProperties();
		EntityInfo.tree.load(EntityInfo.groupPages);
		EntityInfo.tree.expandLevel(1);
		EntityInfo.tree.setCurrentId(EntityInfo.initPageCode);
		EntityInfo.doTreeLeafClick();
		if (clientData.viewPage != null || EntityInfo.menuCollapse) {
			EntityInfo.doToggleButtonClick();
		}
	},

	doTagViewItemAdd: function(json)
	{
		json.unitId = clientData.unitId;
		CommonBusiness.createTag(json);
	},

	saveEntityTags: function()
	{
		if (clientData.entityId != null) {
			CommonBusiness.saveEntityTags(clientData.unitId, clientData.entityId, EntityInfo.tagView.getValues(), function () {
				Jui.message.hint($text("Public.OperationSuccess"));
			});
		}
	},
	
	doAvatarClick: function()
	{
		Jui.event.stopPropagation();
		if (EntityInfo.supportAvatar && EntityInfo.pictureId != null) {
			var args = {pictureId: EntityInfo.pictureId, size:'big'};
			if (Utility.isInDialog()) {
				Utility.openDialog("Qs.Picture.View.page", args);
			}
			else {
				Utility.openTab("Qs.Picture.View.page", args);
			}
		}
	},
	
	doButtonContainerClick: function()
	{
		Jui.event.stopPropagation();
	},
	
	doAvatarMouseOver: function()
	{
		EntityInfo.avatarPopup.setAttribute("Show", true);
	},
	
	doAvatarPopupMouseOver: function()
	{
		EntityInfo.avatarPopup.removeAttribute("Show");
	},
	
	doAvatarPopupContentMouseOver: function()
	{
		Jui.event.stopPropagation();
	},
	
	doAvatarUploadButtonClick: function()
	{
		EntityInfo.avatarPopup.removeAttribute("Show");
		Utility.selectFile(EntityInfo.fileSelectOptions, function(files) {
			EntityInfo.openAvatarEditPage(files[0]);
		});
	},
	
	doAvatarHistoryButtonClick: function()
	{
		EntityInfo.avatarPopup.removeAttribute("Show");
		var args = {unitId: clientData.unitId, entityId: clientData.entityId};
		Utility.openDialog("Qs.Picture.AvatarList.page", args, CommonBusiness.defaultSelectDialogOptions, function(ret){
			EntityInfo.setAvatar(ret.pictureId);
		});
	},
	
	openAvatarEditPage: function(file)
	{
		var unitId = clientData.unitId;
		var entityId = clientData.entityId;
		var args = {fileSelectOptions:EntityInfo.fileSelectOptions, unitId: unitId, entityId: entityId};
		var options = {data:{file:file}};
		Utility.openDialog("Qs.Picture.AvatarEdit.page", args, options, function(ret) {
			EntityInfo.newPictureId = ret.pictureId;
			EntityInfo.setAvatar(ret.pictureId);
		});
	},
	
	setAvatar: function(pictureId)
	{
		if (EntityInfo.supportAvatar) {
			EntityInfo.pictureId = pictureId;
			if (pictureId == null) {
				$elem("Avatar").src = EntityInfo.AVATAR_SUPPORT;
			}
			else {
				var pictureArgs = {pictureId:pictureId, size:'small'};
				$elem("Avatar").src = Utility.getUrl("Qs.Picture.view.file", pictureArgs);
			}
		}
		else {
			$elem("Avatar").src = EntityInfo.AVATAR_NOT_SUPPORT;
		}
	},
	
	initPageProperties: function()
	{
		var pages = clientData.pages;
		var datalinkPages = clientData.datalinkPages;
		var leadingPageCodes = [pages[0].id];
		if (clientData.urlArgs.entityId == null || clientData.urlArgs.isCopy) {
			for (var i = 1; i < pages.length; ++i) {
				pages[i].disabled = true;
			}
			for (var i = 0; i < datalinkPages.length; ++i) {
				datalinkPages[i].disabled = true;
			}
		}
		else if (clientData.viewPage != null) {
			pages.unshift(clientData.viewPage);
			leadingPageCodes.unshift(clientData.viewPage.id);
		}
		pages = pages.concat(datalinkPages);
		
		var groupMap = Jui.array.toMap(clientData.groups, "id");
		var groupPages = [];
		for (var i = 0; i < pages.length; i++) {
			var page = pages[i];
			if (page.groupId in groupMap) {
				var group = groupMap[page.groupId];
				if (group.children == null) {
					group.children = [];
					groupPages.push(group);
				}
				group.children.push(page);
			}
			else {
				groupPages.push(page);
			}
		}
		
		var initPageCode = pages[0].id;
		if (clientData.urlArgs.slavePageCode != null) {
			for (var i = 0; i < pages.length; ++i) {
				if (pages[i].id == clientData.urlArgs.slavePageCode) {
					initPageCode = pages[i].id;
				}
			}
			delete clientData.urlArgs.slavePageCode;
		}
		
		EntityInfo.pages = pages;
		EntityInfo.groupPages = groupPages;
		EntityInfo.initPageCode = initPageCode;
		EntityInfo.leadingPageCodes = leadingPageCodes;
	},
	
	doToggleButtonClick: function()
	{
		var me = this;
		var currentDirection = $elem("LeftZone").getAttribute("Direction");
		var turnDirection = currentDirection == "Left" ? "Right" : "Left";
		var treeTextElementHandler = null;
		var treeCurrentId = EntityInfo.tree.getCurrentId();
		Jui.dom.tagAttribute($elem("QsContent"), "data-collapsed", turnDirection == 'Right');
		if (turnDirection == 'Right') {
			EntityInfo.tree.load(EntityInfo.pages);
			EntityInfo.tree.setCurrentId(treeCurrentId);
			EntityInfo.resizer.setVisible(false);
			$elem("LeftZone")._lastWidth = $elem("LeftZone").offsetWidth;
			$elem("ContentZone")._lastLeft = $elem("ContentZone").offsetLeft;
			$elem("LeftZone").style.width = "28px";
			$elem("ContentZone").style.left = "28px";
			treeTextElementHandler = function(element) {
				Jui.dom.setAttribute(element, "title", element.firstChild.innerText);
			};
		}
		else {
			EntityInfo.tree.load(EntityInfo.groupPages);
			EntityInfo.tree.setCurrentId(treeCurrentId);
			EntityInfo.tree.expandLevel(1);
			$elem("LeftZone").style.width = $elem("LeftZone")._lastWidth + "px";
			$elem("ContentZone").style.left = $elem("ContentZone")._lastLeft + "px";
			EntityInfo.resizer.setVisible(true);
			treeTextElementHandler = function(element) {
				Jui.dom.removeAttribute(element, "title");
			}
		}
		var treeTextElements = Jui.dom.getElementsByClassName(EntityInfo.tree.element, "JuiTreeTextCell");
		for (var i = 0; i < treeTextElements.length; i++) {
			treeTextElementHandler(treeTextElements[i]);
		}
		Jui.dom.setAttribute($elem("LeftZone"), "Direction", turnDirection);
	},
	
	doTreeLeafClick: function()
	{
		var node = EntityInfo.tree.getCurrentNode();
		if (node.hasOwnProperty("type")) {
			EntityInfo.doDataLinkLeafClick(node);
		} 
		else {
			EntityInfo._activatePage(node);
		}
	},
	
	doDataLinkLeafClick : function(node)
	{
		var srcEntityId = clientData.entityId;
		var args = {entityId : node.id, srcEntityId : srcEntityId};
		Utility.invoke("Qs.DataLink.filterUrlAddress", args, true, function(ret) {
			var urlAddress = Utility.getUrl(ret.FUrlAddress);
			var mode = ret.FOpenMode;
			node = Jui.object.merge(node, {data : urlAddress}, true); 
			if (mode == 'Tab') {
				Utility.openTab(node.data,null, node.text, node.icon);	
			} 
			else if (mode == 'Window') {
				window.open(Jui.util.getFullUrl(node.data), "_blank");
			} 
			else if (mode == 'SlavePage') {
				EntityInfo._activatePage(node);
			}
		});	
	},
	
	reloadFirstPage: function()
	{
		EntityInfo.leadingPageCodes.forEach(function(code) {
			var frame = EntityInfo.contentMap[code];
			if (frame != null) {
				setTimeout(function(){frame.src = frame.src;}, 0);
			}
		});
	},

	showSubPage: function(pageCode)
	{
		var map = Jui.array.toMap(clientData.pages, "id");
		var page = map[pageCode];
		if (page == null) {
			throw "subpage '" + pageCode + "' not exist.";
		}
		EntityInfo.tree.setCurrentId(page.id);
		EntityInfo._activatePage(page);
	},

	unloadSubPage: function(pageCode)
	{
		if (pageCode in EntityInfo.contentMap) {
			EntityInfo.unloadedPages[pageCode] = 1;
		}
	},
	
	unloadAllSubPagesExceptTheFirstOne: function()
	{
		for (var i = 1, pages = clientData.pages; i < pages.length; ++i) {
			EntityInfo.unloadedPages[pages[i].id] = 1;
		}
	},
	
	isSubPageWindow: function(wnd)
	{
		for (var id in EntityInfo.contentMap) {
			try {
				var frame = EntityInfo.contentMap[id];
				if (frame.contentWindow == wnd) {
					return true;
				}
			}
			catch (e) {
			}
		}
		return false;
	},

	//-----------------------------------------------------------------------
	// private
	//-----------------------------------------------------------------------

	_activatePage: function(node)
	{
		var pageCode = node.id;
		if (pageCode == EntityInfo.currentPageCode) {
			return;
		}
		var frame = EntityInfo.contentMap[pageCode];
		if (frame == null || pageCode in EntityInfo.unloadedPages) {
			var args;
			if (pageCode == clientData.unitCode + ".View") {
				args = {entityId: clientData.entityId, isSlavePage: true};
			}
			else if (pageCode == clientData.unitCode + ".Form" || pageCode == clientData.unitCode + ".Edit") {
				args = Jui.object.merge({}, clientData.urlArgs);
			}
			else {
				args = {masterUnitId: clientData.unitId, masterEntityId: clientData.entityId};
			}
			args.addToLastOpen = false;
			if (frame == null) {
				var html = "<iframe tabIndex='-1'></iframe>";
				var cell = $elem("ContentZone");
				Jui.dom.insertHtml(cell, "BeforeEnd", html);
				frame = cell.lastChild;
				EntityInfo.contentMap[pageCode] = frame;
			}
			if (node.hasOwnProperty("type")) {
				frame.src = node.data;
			}
			else {
				frame.src = Utility.getUrl(node.data, args);
			}
			delete EntityInfo.unloadedPages[pageCode];
		}
		Jui.dom.setInnerText($elem("SlavePageNameCell"), node.text);
		$elem("SlavePageNameCell").style.backgroundImage = "url(" + node.icon + ")";
		if (EntityInfo.currentPageCode != null) {
			Jui.dom.removeClass(EntityInfo.contentMap[EntityInfo.currentPageCode], "Current");
		}
		Jui.dom.addClass(EntityInfo.contentMap[pageCode], "Current");
		EntityInfo.currentPageCode = pageCode;
	},
	
	showHint: function(content)
	{
		$elem("SlavePageNameCell").style.display = "none";
		$elem("HintCell").style.display = "block";
		$elem("HintContent").innerHTML = content;
		return $elem("HintContent");
	},
	
	hideHint: function()
	{
		$elem("SlavePageNameCell").style.display = "block";
		$elem("HintCell").style.display = "none";
	}
};

if (!Jui.string.isEmpty(clientData.entityName)) {
	Utility.setTabTitle(clientData.entityName);
}

Utility.addFunctionAlias(EntityInfo);

