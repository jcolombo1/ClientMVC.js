<!-- 
	TExpreso (motor de plantilas)
	
	Commons Templates para "Twitter Bootstrap 3"  ||   VERSION 2.1
-->


<!-- ***********************************************************************************************************
	
	TEMPLATE: control-group-input
	
	Se pueden indicar los siguientes parámetros para la renderización del input control, tanto en su parent 
	scope para que afecte a todos los inputs, o sólo en el input control que se desee:  

		unlabeled		set true si NO se desea input label (default undefined)
		blockLabeled	set true si se desea que el label ocupe el row completo encima del input (default undefined)  
		hideLabel		set true si se desea que el label NO se visibilice, pero ocupará su espacio (default undefined)

		labelCols		set número de columnas que ocupará el label [1-12] (default 2)
		controlCols		set número de columnas que ocupará el control [1-12] (default 10)

	***********************************************************************************************************
	
-->

<script id="control-group-input" type="text/html">
	{{#_$isHidden}}
		<input type="hidden" {{_$aName}} {{_$aId}} {{_$aValue}} ></input>
	{{else}}
		<div class="form-group {{class}}">
			{{|set $unlabeled unlabeled .unlabeled}}
			{{#if $unlabeled}}
				<div class="col-sm-{{| controlCols .controlCols 12 }}">
			{{else}}
				{{|set $hideLabel hideLabel .hideLabel}}
				{{|set $blockLabeled blockLabeled .blockLabeled}}
				{{set $wl labelCols .labelCols 2 }}{{set $wc controlCols .controlCols 10 }}
				{{#$blockLabeled}}{{set $wl 12}}{{set $wc 12}}{{end}}
				{{#label}}<label class="col-sm-{{$wl}} {{class}}" for="{{name}}" >{{#if !$hideLabel}}{{|set $TEXT label "??"}}{{#trim}}{{> text-with-icon}}{{end}}{{end}}</label>
				{{else}}<div class="col-sm-{{$wl}}"> </div>{{end}}
				<div class="col-sm-{{$wc}}">
			{{end}}
				{{#_$isCheckboxOrRadio}}
					{{#_$isCheckbox}}
						<div class="checkbox">
							<label>
								<input type="checkbox" class="{{class}}" {{_$aName}} {{_$aId}} {{_$aValue}} {{_$aChecked}} {{_$aReadonly}}>{{text}}</input>
							</label>
						</div>
					{{else}}
						{{#options}}
						<div class="radio">
							<label>
								<input type="radio" {{_$aId}} {{_$aValue}} {{_$aChecked}} class="{{.class}}" {{._$aName}} {{._$aRequired}} {{._$aReadonly}}>{{text}} [{{value}}]</input>
							</label>
						</div>
						{{end}}
					{{end}}
				{{else}}
					{{#_$isInput}}
						{{> input-text}}
					{{else}}
						{{#_$isSelect}}
							<select class="form-control {{class}}" {{_$aId}} {{_$aName}} {{_$aPlaceholder}} {{_$aRequired}} {{_$aSize}} {{_$aReadonly}} {{_$aMultiple}}>
							{{#options}}
								<option {{_$aId}} {{_$aValue}} {{_$aSelected}} >{{text}}</option>
							{{end}}
							</select>
						{{else}}
							{{#_$isTextarea}}
								<textarea class="form-control {{class}}" {{| _$aRows "rows='3'"}} {{_$aId}} {{_$aName}} {{_$aPlaceholder}} {{_$aValue}} {{_$aRequired}} {{_$aReadonly}}></textarea>
							{{else}}
								{{#_$isTablelist}}
									{{> table-list-a }} 
								{{end}}
							{{end}}
						{{end}}
					{{end}}
				{{end}}	
			</div>
		</div>
	{{end}}
</script>
<script id="table-list-a" type="text/html">
	<div {{_$aId}} class="list-group" style="height: {{| height "200px"}}; overflow-y: scroll; border: 1px solid #dddddd; border-radius: 5px;">
	{{#_rows}}
		{{#row}}  /* row es column key generico para tablelists */ 
		<a class="list-group-item {{#active}}active{{end}}">
			{{#badge}}<span class="badge">{{badge}}</span>{{end}}
			{{#head}}
				<h4 class="list-group-item-heading">{{head}}</h4>
				<p class="list-group-item-text">{{value}}</p>
			{{else}}
				{{value}}
			{{end}}
		</a>
		{{end}}
	{{end}}
	</div>
</script>
<script id="input-text" type="text/html">
	{{set $p_cache}} {{set $a_cache}}
	{{#if prepends}}
		{{set $addons_array  prepends}}
		{{#set $p_cache}}
			{{> input-addons }}
		{{end}}	
	{{end}}
	{{#if appends}}
		{{set $addons_array  appends}}
		{{set $isPullRight true}}   /* pull-right flag de input-addons */
		{{#set $a_cache}}
			{{> input-addons }}
		{{end}}	
	{{end}}
	
	{{#if $p_cache || $a_cache}}
		<div class="input-group">
			{{$p_cache}}
			{{> input-text-input }}
			{{$a_cache}}
		</div>
	{{else}}
		{{> input-text-input }}
	{{end}}
</script>
<script id="input-text-input" type="text/html">
	<input class="form-control {{class}}" {{_$aType}} {{_$aId}} {{_$aName}} {{_$aPlaceholder}} {{_$aValue}} {{_$aRequired}} {{_$aReadonly}} ></input>
</script>
<script id="input-addons" type="text/html">
	{{set $close}}
	{{#$addons_array}}
		{{#if icon || addon || text }}
			{{^$close}}<div class="input-group-addon">{{set $close "</div>"}}{{end}}
			{{#if icon || addon}}<span class="glyphicon glyphicon-{{| icon addon}}"></span>{{end}}
			{{text}}
		{{else}}
			{{$close}} {{set $close}}
			{{#btn}}
				<div class="input-group-btn {{#dropup}}dropup{{end}}">
					{{> a-button}}
				</div>
			{{end}}
		{{end}}
	{{end}}
	{{$close}}
	{{set $isPullRight}}
</script>
<script id="text-with-icon" type="text/html" >
	{{|set $text_icon $TEXT text label btn value}}{{set $TEXT}}
	{{#icon}}
		{{|set $icon icon icon.prepend icon.prepend.name icon.name}}
		{{#$icon}}<span class="glyphicon glyphicon-{{$icon}}"> </span>{{end}}
		{{$text_icon}}
		{{|set $icon icon.append icon.append.name }}
		{{#$icon}}<span class="glyphicon glyphicon-{{$icon}}"> </span>{{end}}
		{{#caret}}<span class="caret"></span>{{end}}
	{{else}}
		{{#img}}
			{{|set $img img img.prepend img.prepend.name img.name}}
			{{#$img}}<img src="../../images/{{$img}}"> </img>{{end}}
			{{$text_icon}}
			{{|set $img img.append img.append.name}}
			{{#$img}}<img src="../../images/{{$img}}"> </img>{{end}}
			{{#caret}}<span class="caret"></span>{{end}}
		{{else}}
			{{$text_icon}}{{#caret}}<span class="caret"></span>{{end}}
		{{end}}
	{{end}}
</script>
<script id="a-link" type="text/html">
	<a href='{{| link "#"}}' {{#id}}id="{{id}}{{%row}}"{{end}} {{attrs}}>
		{{> text-with-icon }} 
	</a>
</script>
<script id="a-button" type="text/html">
	{{#group}}
		<button type="button" class="btn dropdown-toggle {{| class "btn-default"}}" data-toggle="dropdown">
			{{#addon}}{{> text-with-icon }}{{else}}{{| btn text label}}{{end}}
			<span class="caret"></span>
		</button>
		<ul class="dropdown-menu{{#$isPullRight}} pull-right{{end}}" role="menu">
			{{#menus}}
				{{#divider}}<li class="divider"></li>{{else}}<li>{{> a-link}}</li>{{end}}
			{{end}}
		</ul>
	{{else}}
		{{|set $btnType type "button"}}
		<button type="{{$btnType}}" {{#formaction}}formaction="{{formaction}}"{{end}} class="btn {{| class "btn-default"}}" {{#value}}value="{{value}}"{{end}}>
			{{> text-with-icon }}
		</button>
	{{end}}	
</script>
<script id="all-messages" type="text/html">
	{{#message}}<div class="alert alert-warning">{{message}}</div>{{end}}
	{{> success-messages }}
	{{> error-messages }}
</script>
<script id="success-messages" type="text/html">
	{{#_msgs}}
		{{#success}}<div class="alert alert-success">{{success}}</div>{{end}}
		{{#info}}<div class="alert alert-info">{{info}}</div>{{end}}
	{{end}}
</script>
<script id="error-messages" type="text/html">
	{{#_msgs}}
		{{#warn}}<div class="alert alert-warning">{{warn}}</div>{{end}}
		{{#error}}<div class="alert alert-danger">{{error}}</div>{{end}}
		{{#errors}}<div class="alert alert-danger">{{error}}</div>{{end}}
	{{end}}
</script>
<script id="table-column" type="text/html" >
{{#link}}
	<a href="{{link}}">{{> text-with-icon }}</a>
{{else}}
	{{> text-with-icon }}
{{end}}
</script>
<script id="table-column-head" type="text/html" >
	{{|set $TEXT label text}}
	{{#sort}}
		<a href='{{| link "#"}}'>{{#sign}}{{> text-with-icon }}{{else}}{{$TEXT}}{{end}}</a>
	{{else}}
		{{$TEXT}}
	{{end}}
	{{set $TEXT}}
</script>
<script id="table-paginator" type="text/html" >
	{{#_paginator}}
	<ul class="pagination {{class}}">
		{{#larrow}}
		<li class="{{disabled}}"><a href='{{| link "#"}}'>{{.signs.lsign}}</a></li>
		{{end}}
		{{#lexc}}
		<li><a href="{{link}}">{{.signs.lxsign}}</a></li>
		{{end}}
		{{#pages}}
		<li class="{{disabled}} {{active}}"><a href='{{| link "#"}}' >{{value}}</a></li>
		{{end}}
		{{#rexc}}
		<li><a href="{{link}}">{{.signs.rxsign}}</a></li>
		{{end}}
		{{#rarrow}}
		<li class="{{disabled}}"><a href='{{| link "#"}}'>{{.signs.rsign}}</a></li>
		{{end}}
	</ul>
	{{end}}
</script>
<script id="table-paginator-sizes" type="text/html" >
	{{#_paginator}}
	<div class="pagination btn-group {{| class "dropup"}}">
		<button type="button" class="btn dropdown-toggle {{| sizes.class "btn-default"}}" data-toggle="dropdown">
			{{set $TEXT sizes.label " (" max ")" }}
			{{#sizes.addon}}{{> text-with-icon }}{{else}}{{$TEXT}}{{end}} {{set $TEXT}}
			<span class="caret"></span>
		</button>
		<ul class="dropdown-menu{{#$isPullRight}} pull-right{{end}}" role="menu">
			{{#sizes.options}}
				<li>{{> a-link}}</li>
			{{end}}
		</ul>
	</div>
	{{end}}
</script>
