const IML = require('./iml.class');
const {esConfig} = require('../config');

(async () => {
    console.log('deleting index....');
    let iml = new IML({
        config: {
            index: esConfig.structureIndex,
            mappings: {
                "mappings": {
                    "properties": {
                        "id": {
                            "type": "integer"
                        },
                        "name": {
                            "type": "keyword"
                        },
                        "desc": {
                            "type": "text",
                            "analyzer": "filterHtml",
                            "search_analyzer": "searchHtml",
                            "index": "true"
                        },
                        "url": {
                            "type": "keyword"
                        },
                        "type": {
                            "type": "keyword"
                        },
                        "marked": {
                            "type": "text",
                            "analyzer": "ik_max_word",
                            "search_analyzer": "ik_smart",
                            "index": "true"
                        },
                        "content": {
                            "type": "text"
                        },
                        "folders": {
                            "type": "nested",
                            "properties": {
                                "name": {
                                    "type": "keyword"
                                },
                                "url": {
                                    "type": "keyword"
                                }
                            }
                        },
                        "files": {
                            "type": "nested",
                            "properties": {
                                "name": {
                                    "type": "keyword"
                                },
                                "url": {
                                    "type": "keyword"
                                }
                            }
                        },
                        "chapters": {
                            "type": "nested",
                            "properties": {
                                "url": {
                                    "type": "keyword"
                                },
                                "anchor": {
                                    "type": "keyword"
                                },
                                "title": {
                                    "type": "keyword"
                                },
                                "chapter": {
                                    "type": "text",
                                    "analyzer": "ik_max_word",
                                    "search_analyzer": "ik_smart",
                                    "index": "true"
                                }
                            }
                        },
                        "from": {
                          "type": "keyword"
                        },
                        "v": {
                            "type": "keyword"
                        },
                        "create_time": {
                            "type": "date",
                            "format": "yyyy-MM-dd HH:mm:ss||yyyy-MM-dd||epoch_millis"
                        },
                        "update_time": {
                            "type": "date",
                            "format": "yyyy-MM-dd HH:mm:ss||yyyy-MM-dd||epoch_millis"
                        }
                    }
                }
            }
        }
    });    
    // await iml.imlCreate();
    await iml.imlFlush();
    
    let iml2 = new IML({
        config: {
            index: esConfig.historyIndex,
            mappings: {
                "mappings": {
                    "properties": {
                        "id": {
                            "type": "integer"
                        },
                        "userInfo": {
                            "type": "nested",
                            "properties": {
                                "id": {
                                    "type": "keyword"
                                },
                                "name": {
                                    "type": "keyword"
                                },
                                "avatar": {
                                    "type": "keyword"
                                }
                            }
                        },
                        "desc": {
                            "type": "text",
                            "analyzer": "filterHtml",
                            "search_analyzer": "searchHtml",
                            "index": "true"
                        },
                        "url": {
                            "type": "keyword"
                        },
                        "anchor": {
                            "type": "keyword"
                        },
                        "title": {
                            "type": "keyword"
                        },
                        "chapter": {
                            "type": "text",
                            "analyzer": "ik_max_word",
                            "search_analyzer": "ik_smart",
                            "index": "true"
                        },
                        "highlight": {
                            "type": "text",                            
                        },
                        "from": {
                            "type": "keyword"
                        },
                        "v": {
                            "type": "keyword"
                        },
                        "create_time": {
                            "type": "date",
                            "format": "yyyy-MM-dd HH:mm:ss||yyyy-MM-dd||epoch_millis"
                        },
                        "update_time": {
                            "type": "date",
                            "format": "yyyy-MM-dd HH:mm:ss||yyyy-MM-dd||epoch_millis"
                        }
                    }
                }
            }
        }
    });
    await iml2.imlFlush();
})()