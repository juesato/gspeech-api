/**
 * Basic Usage Example for GSpeech API
 *
 * This example demonstrates how to use the gspeech-api library
 * to transcribe audio files to text.
 */

var gspeech = require('../index.js');

// Example 1: Simple transcription of a short audio file (under 60 seconds)
console.log('Example 1: Basic transcription');
console.log('================================\n');

gspeech.recognize('path/to/your/audio/file.mp3', function(err, data) {
    if (err) {
        console.error('Error:', err);
        return;
    }

    console.log('Transcription complete!');
    console.log('\nFull transcript:');
    console.log(data.transcript);
    console.log('\n');
});

// Example 2: Transcription with timed segments
console.log('\nExample 2: Timed transcript');
console.log('================================\n');

gspeech.recognize('path/to/your/audio/file.mp3', function(err, data) {
    if (err) {
        console.error('Error:', err);
        return;
    }

    console.log('Timed transcript:');
    for (var i = 0; i < data.timedTranscript.length; i++) {
        var segment = data.timedTranscript[i];
        console.log('[' + segment.start + 's] ' + segment.text);
    }
    console.log('\n');
});

// Example 3: Custom segmentation for longer files
console.log('\nExample 3: Custom segmentation');
console.log('================================\n');

var customSegments = [0, 15, 30, 45, 60];  // Start times in seconds

gspeech.recognize({
    file: 'path/to/your/long/audio/file.mp3',
    segments: customSegments,
    maxDuration: 15,  // Maximum duration for each segment
    maxRetries: 3,    // Retry failed segments up to 3 times
    limitConcurrent: 10  // Process 10 segments concurrently
}, function(err, data) {
    if (err) {
        console.error('Error:', err);
        return;
    }

    console.log('Segmented transcription complete!');
    console.log('\nSegment breakdown:');
    data.timedTranscript.forEach(function(segment, index) {
        console.log('Segment ' + (index + 1) + ' (' + segment.start + 's):');
        console.log('  ' + segment.text);
        console.log('');
    });

    console.log('\nFull transcript:');
    console.log(data.transcript);
});

// Example 4: Error handling
console.log('\nExample 4: Proper error handling');
console.log('================================\n');

gspeech.recognize('nonexistent-file.mp3', function(err, data) {
    if (err) {
        console.error('Expected error occurred:');
        console.error('  Error type:', err.message);
        console.error('  This is normal for a nonexistent file.');
        return;
    }

    // This won't be reached in this example
    console.log('Transcript:', data.transcript);
});
