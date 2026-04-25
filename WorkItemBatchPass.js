var WorkItemBatchPass =
{
	doLoad: function()
	{
		WorkItemBatchPass.commentBox = Jui.basic.TextBox.create({
			target	: "CommentBox",
			style	: "width:100%;height:100%"
		});
		
		var passableItems = [];
		var notPassableItems = [];
		clientData.items.forEach(function(item) {
			(item.message ? notPassableItems : passableItems).push(item);
		});
		
		if (passableItems.length == 0) {
			$elem("Passable").style.display = "none";
			WorkItemBatchPass.commentBox.setDisabled();
			toolBar.getItem("Pass").setDisabled();
		}
		else {
			WorkItemBatchPass.passableList = Jui.option.List.create({
				target				: "PassableList",
				multiPage			: false,
				autoHeight			: true,
				border				: "all",
				minVisibleRowCount	: 1,
				keyField			: "id"
			});
			WorkItemBatchPass.passableList.loadTitle(WorkItemBatchPass._getListTitle(true));
			WorkItemBatchPass.passableList.loadData(passableItems);
			WorkItemBatchPass.passableList.selectAll();
		}
		
		if (notPassableItems.length == 0) {
			$elem("NotPassable").style.display = "none";
		}
		else {
			WorkItemBatchPass.notPassableList = Jui.option.List.create({
				target				: "NotPassableList",
				multiPage			: false,
				multiSelect			: false,
				autoHeight			: true,
				border				: "all",
				minVisibleRowCount	: 1
			});
			WorkItemBatchPass.notPassableList.loadTitle(WorkItemBatchPass._getListTitle(false));
			WorkItemBatchPass.notPassableList.loadData(notPassableItems);
		}
	},
	
	doPass: function()
	{
		var args = {workItemIds:[], comment:Jui.string.trim(WorkItemBatchPass.commentBox.getValue())};
		var data = WorkItemBatchPass.passableList.getSelectedData();
		if (data.length == 0) {
			Jui.message.alert($text("Public.SelectAlert"));
			return;
		}
		
		for (var i = 0; i < data.length; ++i) {
			var item = data[i];
			if (item.success) {
				Jui.message.alert($text("Wf.WorkItem.BatchPass.PassedAlert", item.processName));
				return;
			}
			args.workItemIds.push(item.id);
		}
		
		Utility.invoke("Wf.WorkItem.BatchPass", args, true, function(ret) {
			var failedIds = [];
			ret.items.forEach(function(item) {
				if (!item.success) {
					failedIds.push(item.id);
				}
			});
			WorkItemBatchPass.passableList.updateData(ret.items);
			WorkItemBatchPass.passableList.unselectAll();
			if (failedIds.length > 0) {
				WorkItemBatchPass.passableList.selectByKey(failedIds);
			}
			
			var data = WorkItemBatchPass.passableList.getData();
			var successCount = 0;
			data.forEach(function(item) {
				if (item.success) {
					++successCount;
				}
			});
			if (successCount > 0) {
				Utility.setDialogResult(true);
			}
			if (successCount == data.length) {
				toolBar.getItem("Pass").setDisabled();
			}
		});
	},
	
	_getListTitle: function(passable)
	{
		var lastTitle = $text(passable ? "Wf.WorkItem.BatchPass.Result" : "Wf.WorkItem.BatchPass.Reason");
		var fields = [
		    {
		    	name	: "unitName",
		    	title	: $text("Wf.WorkItem.BatchPass.UnitName"),
		    	control	: "InputBox",
		    	width	: 80
		    },
		    {
		    	name	: "processName",
		    	title	: $text("Wf.WorkItem.BatchPass.ProcessName"),
		    	control	: "InputBox",
		    	width	: 200
		    },
		    {
		    	name	: "workItemName",
		    	title	: $text("Wf.WorkItem.BatchPass.WorkItemName"),
		    	control	: "InputBox",
		    	width	: 80
		    },
		    {
		    	name	: "message",
		    	title	: lastTitle,
		    	control	: "InputBox",
		    	width	: 100
		    }
		];
		return {keyField: "id", fields: fields};
	}
};

