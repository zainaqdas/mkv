import express from 'express';
import fetch from 'node-fetch';
import fs from 'fs';
import { exec } from 'child_process';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;
const VIDEO_DIR = path.join(process.cwd(), 'videos');

if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR);

app.use(express.json());
app.use(express.static('public'));
app.use('/videos', express.static(VIDEO_DIR));

app.post('/convert', async (req, res) => {
  const { url, filename } = req.body;
  if (!url || !filename) return res.status(400).json({ error: 'URL and filename required' });

  const mkvPath = path.join(VIDEO_DIR, `${filename}.mkv`);
  const hlsPath = path.join(VIDEO_DIR, filename);

  if (!fs.existsSync(mkvPath)) {
    const response = await fetch(url);
    const fileStream = fs.createWriteStream(mkvPath);
    await new Promise((resolve, reject) => {
      response.body.pipe(fileStream);
      response.body.on("error", reject);
      fileStream.on("finish", resolve);
    });
  }

  if (!fs.existsSync(hlsPath)) fs.mkdirSync(hlsPath, { recursive: true });

  const ffmpegCmd = `ffmpeg -y -i "${mkvPath}" -c:v libx264 -c:a aac -hls_time 10 -hls_playlist_type vod "${hlsPath}/index.m3u8"`;

  exec(ffmpegCmd, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ hls: `/videos/${filename}/index.m3u8` });
  });
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
