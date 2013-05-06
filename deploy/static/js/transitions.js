$(function() {

	var $nav,
		$main,

		State;

	var Site = {

		isInitialized : false,

		init : function () {
			$nav = $('nav[role="main"] li');

			this.addListeners();

			this.onStateChange(null, true);
		},

		addListeners : function () {
			// Bind to StateChange Event
			History.Adapter.bind(window, 'statechange', $.proxy(this.onStateChange, this));

			// hijack links
			$(document).on("click", '[data-history]', $.proxy(this.onClickHistory, this));
		},

		onStateChange : function (e, runSetupOnly) {
			State = History.getState(); // Note: We are using History.getState() instead of event.state

			this.updateNavigation(); // make sure navigation-state is correct

			if (runSetupOnly) { // optinally run once without triggering additional loading / transtioning
				return;
			}

			if (this._xhr) {
				this._xhr.abort(); // stop loading any previous requests
			}

			this._xhr = $.ajax({
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
	Site.init(); // start the site
	/////////////////////
});
