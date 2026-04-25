var Login =
{
    extraArgs: null,

	checkBrowser: function()
	{
		if (!window.FormData || !window.FileReader) {
			Utility.navigate("Qs.Misc.BrowserInvalid.page");
		}
	},
	
	doLoad: function()
	{
        var logoUrl = Utility.getUrl("Qs.Misc.GetLogo.file", {fileName: "IndexLogo.png"});
        $elem("Logo").style.backgroundImage = "url(" + logoUrl + ")";

		Login.createControls();
		$elem("FormPanel").style.display = "block";
		$elem("PasswordResetLink").href = Utility.getUrl("Qs.Account.PasswordForget.page");
		var loginName = Jui.browser.getCookie("LoginName") || "";
		if (Jui.string.isEmpty(Login.loginNameBox.getValue())) {
			Login.loginNameBox.focus();
		}
		else {
			Login.passwordBox.focus();
		}
	},
	
	refreshCaptcha: function()
	{
		if (clientData.captchaEnabled) {
			$elem("Captcha").src = Utility.getUrl("Qs.Misc.GetCaptcha.file?t=" + new Date().getTime());
		}
	},

	createControls: function()
	{
		var loginName = Jui.browser.getCookie("LoginName") || "";
		Login.loginNameBox = Jui.basic.InputBox.create({
			target		: "LoginNameCell",
			style		: "width:100%",
			value		: loginName,
			onkeydown	: Login.doInputKeydown
		});
		Login.passwordBox = Jui.basic.InputBox.create({
			target		        : "PasswordCell",
			type		        : "password",
			style		        : "width:100%",
			isPasswordVisible   : true,
			value		        : "",
			onkeydown	        : Login.doInputKeydown
		});
		Login.languageBox = Jui.basic.ComboBox.create({
			target		: "LanguageCell",
			style		: "width:100%",
			value		: clientData.language,
			items		: clientData.languageItems,
			onchange	: Login.doLanguageChange
		});
		if (clientData.captchaEnabled) {
			$elem("CaptchaRow").style.display = "table-row";
			Login.captchaBox = Jui.basic.InputBox.create({
				target		: "CaptchaCell",
				style		: "width:100%",
				value		: "",
				onkeydown	: Login.doInputKeydown
			});
			Login.refreshCaptcha();
		}
		Login.saveNameBox = Jui.basic.CheckBox.create({
			target		: "SaveNameCell",
			value		: !Jui.string.isEmpty(loginName)
		});
		$elem("SaveNameLabel").onclick = Login.doRemberNameLabelClick;
		$elem("LoginButton").onclick = Login.doSubmit;
		$elem("InstallPluginLabel").onclick = Login.doInstallWordPasterClick;

		if (clientData.isDomainLogin) {
			$elem("DomainRow").style.display = "table-row";
			Jui.basic.InputBox.create({
				target		: "DomainCell",
				style		: "width:100%",
				disabled	: true,
				value		: clientData.domain
			});
		}
		if (/jumpCode=([\w\.]+)/.test(window.location.href)) {
			var jumpCode = RegExp.$1;
			if (jumpCode == "KickOut") {
				Jui.dom.setInnerText($elem("ErrorMessage"), $text("Qs.Auth.KickOut"));
			}
			else if (jumpCode == "CrowdOut") {
				Jui.dom.setInnerText($elem("ErrorMessage"), $text("Qs.Auth.CrowdOut"));
			}
			else if (jumpCode == "SessionInvalid") {
				Jui.dom.setInnerText($elem("ErrorMessage"), $text("Qs.Auth.SessionInvalid"));
			}
			else if (jumpCode == "OuterLoginFailed") {
				Jui.dom.setInnerText($elem("ErrorMessage"), $text("Qs.Auth.OuterLoginFailed"));
			}
			else if (jumpCode.indexOf("ReloginOut") == 0) {
				Jui.dom.setInnerText($elem("ErrorMessage"), $text("Qs.Auth." + jumpCode));
			}
		}
		if (!Jui.array.isEmpty(Login.licenseWarnings)) {
			var buffer = [];
			buffer.push("<div>" + $text("Qs.Index.LicenseWarning") + "</div>");
			for (var i = 0; i < Login.licenseWarnings.length; ++i) {
				buffer.push("<li>" + $text.apply(null, Login.licenseWarnings[i]) + "</li>");
			}
			$elem("LicenseWarningPanel").innerHTML = buffer.join("");
			$elem("LicenseWarningPanel").style.display = "block";
		}
	},

	login: function(args)
	{
		if (Login.isLoggingIn) {
			return; //prevent double click on login button
		}
		var ajax = new Utility.Ajax("Qs.OnlineUser.login", args);
		ajax.onfailure = function() {
			Login.isLoggingIn = false;
			Jui.dom.setInnerText($elem("ErrorMessage"), ajax.result.errorMessage);
			Login.passwordBox.focus();
			if (clientData.captchaEnabled) {
				Login.captchaBox.setValue();
				Login.refreshCaptcha();
			}
		};
		ajax.onsuccess = function(ret) {
			if (ret.identities) {
				Login.isLoggingIn = false;
				Login.selectIdentity(args, ret);
			}
			else if (ret.relogin) {
				Login.isLoggingIn = false;
				Jui.message.confirm($text("Qs.Index.ReloginConfirm." + ret.relogin), function() {
					delete args.checkRelogin;
					Login.login(args);
				});
			}
			else {
				Jui.browser.setCookie("LoginName", Login.saveNameBox.getValue() ? Login.loginNameBox.getValue() : "");
				window.location.href = Utility.getUrl((ret.mainPage || "Qs.MainFrame") + ".page");
			}
		};
		Login.isLoggingIn = true;
		ajax.submit();
	},
	
	selectIdentity: function(loginArgs, loginResult)
	{
		var data = {relogin: loginResult.relogin};
		Utility.openDialog("Qs.AccountIdentity.SelectDialog.page", null, {data: data}, function(ret) {
			loginArgs.identityId = ret.identityId;
			loginArgs.asDefault = ret.asDefault;
		    delete loginArgs.checkRelogin;
		    delete loginArgs.loginName;
		    delete loginArgs.password;
			Login.login(loginArgs);
		});
	},

	doSubmit: function()
	{
		Jui.dom.setInnerText($elem("ErrorMessage"), "");
		if (Jui.string.isEmpty(Login.loginNameBox.getValue())) {
			Jui.dom.setInnerText($elem("ErrorMessage"), $text("Qs.Index.InputLoginNameAlert"));
			Login.loginNameBox.focus();
			return;
		}
		if (Login.passwordBox.getValue() == "") {
			Jui.dom.setInnerText($elem("ErrorMessage"), $text("Qs.Index.InputPasswordAlert"));
			Login.passwordBox.focus();
			return;
		}
		if (Jui.string.isEmpty(Login.languageBox.getValue())) {
			Jui.dom.setInnerText($elem("ErrorMessage"), $text("Qs.Index.SelectLanguageAlert"));
			Login.languageBox.focus();
			return;
		}
		if (clientData.captchaEnabled && Jui.string.isEmpty(Login.captchaBox.getValue())) {
			Jui.dom.setInnerText($elem("ErrorMessage"), $text("Qs.Login.InputCaptchaAlert"));
			Login.captchaBox.focus();
			return;
		}
		Utility.invoke("Qs.Misc.getLoginPublicKey", null, false, function(ret){
			var jsEncrypt = new JSEncrypt();
			jsEncrypt.setPublicKey(ret.publicKey);
			var args = {
				loginName: Login.loginNameBox.getValue(),
				password: jsEncrypt.encrypt(Login.passwordBox.getValue()),
				language: Login.languageBox.getValue(),
				extraArgs: Login.extraArgs,
				checkRelogin: true
			};
			if (clientData.captchaEnabled) {
				args = Jui.object.merge(args,{captcha : Jui.string.trim(Login.captchaBox.getValue())});
			}
			if (!Jui.object.isEmpty(Login.adDomainBox)) {
				args = Jui.object.merge(args, {addomain : Login.adDomainBox.getValue()});
			}
			Login.login(args);
			Jui.browser.setCookie("Language", args.language);
		});
	},

	doLanguageChange: function()
	{
		var language = Login.languageBox.getValue();
		if (!Jui.string.isEmpty(language)) {
			Jui.browser.setCookie("Language", language);
			window.location.reload(true);
		}
	},
	
	doRemberNameLabelClick: function()
	{
		Login.saveNameBox.focus();
		Login.saveNameBox.setValue(!Login.saveNameBox.getValue());
	},

	doInputKeydown: function()
	{
		if (event.keyCode == 13) {
			Login.doSubmit();
		}
	},
	
	doInstallWordPasterClick: function()
	{
		Utility.openDialog("Qs.Misc.InstallWordPaster.page");
	}
};

Login.checkBrowser();
window.addEventListener("load", Login.doLoad);
Utility.addFunctionAlias(Login);

