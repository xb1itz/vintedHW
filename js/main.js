/*=================================
=            Main code            =
=================================*/

$(function() {

    //Get single shot HTML partial
    function getShotTemplate() {
        return $.get('partials/shot.html');
    }

    //Get a batch of shots from dribbble
    function getShots(page) {

        var url = 'https://api.dribbble.com/v1/shots?access_token=73546f799e66c6ee6c04f1a9dfe6e406402308a8814a2ed0a1eae760edd54264';

        var data = {
            page: page || 1,
            per_page: 12
        };

        return $.ajax({
            dataType: "json",
            crossDomain: true,
            url: url,
            data: data,
        });
    }

    //Render a batch of shots
    function renderBatch() {

        var preloadOffsetRatio = 4;
        var isHighDpi = window.devicePixelRatio > 1;
        var container = shotsContainer.get(0);
        var offsetBottom = container.scrollHeight - container.scrollTop - container.clientHeight;


        //Check of shot is within a viewport and render it by adding a .show class
        $.each(hiddenShots, function(index, element) {

            if (element.offset < container.scrollTop + container.clientHeight) {

                element.shot.addClass('show');

                //Remove reference to a shot thus it is no longer required
                delete hiddenShots[element.shot];
            }

        })


        //Check if enough shots preloaded according to preloading offset 
        if (offsetBottom <= preloadOffsetRatio * container.clientHeight && !isRendering) {

            //Prevent request throttling with rendering flag (true means another request is loading)
            isRendering = true;

            getShots(page).then(function(shots) {

                $.each(shots, function(index, shot) {

                    //Set high DPI image as thumbnail URL if it is rendered on high DPI device
                    var imageUrl = isHighDpi ? shot.images.hidpi : shot.images.normal;
                    var shot;

                    //Check if shot is favoutired
                    if (favouritedShots[shot.id]) {
                        shot.favourited = true;
                    }

                    //Interpolate template and append it to list
                    shot = $(shotTemplate.interpolate({
                        id: shot.id,
                        url: imageUrl,
                        title: shot.title,
                        player: shot.user.name,
                        favourited: shot.favourited ? 'favourited' : '',
                        buttonCaption: shot.favourited ? 'Unfavourite' : 'Favourite'
                    }))

                    shotsContainer.append(shot);

                    //Push shot to temporary aray for scrolling animation
                    hiddenShots.push({
                        offset: shot.offset().top + container.scrollTop,
                        shot: shot
                    })

                    //Display element after image has been loaded 
                    if (imageUrl) {

                        var img = new Image();
                        img.src = imageUrl;

                        if (img.complete) {

                            shot.addClass('loaded');

                        } else {

                            img.onload = function() {
                                shot.addClass('loaded');
                            };

                            img.onerror = function(error) {
                                console.error(error);
                            };
                        }
                    }

                })

                //Reset throttling flag
                isRendering = false;

                //Increase pagination index
                page++;

                //Check if next batch should be rendered
                renderBatch();

            })
        }
    };

    /*======================================
    =            Initialization            =
    ======================================*/

    var favouritedShots = JSON.parse(localStorage.favouritedShots || '{}');
    var shotsContainer = $('#shots');
    var isRendering = false;
    var hiddenShots = [];
    var page = 1;
    var scrollTimeout;
    var wheelTimeout;
    var shotTemplate;

    getShotTemplate().then(function(response) {

        //Set single shot template
        shotTemplate = response;

        //Load and render items
        renderBatch();
    })



    /*===============================================
    =            Favourite shots handler            =
    ===============================================*/
    shotsContainer.on('click', function(event) {

    		//Ignore event if no button was clicked
    		if (!$(event.target).is('button')) return;

        var shotElement = $(event.target).parents('.shot');
        var shotId = $(shotElement).attr('id');

        if (!favouritedShots[shotId]) {
            favouritedShots[shotId] = true;
            $(shotElement).find('button').text("Unfavourite");
        } else {
            delete favouritedShots[shotId];
            $(shotElement).find('button').text("Favourite");
        }

        //Set favourited class on shot element
        $(shotElement).toggleClass('favourited');

        //Update local storage with new values
        localStorage.favouritedShots = JSON.stringify(favouritedShots);

    })



    /*==============================================================
    =            Handlers for item loading on scrolling            =
    ==============================================================*/
    shotsContainer.scroll(function(event) {

        if (!!scrollTimeout) {
            clearTimeout(scrollTimeout);
        }

        scrollTimeout = setTimeout(function() {
            renderBatch();
        }, 200);
    });

    shotsContainer.bind('mousewheel', function(event) {

        if (!!scrollTimeout) {
            clearTimeout(scrollTimeout);
        }

        if (event.originalEvent.wheelDelta / 120 < 0) {

            if (!wheelTimeout) {

                renderBatch();

                wheelTimeout = setTimeout(function() {
                    clearTimeout(wheelTimeout);
                    wheelTimeout = false;
                }, 500);
            }
        }
    });


});


/*==========================================================================
=            Basic interpolation function - slow but convenient            =
==========================================================================*/
String.prototype.interpolate = function(o) {
    return this.replace(/{([^{}]*)}/g,
        function(a, b) {
            var r = o[b];
            return typeof r === 'string' || typeof r === 'number' ? r : a;
        }
    );
};
