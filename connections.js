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

        const device = new Net.Socket();

        device.connect({
            port,
            host: ip
        });

        device.on('data', function (chunk) {
            console.log('device: ' + ip + '\n' + chalk.red(chunk));
        });

        device.on('end', function () {
            console.log('device: ' + ip + ' END');
        });

        this.connection = device;

    }

    getCredentials() {
        console.log(this.ip)
        console.log(this.port)
    }

}

const GC = new GlobalCache('192.168.1.180', 4998);

exports.GC = GC


class CiscoJAD {
    constructor(ip, port) {
        console.log('constructor')
        this.init(ip, port)
    }

    init(ip, port) {
        console.log('init');
        this.ip = ip;
        this.port = port;

        const device = new Net.Socket();

        device.connect({
            port,
            host: ip
        });

        device.on('data', function (chunk) {
            console.log('device: ' + ip + '\n' + chalk.red(chunk));

            let str = chunk.toString();
            if (str.match(/User Name:/)) {
                device.write("cisco\r\n")
            }
            if (str.match(/Password:/)) {
                device.write("cisco\r\n")
            }
        });

        device.on('end', function () {
            console.log('device: ' + ip + ' END');
        });

        this.connection = device;

    }

    getCredentials() {
        console.log(this.ip)
        console.log(this.port)
    }
}

const CiscoJADExport = new CiscoJAD('192.168.1.154', 23);

exports.CiscoJAD = CiscoJADExport