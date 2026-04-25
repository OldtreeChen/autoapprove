var WorkItemSubmit =
{
	workItemUnitId: "00000000-0000-0000-0001-000000003005",

	doLoad: function()
	{
		WorkItemSubmit.createControlsForSubmit($elem("WorkItemPane"));
	},
	
	createControlsForSubmit: function(parent, createTitle)
	{
		var className = clientData.isCommentRequired ? "CommentRequired" : "";
		html = "<div class=WorkItemSubmitPanel>"
			 +   "<div>"
			 + 	   "<div>" + $text("Wf.WorkItem.Section") + "</div>"
			 + 	   "<div></div>"
			 + 	   "<div></div>"
			 +   "</div>"
			 +   "<div>"
			 +     "<div>" + $text("Wf.WorkItem.Result") + "</div>"
			 +     "<div></div>"
			 +     "<div></div>"
			 +   "</div>"
			 +   "<div>"
			 +     "<div class=" + className +">" + $text("Wf.WorkItem.Comment") + "</div>"
			 +     "<div></div>"
			 +   "</div>"
			 + "</div>";
		if (createTitle) {
			html = "<div class=WorkItemSubmitPanelTitle>"
				 +   "<div class=QsBlockTitle>" + $text("Wf.WorkItem.EditTabTitle") + "</div>"
				 + "</div>"
				 + html;
		}
		Jui.dom.insertHtml(parent, "BeforeEnd", html);
		var panel = parent.lastChild;
		Jui.basic.InputBox.create({
			target		: panel.children[0].children[1],
			disabled	: true,
			style		: "width:100%",
			value		: clientData.workflow.nodeName
		});
		Jui.basic.Button.create({
			target		: panel.children[0].children[2],
			text		: $text("Wf.Process.ViewFlowChart"),
			icon		: "quicksilver/image/unit/WfProcess.gif",
			onclick		: WorkItemSubmit.viewFlowChart
		});
		Jui.basic.InputBox.create({
			target		: panel.children[1].children[1],
			disabled	: true,
			style		: "width:100%",
			value		: clientData.urlArgs.resultText
		});
		WorkItemSubmit.commentBox = Jui.basic.TextBox.create({
			target		: panel.children[2].children[1],
			style		: "width:100%;height:100%"
		});
	},
	
	createControlsForRead: function(parent)
	{
		var html = "<div class=WorkflowInfoPanel>"
				 +	 "<div>"
				 + 	   "<div>" + $text("Wf.WorkItem.Section") + "</div>"
				 + 	   "<div></div>"
				 + 	   "<div></div>"
				 +   "</div>"
				 +   "<div>"
				 +     "<div>" + $text("Wf.WorkItem.Steps") + "</div>"
				 +     "<div class=WorkItemSubmitListCell></div>"
				 +   "</div>"
				 + "</div>";
		Jui.dom.insertHtml(parent, "BeforeEnd", html);
		var panel = parent.lastChild;
		Jui.basic.InputBox.create({
			target		: panel.children[0].children[1],
			disabled	: true,
			style		: "width:240px",
			value		: clientData.workflow.nodeName
		});
		Jui.basic.Button.create({
			target		: panel.children[0].children[2],
			text		: $text("Wf.Process.ViewFlowChart"),
			icon		: "quicksilver/image/unit/WfProcess.gif",
			onclick		: WorkItemSubmit.viewFlowChart
		});
		var list = Jui.option.List.create({
			target			: panel.children[1].children[1],
			showRowNumber	: false,
			multiPage		: false,
			multiSelect		: false,
			border			: "all",
			ondoubleclick	: WorkItemSubmit.doListDoubleClick
		});
		list.load(clientData.workflow.listJson);
	},

	viewFlowChart: function()
	{
		var args = {entityId:clientData.workflow.processId};
		Utility.openDialog("Wf.Process.ChartAndDetail.page", args);
	},
	
	doConfirm: function()
	{
		var args = {
			workItemId		: clientData.workflow.workItemId,
			entityEventCode	: clientData.urlArgs.entityEventCode,
			result			: clientData.urlArgs.result,
			comment			: WorkItemSubmit.commentBox.getValue()
		};
		if (Jui.string.isEmpty(args.comment) && clientData.isCommentRequired) {
			Jui.message.alert($text("Wf.WorkItem.InputCommentAlert"));
			WorkItemSubmit.commentBox.focus();
			return;
		}
		if (clientData.urlArgs.form != null) {
			args.form = clientData.urlArgs.form;
		}
		Utility.invoke("Wf.WorkItem.finish", args, true, function(ret) {
			CommonBusiness.loadQuickQueryNumber(clientData.workflow.entityUnitId, WorkItemSubmit.workItemUnitId);
			Utility.refreshMenuNumbers(clientData.workflow.entityUnitId, WorkItemSubmit.workItemUnitId);
			Utility.closeDialog(ret);
		});
	},
	
	doListDoubleClick: function(event)
	{
		Utility.openDialog("Wf.Process.CommentForm.page", {data:event.data});
	}
};

