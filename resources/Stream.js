"use strict";
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
			var gameLink = `<a href="https://www.twitch.tv/directory/game/${game}" target="_blank" rel="noopener" class="cardBody-link">${game}</a>`;
			var streamLink = `<a href="https://www.twitch.tv/${channel}" target="_blank" rel="noopener" class="cardBody-link">${channel}</a>`;
			var streamTitle = `<a href="https://www.twitch.tv/${channel}" target="_blank" rel="noopener" class="cardBody-link">${this.info.status}</a>`;
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