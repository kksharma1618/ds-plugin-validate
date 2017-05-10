# ds-plugin-validate

Validator plugin for deepstream.io's fork at https://github.com/kksharma1618/deepstream.io/tree/pluginsupport

## Install
For now, install using:
```
npm install https://github.com/kksharma1618/ds-plugin-validate.git
```

### Usage
Step 1) Install deepstream.io fork at https://github.com/kksharma1618/deepstream.io/tree/pluginsupport

Step 2) Provide pluginLoader config (including config for this plugin)
Eg:
```
{
  pluginLoader: {
    enabled: true,
    options: {
      "ds-plugin-validate": {

        "record": {
          "some/record/*": {
            "type": "object",
            "properties": {
              "name": {
                "type": "string",
                "minLength": 5,
                "maxLength": 8
              }
            },
            "additionalProperties": false
          }
        },

        "rpc": {
          "add": {
            type: "array",
            items: {
              type: "number"
            }
          }
        },

        "event": {
          "myevent/*": {
            type: "string",
            maxLength: 4
          }
        }
      }
    }
  }
}
```

For schema syntax check out https://github.com/tdegrunt/jsonschema

Eg, using above config:
```
client.event.emit("myevent/someevent", {an: "object"}); // triggers a client side error

Uncaught Error: INVALID_MESSAGE_DATA: message is not of a type(s) string (E)
    at Client._$onError (bundle.js:36452)
    at EventHandler._$handle (bundle.js:36896)
    at Client._$onMessage (bundle.js:36395)
    at Connection._onMessage (bundle.js:37284)

client.event.emit("myevent/some", "some long event"); // triggers a client side error

Uncaught Error: INVALID_MESSAGE_DATA: message does not meet maximum length of 4 (E)
    at Client._$onError (bundle.js:36452)
    at EventHandler._$handle (bundle.js:36896)
    at Client._$onMessage (bundle.js:36395)
    at Connection._onMessage (bundle.js:37284)

client.event.emit("myevent/some", "pro"); // works


client.rpc.make( 'add', [2, "some"]); // triggers a client side error

Uncaught Error: UNSOLICITED_MESSAGE: PEINVALID_MESSAGE_DATA argument[1] is not of a type(s) number (P)
    at Client._$onError (bundle.js:36452)
    at RpcHandler._getRpc (bundle.js:38827)
    at RpcHandler._$handle (bundle.js:38922)
    at Client._$onMessage (bundle.js:36395)
    at Connection._onMessage (bundle.js:37284)

client.record.getRecord("some/record/abc").set("nosuchkey1", "aasdasdasdasd"); // triggers a client side error

Uncaught Error: INVALID_MESSAGE_DATA: no such key allowed:nosuchkey1 (R)
    at Client._$onError (bundle.js:36452)
    at RecordHandler._$handle (bundle.js:38561)
    at Client._$onMessage (bundle.js:36395)
    at Connection._onMessage (bundle.js:37284)
```
