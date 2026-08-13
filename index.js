const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");
const axios = require("axios");

const manifest = {
  id: "com.tal.ultimate.stream",
  version: "3.0.0",
  name: "Tal Ultimate Stream",
  description: "Hebrew-friendly Stremio addon",
  resources: ["catalog", "stream"],
  types: ["movie", "series"],
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

/* =========================
   חיפוש סרטים וסדרות
   ========================= */

builder.defineCatalogHandler(async ({ type, id, extra }) => {
  if (id !== "search" || !extra?.search) {
    return { metas: [] };
  }

  const apiKey = process.env.TMDB_API_KEY;

  if (!apiKey) {
    console.error("TMDB_API_KEY is missing");
    return { metas: [] };
  }

  try {
    const endpoint =
      type === "movie"
        ? "https://api.themoviedb.org/3/search/movie"
        : "https://api.themoviedb.org/3/search/tv";

    const response = await axios.get(endpoint, {
      params: {
        api_key: apiKey,
        query: extra.search,
        language: "he-IL",
        include_adult: false
      },
      timeout: 10000
    });

    const results = response.data.results || [];

    return {
      metas: results.slice(0, 20).map((item) => ({
        id: `tmdb:${item.id}`,
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
      }))
    };
  } catch (error) {
    console.error("TMDB ERROR:", error.message);
    return { metas: [] };
  }
});

/* =========================
   סטרימים
   ========================= */

builder.defineStreamHandler(async ({ type, id }) => {
  console.log("STREAM REQUEST:", type, id);

  const streams = [];

  /*
    כרגע אנחנו מחזירים סטרים לדוגמה בלבד,
    כדי לוודא ש-Stremio מקבל סטרים אמיתי.

    זה סרטון ציבורי לבדיקת הנגן.
  */

  if (type === "movie") {
    streams.push({
      name: "Tal Test",
      title: "Test 1080p",
      url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
    });
  }

  if (type === "series") {
    streams.push({
      name: "Tal Test",
      title: "Test Series Stream",
      url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
    });
  }

  return { streams };
});

serveHTTP(builder.getInterface(), {
  port: process.env.PORT || 7000
});

console.log("Tal Ultimate Stream is running");
