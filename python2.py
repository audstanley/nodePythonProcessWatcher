from time import sleep


while True:
    print("MESSAGES FROM PYTHON 2")
    print('python2 data' + str(myInterComs.data))
    myInterComs.send({"stuff": "fuck yeah"})
    print("$SOMTHING HAPPEND THAT WE MIGHT WANT TO PAY ATTENTION TO")
    sleep(0.500)