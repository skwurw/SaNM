"use strict";
var imgRefresh = 40; // How often will preview images of stream try and update to refresh cache of it.
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
var changes = [];

function dateDiff(start, end) {
    var years = 0, months = 0, days = 0;
    // Day diffence. Trick is to use setDate(0) to get the amount of days
    // from the previous month if the end day less than the start day.
    if (end.getDate() < start.getDate()) {
        months = -1;
        var datePtr = new Date(end);
        datePtr.setDate(0);
        days = end.getDate() + (datePtr.getDate() - start.getDate());
    } else {
        days = end.getDate() - start.getDate();
    }

    if (end.getMonth() < start.getMonth() ||
       (end.getMonth() === start.getMonth() && end.getDate() < start.getDate())) {
        years = -1;
        months += end.getMonth() + (12 - start.getMonth());
    } else {
        months += end.getMonth() - start.getMonth();
    }

    years += end.getFullYear() - start.getFullYear();
    return {years:years,months:months,weeks:Math.floor(days/7),days:days};
}

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
					remStream.push(streams[name].info);
					streams[name].remove();
				}
			}
		}
	}
	
	if (remStreams>0) {
		var remString = '';
		console.log(remStream);
		for ([index,stream] of remStream.entries()) {remString+= stream.channel.display_name+(remStream.length!=index+1?', ':'')}
		bootbox.alert(`Streams removed: ${remStreams}<br><b>${remString}</b>`,_blank);
		console.log('Removed stream?',removed);
		console.log(remString);
	}

	changes = [storedS,data.streams,missing,added];
	if (added.length>0) {
		var addString = '';
		for ([index,stream] of added.entries()) {addString+= stream.channel.display_name+(added.length!=index+1?', ':'')}
		bootbox.alert(`Streams added: ${added.length}<br><b>${addString}</b>`,_blank);
		console.log('Streams added: ',added);
		console.log(addString);
	}
	console.log('stored, data, missing, added',changes);

	localStorage.setItem('stream',JSON.stringify(data));
}

function sortStreams() {
	var $parent = $('.streamCards-container');

	$parent.find('.streamCard').sort(function(a, b) {
		return b.dataset.viewers - a.dataset.viewers;
	}).appendTo($parent);
}

function update(token,forced) {
	var last = Number(localStorage.getItem('last_updated'));
	var now = Math.floor((new Date().getTime())/1000);

	$('.refresh').html('Next refresh: '+(imgRefresh-(Math.floor(performance.now()/1000)%imgRefresh)));

	if (!last || Math.floor(performance.now()/1000)%imgRefresh==0 || !localStorage.getItem('stream') || forced && app.logged_in) {
		if (!app.token || !app.token.key) {return;}
		var storedStreams = JSON.parse(localStorage.getItem('stream'));
		if (forced) {storedStreams = {};}
		storedStreams = (!storedStreams ? storedStreams : storedStreams.streams);
		localStorage.setItem('last_updated',Math.floor((new Date().getTime())/1000));

		var oauth_token = token;
		var setStreams = function(d) {
			for (var [i,s] of d.streams.entries()) {
				if (s.broadcast_platform != 'live') {
					d.streams.splice(i,1);
				}
			}
			checkStreams(d);

			// app.setStream(d);

			//Loop through all streams data
			for (var i in d.streams) {
				var item = d.streams[i];
				// For some fucked up reason other stream types are being gotten even tho we request only LIVE
				if (item.broadcast_platform == 'live') {
					var name = item.channel.display_name;
					
					if (streams[name]) {
						streams[name].update('data',item,app).update('uptime',undefined,app).update('display',undefined,app);
					} else {
						var stream = new Stream(item,app);
						streams[name] = stream;
						streams[name].update('uptime',undefined,app).update('display',undefined,app);
					}
				}
			}

			localStorage.setItem('stream',JSON.stringify(d));
			app.loadingAnimation(false);
			sortStreams();
		}
		
		app.loadingAnimation(true).updateStreams(forced || false);

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
			error:(err) => {this.error(err,app)}
		});
	}

	if (!Object.keys(streams).length) {
		//Create all stream constructors and store them.
		for (var i in storedStreams) {
			var item = storedStreams[i];
			var stream = new Stream(item,app);

			streams[item.channel.display_name] = stream;
		}
	}

	if (!updateInterval) {
		//Run update on images and uptime every second.
		updateInterval = setInterval(function() {
			for (var item in streams) {
				streams[item].update('uptime',undefined,app).update('display',undefined,app);
			}
		},1000);
		app.intervals.cardsUpdate = updateInterval;

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

	if (localStorage.getItem('logged_in') == 'true' || app.logged_in) {
		return false; // Ignore if already logged in.
	}

	// If passed, get token, close popup, and set the token for login.
	var token = event.data.token;
	popup.close();
	app.setToken(token);
});

$(document).ready(() => {
	app = new App();
	app.load().checkLogin(); // Check if a user has already connected.

	$('.login').click(() => {
		var connected = $('.login').hasClass('connected');
		
		if (!connected) {
			app.login();
		} else {
			bootbox.confirm({
				size:'small',
				title:'Logout',
				message:'Are you sure you want to log out?',
				backdrop:true,
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


	// Make streamCards container width dynamic to try and fit as many elements on screen along as making them centered
	var updateWidth = function() {
		var container = $(window);
		var width = Math.floor(container.width()/370);
		$('.streamCards-container').width(width*370);
	}
	updateWidth();
	$(window).on('resize',updateWidth);
});