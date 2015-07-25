# GSpeech API

A node.js wrapper library around the [Google Speech API](https://www.google.com/intl/en/chrome/demos/speech.html) for automatic speech recognition.

## Easy-to-use high-quality speech recognition

 * Unlimited requests to Google automatic speech recognition servers
 * Access to timed transcripts

## Basic Usage

For clips under 60 seconds, usage is simple:

```javascript
var gspeech = require('gspeech-api');
gspeech.recognize('path/to/my/file', function(err, data) {
    if (err) 
        console.error(err);
    console.log("Final transcript is:\n" + data.transcript);
});
```

Google servers ignore clips over 60 seconds, so for clips longer than that, you have to specify how you want your audio files split into pieces. To use default package settings, the same code from above for clips under 60 seconds works.

The speed varies, but in general, one hour of audio will take a couple minutes to process.

## Installation

Gpseech-api relies on [fluent-ffmpeg](https://www.npmjs.com/package/fluent-ffmpeg) to deal with different audio formats, which has a dependency on ffmpeg. 

Unfortunately, ffmpeg is a little bit tricky to install on Ubuntu 12.04 and 14.04. I followed the instructions to install from source from the ffmpeg [Installation page](https://trac.ffmpeg.org/wiki/CompilationGuide/Ubuntu).

All other dependencies should be automatically handled by npm.

`npm install gspeech-api`

## Documentation

This package exposes one main method, `gspeech.recognize(options, callback)` for taking a file and returning an array of timed captions along with a final transcript.

### Arguments

##### Options 

If `options` is passed as a `String`, it is taken as the path for `file`. Otherwise, it should be an Object, which can have the following attributes:

 * `file` - path to the audio file to be transcribed.  
 * `segments` (optional) - `[start]` Specifies how to divide the audio file into segments before transcription. `start` is a `float` specifying a track time in seconds. If this argument is not specified, the audio is split into 60 second segments (the maximum length allowed by Google's servers). If a segment is longer than 60 seconds, it is split into 60 second segments.
 * `maxDuration` (optional) - any segments longer than `maxDuration` will be split into segments of `maxDuration` seconds. Defaults to 15 seconds.
 * `maxRetries` (optional) - sometimes Google servers do not respond correctly. If a segment is not processed correctly, it will be sent again `maxRetries` more times. Defaults to 1.
 * `limitConcurrent` (optional) - Google's servers communicate through separate GET and POST requests - sending too many requests at once may cause the two requests to not line up, resulting in errors. This defaults to 20.

#### Callback

Callback is a function which will be called after all requests to Google speech servers have completed. It is passed two parameters `callback(err, data)`:
 * `err` - contains an error message, if error occurs
 * `data` - contains an Object with the following fields, if all requests are successful:
   * `transcript` - `String`: text of complete transcript
   * `timedTranscript` - `[{'start': float, 'text': String}]`: unprocessed text of each segment transcribed separately by Google speech servers. If `options.segments` is specified, each object corresponds to a segment; otherwise, each object designates how the audio file was split before being transcribed. 

### More Examples


#### Getting a timed transcript

```javascript
gspeech.recognize('path/to/my/file', function(err, data) {
    if (err) 
        console.error(err);
    for (var i = 0; i < data.timedTranscript.length; i++) {
        // Print the transcript
        console.log(data.timedTranscript[i].start + ': ' 
                  + data.timedTranscript[i].text + '\n');
    }
});
```

#### Specifying times to split audio

If you would like to generate a timed transcript, and know where fragments start, specify these times to the library.

```javascript
var segTimes = [0, 15, 20, 30];
gspeech.recognize({
        'file': 'path/to/my/file',
        'segments': segTimes,
    }, 
    function(err, data) {
        if (err) 
            console.error(err);
        for (var i = 0; i < data.timedTranscript.length; i++) {
            console.log(data.timedTranscript[i].start + ': ' 
            + data.timedTranscript[i].text + '\n');
        }
    }
);
```

## Contributing

Contributions are always welcome. Feel free to file an issue, we can discuss any proposed changes, and then after the fix is implemented, submit a pull request.

I'm also planning to add in the following features in the future:

 * Intelligently dividing audio clips based on pauses in audio.
 * Automatically adding punctuation to transcripts

## Disclaimer

This is not an officially supported Google API, and should only be used for personal purposes. The API is subject to change, and should not be relied upon by any crucial services.
