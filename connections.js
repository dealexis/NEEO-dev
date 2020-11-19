const Net = require('net');
const chalk = require('chalk');
const delay = ms => {
    return new Promise(r => {
        setTimeout(r, ms)
    })
}

/*
*   DeviceFather METHODS:
*   send - it will retrieve response when request will be completed
*   connection.write -
* */

class DeviceFather {
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

        let thisObject = this;
        device.on('data', function (chunk) {
            console.log('device: ' + ip + '\n' + chalk.red(chunk));
            thisObject.chunk = chunk;
        });

        device.on('end', function () {
            console.log('device: ' + ip + ' END');
        });

        this.connection = device;
    }

    //await is needed to wait until chunk is fill
    async send(command) {

        let error = false;
        await this.connection.write(command + '\r\n', function (e) {
            if (typeof e !== 'undefined') error = e;
        });

        await delay(250)

        if (error) throw new Error(error);

        console.log(chalk.green(this.chunk))

        return this.chunk;

    }

    getIP() {
        return this.ip;
    }

    getPort() {
        return this.port;
    }

}

class GlobalCache extends DeviceFather {
    constructor(ip, port) {
        super(ip, port);
    }
}

const GC = new GlobalCache('192.168.1.180', 4998);
exports.GC = GC

class CiscoJAD extends DeviceFather {
    constructor(ip, port) {
        super(ip, port);
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

    send() {
    }

}

const CiscoJADExport = new CiscoJAD('192.168.1.154', 23);
exports.CiscoJAD = CiscoJADExport;


class SamsungTV7677 extends DeviceFather {
    constructor(ip, port) {
        super(ip, port);
    }
}

// const SamsungTV7677Export = new SamsungTV7677('192.168.1.156', 7677);
// exports.SamsungTV7677 = SamsungTV7677Export;