"use strict";
var app,popup;

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

//Listener for messages from popup window when authenticating.
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

	// Manage logging in	
	$('.login').click((target) => {
		var connected = $('.login').hasClass('connected');
		
		if (!connected) {
			app.login();
		} else if ($(target.target).hasClass('login-user-contents_name')) {
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

	$(app.events).on('login', (event) => {
		var details = event.detail, init = details.init;

		$('.login').addClass('connected');
		$('body').attr('logged_in',true);

		if (details.user) {
			var name = details.user.display_name;
			$('.login-user-contents div').html(`Logged in as: ${name}`);

			// If init is set then show success login alert (trigged by setUser)
			if (init) {
				bootbox.alert({
					size:'small',
					title:'Success',
					message:`You have successfuly logged in as ${name}.`
				});
			}
		}
	}).on('logout', () => {
		$('.login').removeClass('connected');
		$('body').attr('logged_in',false);
		$('.login-user-contents').html('');
	}).on('streams_update', () => {
		console.log('streams_update');
		var searchAlert = $('.search-streamCards');
		searchAlert.change();
	});
	// Load app after setting up UI login and event listener for logging in.
	app.load().checkLogin();


	// Searching funciton
	var _found, searchTimeout;
	var querySearch = function(search) {
		$('.streamCard').filter((i) => {
			var cards = $($('.streamCard')[i]), name = cards.attr('data-user');
			var found = name.toLowerCase().indexOf(search.toLowerCase()) > -1;
			_found = found?true:_found;
			$(cards).toggle(found)
		});

		var searchAlert = $('.search-content-none');
		if (!_found) {
			searchAlert.html('No cards found with the name you searched for.');
			searchAlert.css({'opacity':'1'});
		} else {
			searchAlert.html('');
			searchAlert.css({'opacity':'0'});
		}
	}
	var _search = function(el) {
		clearTimeout(searchTimeout);
		var search = $(el.target).val();
		_found = false;

		if (search != '') {
			searchTimeout = setTimeout(querySearch.bind(null,search),300);
		} else {
			querySearch(search);
		}
	}

	$('.search-streamCards').on('change',_search).on('input',_search);

	// Make streamCards container width dynamic to try and fit as many elements on screen along as making them centered
	var updateWidth = function() {
		var container = $(window);
		var width = Math.floor(container.width()/370);
		$('.streamCards-container').width(width*370);
	}
	updateWidth();
	$(window).on('resize',updateWidth);
});