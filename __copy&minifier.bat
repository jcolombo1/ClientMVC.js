@echo off
REM /D => copia sólo aquellos archivos cuya fecha de origen es más reciente que la fecha de destino.

REM ... copiar js requeridos desde otros proyectos ... 
xcopy /Y /D "..\TExpreso.templates\dataAdapter*.js" 
xcopy /Y /D "..\TExpreso.templates\paginatorGrails*.js" 
xcopy /Y /D "..\TExpreso.templates\tpl_tbs3.html" "test\files"

REM ... munify los js propios ... 
"../minify/jsmin.exe" <ClientMVC.js >ClientMVC.min.js "(c)2013 Jorge Colombo - jcolombo@ymail.com - t: @jcolombo_ - f: /Jorge Colombo"
"../minify/jsmin.exe" <AjaxGrails.js >AjaxGrails.min.js "(c)2013 Jorge Colombo - jcolombo@ymail.com - t: @jcolombo_ - f: /Jorge Colombo"
"../minify/jsmin.exe" <docCookies.js >docCookies.min.js "(c)2013 Jorge Colombo - jcolombo@ymail.com - t: @jcolombo_ - f: /Jorge Colombo"
