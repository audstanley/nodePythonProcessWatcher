import sys
from python7_unixSocket import interComs
myInterComs = interComs()
myInterComs.run()
from time import sleep

while True:
    print('Just another processes that can intercommunicated with the other python processes')
    print(myInterComs.python3Data)
    print('No databse needed.')
    sleep(0.1)