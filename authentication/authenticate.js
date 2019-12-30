"use strict";
function getQueryVariable(variable,method) {
	method = method || 'hash';
    var query = window.location[method].substring(1);
    var vars = query.split('&');
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        if (decodeURIComponent(pair[0]) == variable) {
            return decodeURIComponent(pair[1]);
        }
    }

    return false;
}



// $(document).ready(() => {
var client_id = getQueryVariable('client_id','hash');
var token = getQueryVariable('access_token','hash');
var error = getQueryVariable('error','search')

if (client_id || token) {
	if (token) {
		//Post message to window with token
		// $('.token').html(`Access token: ${token}`);
		// $('.location').html(window.location.href);
		var message = {
			token:token,
			success:true
		};
		window.opener.postMessage(message,window.location.origin);
	}
} else {
	// $('body').html('Unauthorized');
	// $('body').append(`<div>${window.location.href}</div>`);
	var message = {
		error:error,
		success:false
	};
	window.opener.postMessage(message,window.location.origin);
}
// });