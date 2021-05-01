const soapRequest = require('easy-soap-request')
const parser = require('fast-xml-parser')
const postgres = require('postgres')

const codiciIstatRegioni = [
  // '01', // PIEMONTE                15127 nodi
  '02', // VALLE D’AOSTA               2 nodi
  '03', // LOMBARDIA                 458 nodi
  '05', // VENETO                      0 nodi
  '07', // LIGURIA                    62 nodi
  '08', // EMILIA ROMAGNA             19 nodi
  '09', // TOSCANA                     0 nodi
        //                     TOT 15668
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

  // DB
  const sql = postgres('postgres://postgres:admin5t@storm:5434/pettine', {})

  await sql`truncate table nodi`
  await sql`truncate table fermate`
  await sql`truncate table paline`

  for (const codReg of codiciIstatRegioni){
    await insertRegione(codReg, sql)
  }

  await sql.end()
}



const insertRegione = async (codIstatRegione, sql) => {

  const envelope = `
  <soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:tpl="http://tpldataws.interfacews.tpldataws.infotpl.csi.it/">
     <soapenv:Header/>
     <soapenv:Body>
        <tpl:getNodiGomma>
           <filtroRicerca>
              <codIstatRegione>${codIstatRegione}</codIstatRegione>
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


const insertNodo = async (nodo, sql) => {
  // console.log('nodo', nodo)
  const [new_nodo] = await sql`
    insert into nodi (
      "codNodo", denominazione, "tipoNodo", "codIstatComune", "denominazioneComune", "codIstatProvincia", "siglaProvincia", lat, lng
      ) values (
        ${nodo.codOmnibus},
        ${nodo.denominazioneNodo},
        ${nodo.descTipoNodo},
        ${nodo.codIstatComune},
        ${nodo.denominazioneComune},
        ${nodo.codIstatProvincia},
        ${nodo.siglaProvincia},
        ${nodo.nodoCoordLat},
        ${nodo.nodoCoordLon}
      )
      returning *
    `
    // console.log('new_nodo', new_nodo)
    const fermate = Array.isArray(nodo.fermate) ? nodo.fermate : [nodo.fermate]
    for(const fermata of fermate) {
      await insertFermata(fermata, nodo.codOmnibus, sql)
    }
}



const insertFermata = async (fermata, codNodo, sql) => {
  if(!fermata) return
  // console.log('fermata', fermata)
  const [new_fermata] = await sql`
    insert into fermate (
      "codFermata", "desc", "codNodo", lat, lng
      ) values (
        ${fermata.codFermataMdReg},
        ${fermata.descFermataMd},
        ${codNodo},
        ${fermata.fermataMdCoordLat},
        ${fermata.fermataMdCoordLon}
      )
      returning *
    `
    // console.log('new_fermata', new_fermata)
    const paline = Array.isArray(fermata.paline) ? fermata.paline : [fermata.paline]
    for(const palina of paline) {
      await insertPalina(palina, fermata.codFermataMdReg, sql)
    }
}


const insertPalina = async (palina, codFermata, sql) => {
  if(!palina) return
  // console.log('palina', palina)
  const [new_palina] = await sql`
    insert into paline (
      "idPalina", "desc", "azienda", "codCsrAzienda", "codFermata",  lat, lng
      ) values (
        ${palina.idPalina},
        ${palina.descPalina},
        ${palina.denominazioneAzienda},
        ${palina.codCsrAzienda},
        ${codFermata},
        ${palina.palinaCoordLat},
        ${palina.palinaCoordLon}
      )
      returning *
    `
    // console.log('new_palina', new_palina)

}

main()