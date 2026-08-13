const { addonBuilder, serveHTTP } = require('stremio-addon-sdk');

const manifest = {
  id: 'com.direct.embed.addon',
  version: '1.0.0',
  name: 'Direct Web Streamer',
  description: 'Streams directly from web sources without torrents or seeders',
  types: ['movie', 'series'],
  catalogs: [],
  resources: ['stream']
};

const builder = new addonBuilder(manifest);

builder.defineStreamHandler(async ({ type, id }) => {
  const parts = id.split(':');
  const imdbId = parts[0];
  let streams = [];

  if (type === 'movie') {
    streams.push({
      name: 'Direct Web',
      title: '1080p | Direct Stream (No Torrents)',
      url: `https://vidsrc.xyz/embed/movie?imdb=${imdbId}`
    });
  } else if (type === 'series') {
    const season = parts[1] || 1;
    const episode = parts[2] || 1;
    streams.push({
      name: 'Direct Web',
      title: `S${season}E${episode} | Direct Stream (No Torrents)`,
      url: `https://vidsrc.xyz/embed/tv?imdb=${imdbId}&season=${season}&episode=${episode}`
    });
  }

  return { streams };
});

serveHTTP(builder.getInterface(), { port: process.env.PORT || 7000 });
