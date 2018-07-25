from python3_unixSocket import interComs
myInterComs = interComs()
myInterComs.run()
import sys
from time import sleep

while True:
    print("MESSAGES FROM PYTHON 3")
    myInterComs.send( {"aMessage": "from python 3"} )
    print("tempDataStore:" + str(myInterComs.data))
    print("python1Data:" + str(myInterComs.python1Data))
    print("python2Data:" + str(myInterComs.python2Data))
    print("python4Data:" + str(myInterComs.python4Data))
    print("python5Data:" + str(myInterComs.python5Data))
    print("python4Data:" + str(myInterComs.python5Data))
    print("python5Data:" + str(myInterComs.python6Data))
    sleep(0.500)