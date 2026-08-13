const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const axios = require("axios");

const manifest = {
  id: "com.tal.hebrew.stream",
  version: "4.0.0",
  name: "Tal Hebrew Stream",
  description: "Hebrew movie and series search",
  resources: ["catalog", "stream"],
  types: ["movie", "series"],

  catalogs: [
    {
      type: "movie",
      id: "hebrew-movies",
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
      id: "hebrew-series",
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

async function tmdbSearch(type, query) {
  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) {
    throw new Error("TMDB_API_KEY is missing");
  }

  const endpoint =
    type === "movie"
      ? "https://api.themoviedb.org/3/search/movie"
      : "https://api.themoviedb.org/3/search/tv";

  const response = await axios.get(endpoint, {
    params: {
      api_key: apiKey,
      query,
      language: "he-IL",
      include_adult: false
    },
    timeout: 15000
  });

  return response.data.results || [];
}

async function getImdbId(type, tmdbId) {
  const endpoint =
    type === "movie"
      ? `https://api.themoviedb.org/3/movie/${tmdbId}/external_ids`
      : `https://api.themoviedb.org/3/tv/${tmdbId}/external_ids`;

  const response = await axios.get(endpoint, {
    params: {
      api_key: process.env.TMDB_API_KEY
    },
    timeout: 10000
  });

  return response.data.imdb_id || null;
}

builder.defineCatalogHandler(async ({ type, id, extra }) => {
  if (!extra || !extra.search) {
    return { metas: [] };
  }

  const correctCatalog =
    (type === "movie" && id === "hebrew-movies") ||
    (type === "series" && id === "hebrew-series");

  if (!correctCatalog) {
    return { metas: [] };
  }

  try {
    let results = await tmdbSearch(type, extra.search);

    // אם אין תוצאות בעברית, ננסה גם באנגלית
    if (results.length === 0) {
      const apiKey = process.env.TMDB_API_KEY;

      const endpoint =
        type === "movie"
          ? "https://api.themoviedb.org/3/search/movie"
          : "https://api.themoviedb.org/3/search/tv";

      const response = await axios.get(endpoint, {
        params: {
          api_key: apiKey,
          query: extra.search,
          language: "en-US",
          include_adult: false
        },
        timeout: 15000
      });

      results = response.data.results || [];
    }

    const metas = [];

    for (const item of results.slice(0, 15)) {
      try {
        const imdbId = await getImdbId(type, item.id);

        if (!imdbId) {
          continue;
        }

        metas.push({
          id: imdbId,
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
            ""
        });
      } catch (err) {
        console.log(
          "Could not get IMDb ID for",
          item.id,
          err.message
        );
      }
    }

    console.log(
      `Search "${extra.search}" returned ${metas.length} results`
    );

    return { metas };

  } catch (error) {
    console.error("TMDB SEARCH ERROR:", error.message);
    return { metas: [] };
  }
});

builder.defineStreamHandler(async ({ type, id }) => {
  console.log("STREAM REQUEST:", type, id);

  return {
    streams: [
      {
        name: "Tal Test",
        title: "Test Stream",
        url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      }
    ]
  };
});

serveHTTP(builder.getInterface(), {
  port: process.env.PORT || 7000
});

console.log("Tal Hebrew Stream is running");
