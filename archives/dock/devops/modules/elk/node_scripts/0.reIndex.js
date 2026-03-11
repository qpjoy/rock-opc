const IML = require('./iml.class');
const {esConfig} = require('../config');


(async () => {
    console.log('creating...', esConfig);
    let iml = new IML({
        config: {
            index: esConfig.structureIndex,
        }
    });
    console.log(`${esConfig.structureIndex} <= = = = = =`);
    try {
        await iml.reIndex();
    } catch(err) {
        console.log(err)
    }    
})()