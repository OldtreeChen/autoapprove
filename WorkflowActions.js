var WorkflowActions =
{
    workItemUnitId: "00000000-0000-0000-0001-000000003005",

    isForm: function ()
    {
        return window.EntityForm != null && window.form != null;
    },

    viewFlowCharts: function ()
    {
        var args = {unitId: clientData.unitId, entityId: clientData.entityId};
        Utility.invoke("Wf.Process.getEntityProcessListJson", args, true, function (ret) {
            if (ret.list.length == 0) {
                Jui.message.alert($text("Wf.Process.NoRelevantProcess"));
                return;
            }
            args = {entityId: ret.list[0].FId}; //TODO select if multiple
            Utility.openDialog("Wf.Process.ChartAndDetail.page", args, null, function () {
                WorkflowActions.reload(clientData.entityId);
            });
        });
    },

    drawWorkItem: function ()
    {
        Jui.message.confirm($text("Wf.WorkItem.DrawConfirm"), function () {
            var args = {workItemId: clientData.workflow.workItemId};
            Utility.invoke("Wf.WorkItem.draw", args, true, function (ret) {
                Jui.message.hint($text("Wf.WorkItem.DrawSuccess"));
                WorkflowActions.reload(clientData.entityId);
            });
        });
    },

    cloneWorkItem: function ()
    {
        Utility.openDialog("Wf.WorkItem.Clone.page", null, null, function (ret) {
            var args = {workItemId: clientData.workflow.workItemId, userIds: ret.userIds, comment: ret.comment};
            Utility.invoke("Wf.WorkItem.clone", args, true, function () {
                Jui.message.hint($text("Public.OperationSuccess"));
                WorkflowActions.reload(clientData.entityId);
            });
        });
    },

    transferWorkItem: function ()
    {
        Utility.openDialog("Wf.WorkItem.Transfer.page", null, null, function (ret) {
            var args = {workItemId: clientData.workflow.workItemId, userId: ret.userId, comment: ret.comment};
            Utility.invoke("Wf.WorkItem.transfer", args, true, function () {
                Jui.message.hint($text("Public.OperationSuccess"));
                WorkflowActions.reload(clientData.entityId);
            });
        });
    },

    doWorkflowButtonClick: function (event)
    {
        var isForm = WorkflowActions.isForm();
        var isButton = this instanceof Jui.basic.Button;
        var page = isButton ? this.getArgs().page : event.page;
        var args = {
            entityEventCode: (isButton ? this.getArgs().entityEventCode : event.entityEventCode),
            entityId: clientData.entityId,
            workItemId: clientData.workflow.workItemId,
            result: isButton ? this.getId() : event.id,
            resultText: isButton ? this.getText() : event.text,
            noComment: page.noComment,
            isSubmit: true,
            enableAllFields: true,
            addConfirmButton: true
        };
        var saveForm = isButton ? this.getArgs().saveForm : event.saveForm;
        if (saveForm) {
            if (isForm) {
                if (!EntityForm.validate()) {
                    return;
                }
                args.form = EntityForm.getData();
            }
            else {
                CommonBusiness.openEntity(clientData.unitCode, {entityId: clientData.entityId, workItemId: clientData.workflow.workItemId}, "Dialog", function (ret) {
                    WorkflowActions.reload(clientData.entityId);
                });
                return;
            }
        }
        Utility.openDialog(page.code + ".page", args, CommonBusiness.defaultDialogOptions.form, function (ret) {
            Jui.message.hint($text("Public.OperationSuccess"));
            if (saveForm && isForm) {
                EntityForm.clearModificationFlag();
            }
            if (ret.instantActivity == null) {
                WorkflowActions._closeOrReload();
            } else {
                WorkflowActions._waitForInstantActivity(ret.instantActivity);
            }
        });
    },

    finishWorkItem: function (relevantDataValue, entityEventCode)
    {
        Jui.message.confirm($text("Public.OperationConfirm"), function () {
            var args = {
                workItemId: clientData.workflow.workItemId,
                result: relevantDataValue,
                entityEventCode: entityEventCode
            };
            Utility.invoke("Wf.WorkItem.finish", args, true, function (ret) {
                Jui.message.hint($text("Public.OperationSuccess"));
                CommonBusiness.loadQuickQueryNumber(clientData.unitId);
                Utility.refreshMenuNumbers(clientData.unitId, WorkflowActions.workItemUnitId);
                if (ret.instantActivity == null) {
                    WorkflowActions._closeOrReload();
                } else {
                    WorkflowActions._waitForInstantActivity(ret.instantActivity);
                }
            });
        });
    },

    createAndStartProcess: function (workflowCode)
    {
        if (WorkflowActions.isForm()) {
            if (EntityForm.validate()) {
                var args = {relationId: clientData.relationId, masterEntityId: clientData.masterEntityId};
                CommonBusiness.saveEntity(clientData.unitCode, [EntityForm.getData()], args, function (json) {
                    var entityId = json.entityIds[0];
                    WorkflowActions.addDialogResultEntityId(entityId);
                    WorkflowActions._createAndStartProcess(workflowCode, entityId);
                });
            }
        }
        else {
            WorkflowActions._createAndStartProcess(workflowCode, clientData.entityId);
        }
    },

    viewCurrentFlowChart: function ()
    {
        var args = {entityId: clientData.workflow.processId};
        Utility.openDialog("Wf.Process.ChartAndDetail.page", args, null, function () {
            WorkflowActions.reload(clientData.entityId);
        });
    },

    getInfoWindow: function ()
    {
        if (parent == null || !/Qs\.Entity\.Info\.page/.test(parent.location.href)) {
            return window;
        } else {
            return parent.EntityInfo && parent.EntityInfo.isSubPageWindow(window) ? parent : window;
        }
    },

    reload: function (entityId)
    {
        if (entityId != null && parent.EntityList && parent.list) {
            parent.CommonBusiness.updateListRow(parent.list, clientData.unitCode, parent.EntityList.listId, entityId);
        }
        var wnd = WorkflowActions.getInfoWindow();
        var args = Jui.object.clone(wnd.clientData.urlArgs);
        if (args.isCopy) {
            delete args.isCopy;
        }
        if (arguments.length > 0) {
            if (entityId == null) {
                delete args.entityId;
            } else {
                args.entityId = entityId;
            }
        }
        if (wnd != window) {
            args.slavePageCode = clientData.pageCode;
        }
        Utility.navigate(wnd.location.href, args, wnd);
    },

    _closeOrReload: function ()
    {
        if (clientData.workflow.closeDialogAfterFinish) {
            WorkflowActions.addDialogResultEntityId(clientData.entityId);
            Utility.close();
        }
        else {
            WorkflowActions.reload(clientData.entityId);
        }
    },

    addDialogResultEntityId: function (entityId)
    {
        if (Utility.isInDialog()) {
            var result = Utility.getDialogResult() || {};
            var oldIds = result.entityIds || [];
            var newIds = [];
            for (var i = 0; i < oldIds.length; ++i) {
                if (oldIds[i] == entityId) {
                    return;
                }
                newIds.push(oldIds[i]);
            }
            newIds.push(entityId);
            result.entityIds = newIds;
            Utility.setDialogResult(result);
        }
    },

    doMessage: function (event)
    {
        var data = event.data;
        if (data.action == "InstantActivityFinished") {
            WorkflowActions._stopWaitingForInstantActivity(data.args.activityId);
        }
    },

    _waitForInstantActivity: function (activity)
    {
        var wnd = WorkflowActions.getInfoWindow();
        var start = new Date().getTime();
        var countdown = Math.max(3, activity.countdown);
        var html = "<div class=QsFullSize style='position:fixed'>"
            + "<div class='QsFullSize' style='position:absolute;background-color:#808080;opacity:0.4'></div>"
            + "<div class='QsMiddleAlign QsFullSize' style='position:absolute;text-align:center;'>"
            + "<span style='font-weight:bold;font-size:32px;color:#FF0000;background-color:#FFFFFF;padding:6px'></span>"
            + "</div>"
            + "</div>";
        WorkflowActions._instantActivityWaitingMask = Jui.dom.insertHtml(wnd.document.body, "BeforeEnd", html);
        var maskTextElem = WorkflowActions._instantActivityWaitingMask.lastChild.lastChild;
        Jui.dom.setInnerText(maskTextElem, $text("Wf.Activity.InstantWaitCountdown", countdown));
        WorkflowActions._instantActivityId = activity.id;
        WorkflowActions._instantActivityCountdownTimer = setInterval(function () {
            var EXTRA_WAITING = 2;
            var seconds = Math.max(-EXTRA_WAITING, countdown - Math.round((new Date().getTime() - start) / 1000));
            if (seconds == -EXTRA_WAITING) {
                clearInterval(WorkflowActions._instantActivityCountdownTimer);
                delete WorkflowActions._instantActivityCountdownTimer;
                Utility.invoke("Wf.Activity.setInstantActivityTimeout", {activityId: activity.id}, false, function (ret) {
                    WorkflowActions.reload(clientData.entityId || WorkflowActions._newEntityId);
                });
            }
            else if (seconds <= 0) {
                Jui.dom.setInnerText(maskTextElem, $text("Wf.Activity.QueryInstantResult"));
            }
            else {
                Jui.dom.setInnerText(maskTextElem, $text("Wf.Activity.InstantWaitCountdown", seconds));
            }
        }, 1000);
    },

    _stopWaitingForInstantActivity: function (activityId)
    {
        if (activityId == WorkflowActions._instantActivityId && WorkflowActions._instantActivityCountdownTimer != null) {
            clearInterval(WorkflowActions._instantActivityCountdownTimer);
            delete WorkflowActions._instantActivityCountdownTimer;
            var maskTextElem = WorkflowActions._instantActivityWaitingMask.lastChild.lastChild;
            Jui.dom.setInnerText(maskTextElem, $text("Wf.Activity.InstantActivityFinished"));
            setTimeout(function () {
                WorkflowActions.reload(clientData.entityId || WorkflowActions._newEntityId);
            }, 2000);
        }
    },

    _createAndStartProcess: function (workflowCode, entityId)
    {
        CommonBusiness.createAndStartProcess(workflowCode, entityId, function (ret) {
            if (ret != null) {
                Jui.message.hint($text("Wf.Process.StartSuccess"));
            }
            CommonBusiness.loadQuickQueryNumber(clientData.unitId);
            Utility.refreshMenuNumbers(clientData.unitId, WorkflowActions.workItemUnitId);
            WorkflowActions.reload(entityId);
        });
    }
};
