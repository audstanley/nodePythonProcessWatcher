from python5_unixSocket import interComs
myInterComs = interComs()
myInterComs.run()
import sys
from time import sleep

while True:
    print("MESSAGES FROM PYTHON 5")
    sys.stdout.flush()
    myInterComs.send( {"wordDawg": "from python5"} )
    sleep(0.500)