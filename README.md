# Node Python Process Watcher

First take a look at each python file to get an idea of what is happening with each separate script.
Notice:

```python
from python1_unixSocket import interComs
myInterComs = interComs()
myInterComs.run()
import sys
```

these are not needed in the header, because the node python watcher will generate these, when you launch the watcher application.



## All you need to get started is to run:

```bash
npm i;
```

Once the module is installed, look closely at the process.json file

```json
[
    { "process": "./python1.py", "args": "", "logging": true, "pythonInstance": "python", "runUnixSocket": true, "runPythonFile": true, "watch": true, "group": 0  },
    { "process": "./python2.py", "args": "", "logging": true, "pythonInstance": "python", "runUnixSocket": true, "runPythonFile": true, "watch": true, "group": 1  },
    { "process": "./python3.py", "args": "", "logging": true, "pythonInstance": "python", "runUnixSocket": true, "runPythonFile": true, "watch": true, "group": 2  },
    { "process": "./python4.py", "args": "", "logging": true, "pythonInstance": "python", "runUnixSocket": true, "runPythonFile": true, "watch": true, "group": 3  },
    { "process": "./python5.py", "args": "", "logging": true, "pythonInstance": "python", "runUnixSocket": true, "runPythonFile": true, "watch": true, "group": 4  },
    { "process": "./python6.py", "args": "", "logging": true, "pythonInstance": "python", "runUnixSocket": true, "runPythonFile": true, "watch": true, "group": 5  },
    { "process": "./python7.py", "args": "", "logging": true, "pythonInstance": "python", "runUnixSocket": true, "runPythonFile": true, "watch": true, "group": 6  }
]
```

**process:** *the full, or relaive path to the python script.*

**args:** *arguments you want to send to the individual python script [not implemented]*

**logging:** *print to the console or not [implemented]*

**pythonInstance:** *version of python you want to run for that python script [not implemented]*

**runUnixSocket:** *whether or not you want to run as a unix connected socket to all other processes [not implemented]*

**runPythonFile:** *whether or not you want to run the python file(might want to disable a python script while debuggin) [not implemented]*

**watch:** *watcher on or off [not implemented]*

**group:** *which group this python process is clumped in with...recommended (for now) to be a unique number*


## To run all python processes, and have them intercommunicated:

```bash
npm start;
```
