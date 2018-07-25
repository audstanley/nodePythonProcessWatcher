from python1_unixSocket import interComs
myInterComs = interComs()
myInterComs.run()
import sys
from time import sleep, time

while True:

    print("MESSAGES FROM PYTHON 1")
    myInterComs.send( {"say": "hello world"} )
    print("tempDataStore:" + str(myInterComs.data))
    print("webInterface:" + str(myInterComs.webInterface))
    print("python2Data:" + str(myInterComs.python2Data))
    print("python3Data:" + str(myInterComs.python3Data))
    print("python4Data:" + str(myInterComs.python4Data))
    print("python5Data:" + str(myInterComs.python5Data))
    print("python5Data:" + str(myInterComs.python6Data))
    print("python5Data:" + str(myInterComs.python6Data))


    sleep(0.1)