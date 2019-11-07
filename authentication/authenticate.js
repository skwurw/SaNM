"use strict";
function getQueryVariable(variable) {
    var query = window.location.hash.substring(1);
    var vars = query.split('&');
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split('=');
        if (decodeURIComponent(pair[0]) == variable) {
            return decodeURIComponent(pair[1]);
        }
    }

    return false;
}

$(document).ready(() => {
	var client_id = getQueryVariable('client_id');
	var token = getQueryVariable('access_token');

	if (client_id || token) {
		if (client_id) {
				//Redirect to authenticate with twitch
				var redirect = window.location.href;
				var url = `https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=${client_id}&redirect_uri=${redirect}&scope=user_read`;
				window.location.href = url;
		} else if (token) {
			//Post message to window with token
			$('.token').html(`Access token: ${token}`);
			var message = {
				token:token
			};
			window.opener.postMessage(message,window.location.origin);
		}
	} else {
		$('body').html('Unauthorized');
	}
});