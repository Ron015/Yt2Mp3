const express = require('express');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const ffmpegPath = require('ffmpeg-static');

const app = express();

// Set ffmpeg path
ffmpeg.setFfmpegPath(ffmpegPath);

// Function to download audio from YouTube URL
async function downloadAudio(youtubeUrl, outputPath) {
  return new Promise((resolve, reject) => {
    const stream = ytdl(youtubeUrl, { filter: 'audioonly' });
    stream.pipe(fs.createWriteStream(outputPath));
    stream.on('end', resolve);
    stream.on('error', reject);
  });
}

// Function to convert audio to MP3
async function convertToMP3(inputPath, outputPath) {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .toFormat('mp3')
      .on('error', reject)
      .on('end', resolve)
      .save(outputPath);
  });
}

// API endpoint to convert YouTube audio to MP3 and show player
app.get('/:youtubeUrl/play.mp3', async (req, res) => {
  const youtubeUrl = `https://www.youtube.com/watch?v=${req.params.youtubeUrl}`;

  try {
    const uniqueId = Date.now(); // Generate a unique ID based on the current timestamp
    const tempAudioPath = path.join(__dirname, `temp_${uniqueId}.mp4`); // Temporarily store downloaded audio
    const outputMP3Path = path.join(__dirname, `public`, `output_${uniqueId}.mp3`); // Converted MP3 file path in public directory

    await downloadAudio(youtubeUrl, tempAudioPath);
    await convertToMP3(tempAudioPath, outputMP3Path);

    // Serve the HTML page with player
    res.send('/public/' + uniqueId + '.mp3')

    // Cleanup temp files after sending response
    setTimeout(() => {
      if (fs.existsSync(tempAudioPath)) {
        fs.unlinkSync(tempAudioPath);
      }
      if (fs.existsSync(outputMP3Path)) {
        fs.unlinkSync(outputMP3Path);
      }
    }, 60000); // Delete after 60 seconds to ensure file is served
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Internal Server Error');

    // Cleanup temp files if they exist
    if (fs.existsSync(tempAudioPath)) {
      fs.unlinkSync(tempAudioPath);
    }
    if (fs.existsSync(outputMP3Path)) {
      fs.unlinkSync(outputMP3Path);
    }
  }
});

// Serve MP3 files statically
app.use('/public', express.static(path.join(__dirname, 'public')));

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
