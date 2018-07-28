## Installation

Go to `unihack-backend` and `unihack-gateway-nodejs` and run `npm install`.

If not using a bluetooth USB adapter (note that this will render your bluetooth UNUSABLE for anything else, but you can roll back the driver afterwards):

1.  Download Zadig (https://zadig.akeo.ie/)
2.  Options -> List all Devices
3.  Select your bluetooth adapter/device
4.  Replace Driver
5.  Go to Device Manager and find your Bluetooth Adapter.
6.  Right click -> Properties.
7.  Go to the Driver tab, and note the VID and the PID under Digital Signer.
8.  In your terminal, set the following with your own (four) characters for VID and PID, e.g.:
    - `set BLUETOOTH_HCI_SOCKET_USB_VID=0x????`
    - `set BLUETOOTH_HCI_SOCKET_USB_PID=0x????`

## Running

1.  In the `unihack-gateway-nodejs` folder, run `npm run gateway`.
2.  Contact Kevin for issues.

## Config

```
<MQTT Information>
Gateway IP: 10.77.0.18
Port: 1883
User: admin
Password: xx (See Discord Server)
```
