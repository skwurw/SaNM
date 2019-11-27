"use strict";
function convert(value) {
    var length = (value + '').length,
        index = Math.ceil((length - 3) / 3),
        suffix = ['K', 'M', 'B', 'T'];

    if (length < 4) return value;
    return (value / Math.pow(1000, index)).toFixed(1) + suffix[index - 1];
}

var template = $('[type="streamcard-template"]').html();
var Stream = function(data,app) {
	//Define info for stream constructor function.
	this.info = {
		name:data.channel.display_name,
		id:data.channel._id,
		logo:data.channel.logo,
		game:data.game,
		status:data.channel.status,
		type:data.stream_type,
		viewers:data.viewers,
		channel:data.channel,
		video:{
			started_at:data.created_at,
			preview:data.preview.medium,
			_id:data._id,
		},
		uptime:{
			hh:0,
			mm:0,
			ss:0
		},
		data:app.followedInfo[app.user._id].data[data.channel._id]
	};

	this.element = $(`<div class="streamCard" data-user="${this.info.name}" data-id="${this.info.id}" data-stream_type="${this.info.type}"></div>`).append(template);
	this.element.attr('data-viewers',this.info.viewers);


	var stats = $(this.element).find('.stream-stats');
	if (this.info.data) {
		var notifications_title = `You have notifications ${this.info.data.notifications?"enabled":"disabled"} for ${this.info.name}`;
		stats.find('.notifications').addClass((this.info.data.notifications?'active':'')).attr('title',notifications_title)
		stats.find('.follow-age span').html(this.info.data.followed_tooltip.full).attr('title','Followed on '+new Date(this.info.data.followed_at).toLocaleString());
	} else {
		$(this.element).find('.follow-age').css('visibility','hidden');
		$(this.element).find('.notifications').css('visibility','hidden');
	}
	stats.find('.followers span').html(convert(this.info.channel.followers));
	stats.find('.views span').html(convert(this.info.channel.views));

	// For testing, removing the element
	$(this.element).find('.cardBody-button-removetest').click(this.remove.bind(this,app));
	// For testing, highlighting cards
	$(this.element).find('.cardBody-button.button-highlight').click((el) => {$(this.element).toggleClass('highlight')});
	
	$('.streamCards-container').append(this.element);

}

//Update info about the constructor like uptime.
Stream.prototype.update = function(type,data,app) {
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

		$('[data-user="'+this.info.name+'"] .cardHead-overlay_uptime div').html(`${hours}:${mins}:${secs}`);
	} else if (type == 'display') {
		var previewEle = $('[data-user="'+this.info.name+'"] .cardHead-stream_preview');
		var lastUpdate = Number(previewEle.attr('lastUpdate'));
		var perfTime = Math.floor(performance.now()/1000);
		var docWidth = $(document).width();
		var imgWidth = 350;
		var imgHeight = Math.floor(imgWidth*.5625);
		var preview = `https://static-cdn.jtvnw.net/previews-ttv/live_user_${this.info.name.toLowerCase()}-${imgWidth}x${imgHeight}.jpg?p=${perfTime}`;
		var logo = this.info.logo;

		var streamLUD = Math.floor((new Date().getTime()-app.streams.last_updated)/1000);
		//Update display to refresh image cache every so often.
		if (!lastUpdate || streamLUD>=100+app.streams.updateRate || streamLUD==0) {
			var game = this.info.game;
			var channel = this.info.name;
			var startTime = new Date(this.info.video.started_at).toLocaleTimeString();
			var gameLink = `<a href="https://www.twitch.tv/directory/game/${game}" target="_blank" rel="noopener" class="cardBody-link">${game}</a>`;
			var streamLink = `<a href="https://www.twitch.tv/${channel}" target="_blank" rel="noopener" class="cardBody-link">${channel}</a>`;
			var streamTitle = `<a href="https://www.twitch.tv/${channel}" target="_blank" rel="noopener" class="cardBody-link"></a>`;
			previewEle.attr('lastUpdate',perfTime);

			$(this.element).data('viewers',this.info.viewers);
			$(this.element).data('stream_type',this.info.type);
			$(this.element).find('.cardHead-overlay_viewers span').html(this.info.viewers);
			$(this.element).attr('data-viewers',this.info.viewers);
			
			$('[data-user="'+this.info.name+'"] .cardBody-rt').html(streamTitle);
			$('[data-user="'+this.info.name+'"] .cardBody-rt a').text(this.info.status);
			$('[data-user="'+this.info.name+'"] .cardBody-rt').attr('data-title',this.info.status);
			$('[data-user="'+this.info.name+'"] .cardBody-rn').html(streamLink);
			$('[data-user="'+this.info.name+'"] .cardBody-rd').html('Playing '+gameLink);
			
			$('[data-user="'+this.info.name+'"] .cardHead-overlay_uptime').attr('title',`Started at: ${startTime}`);
			$('[data-user="'+this.info.name+'"] .cardHead-stream_preview').attr('src',preview);
			$('[data-user="'+this.info.name+'"] .cardBody-left_logoImage').attr('src',logo);
			$('[data-user="'+this.info.name+'"] .cardHead-overlay_viewers span').html(this.info.viewers.toLocaleString());
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
			channel:data.channel,
			video:{
				started_at:data.created_at,
				preview:data.preview.medium,
				_id:data._id,
			},
			data:app.followedInfo[app.user._id].data[data.channel._id]
		};
	}
	
	return this;
}

Stream.prototype.updateNotifications = function(state) {

}

Stream.prototype.remove = function(app) {
	var name = this.info.name;
	$(this.element).remove();
	delete app.streams._constructs[name];

	var find = app.streams.streams.findIndex(x => {return x.channel.display_name == name});
	app.streams.streams.splice(find,1);
	app.save();

	// delete streams[name];
	
	// var streamsUpdate = JSON.parse(localStorage.getItem('stream'));
	// var find = streamsUpdate.streams.findIndex((x) => {return x.channel.display_name == this.info.name;});
	// streamsUpdate.streams.splice(find,1);
	// streamsUpdate._total = Object.keys(streams).length;
	// localStorage.setItem('stream',JSON.stringify(streamsUpdate));
}