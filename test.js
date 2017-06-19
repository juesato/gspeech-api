'use strict';
/* jshint node:true */

var gspeech = require('gspeech-api');

var GS = new gspeech({
	lang: 'it-ch'
});

GS.recognize(__dirname + '/clip.mp4', function (err, data)
{
    if (err)
        console.error(err);
    console.log('Final transcript is:\n' + data.transcript);
});