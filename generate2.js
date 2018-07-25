const fs = require('fs')
const processList = require('./process.json')
// Free up tcp port: sudo fuser -k Port_Number/tcp
let webSocketStartPoint = 9000

let writeThePythonWebSocketClasses = () => {
    let ProcessPromiseArray = []
    let ProcessNamesArray = processList.map(e => { if (e.process) {let name = e.process.split('/'); return name[name.length-1].split('.py')[0]}})
    let PathMap = processList.map(e => { 
        if(e.process) {
            let path = e.process.split('/')
            if (path.length >= 2) {
                path.pop()
                return `${path.join('/')}/`
            }
            else if (path.length == 1) return `${path[0]}/`
            else console.log("MALFORMED process.json file, please fix.")
        } 
    })

    let processObjectArray = []
    for (const [index, pythonProcessName] of ProcessNamesArray.entries())
        if(processList[index].runUnixSocket) {
            processObjectArray.push({
                'name': pythonProcessName, 
                'path': PathMap[index], 
                'args': processList[index].args, 
                'logging':processList[index].logging,
                'runUnixSocket': processList[index].runUnixSocket,
                'index': index
            })
        }
        
    
    // This is where all the magic happens:
    for (const [index, pythonProcessObject] of processObjectArray.entries()) {

        // This will write individual pythonWebSocket Class files:
        ProcessPromiseArray.push(new Promise((resolve, reject) => {
            if (pythonProcessObject.name && pythonProcessObject.runUnixSocket) {
                fs.writeFile(`${pythonProcessObject.path}${pythonProcessObject.name}_unixSocket.py`, 
                    webSocketClassTemplate(processObjectArray, 
                    pythonProcessObject),
                    err => {
                        if(err) reject(err)
                        else resolve(`${pythonProcessObject.name}_unixSocket.py has been written successfully`)
                    })
            }
        }))

        // modify each python file with logging on or off, this also modifies the python file itself to run the webSockets be including:
        ProcessPromiseArray.push(new Promise((resolve, reject) => {
            let lines = new Promise((res, rej)=> {
                fs.readFile(`${pythonProcessObject.path}${pythonProcessObject.name}.py`, 'utf8', (e,d) => {
                    let lineArr = d.replace(/\r/g, '').split('\n')
                    for (let [index, line] of lineArr.entries()) {
                        let regexPrint = /([ #]*)print[ ]*(.*)/.exec(line)
                        if(regexPrint) {
                            let [input,malformedSpacing,pStatement] = regexPrint
                            if (pythonProcessObject.logging && malformedSpacing[malformedSpacing.length-1] == '#') {
                                let fixedLine  = (malformedSpacing.length-2 == " ")? `${malformedSpacing.replace('#', ' ')}print${pStatement}`
                                                    : `${malformedSpacing.replace('#', '')}print${pStatement}`
                                lineArr[index] = fixedLine
                                let nextLine = lineArr[index+1]
                                if(nextLine) {
                                    let sysFlushRegex = /([ #]*)sys\.stdout\.flush\(\)/.exec(nextLine)
                                    let loggingEffectedSysFlush = (malformedSpacing.length-2 == " ")? `${malformedSpacing.replace('#', ' ')}sys.stdout.flush()`
                                                : `${malformedSpacing.replace('#', '')}sys.stdout.flush()`
                                    if (!sysFlushRegex) {
                                        lineArr.splice(index+1,0, loggingEffectedSysFlush)
                                    }
                                    else if(sysFlushRegex) {
                                        lineArr[index+1] = nextLine.replace('#sys.stdout.flush()', 'sys.stdout.flush()')
                                    }
                                }
                            }
                            else if (pythonProcessObject.logging) {
                                let fixedLine  = (malformedSpacing.length-2 == " ")? `${malformedSpacing.replace('#', ' ')}print${pStatement}`
                                                    : `${malformedSpacing.replace('#', '')}print${pStatement}`
                                lineArr[index] = fixedLine
                                let nextLine = lineArr[index+1]
                                if(nextLine) {
                                    let sysFlushRegex = /([ #]*)sys\.stdout\.flush\(\)/.exec(nextLine)
                                    let loggingEffectedSysFlush = (malformedSpacing.length-2 == " ")? `${malformedSpacing.replace('#', ' ')}sys.stdout.flush()`
                                                : `${malformedSpacing.replace('#', '')}sys.stdout.flush()`
                                    if (!sysFlushRegex) {
                                        lineArr.splice(index+1,0, loggingEffectedSysFlush)
                                    }
                                    else if(sysFlushRegex) {
                                        lineArr[index+1] = nextLine.replace('#sys.stdout.flush()', 'sys.stdout.flush()')
                                    }
                                }
                            }
                            else if (!pythonProcessObject.logging) { //comment out the print lines and sys.std.out.flush() lines
                                lineArr[index] = (malformedSpacing)? `${malformedSpacing.replace('#', '')}#print${pStatement}` : `#print${pStatement}` 
                                let nextLine = lineArr[index+1]
                                if(nextLine) {
                                    let sysFlushRegex = /([ #]*)sys\.stdout\.flush\(\)/.exec(nextLine)
                                    if(sysFlushRegex) {
                                        let [ sysFlushInput, sysFlushSpacing ] = sysFlushRegex
                                        lineArr[index+1] = (sysFlushSpacing[sysFlushSpacing.length-1] == '#')? nextLine : `${sysFlushSpacing.replace('#', '')}#sys.stdout.flush()`
                                    }
                                    else {
                                        let sysFlushCommented = (malformedSpacing.length-1 == '#')? malformedSpacing : `${malformedSpacing}#`
                                        lineArr.splice(index+1,1, `${sysFlushCommented}sys.stdout.flush()`)
                                    }

                                }

                            }
                        }
                        if(index == lineArr.length - 1) {
                            res(lineArr.join('\n'))
                        }
                    }
                    lines.then(file => {
                        let fileArr = file.split('\n')
                        let modifyFileSysUse = (fileArrInput) => {
                            return new Promise((res,rej)=> {
                                if (fileArrInput.includes('import sys')) res(fileArrInput)
                                else {
                                    let ret = [].concat(['import sys'], fileArrInput)
                                    res(ret)
                                }
                            })
                            
                        }
                        let modifyFileWebSocketClassUse = (fileArrInput) => {
                            return new Promise((res,rej)=> {
                                //console.log(pythonProcessObject.name)
                                if (fileArrInput.includes(`from ${pythonProcessObject.name}_unixSocket import interComs`) 
                                    && fileArrInput.includes(`myInterComs = interComs()`)
                                    && fileArrInput.includes(`myInterComs.run()`)) {
                                    res(fileArrInput)
                                }
                                else {
                                    let ret = [].concat(['from ' + pythonProcessObject.name + '_unixSocket import interComs', 
                                        'myInterComs = interComs()',
                                        'myInterComs.run()'], fileArrInput)
                                    if(pythonProcessObject.runUnixSocket) res(ret)
                                    else res(fileArrInput)
                                }
                            })
                        }

                        modifyFileWebSocketClassUse(fileArr)
                            .then(fa => modifyFileSysUse(fa))
                            .then(r => {
                                fs.writeFile(`${pythonProcessObject.path}${pythonProcessObject.name}.py`, r.join('\n'), (e) => {
                                    if(e) reject(e)
                                    else {
                                        resolve(`Successfully updated: ${pythonProcessObject.name}.py\n\tLOGGING: ${(pythonProcessObject.logging)? 'enabled' : 'disabled'}\n`)
                                        console.log(`Successfully updated: ${pythonProcessObject.name}.py\n\tLOGGING: ${(pythonProcessObject.logging)? 'enabled' : 'disabled'}\n`)
                                    }
                                })
                            })

                        


                    }).catch(e => console.log(e))
                    
                })
            })


        }))

    }
    return Promise.all(ProcessPromiseArray)
}

let webSocketClassTemplate = (processObjectArray, thisPythonProcessObject) => {
let s4 = ' '.repeat(4)
let s8 = ' '.repeat(8)
let s12 = ' '.repeat(12)
let s16 = ' '.repeat(16)
let s20 = ' '.repeat(20)
let s24 = ' '.repeat(24)
let s28 = ' '.repeat(28)
let s32 = ' '.repeat(32)

let otherServerPaths = processObjectArray.map(e => {if (thisPythonProcessObject.name != e.name) return `${s4}${e.name}SocketPath = "${e.path}${e.name}UnixSocket.sock"`}).filter(e => e != undefined).join('\n')
let otherServerData = processObjectArray.map(e => {if (thisPythonProcessObject.name != e.name) return `${s4}${e.name}Data = {}`}).filter(e => e != undefined).join('\n')
let originatorIfStatements = processObjectArray.map(e => { if (thisPythonProcessObject.name != e.name) { 
        return `${s24}elif str(self.data["from"]) == "${e.name}":\n${s28}self.${e.name}Data = self.data`
    }
}).filter(e => e != undefined).join('\n')
let cleanUpDeadSockets = processObjectArray.map(e => { if (thisPythonProcessObject.name != e.name) 
return `${s12}if "timeStamp" in self.${e.name}Data and self.${e.name}Data["timeStamp"] < time() - 3:
${s16}self.${e.name}Data = {}`
}).filter(e => e != undefined).join('\n')
let instantiateUnixSockets = processObjectArray.map(e => {if(thisPythonProcessObject.name != e.name) return `${s4}${e.name}Sock = socket(AF_UNIX, SOCK_STREAM)`}).filter(e => e != undefined).join('\n')
let sendToOtherUnixSockets = processObjectArray.map(e => { if (thisPythonProcessObject.name != e.name) 
return `${s8}d["from"] = "${thisPythonProcessObject.name}"
${s8}try:
${s12}self.${e.name}Sock = socket(AF_UNIX, SOCK_STREAM)
${s12}self.${e.name}Sock.connect(self.${e.name}SocketPath)
${s8}except error, msg:
${s12}if msg[1] != "Transport endpoint is already connected":
${s16}#print("connection to ${e.name} failed:", msg)
${s16}pass
${s8}try:
${s12}self.${e.name}Sock.sendall(json.dumps(d))
${s8}except error, msg:
${s12}if msg[1] == "Broken pipe":
${s16}#print("sendall failed in connection with ${e.name} due to a Broken pipe")
${s16}self.${e.name}Sock.close()
${s16}self.${e.name}Sock = socket(AF_UNIX, SOCK_STREAM)
${s12}elif msg[1] == "Bad file descriptor":
${s16}self.${e.name}Sock = socket(AF_UNIX, SOCK_STREAM)
${s16}#print("sendall failed in connection with ${e.name} due to a Bad file descriptor")
`}).filter(e => e != undefined).join('\n')

return (`#This file was generated by generate2.js
from socket import *
from threading import Thread
import json
import sys
import re
import os
from time import sleep, time

class interComs:
    name = "${thisPythonProcessObject.name}"
    webInterface = {}
    data = {}
    dataStr = ""
    server_address = "${thisPythonProcessObject.path}${thisPythonProcessObject.name}UnixSocket.sock"
    sock = socket(AF_UNIX, SOCK_STREAM)
    try:
        os.unlink(server_address)
    except OSError:
        if os.path.exists(server_address):
            raise
    sock.bind(server_address)
    sock.listen(1000)

${otherServerPaths}
${otherServerData}
${instantiateUnixSockets}

    def listenForConnection(self):
        while True:
            connection, client_address = self.sock.accept()
            try:
                self.dataStr = connection.recv(16384)
                self.data = json.loads(self.dataStr)
                if type(self.data) == dict:
                    if "from" in self.data:
                        if str(self.data["from"]) == "webInterface":
                            self.webInterface = self.data
${originatorIfStatements}
            finally:
                connection.close()
    
    def cleanUpTimeoutData(self):
        while True:
${cleanUpDeadSockets}
            sleep(0.05)

    def run(self):
        try:
            t1 = Thread(target = self.listenForConnection)
            t2 = Thread(target = self.cleanUpTimeoutData)
            t1.daemon = True
            t2.daemon = True
            t1.start()
            t2.start()
        except:
            print("Thread exception called")

    def send(self, d):
        d["timeStamp"] = time()
${sendToOtherUnixSockets}

`)
}


writeThePythonWebSocketClasses()
    .then(()=> console.log('Done Generating Python Websocket Classes'))
    .catch((e) => console.log(`There was a problem generating the Node Application with error: ${e}`))