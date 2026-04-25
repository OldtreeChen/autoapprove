var request = {
    db:null,
    downloadMyFile: function (data) {
        var tokenId = "";
        if (!request.isEmpty(localStorage.apiTokenId)) {
            tokenId = localStorage.apiTokenId;
            data._header_ = {
                tokenId: tokenId
            };
        }
        var url = request.getServerUrl() + '/qs/attachment/download';
        return fetch(url, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json'
            }
        }).then(res => {
            return res.text()
        }).catch(error => {
            console.log(error);
        });
    },

    download: function (args) {
        var data = args.file
        var titName = args.name
        if (!data) {
            return
        }
        const content = data
        const blob = new Blob([content], {type: 'application/application/vnd.openxmlformats-officedocument.wordprocessingml.document;charset=utf-8'})
        const fileName = titName ? titName : ''
        if ('download' in document.createElement('a')) {
            const elink = document.createElement('a')
            elink.download = fileName
            elink.style.display = 'none'
            elink.href = URL.createObjectURL(blob)
            document.body.appendChild(elink)
            elink.click()
            URL.revokeObjectURL(elink.href)
            document.body.removeChild(elink)
        } else {
            navigator.msSaveBlob(blob, fileName)
        }
    },


    getServerUrl: function () {
        var href = location.href;
        var url = href.split("/")[2] + "/" + href.split("/")[3];
        if(href.indexOf("/tenant/") > 0){
             url = href.split("/")[2] + "/" + href.split("/")[3]+ "/" + href.split("/")[4]+ "/" + href.split("/")[5];
        }
        return location.protocol + '//' + url + '/openapi';
    },


    getServer: function () {
        var href = location.href;
        var url = href.split("/")[2] + "/" + href.split("/")[3];
        if(href.indexOf("/tenant/") > 0){
             url = href.split("/")[2] + "/" + href.split("/")[3]+ "/" + href.split("/")[4]+ "/" + href.split("/")[5];
        }
        return location.protocol + '//' + url;
    },

    getTenantCode: function(){
        var href = location.href;
        if(href.indexOf("/tenant/") > 0){
            return href.split("/")[5];
        }else{
            return "";
        }
    },

    getLoginUrl: function(){
        return request.getServer()+"/ecp/app/login.html";
    },

    post: function (data, api,isTokenRequired) {
        var tokenId = "";
        if (isTokenRequired && !request.isEmpty(localStorage.apiTokenId) && !request.isEmpty(localStorage.userId)) {
            tokenId = localStorage.apiTokenId;
            data._header_ = {
                tokenId: tokenId
            };
        }

        var url = request.getServerUrl() + api;
        return fetch(url, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json'
            }
        }).then(res => {
            return res.json();
        }).then(result => {
            console.log(result);
            if (!result._header_.success && result._header_.errorCode === 'Qs.Token.Invalid') {
                request.setItem_storage('apiTokenId','');
                return request.login().then((ret) => {
                    if (ret._header_.success) {
                        request.setItem_storage('apiTokenId',ret.tokenId);
                        if(ret.employee){
                            request.setItem_storage('userId',ret.employee.id);
                        }else{
                            request.setItem_storage('userId','');
                        }
                        return request.post(data, api,isTokenRequired);
                    } else {
                        return result;
                    }
                });
            } else {
                return result;
            }
        }).catch(error => {
            console.log(error);
        });
    },

    signaPost: function (data, api) {
        var url = request.getServerUrl() + api;
        var timestamp = Date.now().toString();
        return fetch(url, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json',
                'x-aipower-signature': util.toHexString(sha256.digest(JSON.stringify(data))),
                'x-aipower-seed': Date.now().toString(),
            }
        }).then(res => {
            return res.json();
        }).then(result => {
            console.log(result);
            if (!result._header_.success && result._header_.errorCode === 'Qs.Token.Invalid' && !request.isEmpty(localStorage.tokenId)) {
                request.login().then((ret) => {
                    if (ret._header_.success) {
                        request.setItem_storage('tokenId',ret.tokenId);
                        if(ret.employee){
                            request.setItem_storage('userId',ret.employee.id);
                        }else{
                            request.setItem_storage('userId','');
                        }
                        request.signaPost(data, api);
                    } else {
                        return result;
                    }
                });
            } else {
                return result;
            }
        }).catch(error => {
            console.log(error);
        });
    },

    asyncPost: async function (data, api) {
        var url = request.getServerUrl() + api;
        const response = await fetch(url, {
            method: 'POST',
            body: JSON.stringify(data),
            headers: {
                'Content-Type': 'application/json'
            }
        })
        if (response.ok) return await response.json();
        else alert(response.error());
    },

    getQueryVariable: function (variable) {
        var query = window.location.search.substring(1);
        var vars = query.split("&");
        for (var i = 0; i < vars.length; i++) {
            var pair = vars[i].split("=");
            if (pair[0] == variable) {
                return decodeURIComponent(pair[1]);
            }
        }
        return (false);
    },

	getVariable:function(variable,state)
	{
		var index = state.indexOf("?");
		state = state.substring(index+1);
		var vars = state.split("&");
		for (var i=0;i<vars.length;i++) {
			var pair = vars[i].split("=");
			if(pair[0] == variable){
				return pair[1];
			}
		}
		return(false);
	},

	clearStore :function(){
		localStorage.removeItem("page");
		localStorage.removeItem("data");
	},

    login: function () {
        if (request.isEmpty(localStorage.profile) && request.isEmpty(localStorage.apiTokenId)) {
            return false;
        } else {
            var profile = JSON.parse(localStorage.profile);
            let args = {
                loginType: request.isEmpty(profile.loginType) ? 'aiff' : profile.loginType,
                openId : profile.id
            };
            if(!request.isEmpty(localStorage.apiTokenId)){
                args._header_ = {
                    tokenId: localStorage.apiTokenId
                };
            }else{
                args.tenantCode = profile.tenantCode;
                args.loginName = profile.name;
            }
            return request.post(args, '/aile/token/apply',true).then((ret) => {
               if (ret._header_.success) {
                   request.setItem_storage('apiTokenId',ret.tokenId);
                   if(ret.employee){
                       request.setItem_storage('userId',ret.employee.id);
                   }else{
                       request.setItem_storage('userId','');
                   }
               }else{
                    request.setItem_storage('userId','');
               }
               return ret;
           });
        }
    },

    application_Login: function () {
           if (request.isEmpty(localStorage.profile)) {
               return false;
           } else {
               var profile = JSON.parse(localStorage.profile);
               let args = {
                   loginType: request.isEmpty(profile.loginType) ? 'aiff' : profile.loginType,
                   openId: profile.id,
                   tenantCode: profile.tenantCode,
                   loginName: profile.name,
                   authToken : profile.authToken,
                   userId : localStorage.userId
               };
               return request.applicationApply(args);
           }
    },

    login_web:function(args){
        return request.applicationApply(args);
    },

    applicationApply:function(args){
       return request.post(args, '/application/apply',false).then((ret) => {
          return ret;
      });
    },

    isEmpty: function (string) {
        return string == null || string == "undefined" || /^\s*$/.test(string) || string == "" || string.length == 0;
    },

    loginError:function(args){
        var errorMessage = args.errorMessage;
        if(args.errorCode == "Aipower.OpenId.NotExist"){
            errorMessage = "您沒有AIPOWER帳號，無法使用該應用！";
        }
        document.body.style.pointerEvents = 'none';
        document.body.style.position = 'fixed';
        document.body.insertAdjacentHTML('afterbegin', '<div id="mask" style="position: fixed;left: 0;top: 0;width: 100%;height: 100%;background: rgba(0, 0, 0, 0.7);z-index: 1000;"></div> '
                                                        +'<div id="popup" style="position: fixed;left: 50%;top: 50%;transform: translate(-50%, -50%);background: #fff;z-index: 1001;width: 300px;padding: 20px;box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);">'
                                                         +'<div class="popup-content" style="position: relative;">'
                                                            +'<p>'+errorMessage+'</p>'
                                                          +'</div>'
                                                        +'</div>');
    },

    loginWarn:function(){
        document.body.style.position = 'fixed';
        if(document.getElementById("mask") != null){
            document.getElementById("mask").style.display = "block";
            document.getElementById("popup").style.display = "block";
        }else{
            document.body.insertAdjacentHTML('afterbegin', '<div id="mask" style="position: fixed;left: 0;top: 0;width: 100%;height: 100%;background: rgba(0, 0, 0, 0.7);z-index: 1000;"></div> '
                                                            +'<div id="popup" style="position: fixed;left: 50%;top: 50%;transform: translate(-50%, -50%);background: #fff;z-index: 1001;width: 300px;padding: 20px;box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);">'
                                                             +'<div class="popup-content" style="position: relative;">'
                                                                +'<span class="close" onclick="request.closePopup()" style="float: right;position: absolute;top: 0;right: 0;cursor: pointer;">&times;</span>'
                                                                +'<p style="float: left;">您沒有AIPOWER帳號，無法使用該功能！</p>'
                                                              +'</div>'
                                                                    +'</div>');
        }
    },

    closePopup:function(){
        document.body.style.position = 'unset';
        document.getElementById("mask").style.display = "none";
        document.getElementById("popup").style.display = "none";
    },

    selectIdentity: function(identities,callback)
    {
        document.body.insertAdjacentHTML('afterbegin', '<div id="mask" style="position: fixed;left: 0;top: 0;width: 100%;height: 100%;background: rgba(0, 0, 0, 0.7);z-index: 1000;"></div> '
                                                           +'<div id="popup" style="position: fixed;left: 50%;top: 50%;transform: translate(-50%, -50%);background: #fff;z-index: 1001;width: 300px;padding: 20px;box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);">'
                                                            +'<div class="popup-content" style="position: relative;">'
                                                               +'<span class="close" onclick="request.closePopup()" style="float: right;position: absolute;top: -16px;;right: -8px;cursor: pointer;display: none;">&times;</span>'
                                                               +'<div id="identities" style="max-height: 300px;overflow: auto;"></div>'
                                                               +'<div class="no-identity-error" style="color: red;display: none;float: left;">*請選擇身分</div>'
                                                               +'<button onclick="request.selectIdentitySubmit('+callback+')" style="float: right;">確定</button>'
                                                             +'</div>'
                                                       +'</div>');
        var container = document.getElementById('identities');
        var p = document.createElement('p');
        p.className = "title";
        p.innerHTML = "登錄身分";
        p.style.fontSize =  "20px";
        p.style.padding = ".1rem 0";
        p.style.borderBottom =  "1px solid #eee";
        p.style.textAlign = "center";
        p.style.margin = "unset";
        p.style.paddingBottom = "10px";

        container.parentNode.insertBefore(p, container);
//        container.appendChild(p);

        for (var i = 0; i < identities.length; i++) {
            var identityP = document.createElement('p');
            identityP.style.borderBottom = "1px solid rgb(238, 238, 238)";
            identityP.style.paddingBottom = "10px";
            identityP.style.textAlign = "left";
            var input = document.createElement('input');
            input.type = 'radio';
            input.name = 'radioGroup';
            input.id = identities[i].FId;
            input.value = identities[i].FEmployeeId$ || identities[i].FName;

            var label = document.createElement('label');
            label.htmlFor = input.id;
            label.appendChild(document.createTextNode(identities[i].FEmployeeId$ || identities[i].FName));

            identityP.appendChild(input);
            identityP.appendChild(label);
            container.appendChild(identityP);
        }
    },

    selectIdentitySubmit:function(callback){
        var checkedRadio = document.querySelector('input[name="radioGroup"]:checked');
        if (checkedRadio) {
            var args = {
                loginType: request.isEmpty(sessionStorage.getItem('loginType')) ? 'aiff' : sessionStorage.getItem('loginType'),
                identityId:checkedRadio.id
            };
            return request.post(args, '/application/apply',true).then((ret) => {
               if (ret._header_.success) {
                   request.closePopup();
               }
               callback(ret);
           });
        }else{
            document.querySelector(".no-identity-error").style.display="unset";
            callback(false);
        }
    },

    setItem_storage:function(key,value){
        try{
            delete localStorage.loginData;
            delete localStorage.loginName;
            delete localStorage.loginType;
            delete localStorage.contactOpenId;
            delete localStorage.contactId;
            delete localStorage.contactName;
            delete localStorage.userOpenId;
            delete localStorage.openId;
            delete localStorage.loginName;
            delete localStorage.operateMessage;
            delete localStorage.serviceNumberId;
            delete localStorage.tenantCode;
            delete localStorage.channel;

            localStorage.setItem(key,value);
        }catch(e){
            if(e.name === "QuotaExceededError"){
                alert("本地存储已满，请清理一些数据或尝试其他操作。");
                alert(localStorage);
            }else{
                alert(e);
            }
        }
    },
    /**
     * open DB
     * @param {object} dbName
     * @param {string} storeName
     * @param {string} version
     * @return {object}
     */
    async openDB (dbName, version = 1) {
        return new Promise((resolve, reject) => {
            var indexedDB =
                window.indexedDB ||
                window.mozIndexedDB ||
                window.webkitIndexedDB ||
                window.msIndexedDB;

            const requestDB = indexedDB.open(dbName, version);
            requestDB.onsuccess = function (event) {
                request.db = event.target.result;
                console.log("数据库打开成功");
                resolve(request.db);
            };
            requestDB.onerror = function (event) {
                console.log("数据库打开报错");
            };
            requestDB.onupgradeneeded = function (event) {
                console.log("onupgradeneeded");
                request.db = event.target.result;
                var objectStore_employee,objectStore_contact;
                objectStore_employee = request.db.createObjectStore("employee", {keyPath: "id"});
                objectStore_employee.createIndex("openId", "openId", { unique: true });
                objectStore_contact = request.db.createObjectStore("contact", {keyPath: "id"});
                objectStore_contact.createIndex("openId", "openId", { unique: true });
                objectStore_token = request.db.createObjectStore("token", {keyPath: "id"});
            };
        });
    },
    /**
     *
     * @param {object} db
     * @param {string} storeName
     * @param {string} data
     */
    async addData(dbName,storeName, data) {
        if (request.db == null) {
            await request.openDB(dbName,1);
        }
        var requestDB = request.db
            .transaction([storeName], "readwrite")
            .objectStore(storeName)
            .add(data);

        requestDB.onsuccess = function (event) {
            console.log("数据写入成功");
        };

        requestDB.onerror = function (event) {
            console.log("数据写入失败");
        };
    },

    /**
     *
     * @param {object} db
     * @param {string} storeName
     * @param {string} key
     */
    async getDataByKey(dbName, storeName, key) {
        if (request.db == null) {
            await request.openDB(dbName,1);
        }
        var transaction = request.db.transaction([storeName]);
        var objectStore = transaction.objectStore(storeName);
        var requestDB = objectStore.get(key);

        requestDB.onerror = function (event) {
            console.log("事务失败");
        };

        requestDB.onsuccess = function (event) {
            console.log("主键查询结果: ", request.result);
        };
    },

    /**
     *
     * @param {object} db
     * @param {string} storeName
     * @param {string} indexName
     * @param {string} indexValue
     */
    async getDataByIndex(dbName, storeName, indexName, indexValue) {
        if (request.db == null) {
            await request.openDB(dbName,1);
        }

        var store = request.db.transaction(storeName, "readwrite").objectStore(storeName);
        var requestDB = store.index(indexName).get(indexValue);
        requestDB.onerror = function () {
            console.log("事务失败");
        };
        requestDB.onsuccess = function (e) {
            var result = e.target.result;
            console.log("索引查询结果：", result);
        };
    },
    isAndroid: function(){
        var u = navigator.userAgent;
        var isAndroid = u.indexOf('Android') > -1 || u.indexOf('Linux') > -1;
        return isAndroid;
    },
};
