@echo off

REM ... copiar js requeridos desde otros proyectos (sólo aquellos c/fecha de origen más reciente q la del destino)... 
xcopy /Y /D "..\TExpreso.templates\dataAdapter.js" 
xcopy /Y /D "..\TExpreso.templates\paginatorGrails.js" 
xcopy /Y /D "..\TExpreso.templates\tpl_tbs3.tpl" "test\files"

REM ... minify los js propios ... 
"../minify/jsmin.exe" <ClientMVC.js >ClientMVC.min.js "(c)2013 Jorge Colombo - jcolombo@ymail.com - t: @jcolombo_ - f: /Jorge Colombo"
"../minify/jsmin.exe" <AjaxGrails.js >AjaxGrails.min.js "(c)2013 Jorge Colombo - jcolombo@ymail.com - t: @jcolombo_ - f: /Jorge Colombo"
"../minify/jsmin.exe" <docCookies.js >docCookies.min.js "(c)2013 Jorge Colombo - jcolombo@ymail.com - t: @jcolombo_ - f: /Jorge Colombo"

REM ... anexar los js en un solo min.js (ClientMVC.full.min.js) ...
copy AjaxGrails.js+"..\TExpreso.js\TExpreso.js"+"..\TExpreso.js\jquery.TExpreso.js"+dataAdapter.js+paginatorGrails.js+docCookies.js+ClientMVC.js  zzz.js
"../minify/jsmin.exe" <zzz.js >ClientMVC.full.min.js "(c)2013 Jorge Colombo - jcolombo@ymail.com - t: @jcolombo_ - f: /Jorge Colombo"
del zzz.js
