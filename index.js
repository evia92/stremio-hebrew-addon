const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const axios = require("axios");

const PORT = process.env.PORT || 7000;

const manifest = {
  id: "com.tal.ultimate.stream",
  version: "1.0.0",
  name: "Tal Ultimate Stream",
  description:
    "Hebrew-friendly Stremio addon with direct HTTP/HLS sources, search and proxy support.",
  resources: [
    "catalog",
    "meta",
    "stream"
  ],
  types: [
    "movie",
    "series"
  ],
  catalogs: [
    {
      type: "movie",
      id: "search",
      name: "חיפוש סרטים",
      extra: [
        {
          name: "search",
          isRequired: true
        }
      ]
    },
    {
      type: "series",
      id: "search",
      name: "חיפוש סדרות",
      extra: [
        {
          name: "search",
          isRequired: true
        }
      ]
    }
  ]
};

const builder = new addonBuilder(manifest);

/*
|--------------------------------------------------------------------------
| Hebrew / foreign-language search
|--------------------------------------------------------------------------
|
| We use TMDB for metadata/search.
| Put your TMDB API key in Render later.
|
*/

builder.defineCatalogHandler(async ({ type, id, extra }) => {
  if (id !== "search" || !extra || !extra.search) {
    return { metas: [] };
  }

  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) {
    return { metas: [] };
  }

  const language = "he-IL";
  const query = extra.search.trim();

  try {
    const url =
      type === "movie"
        ? "https://api.themoviedb.org/3/search/movie"
        : "https://api.themoviedb.org/3/search/tv";

    const response = await axios.get(url, {
      params: {
        api_key: apiKey,
        query,
        language,
        include_adult: false
      },
      timeout: 10000
    });

    const results = response.data.results || [];

    const metas = results.slice(0, 20).map((item) => {
      const imdbId =
        item.imdb_id ||
        null;

      return {
        id: `${type === "movie" ? "tmdb" : "tmdb"}:${item.id}`,
        type,
        name: item.title || item.name,
        poster: item.poster_path
          ? `https://image.tmdb.org/t/p/w500${item.poster_path}`
          : undefined,
        background: item.backdrop_path
          ? `https://image.tmdb.org/t/p/w1280${item.backdrop_path}`
          : undefined,
        description: item.overview || "",
        releaseInfo:
          item.release_date ||
          item.first_air_date ||
          "",
        imdb_id: imdbId
      };
    });

    return { metas };
  } catch (error) {
    console.error("TMDB search error:", error.message);
    return { metas: [] };
  }
});

/*
|--------------------------------------------------------------------------
| Stream handler
|--------------------------------------------------------------------------
|
| IMPORTANT:
| A Stremio stream must point to the actual media URL,
| not to an HTML "embed" page.
|
| We support:
| 1. Direct MP4
| 2. Direct M3U8
| 3. MediaFlow proxy
|
| Sources are read from environment variables so you don't have
| to rewrite the addon every time.
|
*/

builder.defineStreamHandler(async ({ type, id }) => {
  const streams = [];

  /*
  Example:
  MOVIE_SOURCE_123 = https://example.com/movie.m3u8
  SERIES_SOURCE_456_1_2 = https://example.com/episode.m3u8
  */

  if (type === "movie") {
    const tmdbId = id.replace("tmdb:", "");

    const directSource =
      process.env[`MOVIE_SOURCE_${tmdbId}`];

    if (directSource) {
      streams.push({
        name: "Tal Ultimate",
        title: "Direct Stream",
        url: directSource
      });
    }
  }

  if (type === "series") {
    const parts = id.split(":");
    const tmdbId = parts[1];
    const season = parts[2];
    const episode = parts[3];

    const key =
      `SERIES_SOURCE_${tmdbId}_${season}_${episode}`;

    const directSource =
      process.env[key];

    if (directSource) {
      streams.push({
        name: "Tal Ultimate",
        title: `S${season}E${episode} • Direct Stream`,
        url: directSource
      });
    }
  }

  /*
  Optional MediaFlow proxy.
  If MEDIAFLOW_URL is configured, direct links can be routed through it.
  */

  if (
    process.env.MEDIAFLOW_URL &&
    process.env.MEDIAFLOW_PASSWORD
  ) {
    for (const stream of streams) {
      const encoded = encodeURIComponent(stream.url);

      stream.url =
        `${process.env.MEDIAFLOW_URL}/proxy/hls/manifest.m3u8` +
        `?d=${encoded}` +
        `&api_password=${encodeURIComponent(
          process.env.MEDIAFLOW_PASSWORD
        )}`;
    }
  }

  return { streams };
});

serveHTTP(builder.getInterface(), {
  port: PORT
});

console.log(`Tal Ultimate Stream running on port ${PORT}`);
