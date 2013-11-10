/**
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 * PaginatorGrails - Version 0.2.RC - 07/2013
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 * email: jcolombo@ymail.com  
 * Copyright © 2013 Jorge A Colombo 
 * BA, Argentina
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 *
 * Simple MVC client javascript object.
 *
 * DEPENDANCIES:
 *     jQuery                 1.5+         required
 *
 * FEATURES:
 *    
 * USE EXAMPLES:
 *
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 * ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
 */

function Paginator(args) {
	
	var self = 	this, 
				P = '_paginator', 
				C = '_columns', 
				pars = $.extend( {  max: 10, maxpages: 12, 
									signs: {lsign:'&laquo;',rsign:'&raquo;',lxsign:'&larr;',rxsign:'&rarr;',usign:{icon:'icon-chevron-up'},dsign:{icon:'icon-chevron-down'}},
									sizes: { label: 'Paginado', options: [ {value:5}, {value:10}, {value:15}, {value:25}, {value:50}, {value:100} ] },
								 }, args );
	
	this.params = function() { return $.extend( {}, {max: 10, offset: 0},{max: pars.max, offset: pars.offset, sort: pars.sort, order: pars.order}); };
	
	this.update = function(d) {
		d[P].signs = $.extend(d[P].signs || {}, pars.signs);
		d[P].max = Math.max(d[P].max || 10,2);
		d[P].offset = Math.max(d[P].offset || 0,0);
		d[P].total = Math.max(d[P].total || 0,0);
		pars.link = (pars.link && pars.link.charAt(0)!='#') ? '#'+pars.link : pars.link;   
		$.extend(pars,d[P]);
		
		var first = 1;
		var last = tlast = Math.max( Math.ceil(d[P].total / d[P].max), 1);
		var curr = Math.ceil((d[P].offset+1) / d[P].max);
		var exc = (tlast > pars.maxpages), pages = [], cpars = self.params();
		d[P]['lexc'] = d[P]['rexc'] = false;
		if (exc) {
			var med = Math.floor(pars.maxpages/2);
			first = Math.max(curr-med,1);
			last =  Math.min(first+pars.maxpages-1,tlast);
			if (first > pars.maxpages) {
				cpars.offset = (first-med-1)*pars.max;
				//d[P]['lexc'] = { link: pars.link+'?'+ $.param(cpars), value: "<<" } ;
				d[P]['lexc'] = { link: '?'+ $.param(cpars)+pars.link, value: "<<" } ;
			};
			if ((last+pars.maxpages) < tlast) {
				cpars.offset = (last+med)*pars.max;
				//d[P]['rexc'] = { link: pars.link+'?'+ $.param(cpars), value: ">>" } ;
				d[P]['rexc'] = { link: '?'+ $.param(cpars)+pars.link, value: ">>" } ;
			}
		};
		for (var pnum=first; pnum<=last; pnum++) {
			cpars.offset = (pnum-1)*pars.max;
			//pages.push( ( curr==pnum ? { link:'#_', active:'active', value: pnum } : { link: pars.link+'?'+ $.param(cpars), value: pnum } ) );
			pages.push( ( curr==pnum ? { link:'#_', active:'active', value: pnum } : { link: '?'+ $.param(cpars)+pars.link, value: pnum } ) );
		};
		d[P]['larrow'] = curr==first ? {disabled:'disabled', link:'#_'} : pages[curr-first-1] ;
		d[P]['rarrow'] = curr==last  ? {disabled:'disabled', link:'#_'} : pages[curr-first+1] ;
		d[P]['pages'] = pages;
		
		// -- header columns & sort
		
		cpars.offset = (curr-1)*pars.max; 
		var ss = (pars.order || 'asc') == 'asc' ? pars.signs.usign : pars.signs.dsign;
		for (var i in d[C]) {
			if ( d[C][i].sort ) {
				if (i==pars.sort) cpars.order = (pars.order || 'asc') == 'asc' ? 'desc' : 'asc';
				else cpars.order = pars.order;
				cpars.sort = i;
				//$.extend(d[C][i],{ sign: i==pars.sort ? ss : false, link: pars.link+'?'+ $.param(cpars) });
				$.extend(d[C][i],{ sign: i==pars.sort ? ss : false, link: '?'+ $.param(cpars)+pars.link });
			} else $.extend(d[C][i],{sign: false});
		};
		
		// -- sizes
		
		d[P].sizes = d[P].sizes || pars.sizes;
		if (d[P].sizes.options) {
			cpars = self.params();
			for (var i in d[P].sizes.options) {
				cpars.max = d[P].sizes.options[i].value;
				//d[P].sizes.options[i].link = pars.link+'?'+ $.param(cpars);
				d[P].sizes.options[i].link = '?'+ $.param(cpars)+pars.link;
			}
		};
		return pars; 
	};
};
