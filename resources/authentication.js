"use strict";

/*
-- Update notification setting example
{
	"headers":{
		"Authorization":"OAuth y309l70zb5xj7112h0d2wzqllbj9dw",
		"Client-ID":"ea6gna29yeekmgxv3wezbvh9gdhkdf",
		"Accept":"application/vnd.twitchtv.v5+json",
		"content-type":"application/json"
	},
	"url":"https://api.twitch.tv/kraken/users/50783580/follows/channels/56595463",
	"method":"PUT",
	"data":"{
		"\notifications\":true
	}",
	"crossDomain":true
}
*/

function Authorize(status,token) {
	switch (status) {
		case 'GET':
			//For testing, different authentication routs
			var host = window.location.host;
			var twitchapps = 'https://twitchapps.com/tokengen/';
			var localhost = 'http://localhost:3000/authentication/';
			var github = 'https://skwurw.github.io/SaNM/authentication/';
			var redirect = (host=='skwurw.github.io'?github:(host=='localhost:3000'?localhost:twitchapps));
			var forceVerify = (app.version_update)?'&force_verify=true':'';
			//host=='localhost:3000'|| If there is a version update, then force the user to re-authenticate.
			var url = `https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=${Authorize('CLIENTID')}&redirect_uri=${redirect}&scope=user_read+user_follows_edit${forceVerify}`;
			
			popup = window.open(url,'',`width=600,height=800,left=${screen.availLeft+(screen.width*.05)},top=50`);
			break;
		case 'ERROR':
			bootbox.alert({size:'small',title:'Error',message:'There was an error attemtping to authenticate.'});
			break;
		case 'SETTOK':
			if (token) {
				localStorage.setItem('access_token',token);
				localStorage.setItem('logged_in',true);
				// app.setToken(token);
				// var settings = {
				// 	type:'GET',
				// 	url:'https://api.twitch.tv/kraken/user',
				// 	headers:{
				// 		Accept:'application/vnd.twitchtv.v5+json',
				// 		Authorization:`OAuth ${token}`,
				// 		'Client-ID':'ea6gna29yeekmgxv3wezbvh9gdhkdf',
				// 	},
				// 	success:(data) => {
				// 		localStorage.setItem('loggedin-user-info',JSON.stringify(data));
				// 		app.setUser(data);
				// 		app.setToken(token);
				// 		bootbox.alert({
				// 			size:'small',
				// 			title:'Success',
				// 			message:`You have successfuly logged in as ${data.display_name}.`
				// 		});
				// 		app.version_update = false; // Update version_update to false now that user logged in.
				// 		Authorize('CHECK');
				// 	},
				// 	error:(err) => {
				// 		bootbox.alert('There was an error getting user info.');
				// 		Authorize('CHECK');
				// 	}
				// }
				// $.ajax(settings);
			} else {
				Authorize('ERROR');
			}
			break;
		case 'TOKEN':
			return app.token.key;
			// return localStorage.getItem('access_token') || undefined;
			break;
		case 'CLIENTID':
			return 'ea6gna29yeekmgxv3wezbvh9gdhkdf';
			break;
		case 'CHECK':
			// var loggedIn = localStorage.getItem('logged_in');
			// var token = localStorage.getItem('access_token');
			var loggedIn = app.logged_in;
			var token = app.token.key;


			if (loggedIn == 'true' || loggedIn) {
				$('.login').addClass('connected');
				// var userInfo = JSON.parse(localStorage.getItem('loggedin-user-info'));
				var userInfo = app.user;
				
				if (userInfo) {
					var name = userInfo.display_name;
					$('.login-user-contents').html(`Logged in as: ${name}`);
				}
				
				if (!displayUpdate) {clearInterval(displayUpdate);}
				displayUpdate = setInterval(update.bind(token),1000);
				update(token,true);
			} else if (token) {
				// localStorage.removeItem('acces_token');
			}
			break;
		case 'LOGIN':
			var token = Authorize('CHECK');
			
			if (token) {
				//Proceed to start up stuff
			} else {
				//Else prompt to log in
				Authorize('GET');
			}
			break;
		case 'LOGOUT':
			var loggedIn = localStorage.getItem('logged_in');
			
			if (loggedIn) {
				clearInterval(displayUpdate)
				localStorage.setItem('logged_in',false);
				localStorage.removeItem('access_token');
				localStorage.removeItem('loggedin-user-info');
				localStorage.removeItem('stream');

				// delete app.version;
				app.unload();

				$('.login').removeClass('connected');
				bootbox.alert({
					title:'Logged out',
					message:'You have been logged out. The page will now reload.',
					buttons:{
						ok:{
							label:'Reload'
						}
					},
					callback:() => {
					location.reload();
				}});
			}
			break;
	}
}