const { addonBuilder, serveHTTP } = require("stremio-addon-sdk");

const manifest = {
  id: "com.tal.stremio.hebrew",
  version: "1.0.0",
  name: "Hebrew Stream",
  description: "Stremio addon",
  resources: ["stream", "meta"],
  types: ["movie", "series"],
  catalogs: []
};

const builder = new addonBuilder(manifest);

/*
  TEST STREAMS

  אלה רק כתובות בדיקה.
  בהמשך נחליף אותן במקורות שהשרת שלך מורשה להשתמש בהם.
*/

builder.defineStreamHandler(async ({ type, id }) => {
  return {
    streams: [
      {
        name: "Test",
        title: "Test Stream",
        url: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
      }
    ]
  };
});

serveHTTP(builder.getInterface(), {
  port: process.env.PORT || 7000
});
