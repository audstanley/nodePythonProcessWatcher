const EE = require('events').EventEmitter;
const { exec } = require('child_process');
const fs = require('fs')
const chokidar = require('chokidar')
let PythonShell = require('python-shell');
const WebSocket = require('ws');
let color = require('colors')
let input = process.openStdin();
let processList = require('./process.json')
let processRunner = Array.prototype
let saveMessageArray = []
let lastInput = '5'

// HANDLE WEB SOCKET CONNECTIONS:
const wss = new WebSocket.Server({
    port: 9000,
    perMessageDeflate: {
        zlibDeflateOptions: { // See zlib defaults.
            chunkSize: 1024,
            memLevel: 7,
            level: 3,
        },
        zlibInflateOptions: {
            chunkSize: 10 * 1024
        },
        // Other options settable:
        clientNoContextTakeover: true, // Defaults to negotiated value.
        serverNoContextTakeover: true, // Defaults to negotiated value.
        clientMaxWindowBits: 10,       // Defaults to negotiated value.
        serverMaxWindowBits: 10,       // Defaults to negotiated value.
        // Below options specified as default values.
        concurrencyLimit: 10,          // Limits zlib concurrency for perf.
        threshold: 1024,               // Size (in bytes) below which messages
                                        // should not be compressed.
    }
  });


let processJsonWatcher = chokidar.watch( './process.json', { persistent: true });
let processesToWatch = processList.map(e => e.process)
let pythonWatcher = chokidar.watch( processesToWatch, { persistent: true });

let runThePythonWatcher = async () => {
    pythonWatcher.on('change', path => {
        console.log(color.blue(`CHANGED DETECTED ON FILE`), color.yellow(`${path}`), color.blue(`RESTARTING ALL PYTHON PROCESSES`))
        killAllProcesses().then(() => {
            processList = require('./process.json')
            processRunner = []
            launchEverything()
        })
    })
}
runThePythonWatcher();

processJsonWatcher.on('change', path => {
    console.log(color.blue(`CHANGED DETECTED ON FILE`), color.yellow(`${path}`), color.blue(`RESTARTING ALL PYTHON PROCESSES`))
    killAllProcesses().then( async() => {
        processList = require('./process.json')
        processRunner = []
        pythonWatcher.close()
        runTheGenerator().then(()=> {
            setTimeout(()=> {
                pythonWatcher = chokidar.watch( processesToWatch, { persistent: true });
                runThePythonWatcher().then(()=> {
                    launchEverything()
                })
            },1000)
            
        })
    })
})


let loadUpProcesses = async () => {
    for([i,runProcess] of processList.entries()) {
        processRunner.push(Object.assign( { 
            "p" : new PythonShell(runProcess.process)
        }, runProcess ))
    }
}

wss.on('connection', function connection(ws) {
    ws.on('message', function incoming(message) {
      console.log(color.blue(`Received ${message} from websocket`));
    });
    
    //ws.send();
});

let handleMessages = (m, pName, groupNum) => {
    
    let pNameF = pName.split('/')
    let currentdate = new Date();
    let dateStamp = `${currentdate.getMonth()+1}/${currentdate.getDate()}/${currentdate.getFullYear()}`

    if(saveMessageArray.length > 40000) {
        saveMessageArray.shift()
        saveMessageArray.push(`${Date.now()},${(pNameF[pNameF.length - 1]? pNameF[pNameF.length - 1] : pName)},"${m.replace('"', '\"')}", printStatement, ${dateStamp}`)
    }
    else saveMessageArray.push(`${Date.now()},${(pNameF[pNameF.length - 1]? pNameF[pNameF.length - 1] : pName)},"${m.replace('"', '\"')}", printStatement, ${dateStamp}`)

    if (m.substr(0,1) == '!') 
        console.log(color.red(`          ${Date.now()}, ${(pNameF[pNameF.length - 1]? pNameF[pNameF.length - 1] : pName)}, ${m.substr(1)}`))
    else if (m.substr(0,1) == '$') 
        console.log(color.yellow(`          ${Date.now()}, ${(pNameF[pNameF.length - 1]? pNameF[pNameF.length - 1] : pName)}, ${m.substr(1)}`))
    else if(groupNum == parseInt(lastInput)) console.log(`Group: ${lastInput}, ${Date.now()}, ${(pNameF[pNameF.length - 1]? pNameF[pNameF.length - 1] : pName)}, ${m}`)
    else if(lastInput && lastInput.toLowerCase() == 'all') console.log(`${Date.now()}, ${m}`)

    wss.clients.forEach(function each(client) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(`${m}`);
        }
      });
}

let handleErrors = (e,p) => {
    let pNameF = p.process.split('/')


    console.log(color.blue("\n\nCRASH AT:"), color.yellow(`${pNameF[pNameF.length - 1]}`, color.blue("HAS AN ERROR:")))
    if(e && e.traceback) {
        let formatTraceback = e.traceback.replace(/\n/g, ' ').replace(/"/g, '\"').replace(/,/g, ' - ')

        let currentdate = new Date();
        let dateStamp = `${currentdate.getMonth()+1}/${currentdate.getDate()}/${currentdate.getFullYear()}`
        console.log(color.red('\n\t',e.traceback.split('\n').join('\n\t\t')))
        if(saveMessageArray.length > 40000) {
            saveMessageArray.shift()
            saveMessageArray.push(`${Date.now()},${(pNameF[pNameF.length - 1]? pNameF[pNameF.length - 1] : pName)},"${formatTraceback}", pythonError, ${dateStamp}`)
        }
        else saveMessageArray.push(`${Date.now()},${(pNameF[pNameF.length - 1]? pNameF[pNameF.length - 1] : pName)},"${formatTraceback}", pythonError, ${dateStamp}`)
    }

    console.log(color.blue("KILLING ALL PROCESSES, AND RESTARTING in 1 second:"))
    killAllProcesses().then(() => {
        processRunner = []
        launchEverything()
    })
}

let handleExitCode = (e,c,s,p) => {
    let pNameF = p.process.split('/')
    let currentdate = new Date();
    let dateStamp = `${currentdate.getMonth()+1}/${currentdate.getDate()}/${currentdate.getFullYear()}`
    if(saveMessageArray.length > 40000) {
        saveMessageArray.shift()
        saveMessageArray.push(`${Date.now()},${(pNameF[pNameF.length - 1]? pNameF[pNameF.length - 1] : pName)}, "${p.process} exit code was: ${c} and ${p.process} exit signal was: ${s}", pythonExit, ${dateStamp}`)
    }
    else saveMessageArray.push(`${Date.now()},${(pNameF[pNameF.length - 1]? pNameF[pNameF.length - 1] : pName)}, "${p.process} exit code was: ${c} and ${p.process} exit signal was: ${s}", pythonExit, ${dateStamp}`)
    console.log(color.yellow(`\t${p.process} exit code was: ${c}`))
    console.log(color.yellow(`\t${p.process} exit signal was: ${s}`))
}

let killAllProcesses = async () => {
    [p00,p01,p02,p03,p04,p05,p06,p07,p08,p09,p10,p11,p12,p13,p14,p15,p16,p17,p18,p19,p20] = processRunner
    if(p00) p00.p.terminate()
    if(p01) p01.p.terminate()
    if(p02) p02.p.terminate()
    if(p03) p03.p.terminate()
    if(p04) p04.p.terminate()
    if(p05) p05.p.terminate()
    if(p06) p06.p.terminate()
    if(p07) p07.p.terminate()
    if(p08) p08.p.terminate()
    if(p09) p09.p.terminate()
    if(p10) p10.p.terminate()
    if(p11) p11.p.terminate()
    if(p12) p12.p.terminate()
    if(p13) p13.p.terminate()
    if(p14) p14.p.terminate()
    if(p15) p15.p.terminate()
    if(p16) p16.p.terminate()
    if(p17) p17.p.terminate()
    if(p18) p18.p.terminate()
    if(p19) p19.p.terminate()
    if(p20) p20.p.terminate()
}

let launchEverything = () => {
    loadUpProcesses().then(() => {
        [p00,p01,p02,p03,p04,p05,p06,p07,p08,p09,p10,p11,p12,p13,p14,p15,p16,p17,p18,p19,p20] = processRunner
        if(p00) p00.p.on('message', m => handleMessages(m,p00.process,p00.group))
        if(p01) p01.p.on('message', m => handleMessages(m,p01.process,p01.group))
        if(p02) p02.p.on('message', m => handleMessages(m,p02.process,p02.group))
        if(p03) p03.p.on('message', m => handleMessages(m,p03.process,p03.group))
        if(p04) p04.p.on('message', m => handleMessages(m,p04.process,p04.group))
        if(p05) p05.p.on('message', m => handleMessages(m,p05.process,p05.group))
        if(p06) p06.p.on('message', m => handleMessages(m,p06.process,p06.group))
        if(p07) p07.p.on('message', m => handleMessages(m,p07.process,p07.group))
        if(p08) p08.p.on('message', m => handleMessages(m,p08.process,p08.group))
        if(p09) p09.p.on('message', m => handleMessages(m,p09.process,p09.group))
        if(p10) p10.p.on('message', m => handleMessages(m,p10.process,p10.group))
        if(p11) p11.p.on('message', m => handleMessages(m,p11.process,p11.group))
        if(p12) p12.p.on('message', m => handleMessages(m,p12.process,p12.group))
        if(p13) p13.p.on('message', m => handleMessages(m,p13.process,p13.group))
        if(p14) p14.p.on('message', m => handleMessages(m,p14.process,p14.group))
        if(p15) p15.p.on('message', m => handleMessages(m,p15.process,p15.group))
        if(p16) p16.p.on('message', m => handleMessages(m,p16.process,p16.group))
        if(p17) p17.p.on('message', m => handleMessages(m,p17.process,p17.group))
        if(p18) p18.p.on('message', m => handleMessages(m,p18.process,p18.group))
        if(p19) p19.p.on('message', m => handleMessages(m,p19.process,p19.group))
        if(p20) p20.p.on('message', m => handleMessages(m,p20.process,p20.group))

        if(p00) p00.p.on('error', e => handleErrors(e,p00))
        if(p01) p01.p.on('error', e => handleErrors(e,p01))
        if(p02) p02.p.on('error', e => handleErrors(e,p02))
        if(p03) p03.p.on('error', e => handleErrors(e,p03))
        if(p04) p04.p.on('error', e => handleErrors(e,p04))
        if(p05) p05.p.on('error', e => handleErrors(e,p05))
        if(p06) p06.p.on('error', e => handleErrors(e,p06))
        if(p07) p07.p.on('error', e => handleErrors(e,p07))
        if(p08) p08.p.on('error', e => handleErrors(e,p08))
        if(p09) p09.p.on('error', e => handleErrors(e,p09))
        if(p10) p10.p.on('error', e => handleErrors(e,p10))
        if(p11) p11.p.on('error', e => handleErrors(e,p11))
        if(p12) p12.p.on('error', e => handleErrors(e,p12))
        if(p13) p13.p.on('error', e => handleErrors(e,p13))
        if(p14) p14.p.on('error', e => handleErrors(e,p14))
        if(p15) p15.p.on('error', e => handleErrors(e,p15))
        if(p16) p16.p.on('error', e => handleErrors(e,p16))
        if(p17) p17.p.on('error', e => handleErrors(e,p17))
        if(p18) p18.p.on('error', e => handleErrors(e,p18))
        if(p19) p19.p.on('error', e => handleErrors(e,p19))
        if(p20) p20.p.on('error', e => handleErrors(e,p20))

        if(p00) p00.p.end((e,c,s) => handleExitCode(e,c,s,p00))
        if(p01) p01.p.end((e,c,s) => handleExitCode(e,c,s,p01))
        if(p02) p02.p.end((e,c,s) => handleExitCode(e,c,s,p02))
        if(p03) p03.p.end((e,c,s) => handleExitCode(e,c,s,p03))
        if(p04) p04.p.end((e,c,s) => handleExitCode(e,c,s,p04))
        if(p05) p05.p.end((e,c,s) => handleExitCode(e,c,s,p05))
        if(p06) p06.p.end((e,c,s) => handleExitCode(e,c,s,p06))
        if(p07) p07.p.end((e,c,s) => handleExitCode(e,c,s,p07))
        if(p08) p08.p.end((e,c,s) => handleExitCode(e,c,s,p08))
        if(p09) p09.p.end((e,c,s) => handleExitCode(e,c,s,p09))
        if(p10) p10.p.end((e,c,s) => handleExitCode(e,c,s,p10))
        if(p11) p11.p.end((e,c,s) => handleExitCode(e,c,s,p11))
        if(p12) p12.p.end((e,c,s) => handleExitCode(e,c,s,p12))
        if(p13) p13.p.end((e,c,s) => handleExitCode(e,c,s,p13))
        if(p14) p14.p.end((e,c,s) => handleExitCode(e,c,s,p14))
        if(p15) p15.p.end((e,c,s) => handleExitCode(e,c,s,p15))
        if(p16) p16.p.end((e,c,s) => handleExitCode(e,c,s,p16))
        if(p17) p17.p.end((e,c,s) => handleExitCode(e,c,s,p17))
        if(p18) p18.p.end((e,c,s) => handleExitCode(e,c,s,p18))
        if(p19) p19.p.end((e,c,s) => handleExitCode(e,c,s,p19))
        if(p20) p20.p.end((e,c,s) => handleExitCode(e,c,s,p20))

    }).catch(e => console.log(e))
}

launchEverything()

input.addListener("data", function(d) {
    let twoInputsBack = lastInput
    lastInput = d.toString().trim()
    if(processList[lastInput]) {
        console.log(`Monitoring Group: ${processList[lastInput].group}`);
    }
    if(lastInput == 's') {
        lastInput = twoInputsBack
        let currentdate = new Date();
        let dateStamp = `${currentdate.getMonth()+1}-${currentdate.getDate()}-${currentdate.getFullYear()}`
        let fileToWrite = `./logs/${dateStamp}_${Date.now()}-Log.csv`
        fs.writeFile(fileToWrite, `time,script,message,messageType,dateStamp\n${saveMessageArray.join('\n')}`, e => {
            if(e) console.log(color.red(`${e}`))
            else console.log(color.blue(`SAVED:`), color.yellow(`${fileToWrite}`))
        })
    }
  });

  
  let runTheGenerator = async () => {
      exec('node generate2.js', (error, stdout, stderr) => {
          if(error) console.log(`ERROR: ${error}`)
          else {
            console.log(`${stdout}`)
            console.log(`${stderr}`)
          }
          
        })
    
    }


