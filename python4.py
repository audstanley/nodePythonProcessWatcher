from python4_unixSocket import interComs
myInterComs = interComs()
myInterComs.run()
import sys
from time import sleep

while True:
    print("MESSAGES FROM PYTHON 4")
    sys.stdout.flush()
    myInterComs.send( {"coolShit": "from python4"} )
    if "say" in myInterComs.python1Data:
        # Notice here that we have a "pass" at the bottom of the IF statement
        # This is so that if we toggle logging: false in the process.json
        # This python wont fail, when the print line (line 15), and sys.stdout.flush() get commented out.
        print("python4 is receiving data from python1:" + str(myInterComs.python1Data["say"]))
        sys.stdout.flush()
        pass
    else:
        print("python1 is not longer connected")
        sys.stdout.flush()
        pass
    sleep(0.500)