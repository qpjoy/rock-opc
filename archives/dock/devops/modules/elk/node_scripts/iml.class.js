const axios = require('axios');
const { Client } = require('@elastic/elasticsearch');
const {esConfig} = require('../config');
const client = new Client({
    // nodes: ['http://23.225.161.124:9200'],
    nodes: [esConfig.esUrl || 'http://127.0.0.1:9200'],
    // requestTimeout: 5000,
    // sniffInterval: 500,
    // sniffOnStart: true,
    // sniffOnConnectionFault: true
})
// const client = require('../config/elasticsearch.config');


const _config_ = {
    baseUrl: esConfig.esUrl,
    contentType: 'application/json',
 
    index: 'lili-api-history',
    mappings: {}
}


const utils = {
    matrixToArr: function (str, arr) {
        let statusArr = str.trim().split('\n');
        let statusMappings = statusArr.map((status) => {
            let ss = status.split(' ');
            return {
                [arr[0] || 0]: ss[0],
                [arr[1] || 1]: ss[ss.length - 1]
            }
        });
        return statusMappings;
    }
}

function uuid2(len, radix) {
    var chars = '0123456789abcdefghijklmnopqrstuvwxyz'.split('');
    var uuid = [],
        i;
    radix = radix || chars.length;

    if (len) {
        // Compact form
        for (i = 0; i < len; i++) uuid[i] = chars[0 | Math.random() * radix];
    } else {
        // rfc4122, version 4 form
        var r;

        // rfc4122 requires these characters
        uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
        uuid[14] = '4';

        // Fill in random data.  At i==19 set the high bits of clock sequence as
        // per rfc4122, sec. 4.1.5
        for (i = 0; i < 36; i++) {
            if (!uuid[i]) {
                r = 0 | Math.random() * 16;
                uuid[i] = chars[(i == 19) ? (r & 0x3) | 0x8 : r];
            }
        }
    }

    return uuid.join('');
}

// axios.defaults.headers.common['Authorization'] = AUTH_TOKEN;
class IML {

    constructor({ instance, config, _client } = {}) {
        let _config = Object.assign({}, _config_, config);
        axios.defaults.baseURL = _config.baseUrl;
        axios.defaults.headers.post['Content-Type'] = _config.contentType;
        instance = axios.create();
        this.instance = instance;
        this.config = _config;
    }

    async upsertPolicy() {
        let { instance, config } = this;
        let policyRes = await instance.put(`/_ilm/policy/${config.index}-policy?pretty`, {
            "policy": {
                "phases": {
                    "hot": {
                        "actions": {
                            "rollover": {
                                "max_size": "50GB",
                                "max_age": "30d"
                            }
                        }
                    },
                    "delete": {
                        "min_age": "90d",
                        "actions": {
                            "delete": {}
                        }
                    }
                }
            }
        })
        if (policyRes.status === 200) {
            console.log('History index Policy => created success!');
        }
    }

    async upsertTemplate() {
        let { instance, config } = this;
        let obj = Object.assign({}, {
            "index_patterns": [`${config.index}-*`],
            "aliases": {
                [config.index]: {}
            },
            "settings": {
                "number_of_shards": 1,
                "number_of_replicas": 1,
                "index.lifecycle.name": `${config.index}-policy`,
                "index.lifecycle.rollover_alias": `${config.index}`,
                "analysis": {
                    "analyzer": {
                        "searchHtml": {
                            "type": "custom",
                            "tokenizer": "ik_smart",
                            "char_filter": ["html_strip"],
                            // "max_token_length": 5,
                            "filter": ["3_5_edgegrams", "snowball"]
                        },
                        "filterHtml": {
                            "type": "custom",
                            "tokenizer": "ik_max_word",
                            "char_filter": ["html_strip"],
                            // "max_token_length": 5,
                            "filter": ["3_5_edgegrams", "snowball"]
                        }
                    },
                    "filter": {
                        "3_5_edgegrams": {
                            "type": "edge_ngram",
                            "min_gram": 3,
                            "max_gram": 5,
                            // "token_chars": ["letter", "digit"]
                        }
                    },
                    "char_filter": {
                        "camelFlatten": {
                            "type": "pattern_replace",
                            "pattern": "(?<=\\p{Lower})(?=\\p{Upper})",
                            "replacement": " "
                        }
                    }
                }
            },
        }, config.mappings || {});
        // console.log(obj);
        let templateRes = await instance.put(`/_template/${config.index}-template`, obj);
        console.log(templateRes.response, ' - - -')


        if (templateRes.status === 200) {
            console.log('History index Template => created success!')
        }
    }

    async indexExists() {
        const { config } = this;
        const { body } = await client.indices.exists({
            index: config.index
        })
        return body
    }

    async initImlIndex({ ...conf } = {}) {
        let { instance, config } = this;
        let initIndexRes = await instance.put(`/${config.index}-000001?pretty`, {
            "aliases": {
                [`${config.index}`]: {
                    "is_write_index": true
                }
            }
        })
        if (initIndexRes.status === 200) {
            console.log('History index Init 000001 => created success!')
        }
    }

    async indexDeleteAlias({ ...conf } = {}) {
        let { instance, config } = this;
        let idaRes = await client.indices.deleteAlias(Object.assign({}, {
            index: config.index,
            name: '*'
        }, conf))
        if (idaRes && idaRes.statusCode === 200) {
            console.log(idaRes.body);
        }
    }

    // async indexDeleteTemplate({...conf} = {}) {
    //     let { instance, config } = this;
    //     let idtRes = await client.indices.deleteTemplate(Object.assign({}, {
    //         // index: config.index,
    //         name: '*'
    //     }, conf))
    // }

    async catTemplates() {
        let h = ['name', 'index_patterns'];
        let templates = await client.cat.templates(
            {
                name: '',
                h
            },
        )
        if (templates && templates.statusCode === 200) {
            let body = templates.body;
            let bodyArr = utils.matrixToArr(body, h);        
            return bodyArr;
        } else {
            return [];
        }
    }

    async deleteTemplates({ name } = {}) {
        let { instance, config } = this;
        let _name = name || `${config.index}-template`;
        console.log(_name, ' to be tpl delete')
        let delTpl = await client.indices.deleteTemplate({
            name: `${_name}`,
            // ignore_unavailable: true
            // timeout: string,
            // master_timeout: string
        })
        if (delTpl && delTpl.statusCode === 200) {
            console.log(delTpl.body, ' - - - deltpl');
        }
    }

    async mappingStatus() {
        let { instance, config } = this;
        let mappingsRes = await instance.get(`/${config.index}*/_mappings?pretty`, {})            
        if (mappingsRes.status === 200) {
            console.log('Mapping index Status => get success!')
            console.log(JSON.stringify(mappingsRes.data));
        }
    }

    async imlCatPolicy({...conf} = {}) {
        let { instance, config } = this;
        let _config = Object.assign({}, config, conf);
        let icpRes = await instance.get(`/_ilm/policy${_config.index? ('/' + _config.index + '*'): ''}?pretty`, {})        
        if(icpRes && icpRes.status === 200) {
            console.log('IML cat policy = = => success!');
            console.log(JSON.stringify(icpRes.data));
        }
    }

    async imlDeletePolicy({name} = {}) {
        let { instance, config } = this;
        let _config = Object.assign({}, config);
        let _name = name || `${config.index}-policy`;

        if(!_name) {
            throw new Error('IML Policy Name not provide...');
        }
        let icpRes = await instance.delete(`/_ilm/policy/${_name}?pretty`, {})
        if(icpRes && icpRes.status === 200) {
            console.log('IML delete policy = = => success!');
            console.log(JSON.stringify(icpRes.data));
        }
    }

    async imlRemovePolicy({ index } = {}) {
        let { instance, config } = this;
        let _index = index || `${config.index}`;
        let irpRes = await client.ilm.removePolicy({
            index: _index
        })
        if (irpRes && irpRes.statusCode === 200) {
            console.log(irpRes.body);
        }
    }

    async imlCreate() {
        let { instance, config } = this;
        await this.upsertPolicy();
        await this.upsertTemplate();
        let indexExists = await this.indexExists();
        if (indexExists) {
            console.log('index exists...', indexExists);
        } else {
            console.log('Index not exists, initializing...')
            await this.initImlIndex();
        }
        await this.ilmStatus();
        await this.mappingStatus();
    }

    async imlFlush() {
        let { instance, config } = this;
        let aliasMappings = await this.catAliases();
        console.log(aliasMappings);

        for (const {alias, index} of aliasMappings) {
            console.log(' outer in for', alias, index);
            if(index.indexOf(config.index) >=0) {
                console.log(index, config.index, 'to be cat');
                // delete alias
                await this.indexDeleteAlias({index, name: alias});
                // // delete index
                await this.deleteIndex({index});

                // delete template && mappings

                let tplArr = await this.catTemplates();
                console.log(tplArr);
                for(const {name,index_patterns} of tplArr) {
                    let tplName = `${config.index}-template`;
                    if(name.indexOf(tplName) >= 0) {
                        console.log(name, index_patterns, '--- this is name, index_patterns');
                        await this.deleteTemplates({name: tplName});

                        // delete policy
                        await this.imlDeletePolicy({name: `${config.index}-policy`});
                    }                    
                }                            
            }
        }
        // await this
    }

    async ilmStatus() {
        let { instance, config } = this;
        let statusRes = await instance.get(`/${config.index}-*/_ilm/explain?pretty`, {})            

        if (statusRes.status === 200) {
            console.log('History index Status => get success!');
            console.log(statusRes.data);
        }
    }

    async catAliases() {
        let h = ['alias', 'index'];
        let aliases = await client.cat.aliases({
            h
        })
        if (aliases && aliases.statusCode === 200) {
            let body = aliases.body;
            let bodyArr = utils.matrixToArr(body, h);          
            return bodyArr;
        }
    }

    async deleteIndex({index} = {}) {
        let { instance, config } = this;
        let _index = index || config.index;
        if (_index) {
            let deleteRes = await instance.delete(`/${_index}?pretty`, {})               
            if (deleteRes && deleteRes.status === 200) {
                console.log(`DELETE INDEX: ${_index} Status => delete success!`)
                console.log(JSON.stringify(deleteRes.data));
            }
        } else {
            console.log(' = = =  NO index specified...')
        }
    }

    async clearCache({index} = {}) {
        let { instance, config } = this;
        let _index = index || config.index;
        console.log(_index);
        if(_index) {
            let cacheRes = await client.indices.clearCache({
                index: _index
                // index: string | string[],
                // fielddata: boolean,
                // fields: string | string[],
                // query: boolean,
                // ignore_unavailable: boolean,
                // allow_no_indices: boolean,
                // expand_wildcards: 'open' | 'closed' | 'none' | 'all',
                // request: boolean
              })

              if (cacheRes.statusCode === 200) {
                console.log(`Cache ${_index}clear => success!`);
                console.log(cacheRes);                
            }
        }
        
    }

    async truncateAll() {
        await this.deleteIndex("_all")
    }

    async newImlIndex({ ...conf } = {}) {
        let { instance, config } = this;
        let index = `${config.index}-tmp-000001-${uuid2(16, 16)}`;
        console.log(`reindexing: ${index}`);
        let initIndexRes = await instance.put(`/${index}`, {
            "aliases": {
                [`${config.index}`]: {
                    // "is_write_index": true
                }
            }
        })
        if (initIndexRes.status === 200) {
            console.log(`Index Init 000001-${index} => created success!`)
            return index;
        }
    }

    async reIndex(_index) {
        let { instance, config } = this;
        let index = _index || `${config.index}-000001`;
        let newIndex = await this.newImlIndex();
        console.log(`this is new index ===> ${newIndex}`);
        console.log(`Reindex  ${config.index} ===> ${newIndex}`);
        let count = 0;
        let nodes = undefined;
        JSON.safeStringify = (obj, indent = 2) => {
            let cache = [];
            const retVal = JSON.stringify(
              obj,
              (key, value) =>
                typeof value === "object" && value !== null
                  ? cache.includes(value)
                    ? undefined // Duplicate reference found, discard key
                    : cache.push(value) && value // Store value in our collection
                  : value,
              indent
            );
            cache = null;
            return retVal;
          };
        await instance.post(`/_reindex`, {
            "conflicts": "proceed",
            "source": {
                "index": index
            },
            "dest": {
                "index": newIndex,
                "version_type": "internal"
            }
        });
        console.log(`Rm aliases ${index} from ${config.index}`)

        const interval = setInterval(async() => {
            if((Object.prototype.toString.call(nodes) === '[object Object]' && JSON.stringify(nodes) === '{}') || count >= 10) {
                console.log(`interval terminated!`);
                clearInterval(interval);

                await instance.post(`/_aliases`, {
                    "actions": [
                        {
                            "remove": {
                                "index": index,
                                "alias": config.index
                            }
                        }
                    ]
                });

                console.log(`deleting ${index}`);
                await this.deleteIndex({index});

                console.log(`Reindex  ${newIndex} ===> ${index}`);
                await instance.post(`/_reindex`, {
                    "source": {
                        "index": newIndex
                    },
                    "dest": {
                        "index": index,
                        "version_type": "internal"
                    }
                });
                console.log(`deleting ${newIndex}`);
                await this.deleteIndex({index: newIndex})

                return;
            }
            let res = await instance.get(`_tasks?detailed=true&actions=*reindex`);
            nodes = res.data.nodes;
            console.log(`this is res `, JSON.safeStringify(res.data));
            count++;
        }, 1000);
    }
}

module.exports = IML
