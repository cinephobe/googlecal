(() => {

    let env = 'debug';

    try {
        //attempt to access embedding document to
        let a = window.parent.hash;
    } catch (exception) {
        env = 'prod';
    }

    let matches = window.location.hash.match(/c=([\d\w@\.]+);a=([\d\w@\.]+)/),
        calendarId = matches && matches.length === 3 ? matches[1] : false,
        apiKey = matches && matches.length === 3 ? matches[2] : false,
        initialScroll = false,
        upperBoundDate = null,
        lowerBoundDate = null,
        ignoreScrolling = true,
        attachPosition = 'bottom',
        datesLoaded = {
            past: [],
            future: []
        },
        weeksToLoad = 6,
        cachedDebugLocale = false,
        cachedDebugTimezone = false,
        getDebugLocale = () => {
            if (env === 'prod') {
                return undefined;
            }

            if (false !== cachedDebugLocale) {
                return cachedDebugLocale;
            }

            let parentUrl = window.parent && window.parent.location ? window.parent.location : null,
                localeMatches;

            cachedDebugLocale = undefined;

            if (!parentUrl) {
                return cachedDebugLocale;
            }

            localeMatches = String(parentUrl).match(/debug_locale=([\w@]+[\-\w]*);?/);
            if (localeMatches && localeMatches.length === 2) {
                cachedDebugLocale = localeMatches[1];
            }

            return cachedDebugLocale;
        },
        injectDebugTimezone = options => {
            if (env === 'prod') {
                return options;
            }

            if (false !== cachedDebugTimezone && null === cachedDebugTimezone) {
                return options;
            }

            if (false !== cachedDebugTimezone && null !== cachedDebugTimezone) {
                options.timeZone = cachedDebugTimezone;
                return options;
            }

            let parentUrl = window.parent && window.parent.location ? window.parent.location : null,
                timezoneMatches;

            cachedDebugTimezone = null;

            if (!parentUrl) {
                return options;
            }

            timezoneMatches = String(parentUrl).match(/debug_timezone=([\w\/]+);?/);

            if (timezoneMatches && timezoneMatches.length === 2) {
                cachedDebugTimezone = timezoneMatches[1];
                options.timeZone = timezoneMatches[1];
            }

            return options;

        },
        getIso8601Date = (diffInDays, baseDate, time) => {
            baseDate = baseDate || new Date();
            let date = (new Date(+baseDate + (diffInDays * 24 * 60 * 60 * 1000))).toISOString();
            if (time) {
                date = date.replace(/\d+\:\d+\:\d+\.\d+/, time);
            }
            return date;
        },
        getLastMondayIsoDate = baseDate => {
            baseDate = baseDate || new Date();
            return getIso8601Date(baseDate.getDay() * -1 + -6, baseDate, '00:00:00.000')
        },
        getNextSundayIsoDate = baseDate => {
            baseDate = baseDate || new Date();
            return getIso8601Date((7 - baseDate.getDay()) + 7, baseDate, '23:59:59.999')
        },
        getDateAccordionLabel = date => {
            date = new Date(date);
            return date.toLocaleDateString(getDebugLocale(), injectDebugTimezone({
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            }))
        },
        getTimeLabel = date => {
            date = new Date(date);
            return date.toLocaleTimeString(getDebugLocale(), injectDebugTimezone({hour: '2-digit', minute: '2-digit'}));
        },
        getDayIdStringFromDate = date => {
            if (String(date) === date) {
                date = new Date(date);
            }

            //force offset on date for debug purposes
            let timeZoneObject = injectDebugTimezone({});
            if (timeZoneObject.timeZone) {
                let timezoneDateString = new Date().toLocaleDateString('de-DE', {
                        timeZone: timeZoneObject.timeZone,
                        minute: '2-digit',
                        hour: '2-digit',
                        timeZoneName: 'short'
                    }),
                    m = timezoneDateString.match(/^(\d+)\.(\d+)\.(\d{4}), (\d\d)\:(\d\d) ([\w\+\-]+)/),
                    offsetDate = new Date(`${m[3]}-${m[2]}-${m[1]} ${m[4]}:${m[5]}`),
                    diffInHours = Math.round((+offsetDate - +(new Date())) / (1000 * 60 * 60));

                date = new Date(+(date) + diffInHours * 1000 * 60 * 60);
            }

            return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
        },
        getFromToString = (start, end) => {
            start = new Date(start);
            end = new Date(end);

            let startString = start.toLocaleDateString(getDebugLocale(), injectDebugTimezone({
                weekday: 'short',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            }));
            let endString = end.toLocaleTimeString(getDebugLocale(), injectDebugTimezone({
                hour: '2-digit',
                minute: '2-digit'
            }));

            if (start.getDate() !== end.getDate()) {
                endString = end.toLocaleDateString(getDebugLocale(), injectDebugTimezone({
                    weekday: 'short',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                }));
            }

            return startString + ' - ' + endString;

        },
        loadDetails = event => {
            let eventId = $(event.target).data('eventid'),
                hasContent = $(event.target).data('isloaded');
            if (!hasContent) {
                $.ajax({
                    url: getEventDetailUrl(apiKey, calendarId, eventId),
                    dataType: 'jsonp'
                })
            }

        },
        markCurrentEventActive = () => {
            let items = $('[data-startsat]'),
                i = 0, item,
                classToUse = 'text-primary';

            items.removeClass(classToUse);
            for (i = items.length - 1; i >= 0; i--) {
                let item = $(items[i]),
                    itemDate = new Date(item.data('startsat')),
                    itemEndDate = new Date(item.data('endsat')),
                    now = new Date();
                if (now >= itemDate && now <= itemEndDate) {
                    item.addClass(classToUse);
                    break;
                }
            }
        },
        handleScroll = e => {
            let st = $(window).scrollTop(),
                sh = $('body').prop('scrollHeight'),
                h = $(window).height(),
                sb = sh - h;

            if (ignoreScrolling) {
                return;
            }

            if (st === 0) {

                if (datesLoaded.past.indexOf(lowerBoundDate) > -1) {
                    return;
                }

                ignoreScrolling = true;
                datesLoaded.past.push(lowerBoundDate);

                attachPosition = 'top';
                let min = lowerBoundDate,
                    max = new Date(lowerBoundDate),
                    i;

                max = (new Date(+new Date(max) - 1000)).toISOString();

                for (i = 0; i < weeksToLoad; i++) {
                    min = getLastMondayIsoDate(new Date(min));
                }

                $.ajax({
                    url: getEventsUrl(apiKey, calendarId, min, max),
                    dataType: 'jsonp'
                });

            } else if (sh - h === st) {

                if (datesLoaded.future.indexOf(upperBoundDate) > -1) {
                    return;
                }

                ignoreScrolling = true;
                datesLoaded.future.push(upperBoundDate);

                attachPosition = 'bottom';

                let min = upperBoundDate,
                    max = new Date(upperBoundDate),
                    i;

                min = (new Date(+new Date(min) + 1000)).toISOString();

                for (i = 0; i < weeksToLoad; i++) {
                    max = getNextSundayIsoDate(new Date(max));
                }

                $.ajax({
                    url: getEventsUrl(apiKey, calendarId, min, max),
                    dataType: 'jsonp'
                });

            }
        },
        getEventsUrl = (key, id, min, max) => `https://www.googleapis.com/calendar/v3/calendars/${id}/events?key=${key}&callback=window.processCalendarEventList&timeMin=${min}&timeMax=${max}&orderBy=startTime&singleEvents=true`,
        getEventDetailUrl = (key /* docs say optional */, calendarId, eventId) => `https://www.googleapis.com/calendar/v3/calendars/${calendarId}/events/${eventId}?key=${key}&callback=window.processCalendarEventDetail`;


    if (!calendarId || !apiKey) {
        return alert('API Key / Calendar ID missing :(');
    }


    window.processCalendarEventDetail = item => {
        let target = $(`#card-body-${item.id}`).empty();

        $(`<div class="container mx-0">\
                <div class="row mt-2">\
                    <div class="col-12 col-sm-2 col-lg-1 d-none d-sm-block">\
                        <strong class="text-info">When</strong>\
                    </div>
                    <div class="col-12 col-sm-10 col-lg-11">\
                        ${getFromToString(item.start.dateTime, item.end.dateTime)}\
                    </div>\
                </div>\
                <div class="row my-2 ${item.description ? '' : 'd-none'}">\
                    <div class="col-12 col-sm-2 col-lg-1">\
                        
                    </div>
                    <div class="col-12 col-sm-10 col-lg-11">\
                        ${item.description.replace(/href=/,'target="_blank" href=')}\
                    </div>\
                </div>\
                <div class="row my-2">\
                    <div class="col-12 col-sm-2 col-lg-1">\
                    </div>\
                    <div class="col-12 col-sm-10 col-lg-11">\
                        <a class="mr-md-3" target="_blank" href="${item.htmlLink}">read more</a>\
                        <a class="mr-md-3" target="_blank" href="${item.htmlLink.replace(/.*eid=/, 'https://calendar.google.com/calendar/b/1/r/eventedit/copy/')}">copy to my calendar</a>\
                    </div>\
                </div>\
            </div>`).appendTo(target);
    };

    window.processCalendarEventList = data => {
        for (let i in data.items) {
            let item = data.items[i],
                dayString = getDayIdStringFromDate(item.start.dateTime),
                targetAccordionId = 'cinephobe-calendar-day-' + dayString,
                dayAccordion = $('#' + targetAccordionId);

            if (dayAccordion.length === 0) {
                let elem = $(`<div data-class="accordion" class="is-new" id="${targetAccordionId}">\
                            <div class="card border-top-0">\
                                <div class="card-header border-bottom-0" id="heading-day-${dayString}">\
                                    <h6 class="mb-0 py-2 pl-3">\
                                        ${getDateAccordionLabel(item.start.dateTime)}\
                                    </h6>\
                                </div>\
                            </div>\
                        </div>`);

                if (attachPosition === 'bottom') {
                    elem.appendTo('#calendar-box');
                } else {
                    if ($('.is-new').length > 0) {
                        elem.insertAfter($('.is-new').last());
                    } else {
                        elem.prependTo('#calendar-box');
                    }
                }

                dayAccordion = $('#' + targetAccordionId);
                dayAccordion.on('shown.bs.collapse', loadDetails)
            }

            $(`<div class="card border-top-0">\
                    <div class="card-header bg-white border-bottom-0" id="heading-${item.id}" data-startsat="${item.start.dateTime}" data-endsat="${item.end.dateTime}">\
                        <div class="mb-0 container py-2 mx-0">\
                            <div class="row event-toggle-bar" data-toggle="collapse" data-target="#collapse-${item.id}" aria-expanded="false" aria-controls="collapse-${item.id}">\
                                <div class="col-3 col-sm-2 col-lg-1 text-truncate">${getTimeLabel(item.start.dateTime)}</div>\
                                <div class="col-9 col-sm-10 col-lg-11 text-truncate">${item.summary}</div>\
                            </div>\
                        </div>\
                    </div>\
                    <div id="collapse-${item.id}" class="collapse" aria-labelledby="heading-${item.id}" data-disabled-parent="#${targetAccordionId}" data-eventid="${item.id}" data-isloaded="false">\
                        <div class="card-body" id="card-body-${item.id}">\
                            <div class="container mx-0">\
                                <div class="row">\
                                    <div class="col-12 py-4">\
                                        <div class="d-flex align-items-center">\
                                            <strong>Loading...</strong>\
                                            <div class="spinner-border ml-auto" role="status" aria-hidden="true"></div>\
                                        </div>\
                                    </div>\
                                </div>\
                            </div>\
                        </div>\
                    </div>\
                </div>`).appendTo(dayAccordion);
        }

        if (!initialScroll) {
            initialScroll = true;
            let currentDay = $('#heading-day-' + getDayIdStringFromDate(new Date()));
            if (currentDay.length > 0) {
                currentDay.get()[0].scrollIntoView();
            }

            //if scroll is at bottom, offset 20px if this happens to enable scrolling
            if ($('body').prop('scrollHeight') - $(window).height() === $(window).scrollTop()) {
                $(window.scrollBy({top: -20}))
            }

            markCurrentEventActive();
            setInterval(markCurrentEventActive, 5 * 60 * 1000);
            lowerBoundDate = getLastMondayIsoDate();
            upperBoundDate = getNextSundayIsoDate();
            setTimeout(() => {
                $(document).on('scroll', handleScroll);
            }, 255);
        } else {

            //set dates from response here!
            if (attachPosition === 'top') {
                if (data.items.length > 0) {
                    lowerBoundDate = data.items[0].start.dateTime;
                } else {
                    $('<div class="alert alert-info text-center my-2 py-2">no earlier events found</div>').prependTo('#calendar-box');
                }
                window.scrollTo({top: 20, left: 0});
            } else {
                if (data.items.length > 0) {
                    upperBoundDate = data.items[data.items.length - 1].end.dateTime;
                } else {
                    $('<div class="alert alert-info text-center my-2 py-2">no later events found</div>').appendTo('#calendar-box');
                }

                if ($('body').prop('scrollHeight') - $(window).height() === $(window).scrollTop()) {
                    $(window.scrollBy({top: -20}))
                } else {
                    $(window.scrollBy({top: 20}))
                }
            }
        }
        ignoreScrolling = false;
        $('.is-new').removeClass('is-new');
    }


    $.ajax({
        url: getEventsUrl(apiKey, calendarId, getLastMondayIsoDate(), getNextSundayIsoDate()),
        dataType: 'jsonp'
    });


})();
