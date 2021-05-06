const soapRequest = require('easy-soap-request')
const parser = require('fast-xml-parser')
const postgres = require('postgres')

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


const main = async () => {
  console.log('inizio', (new Date()).toLocaleTimeString())

  // DB
  const sql = postgres('postgres://postgres:admin5t@storm:5434/pettine', {
    host        : process.env.DB_HOST || 'postgres',  // nome del servizio nello stack swarm   Options in the object will override any present in the url.
    port        : process.env.DB_PORT || '5432',      // Porta interna
    // debug       : console.log,
  })

  await sql`truncate table nodi`
  await sql`truncate table fermate`
  await sql`truncate table paline`

  for (const codReg of codiciIstatRegioni){
    await insertRegione(codReg, sql)
  }

  await sql.end()
  console.log('fine', (new Date()).toLocaleTimeString())
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
  }
  const jsonObj = parser.parse(soapBody, parserOptions)
  const {result} = jsonObj.Body.getNodiGommaResponse
  if(result.status.code !== 0) return

  const nodi = result.nodi || []
  console.log(`regione ${codIstatRegione} numero nodi ${nodi.length}`)



  for (const nodo of nodi) {
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
    insert into nodi (
      "idNodo", "codNodo", denominazione, "tipoNodo", "codIstatComune", "denominazioneComune", "codIstatProvincia", "siglaProvincia", lat, lng, geom
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
        ${nodo.nodoCoordLon},
        ST_GeomFromText('POINT(${ sql(nodo.nodoCoordLon) } ${ sql(nodo.nodoCoordLat) })', 4326)
      )
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
  insert into fermate (
    "idFermata", "codFermata", "desc", "codNodo", lat, lng, geom
    ) values (
      ${fermata.idFermataMd},
      ${fermata.codFermataMdReg},
      ${fermata.descFermataMd},
      ${codNodo},
      ${fermata.fermataMdCoordLat},
      ${fermata.fermataMdCoordLon},
      ST_GeomFromText('POINT(${ sql(fermata.fermataMdCoordLon) } ${ sql(fermata.fermataMdCoordLat) })', 4326)
      )
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
  const [new_palina] = await sql`
    insert into paline (
      "idPalina", "desc", "azienda", "codCsrAzienda", "codFermata",  lat, lng, geom
      ) values (
        ${palina.idPalina},
        ${palina.descPalina},
        ${palina.denominazioneAzienda},
        ${palina.codCsrAzienda},
        ${codFermata},
        ${palina.palinaCoordLat},
        ${palina.palinaCoordLon},
        ST_GeomFromText('POINT(${ sql(palina.palinaCoordLon) } ${ sql(palina.palinaCoordLat) })', 4326)
      )
      returning *
    `
    // console.log('new_palina', new_palina)

}

main()

// test
// DB_HOST=storm DB_PORT=5434 node index.js