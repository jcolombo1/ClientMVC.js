/**
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 * ClientMVC - Oct/2013
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 * 	Copyright © 2013 Jorge Colombo (Buenos Aires, Argentina); 
 *  Licensed MIT 
 *
 *	contact: jcolombo@ymail.com
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *
 * Simple MVC client javascript object.
 *
 * DEPENDANCIES:
 *     jQuery                 1.5+         required
 *     TExpreso               1.1          required
 *     jquery.TExpreso        1.1          required
 *     docCookies
 *
 * @TODO
 *        - Permitir mas de 1 AjaxGrails object a la vez (en onHelper)
*/
 
 
 /**
 *    Se crea una instancia de ClientMVC para displayar y controlar las vistas desde templates (TExpreso) en función al "hash path" accedido.
 *
 *    @option    autoStart:      boolean   arranque "on document ready" de clientMVC (default true). Si "false", deberá invocar clientMVC.start() method.
 *    @option    viewId:         string    element id al cual se renderizarán las vistas (default "viewId")
 *    @option    appPath:        string    URL (relativa) donde reciden los templates (default "../" -parent dir-)
 *    @option    tplExtension:   string    extensión de archivos template (default "html") [No incluir el punto!]
 *    @option    loadErrorMsg:   string    contenido a mostrar ante un template no encontrado (default "<b>... error de carga de página ...</b>")
 *
 *    Nota: cada route hereda estos atributos, aunque además en cada route puede indicársele los propios a gusto (ver method whenRoute()).
 *
 */
function ClientMVC(opts) {
	//'use strict'
	
    var $ = jQuery;
	
    var self                 = this,
    	global 				 = {serverPath: '/'+String(window.location.pathname).split('/')[1] },
        IAM                  = "ClientMVC",
        IAM_ERROR            = IAM+" ERROR: ",
        VERSION              = "1.0",
        ROUTE_ERROR          = "'hash' ignored!, must be a string without strange characters",
        LOADER_ROUTE		 = "_LOAD_",		
        ATTR_DATA_PARTIAL    = "data-partial",
        ATTR_DATA_ONCHANGE   = "data-onchange",
        ATTR_DATA_SECTIONKEY = "data-sectionkey",
        ATTR_DATA_BACKBTN 	 = "data-backbtn",
        ATTR_DATA_LANG		 = "data-lang",
		APPENDVIEW_SELECTOR  = ".row,.row-fluid,.container,.container-fluid",		//sel. relativo a Twitter-Bootstrap container
		LANGUAGE 			 = "es",
		SYMB_LANG 			 = "%LANG%",
		COOKIE_LANG 		 = IAM+"_LANG",
    	timer,
		started,
		inHBackFlag,
 		routes = [], othersLoaded, updQueue = {}, hdeep = 0,
        currentRoute, previousRoute,
        PARSEPAT = /[\s,]+/g,
		HTTPMATCH = /https*:/i;

    // check dependencias
	
	if (!($ && window.TExpreso && $.TExpreso && docCookies)) { console.error(IAM_ERROR,"Missing any dependencies: JQuery 1.5+, TExpreso 1.1+, JQuery TExpreso 1.1+"); return;};
    
	// default options de cada router
	
    var options = $.extend( { 
    		autoStart:      true,
            viewId:         "viewId",
			AG: 			null,			// AjaxGrails provider
			others:			null,			// otros templates de uso común ( ej: ['commons'] )
			// -- heredados a c/route --
			appPath:        "../",
			sufixURI:		"",
            tplExtension:   ".html",
            loadErrorMsg:   "<b>... error de carga de página ...</b>",
			startOnlyOnce:  false,
			onFault: defaultFault
	}, opts );

    //this.debugLevel = 0;   // PUBLIC 0=none; 1=logs; 2=logs Form-Data submit; 3=logs model data; 4=log helpers tbm

    $.extend( this , {
    	debugLevel: 0,				// PUBLIC 0=none; 1=logs; 2=logs Form-Data submit; 3=logs model data; 4=log helpers tbm
    	LOADER: LOADER_ROUTE,
    });
    
    function defaultFault(ctx, d) {
		var o = ctx || options , text;
		if (!d) text = o.loadErrorMsg;
		else if (d.status==401) text = 'ERROR: ' + d.error +'   (Logged: '+ d.hLogged +', Location: '+ d.hLocation +')';  
		else text = 'ERROR: ' + d.error;
		alert(text);
    };
    
    function getInputValue(e) {  // wrapper x element
        return ( !String(e.type).match(/(checkbox|radio)/i) ? e.value : ( e.value.match(/(on|true|false)/i) ? ( e.checked ? true : false ) : ( e.checked ? e.value : "" ) ) );
    };
    
    function getInputName(e) {  // wrapper 
        return e.name;
    };
    
	function _oget(obj,sn) { 
		//reemplaza --> return eval( "obj."+sn+";" ); 
		try {
			var m = obj, ss = sn.split('.');
			for (var i in ss) { m = m[ss[i]]; };
			return m;
		}catch(x){};
		return;
	};	
	
    /**
    *    Asigna value/checked en el route.model (no afecta DOM) y solo su valor directamente, a diferencia de setModelView() que 
    *    asigna la vista y model incial.
    *    La prop accedida mediante 'n' debe existir previamente, sino se ignora la asignacion.
    */
    function updateModel(route, n, v) {  // route, name, value
 		var o = _oget(route.model, n);
        if (o!==undefined ) {
            if (o.type=='checkbox') o.checked = v; else o.value = v;
            _setHelpers(o);
        }    
    };
	
    /**
    * Actualiza el contenido de los "TExpreso templates" [<div data-partial='xxx' ..]. A los que se les haya indicado además el 
    * attr "data-onchange" (q contiene los field names o '*' -para todos- que actúan de disparadores de actualización del ese partial. 
    * Esta función se ejecuta en cada evento change de inputs.
    * 
    * @param    elemName    string    DOM-name ó jid ('#xxx') del input/sectionkey subyancente que disparó el change
    * @param    route        object    route activo (o currentRoute)
    */
    function updateHots(elemName, route) {
        hdeep++;
        var elems=[], rends=[]; //, chain=[];
        $("["+ATTR_DATA_ONCHANGE+"]").each( function(i,e) {
            if (!e.id || rends.indexOf(e.id)<0) { // ya renderizado? (no más de 1 vez en mismo updateHots)
                rends.push(e.id);
                var oca = ($(e).attr(ATTR_DATA_ONCHANGE) || "").split(PARSEPAT);
                if (oca.indexOf("*")>-1 || oca.indexOf(elemName)>-1) {
                    var ctx = $.extend({elemName: elemName},route);
                    
        			if (typeof ctx.onChange=='function') {
						var sk = $(e).attr(ATTR_DATA_SECTIONKEY);
        				deferred( ctx, ctx.onChange, function(){ pushToUpdView((sk?sk:e.id?('#'+e.id):null), elemName); if (hdeep==0) processUdpQueue(ctx); } );
        				ctx.proceed(ctx);
        				ctx.resolve();
        			}
                }    
            }    
        });
        hdeep--;
    };
    
    function processUdpQueue(route) {
        // loop para set de jq elems involucrados
        for (var i in updQueue) {
            if (i.charAt(0)=='#') updQueue[i].elems = $(i).get();
            else updQueue[i].elems = $("["+ATTR_DATA_SECTIONKEY+"='"+i+"']").get();
        };
        
        var e, chain=[];
        for (var j in updQueue) {
            var elems = updQueue[j].elems;
			if (elems.length<1) continue;
            var cause = updQueue[j].cause;
            log(".processUdpQueue() caused by: '"+ cause + "'");
            for (var i in elems) {
                e = elems[i]; 
                var sk = $(e).attr(ATTR_DATA_SECTIONKEY), tpl = $(e).attr(ATTR_DATA_PARTIAL);
				var obj = sk ? _oget(route.model, sk) : route.model;  // si no tiene sk se asume model completo
                $(e).TExpreso(tpl, obj);
                $(e).find("input,select").not(":button,:reset,:submit").change( function(){ return inputCallback(this, route); } );
                $(e).find("button,a,input[type='button']").not(":submit").click( function(){ return inputCallback(this, route); } );
				$(e).find("form").submit(function(){return inputCallback(this, route);});
				$(e).find("["+ATTR_DATA_BACKBTN+"]").click( function(){ return backBtnCallback(this); } );
                log("\tre-render sectionkey or #id '"+(sk?sk:'#'+e.id)+"' with partial-template: '"+ tpl +"'");
                sk ? chain.push(sk) : e.id ? chain.push('#'+e.id) : null;
            }
        };
        updQueue = {}; // evitar abrazo-mortal
        // lanzar updateHots por los recien cambiados
        for (var i in chain) {
            updateHots(chain[i],route);
        }
    };
    
    
    /**
    * Callback que es convocado en cada evento change (de inputs) y evento click (de botones, links y submit).
    * Desde este se convoca a actualizar el model del route activo (updateModel) y luego los partial templates (updateHots)
    * de la vista activa. Posteriormente se convoca al method de developer: .onChange/onClick(ctx)  
    * Si es evento click, se establece el valor de "ctx.actionLink" para uso del developer.
    * Si es un click de submit, se colectan los valores de los inputs correspondientes al FORM del submit y se los 
    * aplica en "ctx.data". 
    * 
    * @param    elem        object    HTTPElement (DOM) subyancente que disparó el evento
    * @param    route        object    route activo (o currentRoute)
    *
    * Ensambla el object ctx (contexto) parámetro del method .onChange/onClick() de la forma:
    *
    *    @key    elem        object    HTTPElement (DOM) subyancente que disparó el evento
    *    @key    type        string    [Sólo si es click] tipo de elemento disparador: a|button|submit 
    *    @key    data        object    [Sólo si es click de submit] {key: value} de los inputs del FORM subyacente.
    *    @key    actionLink  string    [Sólo si es click] según type y con precedencia: 
    *                                     si es submit será su: name || form.action
    *                                     si es link será su:   name || href (que debe comenzar con "_")
    *                                     si es button será su: name || value
    *
    * @TODO    @CAUTION no debería ser route completo lo q se le pasa en ctx 
    */
    function inputCallback(elem, route) {
        /** @todo no debería ser route completo lo q se le pasa en ctx */
		var rv = false, alink, ctx = $.extend({elem: elem}, route);  // arma ctx de .onChange/onClick() igual a route + elem prop. 
        var tagType = String(elem.tagName==='FORM' ? 'submit' : elem.tagName==='A' ? 'a' : elem.type).toLowerCase() ;  // dilucidar q fue cliqueado
        if (tagType.match(/^(a|button|submit)$/i)) {
			rv = true;  // NO preventDefault()
            if (tagType==='submit') { //elem es FORM?
				if (!$(elem).attr("action") && elem.name) $(elem).attr("action",elem.name);  // forzar action value
				alink = $(elem).attr("action");
                $.extend(ctx,{ data: getFORMData(elem), actionLink: alink, type: 'submit'});  // se adiciona form submitted: data y actionLink
            } else if (tagType==='a') {
            	alink = $(elem).attr("href");
            	var alp = parseHRef(alink);  
            	alink = alp.hash ;
                $.extend(ctx,{actionLink: alink, a: alp, type: 'a'});
            } else {
                alink = elem.name || elem.value || elem.id;
                $.extend(ctx,{actionLink: alink, type: 'button'});
            };
            log(".onClick() callback: '"+ tagType + "', actionLink: '"+ alink +"', type: '"+ ctx.type +"', value: '"+ getInputValue(elem) +"' "+ (ctx.data?"**FORM DATA**":"") +" (hash: "+route.hash +")");
            if (self.debugLevel>1 && ctx.data) logd("** DATA FORM for actionLink: '"+ alink +"' (in ctx.data) **",ctx.data);
            if (self.debugLevel>2 && route.model) logd('** ROUTE "'+ route.hash + '" DATA MODEL (in route.model) **',route.model);
            
			if (typeof ctx.onClick=='function') {
				deferred( ctx, ctx.onClick, function(){ processUdpQueue(ctx); checkToGo(ctx); } );
				if ((rv=ctx.proceed(ctx))===undefined) {
					rv = (tagType==='submit') || (tagType==='a' && alink.indexOf('#_')==0) ? false : true;  // false implica preventDefault()
				};
				ctx.resolve();
			};
			
			// ---- CONVENSION: si es tag A con attr "data-lang", auto-disparar cambio de LANGUAGE ----
			if (tagType==='a') {
				var dlang = $(elem).attr(ATTR_DATA_LANG);
				if (dlang) { self.setLanguage(dlang); return false; }; // cambia lang y preventDefault()
			};
            return rv; //false implica preventDefault() !!
        };
        updateModel(route, getInputName(elem), getInputValue(elem));
        updateHots(elem.name, route);
        log('Was callback CHANGE elem name: \''+ getInputName(elem) +'\', value: "'+ getInputValue(elem) +'" (hash: '+route.hash +')');
        return true; // cback ok
    };
    
    function backBtnCallback(e) {
       	currentRoute.thenGo = currentRoute.backBtn || $(e).attr(ATTR_DATA_BACKBTN) || '.back' 
   		checkToGo(currentRoute);
    	return true;  // no preventDefault
    };

    /**
     * Retorna objeto tal que dado un href: xx/yy?a=1&b=2#hhh/jjjj, su resultado será: { hash: '#hhh/jjjj', query: 'a=1&b=2', path: 'xx/yy' }
     * tested!
     * @param href
     * @returns object
     */
    function parseHRef(href) {
    	var rv = {path: '', query: '', hash: ''};
    	if (!href) return rv;
    	var p, h = href.indexOf('#'), q = href.indexOf('?');
    		
    	if (h>=0 && q>=0 && h>q) {   // full & normal
    		p = href.split(/[?#]/);
    		rv = { path: p.shift(), query: p.shift(), hash: '#'+p.shift() };
    	} else if (h>=0 && q>=0 && h<q) {   // full & anormal
    		p = href.split(/[?#]/);
    		rv = { path: p.shift(), hash: '#'+p.shift(), query: p.shift() };
    	} else if (h>=0 && q<0) {   // sin query
    		p = href.split('#');
    		rv = { path: p.shift(), query: '', hash: '#'+p.shift() };
    	} else if (h<0 && q>=0) {   // sin hash pero c/query
    		p = href.split('?');
    		rv = { path: p.shift(), query: p.shift(), hash: '' };
    	} else if (href){	// sin hash o query pero c/path
    		rv = { path: href, query: '', hash: '' };
    	}
    	return rv;
    };
    
	function checkToGo(ctx) {
		if (typeof ctx.thenGo!=='string') return;
		var f;
		if (ctx.thenGo.match(/\.back/i)) {
			f = function(){ window.history.back(); };
		} else if (ctx.thenGo.match(/\.refresh/i)) {
			f = function(){ renderRoute(currentRoute,true); }; // true=refreshing
		} else {
			var new_url;
			if (ctx.thenGo.match(HTTPMATCH)) new_url = ctx.thenGo;
			else if (ctx.thenGo=='/') new_url = '../../';
			else if (ctx.thenGo.indexOf('/')>=0) new_url = window.location.protocol +'//'+ window.location.host + ctx.thenGo;
			else new_url = ctx.thenGo ? "#"+ctx.thenGo : "#"; // solo cambió el hash
			
			if (ctx.noHistory) f = function(){ window.location.replace(new_url); };
			else f = function(){ window.location.assign(new_url); };
		};
		ctx.thenGo = null;
		setTimeout(f, 100);
	};
	
    function getFORMData(form) {
        var radios = [], data = {};
        //var assign = function(n,v) { try { eval('data["'+n+'"]=v;'); }catch(x){}; };
		var assign = function(n,v) { try { data[(n)]=v; }catch(x){}; };
        /** @TODO usar form.elements[]*.value en vez q jquery para recorrer elementos del form */
        $(form).find("input,select").not(":button,:reset,:submit").each( function(i,e) { 
            if (!e.name) return;
            if (String(e.type).match(/radio/i)) {
                if (radios.indexOf(e.name)<0) radios.push(e.name); //solo 1 vez
            } else {    
                assign( e.name, getInputValue(e) ); 
            }
        });
        if (radios.length==0) return data;
        while (radios.length>0) {
            var n = radios.shift(), rv = '';
            $(form).find(":radio[name='"+n+"']").each( function(i,e) {  
                if(e.checked){rv=e.value;return false;}
            });
            assign( n, rv ); 
        };
        return data;
    };
    
    /**
    * Principalmente establece como activo el route indicado luego de renderizalo al DOM mediande TExpreso framework. Si el template implicado 
    * en el route no fue cargado en cache antes, lo hace (carga on-demand). 
    * Una vez renderizalo el template, se actualiza la propiedad currentRoute y se convoca al method de developer: .started().
    * Además establece los callback (por change y click) para todos los elementos subyacentes del template volcado (incluídos sus partials).
    * Dado que la carga de templates es asincrónica, los callback sets y la llamada a .started() son efectuados de esa manera.
    * 
    * @param    route        object    route a establecer como activo (NO ES el currentRoute sinó el futuro)
    *
    * @TODO    @CAUTION no debería ser route completo lo q se le pasa en .started() 
    */
    function renderRoute(route, refreshing) {
		if (!route) return;
        var jid = '#'+options.viewId; //route.viewId;           //target view (should be div)
        var doit = function(rou) { 
                $(jid).TExpreso(rou.template, rou.model);         // render view!
				if (!refreshing) { previousRoute = currentRoute; currentRoute = rou; }
				rou.displayed = true;   //indicar q ya fue activo alguna vez
                $(jid).find("input,select").not(":button,:reset,:submit").change( function(){ return inputCallback(this, rou); } );
                $(jid).find("button,a,input[type='button']").not(":submit").click( function(){ return inputCallback(this, rou); } );
				$(jid).find("form").submit(function(){return inputCallback(this, rou);});
				$(jid).find("["+ATTR_DATA_BACKBTN+"]").click( function(){ return backBtnCallback(this); } );
				var thenFn;
				if (rou.hash!==LOADER_ROUTE) {
					thenFn = function() { processUdpQueue(rou); checkToGo(rou); };
				} else {
					thenFn = function() { 
						processUdpQueue(rou); 
						hashChange({starting:true, oldURL: null, newURL: window.location.href }); 
					};
				};
				
				log('.renderRoute(): '+routeLog(rou));

                // call user .started()
				
				if (typeof rou.started=='function') {
					deferred( rou, rou.started, thenFn);
					rou.proceed();
					rou.resolve();
					log('.started() called for hash: '+ routeLog(rou) );
				}
		};
                    
        loadTemplates( route, doit, function() { $(jid).html(options.loadErrorMsg); currentRoute = null; } );
    };

	/**
    *    Carga archivos asíncronamente (templates). Una vez realizada la carga de todos continua convocando a done() (o fail() si resulto algun error). 
    */
    function loadTemplates( route, done, fail ) {
			
        var queue = []; 
        
        var repSymb = function(f) { return f.replace('%LANG%',LANGUAGE); }; // reemplazar "%LANG%" x LANGUAGE seteado
        var wdir = function(f,far) { return ( far ? options.appPath + f + options.tplExtension : route.appPath + route.sufixURI +"/"+ f + route.tplExtension ); };
        var toLoad = function(f,far) {
        	if (f) {
        		if (f instanceof Array) {
                    for (var i in f) {
						var url = wdir( repSymb(f[i]), far );
						if (!$.TExpreso.has(f[i]) && !$.TExpreso.hasUrl(url)) queue.push(url);
                    }
        		} else {
					var url = wdir( repSymb(f), far );
					var xxx = $.TExpreso.has(f);
					if (!$.TExpreso.has(f) && !$.TExpreso.hasUrl(url)) queue.push(url);
        		}
        	} 
        };
		
        // load on-demand
        
        toLoad(route.template);      
        toLoad(route.templates);      
        if (!othersLoaded) { othersLoaded=true; toLoad(options.others,true); };
        
        if (queue.length==0) { done(route); return; };	//nada para hacer?
		
		// crear contexto para carga diferida y ejecutarla
		
		var ctx = {
			count: 0,
			hash: route.hash,
			load: function(cx,q) {
				cx.defer(q.length);
				for (var i in q) {
					var qq= q[i];
					$.TExpreso.addFromUrl(q[i], function(cnt,tt) {
						if (cnt!=0) { log("<< Remote template loaded: "+tt); cx.count++; }
						else { console.warn(IAM_ERROR, '!! Template NOT found! (path: '+tt+')'); };
						cx.ready(cx.count);
					});
				}; 
			}	
		};
		
		deferred( ctx, ctx.load, function(count){ if(count==queue.length) done(route); else fail(); } );
		ctx.proceed(queue);
		ctx.resolve();
    };


    /**
    * Impone convenciones necesarias sobre los templates html.
    * Es convocada desde $.TExpreso (previamente sindicado con $.TExpreso.setLoadObserver) para cada template al momento de su 
	* carga en cache, sobrescribiendo su contenido si es necesario.
    *
    * Convensiones (hasta hoy):
    * -------------------------
    *
    *     Todo element con attr "data-partial" será considerado un "caller" de partials-templates. Su informacion requerida mínima
    *     tiene la siguiente forma:  
    *                        <TAG data-partial='template-partial' />  
    *     se lo sobrescribe así:
    *                        <TAG id='mvc-partial-NN' data-partial='template-partial'> {{> template-partial}} </TAG>
    *
    *     Si el TAG contiene id y/o content-text no se sobreescribirán (si ya tuviese content-text no será util como caller!!). 
    *
    *    @attr data-partial      nombre del template (partial) a incrustar  
    *    @attr data-onchange     field-names de elements que al cambiar (change) disparan la re-renderización del partial. 
    *                            Pueden indicarse varios names separados por coma o space. Si se indica '*' se actualiza siempre.
    *
    *    @param    tplName        string    nombre del template (id del script txt/html contenedor). Invariable y solo pasado para referencia.
    *    @param    content        string    contenido HTML del template. Debe retornarse con o sin alteraciones
    *
    */
	function conventionsAdapter(tplName, content) {
        if (!content) return '';
		var tag, p2, dones = 0, logx = ".conventionsAdapter to tpl '"+tplName+"'";
        
        /**
		*  <div data-partial="control-group-input" data-sectionkey="person.localidad" data-onchange="person.provincia" ></div>
		*/

		var _attrs = function(str,attr) {
			var rv=[], patt=new RegExp(attr+'\\s*=\\s*["\']',"ig"), patt2=/["']/, patt3=/>/, lix, clo, end, tag; 
			while (patt.test(str)==true) {
				var xx = str.slice(patt.lastIndex);
				if ((lix=xx.search(patt2))<0) continue;
				var at = xx.substring(0,lix).trim();
				if (at) {
					clo = (clo=xx.search(patt3))>0 ? clo : 0;
					if (clo>0 && xx.charAt(clo-1)!=='/') {  // no se permite end-tag = "/>"
						var patt4=new RegExp('</[a-z]+\\s*>','gi');
						if ( (tag=(tag=(tag=patt4.exec(xx))?tag[0]:'')?tag.substring(2,tag.length-1):'')) {
							end = patt4.lastIndex-tag.length-3;
							rv.push( { attr: at, close: clo+patt.lastIndex, tag: tag, endtag: end+patt.lastIndex, inner: xx.substring(clo+1,end) } );  /** close: posicion del ">", endtag: posicion del "<" */
						}	
					}	
				}	
			};
			return rv;
		};
		
		var _adapt = function(str, attr, fnWrite) {
			var dp = _attrs(str, attr);
			var txt='', p=0;
			for (var i in dp) {
				txt = txt + str.substring(p,dp[i].close+1) + fnWrite(dp[i]) ; //"{{> "+ dp[i].attr +"}}";
				p = dp[i].endtag;
			};
			return (txt + str.slice(p));
		};
		
        if ( !(tag = content.match(/<[a-z]+[\s>]/i)) ) { console.warn(IAM, logx + " ***!! POSSIBLE MALFORMED HTML !!***" ); return content; };
		content = _adapt(content, ATTR_DATA_PARTIAL, function(d){ return "{{> "+ d.attr +"}}"; } );
		content = _adapt(content, ATTR_DATA_SECTIONKEY, function(d){ return "{{#"+ d.attr +"}}" + d.inner + "{{/"+ d.attr +"}}"; } );
		
		return content; 
 	};
	
	
   /**
    * Callback handler del evento por cambio de hash path ("#xxx") donde se decide el cambio de vista que corresponde con ese hash.
    */
	function hashChange(e) {
        // si es ciclo de "history back" (x rechazo de cambio de hash) ...
		if (inHBackFlag) { inHBackFlag=false; return false; };
		
		if (/#$/.test(e.newURL)) { reject(); return false;	}; /* TODO : si termina en "#" ignorar ummm verificar ESTO!! */
        
        var h = window.location.hash.length > 0 ? window.location.hash.slice(1) : '';  // decide nombre de la vista
        var route;
		// si no existe el route re-location a default
		if ( !(route = takeRoute( h, window.location.search )) ) {  // get route & parse params
			if (String(window.location.href).match(window.location.pathname)) {
				if (h.charAt(0)!=='_') reject("Hash '"+h+"' NOT found, maybe should create it with whenRoute()?", true );
			}else if (window.location.pathname!=window.location.href) { 
				window.location.replace(window.location.pathname);  // ir al default 
			} else {
				console.warn("Should create at least one route with whenRoute()");
			};
			return false;
		};
		
        // Si se requiere un route previo especifico, re-location a default.
		var cur_hash = currentRoute ? currentRoute.hash : null;
		var mustStart = !route.startOnlyOnce || !route.displayed
		
		
        if ( mustStart && route.previousHashReq && route.previousHashReq!==cur_hash ) { 
			window.location.replace(window.location.pathname+'#'+route.previousHashReq); //(cur_hash?"#"+cur_hash:""));  // ir al requerido o default 
            return false;
        };
        
        // si route con option "autoBack" y se vuelve a él, hacer retroceder al hash previo (reject)
        // nota: si autoBack==true solo retrocede si fue displayado antes (no actua si currentRoute fue reload -browser-)
        //       si autoBack es Array (como ['route2', ...]) retrocede siempre q se vuelve de uno de los routes especificados en ese array.
        var hBack = cur_hash && (route.autoBack instanceof Array) && route.autoBack.indexOf(cur_hash)>=0 ? true : false;
        if (window.history.length>1 && ((route.displayed && route.autoBack===true) || hBack)) {
        	reject("hashChange to '"+h+"' was autoBack'ed...");
        	return false;
        };
        
        log('hashChange - [ '+ e.oldURL +' ] >> [ '+ e.newURL +' ]');
        
		if (mustStart) {
			// copia de model (si corresponde) de acuerdo a criterio decidido x user (sobrescribe model completo!)
			try {
				if (typeof route.modelCopyFrom === 'function' ) route.model = route.modelCopyFrom(route, routes);
				if (typeof route.modelCopyFrom === 'string' ) route.model = $.extend({},getRoute(route.modelCopyFrom).model); // copia en otra instancia!
				if (typeof route.modelCopyFrom === 'object' ) route.model = route.modelCopyFrom;
			} catch (e) {
				console.error(IAM_ERROR, "Posible Error: Can´t copy model from route '"+route.modelCopyFrom+"'... it don't exists!");
			};

			// call user .start() y luego renderizar
			if (typeof route.start=='function') {
				startRoute(route,reject);
				return true;
			}
			
		};
		renderRoute(route);
		return true;
    };
    
    function reject(msg, isWarn) { 
        inHBackFlag = true; //set flag "rechazo de cambio de hash"
        if (window.history.length>1) window.history.back();      // correjir browser navbar o...
        else window.location.replace(window.location.pathname);  // replace a "default"
        if (msg) isWarn ? console.warn(IAM, "REJECTED 'hashChange'. "+msg ) : console.info("REJECTED 'hashChange'. "+ msg );
	};

    function startRoute(route) {
		deferred( route, route.start, function(){ renderRoute(route);}, function(){ reject(null,"rejected by js");} );
		route.proceed();
		route.resolve();
		log('.start() called for hash: '+ routeLog(route) );
    };
    
    function deferred(context, fnproceed, fndone, fnreject) {
		var em = ' mal invocado! - context: '+context.hash, 
		d = {
			_stat: { used: 0, code: -1 }, 
			proceed: function(data) {
				if (context._stat.code!=-1) console.error('deferred.proceed()'+em);
				else { context._stat.code = 0; return fnproceed(context, data); }
			},
			resolve: function() {
				if (context._stat.code==0 && context._stat.used<=0) context.ready();
			},
			defer: function(n) {
				if (context._stat.code!=0) console.error('deferred.defer()'+em);
				else context._stat.used+=(n?n:1); 
			},
			ready: function(data) {
				if (context._stat.code<0) console.error('deferred.ready()'+em);
				else if (context._stat.code==0 && --context._stat.used <= 0) {
					context._stat.code = 1;
					if (typeof fndone==='function') fndone(data); 
				}
			},
			reject: function(data) { 
				if (context._stat.code==0) {
					context._stat.code = 1;
					if (typeof fnreject==='function') fnreject(data);
				}
			},
		};
		return $.extend(context,d);
    };
    
    function routeLog(r) { 
    	var pars = r.params ? $.param(r.params).replace(/&/gi,', '):null; 
    	return '"'+ r.hash + '" - params: '+ (pars?pars:'(no)');
    };	
    
    function getRoute(hash) {
        var route;
        if (!hash && routes.length>0) { 
        	//si no se convocó con hash, tomar el 1er route (descartando al "LOADER")  
        	for (var i in routes) { if(routes[i].hash!=LOADER_ROUTE) { route = routes[i]; break; } };
        } else {
            for (var i in routes) { if(routes[i].hash==hash) { route = routes[i]; break; } };
        }
        return route;
    };
    
    function takeRoute(hashStr, query) {
		var route, arr, hash;
		arr = hashStr.split('/');
        var hash = arr.shift(); // separar hash de params
        if (!(route=getRoute(hash))) return null;  // NO encontrado!
        route.params = {};
        if (route.paramNames) {
            for (var i in route.paramNames) {
                route.params[route.paramNames[i]] = arr.shift();
            }
        };
        /** @TODO cambiar esto x parser !! */
        route.query = String(query||'').charAt(0)=='?' ? query.slice(1) : (query||'');  //extraer '?'
        return route;
    };
    
    function createRoute(hashStr,ops) {
        if (typeof hashStr != 'string' || hashStr.trim().length==0) {
            console.error(IAM_ERROR, ROUTE_ERROR);
            return null;
        };
        //hashStr = hashStr.trim().length == 0 ? DEFAULT_VIEW : hashStr.trim();  
        var arr = hashStr.split('/@');
        for (var i in arr) {
            if ( ! arr[i].match(/^[a-z0-9_-]+$/i ) ) {
                console.error(IAM_ERROR, ROUTE_ERROR +' -- hash string: "'+hashStr+'"');
                return null;
            }
        };
        var hash = arr.shift(); // separar hash de params
        var route = { model: {global: global}, hash: hash, template: hash, paramNames: (arr.length>0?arr:null), params: null, displayed: false, autoBack: false }; 
        route = $.extend(route,  
				{ appPath: options.appPath,  // herencia desde options
				  sufixURI: options.sufixURI,
				  tplExtension: options.tplExtension,
                  loadErrorMsg: options.loadErrorMsg,
			      startOnlyOnce: options.startOnlyOnce,
	            }, ops, route_methods );
        return route;
    };

    /**
    *    Asigna a route.model el data model suministrado.
    *    Además injecta en cada prop las funciones "helpers" que facilitan el ensamblado de codigo html resultante con los templates TExpreso.
    *    Los helpers que comienzan con "_$is" son booleans, y los que comienzan con "_$a" contienen código final a incrustar (como attribs del
    *    tag subyacente).
    *    Esta function está disponible en el ctx de .start() .started(), .onChange/onClick().
    *
    * @param data       object            data model para asignar. Contiene las properties y sus especificaciones de marcado html
    * @param ns         string            especifica a partir de que namespase asignar (default root). Ej: "person" o "person.localidad", uso: ctx.setModel(localidad,"person"); 
    * @param ovw        bool/undefined    overwrite full route model? or merge (default false = merge)
    */
    function setModelView(data,ns,ovw) {
        if (!data) return this;
        nsh = ns ? ns+'.':''; //namespace
        for (var i in data) { _setHelpers(data[i],nsh+i) };  // agregar html helpers
        if (ovw===undefined || ovw==false) {
			if (ns) {
				if (this.model[ns]===undefined) this.model[ns] = {};
				$.extend(this.model[ns],data); 
			} else $.extend(this.model,data); 
		} else { 
			if (ns) this.model[ns] = data; else this.model = data; 
		};
        return this;
    };
    
    function clearModel() { this.model = {global: global}; return this; };

    /**
    *    Injecta en la propiedad individual (suministrada) las propiedades "helpers" que facilitan el ensamblado de codigo html resultante en los templates TExpreso.
    *    Las que inyectan html attribs (comienzan en _$a...), al momento de ser usadas en templates, debe hacerse como scaped-data, o sea: {{{_$aXXXX}}} -entre triples
    *    corchetes, no en dobles!).
    */
    function _setHelpers(o,ns) {
        if (!o.type) {
            if (typeof o==='object') { 
				for (var i in o){
					if (o instanceof Array) _setHelpers(o[i],(ns?ns+'['+i+']':'')); 
					else _setHelpers(o[i],(ns?ns+'.':'')+i); 
				};
			};
            return;
        };
        var name = o.name ? o.name : ns;
        var v = {
                name: name, 
				_$isInput: !!(String(o.type)).match(/(text|password|url|search|email|time|date|datetime|number|color|tel)/i),
                _$isText: (!o.type || o.type=='text' ),
                _$isTextarea: (o.type=='textarea'),
                _$isPassword: (o.type=='password'),
                _$isCheckbox: (o.type=='checkbox'),
                _$isRadio: (o.type=='radio'),
                _$isCheckboxOrRadio: (o.type=='checkbox' || o.type=='radio'),
                _$isSelect: (o.type=='select'),
                _$isHidden: (o.type=='hidden'),
                _$isTablelist: (o.type=='tablelist'),
                
                _$aType: o.type ? "type='"+o.type+"'" : "type='text'" ,
                _$aId: o.id ? "id='"+o.id+"'" : null,
                _$aPlaceholder: o.placeholder ? "placeholder='"+o.placeholder+"'" : null,
                _$aClass: o._class ? "class='"+o._class+"'" : null,
                _$aName: name ? "name='"+name+"'" : null,
                _$aValue: o.value && o.type!='radio' ? "value='"+o.value+"'" : null,
                _$aChecked: o.checked ? "checked" : null,
                _$aRequired: o.required ? "required" : null,
                _$aReadonly: o.readonly ? "readonly" : null,

            };
        $.extend( o, v);
        if(o._$isSelect || o._$isRadio) {
            var arr = ['_$aChecked','checked'];
            if (o._$isSelect) {
                arr = ['_$aSelected','selected'];
                o.value = o.value ? o.value : o.options.length>0 ? o.options[0].value ? o.options[0].value : o.options[0].text : "";
                o._$aSize = o.size>1 ? "size='"+o.size+"'" : null;
                o._$aMultiple = o.multiple ? "multiple" : null;
            };
            for (var j in o.options) {
                if (o.options[j].value == o.value || o.options[j].text == o.value) o.options[j][arr[0]] = arr[1];
                else o.options[j][arr[0]] = "";
                o.options[j]._$aValue = o.options[j].value ? "value='"+o.options[j].value+"'" : "";
            }
        }
        
    };

    /**
    *    Devuelve un plain-object (único nivel de 'key'='value') con valores de las properties del model.
    *
    *        Ejemplo: { "person.name": "Jorge", "person.provincia.name" : "Bs.As.", ... }
    *
    * @param names      string/array       sólo de las prop especificadas o a partir de un domain. Acepta: "person", "name" ó "name1 name2 ..." ó ["name1", ...]
    * @param ns         string             especifica a partir de que namespase rastrear, ej. ("nombre email edad","person") (default "")
    *                   boolean            asumira idem a ns="" y innerNs=true
    * @param innerNs    boolean            devolver en plain-object sin root namespace, ej. { "name": "Jorge", "provincia.name" : "Bs.As.", ... } (default false)
    */
    function getModelValue(names,ns,innerNs) {
        names = typeof names === 'string' ? names.trim().split(PARSEPAT) : names;    //aceptar: "name" ó "name1 name2 ..." ó "name1,name2 ..." ó ["name1", ...]
        if (typeof ns==='boolean') { innerNs=ns; ns='';} else ns=ns?ns+'.':'';
        var rv={}, route=this;
        
        for (var i in names) {
            //var o = eval( "route.model."+ns+names[i] );
			var o = _oget(route.model, ns+names[i]);
			if (o) {
				if (!o.type && typeof o==='object') {
					var nss=''; for (var j in o){ nss=nss+j+' ';};  
					$.extend(rv, route.getv(nss,ns+names[i],innerNs));  //recursivo (pero en route scope)
				} else {
					o = o.type===undefined ? o : o.type=='checkbox' ? o.checked : o.value;
					var n = ns+names[i];
					rv[(innerNs ? n.slice(n.indexOf('.')+1) : n)] = o==undefined?'':o;
				}
			}		
        };     
        return rv;
    };

    /**
    *    Asigna valores de las propiedades al model a partir de un plain-object (único nivel de 'key'='value').
    *    Las "key" deben representar el namespace completo relativo a route.model.
    *    Todas las props indicadas dispararán eventos relativos a re-renderización de datos afectados (en data-onchange de partials-template).
    *  
    *        Ejemplo: ( { "person.name": "Jorge", "person.provincia.name" : "Bs.As.", ... } )
    *
    * @param obj        object            plain-object (único nivel de 'key'='value') a asignar.
    */
    function setModelValue(obj) {
        for (var i in obj) {
            updateModel(this,i,obj[i]);
            pushToUpdView(i,'js (setv)');
        };
        return this;
    };
    
    function pushToUpdView(ref, cause) {
        if ((ref=(ref||"").trim()) && !updQueue[ref]) updQueue[ref] = {cause:(cause?cause:'code')};
        //console.warn("pushToUpdView: "+ref);
        return this;
    };

	function onHelper(elemName, args) {
		var ctx = this, en, qs='', rv;
		if (typeof elemName==='string') en = ctx.actionLink ? ctx.actionLink : ctx.elemName ? ctx.elemName : '*?*';
		else if (typeof elemName==='object' && args===undefined) args = elemName;
		if (en) { 
			qs = en.split('/'); en = qs.shift();
			qs = qs.length > 0 ? '/'+qs.join('/') : '';
		};
		
		if (!en || en==elemName) {
			log('on "'+elemName+'" correspondido!');
			var df = args.data || ctx.data;
			if (typeof df==='string') df = ctx.getv(df);
			var sdata = $.extend({},{data: df} );  // envia precedentemente: data | ctx.data
			var exec = function(f,d) { return (typeof f==='function') ? f(d,ctx) : null; };

			var cbkfn = function(d) {
							if(d.success) {
								if (exec(args.success,d)===false) return;
								if (args.into) ctx.setModelView(d.result, args.into); else if (args.into!==false) ctx.setModelView(d.result);
								if (exec(args.complete,d)===false) return;
							} else {
								var efn = args.onFault || ctx.onFault || options.onFault;
								if (typeof efn==='function') { efn(ctx,d); return; }	// d contiene el xhr
							};
							if (exec(args.allways,d)===false) return;
							if (!ctx.thenGo) {
								if (typeof args.thenGo==='string') ctx.thenGo = args.thenGo;
								else ctx.thenGo = exec(args.thenGo,d);
							};
							if (args.display) ctx.display(args.display);
							return d.success ? true : false;
							
			};
			var shell = function(d) {
				if (cbkfn(d)) ctx.ready(); else ctx.reject(); 
			};

			var ag = args.AG || ctx.AG || options.AG;
			if (ag) {
				ctx.defer();
				ag.setLanguage(LANGUAGE);
				qs = args.q ? qs+'?'+args.q : qs;
				if (args.get) ag.get(args.get+qs, shell, sdata);
				else if (args.post) ag.post(args.post+qs, shell, sdata);
			} else {
				console.error(IAM_ERROR,"Must supply AjaxGrails provider in .on() / .make()");
			};
			rv = true;  // indicar q el on/make fue correspondido!
		};
		return rv;
	};

	function setDisplayed(v) { this.getRoute(this.hash).displayed = v?true:false; };
	
	function goHelper(url) { this.thenGo = !url ? '' : url;	};
	
	function doSetHelpers(o) { _setHelpers(o); };
	
	function display(idsOrSks) {
        idsOrSks = typeof idsOrSks === 'string' ? idsOrSks.split(PARSEPAT) : idsOrSks;    //aceptar: "#name" ó "sk1 #id2 ..." ó "sk1,#id2 ..." ó ["sk1", ...] 
        for (var i in idsOrSks) {
			if(idsOrSks[i]) pushToUpdView( idsOrSks[i] ); 
        };
    };
	
    // -------- de contexto route ---------
    
    var route_methods = { 
            getRoute: getRoute,
            clear: clearModel,
            setModelView: setModelView,
            getv: getModelValue,
            setv: setModelValue,
 			display: display,
			on: onHelper,
			make: onHelper,
			setDisplayed: setDisplayed,
			go: goHelper,
			decorate: doSetHelpers,
    };
	
    
    // -------- PUBLICS ---------
    
   /**
    * ops pueden ser: 
    *                    iguales a instance options y:
    *                    previousHashReq        Si indicado, se impide cambio de hash si el previo no ese.
    *                                        
    */
    this.whenRoute = function(hash,ops) {
        if (!(route = createRoute(hash,ops))) return {};
        routes.push(route);// = routes.concat(route);
        return route;
    };
    
    this.whenLoader =  function(ops) {
    	return self.whenRoute(LOADER_ROUTE, ops);
    };
    
    /**
     * Set del LANGUAGE de conectividad (param 'lang'). Sólo tomará la porción de los 2 primeros chars tal como ISO 639 (como 'es', 'en', 'de', etc.).<br>
     * Se genera/actualiza el cookie correspondiente en caso que el LANGUAGE indicado difiera al del browser y/o del anterior indicado.<br> 
     * 
     * @param loc  string 	LANGUAGE a setear
     * @param loc  boolean 	true (default) para indicar que ademas recargue la pagina (p/recargar los templates donde su filename contenga simbolo %LANG%)  
     */
    this.setLanguage = function(lang, reload) { 
    	if (lang && lang != LANGUAGE) {
    		docCookies.setItem(COOKIE_LANG, lang, Infinity, (/\/[a-z0-9-_\$\.;,%]+/i.exec(location.pathname)));
    		if (options.AG) options.AG.setLanguage(lang);
    		if (reload || reload===undefined) window.location.reload(); else LANGUAGE = lang; 
    	}
    };
    
    this.getLanguage = function() { return LANGUAGE; };
    
    this.start = function() {
	
        if (started) return;
        started = true; //flagged
		
        $('document').ready( function() {
		
            LANGUAGE = (docCookies.getItem(COOKIE_LANG) || window.navigator.language || window.navigator.userLanguage || window.navigator.browserLanguage).substring(0,2);
    		if (options.AG) options.AG.setLanguage(LANGUAGE);
			log('## Start ClientMVC v'+VERSION+' ## - LANGUAGE: "'+ LANGUAGE +'" ##');
			
			if (options.viewId && document.getElementById(options.viewId)==null) {
				$(APPENDVIEW_SELECTOR+' :first').prepend('<div id="'+options.viewId+'">');
				if (document.getElementById(options.viewId)==null) console.error(IAM_ERROR,"Could not find the element w/ id='"+options.viewId+"' or classes "+APPENDVIEW_SELECTOR+" (required for stamp templates)!");
				return;
			};
			
			if (routes.length<1) { console.error(IAM_ERROR,"No route was defined !"); return; };
			
			$.TExpreso.setAddInterceptor( conventionsAdapter );		// aplica convensiones al cargar templates
			$.TExpreso.addFromDom();  			// carga los templates situados en DOM (si hay)
			
            window.onhashchange = hashChange; 		// set event listener
			
			var loader = getRoute(LOADER_ROUTE);
			if (loader) {
				// 1ro rutear hacia loader y luego del render, linkear al href original
				if (typeof loader.start=='function') startRoute(loader); 
				else renderRoute(loader);
			} else {
				hashChange({starting:true, oldURL: null, newURL: window.location.href });
			};
			$("["+ATTR_DATA_BACKBTN+"]").click( function(){ return backBtnCallback(this); } );  // solo de lo q esta fuera del viewId (ej: en menu)
        });
    };

	/** utilidad para logear objetos (ej. cuando se reciben datos) */
	this.log = function(c,d) { logd((c!=undefined?c:currentRoute),d); };
	
    // ------- misc. privates --------
    
    function log(t1,t2) {
        if (self.debugLevel<1) return;
        if (!self.debugLogId) { if (t2) console.info(t1,t2); else console.info(t1); }
        else $('#'+self.debugLogId).append(t1+' '+(t2?t2:'')+'<br>'); 
    };
    
    function logd(c,d,t) {
        t = t ? t : '\t';
        if (d==undefined) d=c; else if (c) log(c);
        for (var n in d) {
        	if(typeof d[n]=='function') continue; //{ log(t + n +' = function'); continue; };
            if (n.substring(0,2)=='_$' && self.debugLevel<4) continue;
            log(t + n +' = '+ d[n]);
            if(typeof d[n]=='object') logd('',d[n],t+'\t');
        }    
    };
    
	// *** Lanzar clientMVC si esta indicado (default) ***
	
	if (options.autoStart) this.start();		

};
/** agregar implementador del evento hashchange (metodo timer) si el browser no es compatible (Chrome < 5.0, FF <3.6, IE <8.0, Op <10.6, Saf <5.0, And <2.2, etc)
*	ver en: https://developer.mozilla.org/en-US/docs/Web/Reference/Events/hashchange
*/	
(function(window) {

  // exit if the browser implements that event
  if ( "onhashchange" in window.document.body ) { return; };

  var location = window.location,
    oldURL = location.href,
    oldHash = location.hash;

  // check the location hash on a 100ms interval
  setInterval(function() {
    var newURL = location.href,
      newHash = location.hash;

    // if the hash has changed and a handler has been bound...
    if ( newHash != oldHash && typeof window.onhashchange === "function" ) {
      // execute the handler
      window.onhashchange({
        type: "hashchange",
        oldURL: oldURL,
        newURL: newURL
      });

      oldURL = newURL;
      oldHash = newHash;
    }
  }, 100);

})(window);

 