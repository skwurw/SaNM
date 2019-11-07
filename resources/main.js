"use strict";
var imgRefresh = 30; // How often will preview images of stream try and update to refresh cache of it.
//This also determines the refresh of data
var GetTime = function() {
	return new Date().getTime()/1000;
}
var _blank = function() {}

var template = $('[type="streamcard-template"]').html();
var Stream = function(data) {
	//Define info for stream constructor function.
	this.info = {
		name:data.channel.display_name,
		id:data.channel._id,
		logo:data.channel.logo,
		game:data.game,
		status:data.channel.status,
		type:data.stream_type,
		viewers:data.viewers,
		video:{
			started_at:data.created_at,
			preview:data.preview.medium,
			_id:data._id,
		},
		uptime:{
			hh:0,
			mm:0,
			ss:0
		}
	};

	this.element = $('<div class="streamCard" data-user="'+this.info.name+'" data-stream_type="'+this.info.type+'"></div>').append(template);
	this.element.attr('data-viewers',this.info.viewers);

	$(this.element).find('.cardBody-button-removetest').click(() => {
		this.remove();
	})
	
	$('body').append(this.element);

}

//Update info about the constructor like uptime.
Stream.prototype.update = function(type,data) {
	$('.refresh').html('Next refresh: '+(30-(Math.floor(performance.now()/1000)%imgRefresh)));
	if (type == 'uptime') {
		var now = new Date().getTime();
		var then = new Date(this.info.video.started_at).getTime();
		var diff = Math.floor((now-then)/1000);

		var hours = Math.floor(diff/60/60);
		var mins = Math.floor(diff/60%60);
		var secs = Math.floor(diff%60);
		mins = mins<10? '0'+mins:mins;
		secs = secs<10?'0'+secs:secs;

		this.info.uptime = {
			hh:hours,
			mm:mins,
			ss:secs
		};

		$('[data-user="'+this.info.name+'"] .cardHead-overlay_uptime').html(`${hours}:${mins}:${secs}`);
	} else if (type == 'display') {
		var previewEle = $('[data-user="'+this.info.name+'"] .cardHead-stream_preview');
		var lastUpdate = Number(previewEle.attr('lastUpdate'));
		var perfTime = Math.floor(performance.now()/1000);
		var preview = this.info.video.preview+'?p='+perfTime;
		var logo = this.info.logo;

		//Update display to refresh image cache every so often.
		if (!lastUpdate || perfTime%imgRefresh == 0) {
			var game = this.info.game;
			var channel = this.info.name;
			var startTime = new Date(this.info.video.started_at).toLocaleTimeString();
			var gameLink = `<a href="https://www.twitch.tv/directory/game/${game}" target="_blank" class="cardBody-link">${game}</a>`;
			var streamLink = `<a href="https://www.twitch.tv/${channel}" target="_blank" class="cardBody-link">${channel}</a>`;
			var streamTitle = `<a href="https://www.twitch.tv/${channel}" target="_blank" class="cardBody-link">${this.info.status}</a>`;
			previewEle.attr('lastUpdate',perfTime);

			$(this.element).data('viewers',this.info.viewers);
			$(this.element).data('stream_type',this.info.type);
			$(this.element).find('.cardHead-overlay_viewers').html(this.info.viewers);
			$(this.element).attr('data-viewers',this.info.viewers);
			
			$('[data-user="'+this.info.name+'"] .cardBody-rt').html(streamTitle);
			$('[data-user="'+this.info.name+'"] .cardBody-rt').attr('title',this.info.status);
			$('[data-user="'+this.info.name+'"] .cardBody-rn').html(streamLink);
			$('[data-user="'+this.info.name+'"] .cardBody-rd').html('Playing '+gameLink);
			
			$('[data-user="'+this.info.name+'"] .cardHead-overlay_uptime').attr('title',`Started at: ${startTime}`);
			$('[data-user="'+this.info.name+'"] .cardHead-stream_preview').attr('src',preview);
			$('[data-user="'+this.info.name+'"] .cardBody-left_logoImage').attr('src',logo);
			$('[data-user="'+this.info.name+'"] .cardHead-overlay_viewers').html(this.info.viewers.toLocaleString());
		}
	} else if (type == 'data') {
		this.info = {
			name:data.channel.display_name,
			id:data.channel._id,
			logo:data.channel.logo,
			game:data.game,
			status:data.channel.status,
			type:data.stream_type,
			viewers:data.viewers,
			video:{
				started_at:data.created_at,
				preview:data.preview.medium,
				_id:data._id,
			}
		};
	}
	
	return this;
}

Stream.prototype.updateNotifications = function(state) {

}

Stream.prototype.remove = function() {
	var name = this.info.name;
	$(this.element).remove();
	delete streams[name];
	
	var streamsUpdate = JSON.parse(localStorage.getItem('stream'));
	var find = streamsUpdate.streams.findIndex(x => {x.channel.display_name == this.info.name});
	streamsUpdate.streams.splice(find,1);
	streamsUpdate._total = Object.keys(streams).length;
	localStorage.setItem('stream',JSON.stringify(streamsUpdate));
}

var index = 1;
var stream;
var streams = {};
var updateInterval;
var displayUpdate;
var changes = [];

function checkStreams(data) {
	//Compare to see if streams dropped.

	if (!localStorage.getItem('stream')) {
		return false;
	}

	var storedS = JSON.parse(localStorage.getItem('stream')).streams;
	var missing = storedS.slice(0);
	var added = data.streams.slice(0);
	var remStreams = 0;
	var remStream = [];
	for (var i in storedS) {
		var $stream = storedS[i];

		var find = data.streams.findIndex(x => x.channel.display_name == $stream.channel.display_name);
		var find2 = storedS.findIndex(x => x.channel.display_name == $stream.channel.display_name);

		if (find >= 0) {
			added.splice(added.findIndex(x => x.channel.display_name == $stream.channel.display_name),1);
		} else {
			remStreams++;
			var removed = missing.splice(missing.findIndex(x => x.channel.display_name == $stream.channel.display_name),1);
			for (var index in removed) {
				var name = removed[index].channel.display_name;
				if (streams[name]) {
					remStream.push(streams[name]);
					streams[name].remove();
				}
			}
		}
	}
	
	if (remStreams>0) {
		bootbox.alert(`Streams removed: ${remStreams}`,_blank);
		console.log('Removed stream?',removed);
	}

	changes = [storedS,data.streams,missing,added];
	if (added.length>0) {
		bootbox.alert(`Streams added: ${added.length}`,_blank);
		console.log('Streams added: ',added);
	}
	console.log('stored, data, missing, added',changes);

	localStorage.setItem('stream',JSON.stringify(data));
}

function sortStreams() {
	var $parent = $('body');

	$parent.find('.streamCard').sort(function(a, b) {
		return b.dataset.viewers - a.dataset.viewers;
	}).appendTo($parent);
}

function update(token,forced) {
	var last = Number(localStorage.getItem('last_updated'));
	var now = Math.floor((new Date().getTime())/1000);

	if (!last || Math.floor(performance.now()/1000)%imgRefresh==0 || !localStorage.getItem('stream') || forced && localStorage.getItem('logged_in')) {
		var storedStreams = JSON.parse(localStorage.getItem('stream'));
		if (forced) {storedStreams = {};}
		storedStreams = (!storedStreams ? storedStreams : storedStreams.streams);
		localStorage.setItem('last_updated',Math.floor((new Date().getTime())/1000));

		var oauth_token = token;
		var setStreams = function(d) {
			checkStreams(d);

			localStorage.setItem('stream',JSON.stringify(d));

			//Loop through all streams data
			for (var i in d.streams) {
				var item = d.streams[i];
				var name = item.channel.display_name;
				
				if (streams[name]) {
					streams[name].update('data',item).update('uptime').update('display');
				} else {
					var stream = new Stream(item);
					streams[name] = stream;
					streams[name].update('uptime').update('display');
				}
			}

			sortStreams();
		}
		
		$.ajax({
		    url:`https://api.twitch.tv/kraken/streams/followed?stream_type=live&limit=100`,
			headers:{
				'Accept':'application/vnd.twitchtv.v5+json',
				'Authorization':`OAuth ${Authorize('TOKEN')}`,
				'Client-ID':`${Authorize('CLIENTID')}`,
			},
		    type:'GET',
		    dataType:'json',
			success:setStreams,
			error:function(err) {
				bootbox.alert('There was an error requesting data from the API.');
			    console.log(err);
			}
		});
	}

	if (!Object.keys(streams).length) {
		//Create all stream constructors and store them.
		for (var i in storedStreams) {
			var item = storedStreams[i];
			var stream = new Stream(item);

			streams[item.channel.display_name] = stream;
		}
	}

	if (!updateInterval) {
		//Run update on images and uptime every second.
		updateInterval = setInterval(function() {
			for (var item in streams) {
				streams[item].update('uptime').update('display');
			}
		},1000);

		var $parent = $('body');
		$parent.find('.streamCard').sort(function(a, b) {
			return b.dataset.viewers - a.dataset.viewers;
		}).appendTo($parent);
	}
}

var popup;
window.addEventListener('message',(event) => {
	if (!event.origon == window.location.origin) {
		popup.close();

		bootbox.alert('Message from popup proved to be insecure. Retry again.')

		return false;
	}
	if (localStorage.getItem('logged_in') == true) {
		return false;
	}

	var token = event.data.token;
	popup.close();
	Authorize('SETTOK',token);
});

function Authorize(status,token) {
	switch (status) {
		case 'GET':
			//For testing, different authentication routs
			var host = window.location.host;
			var twitchapps = 'https://twitchapps.com/tokengen/';
			var localhost = 'http://localhost:3000/authentication/';
			var github = 'https://skwurw.github.io/SaNM/authentication';
			var redirect = (host=='skwurw.github.io'?github:(host=='localhost:3000'?localhost:twitchapps));
			var url = `https://id.twitch.tv/oauth2/authorize?response_type=token&client_id=${Authorize('CLIENTID')}&redirect_uri=${redirect}&scope=user_read`;
			
			popup = window.open(url,'','width=600,height=800,left=50,top=50');
			break;
		case 'ERROR':
			bootbox.alert({size:'small',title:'Error',message:'There was an error attemtping to authenticate.'});
			break;
		case 'SETTOK':
			if (token) {
				localStorage.setItem('access_token',token);
				localStorage.setItem('logged_in',true);
				
				var settings = {
					type:'GET',
					url:'https://api.twitch.tv/kraken/user',
					headers:{
						Accept:'application/vnd.twitchtv.v5+json',
						Authorization:`OAuth ${token}`,
						'Client-ID':'ea6gna29yeekmgxv3wezbvh9gdhkdf',
					},
					success:(data) => {
						localStorage.setItem('loggedin-user-info',JSON.stringify(data));
						bootbox.alert({
							size:'small',
							title:'Success',
							message:`You have successfuly logged in as ${data.display_name}.`
						});
						Authorize('CHECK');
					},
					error:(err) => {
						bootbox.alert('There was an error getting user info.');
						Authorize('CHECK');
					}
				}
				$.ajax(settings);
			} else {
				Authorize('ERROR');
			}
			break;
		case 'TOKEN':
			return localStorage.getItem('access_token') || undefined;
			break;
		case 'CLIENTID':
			return 'ea6gna29yeekmgxv3wezbvh9gdhkdf';
			break;
		case 'CHECK':
			var loggedIn = localStorage.getItem('logged_in');
			var token = localStorage.getItem('access_token');
			
			if (loggedIn == 'true') {
				$('.login').addClass('connected');
				var userInfo = JSON.parse(localStorage.getItem('loggedin-user-info'));
				
				if (userInfo) {
					var name = userInfo.display_name;
					$('.login-user-contents').html(`Logged in as: ${name}`);
				}
				
				if (!displayUpdate) {clearInterval(displayUpdate);}
				displayUpdate = setInterval(update.bind(token),1000);
				update(token,true);
			} else if (token) {
				localStorage.removeItem('acces_token');
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
				$('.login').removeClass('connected');
				bootbox.alert({title:'Logged out',message:'You have been logged out. The page will now reload.',callback:() => {
					location.reload();
				}});
			}
			break;
	}
}


$(document).ready(() => {
	Authorize('CHECK'); // Check if a user has already connected.
	
	$('.login').click(() => {
		var connected = $('.login').hasClass('connected');
		
		if (!connected) {
			Authorize('LOGIN');
		} else {
			bootbox.confirm({size:'small',title:'Logout',message:'Are you sure you want to log out?',callback:(logout) =>{
				if (logout) {
					Authorize('LOGOUT')
				}
			}});
		}
	});
});