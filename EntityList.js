var EntityList =
{
	//-----------------------------------------------------------------------
	// data
	//-----------------------------------------------------------------------

	hasTree: !!clientData.hasTree,

	hasQueryForm: clientData.queryFormJson != null && clientData.queryFormJson.length > 0,

	hasQuerySchemaBox: Jui.cast.toBool(clientData.urlArgs.hasQuerySchemaBox, !!clientData.hasQuerySchemaBox),

	hasKeywordBox: Jui.cast.toBool(clientData.urlArgs.hasKeywordBox, !!clientData.hasKeywordBox),

	hasQuickQueryBox: Jui.cast.toBool(clientData.urlArgs.hasQuickQueryBox, !!clientData.hasQuickQueryBox),

	querySchemaBoxEnabled: Jui.cast.toBool(clientData.urlArgs.querySchemaBoxEnabled, true),
	
	tree: null,
	
    defaultTreeLevel: clientData.defaultTreeLevel || 2,

	showLeftZone: clientData.showLeftZone,
	
	showTagView: !!clientData.showTagView,
	
	isSlavePage: clientData.isSlavePage,
	
	relationId: clientData.relationId,

	listId: clientData.listId,

	editId: clientData.editId || clientData.urlArgs.editId,

	defaultSchema: clientData.defaultSchema,

	isSelect: clientData.urlArgs.isSelect,
	
	isEnterSelect: clientData.urlArgs.isEnterSelect,
	
	multiSelect: Jui.cast.toBool(clientData.urlArgs.multiSelect, true),
	
	multiPage: Jui.cast.toBool(clientData.multiPage, true),

	multiRow: Jui.cast.toBool(clientData.multiRow, true),
	
	queryOnLoad: Jui.cast.toBool(clientData.urlArgs.queryOnLoad, clientData.queryOnLoad),

	formInTab: Jui.cast.toBool(clientData.urlArgs.formInTab, false),

	dataUrlRewritable: Jui.cast.toBool(clientData.urlArgs.dataUrlRewritable, true),

	addArguments: {},

	isInitialQuery: true,

	isRefresh: true,

	initialQueryArguments: clientData.urlArgs.initialQueryArguments,
	
	basicQueryArguments: clientData.urlArgs.basicQueryArguments,
	
	currentQueryArguments: null,

	treeQueryArguments: clientData.urlArgs.treeQueryArguments,

	historyQueries: [],
	
	queryIndex: -1,
	
	addPageMode: "Dialog",
	
	canOpen: true,

	collectionMap: {},

	isFieldCustomizable: true,

	isFirstClick: true,

	//-----------------------------------------------------------------------
	// initialization
	//-----------------------------------------------------------------------
	
	doLoad: function()
	{
		if ($elem("LeftZone") != null) {
			EntityList._setLeftZoneVisible(true);
		}

 		EntityList.loadLeftZone();
 		var control = EntityList.multiRow ? Jui.option.ListView : Jui.option.List;
		window.list = control.create({
			target					: "ListZone",
			availableFields			: EntityList.isFieldCustomizable ? clientData.availableFields : null,
			multiPage				: EntityList.multiPage,
			multiSelect				: EntityList.multiSelect,
			showPageCount			: clientData.showPageCount,
			queryOnSort				: EntityList.multiPage,
			onquery					: EntityList.doListQuery,
			onclick					: EntityList.doListClick,
			onselect				: EntityList.doListSelect,
			ondoubleclick			: EntityList.doListDoubleClick,
			ondatarowdragstart		: EntityList.doListDataRowDragStart,
			ondatarowdragsend		: EntityList.doListDataRowDragEnd,
			onconfigclick			: EntityList.doListConfigClick,
			onunbindclick			: EntityList.doListUnbindClick,
			onfieldsconfigchange	: EntityList.doFieldsConfigChange,
			entityBoxViewHandler	: CommonBusiness.doEntityBoxView,
			pictureBoxViewHandler	: CommonBusiness.doPictureBoxView,
			avatarHandler           : CommonBusiness.getAvatarUrl,
			encryptHandler			: Utility.encryptFieldValue,
			decryptHandler			: Utility.decryptFieldValue
		});
		var titleJson = Jui.object.merge({keywordFields:clientData.keywordFields}, clientData.titleJson);
		list.loadTitle(EntityList.processListTitle(titleJson));

		var schema = clientData.tempSchema || clientData.schema || clientData.defaultSchema;
		if (schema != null) {
			EntityList.getQuerySchemaBox().setValue(schema.id, schema.name);
			EntityList.query();
		}
		else if (!Jui.string.isEmpty(clientData.quickQueryId) && EntityList.hasQuickQueryBox) {
			EntityList.getQuickQueryBox().setCurrentItem(clientData.quickQueryId);
			EntityList.query();
		}
		else if (!Jui.string.isEmpty(clientData.keyword) && EntityList.hasKeywordBox) {
			EntityList.getKeywordBox().setValue(clientData.keyword);
			EntityList.query();
		}
		else if (EntityList.queryOnLoad || EntityList.initialQueryArguments != null) {
			EntityList.query();
		}
	},
	
	processToolBarJson: function(json)
	{
		var toolItemInitArguments = clientData.toolItemInitArguments || {};
		json.left = json.left || [];
		json.right = json.right || [];
		clientData.querySchemas = clientData.querySchemas || [];
		if (clientData.tempSchema != null) {
			var items = [{value:clientData.tempSchema.id, text:clientData.tempSchema.name}];
			clientData.querySchemas.unshift({items:items});
		}
		if (EntityList.hasQuerySchemaBox || EntityList.hasKeywordBox || EntityList.hasQuickQueryBox) {
			json.left.unshift({
				control	: "Splitter",
				type	: "hidden"
			});
			json.left.unshift({
				name	: "QueryBoxClear",
				control	: "Button",
				icon	: "quicksilver/image/16/Clear.png",
				hint	: $text("Qs.List.QueryBoxClearHint"),
				onclick	: EntityList.doQueryBoxClear
			});
		}
		if (EntityList.hasKeywordBox) {
			var keywordTitles = clientData.keywordTitles.join("/");
			var item = Jui.object.merge({
				name		: "Keyword",
				control		: "InputBox",
				hint		: $text("Qs.List.KeywordHint").replace("${0}", keywordTitles),
				emptyText	: keywordTitles,
		        onkeydown	: EntityList.doKeywordKeyDown
			}, toolItemInitArguments.Keyword);
			if (!Utility.isInDialog() && clientData.keywordBoxWidth != null) {
				item.style = "width:" + clientData.keywordBoxWidth + "px";
			}
			if (clientData.queryBoxBackgroundColor != null) {
				item.backgroundColor = clientData.queryBoxBackgroundColor;
			}
			json.left.unshift(item);
		}
		var schemaLocked = Jui.cast.toBool(clientData.urlArgs.schemaLocked, false);
		if (EntityList.hasQuerySchemaBox) {
			if (schemaLocked) {
				json.left.unshift({
					control		: "Splitter",
					type		: "hidden"
				});
			}
			else {
				json.left.unshift({
					name		: "QuerySchemaConfig",
					control		: "Button",
					icon		: "quicksilver/image/16/Config.png",
					hint		: $text("Qs.List.QuerySchemaConfigHint"),
					onclick		: EntityList.doQuerySchemaConfig
				});
			}
		}
		var emptyText;
		if (EntityList.defaultSchema == null) {
			emptyText = $text("Qs.List.QuerySchemaEmptyText1");
		}
		else {
			emptyText = $text("Qs.List.QuerySchemaEmptyText2").replace("${0}", EntityList.defaultSchema.name);
		}
		var item = Jui.object.merge({
			name		: "QuerySchema",
			control		: "ComboBox",
			hint		: $text("Qs.List.QuerySchemaHint"),
			emptyText	: emptyText,
            selectOnly	: true,
            textAsValue	: false,
            items		: clientData.querySchemas,
			disabled	: schemaLocked,
			visible		: EntityList.hasQuerySchemaBox,
            onchange	: EntityList.doQuerySchemaChange
		}, toolItemInitArguments.QuerySchema);
		if (!Utility.isInDialog() && clientData.querySchemaBoxWidth != null) {
			item.style = "width:" + clientData.querySchemaBoxWidth + "px";
		}
		if (clientData.queryBoxBackgroundColor != null) {
			item.backgroundColor = clientData.queryBoxBackgroundColor;
		}
		json.left.unshift(item);

		if (EntityList.hasQuickQueryBox) {
			json.left.unshift({
				control		: "Splitter"
			});
			json.left.unshift({
				name			: "QuickQuery",
				control 		: "Segment",
				items   		: clientData.quickQueryJson.items,
				onclick 		: EntityList.doQuickQueryClick,
				onextraiconclick: EntityList.doQuickQueryExtraIconClick
			});
			json.left.unshift({
				control		: "Splitter"
			});
		}

		if (EntityList.hasTree || EntityList.hasQueryForm || EntityList.showTagView || EntityList.hasQuerySchemaBox || EntityList.hasKeywordBox) {
			json.left.unshift({
				name	: 'NavigateForward',
				control	: 'Button',
				icon	: 'quicksilver/image/16/PageNext.gif',
				hint	: $text('Qs.List.NavigateForwardHint'),
				disabled: true,
				onclick	: EntityList.doNavigationButtonClick
			});
			json.left.unshift({
				name	: 'NavigateBackward',
				control	: 'Button',
				icon	: 'quicksilver/image/16/PagePrevious.gif',
				hint	: $text('Qs.List.NavigateBackwardHint'),
				disabled: true,
				onclick	: EntityList.doNavigationButtonClick
			});
		}
		
		if (EntityList.hasTree || EntityList.hasQueryForm || EntityList.showTagView) {
			json.left.unshift({
				name	: 'LeftZoneSwitch',
				control	: 'Button',
				icon	: 'quicksilver/image/16/FrameLeft.png',
				hint	: $text('Qs.List.SwitchLeftPane'),
				onclick	: EntityList.doLeftZoneSwitch
			});
		}
		if (clientData.hasViewFrame) {
			json.right.push({
				name	: 'RightZoneSwitch',
				control	: 'Button',
				icon	: 'quicksilver/image/16/FrameRight.png',
				hint	: $text('Qs.List.SwitchRightPane'),
				fixed	: true,
				onclick	: EntityList.doRightZoneSwitch
			});
		}
		return json;
	},

	loadLeftZone: function()
	{
		var hasTitle = (EntityList.hasTree + EntityList.hasQueryForm + EntityList.showTagView) > 1;
		if (hasTitle) {
			$elem("LeftZone").setAttribute("hasTitle", true);
			EntityList._setCurrentLeftTitle($elem("LeftZone").children[0]);
		}
		if (EntityList.hasTree) {
			EntityList.tree = Jui.option.Tree.create({
				target			: "TreeBodyPanel",
				style			: "width:100%;height:100%",
				onnodeclick		: EntityList.doTreeNodeClick,
				onloadsubnodes	: EntityList.doTreeLoadSubNodes
			});
			EntityList.tree.load(clientData.treeJson);
			EntityList.tree.expandLevel(EntityList.defaultTreeLevel);
			Jui.basic.Button.create({
				target	: "TreeButtonPanel",
				icon	: "quicksilver/image/16/Clear.png",
				hint	: $text("Qs.List.Hint.ClearTree"),
				onclick	: EntityList.doTreeClear
			});
			if (clientData.treeField != null) {
				Jui.basic.Button.create({
					target	: "TreeButtonPanel",
					icon	: "quicksilver/image/16/Save.png",
					hint	: $text("Qs.List.Hint.SaveTreeAsQuerySchema"),
					onclick	: EntityList.doTreeSave
				});
			}
		}
		if (EntityList.hasQueryForm) {
			var panel = $elem("QueryFormBodyPanel");
			panel.innerHTML = QueryForm.getHtml(clientData.queryFormJson);
			QueryForm.initialize(panel, clientData.queryFormJson);
			
			var thunderIcon = clientData.queryFormAutoQuery ? "Thunder.png" : "ThunderDisabled.png";
			Jui.basic.Button.create({
				target	: "QueryFormButtonPanel",
				icon	: "quicksilver/image/16/Query.gif",
				hint	: $text("Qs.QueryForm.Hint.Query"),
				onclick	: EntityList.doQueryFormQuery
			});
			EntityList.queryFormThunderButton = Jui.basic.Button.create({
				target	: "QueryFormButtonPanel",
				icon	: "quicksilver/image/16/" + thunderIcon,
				hint	: $text("Qs.QueryForm.Hint.SwitchInstanceQuery"),
				onclick	: EntityList.doQueryFormModeSwitch
			});
			Jui.basic.Button.create({
				target	: "QueryFormButtonPanel",
				icon	: "quicksilver/image/16/Clear.png",
				hint	: $text("Qs.QueryForm.Hint.ClearQueryForm"),
				onclick	: EntityList.doQueryFormClear
			});
			Jui.basic.Button.create({
				target	: "QueryFormButtonPanel",
				icon	: "quicksilver/image/16/Save.png",
				hint	: $text("Qs.QueryForm.Hint.SaveAsQuerySchema"),
				onclick	: EntityList.doQueryFormSave
			});
		}

		if (EntityList.showTagView) {
			EntityList.tagView = Jui.option.TagView.create({
				target			: "TagViewBodyPanel",
				style			: "border: none;",
				items			: clientData.tagJson.items,
				ontagadd		: EntityList.doTagViewItemAdd,
				onmenuclick     : CommonBusiness.getTagViewMenuClickHandler(EntityList.query),
				ontagheaddelete : EntityList.doTagHeadDelete,
				ontagclick		: EntityList.doTagClick,
				ontagfoldercheckclick: EntityList.doTagFolderCheckClick
			});
		}

		if (EntityList.hasQueryForm || EntityList.hasTree || EntityList.showTagView) {
			EntityList._setLeftZoneVisible(EntityList.showLeftZone);
		}
	},
	
	doTagViewItemAdd: function(json)
	{
		json.unitId = clientData.unitId;
		CommonBusiness.createTag(json);
	},
	
	doTagHeadDelete: function(json)
	{
		EntityList.query();	
	},

	doTagClick: function(json)
	{
		EntityList.query();
	},

	doTagFolderCheckClick: function(json)
	{
		EntityList.query();
	},

	//-----------------------------------------------------------------------
	// ToolBar
	//-----------------------------------------------------------------------
	
	/**
	 * This page may be embedded in MultiEntityBoxItems.jsp. In this JSP, the
	 * toolbar is in the outer page, not in this one.
	 */
	getToolBar: function()
	{
		return clientData.urlArgs.showToolBar == false ? parent.toolBar : toolBar;
	},

	//-----------------------------------------------------------------------
	// QuickQuery, QuerySchema and keyword
	//-----------------------------------------------------------------------
	
	getQuerySchemaBox: function()
	{
		return EntityList.getToolBar().getItem("QuerySchema");
	},
	
	getKeywordBox: function()
	{
		return EntityList.getToolBar().getItem("Keyword");
	},

	getQuickQueryBox: function()
	{
		return EntityList.getToolBar().getItem("QuickQuery");
	},

	getQuickQueryCollectionItemIds: function ()
	{
		var buffer = [];
		if (!EntityList.hasQuickQueryBox) {
			return buffer;
		}
		var box = EntityList.getQuickQueryBox();
		var items = box.getArgValue("items") || [];
		for (var i = 0; i < items.length; i++) {
			var item = items[i];
			if (Jui.cast.toBool(item.isCollection, false)) {
				buffer.push(item.id);
			}
		}
		return buffer;
	},

	doQuickQueryClick: function(event)
	{
		EntityList.getQuerySchemaBox().setValue();
		EntityList.query();
	},

	doQuickQueryExtraIconClick: function(json)
	{
		var box = EntityList.getQuickQueryBox();
		var items = box.getArgValue("items") || [];
		var idItemMap = Jui.array.toMap(items, "id");
		var schemaId = idItemMap[json.itemId].listQuerySchemaId;
		var iconName = json.iconName;
		var ids = list.getSelectedKeys();
		if (!Jui.array.isEmpty(ids)) {
			if (iconName == "add") {
				var addIds = [];
				for (var i = 0; i < ids.length; i++) {
					if (!EntityList.collectionMap[schemaId][ids[i]]) {
						addIds.push(ids[i]);
					}
				}
				CommonBusiness.addToCollection(null, schemaId, addIds, null, true, null, function(ret) {
					for (var i = 0; i < addIds.length; i++) {
						EntityList.collectionMap[schemaId][addIds[i]] = true;
					}
					CommonBusiness.loadQuickQueryNumber(clientData.unitId);
				});
			}
			else if (iconName == "delete") {
				CommonBusiness.deleteFromCollection(schemaId, ids, true, function (ret) {
					for (var i = 0; i < ids.length; i++) {
						EntityList.collectionMap[schemaId][ids[i]] = false;
					}
					list.deleteSelectedRows();
					CommonBusiness.loadQuickQueryNumber(clientData.unitId);
				});
			}
		}
	},

	showQuickQueryExtraIcon: function()
	{
		if (!EntityList.hasQuickQueryBox) {
			return;
		}
		var box = EntityList.getQuickQueryBox();
		var collectionItemIds = EntityList.getQuickQueryCollectionItemIds();
		if (Jui.array.isEmpty(collectionItemIds)) {
			return;
		}
		var selectedKeys = list.getSelectedKeys();
		var currentId = box.getCurrentId();
		var isCurrentItemCollection = Jui.array.contains(collectionItemIds, currentId);

		var items = box.getArgValue("items") || [];
		var idItemMap = Jui.array.toMap(items, "id");
		if (isCurrentItemCollection) {
			var schemaId = idItemMap[currentId].listQuerySchemaId;
			if (!(schemaId in EntityList.collectionMap)) {
				EntityList.collectionMap[schemaId] = {};
			}
			var keys = list.getKeys();
			for (var i = 0; i < keys.length; i++) {
				EntityList.collectionMap[schemaId][keys[i]] = true;
			}
		}
		var schemaIdItemIdsMap = {};
		var showAddSchemaIdSet = {};
		var hideItemSet = Jui.array.toSet(collectionItemIds);
		var schemaEntityMap = {};
		for (var i = 0; i < collectionItemIds.length; i++) {
			var itemId = collectionItemIds[i];
			var schemaId = idItemMap[itemId].listQuerySchemaId;
			if (schemaId in schemaIdItemIdsMap) {
				schemaIdItemIdsMap[schemaId].push(itemId);
				continue;
			}
			else {
				schemaIdItemIdsMap[schemaId] = [itemId];
			}
			if (!(schemaId in EntityList.collectionMap)) {
				EntityList.collectionMap[schemaId] = {};
			}
			for (var j = 0; j < selectedKeys.length; j++) {
				var entityId = selectedKeys[j];
				if (entityId in EntityList.collectionMap[schemaId]) {
					if (!EntityList.collectionMap[schemaId][entityId]) {
						showAddSchemaIdSet[schemaId] = true;
					}
				}
				else {
					if (!(schemaId in schemaEntityMap)) {
						schemaEntityMap[schemaId] = [];
					}
					schemaEntityMap[schemaId].push(entityId);
				}
			}
		}
		if (!Jui.object.isEmpty(schemaEntityMap)) {
			var args = {data: []};
			for (var schemaId in schemaEntityMap) {
				args.data.push({schemaId: schemaId, entityIds: schemaEntityMap[schemaId]});
			}
			var data = Utility.syncInvoke("Qs.QuerySchema.getSchemaEntities", args).data;
			var schemaEntityMapInDb = Jui.array.toMap(data, "schemaId");
			for (var schemaId in schemaEntityMap) {
				var entityIdsInDb = schemaEntityMapInDb[schemaId].entityIds;
				var entityIds = schemaEntityMap[schemaId];
				for (var i = 0; i < entityIds.length; i++) {
					var entityId = entityIds[i];
					var inDb = Jui.array.contains(entityIdsInDb, entityId);
					EntityList.collectionMap[schemaId][entityId] = inDb;
					if (!inDb) {
						showAddSchemaIdSet[schemaId] = true;
					}
				}
			}
		}
		if (isCurrentItemCollection && selectedKeys.length > 0) {
			box.showItemExtraIcon(currentId, "delete");
			delete hideItemSet[currentId];
		}
		for (var schemaId in showAddSchemaIdSet) {
			var itemIds = schemaIdItemIdsMap[schemaId];
			for (var i = 0; i < itemIds.length; i++) {
				box.showItemExtraIcon(itemIds[i], "add");
				delete hideItemSet[itemIds[i]];
			}
		}
		for (var itemId in hideItemSet) {
			box.showItemExtraIcon(itemId, false);
		}
	},

	doQuerySchemaChange: function(event)
	{
		var quickQueryBox = EntityList.getQuickQueryBox();
		if (quickQueryBox != null) {
			quickQueryBox.setCurrentItem();
		}
		EntityList.query();
	},

	doQuerySchemaConfig: function()
	{
		var parentSchemaId = clientData.schema == null ? null :  clientData.schema.id;
		var querySchemaBox =  EntityList.getQuerySchemaBox();
		CommonBusiness.configQuerySchema(clientData.unitId, querySchemaBox, clientData.tempSchema, parentSchemaId);
	},

	doKeywordKeyDown: function(event)
	{
		if (event.keyCode == 13) {
			EntityList.query();
		}
	},
	
	doQueryBoxClear: function()
	{
		var toolBar = EntityList.getToolBar();
		var schemaBox = EntityList.getQuerySchemaBox();
		if (toolBar.isItemVisible("QuerySchema") && schemaBox != null && !schemaBox.isDisabled()) {
			schemaBox.setValue();
		}
		var keywordBox = EntityList.getKeywordBox();
		if (keywordBox != null) {
			keywordBox.setValue();
		}
		var quickQueryBox = EntityList.getQuickQueryBox();
		if (quickQueryBox != null) {
			quickQueryBox.setCurrentItem();
		}
		if (EntityList.hasTree) {
			EntityList.tree.setCurrentId();
		}
		if (EntityList.hasQueryForm) {
			QueryForm.clear();
		}
		EntityList.query();
	},

	doNavigationButtonClick: function()
	{
		var step = this.getName() == "NavigateForward" ? 1 : -1;
		var index = EntityList.queryIndex + step;
		if (index >= 0 && index < EntityList.historyQueries.length) {
			EntityList.restoreQuery(index);
		}
	},

	//-----------------------------------------------------------------------
	// tree
	//-----------------------------------------------------------------------
	
	doTreeNodeClick: function(event)
	{
		EntityList.query();
	},
	
	doTreeClear: function()
	{
		EntityList.tree.setCurrentId();
		EntityList.query();
	},
	
	doTreeSave: function()
	{
		var node = EntityList.tree.getCurrentNode();
		if (node == null) {
			Jui.message.hint($text("Qs.List.CannotSaveTreeAsQuerySchema"));
			return;
		}
		var condition = [{
			fieldName	: clientData.treeField,
			operator	: "InWithSub",
			value		: JSON.stringify([node.id]),
			text		: node.text
		}];
		EntityList._saveAsQuerySchema(condition, node.text);
	},
	
	doTreeLoadSubNodes: function(event, callback)
	{
		var url = clientData.relationUnitCode + ".getTreeData";
        var args = EntityList.getTreeArguments({parentId: event.id});
		Utility.invoke(url, args, true, function(ret) {
			callback(ret.data);
		});
	},
	
	reloadTree: function()
	{
		if (EntityList.hasTree) {
			var url = clientData.relationUnitCode + ".getTreeData";
		    var args = EntityList.getTreeArguments();
			Utility.invoke(url, args, true, function(ret) {
				EntityList.tree.load(ret.data);
				EntityList.tree.expandLevel(EntityList.defaultTreeLevel);
			});
		}
	},

	getTreeArguments: function(args)
	{
	    return Jui.object.merge({}, args, EntityList.treeQueryArguments);
	},

	//-----------------------------------------------------------------------
	// QueryForm
	//-----------------------------------------------------------------------

	doQueryFormBoxKeyDown: function(event)
	{
		if (event.keyCode == 13) {
			EntityList.query();
		}
	},

	doQueryFormBoxChange: function()
	{
		if (!/Disabled/.test(EntityList.queryFormThunderButton.getIcon())) {
			EntityList.query();
		}
	},

	doQueryFormQuery: function()
	{
		EntityList.query();
	},

	doQueryFormClear: function()
	{
		QueryForm.clear();
		EntityList.query();
	},
	
	doQueryFormModeSwitch: function()
	{
		var button = EntityList.queryFormThunderButton;
		var autoQuery = /Disabled/.test(button.getIcon());
		button.setIcon(autoQuery ? "quicksilver/image/16/Thunder.png" : "quicksilver/image/16/ThunderDisabled.png");
		if (autoQuery) {
			EntityList.query();
		}
	},

	doQueryFormSave: function()
	{
		var conditions = QueryForm.getConditions().conditions;
		if (conditions.length == 0) {
			Jui.message.alert($text("Qs.QueryForm.InputConditionAlert"));
			return;
		}
		var treeNodeCount = 0;
		for (var i = 0; i < conditions.length; ++i) {
			if (conditions[i].items != null) {
				treeNodeCount += conditions[i].items.length;
			}
		}
		if (treeNodeCount > 100) {
			Jui.message.alert($text("Qs.QueryForm.SaveTooManyTreeNodeAlert"));
			return;
		}
		else if (treeNodeCount > 20) {
			Jui.message.confirm($text("Qs.QueryForm.SaveManyTreeNodeConfirm"), function() {
				EntityList._saveAsQuerySchema(conditions);
			});
		}
		else {
			EntityList._saveAsQuerySchema(conditions);
		}
	},
	
	doLeftPanelSwitch: function()
	{
		EntityList._setCurrentLeftTitle(event.srcElement);
	},

	doLeftZoneSwitch: function()
	{
		EntityList._setLeftZoneVisible($elem("LeftZone").style.display == "none");
	},

	doRightZoneSwitch: function()
	{
		EntityList._setRightZoneVisible($elem("RightZone").style.display == "none");
	},
	
	//-----------------------------------------------------------------------
	// query
	//-----------------------------------------------------------------------

	query: function()
	{
		var args = EntityList.getArguments();
		EntityList.currentQueryArguments = args;
		EntityList.recordQuery();
		EntityList.getListData(args, true);
	},

	getListData: function(args, clearSortFlag)
	{
		if (args.showPageCount != null || list.isShowPageCount()) {
			args.showPageCount = list.isShowPageCount();
		}
		if (EntityList.isRefresh || args.isRefresh != null) {
			args.isRefresh = EntityList.isRefresh;
			EntityList.isRefresh = false;
		}
		list.setUnbindTagsButtonVisible(!Jui.array.isEmpty(args.tagIds));
		Utility.invoke("qsvd-list/" + clientData.unitCode + ".getListData", args, true, function(ret) {
			var keyParts = EntityList._splitKeyword(args.keyword);
			var selectedKeys = list.getSelectedKeys();
			var processFunc = null;
			if (EntityList.processListData != EntityList.$processListData) {
				processFunc = EntityList.processListData;
			}
			else if (EntityList.processQueryResult != EntityList.$processQueryResult) { //TODO(BC): use processListData only
				processFunc = EntityList.processQueryResult;
				console.warn("EntityList.processQueryResult is deprecated, please use EntityList.processListData instead.");
			}
			var data = processFunc == null ? ret.data : processFunc(ret.data);
			list.loadData(data, keyParts);
			if (args.isRefresh) {
				list.selectByKey(selectedKeys);
			}
			else {
				EntityList.showQuickQueryExtraIcon();
			}
			if (EntityList.isInitialQuery && EntityList.isEnterSelect && list.length() == 1) {
				var pairs = list.getPairs();
				Utility.setDialogResult(EntityList.multiSelect ? pairs : pairs[0]);
				Utility.closeDialog();
				return;
			}
			if (EntityList.isInitialQuery) {
				EntityList.loadQuickQueryNumber();
			}
			if (clearSortFlag) {
				list.clearSortFlag();
			}
			EntityList.isInitialQuery = false;
			EntityList._updateViewFrame(true);
		});
	},

	loadQuickQueryNumber: function()
	{
		if (EntityList.getQuickQueryBox() == null || EntityList.isEnterSelect || EntityList.isSelect) {
			return;
		}
		Utility.invoke(clientData.unitCode + ".getQuickQueryNumber", {pageId: clientData.pageId}, true, function (ret) {
			EntityList.getQuickQueryBox().updateBadge(ret.data);
		});
	},

	doMessage: function(event)
	{
		var data = event.data;
		if (data.action == "loadQuickQueryNumber" && data.unitId == clientData.unitId) {
			EntityList.loadQuickQueryNumber();
		}
	},
	
	processListTitle: function(json)
	{
		return json;
	},
	
	processListData: function(data)
	{
		return data;
	},
	
	getArguments: function()
	{
		var args = Jui.object.merge({}, EntityList.basicQueryArguments);
		if (EntityList.isInitialQuery) {
			Jui.object.merge(args, EntityList.initialQueryArguments);
		}

		args.listId = EntityList.listId;
		if (EntityList.relationId != null) {
			args.relationId = EntityList.relationId;
		}
		if (EntityList.editId != null) {
			args.editId = EntityList.editId;
		}
		if (clientData.masterUnitId != null) {
			args.masterUnitId = clientData.masterUnitId;
		}
		if (clientData.masterEntityId != null) {
			args.masterEntityId = clientData.masterEntityId;
		}
		if (clientData.hasConstantFilterSql) {
			Jui.object.merge(args, clientData.urlArgs.tempSchemaInfo);
		} 
		if (!EntityList.multiPage) {
			args.pageSize = 1000;
		}
		else if (EntityList.isSelect) {
			args.pageSize = 20;
		}

		var schemaBox = EntityList.getQuerySchemaBox();
		if (schemaBox != null) {
			if (schemaBox.getValue() == null && EntityList.defaultSchema != null) {
				schemaBox.setValue(EntityList.defaultSchema.id, EntityList.defaultSchema.name);
			}
			if (schemaBox.getValue() != null) {
				args.schemaId = schemaBox.getValue();
			}
		}
		var keywordBox = EntityList.getKeywordBox();
		if (keywordBox != null && keywordBox.getValue() != null) {
			args.keyword = keywordBox.getValue();
		}
		var quickQueryBox = EntityList.getQuickQueryBox();
		if (quickQueryBox != null && quickQueryBox.getCurrentId() != null) {
			args.quickQueryId = quickQueryBox.getCurrentId();
		}
		if ($elem("LeftZone") != null && $elem("LeftZone").style.display != "none") {
			if (EntityList.hasTree && $elem("TreePanel").style.display != "none") {
				var id = EntityList.tree.getCurrentId();
				if (id != null) {
					args.masterEntityId	= id;
					args.includeSelf = true;
					args.includeIndirectSub = Jui.cast.toBool(clientData.urlArgs.includeIndirectSub, true);
				}
			} 
			if (EntityList.hasQueryForm && $elem("QueryFormPanel").style.display != "none") {
				var queryFormArgs = QueryForm.getConditions(true);
				args.queryFormRecent = queryFormArgs.queryFormRecent;
				if (queryFormArgs.conditions != null && queryFormArgs.conditions.length > 0) {
					if (args.conditions == null) {
						args.conditions = queryFormArgs.conditions;
					}
					else {
						args.conditions = args.conditions.concat(queryFormArgs.conditions);
					}
				}
			}
			if (EntityList.showTagView && $elem("TagViewPanel").style.display != "none") {
				args.tagIds = EntityList.tagView.getValues();
			}
		}

		return args;
	},

	recordQuery: function()
	{
		var item = {args:EntityList.currentQueryArguments};
		var schemaBox = EntityList.getQuerySchemaBox();
		if (schemaBox != null) {
			item.schemaId = schemaBox.getValue();
			item.schemaName = schemaBox.getText();
		}
		var keywordBox = EntityList.getKeywordBox();
		if (keywordBox != null) {
			item.keyword = keywordBox.getValue();
		}
		var quickQueryBox = EntityList.getQuickQueryBox();
		if (quickQueryBox != null) {
			item.quickQueryId = quickQueryBox.getCurrentId();
		}
		if (EntityList.hasTree) {
			item.treeNodeId = EntityList.tree.getCurrentId();
		}
		if (EntityList.hasQueryForm) {
			item.queryFormData = QueryForm.getData();
		}
		if (EntityList.showTagView) {
			item.tagIds = EntityList.tagView.getValues();
		}
		var CAPACITY = 50;
		var list = EntityList.historyQueries;
		if (EntityList.queryIndex != list.length - 1) {
			list.splice(EntityList.queryIndex, list.length - EntityList.queryIndex - 1);
		}
		if (list.length >= CAPACITY) {
			list.splice(0, CAPACITY - list.length + 1);
		}
		EntityList.historyQueries.push(item);
		EntityList.queryIndex = EntityList.historyQueries.length - 1;
		EntityList._refreshNavigationButtonStatus();
		return item;
	},
	
	restoreQuery: function(index)
	{
		var item = EntityList.historyQueries[index];
		EntityList.currentQueryArguments = item.args;
		var schemaBox = EntityList.getQuerySchemaBox();
		if (schemaBox != null) {
			schemaBox.setValue(item.schemaId, item.schemaName);
		}
		var keywordBox = EntityList.getKeywordBox();
		if (keywordBox != null) {
			keywordBox.setValue(item.keyword);
		}
		var quickQueryBox = EntityList.getQuickQueryBox();
		if (quickQueryBox != null) {
			quickQueryBox.setCurrentItem(item.quickQueryId);
		}
		if (EntityList.hasTree) {
			EntityList.tree.setCurrentId(item.treeNodeId);
		}
		if (EntityList.hasQueryForm) {
			QueryForm.loadData(item.queryFormData);
		}
		if (EntityList.showTagView) {
			EntityList.tagView.setValues(item.tagIds);
		}
		EntityList.queryIndex = index;
		EntityList._refreshNavigationButtonStatus();
		EntityList.getListData(item.args, true);
		return item;
	},
	
	//-----------------------------------------------------------------------
	// list
	//-----------------------------------------------------------------------
	
	doListConfigClick: function(event)
	{
		if (EntityList.listId == null) {
			return;
		}
		var options = {defaultWidth: 400, defaultHeight: 100};
		Utility.openDialog("Qs.List.Config.page", {}, options, function(json) {
			var args = {};
			if (json.currentListClear || json.allListClear) {
				args.listId = EntityList.listId;
				args.clearAll = json.currentListClear ? false : true;
				Utility.invoke("Qs.List.deleteUserListField", args, true, function(ret) {
					var titleJson = Jui.object.merge({keywordFields:clientData.keywordFields}, ret.titleJson);
					list.loadTitle(EntityList.processListTitle(titleJson));
					list.setAvailableFields(ret.availableFields);
					EntityList.query();
				});
			}
		});
	},
	
	doFieldsConfigChange: function(info)
	{
		if (EntityList.listId == null || !EntityList.isFieldCustomizable) {
			return;
		}
		var list = this;
		var args = {
			type: info.type, 
			data: info.data,
			listId: EntityList.listId
		};
		Utility.invoke("Qs.List.saveUserListField", args, true, function(ret) {
			list.setAvailableFields(ret.availableFields);
			if (info.type == "visible") {
				var titleJson = Jui.object.merge({keywordFields:clientData.keywordFields}, ret.titleJson);
				list.loadTitle(EntityList.processListTitle(titleJson));
				EntityList.query();
			}
		});
	},
	
	doListUnbindClick: function()
	{
		var entityIds = list.getSelectedKeys();
		if (entityIds.length == 0) {
			Jui.message.alert($text("Public.SelectAlert"));
			return;
		}
		var tagIds = EntityList.tagView.getValues();
		if (!Jui.array.isEmpty(tagIds)) {
			CommonBusiness.deleteTagEntities(tagIds, clientData.unitId, entityIds, function () {
				Jui.message.hint($text("Public.DeleteSuccess"));
				EntityList.query();
			});
		}
	},

	doListDataRowDragStart: function()
	{
		if (EntityList.showTagView) {
			for (var i = 0, elements = EntityList.tagView.getTagElements(); i < elements.length; i++) {
				var owner = Jui.$owner(elements[i]);
				if (elements[i]._id == owner._id) {
					continue;
				}
				elements[i].ondragover = function () {
					this.setAttribute("DragOver", true);
					Jui.event.stop();
				};
				elements[i].ondragleave = function () {
					this.removeAttribute("DragOver");
				};
				elements[i].ondrop = function () {
					this.removeAttribute("DragOver");
					var entityIds = list.getSelectedKeys();
					if (entityIds.length == 0) {
						entityIds = EntityList.currentQueryArguments;
					}
					var tagId = EntityList.tagView.getElementId(this);
					CommonBusiness.saveTagEntities(tagId, clientData.unitId, entityIds, function(ret) {
						Jui.message.hint($text("Public.OperationSuccess"));
						if (ret.items) {
							EntityList.tagView.loadItems(ret.items);
						}
						EntityList.query();
					});
				};
			}
		}
		else {
			Jui.event.preventDefault();
		}
	},

	doListDataRowDragEnd: function()
	{
		if (EntityList.showTagView) {
			for (var i = 0, elements = EntityList.tagView.getTagElements(); i < elements.length; i++) {
				elements[i].ondragover = null;
				elements[i].ondragleave = null;
				elements[i].ondrop = null;
			}
		}
		else {
			Jui.event.preventDefault();
		}
	},

	doListClick: function(event)
	{
		var rightZone = $elem("RightZone");
		if (rightZone != null && rightZone.style.display != "none") {
			EntityList.setViewEntityId(event.id);
		}
	},
	
	doListSelect: function(event)
	{
	    if (EntityList.isFirstClick && $elem("RightZone") != null) {
	        EntityList.isFirstClick = false;
	        EntityList._setRightZoneVisible(true);
	    }
	    else {
    		EntityList._updateViewFrame();
	    }
		EntityList.showQuickQueryExtraIcon();
	},
	
	doListDoubleClick: function(event)
	{
		if (EntityList.isSelect) {
			var pair = {id:event.id, name:event.name};
			Utility.closeDialog(EntityList.multiSelect ? [pair] : pair);
		}
		else if (EntityList.canOpen) {
			CommonBusiness.tryOpenViewPage(clientData.unitCode, event.id, true, function() {
				EntityList.doOpen(null, "Tab", null, null, event.id);
			});		
		}
	},

	doListQuery: function(event)
	{
		if (EntityList.currentQueryArguments == null) {
			return;
		}
		var args = Jui.object.merge({}, event.arguments, EntityList.currentQueryArguments);
		EntityList.getListData(args, false);
	},

	//-----------------------------------------------------------------------
	// button
	//-----------------------------------------------------------------------
	
	doAdd: function(event)
	{
		if (clientData.isTableRelation && !EntityList.hasTree) {
		    var args = {editId: EntityList.editId};
			CommonBusiness.selectEntity(clientData.unitCode, args, function(ret) {
				//var entityIds = Jui.array.isArray(ret) ? Jui.array.extractProperty(ret, "id") : ret.id;
				var entityIds = Jui.array.extractProperty(ret, "id");
				var unitCode = clientData.unitCode;
				var relationId = EntityList.relationId;
				var masterEntityId = clientData.masterEntityId;
				CommonBusiness.setRelation(unitCode, relationId, masterEntityId, entityIds, function(ret) {
					CommonBusiness.appendListRow(list, unitCode, EntityList.listId, entityIds);
					if (EntityList.onSaveSuccess != null) {
						EntityList.onSaveSuccess(true);
					}
				});
			});
			return;
		}
		var args = {
			relationId 		: EntityList.relationId,
			masterEntityId 	: clientData.masterEntityId,
			masterUnitId	: clientData.masterUnitId,
			random			: Jui.random.next()
			// openFromList$   : true,
		};
		if (EntityList.hasTree && EntityList.tree.getCurrentNode() != null) {
			args.masterEntityId = EntityList.tree.getCurrentNode().id;
		}
		if (this instanceof Jui.basic.ComboButton) {
			args.editId = event.id;
		}
		else if (EntityList.editId) {
			args.editId = EntityList.editId;
		}
		Jui.object.merge(args, EntityList.addArguments);
		if (EntityList.isSelect) {
			args.closeAfterSave = true;
		}
		var dialogOptions = {openInTab: EntityList.formInTab};
		CommonBusiness.openEntity(clientData.unitCode, args, EntityList.addPageMode, function(ret) {
			if (EntityList.isSelect) {
				var entityId = ret.entityIds[0];
				var name = CommonBusiness.getEntityName(clientData.unitCode, entityId);
				var object = {id:entityId, name:name};
				//Utility.closeDialog(object);
				Utility.closeDialog(EntityList.multiSelect ? [object] : object);
				return;
			}
			if (EntityList.hasTree && clientData.unitCode == clientData.relationUnitCode) {
				CommonBusiness.loadTreeNode(EntityList.tree, clientData.unitCode, ret.entityIds);
			}
			if (ret.refreshList) {
				list.refresh(true);
			}
			else if (ret.entityIds.length > 0) {
				CommonBusiness.appendListRow(list, clientData.unitCode, EntityList.listId, ret.entityIds);
			}
			if (EntityList.onSaveSuccess != null) {
				EntityList.onSaveSuccess(true);
			}
		}, dialogOptions);
	},
	
	doCopy: function()
	{
		EntityList.doOpen(null, "Dialog", true);
	},
	
	doConvert: function(destUnitCode)
	{
		var args = {isConvert:true, srcUnitId:clientData.unitId, srcEntityId:list.getSelectedKeys()[0]};
		if (args.srcEntityId == null) {
			Jui.message.alert($text("Public.SelectAlert"));
			return;
		}
		var dialogOptions = {openInTab: EntityList.formInTab};
		CommonBusiness.openEntity(destUnitCode, args, "Dialog", null, dialogOptions);
	},
	
	doOpen: function(event, mode, isCopy, customArgs, entityId)
	{
		entityId = entityId || list.getSelectedKeys()[0];
		if (entityId == null) {
			Jui.message.alert($text("Public.SelectAlert"));
			return;
		}
		// var defaultArgs = {entityId:entityId, masterEntityId:clientData.masterEntityId, openFromList$: true};
		var defaultArgs = {entityId:entityId, masterEntityId:clientData.masterEntityId};
		if (isCopy) {
			defaultArgs.isCopy = true;
		}
		var args = EntityList.processFormArguments(Jui.object.merge(defaultArgs, customArgs));
		var dialogOptions = {openInTab: EntityList.formInTab};
		CommonBusiness.openEntity(clientData.unitCode, args, mode || "Dialog", function(ret) {
			if (EntityList.hasTree && clientData.unitCode == clientData.relationUnitCode) {
				CommonBusiness.loadTreeNode(EntityList.tree, clientData.unitCode, entityId);
			}
			if (ret.refreshList) {
				list.refresh();
			}
			else if (ret.entityIds.length == 0) {
				list.deleteRowsByKey(entityId);
			}
			else {
				CommonBusiness.loadListRow(list, clientData.unitCode, EntityList.listId, ret.entityIds, isCopy);
				EntityList._updateViewFrame(true);
			}
			if (EntityList.onSaveSuccess != null) {
				EntityList.onSaveSuccess(false);
			}
		}, dialogOptions);
	},
	
	doDelete: function(event)
	{
		var entityIds = list.getSelectedKeys();
		if (entityIds.length == 0) {
			Jui.message.alert($text("Public.SelectAlert"));
			return;
		}
		EntityList.confirmDeletion(entityIds, function() {
			if (clientData.isTableRelation) {
				var unitCode = clientData.unitCode;
				var relationId = EntityList.relationId;
				var masterEntityId = clientData.masterEntityId;
				CommonBusiness.unsetRelation(unitCode, relationId, masterEntityId, entityIds, function(ret) {
					Jui.message.hint($text("Public.DeleteSuccess"));
					list.deleteSelectedRows();
					if (EntityList.onDeleteSuccess != null) {
						EntityList.onDeleteSuccess();
					}
				});
				return;
			}
			CommonBusiness.deleteEntity(clientData.unitCode, entityIds, function(ret) {
				Jui.message.hint($text("Public.DeleteSuccess"));
				Utility.refreshMenuNumbers(clientData.unitId);
				list.deleteSelectedRows();
				EntityList._updateViewFrame();
				if (EntityList.hasTree) {
					EntityList.tree.remove(entityIds);
				}
				if (EntityList.onDeleteSuccess != null) {
					EntityList.onDeleteSuccess();
				}
			});
		});
	},

	processFormArguments: function(args)
	{
		return args;
	},
	
	getDeleteConfirmMessage: function()
	{
		return $text("Public.ListDeleteConfirm");
	},

	confirmDeletion: function(entityIds, callback)
	{
		Jui.message.confirm(EntityList.getDeleteConfirmMessage(), callback);
	},

	doSort: function()
	{
		var args = {
			relationId		: EntityList.relationId,
			masterEntityId	: EntityList.hasTree ? EntityList.tree.getCurrentId() : clientData.masterEntityId
		};
		if (EntityList.hasTree && clientData.relationUnitId != clientData.unitId && args.masterEntityId == null) {
			Jui.message.alert($text("Public.Sort.SelectTreeNodeAlert").replace("${0}", clientData.relationUnitName));
			return;
		}
		var options = CommonBusiness.defaultDialogOptions.sort;
		Utility.openDialog(clientData.unitCode + ".Sort.page", args, options, function() {
			list.refresh(true);
		});
	},
	
	doRefresh: function()
	{
		EntityList.isRefresh = true;
		list.refresh();
	},
	
	doSelectListConfirm: function()
	{
		if (EntityList.multiSelect) {
			var pairs = list.getSelectedPairs();
			if (pairs.length == 0) {
				Jui.message.alert($text("Public.SelectAlert"));
				return;
			}
			Utility.closeDialog(pairs);
		}
		else {
			var pair = list.getSelectedPairs()[0];
			if (pair == null) {
				Jui.message.alert($text("Public.SelectAlert"));
				return;
			}
			Utility.closeDialog(pair);
		}
	},
	
	doSelectListCancel: function()
	{
		Utility.closeDialog();
	},
	
	doImport: function()
	{
		var args = {unitId:clientData.unitId};
		Utility.openDialog("Qs.Import.ImportDialog.page", args, {width:600,height:240}, function() {
			if (EntityList.hasTree && clientData.unitCode == clientData.relationUnitCode) {
		        var treeArgs = EntityList.getTreeArguments();
				Utility.invoke(clientData.unitCode + ".getTreeData", treeArgs, true, function(ret) {
					EntityList.tree.load(ret.data);
				});
			}
			list.refresh(true);
		});
	},
	
	doExcelExport: function()
	{
		var args = {
			entityId		: EntityList.listId,
			masterEntityId	: clientData.unitId
		};
		var options = CommonBusiness.defaultDialogOptions.doubleSorter;
		Utility.openDialog("Qs.List.ExcelExport.page", args, options, function(config) {
			var div = Jui.dom.insertHtml(document.body, "beforeend", "<div></div>");
			div.onclick = function() { EntityList.exportExcel(config) };
			div.click();
			Jui.dom.removeElement(div);
		});
	},
	
	exportExcel: function(config)
	{
		if (list.length() == 0) {
			Jui.message.alert($text("Public.NoExportableData"));
			return;
		}
		var args = Jui.util.clone(EntityList.currentQueryArguments);
		if (config != null) {
			args.format = config.format;
			args.fieldNames = config.fieldNames;
		}
		//syncInvoke is required here. if use invoke, chrome will open a new dialog for downloading.
		Utility.syncInvoke(clientData.unitCode + ".checkListExport", args, function(ret) {
			if (ret.message == null) {
				Utility.download(clientData.unitCode + ".exportList", args);
			}
			else {
				Jui.message.confirm(ret.message, function() {
					Utility.download(clientData.unitCode + ".exportList", args);
				});
			}
		});
	},

	doSqlExport: function()
	{
		if (list.length() == 0) {
			Jui.message.alert($text("Public.NoExportableData"));
			return;
		}
		var args = Jui.object.merge({format:"sql"}, EntityList.currentQueryArguments);
		Utility.download(clientData.unitCode + ".exportList", args);
	},
	
	doBillPrint: function(event)
	{
		var entityIds = list.getSelectedKeys();
		if (entityIds.length == 0) {
			Jui.message.alert($text("Public.SelectAlert"));
		}
		else if (entityIds.length > 1) {
			Jui.message.alert($text("Public.SingleSelectAlert"));
		}
		else {
			CommonBusiness.viewBill(event.name, clientData.unitId, entityIds[0]);
		}
	},
	
	doBatchModify: function()
	{
		var page = this.getArgs().handlePage;
		var url = page.code + ".page";
		args = {
			enableAllFields		: true,
			addConfirmButton	: true,
			entityEventCode		: this.getArgs().name,
			showWorkflow		: false,
			batchModifyIds		: list.getSelectedKeys()
		};
		if (args.batchModifyIds.length == 0) {
			Jui.message.alert($text("Public.SelectAlert"));
			return;
		}
		Utility.openDialog(url, args, CommonBusiness.defaultDialogOptions.form, function() {
			Jui.message.hint($text("Public.OperationSuccess"));
			CommonBusiness.updateListRow(list, clientData.unitCode, EntityList.listId, args.batchModifyIds);
		});
	},

	executeOperation: function(code)
	{
		var entityIds = list.getSelectedKeys();
		if (entityIds.length == 0) {
			Jui.message.alert($text("Public.SelectAlert"));
			return;
		}
		CommonBusiness.executeOperation(code, entityIds, null, function(ret) {
			if (ret.refreshPage) {
				CommonBusiness.loadListRow(list, clientData.unitCode, EntityList.listId, entityIds);
			}
		});
	},
	
	//-----------------------------------------------------------------------
	// business operation
	//-----------------------------------------------------------------------
	
	doAssign: function()
	{
		var entityIds = list.getSelectedKeys();
		if (entityIds.length == 0) {
			Jui.message.alert($text("Public.SelectAlert"));
			return;
		}
		Utility.openDialog("Qs.Entity.Assign.page", {unitCode:clientData.unitCode}, null, function(data) {
			var args = {entityIds:entityIds, data:data};
			Utility.invoke(clientData.unitCode + ".assign", args, true, function() {
				Jui.message.hint($text("Public.OperationSuccess"));
				CommonBusiness.loadListRow(list, clientData.unitCode, EntityList.listId, entityIds);
			});
		});
	},
	
	doExecute: function()
	{
		EntityList.invokeBusinessMethod("execute", "Public.ListExecuteConfirm");
	},
	
	doSubmit: function()
	{
		EntityList.invokeBusinessMethod("submit", "Public.ListSubmitConfirm");
	},
	
	doFinish: function()
	{
		EntityList.invokeBusinessMethod("finish", "Public.ListFinishConfirm");
	},
	
	doDiscard: function()
	{
		EntityList.invokeBusinessMethod("discard", "Public.ListDiscardConfirm");
	},
	
	doRevise: function()
	{
		EntityList.invokeBusinessMethod("revise", "Public.ListReviseConfirm");
	},
	
	invokeBusinessMethod: function(methodName, messageCode)
	{
		var entityIds = list.getSelectedKeys();
		if (entityIds.length == 0) {
			Jui.message.alert($text("Public.SelectAlert"));
			return;
		}
		var message = Utility.formatText(messageCode, entityIds.length, clientData.unitName);
		Jui.message.confirm(message, function() {
			Utility.invoke(clientData.unitCode + "." + methodName, {entityIds:entityIds}, true, function() {
				Jui.message.hint($text("Public.OperationSuccess"));
				CommonBusiness.loadListRow(list, clientData.unitCode, EntityList.listId, entityIds);
			});
		});
	},
	
	setViewEntityId: function(entityId, updateIfMatch)
	{
		if (entityId == EntityList.viewEntityId && !updateIfMatch) {
			return;
		}
		else if (entityId == null) {
			$elem("ViewFrame").src = "about:blank";
		}
		else {
			var args = {entityId:entityId, isListView:true};
			var keyword = (EntityList.currentQueryArguments || {}).keyword;
			if (!Jui.string.isEmpty(keyword)) {
				args.keywords = EntityList._splitKeyword(keyword);
			}
			$elem("ViewFrame").src = Utility.getUrl(clientData.unitCode + ".View.page", args);
			if (EntityList.onRowView != null) {
				EntityList.onRowView(entityId);
			}
		}
		EntityList.viewEntityId = entityId;
	},
	
	//-----------------------------------------------------------------------
	// private
	//-----------------------------------------------------------------------

	_setLeftZoneVisible: function(visible)
	{
		if (EntityList.leftResizer == null) {
			$elem("LeftZone").style.width = "226px";
		}
		$elem("LeftZone").style.display = visible ? "block" : "none";
		$elem("ListZone").style.left = visible ? $elem("LeftZone").style.width : "0px";
		Jui.dom.tagClass($elem("ListZone"), "QsLeftBorder", visible);
		if (EntityList.leftResizer == null) {
			EntityList.leftResizer = Jui.option.Resizer.create({
				elements	: ["LeftZone", "ListZone"],
				transparent	: false,
				offset		: -6
			});
		}
		EntityList.leftResizer.setVisible(visible);
	},

	_setRightZoneVisible: function(visible)
	{
		if (EntityList.rightResizer == null) {
			var leftZone = $elem("LeftZone");
			var availableWidth = $elem("QsContent").offsetWidth - (leftZone == null ? 0 : leftZone.offsetWidth);
			$elem("RightZone").style.width = Math.round(0.44 * availableWidth) + "px";
		}
		$elem("RightZone").style.display = visible ? "block" : "none";
		$elem("ListZone").style.right = visible ? $elem("RightZone").style.width : "0px";
		Jui.dom.tagClass($elem("ListZone"), "QsRightBorder", visible);
		if (EntityList.rightResizer == null) {
			EntityList.rightResizer = Jui.option.Resizer.create({
				transparent	: false,
				elements	: ["ListZone", "RightZone"],
				reside		: 1,
				fixed		: "right"
			});
		}
		EntityList.rightResizer.setVisible(visible);
		if (visible) {
			EntityList._updateViewFrame();
		}
	},

	_setCurrentLeftTitle: function(elem)
	{
		if (!elem.hasAttribute("current")) {
			var siblings = elem.parentElement.children;
			var tabSize = siblings.length == 1 ? 0 : siblings.length / 2;
			for (var i = 0; i < tabSize; i++) {
				var tab = siblings[i];
				var panel = siblings[i + tabSize];
				var isCurrent = tab == elem;
				Jui.dom.tagAttribute(tab, "current", isCurrent);
				Jui.dom.tagClass(tab, "QsBottomBorder", !isCurrent);
				panel.style.display = isCurrent ? "block" : "none";
			}
		}
	},
	
	_saveAsQuerySchema: function(condition, defaultName)
	{
		var args = {
			title		: $text("Qs.QueryForm.Save"),
			information : $text("Qs.QueryForm.QuerySchemaName"),
			text		: defaultName,
			allowEmpty	: false
		};
		Utility.openDialog("Qs.Misc.Prompt.page", args, {width:400,height:150}, function(name) {
			var args = {
				basic		: {FUnitId:clientData.unitId, FName:name, FTemp:false},
				condition	: condition
			};
			Utility.invoke("Qs.QuerySchema.save", args, true, function() {
				Jui.message.hint($text("Public.SaveSuccess"));
				var schemaBox = EntityList.getQuerySchemaBox();
				if (schemaBox != null) {
					var data = CommonBusiness.getQuerySchemaDropdownJson(clientData.unitId);
					if (data != null) {
						schemaBox.loadItems(data);
					}
				}
			});
		});
	},

	_refreshNavigationButtonStatus: function()
	{
		var backwardButton = EntityList.getToolBar().getItem("NavigateBackward");
		var forwardButton = EntityList.getToolBar().getItem("NavigateForward");
		if (backwardButton != null) {
			backwardButton.setDisabled(EntityList.queryIndex <= 0);
		}
		if (forwardButton != null) {
			forwardButton.setDisabled(EntityList.queryIndex >= EntityList.historyQueries.length - 1);
		}
	},

	_updateViewFrame: function(updateIfMatch)
	{
		var rightZone = $elem("RightZone");
		if (window.list != null && rightZone != null && rightZone.style.display != "none") {
			var selectedKeys = list.getSelectedKeys();
			EntityList.setViewEntityId(selectedKeys[0], updateIfMatch);
		}
	},
	
	_splitKeyword: function(keyword)
	{
		if (keyword != null && clientData.isFullTextSearch) {
			keyword = keyword.replace(/\b(NOT|AND|OR)\b/g, "");
		}
		return Jui.string.isEmpty(keyword) ? [] : Jui.string.trim(keyword.replace(/\s+/g, " ")).split(" ");
	}
};

EntityList.processQueryResult	= EntityList.processListData; //for backward compatible
QueryForm.doBoxKeyDown			= EntityList.doQueryFormBoxKeyDown;
QueryForm.doBoxChange 			= EntityList.doQueryFormBoxChange;
window.onload 					= EntityList.doLoad;
Utility.setToolBarJsonProcessor(EntityList);
Utility.addFunctionAlias(EntityList);
window.addEventListener("message", EntityList.doMessage);
