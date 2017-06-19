(function(){
'use strict';
/* jshint node:true */
var request = require('request');
var extend = require('extend');
var fs = require('fs');
var temp = require('temp').track();
var ffmpeg = require('fluent-ffmpeg');
var async = require('async');


var gspeech = function (options)
{
    var defaults = {
        MAX_CONCURRENT: 20,
        MAX_SEG_DUR: 15,
        POST_SAMPLE_RATE: 44100,
        lang: 'en-us',
        key: 'AIzaSyBOti4mM-6x9WDnZIjIeyEU21OpBXqWBgw'
    };

    this.options = extend(defaults, options);

    if (this.options.key === '')
    {
        throw ('Provide an API Key to continue.');
    }
};

function urlEncode(obj)
{
    var str = [];
    for (var p in obj)
        if (obj.hasOwnProperty(p))
        {
            str.push(encodeURIComponent(p) + '=' + encodeURIComponent(obj[p]));
        }
    return str.join('&');
}

function genPair()
{
    return parseInt(Math.random() * Math.pow(2, 32)).toString(16);
}

function getRequestOptions(options)
{
    var pair = genPair();

    var upstreamUrl = 'https://www.google.com/speech-api/full-duplex/v1/up?';
    var upstreamParams = urlEncode(
    {
        'output': 'json',
        'lang': options.lang,
        'pfilter': 2,
        'key': options.key,
        'client': 'chromium',
        'maxAlternatives': 1,
        'pair': pair
    });
    var otherOpts = ['continuous', 'interim'];
    var upstreamOpts = {
        'url': upstreamUrl + upstreamParams + '&' + otherOpts.join('&'),
        'headers':
        {
            'content-type': 'audio/x-flac; rate=' + options.POST_SAMPLE_RATE
        },
    };
    var downstreamUrl = 'https://www.google.com/speech-api/full-duplex/v1/down';
    var downstreamParams = urlEncode(
    {
        'pair': pair
    });
    var downstreamOpts = {
        'url': downstreamUrl + '?' + downstreamParams,
    };
    return [upstreamOpts, downstreamOpts];
}

function fullText(timedTranscript)
{
    var full = '';
    if(timedTranscript === undefined)
    {
        return full;
    }

    for (var i = 0; i < timedTranscript.length; i++)
    {
        if(timedTranscript[i] !== undefined)
         full += timedTranscript[i].text + ' ';
    }
    return full;
}

gspeech.prototype.recognize = function (options, callback)
{
    var gs = this;

    function getTranscriptFromServer(params, onfinish)
    {
        /* 
         * Called by processAudioSegment
         * Takes a file specified in params, sends it to Google speech recognition server
         * and runs callback on the returned transcript data
         */

        if (!params.file)
        {
            onfinish(new Error('No file is specified. Please specify a file path through params.file'));
        }
        var file_name = params.file;
        var source = fs.createReadStream(file_name);
        source.on('error', function (err)
        {
            onfinish(err);
        });
        var opts = getRequestOptions(gs.options);
        var upstreamOpts = opts[0];
        var downstreamOpts = opts[1];
        var postReq = request.post(upstreamOpts, function (err)
        {
            if (err)
            {
                onfinish(err);
            }
        });


        source.pipe(postReq);

        request.get(downstreamOpts, function (error, res, body)
        {
            if (error)
            {
                onfinish(error);
            }
            try
            {
                var results = body.split('\n');
                var last_result = JSON.parse(results[results.length - 2]); // last result is always an empty Array. Second to last is final transcript.
                var text = last_result.result[0].alternative[0].transcript;
                onfinish(null,
                {
                    'text': text,
                    'start': params.start,
                    'duration': params.duration
                });
            }
            catch (e)
            {
                // If there is an error, the server posts HTML instead of JSON, which can't be parsed
                params.retries = params.retries | 0;
                if (params.retries < maxRetries)
                {
                    params.retries++;
                    getTranscriptFromServer(params, onfinish);
                }
                else
                {
                    onfinish(new Error('Could not get valid response from Google servers ' + 'for segment starting at second ' + params.start));
                }
            }
        });

    }

    function processAudioSegment(data, onfinish)
    {
        /* 
         * Processes a segment of audio from file by using ffmpeg to convert
         * a segment of specified start time and duration, save it as a temporary .flac file
         * and send it to getTranscriptFromServer
         */

        var start = data.start;
        var dur = data.duration;
        var tmpFile = temp.path(
        {
            suffix: '.flac'
        });

        // Convert segment of audio file into .flac file
        ffmpeg()
            .on('error', function (err)
            {
                onfinish(err);
            })
            .on('end', function ()
            {
                // After conversion has finished, get the transcript
                getTranscriptFromServer(
                {
                    'file': tmpFile,
                    'start': start,
                    'duration': dur
                }, onfinish);
            })
            .input(file)
            .setStartTime(start)
            .duration(dur)
            .output(tmpFile)
            .audioFrequency(gs.options.POST_SAMPLE_RATE)
            .toFormat('flac')
            .run();
    }

    var file = options.file || options;
    var segments = options.segments;

    var maxDuration = options.maxDuration | gs.options.MAX_SEG_DUR;
    var maxRetries = options.maxRetries | 1;
    var limitConcurrent = options.limitConcurrent | gs.options.MAX_CONCURRENT;

    var i;

    // Get file information and divide into segments
    // Then process each of these segments individually, and combine results at the end
    ffmpeg.ffprobe(file, function (err, info)
    {
        var audioSegments = [];
        var totalDuration = info.format.duration;
        if (segments)
        {
            for (i = 0; i < segments.length; i++)
            {
                var duration = (i == segments.length - 1) ? totalDuration - segments[i] : segments[i + 1] - segments[i];
                if (duration < 0)
                {
                    callback(new Error('segments must be a sorted array of start times, each less than the total length of your audio'));
                }
                var curStart = segments[i];
                while (duration > maxDuration + 0.001)
                {
                    audioSegments.push(
                    {
                        'start': curStart,
                        'duration': maxDuration
                    });
                    duration -= maxDuration;
                    curStart += maxDuration;
                }
                audioSegments.push(
                {
                    'start': curStart,
                    'duration': duration
                });
            }
        }
        else
        {
            var numSegments = Math.ceil(totalDuration / maxDuration);
            for (i = 0; i < numSegments; i++)
            {
                audioSegments.push(
                {
                    'start': maxDuration * i,
                    'duration': maxDuration
                });
            }
        }

        async.mapLimit(audioSegments, limitConcurrent, processAudioSegment, function (err, results)
        {
            // After all transcripts have been returned, process them
            if (err)
                callback(err);
            var timedTranscript = results.sort(function (a, b)
            {
                if (a.start < b.start) return -1;
                if (a.start > b.start) return 1;
                return 0;
            });

            callback(null,
            {
                'timedTranscript': timedTranscript,
                'transcript': fullText(timedTranscript)
            });
        });
    });
};

module.exports = gspeech;
})();
