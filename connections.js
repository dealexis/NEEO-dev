const Net = require('net');
const chalk = require('chalk');
const delay = ms => {
    return new Promise(r => {
        setTimeout(r, ms)
    })
}

class GlobalCache {

    constructor(ip, port) {
        this.init(ip, port)
    }

    init(ip, port) {
        console.log('init:' + this.constructor.name);
        this.ip = ip;
        this.port = port;
        this.chunk = 'default';
        const device = new Net.Socket();

        device.connect({
            port,
            host: ip
        });

        //let changes;
        let exportGCtoData = this;
        device.on('data', function (chunk) {
            console.log('device: ' + ip + '\n' + chalk.red(chunk));
            //changes = chunk;
            //console.log(this.constructor.name)
            exportGCtoData.chunk = chunk;
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

    async send(command) {

        let error = false;
        await this.connection.write(command, function (e) {
            if (typeof e !== 'undefined') error = e;
        });

        await delay(250)

        if (error) throw new Error(error);

        //console.log(error)

        console.log(chalk.green(this.chunk))

        return this.chunk;

    }

}

const GC = new GlobalCache('192.168.1.180', 4998);

let command = GC.send('sendir,1:2,4,38000,1,1,342,170,22,20,22,62,22,62,22,62,22,20,22,62,22,62,22,62,22,62,22,62,22,62,22,20,22,20,22,20,22,20,22,62,22,62,22,20,22,20,22,62,22,20,22,20,22,20,22,20,22,62,22,20,22,20,22,20,22,20,22,20,22,20,22,20,22,760\r\n')
command.then((e) => {
    console.log('after cmd completed:' + e)
}).catch(error => {
    console.log(error + ' catched')
})

exports.GC = GC


class CiscoJAD {
    constructor(ip, port) {
        this.init(ip, port)
    }

    init(ip, port) {
        console.log('init:' + this.constructor.name);
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