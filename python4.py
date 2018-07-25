from python4_unixSocket import interComs
myInterComs = interComs()
myInterComs.run()
import sys
from time import sleep

while True:
    print("MESSAGES FROM PYTHON 4")
    sys.stdout.flush()
    myInterComs.send( {"coolShit": "from python4"} )
    sleep(0.500)