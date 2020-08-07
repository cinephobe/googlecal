$(() => {

    let matchedDebugLocale = String(window.location).match(/debug_locale=([\w@]+[\-\w]*);?/);
    if(matchedDebugLocale && matchedDebugLocale.length === 2){
        matchedDebugLocale = matchedDebugLocale[1];
    }else{
        matchedDebugLocale = null;
    }

    for(let locale in window.localeList){
        $(`<option value="${locale}" ${matchedDebugLocale === locale ? 'selected="selected"':''}>${locale}: ${window.localeList[locale].englishName} (${window.localeList[locale].nativeName})</option>`).appendTo($('#debug_locale'));
    }


    let matchedDebugTimeZone = String(window.location).match(/debug_timezone=([\w\/]+);?/);
    if(matchedDebugTimeZone && matchedDebugTimeZone.length === 2){
        matchedDebugTimeZone = matchedDebugTimeZone[1];
    }else{
        matchedDebugTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    }

    window.timezones.sort();
    let localDate = new Date();
    for(let i = 0, timezone; i < window.timezones.length; i++){
        timezone = window.timezones[i];

        let timezoneDateString = new Date().toLocaleDateString('de-DE', {timeZone : timezone, minute : '2-digit', hour : '2-digit', timeZoneName : 'short'}),
            m = timezoneDateString.match(/^(\d+)\.(\d+)\.(\d{4}), (\d\d)\:(\d\d) ([\w\+\-]+)/),
            offsetDate = new Date(`${m[3]}-${m[2]}-${m[1]} ${m[4]}:${m[5]}`),
            diffInHours = Math.round((+offsetDate - +localDate) / (1000 * 60 * 60));

        $(`<option value="${timezone}" ${matchedDebugTimeZone === timezone ? 'selected="selected"':''}>${timezone} (${m[6]}) (diff to local: ${diffInHours} hours)</option>`).appendTo($('#debug_tz'));
    }

    $('#generate-button').on('click', function (e) {
        let c = $('#calendar-id').val(),
            a = $('#api-key').val(),
            l = $('#debug_locale').val(),
            t = $('#debug_tz').val();

        window.location.hash = `#c=${c};a=${a};debug_locale=${l};debug_timezone=${t}`;

        window.location.reload();
    });

    let matches = window.location.hash.match(/c=([\d\w@\.]+);a=([\d\w@\.]+)/),
        calendarId = matches[1],
        apiKey = matches[2];

    $('#calendar-id').val(calendarId);
    $('#api-key').val(apiKey);


    let baseURL = `${window.location.protocol}//${window.location.host}/${window.location.pathname}`.replace(/index\.html/, '').replace(/\/\/$/, '/');

    $('#embed').val(
        $('#embed').val()
            .replace(/%host%/, baseURL)
            .replace(/%id%/, calendarId)
            .replace(/%key%/, apiKey)
    );

    if (calendarId && apiKey) {
        $('#embed-box, #preview-box').removeClass('d-none');
        $('#no-credentials').addClass('d-none');
        $('#target').html($('#embed').val());
    }

});