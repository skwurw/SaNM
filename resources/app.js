"use strict";

var App = function(version) {
	this.version = '1.0.1';
	this.askScopes = ['user_read','user_follows_edit'];
	this.settings = {
		liveStats:{
			description:'Track the time at which streams are started and ended. Only works when you view the site',
			value:true // always set true when testing
		}
	}

	this._id = 'ea6gna29yeekmgxv3wezbvh9gdhkdf';
	this.logged_in = false;
	this.version_update = false;
	this.user = {};
	this.streams = {
		updateRate:40,
		last_updated:-1,
		streams:[],
		_constructs:{}
	};
	this.followedInfo = {}
	this.token = {
		key:'',
		scopes:{},
		expire_time:-1
	};
	this.intervals = {
		displayUpdate:0,
		cardsUpdate:0
	};
	this.events = document.createElement('p');

	return this;
}

App.prototype.save = function() {
	localStorage.setItem('_app',JSON.stringify(this));

	return this;
}

App.prototype.load = function() {
	if (localStorage._app) {
		var appData = JSON.parse(localStorage._app);
		this.streams = {
			updateRate:this.streams.updateRate,
			last_updated:(appData.streams.last_updated || this.streams.last_updated),
			streams:(appData.streams?(!appData.streams.streams.length?this.streams.streams:appData.streams.streams):this.streams.streams),
			_constructs:this.streams._constructs
		};
		// Loop through settings to update descriptions, only update value if its not provided
		for (var setting in this.settings) {
			this.settings[setting].description = this.settings[setting].description;
			this.settings[setting].value = (appData.settings?appData.settings[setting].value || this.settings[setting].value:this.settings[setting].value);
		}
		this.logged_in = appData.logged_in || this.logged_in;
		this.user = appData.user || this.user;
		this.followedInfo = appData.followedInfo || this.followedInfo;
		this.token = appData.token || this.token;
		this.version_update = appData.version_update || this.version_update;

		if (appData.version != this.version && this.logged_in) {
			bootbox.alert(`There is a new version (version ${this.version}, old ${appData.version})`);
			this.version_update = true;
			this.version = appData.version;
		} else if (this.logged_in) {
			// If we are logged in and there is no version difference, then set version update to false
			if (this.version == appData.version) {
				this.version_update = false;
				this.version = this.version;
			} else {
				this.version = appData.version || this.version;
			}
		} else if (!this.logged_in) {
			if (appData.version != this.version) {
				bootbox.alert(`Updated to new verison (v${this.version})`);
				this.version_update = true;
			}
			this.version = this.version;
		}

		this.save();
	} else {
		// If no app info is stored localy, then just wipe local storage
		localStorage.clear();
		this.save();
	}

	return this;
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

			// If followedInfo isn't already set from loading, then set it
			if (!this.followedInfo[this.user._id]) {
				this.followedInfo[this.user._id] = {
					data:{},
					updated_at:0,
					liveStats:{}
				}
			}
			
			this.save();
			this.checkLogin(true);
		}).fail((err) => {this.error(err,this)});
	}

	return this;
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
			// Set scopes as true keys in token object
			for (var index in data.scopes) {this.token.scopes[data.scopes[index]] = true;}
			this.version_update = false;
			this.save();

			// After, get info about the user
			this.setUser(data.login,token);
		}).fail((err) => {this.error(err,this)});
	}

	return this;
}

App.prototype.login = function() {
	// For testing, different authentication routs
	var host = window.location.host;
	var twitchapps = 'https://twitchapps.com/tokengen/';
	var localhost = 'http://localhost:3000/authentication/';
	var crosshost = 'http://crosshost:3000/authentication/'; // localhost alternative for another pc
	var github = 'https://skwurw.github.io/SaNM/authentication/';
	var redirect = (host=='localhost:3000'?localhost:(host=='crosshost:3000'?crosshost:github));
	var scopes = app.askScopes.join('+');
	var forceVerify = (app.version_update)?'&force_verify=true':'';
	// If there is a version update, then force the user to re-authenticate.
	var url = `https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=${this._id}&redirect_uri=${redirect}&scope=${scopes}${forceVerify}`;
	
	popup = window.open(url,'',`width=600,height=800,left=${screen.availLeft+(screen.width*.05)},top=50`);

	return this;
}

App.prototype.logout = function(reason) {
	if (this.logged_in && this.token.key) {
		for (var timer in this.intervals) {
			clearInterval(this.intervals[timer]);
			this.intervals[timer] = 0;
		}

		var settings = {
			method:'POST',
			url:`https://id.twitch.tv/oauth2/revoke?client_id=${this._id}&token=${this.token.key||this.token}`
		};

		// Revoke access token so it can't be used again.
		$.ajax(settings).then(() => {
			this.events.dispatchEvent(new CustomEvent('logout'));
		});

	}

	delete this.user;
	delete this.token;
	this.logged_in = false;
	for (var stream in this.streams._constructs) {
		this.streams._constructs[stream].remove(this);
	}
	this.streams = {
		updateRate:40,
		last_updated:-1,
		streams:[],
		_constructs:{}
	};

	localStorage.clear();
	this.save();


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

	return this;
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

		var event = new CustomEvent('login',{detail:{user:this.user,init:init}});
		this.events.dispatchEvent(event);
		this.loadingAnimation(true).updateFollowedInfo();
	}

	return this;
}

App.prototype.updateStreams = function(forced) {
	var now = new Date().getTime();
	var then = this.streams.last_updated || 0;
	var timeDiff = Math.floor((now-then)/1000);
	var request;

	if (!this.intervals.displayUpdate) {
		clearInterval(this.intervals.displayUpdate);
		this.intervals.displayUpdate = setInterval(this.updateStreams.bind(this),990);
	}

	var nextUpdate = Math.min(this.streams.updateRate,Math.max((this.streams.updateRate-timeDiff),0));
	$('.refresh').html(`Next refresh: ${nextUpdate}<br>Streams live: ${this.streams.streams.length}`);

	// Check if user is logged in and has a token, aswell making sure we do a request after a certain amount of time
	if (this.logged_in && this.token.key && (timeDiff >= this.streams.updateRate || forced)) {
		this.streams.last_updated = now;
		this.loadingAnimation(true);

		var settings = {
			url:`https://api.twitch.tv/kraken/streams/followed?stream_type=live&limit=100`,
			headers:{
				'Accept':'application/vnd.twitchtv.v5+json',
				'Authorization':`OAuth ${this.token.key}`,
				'Client-ID':`${this._id}`,
			},
		    type:'GET',
		    dataType:'json'
		};

		var compare = function(otherArray) {
		    // otherArray is provided from caller
		    return function(current) {
		        // Current is given by the caller filter function
		        return otherArray.filter(function(other) {
		            // Other is given by filter funciton applyed to otherArray
		            // Compare other to current names
		            return other.channel.display_name == current.channel.display_name;
		        }).length == 0; // Idk why this is here but stackoverflow says to add it here
		    }
		}
		var sortStreams = function() {
			var $parent = $('.streamCards-container');

			$parent.find('.streamCard').sort(function(a, b) {
				return b.dataset.viewers - a.dataset.viewers;
			}).appendTo($parent);
		}
		var alertChanges = function(_app,_removed,_added,forced) {
	    	var removedStreamNames = '';
	    	var addedStreamNames = '';
			
			if (_removed.length) {
		    	for (var [index,item] of _removed.entries()) {
		    		var lastIndex = (index+1)!=_removed.length;
		    		removedStreamNames += (!lastIndex&&_removed.length!=1?'and ':'')+item.channel.display_name+(lastIndex&&_removed.length!=1?', ':'');
		    		
		    		var item = _app.streams._constructs[item.channel.display_name];
		    		if (item) {
			    		item.remove(_app);
			    	}
		    	}
		    	console.log('remove!',_removed);
		    }
		    if (_added.length) {
		    	for (var [index,item] of _added.entries()) {
		    		if (item.broadcast_platform=='live') { // Make sure if we are alerting for new streams that are live
			    		var lastIndex = (index+1)!=_added.length;
			    		addedStreamNames += (!lastIndex&&_added.length!=1?'and ':'')+item.channel.display_name+(lastIndex&&_added.length!=1?', ':'');
			    	} else {
			    		// If stream isn't live, then remove it from _added
			    		_added.splice(index-1,1);
			    	}
			    }
		    	console.log('added!',_added);
		    }

		    if ((_added.length || _removed.length)) {
		    	var message = '';
		    	message += addedStreamNames?`Streams added: ${_added.length}<br><b>${addedStreamNames}</b>`:'';
		    	message += (addedStreamNames&&removedStreamNames?'<br><br>':'');
		    	message += removedStreamNames?`Streams removed: ${_removed.length}<br><b>${removedStreamNames}</b>`:'';
		    	// console.log(message);

		    	var bootboxAlert = {
					title:'Changes to streams',
					message:message,
					backdrop:true
				};
				if (_added.length<=1 && _removed.length<=1) {bootboxAlert['size'] = 'small'}
			    bootbox.alert(bootboxAlert);
			}
		}

		$.ajax(settings).then((data) => {
			var user = this.user._id;
			var oldStreams = this.streams.streams;
			var newStreams = data.streams;
			var added = newStreams.filter(compare(oldStreams)); // Get how many objects are added
		    var removed = oldStreams.filter(compare(newStreams)); // Get how many objects are removed
		    this.streams._constructs = this.streams._constructs || {};

		    for (var [index,_stream] of data.streams.entries()) {
		    	var name = _stream.channel.display_name;
		    	if (_stream.broadcast_platform == 'live') {
			    	if (!this.streams._constructs[name]) {
			    		var _s = new Stream(_stream,this);
			    		this.streams._constructs[name] = _s;
			    		this.streams._constructs[name].update('uptime',undefined,this).update('display',undefined,this);
			    	} else {
			    		this.streams._constructs[name].update('data',_stream,this).update('uptime',undefined,this).update('display',undefined,this);
			    	}
				    
				    if (this.followedInfo[user] && this.settings.liveStats.value) {
						if (!this.followedInfo[user].liveStats) {
							this.followedInfo[user].liveStats = {};
						}

						var streamInfo = {};
						streamInfo.started_at = _stream.created_at;
						streamInfo.finished_at = new Date().toISOString(); // Assume the end time of the stream, will update every time until stream with ID is offline/ended
						streamInfo.length = Math.floor((new Date(streamInfo.finished_at).getTime()-new Date(streamInfo.started_at).getTime())/1000);
						this.followedInfo[user].liveStats[name] = this.followedInfo[user].liveStats[name] || {};
						this.followedInfo[user].liveStats[name][_stream._id] = streamInfo;
					}
			    } else {
			    	// Find any reruns and remove them from added
			    	var _find = added.findIndex((x) => {return x.broadcast_platform == 'rerun'});
			    	if (_find>-1) {added.splice(_find,1);}
			    	if (this.streams._constructs[_stream.channel.display_name]) {
			    		this.streams._constructs[_stream.channel.display_name].remove(this)
			    		removed.push(_stream);
			    	}
			    	var _g='color:lime;',_y='color:yellow',_w='color:default;';
			    	data.streams.splice(index,1);
			    	console.log(`Stream for%c ${_stream.channel.display_name} %cis not live and is rather a%c ${_stream.broadcast_platform} %cinstead.`,_g,_w,_y,_w,_stream);
			    }
			    
		    }


		    // Alert for added/remove streams
		    alertChanges(this,removed,added,forced);
		    // Sort stream elements
		    sortStreams();
			this.streams.streams = data.streams;
			if (!forced) {this.events.dispatchEvent(new CustomEvent('streams_update'));}

			$('.refresh').html(`Next refresh: ${nextUpdate}<br>Streams live: ${this.streams.streams.length}`);

			this.save().loadingAnimation(false);
		}).fail((err) => {this.error(err,this)});

		if (!this.intervals.cardsUpdate) {
	    	this.intervals.cardsUpdate = setInterval(() => {
	    		for (var name in this.streams._constructs) {
	    			var _stream = this.streams._constructs[name];
	    			_stream.update('uptime',undefined,this);
	    		}
	    	},1000);
	    }
	}

	return this;
}

App.prototype.updateFollowedInfo = function(forced) {
	// Check if logged in and has a token
	if (this.logged_in && this.token.key) {
		// Check if user has followedInfo already set, if not then set it
		if (!this.followedInfo[this.user._id]) {
			this.followedInfo[this.user._id] = {
				data:{},
				updated_at:0,
				liveStats:{}
			}
		}

		// Check when the last update was for followedInfo for current user
		var lastUpdated = this.followedInfo[this.user._id];
		lastUpdated = lastUpdated ? lastUpdated.updated_at : 0;
		var timeDiff = Math.floor((new Date().getTime()-lastUpdated)/1000);

		// If data is older then a day or we are forced, then update data
		if (timeDiff>(60*60*24) || forced) {
			this.followedInfo[this.user._id].updated_at = new Date().getTime();

			var that = this;
			var getInfo = function(offset) {
				// Make sure if no offset is set, then set it to 0
				offset = offset?offset:0;

				var settings = {
					url:`https://api.twitch.tv/kraken/users/${that.user._id}/follows/channels?limit=100&offset=${offset}&direction=desc`,
					method:'GET',
					headers:{
						'Accept':'application/vnd.twitchtv.v5+json',
						'Authorization':`OAuth ${that.token.key}`,
						'Client-ID':`${that._id}`,
					}
				}

				$.ajax(settings).then((data) => {
					for (var index in data.follows) {
						var item = data.follows[index];
						var created_at = item.created_at;
						var notifications = item.notifications;
						var _id = item.channel._id;
						var name = item.channel.display_name;
						var banner = item.channel.profile_banner;

						var _follow = dateDiff(new Date(created_at),new Date());
						var years = _follow.years || 0, months = _follow.months || 0, weeks = _follow.weeks || 0, days = _follow.days || 0;
						var followed_short = (years>0?years+(years<=1?" year":" years"):(months>0?months+(months==0?" month":" months"):(days>0?days+(days==0?" day":" days"):"Not long")));
						var followed_full = (years>0?years+" years":"")+(years>0?", ":" ")+(months>0?months+" months":"")+(months>0?", ":" ")+(days>0?days+" days":"");

						that.followedInfo[that.user._id].data[_id] = {
							followed_at:created_at,
							followed_length:_follow,
							followed_tooltip:{full:followed_full,short:followed_short},
							notifications:notifications,
							name:name,
							banner:banner
						};
					}
					// Update how many objects are stored
					that.followedInfo[that.user._id].length = Object.keys(that.followedInfo[that.user._id].data).length;
					that.save();

					// If we have 100 arrays then we request again with an offset of +100
					// Weird thing where if you request one after another, it returns 1 or more less objects in the array
					if (data.follows.length >= 90) {
						getInfo(offset+data.follows.length);
					} else {
						// If we don't need to do anymore request, then start the first update
						that.updateStreams(true);
					}
				}).fail((err) => {that.error(err,that)});
			}

			getInfo();
		} else {
			// If we can't request yet, then start first update
			this.updateStreams(true);
		}
	}

	return this;
}

App.prototype.loadingAnimation = function(state) {
	$('.streamCards-container').attr('loading',state || false);

	return this;
}

App.prototype.error = function(err,_app) {
	console.log('Error called',err);
	var status = err.status;

	if (err.responseJSON) {
		var code = err.responseJSON.status;
		var message = err.responseJSON.message;

		if (code != 401) {
			// If code is not 401, then just alert the error.
			var _alert = $('.request-error_401');
			if (_alert[0]) {_alert.find('.bootbox-accept').click();}
			bootbox.alert({
				message:`There was an error requesting data from the API.<br>Error: ${message}<br>Code: ${status}`,
				title:'Error with request',
				className:'request-error_401'
			});
			// clearInterval(_app.intervals.displayUpdate); // Stop timer from requesting from api
		} else if (code == 401) {
			// If code is 401, then oauth token is invalid and user needs to be logged out.
			app.logout('Access token expire.');
			clearInterval(_app.intervals.displayUpdate); // Stop timer from requesting from api
		}

		// Clear intervals for all timers set in app.intervals
		for (var timer in this.intervals) {
			clearInterval(this.intervals[timer]);
			this.intervals[timer] = 0;
		}
	} else {
		if (err.status == 0) {
			var _alert = $('.request-error_0');
			if (_alert[0]) {_alert.find('.bootbox-accept').click();}
			bootbox.alert({
				message:`Looks like you have no internet currently.<br>Status code: ${err.status}<br>Status Text: ${err.statusText}`,
				title:'Error with request',
				className:'request-error_0',
				backdrop:true
			});
		} else {
			var _alert = $('.request-error_unknown');
			if (_alert[0]) {_alert.find('.bootbox-accept').click();}
			bootbox.alert({
				message:`There was an unknown error that happened getting data.<br>Status code: ${err.status}<br>Status Text: ${err.statusText}`,
				title:'Error with request',
				className:'request-error_unknown',
				backdrop:true
			});
		}
	}
	this.loadingAnimation(false);

	return this;
}