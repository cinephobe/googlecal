$(() => {

    $('#generate-button').on('click', function (e) {
        let c = $('#calendar-id').val(),
            a = $('#api-key').val();

        window.location.hash = `#c=${c};a=${a}`;
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