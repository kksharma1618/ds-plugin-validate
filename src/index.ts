import {validate} from 'jsonschema';
import * as minimatch from 'minimatch'

const INVALID_MESSAGE_DATA = "INVALID_MESSAGE_DATA";
const patternRegex = new Map<string, RegExp>();

export const registerPlugin = (emitter: any, options: any) => {
  if(!options) {
    return;
  }
  if(options.record) {
    emitter.on("ds:record", function(data: any, next: () => any) {
      handleRecord(options.record, data, function(err) {
        if(err) {
          data.skip = true;
          data.socket.sendError(data.message.topic, INVALID_MESSAGE_DATA, err.message);
        }
        next();
      });
    });
  }
  if(options.event) {
    emitter.on("ds:event", function(data: any, next: () => any) {
      handleEvent(options.event, data, function(err) {
        if(err) {
          data.skip = true;
          data.socket.sendError(data.message.topic, INVALID_MESSAGE_DATA, err.message);
        }
        next();
      });
    });
  }

  if(options.rpc) {
    emitter.on("ds:rpc", function(data: any, next: () => any) {
      handleRpc(options.rpc, data, function(err) {
        if(err) {
          data.skip = true;
          data.socket.sendError(data.message.topic, INVALID_MESSAGE_DATA, err.message);
        }
        next();
      });
    });
  }
}

function handleRpc(options: any, data: any, next: (err?: Error) => any) {
  if(data.message.topic != 'P' || data.message.action != 'REQ') {
    return next();
  }
  if(!Array.isArray(data.message.data) || data.message.data.length < 3) {
    return next();
  }
  const [rpcId, ,rawValue] = data.message.data;
  handleMessage("rpc", options, rpcId, "", rawValue, next);
}

function handleEvent(options: any, data: any, next: (err?: Error) => any) {
  if(data.message.topic != 'E' || data.message.action != 'EVT') {
    return next();
  }
  if(!Array.isArray(data.message.data) || data.message.data.length < 2) {
    return next();
  }
  const [eventId, rawValue] = data.message.data;
  handleMessage("event", options, eventId, "", rawValue, next);
}


function handleRecord(options: any, data: any, next: (err?: Error) => any) {
  if(data.message.topic != 'R' || data.message.action != 'P') {
    return next();
  }
  if(!Array.isArray(data.message.data) || data.message.data.length < 4) {
    return next();
  }
  const [recordId, , key, rawValue] = data.message.data;
  handleMessage("record", options, recordId, key, rawValue, next);
}

function handleMessage(type: "event" | "record" | "rpc", options: any, messageId: string, key: string, value: string, next: (err?: Error) => any) {

  const parsedValue = parseValue(value);

  let msgOptions, matchedMessagePattern;
  for(let pattern in options) {
    if(msgOptions) {
      continue;
    }
    if(options.hasOwnProperty && options.hasOwnProperty(pattern)) {
      let regex = patternRegex.get(type+":"+pattern);
      if(!regex) {
        regex = minimatch.makeRe(pattern);
        patternRegex.set(type+":"+pattern, regex);
      }
      if(regex.test(messageId)) {
        matchedMessagePattern = pattern;
        msgOptions = options[pattern];
      }
    }
  }

  if(!msgOptions) {
    return next();
  }

  if(type != "record") { // no key, msgOptions will be matched against parsedValue directly
    let r = validate(parsedValue, msgOptions);
    if(Array.isArray(r.errors) && r.errors.length) {
      let path = r.errors[0].property || "";
      path = path.replace("instance", type == "rpc" ? "argument" : "message");
      return next(new Error(path + " " + r.errors[0].message));
    }
    return next();
  }

  const properties = msgOptions.properties;
  if(!properties) {
    return next(new Error("missing properties in options."+matchedMessagePattern));
  }

  const additionalProperties = Object.is(msgOptions.additionalProperties, undefined) ? true : msgOptions.additionalProperties;

  let schema;
  if(properties[key]) {
    schema = properties[key];
  }
  else {
    if(!additionalProperties) {
      return next(new Error("no such key allowed:"+key));
    }
    schema = additionalProperties;
  }

  let r = validate(parsedValue, schema);
  if(Array.isArray(r.errors) && r.errors.length) {
    let path = r.errors[0].property || "";
    path = path.replace("instance", key);
    return next(new Error(path + " " + r.errors[0].message));
  }
  next();
}

function parseValue(v: any) {
  if(!v.trim()) {
    return;
  }
  if(v == "T") {
    return true;
  }
  if(v == "F") {
    return false;
  }
  if(v == "U") {
    return undefined;
  }
  if(v == "L") {
    return null;
  }
  if(v.length < 2) {
    return;
  }
  const type = v.charAt(0);
  v = v.substr(1);
  if(type == "S") {
    return v;
  }
  if(type == "N") {
    return Number(v);
  }
  if(type == "O") {
    try {
      v = JSON.parse(v);
    }
    catch(e) {
      v = undefined;
    }
    return v;
  }
}
