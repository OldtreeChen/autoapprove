var WorkItemList =
{
	doLoad: function()
	{
	},
	
	doOpen: function()
	{
		var workItemId = list.getSelectedKeys()[0];
		if (workItemId == null) {
			Jui.message.alert($text("Public.SelectAlert"));
			return;
		}
		WorkItemList.open(workItemId);
	},
	
	doBatchPass: function()
	{
		var args = {workItemIds: list.getSelectedKeys()};
		if (args.workItemIds.length == 0) {
			Jui.message.alert($text("Public.SelectAlert"));
			return;
		}
		Utility.openDialog("Wf.WorkItem.BatchPass.page", args, null, function() {
			list.refresh(true);
		});
	},
	
	open: function(workItemId)
	{
		var args = {workItemId:workItemId, handleOnly:false};
		Utility.invoke("Wf.WorkItem.getHandleInformation", args, true, function(ret) {
			if (ret.url == null) {
				CommonBusiness.openEntity("Wf.Process", {entityId:ret.processId}, "Dialog");
			}
			else {
				Utility.openDialog(ret.url, ret.args, CommonBusiness.defaultDialogOptions.info, function() {
					list.refresh();
				});
			}
		});
	},
	
	doProcessView: function()
	{
		let workItemId = list.getHoveringKey();
		if (workItemId != null) {
			WorkItemList.open(workItemId);
		}
	}
};

EntityList.doListDoubleClick = function(event)
{
	WorkItemList.open(event.id);
};

EntityList.processListTitle = function (json)
{
	let fields = json.fields;
	for (let i = 0; i < fields.length; i++) {
		let field = fields[i];
		if (field.name == "FProcessId") {
			field.onview = WorkItemList.doProcessView;
		}
	}
	return json;
};
