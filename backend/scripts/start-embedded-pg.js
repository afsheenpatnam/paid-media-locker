const EmbeddedPostgres = require("embedded-postgres").default;
const path = require("path");

const pg = new EmbeddedPostgres({
  databaseDir: path.join(__dirname, "..", ".pgdata"),
  user: "locker",
  password: "lockerpass",
  port: 5433,
  persistent: true,
});

(async () => {
  try {
    await pg.initialise();
    await pg.start();
    try {
      await pg.createDatabase("paid_media_locker");
    } catch (e) {
      // ignore if it already exists
    }
    console.log("PG_READY");
  } catch (e) {
    console.error("PG_FAIL", e);
    process.exit(1);
  }
})();
