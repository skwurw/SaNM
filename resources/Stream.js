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
		var notifications_title = `You have Notifications ${this.info.data.notifications?"Enabled":"Disabled"} for ${this.info.name}`;
		stats.find('.notifications')
			.addClass((this.info.data.notifications?'active':''))
			.attr('data-title',notifications_title);
		stats.find('.follow-age span')
			.html(this.info.data.followed_tooltip.full)
			.attr('title','Followed on '+new Date(this.info.data.followed_at)
			.toLocaleString());
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
	
	var logo = this.info.logo;
	$(this.element).find('.cardBody-left_logoImage').attr('src',logo);


	// Way to track image loading
	this.stream_preview_load = new Date().getTime();
	this.preview_loadtime = 8; // How long before we cancel loading the preview
	this.preview_timeout = setTimeout(() => {this.previewTimeout()},this.preview_loadtime*1000);
	$(this.element).find('.cardHead-stream_preview').on('load',(element) => {
		var loadTime = (new Date().getTime()-this.stream_preview_load)/1000;
		clearTimeout(this.preview_timeout);
		$(this.element)
			.find('.cardHead-preview_loading')
			.removeClass('cardHead-preview_loading_fail')
			.toggleClass()
			.find('.cardHead-stream_preview')
			.show();
		// console.log(`Preview for ${this.info.name} loaded after ${loadTime}s`);
	}).on('error',() => {
		if (this.preview_timeout) {
			clearTimeout(this.preview_timeout);
			this.preview_timeout = 0;
			this.previewTimeout();
		}
	});

	
	$('.streamCards-container').append(this.element);
}
Stream.prototype.previewTimeout = function() {	
	var loadTime = (new Date().getTime()-this.stream_preview_load)/1000;
	console.log(`%cPreview for ${this.info.name} failed after ${loadTime}s`,'color: #f33;');
	$(this.element).find('.cardHead-stream_preview').attr('src','http://').hide().parent().addClass('cardHead-preview_loading_fail');
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

		$(this.element).find('.cardHead-overlay_uptime div').html(`${hours}:${mins}:${secs}`);
	} else if (type == 'display') {
		var perfTime = Math.floor(performance.now()/1000);
		var docWidth = $(document).width();
		var imgWidth = 350;
		var imgHeight = Math.floor(imgWidth*.5625);
		var preview = `https://static-cdn.jtvnw.net/previews-ttv/live_user_${this.info.name.toLowerCase()}-${imgWidth}x${imgHeight}.jpg?p=${perfTime}`;

		var game = this.info.game;
		var channel = this.info.name;
		var startTime = new Date(this.info.video.started_at).toLocaleTimeString();
		var gameLink = `<a href="https://www.twitch.tv/directory/game/${game}" target="_blank" rel="noopener" class="cardBody-link" tabindex="-1">${game}</a>`;
		var streamLink = `<a href="https://www.twitch.tv/${channel}" target="_blank" rel="noopener" class="cardBody-link" tabindex="-1">${channel}</a>`;
		var streamTitle = `<a href="https://www.twitch.tv/${channel}" target="_blank" rel="noopener" class="cardBody-link" tabindex="-1"></a>`;
		
		// Metadata
		$(this.element).data('viewers',this.info.viewers)
			.data('stream_type',this.info.type)
			.attr('data-viewers',this.info.viewers)
			.find('.cardHead-overlay_viewers span')
				.html(this.info.viewers);

		// Card body
		$(this.element).find('.cardBody-rt')
			.attr('data-title',this.info.status)
			.html(streamTitle)
			.find('a')
			.text(this.info.status);
		$(this.element).find('.cardBody-rn').html(streamLink);
		$(this.element).find('.cardBody-rd').html('Playing '+gameLink);
		
		// Preview timeout
		clearTimeout(this.preview_timeout);
		this.stream_preview_load = new Date().getTime();
		this.preview_timeout = setTimeout(() => {this.previewTimeout()},this.preview_loadtime*1000);
		$(this.element).find('.cardHead-stream_preview')
			.attr('src',preview.replace(/\s/g,''))
			.parent()
			.addClass('cardHead-preview_loading')
			.removeClass('cardHead-preview_loading_fail')
			.attr('href',`https://www.twitch.tv/${channel}`);

		// Card Head
		$(this.element).find('.cardHead-overlay_uptime').attr('title',`Started at: ${startTime}`);
		$(this.element).find('.cardHead-overlay_viewers span').html(this.info.viewers.toLocaleString());
		// }
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
	if (find) {
		app.streams.streams.splice(find,1);
	}
	
	app.events.dispatchEvent(new CustomEvent('streams_update'));
	app.save();
}