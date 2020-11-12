const {exec} = require("child_process");
const xpath = require('xpath');
const http = require('http.min');
const {JSONPath} = require('jsonpath-plus');
const io = require('socket.io-client');
const rpc = require('json-rpc2');
const lodash = require('lodash');
const {parserXMLString, xmldom} = require("./metaController");
const mqtt = require('mqtt');
const got = require('got');
const {resolveCname} = require("dns");
const net = require('net');
const chalk = require('chalk');

const {GC} = require('./connections')


//STRATEGY FOR THE COMMAND TO BE USED (HTTPGET, post, websocket, ...) New processor to be added here. This strategy mix both transport and data format (json, soap, ...)
class ProcessingManager {
    constructor() {
        this._processor = null;
    };

    set processor(processor) {
        this._processor = processor;
    };

    get processor() {
        return this._processor;
    }

    initiate(connection) {

        console.log(chalk.white.bgBlue.bold(' CLASS: Processing Manager '))
        console.log(chalk.white.bgBlue.bold(' METHOD: initiate'))

        //console.log(connection.command);

        // console.log(chalk.green(f + ':') + params[f])
        // //console.log('VALUE:' + params[f])
        // console.log(typeof params[f]);
        // if(typeof params[f] == 'object'){
        //     params[f].forEach((element, index) => {
        //         console.log(chalk.red.bold('[' + index + '] = ' + element))
        //     })
        // }


        return new Promise((resolve, reject) => {
            this._processor.initiate(connection)
                .then((result) => {
                    resolve(result);
                })
                .catch((err) => reject(err));
        });
    }

    process(params) {
        return new Promise((resolve, reject) => {

            console.log('-------------------------')

            console.log(chalk.white.bgBlue.bold(" CLASS: ProcessingManager "))
            console.log("METHOD: process")
            console.log(chalk.white.bgBlue.bold(' PARAMS '))
            /*for (var f in params) {
                //console.log(chalk.green(f + ':') + params[f])
                //console.log('VALUE:' + params[f])
                //console.log(params[f]);
                //console.log(typeof params[f]);
                // if(typeof params[f] == 'object'){
                //     params[f].forEach((element, index) => {
                //         console.log(chalk.red.bold('[' + index + '] = ' + element))
                //     })
                // }
            }*/

            console.log(chalk.black.bgBlue.bold(' THIS PROCESSOR: ') + this._processor.constructor.name);

            this._processor.process(params)
                .then((result) => {
                    console.log(chalk.bgGreen('RESULT:') + result);
                    resolve(result);
                })
                .catch((err) => {
                    console.log(chalk.red('ERROR OCCURRED:') + err)
                    reject(err);
                });
        });
    }

    query(params) {
        return this._processor.query(params);
    }

    startListen(params, deviceId) {
        return this._processor.startListen(params, deviceId);
    }

    stopListen(params) {
        return this._processor.stopListen(params);
    }

    wrapUp(connection) {
        return new Promise((resolve, reject) => {
            this._processor.wrapUp(connection)
                .then((result) => {
                    resolve(result);
                })
                .catch((err) => reject(err));
        });
    }
}

exports.ProcessingManager = ProcessingManager;

class httprestProcessor {
    constructor() {
    };

    initiate(connection) {
        return new Promise(function (resolve, reject) {
            resolve();
        });
    }

    process(params) {
        return new Promise(function (resolve, reject) {
            try {
                // if (typeof (params.command) == 'string') {
                //     console.log('MEGA PROCESS: ' + params.headers);
                //     params.command = JSON.parse(params.command);
                //     params.headers = JSON.parse(params.headers);
                // }
                if (params.command.verb == 'post') {
                    got.post(params.command.call, {json: params.command.message, responseType: 'json'})
                        .then((response) => {
                            //    if (response.body[0].error) {console.log("Error in the post command : " + response.body[0].error); resolve(undefined);}
                            resolve(response.body[0]);
                        })
                        .catch((err) => {
                            console.log('Post request didn\'t work : ')
                            console.log(params);
                            console.log(err);
                            reject(err);
                        });
                }
                if (params.command.verb == 'put') {
                    console.log('final address')
                    console.log(params.command.call)
                    got.put(params.command.call, {json: params.command.message, responseType: 'json'})
                        .then((response) => {
                            //     if (response.body[0].error) {console.log("Error in the put command : " + response.body[0].error); resolve(undefined);}
                            resolve(response.body[0]);
                        })
                        .catch((err) => {
                            console.log('Put request didn\'t work : ')
                            console.log(params);
                            console.log(err);
                            reject(err);
                        });
                }
            } catch (err) {
                console.log('Meta Error during rest command processing.')
                console.log(err)
            }
        });
    }

    query(params) {
        console.log('MEGA QUERY:' + params.headers)
        return new Promise(function (resolve, reject) {
            if (params.query) {
                try {
                    console.log('QUERY DISPLAY')
                    console.log(params)
                    console.log(JSONPath(params.query, params.data))
                    if (typeof (params.data) == 'string') {
                        params.data = JSON.parse(params.data);
                    }
                    resolve(JSONPath(params.query, params.data));
                } catch (err) {
                    console.log('error ' + err + ' in JSONPATH ' + params.query + ' processing of :');
                    console.log(params.data);
                }
            } else {
                resolve(params.data);
            }
        });
    }

    startListen(params, deviceId) {
        return new Promise(function (resolve, reject) {
            let previousResult = '';
            clearInterval(params.listener.timer);
            params.listener.timer = setInterval(() => {
                http(params.command)
                    .then(function (result) {
                        if (result != previousResult) {
                            previousResult = result;
                            params._listenCallback(result, params.listener, deviceId);
                        }
                        resolve('');
                    })
                    .catch((err) => {
                        console.log(err);
                    });
            }, (params.listener.pooltime ? params.listener.pooltime : 1000));
            if (params.listener.poolduration && (params.listener.poolduration != '')) {
                setTimeout(() => {
                    clearInterval(params.listener.timer);
                }, params.listener.poolduration);
            }
        });
    }

    stopListen(params) {
        clearInterval(params.timer);
    }
}

exports.httprestProcessor = httprestProcessor;

class httpgetProcessor {
    constructor() {
    };

    initiate(connection) {
        return new Promise(function (resolve, reject) {
            resolve();
        });
    }

    process(params) {
        return new Promise(function (resolve, reject) {

            console.log('http get processor params')
            console.log('==========================')

            console.log('params:' + params + ' length:' + params.length)

            for (var f in params) {
                console.log(f + ' ' + typeof params[f])
                console.log(params[f])
            }

            const options = {
                uri: params.command,
                method: 'GET',
            }

            if (params.headers) {
                console.log('headers:' + params.headers)
                options.headers = params.headers
                //console.log('headers options:' + options.headers)
            }

            http(options)
                .then(function (result) {
                    resolve(result.data);
                })
                .catch((err) => {
                    reject(err);
                });

            // http(params.command)
            //     .then(function (result) {
            //         resolve(result.data);
            //     })
            //     .catch((err) => {
            //         reject(err);
            //     });
        });
    }

    query(params) {
        return new Promise(function (resolve, reject) {
            if (params.query) {
                try {
                    if (typeof (params.data) == 'string') {
                        params.data = JSON.parse(params.data);
                    }

                    resolve(JSONPath(params.query, params.data));
                } catch (err) {
                    console.log('error ' + err + ' in JSONPATH ' + params.query + ' processing of :');
                    console.log(params.data);
                }
            } else {
                resolve(params.data);
            }
        });
    }

    startListen(params, deviceId) {
        return new Promise(function (resolve, reject) {
            let previousResult = '';
            console.log('starting listener ' + deviceId);
            console.log(params);
            clearInterval(params.listener.timer);
            params.listener.timer = setInterval(() => {
                http(params.command)
                    .then(function (result) {
                        if (result.data != previousResult) {
                            previousResult = result.data;
                            params._listenCallback(result.data, params.listener, deviceId);
                        }
                        resolve('');
                    })
                    .catch((err) => {
                        console.log(err);
                    });
            }, (params.listener.pooltime ? params.listener.pooltime : 1000));
            if (params.listener.poolduration && (params.listener.poolduration != '')) {
                setTimeout(() => {
                    clearInterval(params.listener.timer);
                }, params.listener.poolduration);
            }
        });
    }

    stopListen(params) {
        clearInterval(params.timer);
    }
}

exports.httpgetProcessor = httpgetProcessor;

class webSocketProcessor {
    initiate(connection) {

        console.log(chalk.white.bgBlue.bold('Websocket initiate'))
        return new Promise(function (resolve, reject) {
            try {
                if (connection.connector != "" && connection.connector != undefined) {
                    connection.connector.close();
                } //to avoid opening multiple
                connection.connector = io.connect(connection.descriptor);
                resolve(connection);
            } catch (err) {
                console.log('Error while intenting connection to the target device.');
                console.log(err);
            }
        }); //to avoid opening multiple
    }

    process(params) {
        return new Promise(function (resolve, reject) {
            if (typeof (params.command) == 'string') {
                params.command = JSON.parse(params.command);
            }
            if (params.command.call) {
                params.connection.connector.emit(params.command.call, params.command.message);
                resolve('');
            }
        });
    }

    query(params) {
        return new Promise(function (resolve, reject) {
            try {
                if (params.query) {
                    resolve(JSONPath(params.query, params.data));
                } else {
                    resolve(params.data);
                }
            } catch (err) {
                console.log('error ' + err + ' in JSONPATH ' + params.query + ' processing of :');
                console.log(params.data);
            }
        });
    }

    startListen(params, deviceId) {
        return new Promise(function (resolve, reject) {
            params.connection.connector.on(params.command, (result) => {
                params._listenCallback(result, params.listener, deviceId);
            });
            resolve('');
        });
    }

    stopListen(params) {
    }

    wrapUp(connection) {
        return new Promise(function (resolve, reject) {
            if (connection.connector != "" && connection.connector != undefined) {
                connection.connector.close();
            }
            resolve(connection);
        });
    }
}

exports.webSocketProcessor = webSocketProcessor;

class jsontcpProcessor {
    initiate(connection) {
        return new Promise(function (resolve, reject) {
            //if (connection.connector == "" || connection.connector == undefined) {
            rpc.SocketConnection.$include({
                write: function ($super, data) {
                    return $super(data + "\r\n");
                },
                call: function ($super, method, params, callback) {
                    if (!lodash.isArray(params) && !lodash.isObject(params)) {
                        params = [params];
                    }
                    `A`;
                    var id = null;
                    if (lodash.isFunction(callback)) {
                        id = ++this.latestId;
                        this.callbacks[id] = callback;
                    }

                    var data = JSON.stringify({jsonrpc: '2.0', method: method, params: params, id: id});
                    this.write(data);
                }
            });
            let mySocket = rpc.Client.$create(1705, connection.descriptor, null, null);
            mySocket.connectSocket(function (err, conn) {
                if (err) {
                    console.log('Error connecting to the target device.');
                    console.log(err);
                }
                if (conn) {
                    connection.connector = conn;
                    console.log('connection to the device successful');
                    resolve(connection);
                }
            });
            //} //to avoid opening multiple
        });
    }

    process(params) {
        return new Promise(function (resolve, reject) {
            if (typeof (params.command) == 'string') {
                params.command = JSON.parse(params.command);
            }

            if (params.command.call) {
                params.connection.connector.call(params.command.call, params.command.message, function (err, result) {
                    if (err) {
                        console.log(err);
                    }
                    resolve(result);
                });

            }
        });
    }

    query(params) {
        return new Promise(function (resolve, reject) {
            try {
                if (params.query) {
                    resolve(JSONPath(params.query, params.data));
                } else {
                    resolve(params.data);
                }
            } catch (err) {
                console.log('error ' + err + ' in JSONPATH ' + params.query + ' processing of :' + params.data);
            }
        });
    }

    startListen(params, deviceId) {
        return new Promise(function (resolve, reject) {
            console.log('Starting to listen to the device.');
            params.socketIO.on(params.command, (result) => {
                params._listenCallback(result, params.listener, deviceId);
            });
            resolve('');
        });
    }

    stopListen(params) {
        console.log('Stop listening to the device.');
        //    TODO stop listening
        //    listener.io.disconnect(listener.socket);
    }
}

exports.jsontcpProcessor = jsontcpProcessor;

function convertXMLTable2JSON(TableXML, indent, TableJSON) {
    return new Promise(function (resolve, reject) {
        parserXMLString.parseStringPromise(TableXML[indent]).then((result) => {
            if (result) {
                TableJSON.push(result);
                indent = indent + 1;
                if (indent < TableXML.length) {
                    resolve(convertXMLTable2JSON(TableXML, indent, TableJSON));
                } else {
                    resolve(TableJSON);
                }

            } else {
                console.log(err);
            }
        });
    });
}

class httpgetSoapProcessor {
    initiate(connection) {
        return new Promise(function (resolve, reject) {
            resolve();
        });
    }

    process(params) {
        return new Promise(function (resolve, reject) {
            http(params.command)
                .then(function (result) {
                    resolve(result.data);
                })
                .catch((err) => {
                    reject(err);
                });
        });
    }

    query(params) {
        return new Promise(function (resolve, reject) {
            if (params.query) {
                try {
                    //console.log('RAW XPATH Return elt 0: ' + data);
                    var doc = new xmldom().parseFromString(params.data);
                    //console.log('RAW XPATH Return elt 0.1: ' + doc);
                    //console.log('RAW XPATH Return elt 0.1: ' + query);
                    var nodes = xpath.select(params.query, doc);
                    //console.log('RAW XPATH Return elt : ' + nodes);
                    //console.log('RAW XPATH Return elt 2: ' + nodes.toString());
                    let JSonResult = [];
                    convertXMLTable2JSON(nodes, 0, JSonResult).then((result) => {
                        console.log('Result of conversion +> ');
                        console.log(result);
                        resolve(result);
                    });
                } catch (err) {
                    console.log('error ' + err + ' in XPATH ' + params.query + ' processing of :' + params.data);
                }
            } else {
                resolve(params.data);
            }
        });
    }

    listen(params) {
        return '';
    }
}

exports.httpgetSoapProcessor = httpgetSoapProcessor;

class httppostProcessor {
    initiate(connection) {
        return new Promise(function (resolve, reject) {
            resolve();
        });
    }

    process(params) {
        return new Promise(function (resolve, reject) {

            if (params.command.custom) {
                const options = params.command.custom;
                http(options)
                    .then(function (result) {
                        resolve(result.data);
                    })
                    .catch((err) => {
                        reject(err);
                    });
                return;
            }


            if (typeof (params.command) == 'string') {
                params.command = JSON.parse(params.command);
            }
            if (params.command.call) {
                http.post(params.command.call, params.command.message)
                    .then(function (result) {
                        resolve(result.data);
                    })
                    .catch((err) => {
                        console.log("Error in the post command: ");
                        console.log(err);
                        reject(err);
                    });
            } else {
                reject('no post command provided or improper format');
            }
        });
    }

    query(params) {
        return new Promise(function (resolve, reject) {
            try {
                resolve(JSONPath(params.query, JSON.parse(params.data)));
            } catch (err) {
                console.log('error ' + err + ' in JSONPATH ' + params.query + ' processing of :' + params.data);
            }
        });
    }

    listen(params) {
        return '';
    }
}

exports.httppostProcessor = httppostProcessor;

class staticProcessor {
    initiate(connection) {
        return new Promise(function (resolve, reject) {
            resolve();
        });
    }

    process(params) {
        return new Promise(function (resolve, reject) {
            resolve(params.command);
        });
    }

    query(params) {
        return new Promise(function (resolve, reject) {
            try {
                if (params.query != undefined && params.query != '') {
                    resolve(JSONPath(params.query, JSON.parse(params.data)));
                } else {
                    if (params.data != undefined) {
                        if (typeof (params.data) == string) {
                            resolve(JSON.parse(params.data));
                        } else {
                            resolve(params.data)
                        }
                    } else {
                        resolve();
                    }
                }
            } catch {
                console.log('Value is not JSON after processed by query: ' + params.query + ' returning as text:' + params.data);
                resolve(params.data)
            }
        });
    }

    listen(params) {
        return '';
    }
}

exports.staticProcessor = staticProcessor;

class cliProcessor {
    initiate(connection) {
        return new Promise(function (resolve, reject) {
            resolve();
        });
    }

    process(params) {
        return new Promise(function (resolve, reject) {
            exec(params.command, (stdout, stderr) => {
                if (stdout) {
                    resolve(stdout);
                } else {
                    resolve(stderr);
                }
            });
        });
    }

    query(params) {
        return new Promise(function (resolve, reject) {
            try {
                //let resultArray = new [];
                resolve(params.data.split(params.query));
            } catch {
                console.log('error in string.search regex :' + params.query + ' processing of :' + params.data);
            }
        });
    }

    listen(params) {
        return '';
    }
}

exports.cliProcessor = cliProcessor;

class replProcessor {
    initiate(connection) {
        return new Promise(function (resolve, reject) {
            try {
                if (connection.connector != "" && connection.connector != undefined) {
                    connection.connector.close();
                } //to avoid opening multiple
                connection.connector = io.connect(connection.descriptor);
                resolve(connection);
            } catch (err) {
                console.log('Error while intenting connection to the target device.');
                console.log(err);
            }
        });
    }

    process(params) {
        return new Promise(function (resolve, reject) {
            if (params.interactiveCLIProcess) {
                console.log('call interactive');
                params.interactiveCLIProcess.stdin.write(params.command + '\n');
                console.log('call interactive done');
                resolve('Finished ' + params.command);
            }
        });
    }

    query(params) {
        return new Promise(function (resolve, reject) {
            try {
                //let resultArray = new [];
                resolve(params.data.split(params.query));
            } catch {
                console.log('error in string.search regex :' + params.query + ' processing of :' + params.data);
            }
        });
    }

    listen(params) {
        return '';
    }
}

exports.replProcessor = replProcessor;

class mqttProcessor {
    initiate(connection) {
        return new Promise(function (resolve, reject) {
            connection.connector = mqtt.connect('mqtt://' + connection.descriptor, {clientId: "NeeoBrain"}); // Always connect to the local mqtt broker
            connection.connector.on('connect', function () {
                console.log('MQTT connected');
                resolve(connection);
            })
        });
    }

    process(params) {
        return new Promise(function (resolve, reject) {
            params.command = JSON.parse(params.command)
            console.log('MQTT publishing ' + params.command.Message + ' to ' + params.command.Topic);
            try {
                connection.connector.publish(params.command.Topic, params.command.Message);
                resolve('');
            } catch (err) {
                console.log('MQTT not connected!');
                console.log(err);
            }
        })
    }

    query(data, query) {
        return new Promise(function (resolve, reject) {
            try {
                //let resultArray = new [];
                resolve(data.split(query));
            } catch {
                console.log('error in string.search regex :' + query + ' processing of :' + data)
            }
        })
    }

    listen(command, listener, _listenCallback) {
        return '';
    }
}

exports.mqttProcessor = mqttProcessor;


class tcpProcessor {
    initiate(connection) {

        //if(!connection.descriptor.init) return;

        return new Promise(function (resolve, reject) {
            console.log(chalk.red('---initiate---tcpProcessor---'))

            var descriptor = connection.descriptor;

            try {
                descriptor = JSON.parse(descriptor);
                connection.descriptor = descriptor;
                var onConnectFunc = connection.descriptor.onConnectFunc;

                const client = new net.Socket();
                const connect = new Promise((resolve, reject) => {
                    client.connect({
                        port: parseInt(descriptor.Port),
                        host: descriptor.Ip,
                    }, () => {
                        console.log(chalk.green('TCP connection initialized'));
                        resolve();
                    });
                });

                /*
                * if you don't need to handshake you can skip this property in driver config file
                * */
                if (onConnectFunc) {
                    connect.then(() => {

                        /*
                        * you can write your own handler to handshake with device when connection is init
                        * */
                        eval(onConnectFunc);

                        connection.connector = client;
                        resolve(connection);

                    }).catch(() => {
                        console.log('REJECTED')
                    });
                } else {
                    connect.then(() => {
                        connection.connector = client;
                        resolve(connection);
                    }).catch(() => {
                        console.log('REJECTED')
                    });
                }

            } catch (e) {
                console.log(chalk.red('Connection descriptor is not a JSON'))

                /*
                * when connection config is not a JSON do something else
                * may be this case is not necessary
                * */

                reject('Connection descriptor is not a JSON');
            }

        });
    }

    process(params) {
        return new Promise((resolve, reject) => {

            if (params._class) {

                const device = eval(params._class)
                device.write(params.command + '\r\n')

                resolve();
                return;
            }

            console.log(chalk.white.bgBlue.bold(this.constructor.name))
            console.log(chalk.white.bgRed.bold(' PROCESS TCP PARAMS '))
            //console.log(chalk.red(params.command + typeof params.command))

            //console.log(params)

            if (!params.connection.connector) {
                console.log(chalk.red('REJECTED: Connection is impossible. Check both IP and Port'))
                reject();
                return;
            }

            if (params.command)
                switch (typeof params.command) {
                    case 'object':

                        /*
                        * TCP commands should be sent step by step,
                        * with micro latency
                        * */

                        var iteration = 0,
                            cmd = params.command;
                        for (var i = 0; i < cmd.length; i++) {
                            setTimeout(function () {
                                // console.log(chalk.green(iteration))
                                // console.log(chalk.red(cmd[iteration]))

                                params.connection.connector.write(cmd[iteration]);

                                iteration++;
                            }, i * 50)
                        }

                        break;
                    case 'string':

                        //console.log(chalk.bgYellow.red.bold('ALARM STRING'))
                        /*
                        * I think send hex to net package is not necessary
                        * */
                        /*if (params.command.match(/HEX:/)) {
                            params.command = params.command.replace('HEX:', '');

                            console.log(chalk.red.bold(stringToHex(params.command)))

                            params.connection.connector.write(params.command + "\r");
                        } else {}*/
                        params.connection.connector.write(params.command + "\r\n");

                        break;
                }
            else if (params.packet) {

            }

            resolve();

        });
    }

    query(params) {
        return new Promise(function (resolve, reject) {
            console.log(chalk.white.bgBlue.bold(' QUERY PARAMS '))
            console.log(params)
            resolve();
        });
    }

}

exports.tcpProcessor = tcpProcessor;