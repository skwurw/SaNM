"use strict";

var App = function(version) {
	this.version = '1.0.0';
	this.askScopes = ['user_read'];

	this._id = 'ea6gna29yeekmgxv3wezbvh9gdhkdf';
	this.logged_in = false;
	this.version_update = false;
	this.user = {};
	this.streams = {};
	this.token = {
		key:'',
		scopes:[],
		expire_time:-1
	};

	return this;
}

App.prototype.save = function() {
	localStorage.setItem('_app',JSON.stringify(this));
}

App.prototype.load = function() {
	if (localStorage._app) {
		var appData = JSON.parse(localStorage._app);
		this.streams = appData.streams || {};
		this.logged_in = appData.logged_in || this.logged_in;
		this.user = appData.user || {};
		this.token = appData.token || this.token;
		this.version_update = appData.version_update || this.version_update;

		if (appData.version != this.version && this.logged_in) {
			bootbox.alert(`There is a new version (version ${this.version}, old ${appData.version})`);
			this.version_update = true;
			this.version = appData.version;
		} else if (this.logged_in) {
			this.version = appData.version || this.version;
		} else if (!this.logged_in) {
			if (appData.version != this.version) {
				bootbox.alert(`Updated to new verison (v${this.version})`);
				this.version_update = true;
			}
			this.version = this.version;
		}

		this.save();
	} else {
		// If no app info is stored localy, then just log out the current user.
		app.logout();
		return false;
	}
}

App.prototype.setUser = function(user,token) {
	if (user && token) {
		var settings = {
			type:'GET',
			url:'https://api.twitch.tv/kraken/user',
			headers:{
				Accept:'application/vnd.twitchtv.v5+json',
				Authorization:`OAuth ${token}`,
				'Client-ID':`${this._id}`,
			}
		};

		$.ajax(settings).then((data) => {
			// Set info about user to app.
			this.user = data;
			this.logged_in = true;
			this.save();
			this.checkLogin(true);
		}).fail((err) => {
			bootbox.alert('There was an error getting info about current user.')
		});

		return true;
	} else {
		return false;
	}
}

App.prototype.setToken = function(token) {
	if (token) {
		// Check token and get expire/scopes along with username.
		var settings = {
			method:'GET',
			url:'https://id.twitch.tv/oauth2/validate',
			headers:{
				Accept:'application/vdn.twitchtv.v5+json',
				Authorization:`OAuth ${token}`
			}
		};

		$.ajax(settings).then((data) => {
			// If token is valid, then set info about it to the app.
			this.token.key = token;
			this.token.expire_time = (new Date().getTime())+(data.expires_in*1000);
			this.token.scopes = data.scopes;
			this.save();

			// After, get info about the user
			this.setUser(data.login,token);
		}).fail((err) => {
			bootbox.alert('There was an error checking if token is valid.')
		});
		
		return true;
	} else {
		return false;
	}
}

App.prototype.login = function() {
	// For testing, different authentication routs
	var host = window.location.host;
	var twitchapps = 'https://twitchapps.com/tokengen/';
	var localhost = 'http://localhost:3000/authentication/';
	var github = 'https://skwurw.github.io/SaNM/authentication/';
	var redirect = (host=='skwurw.github.io'?github:(host=='localhost:3000'?localhost:twitchapps));
	var scopes = app.askScopes.join('+');
	var forceVerify = (app.version_update)?'&force_verify=true':'';
	// If there is a version update, then force the user to re-authenticate.
	var url = `https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=${this._id}&redirect_uri=${redirect}&scope=${scopes}${forceVerify}`;
	
	popup = window.open(url,'',`width=600,height=800,left=${screen.availLeft+(screen.width*.05)},top=50`);
}

App.prototype.checkLogin = function(init) {
	var loggedIn = this.logged_in;
	var token = this.token?this.token.key:undefined;

	if (loggedIn && token) {
		// Check if token has expired.
		var now = new Date().getTime();
		var diff = this.token.expire_time-now;
		if (diff < 604800000) {
			this.logout('Token expired.');
			return;
		}

		$('.login').addClass('connected');

		if (this.user) {
			var name = this.user.display_name;
			$('.login-user-contents').html(`Logged in as: ${name}`);

			// If init is set then show success login alert (trigged by setUser)
			if (init) {
				bootbox.alert({
					size:'small',
					title:'Success',
					message:`You have successfuly logged in as ${name}.`
				});
			}
		}

		if (!displayUpdate) {clearInterval(displayUpdate);}
		displayUpdate = setInterval(update.bind(token),1000);
		update(token,true);
	}
}

App.prototype.logout = function(reason) {
	if (this.logged_in) {
		clearInterval(displayUpdate); // Clear the timer for checking stream updates.
		var settings = {
			method:'POST',
			url:`https://id.twitch.tv/oauth2/revoke?client_id=${this._id}&token=${this.token.key||this.token}`
		};

		// Revoke access token so it can't be used again.
		$.ajax(settings).then(() => {
			$('.login').removeClass('connected');
			$('.login-user-contents').html('');
		});

	}

	bootbox.alert({
		title:'Logged out',
		message:'You have been logged out. The page will now reload.'+(reason?`<br><b>Reason: ${reason}</b>`:''),
		buttons:{
			ok:{
				label:'Reload'
			}
		},
		callback:() => {
			location.reload();
		}
	});
	
	delete this.streams;
	delete this.user;
	delete this.token;
	this.logged_in = false;
	localStorage.clear();
	this.save();
}

App.prototype.setStream = function(data) {
	if (data) {
		this.streams = data;
		this.save();
		return true;
	} else {
		return false;
	}
}

App.prototype.unload = function() {
	var settings = {
		method:'POST',
		url:`https://id.twitch.tv/oauth2/revoke?client_id=${this._id}&token=${this.token.key||this.token}`
	};

	$.ajax(settings);

	delete this.streams;
	delete this.user;
	delete this.token;
	this.logged_in = false;
	this.save();
}