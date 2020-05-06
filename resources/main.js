"use strict";
let app,popup;

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
	const token = event.data.token;
	popup.close();
	app.setToken(token);
});

if ('serviceWorker' in navigator) {
	window.addEventListener('load', (e) => {
		navigator.serviceWorker.register('/sw.js').then((registration) => {
			console.log('ServiceWorker registration successful with scope: ', registration.scope);
		});
	}, (err) => {
		console.log('ServiceWorker registration failed: ', err);
	});
}


window.addEventListener("beforeinstallprompt", function(e) { 
	// log the platforms provided as options in an install prompt 
	console.log(e.platforms); // e.g., ["web", "android", "windows"] 
	e.userChoice.then(function(choiceResult) { 
		console.log(choiceResult.outcome); // either "accepted" or "dismissed"
	}, (err) => {
		console.log('There was an error: ', err);
	}); 
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

	var searchUpdate;
	$(app.events).on('app-load', () => {
		if (!app.settings.darkmode.value) {
			$('body').removeClass('darkmode');
		}
	}).on('login', (event) => {
		var details = event.detail, init = details.init;

		$('.login').addClass('connected');
		$('body').attr('logged_in',true);

		
		if (details.user) {
			var name = details.user.display_name;
			$('.login-user-contents .login-user-contents_name').html(`Logged in as: ${name}`);

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
		clearTimeout(searchUpdate);
		var searchAlert = $('.search-streamCards');
		if (searchAlert.val()!='') {
			searchUpdate = setTimeout(() => {
				searchAlert.change();
			},250);
		}
	});
	// Load app after setting up UI login and event listener for logging in.
	app.load().checkLogin();


	// Searching funciton
	var _found, searchTimeout, searchType = 'user';
	var allowTypes = ['user','game'];
	var querySearch = function( {_search = ''} ) {
		// If the search starts with a = then we treat it as changing the search mode
		if (_search.substr(0,1) == '=' && _search != '=') {
			// We are changing what we are searching for.
			if (allowTypes.indexOf(_search.substr(1,))>-1) {
				searchType = _search.substr(1,).toLowerCase();

				// Change text under earch input to show what mode we are in and aswell set the mode in the container for stream cards
				// Also set our input to nothing since we successfuly changed modes
				$('.login-user-contents .search-mode').html(`Search mode: <b>${searchType}</b>`);
				$('.streamCards-container').attr({'search-mode':searchType});
				$('.search-streamCards').val('').attr({'placeholder':`Search Cards by ${searchType}`});
			} else {
				// If what was sepcified not in allowed list then just treat as a normal search.
				$('.search-streamCards').val(_search.substr(1,)).change();
			}

			return; // Return to stop the actual filter from running
		} if (_search == '=') {
			// If its just = then don't do anything.
			return; // Return to stop the actual filter from running
		}

		// If there is no = at the start then do a normal filter for current search mode
		$('.streamCard').filter((i) => {
			var card = $($('.streamCard')[i]), name;
			try {
				name = JSON.parse(card.attr('data'))[searchType];
			} catch (e) {
				name = '';
			}
			var found = name.toLowerCase().indexOf(_search.toLowerCase()) > -1;
			_found = found?true:_found;

			// Switched to manule css change, jquery toggle recalculating CSS every call
			if (found) {
            	$(card).css({display:'inline-block'});
            } else {
            	$(card).css({display:'none'});
            }
			// $(card).toggle(found)
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
			searchTimeout = setTimeout(() => querySearch( {_search:search} ),300);
		} else {
			querySearch( {_search:search} );
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


	var updateNav = function() {
		if (document.documentElement.scrollTop>30) {
			$('.nav').addClass('collaps')
		} else {
			$('.nav').removeClass('collaps');
		}
	}

	// 
	$('.search-mode').attr('title','Determs what you are searching for.\nEither by user name or the game they are playing.\nChange modes by typing in: =user or: =game.');
	$(window).on('resize',updateWidth).on('scroll',updateNav);
});