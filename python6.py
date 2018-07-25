import sys
from python6_unixSocket import interComs
myInterComs = interComs()
myInterComs.run()
from time import sleep

for i in range(10):
    sleep(0.2)
    print(i, 'Message from python6.py')
    sys.stdout.flush()
    



while True:
    sleep(10)
    #raise Exception('SOME PROBLEM')
    print("$I want this message to be global")
    sys.stdout.flush()
    try:
        awdoiwanoidwn()
    except:
        print('some problem here')
        sys.stdout.flush()
        pass
    # Uncomment line 28 to see what happens when the python script fails:
    #   in short, all python processes will relaunch. Great for debugging.
    #raise Exception('SOME PROBLEM')
    #sys.exit()