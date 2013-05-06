$(function() {

	var $poll = $("#poll"),
		$pollStart = $poll.find(".start"),
		$pollResults = $poll.find(".results"),
		$pollForm = $poll.find("form");

	var $nav = $('nav[role="main"] li'),
		State;


	var Prepatation = {

		qs : null,
		xhr: null,

		init : function () {
			this.qs = this.querystring();

			this.togglePoll();

			this.addListeners();

			this.onStateChange(null, true); // first run to update navigation
		},

		addListeners : function () {
			// Bind to StateChange Event
			History.Adapter.bind(window, 'statechange', $.proxy(this.onStateChange, this));

			// hijack links
			$(document).on("click", '[data-history]', $.proxy(this.onClickHistory, this));
		},

		onClickHistory : function (e) {
			var targ = $(e.currentTarget),
				data = $.extend(targ.data(),
					{
						href : targ.attr("href"),
						title : targ.attr("title")
					});


			History.pushState(data, data.title, data.href); // push the new URL up
			console.log("push")

			e.preventDefault();
			return false;
		},

		togglePoll : function () {
			switch (this.qs.poll) {
				case 'start':
					$poll.removeClass("hidden");
					$pollStart.removeClass("hidden");
					$pollForm.on("submit", $.proxy(this.onSubmitPoll, this));
					break;
				case 'results':
					$poll.removeClass("hidden");
					$pollResults.removeClass("hidden");
					break;
				default:
					break;
			}
		},

		onSubmitPoll : function (e) {
			var str = $pollForm.serialize()

			if (!str.length) {
				// error page
				// return false;
			}
		},


		// parses query-string
		querystring : function () {
			var a = /\+/g,  // Regex for replacing addition symbol with a space
				r = /([^&=]+)=?([^&]*)/g,
				d = function (s) {
						return decodeURIComponent(s.replace(a, " "));
					},
				q = window.location.search.substring(1),
				qs = {},
				e = r.exec(q);

			while (e) {
				qs[d(e[1])] = d(e[2]);
				e = r.exec(q);
			}

			return qs;
		},

		onStateChange : function (e, runSetupOnly) {
			State = History.getState(); // Note: We are using History.getState() instead of event.state
			console.log(State.data);

			this.updateNavigation(); // make sure navigation-state is correct

			if (runSetupOnly) { // optinally run once without triggering additional loading / transtioning
				return;
			}

			if (this.xhr) {
				this.xhr.abort(); // stop loading any previous requests
			}

			this.xhr = $.ajax({
				url: State.url,
				dataType: "html",
				success: $.proxy(this.onLoadSuccess, this),
				error : $.proxy(this.onLoadError, this)
			}); // fetch the URL
		},


		onLoadSuccess : function (response) {
			var title = response.match(/<title>(.*?)<\/title>/), // change the document title
				$newContent = $(response).find('[data-transitional="content"]');

			// set the document title to the incoming title
			if (title && title[1]) {
				document.title = title[1];
			}


			var $content = $('[data-transitional="content"]'); // current page content

			// 1. swap content
			// $content.replaceWith($newContent); // swap content

			// 2. transition content
			$newContent.css("opacity", "0"); // needs to start out invisible

			$content.transition({
				opacity : 0,
				duration : "500ms",
				complete : function () {
					$content.replaceWith($newContent); // swap content

					$newContent.transition({
						opacity : 1,
						duration : "500ms"
					})
				}
			});
		},

		onLoadError : function (request, status, error) {
			console.log("error", request, status, error);
			// lets show fail whale
			// http://static.netmagazine.futurecdn.net/files/error_pages/includes/2011/11/404-page-by-mike-kus/img/multi3.gif
		},



		onClickHistory : function (e) {
			var targ = $(e.currentTarget),
				data = $.extend(targ.data(),
					{
						href : targ.attr("href"),
						title : targ.attr("title")
					});


			History.pushState(data, data.title, data.href); // push the new URL up

			e.preventDefault();
			return false;
		},


		updateNavigation : function () {
			var url = State.url,
				rootUrl = History.getRootUrl(),
				relativeUrl = url.replace(rootUrl, '');

			$nav
				.removeClass("active")
				.has('[href="'+relativeUrl+'"], [href="/'+relativeUrl+'"], [href="'+url+'"]')
					.addClass("active");
		}
	}

	/////////////////////
	Prepatation.init(); // start the site
	/////////////////////
});
