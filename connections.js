const Net = require('net');
const chalk = require('chalk');

class GlobalCache {

    constructor(ip, port) {
        console.log('constructor')
        this.init(ip, port)
    }

    init(ip, port) {
        console.log('init');
        this.ip = ip;
        this.port = port;

        const iTach = new Net.Socket();

        iTach.connect({
            port,
            host: ip
        });

        iTach.on('data', function (chunk) {
            console.log('iTach: ' + ip + '\n' + chalk.red(chunk));
        });

        iTach.on('end', function () {
            console.log('iTach: ' + ip + ' END');
        });

        this.connection = iTach;

    }

    getCredentials() {
        console.log(this.ip)
        console.log(this.port)
    }

}

const GC = new GlobalCache('192.168.1.180', 4998);

exports.GC = GC