const soapRequest = require('easy-soap-request')
const parser = require('fast-xml-parser')
const postgres = require('postgres')
require('dotenv').config()

const codiciIstatRegioni = [
  '01', // PIEMONTE                15127 nodi
  '02', // VALLE D’AOSTA               2 nodi
  '03', // LOMBARDIA                 458 nodi
  '05', // VENETO                      0 nodi
  '07', // LIGURIA                    62 nodi
  '08', // EMILIA ROMAGNA             19 nodi
  '09', // TOSCANA                     0 nodi
  '999',// ESTERO                     22 nodi
        //                     TOT 15680
]


const url = 'http://serviziweb.csi.it/tpldatawsApplTpldatawsWs/TpldatawsSrvEPdefaultService'
const sampleHeaders = {
  'user-agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36',
  'Content-Type': 'text/xml;charset=UTF-8',
  // non serve...
  // 'soapAction': 'http://serviziweb.csi.it/tpldatawsApplTpldatawsWs/TpldatawsSrvEPdefaultService#getNodiGomma',
  // 'soapAction': 'http://tpldataws.business.tpldataws.infotpl.csi.it/Tpldataws/getNodiGomma',
}


exports.pettina = async () => {

  console.log('INIZIO', (new Date()).toLocaleTimeString())

  // POSTGRES PETTINE
  const sql = postgres('postgres://username:password@host:port/database', {
    host        : process.env.PG_DB_HOST,
    port        : process.env.PG_DB_PORT,
    username    : process.env.PG_DB_USER,
    password    : process.env.PG_DB_PASSWORD,
    database    : 'gtfs',
    // debug       : console.log,
  })

  // no più necessario con l'introduzione dell'upsert.
  // await sql`truncate table nodi`
  // await sql`truncate table fermate`
  // await sql`truncate table paline`

  try{
    for (const codReg of codiciIstatRegioni){
      await insertRegione(codReg, sql)
    }
  } catch(err){
    console.log('erroraccio!!', err)
  } finally{
    // tiro giù la connessione
    await sql.end({ timeout: 1 })
  }


  console.log('FINE', (new Date()).toLocaleTimeString())
  return 'ok'
}



const insertRegione = async (codIstatRegione, sql) => {

  const codIstatTag = codIstatRegione === '999'
                  ? `<codIstatProvincia>999</codIstatProvincia>`
                  : `<codIstatRegione>${codIstatRegione}</codIstatRegione>`

  const envelope = `
  <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tpl="http://tpldataws.interfacews.tpldataws.infotpl.csi.it/">
     <soapenv:Header/>
     <soapenv:Body>
        <tpl:getNodiGomma>
           <filtroRicerca>
              ${codIstatTag}
           </filtroRicerca>
        </tpl:getNodiGomma>
     </soapenv:Body>
  </soapenv:Envelope>
  `
  const { response } = await soapRequest({ url: url, headers: sampleHeaders, xml: envelope, timeout: 5 * 60 * 1000 }); // Optional timeout parameter(milliseconds)
  const { headers, body, statusCode } = response

  // console.log(body)

  // By default, .* will not match newlines. Try [^]* to match really any character.
  // const soapFound = body.match(/<soap:Envelope xmlns:soap="http:\/\/schemas.xmlsoap.org\/soap\/envelope\/">(.*)<\/soap:Envelope>/)
  const soapFound = body.match(/<soap:Envelope xmlns:soap="http:\/\/schemas.xmlsoap.org\/soap\/envelope\/">([^]*)<\/soap:Envelope>/)
  const soapBody = soapFound && soapFound[1]
  // console.log('soapBody is', soapBody)

  const parserOptions = {
    ignoreNameSpace : true, // default is false,
    parseTrueNumberOnly: true,
  }
  const jsonObj = parser.parse(soapBody, parserOptions)
  const {result} = jsonObj.Body.getNodiGommaResponse
  if(result.status.code !== 0) return

  const nodi = result.nodi || []
  console.log(`regione ${codIstatRegione} numero nodi ${nodi.length}`)



  for (const nodo of nodi) {
    // console.log(nodo.codOmnibus)
    await insertNodo(nodo, sql)
  }

}

// POINT(${nodo.nodoCoordLon} ${nodo.nodoCoordLat})
// ST_GeomFromText('POINT(-126.4 45.32)', 4326)
const insertNodo = async (nodo, sql) => {

  // console.log('nodo', nodo)
  // const geomValue = `ST_GeomFromText('POINT(${nodo.nodoCoordLon} ${nodo.nodoCoordLat})', 4326)`
  // const geomValue = `ST_GeomFromText('POINT(-126.4 45.32)', 4326)`
  // console.log('geomValue', geomValue)
  // vedi https://github.com/porsager/postgres/issues/12
  const [new_nodo] = await sql`
    insert into aaaa_pettine.nodi (
      "idNodo", "codNodo", denominazione, "tipoNodo", "codIstatComune", "denominazioneComune", "codIstatProvincia", "siglaProvincia", lat, lng --, geom
      ) values (
        ${nodo.idNodo},
        ${nodo.codOmnibus},
        ${nodo.denominazioneNodo},
        ${nodo.descTipoNodo},
        ${nodo.codIstatComune},
        ${nodo.denominazioneComune},
        ${nodo.codIstatProvincia},
        ${nodo.siglaProvincia},
        ${nodo.nodoCoordLat},
        ${nodo.nodoCoordLon}
        -- ,ST_GeomFromText('POINT(${ sql(nodo.nodoCoordLon) } ${ sql(nodo.nodoCoordLat) })', 4326)
      )
      on conflict ("codNodo")
      do update set
        "idNodo" = EXCLUDED."idNodo",
        "denominazione" = EXCLUDED."denominazione",
        "lat" = EXCLUDED.lat,
        "lng" = EXCLUDED.lng
        --, "geom" = ST_GeomFromText('POINT(${ sql(nodo.nodoCoordLon) } ${ sql(nodo.nodoCoordLat) })', 4326)

      WHERE
      nodi."idNodo" != EXCLUDED."idNodo" OR
      nodi."denominazione" != EXCLUDED.denominazione OR
      nodi."lat" != EXCLUDED.lat OR
      nodi."lng" != EXCLUDED.lng

      returning *
    `
    // console.log('new_nodo', new_nodo)
    const fermate = nodo.fermate ?
                      Array.isArray(nodo.fermate) ? nodo.fermate : [nodo.fermate]
                    : []
    for(const fermata of fermate) {
      await insertFermata(fermata, nodo.codOmnibus, sql)
    }
}



const insertFermata = async (fermata, codNodo, sql) => {
  if(!fermata) return
  // console.log('fermata', fermata)

  const [new_fermata] = await sql`
  insert into aaaa_pettine.fermate (
    "idFermata", "codFermata", "desc", "codNodo", lat, lng-- , geom
    ) values (
      ${fermata.idFermataMd},
      ${fermata.codFermataMdReg},
      ${fermata.descFermataMd},
      ${codNodo},
      ${fermata.fermataMdCoordLat},
      ${fermata.fermataMdCoordLon}
      -- ,ST_GeomFromText('POINT(${ sql(fermata.fermataMdCoordLon) } ${ sql(fermata.fermataMdCoordLat) })', 4326)
      )
      on conflict ("codFermata") do update set
        "idFermata" = EXCLUDED."idFermata",
        "desc" = EXCLUDED."desc",
        "codNodo" = EXCLUDED."codNodo",
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng
        -- ,geom = ST_GeomFromText('POINT(${ sql(fermata.fermataMdCoordLon) } ${ sql(fermata.fermataMdCoordLat) })', 4326)

        WHERE
        fermate."idFermata" != EXCLUDED."idFermata" OR
        fermate."desc" != EXCLUDED.desc OR
        fermate."codNodo" != EXCLUDED."codNodo" OR
        fermate."lat" != EXCLUDED.lat OR
        fermate."lng" != EXCLUDED.lng

      returning *
      `
      // console.log('new_fermata', new_fermata)
      const paline = fermata.paline ?
                        Array.isArray(fermata.paline) ? fermata.paline : [fermata.paline]
                      : []

    for(const palina of paline) {
      await insertPalina(palina, fermata.codFermataMdReg, sql)
    }
}


const insertPalina = async (palina, codFermata, sql) => {
  if(!palina || !palina.palinaCoordLat ||  !palina.palinaCoordLon){
    console.log(`in fermata ${codFermata}, skippo palina anomala`, palina)
    return
  }
  try{
    const [new_palina] = await sql`
      insert into aaaa_pettine.paline (
        "idPalina", "desc", "azienda", "codCsrAzienda", "codFermata",  lat, lng-- , geom
        ) values (
          ${palina.idPalina},
          ${palina.descPalina},
          ${palina.denominazioneAzienda},
          ${palina.codCsrAzienda},
          ${codFermata},
          ${palina.palinaCoordLat},
          ${palina.palinaCoordLon}
          --, ST_GeomFromText('POINT(${ sql(palina.palinaCoordLon) } ${ sql(palina.palinaCoordLat) })', 4326)
        )
        on conflict ("idPalina") do update set
        "desc" = EXCLUDED."desc",
        "azienda" = EXCLUDED."azienda",
        "codCsrAzienda" = EXCLUDED."codCsrAzienda",
        "codFermata" = EXCLUDED."codFermata",
        lat = EXCLUDED.lat,
        lng = EXCLUDED.lng
        -- ,geom = ST_GeomFromText('POINT(${ sql(palina.palinaCoordLon) } ${ sql(palina.palinaCoordLat) })', 4326)

        WHERE
        paline."desc" != EXCLUDED."desc" OR
        paline."azienda" != EXCLUDED."azienda" OR
        paline."codCsrAzienda" != EXCLUDED."codCsrAzienda" OR
        paline."codFermata" != EXCLUDED."codFermata" OR
        paline."lat" != EXCLUDED.lat OR
        paline."lng" != EXCLUDED.lng

        returning *
      `
      // console.log('new_palina', new_palina)
  } catch(err){
    console.log('errore inserimento palina', err)
  }

}

// exports.pettina()

// test
// node index.js