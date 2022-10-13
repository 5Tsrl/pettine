const postgres = require('postgres')
require('dotenv').config()
// DB
// const sql = postgres('postgres://postgres:admin5t@storm:5434/pettine', {
const sql = postgres('postgres://username:password@host:port/database', {
  host        : process.env.PG_DB_HOST,
  port        : process.env.PG_DB_PORT,
  username    : process.env.PG_DB_USER,
  password    : process.env.PG_DB_PASSWORD,
  database    : 'gtfs',
  // debug       : console.log,
})

const main = async () => {


  const nodi = await sql`
    select * from aaaa_pettine.nodi limit 10;

  `
  console.log(nodi)
  await sql.end({ timeout: 1 })
}


main()