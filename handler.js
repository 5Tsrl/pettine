'use strict'
const AWS = require('aws-sdk')
require('dotenv').config()
const {pettina} = require('./index.js')

AWS.config.region = 'eu-central-1'
var lambda = new AWS.Lambda()


module.exports = {

  aggiorna: async (event, context) => {
    try {

      console.log('INIZIO', (new Date()).toLocaleTimeString())
      const result = await pettina()
      return result

    } catch(err){
      console.log('erroraccio ', err)
      return err
    }
  },

}
