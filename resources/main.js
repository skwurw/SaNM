"use strict";
var imgRefresh = 30; // How often will preview images of stream try and update to refresh cache of it.
//This also determines the refresh of data
var app;
var GetTime = function() {
	return new Date().getTime()/1000;
}
var _blank = function() {}

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

	if (!last || Math.floor(performance.now()/1000)%imgRefresh==0 || !localStorage.getItem('stream') || forced && app.logged_in) {
		var storedStreams = JSON.parse(localStorage.getItem('stream'));
		if (forced) {storedStreams = {};}
		storedStreams = (!storedStreams ? storedStreams : storedStreams.streams);
		localStorage.setItem('last_updated',Math.floor((new Date().getTime())/1000));

		var oauth_token = token;
		var setStreams = function(d) {
			checkStreams(d);

			app.setStream(d);

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
				'Authorization':`OAuth ${app.token.key}`,
				'Client-ID':`${app._id}`,
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

//Listener for messages from popup window when authenticating.
var popup;
window.addEventListener('message',(event) => {
	if (event.origin != window.location.origin) {
		popup.close();
		bootbox.alert('Message from popup proved to be insecure. Retry again.')

		return false; // Return error if what we got isn't what we expected.
	}

	if (!event.data.success) {
		popup.close();
		// If user denies access to app, just alert about it.
		bootbox.alert('Authorization has been denied.');

		return false;
	}

	if (localStorage.getItem('logged_in') == true) {
		return false; // Ignore if already logged in.
	}

	// If passed, get token, close popup, and set the token for login.
	var token = event.data.token;
	popup.close();
	app.setToken(token);
});

$(document).ready(() => {
	app = new App();
	app.load();
	app.checkLogin(); // Check if a user has already connected.

	$('.login').click(() => {
		var connected = $('.login').hasClass('connected');
		
		if (!connected) {
			app.login();
		} else {
			bootbox.confirm({
				size:'small',
				title:'Logout',
				message:'Are you sure you want to log out?',
				buttons:{
					confirm:{
						label:'Logout',
					},
					cancel:{
						label:'Cancle'
					}
				},
				callback:(logout) =>{
				if (logout) {
					app.logout();
				}
			}});
		}
	});
});