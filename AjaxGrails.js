/**
* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
* AjaxGrails - Oct/2013
* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
* Copyright © 2013 Jorge Colombo (Buenos Aires, Argentina)
* Licensed MIT 
*
* contact: jcolombo@ymail.com
* ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
*
* Simple javascript that making Ajax requests to Grails application Server.
*
* DEPENDANCIES:
* jQuery 1.5+ required
*
* FEATURES:
*   . Spring Security Grails plugin compliance
*   . Coexist multiple instances against different or same servers
*   . Auto login-in on GET/POST/.. response status 401 Unauthorized
*   . Self-Aware Cross Domain
*   . All requests are asynchronous by default, event-driven responses
*   . Expects responses in JSON (by default)
*   . Saves login data (loginData prop.) and its status
*   . It use JQuery.Ajax (same options configurable although isn't necessary)
*   . Debugging features
*   . Login verbs: login, relogin, logout, check. 
*   . Request verbs: get, post
*
* USE EXAMPLES:
*
*   create instance for mydomain.com w/ login's data 
*   var ag1 = window.newAjaxGrails( "http://www.mydomain.com", $("#username").val(), $("#password").val() );
*
*   then GET book list (auto-login will be triggered)
*   ag1.get("/book", getResultHandler);
*   ...
*
*   ag1.post("/book/save", saveResultHandler, { data: {price:  $("#price").val() } } );
*
*/
(function (window, $) {
	'use strict';
	
	function AjaxGrails(serverURL, username, password, remember) {

		var self = this, 
			version = '1.2',
			auth = false,
			logId = 0,
			lang = '',
			lastLang = '',
			HDR_LOGGED = 'XXX-Logged',
			HDR_LOCATION = 'Location',
			_retry401 = false, _flogin = false, _frelogin = false, _earlyCheck = false;

		this.debugLevel = 0;		// 0 = none | 1 = Log activo (ver c/alertLog() method) | 2 = runtime alerts x c/ajax
		this.serverURL = serverURL || '';
		this.username = username;
		this.password = password;
		this.remember = remember;
		this.loginData = {};
		this.isAutoOn401 = true;
		this.SS = {rem:'_spring_security_remember_me', pass: 'j_password', user: 'j_username', login: 'j_spring_security_check', logout: 'j_spring_security_logout', fld_LoggedIn: '_loggedIn', remCheck: 'login/ajaxRecheck'}; //, i18nService: 'login/i18n' };
		this.cross = ( serverURL.toLowerCase() != (location.protocol +'//'+ location.hostname + (location.port!=80?':'+location.port:'')).toLowerCase() );
		this.toString = function(){ return '** AjaxGrails to '+this.serverURL+' - Auth: ('+this.username+', '+this.password+') is Login: '+(auth?'IN':'OUT')+' **'; };
		this.version = function() { return version; };
		
		// --- PRIVATES
		function _rvErr(xhr) { 
			return { 	success:false, 
						error: xhr.status +' '+ xhr.statusText,
						status: xhr.status,
						hLogged: xhr.getResponseHeader(HDR_LOGGED), 
						hLocation: xhr.getResponseHeader(HDR_LOCATION), 
						xhr: xhr
			}; 
		};
		
		function setAuth(d) {	
			auth = d.result[self.SS.fld_LoggedIn] ? true : false; 
			self.loginData = d.result;
			self.loginData._loginDate = new Date();
			log(self.toString(),-1);
		};
		
		function resetAuth() { 
			auth = false; 
			self.loginData = {}; 
		};

		function earlyCheck(url, cback) {
			if (!_earlyCheck && !auth && !_flogin && url.search(self.SS.remCheck)<0 
						&& url.search(self.SS.logout)<0 && url.search(self.SS.login)<0 && self.username) {
				_earlyCheck = true;
				log(" ... early check for login status ...",-1);
				self.check( cback );
			} else if (cback) {
				cback();	
			}	
		};
		
		function _chk401(xhr,text,method,url,options,sus,err,alw,lid) { 	// check si necesario auto-login
			if ( self.isAutoOn401 && !_retry401 && xhr.status==401 && self.username ) {
				_retry401 = true;
				log(' ... --- auto-retry due 401 is ON --- ',lid);
				self.relogin( function(d){ 
					_retry401 = false; 
					log(' ... --- auto-retry OFF --- ',lid);
					if (auth) { 
						doAjax(method,url,options,sus,err,alw); 
					};
				});
			};
			if(err && !_retry401) err(_rvErr(xhr));
		};
		
		function doAjax(method,url,options,sus,err,alw) {
			options = $.extend({type:method, async:true},options);
			if (self.username) options = $.extend({xhrFields:{withCredentials: true}},options);
			options.data = $.extend({ajax:true},options.data);
			if (self.lang && self.lang!=self.lastLang) { $.extend(options.data,{lang:self.lang}); self.lastLang=self.lang; };
			var ops = $.extend({dataType: "json", crossDomain: self.cross, url: self.serverURL+url}, options );
			debug('request options:',ops); 
			var lid = log(method+' '+url);
			var req = $.ajax(ops);
			req.always(function(dorxhr,text) { 
				if(alw) alw(dorxhr,text); 
			});
			req.done(function(d,text,xhr){ 
				log(' ...done: '+ ddrill(d), lid);
				earlyCheck( url, function() { if(sus) sus({success:true, result: d}); });	
			});
			req.fail(function(xhr,text){
				log(' ...FAIL: '+text+' ('+xhr.status+' '+xhr.statusText+')' , lid); 
				_chk401(xhr,text,method,url,options,sus,err,alw,lid); 
			}); 
		};
		
		// ------- PUBLICS ----------
		
		this.isAuth = function() { return auth; };
		
		this.get = function (url, cback, options){ doAjax('GET', url, options, cback, cback); };

		this.post = function (url, cback, options){ doAjax('POST', url, options, cback, cback); }; 
		
		this.relogin = function (cback){ 
			_frelogin = true;
			return self.login(cback);
		};
		
		this.login = function (cback){ 
			if (!_flogin && self.username) {
				var doit = function() {
						_flogin = true; // set: intentando login
						resetAuth();
						var data = {};
						data['_'+(self.SS.rem)] = '';
						data[self.SS.pass] = self.password;
						data[self.SS.user] = self.username;
						data.controller = self.SS.login;
						if (self.remember) data[self.SS.rem] = 'on';
						doAjax('POST', '/'+self.SS.login, { data: data }, 
								function(d,t,xhr){ 		// success post
									if(d.success && d.success==true) { setAuth(d); }; 
									if(cback) { cback(d); };
								}, 
								function(xhr,text){ 	// error post
									if(cback) { cback(_rvErr(xhr)); };
								}, 
								function(dorxhr,text){  // allways
									_flogin = false; 
								} 
						);
				};
				if (_frelogin) {
					doAjax('GET','/'+this.SS.logout, {}, null, null, doit );
				} else {
					self.check( function(r) { 
						if ( !auth || !self.loginData || self.loginData.username != self.username ) doit();
						else {
							if(cback) { cback({success:true,result:self.loginData}); };
							_flogin = false;  // mismo user ya estaba login in
						}
					});
				};
			};
			_frelogin = false;
		};

		this.logout = function (cback){ 
			if (_flogin || (!self.username && !auth) ) return false;  // ya ocupado en login o no login-in
			doAjax('GET', '/'+this.SS.logout, {dataType: "text"}, function(d){ if(cback){cback(d)}; resetAuth(); log(self.toString(),-1);}, cback );
		};
		
		this.check  = function (cback){ 
			if (_flogin) return false;  // ya ocupado en login (no se intentará)
			resetAuth(); 
			doAjax('GET', '/'+this.SS.remCheck, {},
				function(d,t,xhr){ 		// success post
					if(d.success && d.success==true) { setAuth(d); }; 
					if(cback) { cback(d); }; 
				}, 
				function(xhr,text){ 	// error post
					if(cback) { cback(_rvErr(xhr)); };
				} 
			);
		};
		
		this.setAuthData  = function (u,p,r) {
			if (typeof u === 'object') {
				// por convension el object puede tener: username, password, remember; u otras propname (ver code)
				self.username = u.j_username || u.username || u.user;
				self.password = u.j_password || u.password || u.pass; 
				self.remember = u.j_remember_me || u.remember_me || u.remember || u.rem;   
			} else {
				self.username = u;
				self.password = p;
				self.remember = r;
			};
			resetAuth();
		};
		
		this.setLanguage = function(l) { self.lang = l; };
		
		// --------- privates for debug ------------
		
		function ddrill(d,p) {
			if (typeof(d)!=='object') return d;
			var t;
			for (var x in d) { t = (t?t+', ':'') + x +': '+ ddrill(d[x]); };
			return '{'+t+'}';
		};
		function debug(cap,d) {
			if(self.debugLevel<2) return;
			var txt = ddrill(d);
			if (txt) console.info('<<AJAX>>  '+cap+'\n'+txt );	
		};
		function log(t,lid) { 
			if (self.debugLevel<1) return 0;
			if (!lid || lid==0) lid = ++logId; //new log ID
			console.info( (lid>0?'[ '+ lid +' ] ':'\t'), (t.length>220?t.slice(0,216)+'...':t).replace(/[\n\f\t\r]+/,' ') );
			return lid;
		};
	};

	window.newAjaxGrails = function(args) { return new AjaxGrails(args); };
	
}(window, jQuery));
